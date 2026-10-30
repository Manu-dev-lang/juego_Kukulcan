class Items {
    constructor(escena) {
        this.escena = escena;
        this.grupo = null;
        this.siguienteTipo = "pluma";
    }

    crear() {
        this.grupo = this.escena.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
        this.siguienteTipo = "pluma";
    }

    // -----------------------------------------------------------------
    // GENERAR (alterna pluma / jade)
    // -----------------------------------------------------------------
    generar(ancho, esNivel3, multiplicadorVelocidad) {
        const escena = this.escena;
        const tamItem = window.configTamanos.items;
        const xAleatoria = UtilJuego.posicionXAleatoriaJugable(ancho, Math.ceil(tamItem / 2));

        let tipoItem = this.siguienteTipo;
        if (tipoItem === "jade" && escena.pausaGeneracionItemGem > 0) {
            tipoItem = "pluma";
        }
        this.siguienteTipo = tipoItem === "pluma" ? "jade" : "pluma";

        let item = this.crearImagen(tipoItem, xAleatoria, -tamItem / 2);
        if (!item) {
            return;
        }
        item.tipo = tipoItem;

        // Velocidad fija según la dificultad, igual en los 3 niveles
        item.velocidad = 3 * escena.velocidadGlobalJuego * multiplicadorVelocidad * escena.dificultad.items;

        // Colores del rastro según la skin
        const coloresPluma = escena.esNavidad ? [
            0xffd700,
            0xffffff
        ] : [
            0x00ff7f,
            0xffffff
        ];
        const coloresJade = escena.esNavidad ? [
            0x00ffff,
            0xff0000
        ] : [
            0x00ffff,
            0x40e0d0
        ];
        UtilJuego.configurarEmisorRastro(escena, item, tipoItem === "pluma" ? coloresPluma : coloresJade, 35);
    }

    // -----------------------------------------------------------------
    // CREAR IMAGEN (toma un sprite libre del pool)
    // -----------------------------------------------------------------
    crearImagen(tipo, x, y) {
        const clave = tipo === "pluma" ? "ItemPlu" : "ItemGem";
        if (!this.escena.textures.exists(clave)) {
            return null;
        }
        let sprite = this.grupo.get(x, y);
        if (!sprite) {
            return null;
        }
        sprite.setTexture(clave)
            .setActive(true)
            .setVisible(true)
            .setOrigin(0.5)
            .setDepth(3)
            .clearTint();
        UtilJuego.configurarEntidadGrafica(sprite, window.configTamanos.items, 0x00ffaa);
        return sprite;
    }

    // -----------------------------------------------------------------
    // ACTUALIZAR (se llama en cada frame)
    // -----------------------------------------------------------------
    actualizar() {
        const alto = this.escena.scale.height;
        const j = this.escena.jugador;
        // Habilidad de la skin "Imán de plumas": radio en px (0 = sin imán)
        const radioIman = (j && j.imanPlumas) || 0;

        this.grupo.children.iterate(it => {
            if (!it || !it.active) {
                return;
            }
            it.y += it.velocidad;

            // Imán: las plumas cercanas vuelan hacia el jugador
            if (radioIman > 0 && it.tipo === "pluma") {
                const dx = j.x - it.x;
                const dy = j.y - it.y;
                const distancia = Math.sqrt(dx * dx + dy * dy);
                if (distancia < radioIman && distancia > 1) {
                    const paso = Math.min(distancia, 9);
                    it.x += dx / distancia * paso;
                    it.y += dy / distancia * paso;
                }
            }

            if (it.tipo === "pluma") {
                it.angle = Math.sin(it.y * 0.05) * 28;
            } else if (it.tipo === "jade") {
                it.rotation += 0.06;
            }
            if (it.y > alto + 100) {
                if (it.emisor) {
                    it.emisor.emitting = false;
                }
                this.grupo.killAndHide(it);
            }
        });
    }

    // -----------------------------------------------------------------
    // COLISIÓN CON EL JUGADOR (callback del overlap)
    // -----------------------------------------------------------------
    alColisionarJugador(jugadorSprite, it) {
        if (!it.active) {
            return;
        }
        const escena = this.escena;
        const j = escena.jugador;

        if (it.tipo === "pluma") {
            // --- REPRODUCIR SONIDO DE PLUMA ---
            escena.sound.play("sonido_pluma");

            // --- CARTERA DE LA TIENDA (se guarda y sobrevive entre partidas) ---
            Progreso.sumarMonedas("plumas", 1);

            j.luz = Math.min(j.maxLuz, j.luz + 20);
            // (ya no se acelera el juego al recoger plumas: la velocidad es fija)
        } else if (it.tipo === "jade") {
            // --- REPRODUCIR SONIDO DE JADE ---
            escena.sound.play("sonido_jade");

            // --- CARTERA DE LA TIENDA (aparte del contador de la supernova) ---
            Progreso.sumarMonedas("jades", 1);

            j.jades++;
            escena.modUI.actualizarJades();
            if (j.radio < 80) {
                j.radio += 4;
                escena.modJugador.actualizarHitbox();
            }
            if (j.jades >= j.jadesNecesarios) {
                escena.modJugador.activarSupernova();
            }
        }
        if (it.emisor) {
            it.emisor.emitting = false;
        }
        this.grupo.killAndHide(it);
    }

    // -----------------------------------------------------------------
    // ELIMINAR TODOS los items activos
    // -----------------------------------------------------------------
    eliminarTodos() {
        this.grupo.children.iterate(it => {
            if (it && it.active) {
                if (it.emisor) {
                    it.emisor.emitting = false;
                }
                this.grupo.killAndHide(it);
            }
        });
    }
}