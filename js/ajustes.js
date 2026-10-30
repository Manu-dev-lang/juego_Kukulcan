// Medidas del panel (en píxeles del juego)
const AJUSTES_COL = 520;          // ancho de cada columna
const AJUSTES_HUECO = 60;         // espacio entre columnas
const AJUSTES_MARGEN = 30;        // margen interior del panel
const AJUSTES_FILA = 58;          // alto de una fila (slider o interruptor)
const AJUSTES_ENCABEZADO = 52;    // alto de un título de sección
const AJUSTES_IDIOMA = 76;        // alto de la fila de idioma
const AJUSTES_PRUEBA = 118;       // alto de la prueba de movimiento

// Colores de cada skin
const AJUSTES_PALETA = {
    normal: {
        panel: 0x1b0e05,
        panelAlpha: 0.86,
        borde: 0xffe600,
        acento: 0xe8760f,
        acentoClaro: 0xffd400,
        pista: 0x4a3118,
        texto: "#fff3d1",
        tenue: "#d9b87a",
        encabezado: "#ffcf4d",
        tituloRelleno: "#ff7878",
        tituloContorno: "#fff676"
    },
    navidad: {
        panel: 0x071a33,
        panelAlpha: 0.88,
        borde: 0xffffff,
        acento: 0xd40000,
        acentoClaro: 0xff5252,
        pista: 0x24405f,
        texto: "#eef8ff",
        tenue: "#a9cbe3",
        encabezado: "#ff9a9a",
        tituloRelleno: "#ff7878",
        tituloContorno: "#c5daf0"
    }
};

const AJUSTES_FUENTE_EMOJI = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

class Ajustes extends Phaser.Scene {
    constructor() {
        super("Ajustes");
    }

    init(data) {
        this.sinFade = !!(data && data.sinFade);
        this.saliendo = false;
        this.arrastre = null;
        this.toggleCompleta = null;
        this.prueba = null;
        this.detector = null;
        this.hayCamara = null;
    }

    // =============================================================
    // CREATE
    // =============================================================
    create() {
        const ancho = this.scale.width;
        const alto = this.scale.height;
        const esNavidad = (window.carpetaSkin || "").includes("navidad");
        this.pal = esNavidad ? AJUSTES_PALETA.navidad : AJUSTES_PALETA.normal;
        this.juego = this.sys.game;

        // La música del menú sigue sonando: se asegura que tenga el volumen actual
        Preferencias.aplicarAudio(this.juego);

        // Fondo
        this.add.image(ancho / 2, alto / 2, "menu_background").setDisplaySize(ancho, alto);
        this.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 0.35);

        // Título
        this.add.text(ancho / 2, 58, Idioma.t("ajustes.titulo"), {
            fontSize: "44px",
            fill: this.pal.tituloRelleno,
            stroke: this.pal.tituloContorno,
            strokeThickness: 6,
            fontFamily: "Georgia, serif",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Panel (se dibuja al final, cuando se sabe cuánto mide)
        const anchoPanel = AJUSTES_COL * 2 + AJUSTES_HUECO + AJUSTES_MARGEN * 2;
        const panelX = ancho / 2 - anchoPanel / 2;
        const panelY = 110;
        const xIzq = panelX + AJUSTES_MARGEN;
        const xDer = xIzq + AJUSTES_COL + AJUSTES_HUECO;
        const yInicio = panelY + 28;

        // ---------------------------------------------------------
        // COLUMNA IZQUIERDA: SONIDO, IDIOMA, PANTALLA
        // ---------------------------------------------------------
        let yi = yInicio;
        yi = this.encabezado(xIzq, yi, Idioma.t("ajustes.sonido"));
        yi = this.crearFilasAudio(xIzq, yi);

        yi = this.encabezado(xIzq, yi, Idioma.t("ajustes.idioma"));
        yi = this.crearFilaIdioma(xIzq, yi);

        yi = this.encabezado(xIzq, yi, Idioma.t("ajustes.pantalla"));
        const soportaCompleta = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
        if (soportaCompleta) {
            this.toggleCompleta = this.filaToggle(xIzq, yi, Idioma.t("ajustes.completa"), this.enPantallaCompleta(), (activo) => {
                this.alternarPantallaCompleta(activo);
            });
            yi += AJUSTES_FILA;
        }
        this.filaToggle(xIzq, yi, Idioma.t("ajustes.efectosVisuales"), Preferencias.efectosVisuales(), (activo) => {
            Preferencias.cfg().pantalla.efectosVisuales = activo;
            Preferencias.guardar();
        });
        yi += AJUSTES_FILA;

        // ---------------------------------------------------------
        // COLUMNA DERECHA: CONTROL (+ CÁMARA si se juega con ella)
        // ---------------------------------------------------------
        let yd = yInicio;
        yd = this.encabezado(xDer, yd, Idioma.t("ajustes.control"));
        yd = this.crearFilasControl(xDer, yd);
        if (Controles.usaCamara()) {
            yd = this.encabezado(xDer, yd, Idioma.t("ajustes.camara"));
            yd = this.crearFilasCamara(xDer, yd);
        }

        // Panel detrás de todo
        const altoPanel = Math.max(yi, yd) - panelY + 28;
        const panel = this.add.graphics().setDepth(-1);
        panel.fillStyle(this.pal.panel, this.pal.panelAlpha).fillRoundedRect(panelX, panelY, anchoPanel, altoPanel, 22);
        panel.lineStyle(3, this.pal.borde, 0.9).strokeRoundedRect(panelX, panelY, anchoPanel, altoPanel, 22);
        panel.lineStyle(1, this.pal.borde, 0.25).lineBetween(
            xIzq + AJUSTES_COL + AJUSTES_HUECO / 2, panelY + 28,
            xIzq + AJUSTES_COL + AJUSTES_HUECO / 2, panelY + altoPanel - 28
        );

        // ---------------------------------------------------------
        // BOTONES INFERIORES
        // ---------------------------------------------------------
        const yBotones = Math.min(panelY + altoPanel + 70, alto - 60);

        const botonRestablecer = window.crearBotonEstilo(this, ancho / 2 - 170, yBotones, Idioma.t("ajustes.restablecer"), {
            tam: 24,
            origen: [0.5, 0.5],
            relleno: { x: 30, y: 10 },
            escalaHover: 1.1
        });
        botonRestablecer.on("pointerdown", () => {
            Preferencias.restablecer();
            Preferencias.aplicarAudio(this.juego);
            // Los valores de fábrica juegan con la cámara: se vuelve a encender
            Controles.iniciarCamara();
            this.scene.restart({ sinFade: true });
        });

        const botonVolver = window.crearBotonEstilo(this, ancho / 2 + 170, yBotones, Idioma.t("comun.volver"), {
            tam: 26,
            origen: [0.5, 0.5],
            relleno: { x: 35, y: 10 },
            escalaHover: 1.1
        });
        botonVolver.on("pointerdown", () => this.volver());

        // ---------------------------------------------------------
        // ENTRADA: arrastre de sliders, teclado, pantalla completa
        // ---------------------------------------------------------
        this.input.on("pointermove", (puntero) => {
            if (this.arrastre && puntero.isDown) {
                this.arrastre.mover(puntero);
            }
        });
        const soltar = () => {
            if (this.arrastre) {
                const actual = this.arrastre;
                this.arrastre = null;
                if (actual.soltar) {
                    actual.soltar();
                }
            }
        };
        this.input.on("pointerup", soltar);
        this.input.on("pointerupoutside", soltar);
        this.input.on("gameout", soltar);

        if (this.input.keyboard) {
            this.input.keyboard.on("keydown-ESC", () => this.volver());
        }

        this.alCambiarPantalla = () => {
            if (this.toggleCompleta) {
                this.toggleCompleta.setValor(this.enPantallaCompleta());
            }
        };
        document.addEventListener("fullscreenchange", this.alCambiarPantalla);
        document.addEventListener("webkitfullscreenchange", this.alCambiarPantalla);
        this.events.once("shutdown", () => {
            document.removeEventListener("fullscreenchange", this.alCambiarPantalla);
            document.removeEventListener("webkitfullscreenchange", this.alCambiarPantalla);
            Preferencias.guardar();
        });

        // Detector de movimiento para la prueba (el mismo que usa la partida)
        // (solo si se juega con la cámara)
        if (Controles.usaCamara()) {
            this.simulado = {
                scale: this.scale,
                margenLateral: 0,
                jugador: { radio: 0, targetX: undefined }
            };
            this.detector = new ControlCamara(this.simulado);
            this.detector.iniciar();
        }

        if (!this.sinFade) {
            this.cameras.main.fadeIn(400, 0, 0, 0);
        }
    }

    // =============================================================
    // UPDATE: prueba de movimiento
    // =============================================================
    update(time) {
        if (!this.detector || !this.prueba) {
            return;
        }
        this.detector.actualizar(time);

        const p = this.prueba;
        const hayCamara = !!(window.camaraStream && window.camaraStream.active);
        if (hayCamara !== this.hayCamara) {
            this.hayCamara = hayCamara;
            p.ayuda.setText(Idioma.t(hayCamara ? "ajustes.pruebaAyuda" : "ajustes.sinCamara"));
            p.ayuda.setColor(hayCamara ? this.pal.tenue : "#ff8a80");
            p.marcador.setVisible(hayCamara);
        }

        const objetivo = this.simulado.jugador.targetX;
        if (hayCamara && objetivo !== undefined) {
            const fraccion = Phaser.Math.Clamp(objetivo / this.scale.width, 0, 1);
            const destino = p.x + p.ancho * fraccion;
            p.marcador.x += (destino - p.marcador.x) * 0.35;
        }
    }

    // =============================================================
    // AYUDAS DE DIBUJO
    // =============================================================
    txt(x, y, texto, estilo) {
        return this.add.text(x, y, texto, Object.assign({
            fontFamily: "Georgia, serif",
            fontSize: "20px",
            color: this.pal.texto,
            resolution: 2
        }, estilo || {}));
    }

    // Título de sección con línea debajo. Devuelve la Y donde sigue el contenido.
    encabezado(x, y, texto) {
        this.txt(x, y + 18, texto, {
            fontSize: "22px",
            fontStyle: "bold",
            color: this.pal.encabezado
        }).setOrigin(0, 0.5);
        const linea = this.add.graphics();
        linea.lineStyle(2, this.pal.borde, 0.5).lineBetween(x, y + 38, x + AJUSTES_COL, y + 38);
        return y + AJUSTES_ENCABEZADO;
    }

    // =============================================================
    // SLIDER (con botón de silencio opcional)
    //
    //   etiqueta, valor (0..1), texto(v) -> "70%",
    //   alCambiar(v) mientras se arrastra, alSoltar() al terminar,
    //   silenciado() / alternarSilencio() -> opcionales (icono 🔊/🔇)
    // =============================================================
    filaSlider(x, y, o) {
        const yc = y + AJUSTES_FILA / 2;
        const pistaX = x + 200;
        const pistaAncho = 180;
        let valor = Phaser.Math.Clamp(o.valor, 0, 1);
        let silenciado = o.silenciado ? o.silenciado() : false;

        const etiqueta = this.txt(x, yc, o.etiqueta, { fontStyle: "bold" }).setOrigin(0, 0.5);
        const porcentaje = this.txt(x + 400, yc, "", { fontSize: "18px" }).setOrigin(0, 0.5);
        const g = this.add.graphics();

        const dibujar = () => {
            const activo = !silenciado;
            const h = 10;
            g.clear();
            g.fillStyle(this.pal.pista, 1).fillRoundedRect(pistaX, yc - h / 2, pistaAncho, h, h / 2);
            const lleno = pistaAncho * valor;
            if (lleno >= 1) {
                g.fillStyle(activo ? this.pal.acento : 0x6b6b6b, 1)
                    .fillRoundedRect(pistaX, yc - h / 2, lleno, h, Math.min(h / 2, lleno / 2));
            }
            g.fillStyle(activo ? 0xffffff : 0xb0b0b0, 1).fillCircle(pistaX + lleno, yc, 13);
            g.lineStyle(3, activo ? this.pal.borde : 0x777777, 1).strokeCircle(pistaX + lleno, yc, 13);
            porcentaje.setText(o.texto(valor));
            etiqueta.setAlpha(activo ? 1 : 0.55);
            porcentaje.setAlpha(activo ? 1 : 0.55);
        };

        const desdePuntero = (puntero) => {
            valor = Phaser.Math.Clamp((puntero.x - pistaX) / pistaAncho, 0, 1);
            o.alCambiar(valor);
            dibujar();
        };

        const zona = this.add.zone(pistaX + pistaAncho / 2, yc, pistaAncho + 40, 44)
            .setInteractive({ useHandCursor: true });
        zona.on("pointerdown", (puntero) => {
            this.arrastre = { mover: desdePuntero, soltar: o.alSoltar };
            desdePuntero(puntero);
        });

        if (o.alternarSilencio) {
            const icono = this.txt(x + 495, yc, silenciado ? "🔇" : "🔊", {
                fontFamily: AJUSTES_FUENTE_EMOJI,
                fontSize: "28px"
            }).setOrigin(0.5);
            const zonaIcono = this.add.zone(x + 495, yc, 48, 48).setInteractive({ useHandCursor: true });
            zonaIcono.on("pointerdown", () => {
                silenciado = o.alternarSilencio();
                icono.setText(silenciado ? "🔇" : "🔊");
                dibujar();
            });
        }

        dibujar();
    }

    // =============================================================
    // INTERRUPTOR SÍ / NO
    // Devuelve { setValor(activo) } para poder refrescarlo desde fuera.
    // =============================================================
    filaToggle(x, y, texto, inicial, alCambiar) {
        const yc = y + AJUSTES_FILA / 2;
        const w = 64;
        const h = 32;
        const px = x + AJUSTES_COL - w;
        let activo = !!inicial;

        this.txt(x, yc, texto, { fontStyle: "bold" }).setOrigin(0, 0.5);
        const g = this.add.graphics();
        const dibujar = () => {
            g.clear();
            g.fillStyle(activo ? this.pal.acento : 0x4a4a4a, 1).fillRoundedRect(px, yc - h / 2, w, h, h / 2);
            g.lineStyle(3, activo ? this.pal.borde : 0x8a8a8a, 1).strokeRoundedRect(px, yc - h / 2, w, h, h / 2);
            g.fillStyle(0xffffff, 1).fillCircle(activo ? px + w - h / 2 : px + h / 2, yc, 11);
        };
        dibujar();

        const zona = this.add.zone(x + AJUSTES_COL / 2, yc, AJUSTES_COL, AJUSTES_FILA - 6)
            .setInteractive({ useHandCursor: true });
        zona.on("pointerdown", () => {
            activo = !activo;
            dibujar();
            window.reproducirSonidoBoton(this);
            alCambiar(activo);
        });

        return {
            setValor: (valor) => {
                activo = !!valor;
                dibujar();
            }
        };
    }

    // =============================================================
    // SECCIONES
    // =============================================================
    crearFilasAudio(x, y) {
        const filas = [
            { etiqueta: "ajustes.general", volumen: "general", silencio: "silenciarGeneral", muestra: true },
            { etiqueta: "ajustes.musica", volumen: "musica", silencio: "silenciarMusica", muestra: false },
            { etiqueta: "ajustes.efectos", volumen: "efectos", silencio: "silenciarEfectos", muestra: true }
        ];
        filas.forEach((fila) => {
            this.filaSlider(x, y, {
                etiqueta: Idioma.t(fila.etiqueta),
                valor: Preferencias.audio(fila.volumen),
                texto: (v) => Math.round(v * 100) + "%",
                alCambiar: (v) => {
                    Preferencias.setAudio(fila.volumen, v);
                    Preferencias.aplicarAudio(this.juego);
                },
                alSoltar: () => {
                    Preferencias.guardar();
                    // Al soltar suena un clic para oír el nivel elegido
                    if (fila.muestra) {
                        window.reproducirSonidoBoton(this);
                    }
                },
                silenciado: () => Preferencias.audio(fila.silencio),
                alternarSilencio: () => {
                    const nuevo = !Preferencias.audio(fila.silencio);
                    Preferencias.setAudio(fila.silencio, nuevo);
                    Preferencias.aplicarAudio(this.juego);
                    Preferencias.guardar();
                    if (!nuevo && fila.muestra) {
                        window.reproducirSonidoBoton(this);
                    }
                    return nuevo;
                }
            });
            y += AJUSTES_FILA;
        });
        return y;
    }

    crearFilaIdioma(x, y) {
        const opciones = [
            { codigo: "es", nombre: "Español" },
            { codigo: "en", nombre: "English" }
        ];
        const hueco = 20;
        const w = (AJUSTES_COL - hueco) / 2;
        const h = 50;
        const yc = y + AJUSTES_IDIOMA / 2 - 6;
        const actual = Idioma.actual();

        opciones.forEach((opcion, i) => {
            const bx = x + i * (w + hueco);
            const activo = opcion.codigo === actual;
            const g = this.add.graphics();
            g.fillStyle(activo ? this.pal.acento : this.pal.pista, 1).fillRoundedRect(bx, yc - h / 2, w, h, 14);
            g.lineStyle(activo ? 3 : 2, this.pal.borde, activo ? 1 : 0.45).strokeRoundedRect(bx, yc - h / 2, w, h, 14);
            this.txt(bx + w / 2, yc, opcion.nombre, {
                fontSize: "22px",
                fontStyle: "bold",
                color: activo ? "#ffffff" : this.pal.tenue
            }).setOrigin(0.5);

            const zona = this.add.zone(bx + w / 2, yc, w, h).setInteractive({ useHandCursor: true });
            zona.on("pointerdown", () => {
                if (opcion.codigo === Idioma.actual()) {
                    return;
                }
                window.reproducirSonidoBoton(this);
                Idioma.cambiar(opcion.codigo);
                // Si hay imágenes con texto en inglés, se cargan antes de redibujar
                Idioma.cargarExtras(this, () => this.scene.restart({ sinFade: true }));
            });
        });
        return y + AJUSTES_IDIOMA;
    }

    // Elegir cómo se juega: con la cámara, o con teclado (A / D) y botones
    // en pantalla. Al cambiarlo se redibuja la columna.
    crearFilasControl(x, y) {
        const usa = Controles.usaCamara();
        this.filaToggle(x, y, Idioma.t("ajustes.usarCamara"), usa, (activo) => {
            Controles.setUsaCamara(activo);
            if (activo) {
                Controles.iniciarCamara();
            } else {
                Controles.detenerCamara();
            }
            this.scene.restart({ sinFade: true });
        });
        y += AJUSTES_FILA;

        const lineas = usa
            ? [Idioma.t("ajustes.controlAyudaOn")]
            : [Idioma.t("ajustes.controlTeclado"), Idioma.t("ajustes.controlTactil")];
        const ayuda = this.txt(x, y - 4, lineas.join("\n"), {
            fontSize: "16px",
            color: this.pal.tenue,
            wordWrap: { width: AJUSTES_COL },
            lineSpacing: 6
        }).setOrigin(0, 0);
        return y + ayuda.height + 18;
    }

    crearFilasCamara(x, y) {
        const rango = Preferencias.SENSIBILIDAD;
        const aValor = (v) => rango.min + v * (rango.max - rango.min);

        // Sensibilidad: cuánto se amplifica tu movimiento
        this.filaSlider(x, y, {
            etiqueta: Idioma.t("ajustes.sensibilidad"),
            valor: (Preferencias.sensibilidadCamara() - rango.min) / (rango.max - rango.min),
            texto: (v) => aValor(v).toFixed(1) + "×",
            alCambiar: (v) => Preferencias.setCamara("sensibilidad", aValor(v)),
            alSoltar: () => Preferencias.guardar()
        });
        y += AJUSTES_FILA;

        // Suavizado: más alto = el personaje se mueve más fluido pero tarda más en responder
        this.filaSlider(x, y, {
            etiqueta: Idioma.t("ajustes.suavizado"),
            valor: Preferencias.camara("suavizado"),
            texto: (v) => Math.round(v * 100) + "%",
            alCambiar: (v) => Preferencias.setCamara("suavizado", v),
            alSoltar: () => Preferencias.guardar()
        });
        y += AJUSTES_FILA;

        // Prueba de movimiento en vivo
        this.crearPrueba(x, y);
        y += AJUSTES_PRUEBA;

        this.filaToggle(x, y, Idioma.t("ajustes.mostrarCamara"), Preferencias.camaraVisible(), (activo) => {
            Preferencias.setCamara("mostrar", activo);
            Preferencias.aplicarCamaraDOM();
            Preferencias.guardar();
        });
        y += AJUSTES_FILA;

        this.filaToggle(x, y, Idioma.t("ajustes.puntoGuia"), Preferencias.puntoGuia(), (activo) => {
            Preferencias.setCamara("puntoGuia", activo);
            Preferencias.guardar();
        });
        y += AJUSTES_FILA;

        return y;
    }

    // Barra horizontal con un marcador que sigue tu posición frente a la cámara
    crearPrueba(x, y) {
        this.txt(x, y + 14, Idioma.t("ajustes.prueba"), { fontStyle: "bold" }).setOrigin(0, 0.5);

        const yBarra = y + 56;
        const g = this.add.graphics();
        g.fillStyle(this.pal.pista, 1).fillRoundedRect(x, yBarra - 12, AJUSTES_COL, 24, 12);
        g.lineStyle(2, this.pal.borde, 0.5).strokeRoundedRect(x, yBarra - 12, AJUSTES_COL, 24, 12);
        g.lineStyle(2, this.pal.borde, 0.35).lineBetween(x + AJUSTES_COL / 2, yBarra - 12, x + AJUSTES_COL / 2, yBarra + 12);

        const marcador = this.add.circle(x + AJUSTES_COL / 2, yBarra, 15, this.pal.acentoClaro)
            .setStrokeStyle(3, 0xffffff)
            .setDepth(5);

        const ayuda = this.txt(x, y + 96, "", {
            fontSize: "15px",
            color: this.pal.tenue,
            wordWrap: { width: AJUSTES_COL }
        }).setOrigin(0, 0.5);

        this.prueba = { x: x, ancho: AJUSTES_COL, marcador: marcador, ayuda: ayuda };
    }

    // =============================================================
    // PANTALLA COMPLETA (de toda la página, para que la cámara web
    // flotante también se vea)
    // =============================================================
    enPantallaCompleta() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    alternarPantallaCompleta(activar) {
        const raiz = document.documentElement;
        let resultado = null;
        if (activar) {
            const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
            if (pedir) {
                resultado = pedir.call(raiz);
            }
        } else {
            const salir = document.exitFullscreen || document.webkitExitFullscreen;
            if (salir && this.enPantallaCompleta()) {
                resultado = salir.call(document);
            }
        }
        if (resultado && typeof resultado.catch === "function") {
            resultado.catch(() => {
                // El navegador la rechazó: el interruptor vuelve a su estado real
                this.alCambiarPantalla();
            });
        }
    }

    // =============================================================
    // SALIR
    // =============================================================
    volver() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        Preferencias.guardar();
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("Inicio");
        });
    }
}