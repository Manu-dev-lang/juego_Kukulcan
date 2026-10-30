class Juego extends Phaser.Scene {
    constructor() {
        super("Juego");
    }

    // =============================================================
    // INIT
    // =============================================================
    init(data) {
        this.startAtLevel3 = data && data.startAtLevel3 ? true : false;

        // Dificultad elegida en el menú (facil / normal / dificil)
        let clave = (data && data.dificultad) || window.dificultadActual || "normal";
        if (!window.configDificultad || !window.configDificultad[clave]) {
            clave = "normal";
        }
        window.dificultadActual = clave;
        this.dificultadClave = clave;
        this.dificultad = window.configDificultad[clave];
    }

    // =============================================================
    // PRELOAD (recursos de la skin activa)
    // =============================================================
    preload() {
        const rutaSkin = window.carpetaSkin || "assets_normal/";
        this.load.setPath(rutaSkin);
        if (!this.textures.exists("jugador1"))
            this.load.image("jugador1", "jugador1.png");
        if (!this.textures.exists("jugador2"))
            this.load.image("jugador2", "jugador2.png");
        if (!this.textures.exists("jugador3"))
            this.load.image("jugador3", "jugador3.png");
        if (!this.textures.exists("ItemPlu"))
            this.load.image("ItemPlu", "ItemPlu.png");
        if (!this.textures.exists("ItemGem"))
            this.load.image("ItemGem", "ItemGem.png");
        if (!this.textures.exists("enemigo_1"))
            this.load.image("enemigo_1", "enemigo_1.png");
        if (!this.textures.exists("enemigo_2"))
            this.load.image("enemigo_2", "enemigo_2.png");
        if (!this.textures.exists("boss1"))
            this.load.image("boss1", "boss1.png");
        if (!this.textures.exists("boss2"))
            this.load.image("boss2", "boss2.png");

        // Imagen de la pantalla de victoria (estilo cómic).
        const skinVictoria = rutaSkin.includes("navidad") ? "navidad" : "normal";
        const datosVictoria = (typeof VICTORIA_JEFE !== "undefined") ? VICTORIA_JEFE[skinVictoria] : null;
        const claveVictoria = "victoria_jefe_" + skinVictoria;
        if (datosVictoria && datosVictoria.imagen && !this.textures.exists(claveVictoria)) {
            this.load.image(claveVictoria, datosVictoria.imagen);
        }
    }

    // =============================================================
    // CREATE
    // =============================================================
    create() {
        // Skin activa (se calcula una sola vez y la leen todos los módulos)
        this.esNavidad = (window.carpetaSkin || "assets_normal/").includes("navidad");

        // ---------------------------------------------------------
        // FONDOS + ILUMINACIÓN
        // ---------------------------------------------------------
        this.modFondos = new Fondos(this);
        this.modFondos.crear();
        this.modIluminacion = new Iluminacion(this);
        this.modIluminacion.configurar(this.modFondos.capas);

        // ---------------------------------------------------------
        // ESTADO GLOBAL
        // ---------------------------------------------------------
        this.juegoActivo = true;
        this.juegoIniciado = false;
        this.gameOver = false;
        this.pausando = false;
        this.cronometro = this.startAtLevel3 ? 60 : 0;
        this.nivelActual = this.startAtLevel3 ? 3 : 1;
        this.velocidadGlobalJuego = 1;
        this.pausaGeneracionEnemigos = 0;
        this.pausaGeneracionItemGem = 0;

        // ---------------------------------------------------------
        // MÓDULOS DE JUEGO
        // ---------------------------------------------------------
        UtilJuego.asegurarTexturaRastro(this);
        this.modJugador = new Jugador(this);
        this.modJugador.crear();
        this.modEnemigos = new Enemigos(this);
        this.modEnemigos.crear();
        this.modItems = new Items(this);
        this.modItems.crear();
        this.modBoss = new Boss(this);
        this.modEclipse = new Eclipse(this);
        this.modEclipse.crear();
        this.modFin = new PantallasFin(this);

        // ---------------------------------------------------------
        // COLISIONES
        // ---------------------------------------------------------
        this.physics.add.overlap(this.modJugador.sprite, this.modEnemigos.grupo, this.modEnemigos.alColisionarJugador, null, this.modEnemigos);
        this.physics.add.overlap(this.modJugador.sprite, this.modItems.grupo, this.modItems.alColisionarJugador, null, this.modItems);

        // ---------------------------------------------------------
        // MÚSICA
        // ---------------------------------------------------------
        this.sound.stopAll();
        this.sound.removeAll();
        this.musica = this.sound.add("musicaJ", {
            loop: true,
            volume: 0.5
        });
        this.musica.play();

        // ---------------------------------------------------------
        // INTERFAZ + MARCO
        // ---------------------------------------------------------
        this.modUI = new UI(this);
        this.modUI.crearInterfaz();
        this.modUI.crearMarco();

        // ---------------------------------------------------------
        // CONTROL: cámara (por defecto) o teclado / botones en pantalla,
        // según lo que el jugador eligió en AJUSTES
        // ---------------------------------------------------------
        this.modoManual = false;
        if (Controles.manual()) {
            this.usarControlManual();
        } else {
            this.modCamara = new ControlCamara(this);
            this.modCamara.iniciar();
        }

        // ---------------------------------------------------------
        // PAUSA
        // ---------------------------------------------------------
        this.crearBotonPausa();

        // ---------------------------------------------------------
        // GENERADOR DE ENEMIGOS E ITEMS
        // ---------------------------------------------------------
        this.eventoGenerador = this.time.addEvent({
            delay: 1000,
            callback: this.crearObstaculoOItem,
            callbackScope: this,
            loop: true,
            paused: true
        });
        // Frecuencia fija según la dificultad (no aumenta con el tiempo)
        this.eventoGenerador.timeScale = this.dificultad.frecuencia;

        // ---------------------------------------------------------
        // CUENTA REGRESIVA -> arranca la partida
        // ---------------------------------------------------------
        this.modUI.iniciarCuentaRegresiva(() => {
            this.juegoIniciado = true;
            this.eventoGenerador.paused = false;
            if (this.startAtLevel3) {
                this.modFondos.saltarANivel3();
                this.modBoss.inicializar();
            } else {
                this.modFondos.iniciarMovimiento();
            }
        });
    }

    // =============================================================
    // UPDATE (orden de cada frame)
    // =============================================================
    update(time, delta) {
        if (!this.juegoActivo || this.gameOver) {
            return;
        }
        // El tiempo real se conserva para la cinemática de muerte del jefe
        const deltaReal = delta;
        // Cámara lenta: mientras muere el jefe, todo el juego va más despacio
        delta = delta * this.modBoss.escalaTiempo;
        const deltaSecs = delta / 1000;

        // Pausas de generación (tras una supernova)
        if (this.pausaGeneracionEnemigos > 0) {
            this.pausaGeneracionEnemigos -= deltaSecs;
        }
        if (this.pausaGeneracionItemGem > 0) {
            this.pausaGeneracionItemGem -= deltaSecs;
        }

        // 1. Marco, cámara, jugador, luces
        this.modUI.actualizarMarco();
        // Si la cámara falla (permiso negado...), se pasa sola al control manual
        if (!this.modoManual && window.camaraFallo === true) {
            this.usarControlManual();
        }
        this.modCamara.actualizar(time, delta);
        this.modJugador.actualizarMovimiento(delta);
        this.modIluminacion.actualizar(delta);

        // Durante la cuenta regresiva solo se dibuja
        if (!this.juegoIniciado) {
            this.modJugador.renderizar();
            return;
        }

        // 2. Cronómetro y luz (se detienen mientras suena la cinemática de aparición del jefe)
        const enCinematica = this.modBoss.enCinematica;
        if (!enCinematica) {
            this.cronometro += deltaSecs;
            this.modUI.actualizarTiempo(this.cronometro);

            this.jugador.luz -= this.jugador.velocidadApagado * deltaSecs;
            this.modUI.actualizarBarraLuz();
            if (this.jugador.luz <= 0) {
                this.modFin.perder();
                return;
            }
        }

        this.modJugador.actualizarSupernova();

        if (this.cronometro >= 120) {
            this.modFin.finalizarJuego(true, Idioma.t("fin.tiempo.mensaje"));
            return;
        }

        // 3. Boss y eclipse
        if (this.nivelActual === 3) {
            if (!this.modBoss.datos) {
                this.modBoss.inicializar();
            }
            if (this.modBoss.muerte) {
                // El eclipse se congela mientras el jefe muere
                this.modBoss.actualizarMuerte(deltaReal / 1000);
            } else {
                if (this.modBoss.enCinematica) {
                    this.modBoss.actualizarIntro(deltaSecs);
                } else {
                    this.modBoss.actualizar(deltaSecs);
                }
                this.modEclipse.actualizar(deltaSecs);
            }
        }

        // 4. Enemigos, items y dibujo
        this.modEnemigos.actualizar();
        this.modItems.actualizar();
        this.modJugador.renderizar();
    }

    // =============================================================
    // CONTROL MANUAL (teclado A / D o botones en pantalla)
    // También se activa solo si la cámara falla durante la partida.
    // =============================================================
    usarControlManual() {
        if (this.modCamara && typeof this.modCamara.ocultarAviso === "function") {
            this.modCamara.ocultarAviso();
        }
        this.modoManual = true;
        this.modCamara = new ControlManual(this);
        this.modCamara.iniciar();
        this.modJugador.activarModoDirecto();
    }

    // =============================================================
    // PAUSA: botón en pantalla, teclas P / ESC y al salir de la pestaña
    // =============================================================
    crearBotonPausa() {
        const radio = 48;
        const x = 24 + radio;
        const y = 24 + radio;

        const fondo = this.add.circle(x, y, radio, 0x000000, 0.45)
            .setStrokeStyle(4, 0xffffff, 0.85)
            .setDepth(150)
            .setInteractive({ useHandCursor: true });
        const barras = this.add.graphics().setDepth(151);
        barras.fillStyle(0xffffff, 0.95);
        barras.fillRoundedRect(x - 18, y - 20, 12, 40, 3);
        barras.fillRoundedRect(x + 6, y - 20, 12, 40, 3);
        this.botonPausa = { fondo: fondo, barras: barras };

        fondo.on("pointerover", () => fondo.setScale(1.08));
        fondo.on("pointerout", () => fondo.setScale(1));
        fondo.on("pointerdown", () => this.pausar());

        if (this.input.keyboard) {
            this.input.keyboard.on("keydown-P", () => this.pausar());
            this.input.keyboard.on("keydown-ESC", () => this.pausar());
        }

        // Si el jugador cambia de pestaña o recibe una llamada, se pausa sola
        const alOcultar = () => this.pausar();
        this.game.events.on(Phaser.Core.Events.HIDDEN, alOcultar);
        const alReanudar = () => {
            this.pausando = false;
        };
        this.events.on("resume", alReanudar);
        this.events.once("shutdown", () => {
            this.game.events.off(Phaser.Core.Events.HIDDEN, alOcultar);
            this.events.off("resume", alReanudar);
        });
    }

    pausar() {
        if (!this.juegoActivo || this.gameOver || this.pausando) {
            return;
        }
        if (this.scene.isPaused() || this.scene.isActive("Pausa")) {
            return;
        }
        this.pausando = true;
        this.scene.pause();
        this.scene.launch("Pausa", { origen: "Juego" });
    }

    // Al terminar la partida (perder / ganar) desaparecen pausa y botones
    ocultarControlesTactiles() {
        if (this.botonPausa) {
            this.botonPausa.fondo.setVisible(false);
            this.botonPausa.barras.setVisible(false);
        }
        if (this.modCamara && typeof this.modCamara.ocultarBotones === "function") {
            this.modCamara.ocultarBotones();
        }
    }

    // =============================================================
    // GENERADOR PRINCIPAL (lo llama el temporizador cada segundo)
    // =============================================================
    crearObstaculoOItem() {
        if (!this.juegoActivo || this.gameOver) {
            return;
        }
        // No cae nada mientras el jefe hace su aparición
        if (this.modBoss && this.modBoss.enCinematica) {
            return;
        }
        const ancho = this.scale.width;
        const limites = UtilJuego.obtenerLimitesJugables(ancho);
        // La velocidad ya no crece con el tiempo: la fija la dificultad elegida
        const multiplicadorVelocidad = 1;
        const esNivel3 = this.nivelActual === 3;
        const dado = Math.random() * 100;
        const generarItem = esNivel3 || dado >= 75;
        if (generarItem) {
            this.modItems.generar(ancho, esNivel3, multiplicadorVelocidad);
        } else if (this.pausaGeneracionEnemigos <= 0) {
            this.modEnemigos.generar(ancho, limites, multiplicadorVelocidad);
        }
    }
}


// =====================================================================
// PAUSA: escena que se pone encima de la partida (la partida queda
// congelada debajo y se reanuda al continuar)
// =====================================================================
class Pausa extends Phaser.Scene {
    constructor() {
        super("Pausa");
    }

    init(data) {
        this.origen = (data && data.origen) || "Juego";
        this.saliendo = false;
        this.teclasListas = false;
    }

    create() {
        const ancho = this.scale.width;
        const alto = this.scale.height;
        const esNavidad = (window.carpetaSkin || "").includes("navidad");

        // La música y los efectos se congelan mientras dura la pausa
        this.sound.pauseAll();

        // Velo oscuro (también bloquea los clics hacia la partida)
        this.add.rectangle(ancho / 2, alto / 2, ancho, alto, esNavidad ? 0x061a33 : 0x1a0a00, 0.78)
            .setInteractive();

        this.add.text(ancho / 2, alto * 0.24, Idioma.t("pausa.titulo"), {
            fontSize: "68px",
            fill: esNavidad ? "#ff7878" : "#ff8800",
            stroke: esNavidad ? "#c5daf0" : "#fff676",
            strokeThickness: 7,
            fontFamily: "Georgia, serif",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const crear = (y, clave, accion) => {
            const boton = window.crearBotonEstilo(this, ancho / 2, y, Idioma.t(clave), {
                tam: 34,
                origen: [0.5, 0.5],
                relleno: { x: 40, y: 10 },
                escalaHover: 1.1
            });
            boton.on("pointerdown", accion);
        };
        crear(alto * 0.42, "pausa.continuar", () => this.continuar());
        crear(alto * 0.55, "pausa.reiniciar", () => this.reiniciar());
        crear(alto * 0.68, "pausa.menu", () => this.irAlMenu());

        // P o ESC también continúan (con una pequeña espera para que la misma
        // pulsación que abrió la pausa no la cierre al instante)
        if (this.input.keyboard) {
            const alTecla = () => {
                if (this.teclasListas) {
                    this.continuar();
                }
            };
            this.input.keyboard.on("keydown-P", alTecla);
            this.input.keyboard.on("keydown-ESC", alTecla);
        }
        this.time.delayedCall(300, () => {
            this.teclasListas = true;
        });
    }

    continuar() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        this.sound.resumeAll();
        this.scene.resume(this.origen);
        this.scene.stop();
    }

    reiniciar() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        const juego = this.scene.get(this.origen);
        const datos = {
            startAtLevel3: juego.startAtLevel3,
            dificultad: juego.dificultadClave
        };
        // Se espera un instante para que alcance a sonar el clic
        this.time.delayedCall(180, () => {
            this.sound.stopAll();
            this.scene.stop(this.origen);
            this.scene.start(this.origen, datos);
        });
    }

    irAlMenu() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        this.time.delayedCall(180, () => {
            this.sound.stopAll();
            this.scene.stop(this.origen);
            this.scene.start("Inicio");
        });
    }
}
