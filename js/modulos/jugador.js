class Jugador {
    constructor(escena) {
        this.escena = escena;
        this.sprite = null;
        this.puntoRojo = null;
        this.graficos = null;

        // Animación
        this.frame = 1;
        this.tiempoAnimacion = 0;
        this.velocidadAnimacion = 140;
        this.moviendo = false;
        this.direccion = 0;
        this.directo = false;   // true con teclado / botones (sin interpolar lecturas de cámara)

        // -------------------------------------------------------------
        // MOVIMIENTO CON CÁMARA
        // Lo que se SIENTE lo deciden los sliders de AJUSTES (Sensibilidad
        // y Suavizado). Aquí no hay filtros extra que peleen con ellos,
        // solo 3 pasos:
        //   1) Interpolación: la cámara manda una lectura cada ~33 ms; se
        //      reparte entre frames para que el avance sea continuo.
        //   2) Seguimiento pegado y sin rebote (SmoothDamp).
        //   3) Tope de velocidad: un salto falso de la cámara no puede
        //      lanzar al personaje de golpe.
        // El punto rojo va SIEMPRE encima del personaje.
        // -------------------------------------------------------------
        //
        // BLINDAJE: los valores buenos viven en Jugador.AJUSTE_BASE (congelado,
        // nadie puede modificarlo por accidente). this.ajuste es solo una
        // copia de trabajo y se restaura desde el original cada vez que
        // empieza una partida (ver crear()).
        this.ajuste = Object.assign({}, Jugador.AJUSTE_BASE);
        this.reiniciarMovimiento();
    }

    // Borra el estado del seguimiento (al crear al jugador)
    reiniciarMovimiento() {
        this.interp = null;
        this.muestraOrigen = 0;
        this.muestraDestino = 0;
        this.progresoMuestra = 0;
        this.velX = 0;
    }

    // Escribe en la consola (F12) con qué valores arrancó el movimiento.
    // Si un lunes se descompone, compara esta línea con la del viernes:
    // si "ajustes de cámara" cambió, el culpable son las preferencias
    // guardadas (no este archivo).
    diagnosticar() {
        let guardadas = "(no disponibles)";
        try {
            guardadas = JSON.stringify(Preferencias.cfg());
        } catch (e) { /* si no existe, se omite */ }
        console.log("[Jugador] movimiento v" + Jugador.VERSION_MOVIMIENTO,
            "| base:", JSON.stringify(this.ajuste),
            "| origen:", window.location.origin || window.location.protocol,
            "| ajustes de cámara guardados:", guardadas,
            "| skin jugador:", SkinsTienda.habilidad("jugador") || "ninguna");
    }

    // -----------------------------------------------------------------
    // CREAR
    // -----------------------------------------------------------------
    crear() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;

        escena.jugador = {
            x: ancho / 2,
            targetX: ancho / 2,
            y: alto - 120,
            radio: 55,
            velocidad: 8,
            // Velocidad rápida del jugador.
            velocidadSeguimiento: 22,
            luz: 100,
            maxLuz: 100,
            velocidadApagado: 2.5,
            jades: 0,
            jadesNecesarios: 3,
            supernovaActiva: false,
            supernovaRadio: 0,
            supernovaRadioMax: 180,
            // Habilidades de las skins de la tienda (0 / null = sin habilidad)
            imanPlumas: 0,
            habilidadSkin: null
        };

        // Sprite
        this.sprite = escena.physics.add.image(escena.jugador.x, escena.jugador.y, "jugador1");
        this.sprite.setOrigin(0.5).setDepth(5);
        // IMPORTANTE: la posición del personaje la decide este archivo (j.x), no
        // la física. Con moves = true Arcade vuelve a empujar al sprite por la
        // diferencia de posición del body en cada frame y se suma a nuestro
        // movimiento: el personaje "vibra", más cuanto más rápido va (teclado).
        // Con moves = false el body solo sigue al sprite (los overlaps funcionan igual).
        this.sprite.body.moves = false;

        // Punto rojo: representa el objetivo
        this.puntoRojo = escena.add.circle(escena.jugador.targetX, escena.jugador.y, 8, 0xff0000)
            .setDepth(100);
        this.puntoRojo.setStrokeStyle(2, 0xffffff);
        // El jugador puede ocultar el punto guía en AJUSTES
        // Con teclado o botones el personaje sigue la entrada directamente y
        // el punto guía no hace falta
        this.directo = Controles.manual();
        this.puntoRojo.setVisible(Preferencias.puntoGuia() && !this.directo);

        // Reinicia el estado del seguimiento y restaura los ajustes buenos
        this.ajuste = Object.assign({}, Jugador.AJUSTE_BASE);
        this.reiniciarMovimiento();
        this.diagnosticar();

        // Tamaño
        const tamanoMaximoJugador = 130;
        const anchoOriginal = this.sprite.width;
        const altoOriginal = this.sprite.height;
        if (anchoOriginal > 0 && altoOriginal > 0) {
            const escalaJugador = Math.min(tamanoMaximoJugador / anchoOriginal, tamanoMaximoJugador / altoOriginal);
            this.sprite.setScale(escalaJugador);
        }
        this.actualizarHitbox();

        // Skin de la tienda (tinte + habilidad extra, solo si está equipada)
        this.aplicarSkin();

        // Gráficos (anillo de la supernova)
        this.graficos = escena.add.graphics();
        this.graficos.setDepth(4);
    }

    // -----------------------------------------------------------------
    // SKIN DE LA TIENDA
    //   Pinta al personaje con el tinte de la skin y le da la habilidad
    //   que dice su texto:
    //     iman_plumas      -> las plumas cercanas vuelan hacia ti
    //     luz_lenta        -> la luz se apaga más despacio
    //     supernova_rapida -> la supernova pide solo 2 jades
    //   Sin skin equipada: diseño normal y sin habilidad.
    // -----------------------------------------------------------------
    aplicarSkin() {
        const j = this.escena.jugador;
        const skin = SkinsTienda.activa("jugador");

        j.imanPlumas = 0;
        j.habilidadSkin = null;

        if (!skin) {
            this.sprite.clearTint();
            return;
        }
        this.sprite.setTint(skin.tinte);

        const id = skin.habilidad ? skin.habilidad.id : null;
        j.habilidadSkin = id;
        if (id === "iman_plumas") {
            j.imanPlumas = 230;                 // radio del imán en px
        } else if (id === "luz_lenta") {
            j.velocidadApagado *= 0.6;          // la luz baja un 40% más despacio
        } else if (id === "supernova_rapida") {
            j.jadesNecesarios = 2;              // la supernova pide 2 jades en vez de 3
        }
    }

    // Si la cámara falla en plena partida y se pasa a teclado / botones
    activarModoDirecto() {
        this.directo = true;
        if (this.puntoRojo) {
            this.puntoRojo.setVisible(false);
        }
    }

    // -----------------------------------------------------------------
    // HITBOX
    // -----------------------------------------------------------------
    actualizarHitbox() {
        let escala = this.sprite.scaleX;
        if (escala > 0) {
            let radioFisico = this.escena.jugador.radio / escala;
            this.sprite.body.setCircle(radioFisico, this.sprite.width / 2 - radioFisico, this.sprite.height / 2 - radioFisico);
        }
    }

    // -----------------------------------------------------------------
    // INTERPOLACIÓN: reparte cada lectura de la cámara (~30 por segundo)
    // entre los frames, para que el avance sea continuo y sin tirones.
    // -----------------------------------------------------------------
    interpolarObjetivo(crudo, dt) {
        const a = this.ajuste;
        if (this.interp === null) {
            this.interp = crudo;
            this.muestraOrigen = crudo;
            this.muestraDestino = crudo;
            this.progresoMuestra = a.intervaloMuestra;
            return crudo;
        }
        // Llegó una lectura nueva: se avanza hacia ella desde donde vamos
        if (crudo !== this.muestraDestino) {
            this.muestraOrigen = this.interp;
            this.muestraDestino = crudo;
            this.progresoMuestra = 0;
        }
        this.progresoMuestra += dt;
        const k = Math.min(1, this.progresoMuestra / a.intervaloMuestra);
        this.interp = this.muestraOrigen + (this.muestraDestino - this.muestraOrigen) * k;
        return this.interp;
    }

    // -----------------------------------------------------------------
    // MOVIMIENTO: la cámara actúa como un "control" con aceleración
    // -----------------------------------------------------------------
    actualizarMovimiento(delta) {
        const escena = this.escena;
        const j = escena.jugador;
        const a = this.ajuste;
        const ancho = escena.scale.width;
        // Si el juego estuvo congelado (otra pestaña, pausa larga, tirón fuerte
        // de FPS) se descarta el estado viejo del seguimiento para que no
        // arrastre velocidad ni lecturas antiguas al volver.
        if (delta > 250) {
            this.reiniciarMovimiento();
        }
        // Se limita el delta para que un tirón de FPS no lance al personaje
        const dt = Math.min(delta / 1000, 0.05);
        if (dt <= 0) {
            return;
        }
        const posicionAnterior = j.x;
        const minX = escena.margenLateral + j.radio;
        const maxX = ancho - escena.margenLateral - j.radio;

        // 1. Entrada de la cámara (si todavía no hay dato, se queda quieto)
        let crudo = Number.isFinite(j.targetX) ? j.targetX : j.x;
        crudo = Phaser.Math.Clamp(crudo, minX, maxX);
        const objetivo = this.directo ? crudo : this.interpolarObjetivo(crudo, dt);

        // 2. SmoothDamp con velocidad máxima (te sigue pegado y frena sin rebote)
        const omega = 2 / a.respuesta;
        const x = omega * dt;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        let cambio = j.x - objetivo;
        const maxCambio = a.velocidadMax * a.respuesta;
        cambio = Phaser.Math.Clamp(cambio, -maxCambio, maxCambio);
        const objetivoAjustado = j.x - cambio;
        const temp = (this.velX + omega * cambio) * dt;
        this.velX = (this.velX - omega * temp) * exp;
        let salida = objetivoAjustado + (cambio + temp) * exp;

        // Evita pasarse del objetivo (sin rebote)
        if ((objetivo - j.x > 0) === (salida > objetivo)) {
            salida = objetivo;
            this.velX = 0;
        }

        // Límites del área jugable
        if (salida < minX) {
            salida = minX;
            if (this.velX < 0) this.velX = 0;
        } else if (salida > maxX) {
            salida = maxX;
            if (this.velX > 0) this.velX = 0;
        }
        j.x = salida;

        // 3. Dirección y animación (independiente de los FPS)
        const velocidadReal = (j.x - posicionAnterior) / dt;
        const velocidadMinima = 30;
        this.moviendo = Math.abs(velocidadReal) > velocidadMinima;
        if (velocidadReal > velocidadMinima) {
            this.direccion = 1;
        } else if (velocidadReal < -velocidadMinima) {
            this.direccion = -1;
        }

        this.actualizarAnimacion(delta);
        this.sprite.x = j.x;
        this.sprite.y = j.y;

        // 4. El punto rojo va SIEMPRE encima del personaje
        this.puntoRojo.x = j.x;
        this.puntoRojo.y = j.y;

        // 5. Sincronizar la hitbox con la posición nueva
        if (this.sprite.body) {
            this.sprite.body.updateFromGameObject();
        }
    }

    // -----------------------------------------------------------------
    // ANIMACIÓN
    // -----------------------------------------------------------------
    actualizarAnimacion(delta) {
        if (!this.moviendo) {
            if (this.sprite.texture.key !== "jugador1") {
                this.sprite.setTexture("jugador1");
            }
            this.frame = 1;
            this.tiempoAnimacion = 0;
            return;
        }
        if (this.direccion > 0) {
            this.sprite.setFlipX(false);
        } else if (this.direccion < 0) {
            this.sprite.setFlipX(true);
        }
        this.tiempoAnimacion += delta;
        if (this.tiempoAnimacion >= this.velocidadAnimacion) {
            this.tiempoAnimacion = 0;
            this.frame = this.frame === 2 ? 3 : 2;
            this.sprite.setTexture(this.frame === 2 ? "jugador2" : "jugador3");
        }
    }

    // -----------------------------------------------------------------
    // SUPERNOVA
    // -----------------------------------------------------------------
    activarSupernova() {
        const escena = this.escena;
        const j = escena.jugador;
        j.supernovaActiva = true;
        j.supernovaRadio = j.radio;
        j.jades = 0;
        escena.modUI.actualizarJades();
        escena.pausaGeneracionEnemigos = 10;
        escena.pausaGeneracionItemGem = 10;
        if (Preferencias.efectosVisuales()) {
            escena.cameras.main.flash(600, 255, 255, 255);
        }

        escena.modEnemigos.aplicarSupernova();

        if (escena.nivelActual === 3 && escena.modBoss.datos) {
            // Si el jefe cae, su cinemática de muerte (Boss.iniciarMuerte) llama
            // sola a la pantalla de victoria cuando termina.
            escena.modBoss.recibirSupernova();
        }
    }

    // Crecimiento del anillo de la supernova (se llama en cada frame)
    actualizarSupernova() {
        const j = this.escena.jugador;
        if (j.supernovaActiva) {
            j.supernovaRadio += 5;
            if (j.supernovaRadio > j.supernovaRadioMax) {
                j.supernovaActiva = false;
                j.supernovaRadio = 0;
            }
        }
    }

    // -----------------------------------------------------------------
    // RENDER
    // -----------------------------------------------------------------
    renderizar() {
        const escena = this.escena;
        const j = escena.jugador;
        this.graficos.clear();
        if (j.supernovaActiva) {
            this.graficos.lineStyle(5, 0xffffff, 0.8);
            this.graficos.strokeCircle(j.x, j.y, j.supernovaRadio);
        }
        if (escena.juegoActivo && this.sprite) {
            this.sprite.x = j.x;
            this.sprite.y = j.y;
            this.sprite.setVisible(true);
        }
    }

    // Oculta sprite y punto rojo (pantallas finales)
    ocultar() {
        if (this.sprite) {
            this.sprite.setVisible(false);
        }
        if (this.puntoRojo) {
            this.puntoRojo.setVisible(false);
        }
    }
}

// Versión del movimiento (súbela si cambias los valores de abajo)
Jugador.VERSION_MOVIMIENTO = 3;

// Valores buenos del movimiento (los que ya probaste y siguen fielmente).
// Object.freeze = solo lectura: ningún otro archivo puede cambiarlos.
Jugador.AJUSTE_BASE = Object.freeze({
    intervaloMuestra: 0.036, // s entre lecturas de la cámara (~30 por segundo)
    respuesta: 0.045,        // s: más bajo = el personaje te sigue más pegado
    velocidadMax: 2600       // px/s: tope; bájalo si aún se siente "loco"
});