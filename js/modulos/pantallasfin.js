class PantallasFin {
    constructor(escena) {
        this.escena = escena;
    }

    // -----------------------------------------------------------------
    // PARTE COMÚN: detiene el generador y los fondos, limpia entidades
    // y oculta al jugador. No toca el sonido (cada pantalla lo maneja).
    // -----------------------------------------------------------------
    detenerJuego() {
        const escena = this.escena;
        if (escena.eventoGenerador) {
            escena.eventoGenerador.remove(false);
        }
        escena.modFondos.detenerTweens();
        escena.modEnemigos.eliminarTodos();
        escena.modItems.eliminarTodos();
        escena.modBoss.eliminar();
        escena.modJugador.ocultar();
        if (escena.ocultarControlesTactiles) {
            escena.ocultarControlesTactiles();
        }
    }

    // -----------------------------------------------------------------
    // Botones compartidos por PERDER y VICTORIA DEL JEFE
    // -----------------------------------------------------------------
    crearBoton(x, y, texto, colorFondo) {
        const boton = this.escena.add.text(x, y, texto, {
            fontSize: "24px",
            fill: "#ffffff",
            backgroundColor: colorFondo,
            padding: {
                x: 22,
                y: 12
            },
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 4,
            fontFamily: "Georgia, serif"
        }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true }).setDepth(152);
        boton.on("pointerover", () => boton.setScale(1.1));
        boton.on("pointerout", () => boton.setScale(1));
        return boton;
    }

    // Los botones REINICIAR y MENÚ PRINCIPAL pasan por estos dos métodos.
    // El clic se reproduce DESPUÉS de detener la música (stopAll lo cortaría),
    // y el cambio de escena espera un instante para que alcance a sonar.
    reiniciar() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        const escena = this.escena;
        escena.sound.stopAll();
        window.reproducirSonidoBoton(escena);
        escena.time.delayedCall(200, () => {
            escena.scene.restart({ startAtLevel3: escena.startAtLevel3 });
        });
    }

    irAlMenu() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        const escena = this.escena;
        escena.sound.stopAll();
        window.reproducirSonidoBoton(escena);
        escena.time.delayedCall(200, () => {
            escena.scene.start("Inicio");
        });
    }

    // -----------------------------------------------------------------
    // FINALIZAR JUEGO (se acabó el tiempo)
    // -----------------------------------------------------------------
    finalizarJuego(victoria, mensaje) {
        const escena = this.escena;
        escena.juegoActivo = false;
        this.detenerJuego();
        escena.sound.stopAll();

        let ancho = escena.scale.width;
        let alto = escena.scale.height;
        escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 0.85).setDepth(100);
        escena.add.text(ancho / 2, alto / 2 - 20, Idioma.t("fin.victoria"), {
            fontSize: "28px",
            fontStyle: "bold",
            fill: "#00ff7f"
        }).setOrigin(0.5).setDepth(101);
        escena.add.text(ancho / 2, alto / 2 + 30, mensaje, {
            fontSize: "16px",
            fill: "#ffffff",
            align: "center",
            wordWrap: { width: ancho - 40 }
        }).setOrigin(0.5).setDepth(101);

        const btnReiniciarVic = escena.add.text(ancho / 2 - 120, alto / 2 + 90, Idioma.t("fin.reiniciar"), {
            fontSize: "20px",
            fill: "#ffffff",
            backgroundColor: "#008b8b",
            padding: {
                x: 16,
                y: 10
            },
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
        btnReiniciarVic.on("pointerdown", () => this.reiniciar());

        const btnMenuVic = escena.add.text(ancho / 2 + 120, alto / 2 + 90, Idioma.t("fin.menu"), {
            fontSize: "20px",
            fill: "#ffffff",
            backgroundColor: "#222222",
            padding: {
                x: 16,
                y: 10
            },
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
        btnMenuVic.on("pointerdown", () => this.irAlMenu());

        escena.modCamara.mostrarVideo();
    }

    // -----------------------------------------------------------------
    // PERDER
    // -----------------------------------------------------------------
    perder() {
        const escena = this.escena;
        if (escena.gameOver) {
            return;
        }
        escena.gameOver = true;
        escena.juegoActivo = false;

        // Sonido
        if (escena.musica) {
            escena.musica.stop();
        }
        
        // Detener música de fondo previa
        escena.sound.stopAll();

        // --- REPRODUCIR SONIDO DE CHOQUE AQUÍ (DESPUÉS DE STOPALL) ---
        escena.sound.play("sonido_choque");

        escena.musicaG = escena.sound.add("musicaG", {
            loop: true,
            volume: 0.5
        });
        escena.musicaG.play();

        this.detenerJuego();

        const esNavidad = escena.esNavidad;
        const xMuerte = escena.jugador.x;
        const yMuerte = escena.jugador.y;

        // Efectos según la skin
        if (esNavidad) {
            if (Preferencias.efectosVisuales()) {
                escena.cameras.main.shake(350, 0.03);
                escena.cameras.main.flash(600, 180, 230, 255);
            }
            this.efectoEvaporacion(xMuerte, yMuerte);
        } else {
            if (Preferencias.efectosVisuales()) {
                escena.cameras.main.shake(400, 0.06);
                escena.cameras.main.flash(700, 180, 0, 0);
            }
            this.efectoSangre(xMuerte, yMuerte);
        }

        // Overlay
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        const colorOverlay = esNavidad ? 0x09182b : 0x3a0000;
        const overlay = escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, colorOverlay, 0.82)
            .setScrollFactor(0)
            .setAlpha(0)
            .setDepth(151);
        escena.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500
        });

        // Mensaje
        const mensajeMuerte = esNavidad ? Idioma.t("fin.perderNavidad") : Idioma.t("fin.perderNormal");
        const colorTexto = esNavidad ? "#00ffff" : "#ff2222";
        const colorStroke = esNavidad ? "#003366" : "#000000";
        const textoMuerte = escena.add.text(ancho / 2, alto / 2 - 80, mensajeMuerte, {
            fontSize: "40px",
            fill: colorTexto,
            stroke: colorStroke,
            strokeThickness: 8,
            fontStyle: "bold",
            fontFamily: "Georgia, serif"
        }).setOrigin(0.5).setScrollFactor(0).setScale(0).setDepth(152);
        escena.tweens.add({
            targets: textoMuerte,
            scale: 1,
            duration: 600,
            ease: "Back.easeOut"
        });

        // Botones
        const btnReiniciar = this.crearBoton(ancho / 2 - 150, alto / 2 + 70, Idioma.t("fin.reiniciar"), esNavidad ? "#008b8b" : "#8b0000");
        btnReiniciar.on("pointerdown", () => this.reiniciar());
        const btnMenu = this.crearBoton(ancho / 2 + 150, alto / 2 + 70, Idioma.t("fin.menu"), "#222222");
        btnMenu.on("pointerdown", () => this.irAlMenu());

        escena.modCamara.mostrarVideo();
    }

    // Efecto de muerte de la skin navideña
    efectoEvaporacion(x, y) {
        const escena = this.escena;
        if (!escena.textures.exists("particulaVapor")) {
            let g = escena.make.graphics({
                x: 0,
                y: 0,
                add: false
            });
            g.fillStyle(0xffffff);
            g.fillCircle(6, 6, 6);
            g.generateTexture("particulaVapor", 12, 12);
        }
        const emisorEvaporacion = escena.add.particles(x, y, "particulaVapor", {
            speed: {
                min: 60,
                max: 240
            },
            angle: {
                min: 200,
                max: 340
            },
            scale: {
                start: 1.6,
                end: 0
            },
            alpha: {
                start: 0.9,
                end: 0
            },
            lifespan: 1300,
            blendMode: "ADD",
            color: [
                0xffffff,
                0x80d8ff,
                0x00e5ff
            ],
            gravityY: -120,
            emitting: false
        }).setDepth(150);
        emisorEvaporacion.explode(60);
    }

    // Efecto de muerte de la skin normal
    efectoSangre(x, y) {
        const escena = this.escena;
        if (!escena.textures.exists("particulaSangre")) {
            let g = escena.make.graphics({
                x: 0,
                y: 0,
                add: false
            });
            g.fillStyle(0xaa0000);
            g.fillCircle(5, 5, 5);
            g.generateTexture("particulaSangre", 10, 10);
        }
        const emisorSangre = escena.add.particles(x, y, "particulaSangre", {
            speed: {
                min: 120,
                max: 400
            },
            angle: {
                min: 0,
                max: 360
            },
            scale: {
                start: 1.8,
                end: 0.2
            },
            alpha: {
                start: 1,
                end: 0
            },
            lifespan: 1000,
            gravityY: 350,
            color: [
                0xff0000,
                0x990000,
                0x440000
            ],
            emitting: false
        }).setDepth(150);
        emisorSangre.explode(60);
    }

    // -----------------------------------------------------------------
    // VICTORIA (JEFE DERROTADO)
    // Llega aquí cuando termina la cinemática de muerte del jefe (la
    // pantalla está en negro). Muestra UNA viñeta de cómic con el estilo
    // del prólogo. Los datos (imagen, texto, onomatopeya) están en
    // VICTORIA_JEFE (js/datos/cinematicas.js).
    // -----------------------------------------------------------------
    victoriaJefe() {
        const escena = this.escena;
        if (escena.gameOver) {
            return;
        }
        escena.gameOver = true;
        escena.juegoActivo = false;

        if (escena.musica) {
            escena.musica.stop();
        }
        escena.sound.stopAll();

        this.detenerJuego();
        this.mostrarVictoriaComic();

        escena.modCamara.mostrarVideo();
    }

    mostrarVictoriaComic() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        const esNavidad = escena.esNavidad;
        const skin = esNavidad ? "navidad" : "normal";
        const datos = (typeof VICTORIA_JEFE !== "undefined" && VICTORIA_JEFE[skin]) || {};
        const cine = (typeof CINEMATICAS !== "undefined" && CINEMATICAS[skin]) || {};
        const est = cine.estilo || {};
        const colorPapel = est.papel !== undefined ? est.papel : (esNavidad ? 0xe4eff9 : 0xefe0bd);
        const colorPuntos = est.puntos !== undefined ? est.puntos : (esNavidad ? 0x5b8fb9 : 0x8a6d3b);
        const colorCaja = est.caja !== undefined ? est.caja : (esNavidad ? 0xd6efff : 0xffe9a8);
        const tinta = est.tinta || (esNavidad ? "#12324f" : "#2b1d08");
        const hex = (texto, defecto) => {
            try {
                return Phaser.Display.Color.HexStringToColor(texto).color;
            } catch (e) {
                return defecto;
            }
        };
        const efectos = Preferencias.efectosVisuales();
        const D = 150;

        // Telón negro: continúa la oscuridad de la cinemática y se abre
        const telon = escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 1).setDepth(D + 60);

        // Fondo de papel con puntos de semitono (se dibuja una vez y se guarda como textura)
        const claveFondo = "victoria_fondo_" + skin + "_" + ancho + "x" + alto;
        if (!escena.textures.exists(claveFondo)) {
            const g = escena.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(colorPapel, 1);
            g.fillRect(0, 0, ancho, alto);
            g.fillStyle(colorPuntos, 0.22);
            const paso = 24;
            const maxDist = Math.hypot(ancho / 2, alto / 2);
            for (let fila = 0; fila * paso < alto + paso; fila++) {
                const y = fila * paso + paso / 2;
                for (let x = (fila % 2) ? paso / 2 : 0; x < ancho + paso; x += paso) {
                    const d = Math.hypot(x - ancho / 2, y - alto / 2) / maxDist;
                    g.fillCircle(x, y, 1 + 3.5 * d);
                }
            }
            g.generateTexture(claveFondo, ancho, alto);
            g.destroy();
        }
        escena.add.image(ancho / 2, alto / 2, claveFondo).setDepth(D);

        // ---------------- La viñeta ----------------
        const panelW = ancho * 0.92;
        const panelH = alto * 0.74;
        const panel = escena.add.container(ancho / 2, alto * 0.05 + panelH / 2)
            .setDepth(D + 5)
            .setAlpha(0)
            .setRotation(Phaser.Math.DegToRad(-0.5));

        panel.add(escena.add.rectangle(10, 12, panelW + 14, panelH + 14, 0x000000, 0.35));
        panel.add(escena.add.rectangle(0, 0, panelW + 14, panelH + 14, 0x000000));

        const claveImagen = "victoria_jefe_" + skin;
        if (escena.textures.exists(claveImagen)) {
            // La imagen cubre todo el recuadro (se recorta lo que sobre, centrado)
            const img = escena.add.image(0, 0, claveImagen);
            const escala = Math.max(panelW / img.width, panelH / img.height);
            const cw = panelW / escala;
            const ch = panelH / escala;
            img.setCrop((img.width - cw) / 2, (img.height - ch) / 2, cw, ch);
            img.setScale(escala);
            panel.add(img);
        } else {
            // Panel de relleno: dice qué archivo falta
            const rutaFalta = (window.carpetaSkin || "") + (datos.imagen || "cinematica/victoria_jefe.png");
            panel.add(escena.add.rectangle(0, 0, panelW, panelH, hex(est.rellenoA, 0x1f6b4a)));
            panel.add(escena.add.rectangle(0, 0, panelW - 40, panelH - 40, hex(est.rellenoB, 0x0b2e22)));
            panel.add(escena.add.text(0, 0, Idioma.t("fin.imagenFalta", { ruta: rutaFalta, tam: "1680x800" }), {
                fontSize: "22px",
                fill: "#ffffff",
                fontFamily: "Georgia, serif",
                align: "center",
                wordWrap: { width: panelW - 120 }
            }).setOrigin(0.5));
        }

        // Caja de narración (abajo a la izquierda, como en el prólogo)
        const textoCaja = datos.texto ? Idioma.dato(datos.texto) : Idioma.t(esNavidad ? "fin.jefeNavidad" : "fin.jefeNormal");
        const txt = escena.add.text(0, 0, textoCaja, {
            fontSize: "22px",
            fill: tinta,
            fontFamily: "Georgia, serif",
            fontStyle: "bold",
            lineSpacing: 4,
            wordWrap: { width: Math.min(panelW * 0.5, 520) - 36 }
        });
        const cajaW = txt.width + 36;
        const cajaH = txt.height + 28;
        const cajaIzq = -panelW / 2 + 28;
        const cajaArriba = panelH / 2 - 24 - cajaH;
        const caja = escena.add.rectangle(cajaIzq + cajaW / 2, cajaArriba + cajaH / 2, cajaW, cajaH, colorCaja)
            .setStrokeStyle(4, 0x000000)
            .setAlpha(0);
        txt.setPosition(cajaIzq + 18, cajaArriba + 14).setText("");
        panel.add([caja, txt]);

        // Onomatopeya opcional
        let sfxTexto = null;
        if (datos.sfx) {
            const sx = datos.sfx;
            const pos = sx.pos || [0.8, 0.16];
            sfxTexto = escena.add.text((pos[0] - 0.5) * panelW, (pos[1] - 0.5) * panelH, Idioma.dato(sx.texto), {
                fontSize: (sx.tam || 64) + "px",
                fontFamily: "Georgia, serif",
                fontStyle: "bold",
                fill: sx.color || "#ffe14d",
                stroke: "#000000",
                strokeThickness: 10
            }).setOrigin(0.5).setAngle(sx.angulo || -8).setScale(0);
            panel.add(sfxTexto);
        }

        // ---------------- Botones (aparecen cuando termina el texto) ----------------
        const mostrarBotones = () => {
            const y = alto * 0.9;
            const btnReiniciar = this.crearBoton(ancho / 2 - 150, y, Idioma.t("fin.reiniciar"), esNavidad ? "#008b8b" : "#006400")
                .setDepth(D + 20)
                .setAlpha(0);
            btnReiniciar.on("pointerdown", () => this.reiniciar());
            const btnMenu = this.crearBoton(ancho / 2 + 150, y, Idioma.t("fin.menu"), "#222222")
                .setDepth(D + 20)
                .setAlpha(0);
            btnMenu.on("pointerdown", () => this.irAlMenu());
            escena.tweens.add({
                targets: [btnReiniciar, btnMenu],
                alpha: 1,
                duration: 400
            });
        };

        // ---------------- Texto que se escribe letra por letra ----------------
        const velocidad = cine.velocidadTexto || 28;
        let escritura = null;
        let escribiendo = false;
        let listo = false;
        const terminarTexto = () => {
            if (listo) {
                return;
            }
            listo = true;
            escribiendo = false;
            if (escritura) {
                escritura.remove(false);
                escritura = null;
            }
            txt.setText(textoCaja);
            mostrarBotones();
        };
        const empezarTexto = () => {
            escena.tweens.add({ targets: caja, alpha: 1, duration: 200 });
            if (textoCaja.length === 0) {
                terminarTexto();
                return;
            }
            escribiendo = true;
            let i = 0;
            escritura = escena.time.addEvent({
                delay: velocidad,
                repeat: textoCaja.length - 1,
                callback: () => {
                    i++;
                    txt.setText(textoCaja.substring(0, i));
                    if (i >= textoCaja.length) {
                        terminarTexto();
                    }
                }
            });
        };
        // Un clic mientras se escribe muestra todo el texto de golpe
        escena.input.on("pointerdown", () => {
            if (escribiendo) {
                terminarTexto();
            }
        });

        // ---------------- Entrada: el telón se abre y la viñeta cae con golpe ----------------
        escena.tweens.add({
            targets: telon,
            alpha: 0,
            duration: 900,
            delay: 100,
            onComplete: () => telon.destroy()
        });
        panel.setScale(1.22);
        escena.tweens.add({
            targets: panel,
            alpha: 1,
            scale: 1,
            duration: 280,
            delay: 650,
            ease: "Cubic.In",
            onComplete: () => {
                if (efectos) {
                    escena.cameras.main.shake(260, 0.012);
                }
                if (sfxTexto) {
                    escena.tweens.add({ targets: sfxTexto, scale: 1, duration: 320, ease: "Back.Out" });
                }
                escena.time.delayedCall(450, empezarTexto);
            }
        });
    }
}