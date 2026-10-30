class Inicio extends Phaser.Scene {
    constructor() {
        super("Inicio");
    }

    create() {
        let ancho = this.scale.width;
        let alto = this.scale.height;

        // Reinicia el selector de dificultad cada vez que se entra al menú
        this.selectorDificultad = null;

        // ==========================================
        // INICIALIZAR CÁMARA DESDE EL MENÚ
        // ==========================================
        this.iniciarCamaraMenu();

        // ==========================================
        // CONFIGURACIÓN DINÁMICA SEGÚN SKIN
        // ==========================================
        let rutaSkin = window.carpetaSkin || "assets_normal/";
        let esNavidad = rutaSkin.includes("navidad");

        const configSkin = {
            escalaCabeza: esNavidad ? 0.30 : 0.36,
            yBaseCabezaOffset: 60,
            coloresParticulas: esNavidad
                ? [0xffffff, 0xa0e0ff, 0x00ffff]
                : [0xffb7c5, 0xda70d6, 0x98ff98],
            colorTexto: esNavidad ? "#00ffff" : "#af8703"
        };

        // Obtenemos la referencia de la música
        this.musica = this.sound.get("musica");

        if (!this.musica) {
            // Si no existe en el sistema, la creamos y hacemos el fade in
            this.musica = this.sound.add("musica", {
                loop: true,
                volume: 0
            });
            this.musica.play();

            this.tweens.add({
                targets: this.musica,
                volume: Preferencias.musica(0.5),
                duration: 2000
            });
        } else if (!this.musica.isPlaying) {
            // Si ya existe pero está detenida, la volvemos a reproducir
            // (con el volumen que el jugador eligió en AJUSTES)
            Preferencias.aplicarAudio(this.sys.game);
            this.musica.play();
        }

        // ==========================================
        // FONDO
        // ==========================================
        this.fondo = this.add.image(ancho / 2, alto / 2, "menu_background");
        this.fondo.setDisplaySize(ancho + 60, alto + 60);

        // ==========================================
        // MARCO LATERAL (LÍMITE VISUAL DEL ÁREA JUGABLE)
        // ==========================================
        this.graficosMarco = this.add.graphics();
        window.dibujarMarcoLateral(this.graficosMarco, ancho, alto, esNavidad);

        // ==========================================
        // PARTÍCULA DE PETALO
        // ==========================================
        let graphicsPetalo = this.make.graphics({
            x: 0,
            y: 0,
            add: false
        });

        graphicsPetalo.fillStyle(0xffffff, 1);
        graphicsPetalo.fillEllipse(0, 0, 15, 8);
        graphicsPetalo.generateTexture("petaloTextura", 15, 8);

        this.add.particles(0, 0, "petaloTextura", {
            x: { min: 0, max: ancho },
            y: -20,
            scale: { start: 1, end: 0.3 },
            speedY: { min: 30, max: 80 },
            speedX: { min: -20, max: 20 },
            rotate: { min: 0, max: 360 },
            lifespan: 7000,
            color: configSkin.coloresParticulas,
            quantity: 1,
            alpha: { start: 0.5, end: 0 }
        });

        // ==========================================
        // LOGO
        // ==========================================
        this.logo = this.add.image(ancho / 2, alto * 0.18, "logo").setOrigin(0.5);
        this.logo.setScale(0.3);
        this.centrarPorContenido(this.logo, "x");

        this.tweens.add({
            targets: this.logo,
            y: this.logo.y - 12,
            duration: 2500,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1
        });

        // ==========================================
        // CABEZA CERRADA / ABIERTA (Y EASTER EGG)
        // ==========================================
        let yBaseCabeza = (alto / 2) + configSkin.yBaseCabezaOffset;

        this.cabezaCerrada = this.add.image(ancho / 2, yBaseCabeza, "sprite_1")
            .setOrigin(0.5)
            .setScale(configSkin.escalaCabeza);

        // DELIMITAR HITAREA SOLO AL ROSTRO (CENTRO DEL SPRITE)
        let anchoCabeza = this.cabezaCerrada.width;
        let altoCabeza = this.cabezaCerrada.height;

        this.cabezaCerrada.setInteractive({
            hitArea: new Phaser.Geom.Rectangle(
                anchoCabeza * 0.25,
                altoCabeza * 0.25,
                anchoCabeza * 0.5,
                altoCabeza * 0.5
            ),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: true
        });

        this.cabezaAbierta = this.add.image(ancho / 2, yBaseCabeza, "sprite_2")
            .setOrigin(0.5)
            .setScale(configSkin.escalaCabeza);

        this.cabezaAbierta.setVisible(false);

        // Contador para el easter egg del Nivel 3
        this.easterEggContador = 0;

        this.cabezaCerrada.on("pointerdown", () => {
            this.easterEggContador++;
            if (this.easterEggContador >= 3) {
                this.cabezaCerrada.setVisible(false);
                this.cabezaAbierta.setVisible(true);

                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    // Iniciamos el juego con la bandera de empezar en el nivel 3
                    this.scene.start("Juego", { startAtLevel3: true });
                });
            }
        });

        // ==========================================
        // BOTÓN CAMBIAR CARPETA / SKIN (ESQUINA SUPERIOR DERECHA)
        // ==========================================
        let botonCarpetas = window.crearBotonEstilo(this, ancho - 20, 20, Idioma.t("menu.carpetas"), {
            tam: 20,
            icono: "📁",
            origen: [1, 0],
            relleno: { x: 18, y: 10 },
            escalaHover: 1.05
        });

        botonCarpetas.on("pointerdown", () => {
            if (this.carpetasLanzada) return;
            this.carpetasLanzada = true;
            if (this.musica) {
                this.musica.stop();
            }
            if (window.camaraVideo) {
                window.camaraVideo.style.display = "none";
            }
            let menuSkins = document.getElementById("menu-skins");
            if (menuSkins) {
                menuSkins.style.display = "flex";
            }
            // Se espera un instante para que alcance a sonar el clic del botón
            const juego = this.sys.game;
            setTimeout(() => juego.destroy(true), 200);
        });

        // ==========================================
        // BOTÓN VER CINEMÁTICA (ESQUINA SUPERIOR IZQUIERDA)
        // Solo aparece cuando la cinemática de esta skin ya se vio
        // completa al menos una vez (la primera vez es obligatoria).
        // ==========================================
        if (Progreso.cinematicaVista()) {
            let botonCinematica = window.crearBotonEstilo(this, 20, 20, Idioma.t("menu.cinematica"), {
                tam: 20,
                icono: "🎬",
                origen: [0, 0],
                relleno: { x: 18, y: 10 },
                escalaHover: 1.05
            });

            let cinematicaLanzada = false;
            botonCinematica.on("pointerdown", () => {
                if (cinematicaLanzada) return;
                cinematicaLanzada = true;
                this.cameras.main.fadeOut(400, 0, 0, 0);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    // Al terminar (o saltarla) vuelve al menú
                    this.scene.start("Cinematica", { destino: "Inicio" });
                });
            });
        }

        // ==========================================
        // BOTÓN TIENDA (ESQUINA INFERIOR IZQUIERDA)
        // Abre el museo: plumas para arte 2D, jades para diseños.
        // ==========================================
        let botonTienda = window.crearBotonEstilo(this, 20, alto - 20, Idioma.t("menu.tienda"), {
            tam: 20,
            icono: "🏛️",
            origen: [0, 1],
            relleno: { x: 18, y: 10 },
            escalaHover: 1.05
        });

        let tiendaLanzada = false;
        botonTienda.on("pointerdown", () => {
            if (tiendaLanzada) return;
            tiendaLanzada = true;
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("Tienda");
            });
        });

        // ==========================================
        // BOTÓN AJUSTES (JUNTO AL BOTÓN DE LA TIENDA)
        // Volumen, idioma, cámara, pantalla...
        // Se coloca a la derecha de TIENDA según lo que mida su texto.
        // ==========================================
        const xAjustes = botonTienda.x + botonTienda.input.hitArea.width * botonTienda.scaleX + 24;
        let botonAjustes = window.crearBotonEstilo(this, xAjustes, alto - 20, Idioma.t("menu.ajustes"), {
            tam: 20,
            icono: "⚙️",
            origen: [0, 1],
            relleno: { x: 18, y: 10 },
            escalaHover: 1.05
        });

        let ajustesLanzado = false;
        botonAjustes.on("pointerdown", () => {
            if (ajustesLanzado) return;
            ajustesLanzado = true;
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("Ajustes");
            });
        });

        // ==========================================
        // BOTONES
        // ==========================================
        // Desplazamiento horizontal extra (0 = centrados exactamente). Antes era 30
        // para tapar a ojo el margen transparente de las imágenes; ahora cada
        // botón se centra por su contenido visible (ver centrarPorContenido).
        let ajusteXBotones = 0;
        let yBotonJugar = alto / 1.5 + 190;
        let yBotonSalir = alto / 2 + 280;

        let botonJugar = this.add.image(
            ancho / 2 + ajusteXBotones,
            yBotonJugar,
            Idioma.textura(this, "boton_jugar")
        ).setScale(0.4).setInteractive({ useHandCursor: true, pixelPerfect: true });

        let botonSalir = this.add.image(
            ancho / 2 + ajusteXBotones,
            yBotonSalir,
            Idioma.textura(this, "boton_salir")
        ).setScale(0.4).setInteractive({ useHandCursor: true, pixelPerfect: true });

        // Centra cada botón por lo que SE VE (no por el tamaño de la imagen, que
        // trae margen transparente distinto en cada idioma). La altura no cambia.
        this.centrarPorContenido(botonJugar, "x");
        this.centrarPorContenido(botonSalir, "x");

        botonJugar.on("pointerover", () => {
            botonJugar.setTint(0x888888);
            botonJugar.setScale(0.45);
        });

        botonJugar.on("pointerout", () => {
            botonJugar.clearTint();
            botonJugar.setScale(0.4);
        });

        botonSalir.on("pointerover", () => {
            botonSalir.setTint(0x888888);
            botonSalir.setScale(0.45);
        });

        botonSalir.on("pointerout", () => {
            botonSalir.clearTint();
            botonSalir.setScale(0.4);
        });

        // ==========================================
        // BOTÓN JUGAR
        // ==========================================
        botonJugar.on("pointerdown", () => {
            window.reproducirSonidoBoton(this);
            if (this.selectorDificultad) return;
            // Ahora JUGAR abre el selector de dificultad
            this.mostrarSelectorDificultad();
        });

        // ==========================================
        // BOTÓN SALIR
        // ==========================================
        botonSalir.on("pointerdown", () => {
            window.reproducirSonidoBoton(this);
            this.cabezaCerrada.setVisible(false);
            this.cabezaAbierta.setVisible(true);

            setTimeout(() => {
                if (window.close) {
                    window.close();
                }
            }, 500);
        });

        botonJugar.on("pointerup", () => {
            this.cabezaCerrada.setVisible(true);
            this.cabezaAbierta.setVisible(false);
            botonJugar.setScale(0.4);
        });

        botonSalir.on("pointerup", () => {
            this.cabezaCerrada.setVisible(true);
            this.cabezaAbierta.setVisible(false);
            botonSalir.setScale(0.4);
        });

        // ==========================================
        // BOTÓN DE INSTRUCCIONES
        // ==========================================
        // Misma línea horizontal que TIENDA y AJUSTES (centro de su zona de clic)
        const yFilaInferior = botonTienda.y - botonTienda.input.hitArea.height * botonTienda.scaleY / 2;
        let botonInstrucciones = window.crearBotonEstilo(this, ancho / 2, yFilaInferior, Idioma.t("menu.instrucciones"), {
            tam: 24,
            origen: [0.5, 0.5],
            relleno: { x: 30, y: 10 },
            escalaHover: 1.1
        });

        botonInstrucciones.on("pointerdown", () => {
            this.cabezaCerrada.setVisible(false);
            this.cabezaAbierta.setVisible(true);

            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("Instrucciones");
            });
        });

        // ==========================================
        // MOVIMIENTO DEL FONDO Y PERSONAJE
        // ==========================================
        this.input.on("pointermove", (pointer) => {
            let factorFondo = 30;

            this.fondo.x = (ancho / 2) + (pointer.x - ancho / 2) / factorFondo;
            this.fondo.y = (alto / 2) + (pointer.y - alto / 2) / factorFondo;

            let factorCabeza = 20;
            let posX = (ancho / 2) + (pointer.x - ancho / 2) / factorCabeza;
            let posY = yBaseCabeza + (pointer.y - alto / 2) / factorCabeza;

            this.cabezaCerrada.x = posX;
            this.cabezaCerrada.y = posY;
            this.cabezaAbierta.x = posX;
            this.cabezaAbierta.y = posY;
        });
    }

    // ==========================================
    // SELECTOR DE DIFICULTAD (aparece al pulsar JUGAR)
    // ==========================================
    mostrarSelectorDificultad() {
        const ancho = this.scale.width;
        const alto = this.scale.height;
        const en = Idioma.actual() === "en";
        const esNavidad = (window.carpetaSkin || "").includes("navidad");
        const elementos = [];

        // Fondo oscuro que además bloquea los clics del menú de atrás
        const velo = this.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 0.78)
            .setDepth(200)
            .setInteractive();
        elementos.push(velo);

        const titulo = this.add.text(ancho / 2, alto * 0.27, en ? "CHOOSE DIFFICULTY" : "ELIGE LA DIFICULTAD", {
            fontSize: "44px",
            fill: esNavidad ? "#ff0000" : "#ff8800",
            stroke: esNavidad ? "#c5daf0" : "#fff676",
            strokeThickness: 6,
            fontFamily: "Georgia, serif",
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5).setDepth(201);
        elementos.push(titulo);

        const opciones = [
            { clave: "facil",   nombre: en ? "EASY" : "FÁCIL",       desc: en ? "Slow enemies, easy items" : "Enemigos lentos e ítems fáciles de atrapar", color: "#9dff9d" },
            { clave: "normal",  nombre: "NORMAL",                    desc: en ? "A balanced challenge" : "Un reto equilibrado",                            color: "#ffe680" },
            { clave: "dificil", nombre: en ? "HARD" : "DIFÍCIL",     desc: en ? "Fast, but still fair" : "Rápido, pero justo",                              color: "#ff9d9d" }
        ];

        let elegido = false;
        opciones.forEach((op, i) => {
            const y = alto * (0.40 + i * 0.14);
            const boton = window.crearBotonEstilo(this, ancho / 2, y, op.nombre, {
                tam: 36,
                origen: [0.5, 0.5],
                relleno: { x: 40, y: 10 },
                escalaHover: 1.1,
                profundidad: 201
            });
            const desc = this.add.text(ancho / 2, y + 40, op.desc, {
                fontSize: "20px",
                fill: op.color,
                stroke: "#000000",
                strokeThickness: 4,
                fontFamily: "Georgia, serif",
                align: "center"
            }).setOrigin(0.5).setDepth(201);
            elementos.push(boton, desc);

            boton.on("pointerdown", () => {
                if (elegido) return;
                elegido = true;
                window.dificultadActual = op.clave;
                this.cabezaCerrada.setVisible(false);
                this.cabezaAbierta.setVisible(true);
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    this.scene.start("Juego", { startAtLevel3: false, dificultad: op.clave });
                });
            });
        });

        const volver = window.crearBotonEstilo(this, ancho / 2, alto * 0.84, Idioma.t("comun.volver"), {
            tam: 26,
            origen: [0.5, 0.5],
            relleno: { x: 35, y: 10 },
            escalaHover: 1.1,
            profundidad: 201
        });
        elementos.push(volver);
        volver.on("pointerdown", () => {
            if (elegido) return;
            elementos.forEach(e => e.destroy());
            this.selectorDificultad = null;
            this.cabezaCerrada.setVisible(true);
            this.cabezaAbierta.setVisible(false);
        });

        this.selectorDificultad = elementos;
    }

    // ==========================================
    // CENTRADO POR CONTENIDO VISIBLE
    // Las imágenes de los botones traen márgenes transparentes distintos
    // (y cambian con el idioma), así que centrar la imagen no centra lo que
    // se ve. Aquí se busca el rectángulo de píxeles NO transparentes y el
    // origen de la imagen se pone en el centro de ese rectángulo.
    // ==========================================
    static limitesVisibles(escena, clave) {
        const id = (window.carpetaSkin || "") + "|" + clave;
        Inicio._limites = Inicio._limites || {};
        if (Inicio._limites[id]) {
            return Inicio._limites[id];
        }
        const marco = escena.textures.getFrame(clave);
        let r = { w: marco.width, h: marco.height, cx: marco.width / 2, cy: marco.height / 2 };
        try {
            const img = escena.textures.get(clave).getSourceImage();
            const w = img.width;
            const h = img.height;
            const lienzo = document.createElement("canvas");
            lienzo.width = w;
            lienzo.height = h;
            const ctx = lienzo.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const datos = ctx.getImageData(0, 0, w, h).data;
            let minX = w, maxX = -1, minY = h, maxY = -1;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (datos[(y * w + x) * 4 + 3] > 40) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX >= 0) {
                r = { w: w, h: h, cx: (minX + maxX + 1) / 2, cy: (minY + maxY + 1) / 2 };
            }
        } catch (e) {
            // Sin acceso a los píxeles (p. ej. abierto como file://): se queda el centro de la imagen
        }
        Inicio._limites[id] = r;
        return r;
    }

    // ejes: "x", "y" o "xy". Mueve el ORIGEN, la posición del objeto no cambia.
    centrarPorContenido(imagen, ejes) {
        const l = Inicio.limitesVisibles(this, imagen.texture.key);
        const ox = ejes.indexOf("x") >= 0 ? l.cx / l.w : imagen.originX;
        const oy = ejes.indexOf("y") >= 0 ? l.cy / l.h : imagen.originY;
        imagen.setOrigin(ox, oy);
    }

    // ==========================================
    // PREPARAR CÁMARA DESDE EL MENÚ
    // La lógica vive en Controles (camara.js) para poder encenderla y
    // apagarla también desde AJUSTES. Si el jugador la apagó, no se pide.
    // ==========================================
    iniciarCamaraMenu() {
        Controles.iniciarCamara();
    }
}