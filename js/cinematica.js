class Cinematica extends Phaser.Scene {
    constructor() {
        super("Cinematica");
    }

    // Recibe { destino: "Carga" | "Inicio" } = escena a la que ir al terminar
    init(data) {
        this.destino = (data && data.destino) || "Carga";
        this.skin = Progreso.idSkin();
        this.cfg = (typeof CINEMATICAS !== "undefined") ? CINEMATICAS[this.skin] : null;

        // Primera vez = todavía no se ha terminado nunca -> no se puede saltar
        this.puedeSaltar = Progreso.cinematicaVista(this.skin);

        // Estilo de animación de esta cinemática ("comic" o "estrella")
        this.estrella = !!(this.cfg && this.cfg.animacion === "estrella");
        this.tweensAmbiente = [];

        // Ambiente "eclipse" (Kukulcán): emblema, plumas y viñetas que respiran
        this.conEclipse = !!(this.cfg && this.cfg.ambiente === "eclipse");
        this.coberturaEclipse = 0.08;
        this.tweenEclipse = null;
        this.gEclipse = null;

        this.terminada = false;
        // "transicion" | "entrando" | "escribiendo" | "esperando" | "fin"
        this.estado = "transicion";
        this.escritura = null;
        this.musica = null;
        this.videoOculto = null;
        this.textoCarga = null;
        this.paneles = [];
        this.pasos = [];
        this.pasoActual = 0;
        this.indicePagina = 0;
        this.contenedorPagina = null;
    }

    // =============================================================
    // UTILIDADES DE DATOS
    // =============================================================
    claveImagen(ruta) {
        return "cine_" + this.skin + "_" + ruta.replace(/[^a-zA-Z0-9]/g, "_");
    }

    claveMusica() {
        return "cine_musica_" + this.skin;
    }

    // Rectángulos (en el lienzo de 1280x720) de las viñetas de una página
    static rectsDePagina(pagina) {
        const layout = CINE_LAYOUTS[pagina.layout || "unico"] || CINE_LAYOUTS.unico;
        const area = CINE_AREA;
        return layout.map((celda) => ({
            x: area.x + celda[0] * area.w + CINE_GOTA / 2,
            y: area.y + celda[1] * area.h + CINE_GOTA / 2,
            w: celda[2] * area.w - CINE_GOTA,
            h: celda[3] * area.h - CINE_GOTA
        }));
    }

    // Ayuda para el arte: lista archivos y tamaños de todas las cinemáticas.
    // Uso desde la consola del navegador:  Cinematica.guiaDeImagenes()
    static guiaDeImagenes() {
        const filas = [];
        Object.keys(CINEMATICAS).forEach((skin) => {
            CINEMATICAS[skin].paginas.forEach((pagina, numPagina) => {
                const rects = Cinematica.rectsDePagina(pagina);
                pagina.paneles.slice(0, rects.length).forEach((panel, i) => {
                    const w = Math.round(rects[i].w);
                    const h = Math.round(rects[i].h);
                    filas.push({
                        archivo: "assets_" + skin + "/" + panel.imagen,
                        pagina: numPagina + 1,
                        layout: pagina.layout || "unico",
                        tamanoBase: w + " x " + h,
                        tamanoIdeal: (w * 2) + " x " + (h * 2)
                    });
                });
            });
        });
        console.table(filas);
        return filas;
    }

    // =============================================================
    // PRELOAD: imágenes de los paneles (y música opcional)
    // =============================================================
    preload() {
        if (!this.cfg || !this.cfg.paginas) {
            return;
        }
        this.load.setPath(window.carpetaSkin);

        this.textoCarga = this.add.text(this.scale.width / 2, this.scale.height / 2, Idioma.t("cine.preparando"), {
            fontFamily: "Georgia, serif",
            fontSize: "26px",
            color: "#ffffff"
        }).setOrigin(0.5);
        this.load.on("progress", (valor) => {
            if (this.textoCarga) {
                this.textoCarga.setText(Idioma.t("cine.preparando") + " " + Math.round(valor * 100) + "%");
            }
        });
        this.load.on("loaderror", (archivo) => {
            console.warn("[Cinematica] No se encontró '" + archivo.src + "'. Se usará un panel de relleno.");
        });

        const pedidas = new Set();
        this.cfg.paginas.forEach((pagina) => {
            pagina.paneles.forEach((panel) => {
                const clave = this.claveImagen(panel.imagen);
                if (pedidas.has(clave) || this.textures.exists(clave)) {
                    return;
                }
                pedidas.add(clave);
                this.load.image(clave, panel.imagen);
            });
        });
        if (this.cfg.musica) {
            this.load.audio(this.claveMusica(), this.cfg.musica);
        }
    }

    // =============================================================
    // CREATE
    // =============================================================
    create() {
        if (!this.cfg || !this.cfg.paginas || this.cfg.paginas.length === 0) {
            console.warn("[Cinematica] No hay cinemática definida para la skin '" + this.skin + "'. Se omite.");
            this.scene.start(this.destino);
            return;
        }
        if (this.textoCarga) {
            this.textoCarga.destroy();
            this.textoCarga = null;
        }
        this.est = this.cfg.estilo;

        this.ocultarCamaraVideo();
        this.prepararMusica();
        this.crearRellenos();
        this.crearTexturaPapel();

        this.ajustarVista();
        this.scale.on("resize", this.ajustarVista, this);
        this.events.once("shutdown", this.alCerrar, this);

        this.crearInterfaz();
        if (this.estrella) {
            this.crearTexturasEstrella();
        }
        if (this.conEclipse) {
            this.crearTexturasEclipse();
            this.crearEmblemaEclipse();
        }
        this.construirPagina(0);

        // Avanzar: clic en cualquier parte (menos sobre un botón) o teclado
        this.input.on("pointerdown", (pointer, sobre) => {
            if (!sobre || sobre.length === 0) {
                this.avanzar();
            }
        });
        const teclado = this.input.keyboard;
        if (teclado) {
            ["SPACE", "ENTER", "RIGHT"].forEach((tecla) => {
                teclado.on("keydown-" + tecla, (evento) => {
                    if (!evento || !evento.repeat) {
                        this.avanzar();
                    }
                });
            });
            if (this.puedeSaltar) {
                teclado.on("keydown-ESC", () => this.terminar(true));
            }
        }

        this.cameras.main.fadeIn(600, 0, 0, 0);
        this.time.delayedCall(900, () => this.siguientePaso());
    }

    // Al cerrar la escena: quitar listeners globales y restaurar cámara web
    alCerrar() {
        this.scale.off("resize", this.ajustarVista, this);
        if (this.musica) {
            this.tweens.killTweensOf(this.musica);
            this.musica.stop();
            this.musica.destroy();
            this.musica = null;
        }
        if (this.videoOculto) {
            this.videoOculto.style.display = this.displayPrevio || "block";
            this.videoOculto = null;
        }
    }

    // El video de la cámara web (fijo en la esquina) taparía la cinemática
    // cuando se repite desde el menú, así que se oculta mientras dura.
    ocultarCamaraVideo() {
        const video = window.camaraVideo;
        if (video) {
            this.videoOculto = video;
            this.displayPrevio = video.style.display;
            video.style.display = "none";
        }
    }

    prepararMusica() {
        const clave = this.claveMusica();
        if (!this.cfg.musica || !this.cache.audio.exists(clave)) {
            return;
        }
        // Si se repite desde el menú, se detiene la música del menú
        // (Inicio la vuelve a reproducir al regresar)
        const musicaMenu = this.sound.get("musica");
        if (musicaMenu && musicaMenu.isPlaying) {
            musicaMenu.stop();
        }
        this.musica = this.sound.add(clave, { loop: true, volume: 0 });
        this.musica.play();
        this.tweens.add({
            targets: this.musica,
            volume: Preferencias.musica(this.cfg.volumenMusica || 0.5),
            duration: 1500
        });
    }

    // =============================================================
    // LIENZO VIRTUAL 1280x720 (viewport + zoom de la cámara)
    // =============================================================
    ajustarVista() {
        const cam = this.cameras.main;
        if (!cam) {
            return;
        }
        const ancho = this.scale.width;
        const alto = this.scale.height;
        const escala = Math.min(ancho / CINE_ANCHO, alto / CINE_ALTO);
        const vw = Math.round(CINE_ANCHO * escala);
        const vh = Math.round(CINE_ALTO * escala);
        cam.setViewport(Math.round((ancho - vw) / 2), Math.round((alto - vh) / 2), vw, vh);
        cam.setZoom(escala);
        cam.centerOn(CINE_ANCHO / 2, CINE_ALTO / 2);
    }

    // =============================================================
    // TEXTURAS GENERADAS: papel de cómic y paneles de relleno
    // =============================================================
    crearTexturaPapel() {
        this.clavePapel = "cine_papel_" + this.skin;
        if (this.textures.exists(this.clavePapel)) {
            return;
        }
        const est = this.est;
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(est.papel, 1);
        g.fillRect(0, 0, CINE_ANCHO, CINE_ALTO);
        // Puntitos de semitono
        g.fillStyle(est.puntos, 0.18);
        for (let fila = 0, y = 9; y < CINE_ALTO; y += 18, fila++) {
            for (let x = 9 + (fila % 2) * 9; x < CINE_ANCHO; x += 18) {
                g.fillCircle(x, y, 2.6);
            }
        }
        g.generateTexture(this.clavePapel, CINE_ANCHO, CINE_ALTO);
        g.destroy();
    }

    // Si falta la imagen de un panel, se genera uno de relleno con su
    // nombre y el tamaño recomendado (sirve como guion gráfico).
    crearRellenos() {
        const est = this.est;
        let numero = 0;
        this.cfg.paginas.forEach((pagina) => {
            const rects = Cinematica.rectsDePagina(pagina);
            pagina.paneles.slice(0, rects.length).forEach((panel, i) => {
                numero++;
                const clave = this.claveImagen(panel.imagen);
                if (this.textures.exists(clave)) {
                    return;
                }
                const w = Math.round(rects[i].w);
                const h = Math.round(rects[i].h);
                const textura = this.textures.createCanvas(clave, w, h);
                const ctx = textura.getContext();
                const degradado = ctx.createLinearGradient(0, 0, w, h);
                degradado.addColorStop(0, est.rellenoA);
                degradado.addColorStop(1, est.rellenoB);
                ctx.fillStyle = degradado;
                ctx.fillRect(0, 0, w, h);

                ctx.strokeStyle = "rgba(255,255,255,0.10)";
                ctx.lineWidth = 18;
                for (let k = -h; k < w; k += 46) {
                    ctx.beginPath();
                    ctx.moveTo(k, h);
                    ctx.lineTo(k + h, 0);
                    ctx.stroke();
                }

                const u = Math.min(w, h);
                const chico = Math.max(14, Math.round(u * 0.055));
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold " + Math.round(u * 0.14) + "px Georgia, serif";
                ctx.fillText("PANEL " + numero, w / 2, h / 2 - u * 0.14);
                ctx.font = chico + "px Arial, sans-serif";
                ctx.fillText("Falta: " + panel.imagen, w / 2, h / 2 + u * 0.02);
                ctx.fillText("Ideal: " + (w * 2) + " x " + (h * 2) + " px", w / 2, h / 2 + u * 0.02 + chico * 1.5);
                ctx.fillText("Mínimo: " + w + " x " + h + " px", w / 2, h / 2 + u * 0.02 + chico * 3);
                textura.refresh();
            });
        });
    }

    // =============================================================
    // INTERFAZ FIJA (no se desliza con las páginas)
    // =============================================================
    crearInterfaz() {
        const est = this.est;
        const fuente = "Georgia, serif";

        this.add.text(40, 32, Idioma.dato(this.cfg.titulo), {
            fontFamily: fuente,
            fontSize: "22px",
            fontStyle: "italic bold",
            color: est.tinta,
            resolution: 2
        }).setOrigin(0, 0.5).setDepth(50);

        // Botón SALTAR: solo existe si la cinemática ya se había visto
        if (this.puedeSaltar) {
            const boton = this.add.text(CINE_ANCHO - 40, 32, Idioma.t("cine.saltar"), {
                fontFamily: fuente,
                fontSize: "22px",
                fontStyle: "bold",
                color: "#ffffff",
                backgroundColor: est.botonFondo,
                padding: { left: 22, right: 22, top: 8, bottom: 8 },
                stroke: "#000000",
                strokeThickness: 3,
                resolution: 2
            }).setOrigin(1, 0.5).setDepth(50).setInteractive({ useHandCursor: true });
            boton.on("pointerover", () => {
                boton.setStyle({ color: est.botonHover });
                boton.setScale(1.06);
            });
            boton.on("pointerout", () => {
                boton.setStyle({ color: "#ffffff" });
                boton.setScale(1);
            });
            boton.on("pointerdown", () => {
                window.reproducirSonidoBoton(this);
                this.terminar(true);
            });
        }

        // Indicador "clic para continuar" (parpadea)
        this.indicador = this.add.text(CINE_ANCHO - 40, CINE_ALTO - 24, Idioma.t("cine.clic"), {
            fontFamily: fuente,
            fontSize: "20px",
            fontStyle: "bold",
            color: est.tinta,
            resolution: 2
        }).setOrigin(1, 0.5).setDepth(50).setVisible(false);
        this.tweens.add({
            targets: this.indicador,
            alpha: 0.35,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // Puntos de página: ● ○ ○
        this.puntos = this.add.text(CINE_ANCHO / 2, CINE_ALTO - 24, "", {
            fontFamily: "Arial, sans-serif",
            fontSize: "18px",
            color: est.tinta,
            resolution: 2
        }).setOrigin(0.5).setDepth(50);
    }

    actualizarPuntos() {
        this.puntos.setText(this.cfg.paginas.map((_, i) => (i === this.indicePagina ? "●" : "○")).join(" "));
    }

    mostrarIndicador() {
        if (this.terminada) {
            return;
        }
        const finDePagina = this.pasoActual >= this.pasos.length;
        const ultimaPagina = this.indicePagina === this.cfg.paginas.length - 1;
        let texto = Idioma.t("cine.clic");
        if (finDePagina) {
            texto = ultimaPagina ? Idioma.t("cine.fin") : Idioma.t("cine.siguiente");
        }
        this.indicador.setText(texto).setVisible(true);
    }

    ocultarIndicador() {
        this.indicador.setVisible(false);
    }

    // =============================================================
    // PÁGINAS Y PANELES
    // =============================================================
    construirPagina(indice) {
        const datos = this.cfg.paginas[indice];
        const pagina = this.add.container(0, 0).setDepth(1);
        pagina.add(this.add.image(CINE_ANCHO / 2, CINE_ALTO / 2, this.clavePapel));
        this.tweensAmbiente = [];
        if (this.estrella) {
            this.agregarBrillosPagina(pagina);
        }
        if (this.conEclipse) {
            this.agregarPlumasPagina(pagina);
        }

        const rects = Cinematica.rectsDePagina(datos);
        if (datos.paneles.length > rects.length) {
            console.warn("[Cinematica] La página " + (indice + 1) + " tiene más paneles (" + datos.paneles.length +
                ") que espacios en el layout '" + (datos.layout || "unico") + "' (" + rects.length + "). Sobran.");
        }
        this.paneles = datos.paneles.slice(0, rects.length).map((panel, i) => this.crearPanel(pagina, panel, rects[i], i));

        // Cada "paso" es un clic: primero aparece el panel (con su primer
        // texto) y cada texto extra del mismo panel es otro paso.
        this.pasos = [];
        this.paneles.forEach((panel, i) => {
            const cuantos = Math.max(1, (panel.cfg.textos || []).length);
            for (let k = 0; k < cuantos; k++) {
                this.pasos.push({ p: i, k: k });
            }
        });
        this.pasoActual = 0;
        this.indicePagina = indice;
        this.contenedorPagina = pagina;
        this.actualizarPuntos();
        if (this.conEclipse) {
            this.avanzarEclipse(indice);
        }
        return pagina;
    }

    crearPanel(pagina, cfg, rect, i) {
        const clave = this.claveImagen(cfg.imagen);
        const angulo = (cfg.angulo !== undefined) ? cfg.angulo : CINE_INCLINACION[i % CINE_INCLINACION.length];
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;

        const cont = this.add.container(cx, cy).setAlpha(0).setAngle(angulo);
        const sombra = this.add.rectangle(7, 9, rect.w, rect.h, 0x000000, 0.3);
        const fondo = this.add.rectangle(0, 0, rect.w, rect.h, 0xffffff);
        const img = this.add.image(0, 0, clave);
        this.ajustarImagen(img, rect.w, rect.h, 1);
        const marco = this.add.rectangle(0, 0, rect.w, rect.h).setStrokeStyle(6, 0x111111);
        cont.add([sombra, fondo, img, marco]);
        // Velo de luz que se disuelve al aparecer (solo estilo "estrella")
        const velo = this.estrella ? this.add.rectangle(0, 0, rect.w, rect.h, 0xfff6d5, 0) : null;
        if (velo) {
            cont.add(velo);
        }
        pagina.add(cont);

        return {
            cfg: cfg,
            rect: rect,
            cont: cont,
            img: img,
            cx: cx,
            cy: cy,
            angulo: angulo,
            entrada: cfg.entrada || "pop",
            zoom: (cfg.zoom === undefined) ? "in" : cfg.zoom,
            zoomTween: null,
            velo: velo,
            flotarTween: null
        };
    }

    // Imagen a "cover": llena el panel recortando los bordes sobrantes.
    // "zoom" > 1 acerca la imagen dentro del marco (efecto Ken Burns).
    ajustarImagen(img, anchoPanel, altoPanel, zoom) {
        const iw = img.width;
        const ih = img.height;
        if (!iw || !ih) {
            return;
        }
        const escala = Math.max(anchoPanel / iw, altoPanel / ih) * zoom;
        img.setScale(escala);
        const cw = anchoPanel / escala;
        const ch = altoPanel / escala;
        img.setCrop((iw - cw) / 2, (ih - ch) / 2, cw, ch);
    }

    // Animación de entrada de la viñeta
    revelarPanel(p, alTerminar) {
        if (this.estrella) {
            this.revelarPanelEstrella(p, alTerminar);
            return;
        }
        const c = p.cont;
        let duracion = 450;
        let ease = "Cubic.easeOut";
        c.setAlpha(0);
        switch (p.entrada) {
            case "izquierda":
                c.x = p.cx - 240;
                c.setAngle(p.angulo - 3);
                break;
            case "derecha":
                c.x = p.cx + 240;
                c.setAngle(p.angulo + 3);
                break;
            case "arriba":
                c.y = p.cy - 180;
                break;
            case "abajo":
                c.y = p.cy + 180;
                break;
            case "zoom":
                c.setScale(1.5);
                duracion = 500;
                break;
            case "fundido":
                duracion = 800;
                ease = "Sine.easeInOut";
                break;
            case "golpe":
                c.setScale(1.8);
                duracion = 300;
                ease = "Back.easeOut";
                break;
            default: // "pop"
                c.setScale(0.5);
                c.setAngle(p.angulo + (Math.random() < 0.5 ? -6 : 6));
                duracion = 420;
                ease = "Back.easeOut";
        }
        this.tweens.add({
            targets: c,
            x: p.cx,
            y: p.cy,
            scale: 1,
            angle: p.angulo,
            alpha: 1,
            duration: duracion,
            ease: ease,
            onComplete: () => {
                if (p.entrada === "golpe") {
                    this.cameras.main.shake(220, 0.008);
                }
                if (this.conEclipse) {
                    this.iniciarRespiracion(p);
                }
                alTerminar();
            }
        });

        this.iniciarZoom(p, 14000);
    }

    // Movimiento lento de cámara dentro de la viñeta (efecto Ken Burns)
    iniciarZoom(p, duracion) {
        if (!p.zoom) {
            return;
        }
        const desde = (p.zoom === "out") ? 1.1 : 1;
        const hasta = (p.zoom === "out") ? 1 : 1.1;
        this.ajustarImagen(p.img, p.rect.w, p.rect.h, desde);
        p.zoomTween = this.tweens.addCounter({
            from: desde,
            to: hasta,
            duration: duracion,
            ease: "Sine.easeInOut",
            onUpdate: (tween) => {
                if (p.img.active) {
                    this.ajustarImagen(p.img, p.rect.w, p.rect.h, tween.getValue());
                }
            }
        });
    }

    // =============================================================
    // ANIMACIÓN "ESTRELLA" (skin navideña)
    // Todo lo de esta sección solo se usa si la cinemática tiene
    // animacion: "estrella". La de Kukulcán no pasa por aquí.
    // =============================================================

    // Textura del destello dorado de 4 puntas (estrellitas y chispas)
    crearTexturasEstrella() {
        if (!this.textures.exists("cine_brillo")) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            const c = 16;
            const k = 3.5;
            g.fillStyle(0xf5b800, 1);
            g.beginPath();
            g.moveTo(c, 0);
            g.lineTo(c + k, c - k);
            g.lineTo(32, c);
            g.lineTo(c + k, c + k);
            g.lineTo(c, 32);
            g.lineTo(c - k, c + k);
            g.lineTo(0, c);
            g.lineTo(c - k, c - k);
            g.closePath();
            g.fillPath();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(c, c, 3);
            g.generateTexture("cine_brillo", 32, 32);
            g.destroy();
        }
    }

    // Estrellitas que titilan en los márgenes de la página (detrás de las viñetas)
    agregarBrillosPagina(pagina) {
        const puntos = [
            [26, 120], [1254, 200], [22, 330], [1258, 470], [30, 610], [1250, 640],
            [300, 32], [520, 24], [760, 34], [930, 26],
            [200, 700], [430, 702], [860, 700], [1000, 704]
        ];
        puntos.forEach((punto, i) => {
            const escala = 0.35 + (i % 3) * 0.12;
            const brillo = this.add.image(punto[0], punto[1], "cine_brillo").setAlpha(0.15).setScale(escala);
            pagina.add(brillo);
            this.tweensAmbiente.push(this.tweens.add({
                targets: brillo,
                alpha: 0.95,
                scale: escala * 1.5,
                angle: 45,
                duration: 1200 + (i % 5) * 300,
                delay: i * 170,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            }));
        });
    }

    // Entradas: "florecer" (por defecto) | "descender" | "destello" | "amanecer"
    revelarPanelEstrella(p, alTerminar) {
        const c = p.cont;
        let duracion = 900;
        let ease = "Sine.easeOut";
        let cantidadChispas = 8;
        c.setAlpha(0);
        p.velo.setAlpha(0);
        switch (p.entrada) {
            case "descender": // baja suave, como un copo de nieve
                c.y = p.cy - 110;
                c.setAngle(p.angulo - 2.5);
                duracion = 1100;
                break;
            case "destello": // aparece con un destello de luz
                c.setScale(1.06);
                p.velo.setAlpha(1);
                duracion = 550;
                ease = "Cubic.easeOut";
                cantidadChispas = 22;
                break;
            case "amanecer": // sale lento de la luz, como un amanecer
                p.velo.setAlpha(1);
                duracion = 1300;
                ease = "Sine.easeInOut";
                break;
            default: // "florecer": se abre suavemente
                c.setScale(0.9);
        }
        if (p.entrada === "destello" || p.entrada === "amanecer") {
            this.tweens.add({
                targets: p.velo,
                alpha: 0,
                duration: p.entrada === "amanecer" ? 1600 : 900,
                ease: "Sine.easeOut"
            });
        }
        this.chispas(p, cantidadChispas);
        this.iniciarZoom(p, 22000);
        this.tweens.add({
            targets: c,
            y: p.cy,
            scale: 1,
            angle: p.angulo,
            alpha: 1,
            duration: duracion,
            ease: ease,
            onComplete: () => {
                this.iniciarFlote(p);
                alTerminar();
            }
        });
    }

    // Chispas doradas que saltan sobre la viñeta al aparecer
    chispas(p, cantidad) {
        const emisor = this.add.particles(p.cx, p.cy, "cine_brillo", {
            emitZone: {
                type: "random",
                source: new Phaser.Geom.Rectangle(-p.rect.w / 2, -p.rect.h / 2, p.rect.w, p.rect.h)
            },
            lifespan: { min: 700, max: 1400 },
            speed: { min: 8, max: 40 },
            angle: { min: 200, max: 340 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 1, end: 0 },
            emitting: false
        }).setDepth(35);
        emisor.explode(cantidad);
        this.time.delayedCall(1800, () => emisor.destroy());
    }

    // La viñeta (y sus textos) se mece muy despacio, como flotando
    iniciarFlote(p) {
        p.flotarTween = this.tweens.add({
            targets: p.cont,
            y: p.cy - 3.5,
            angle: p.angulo + 0.25,
            duration: 2600 + Math.random() * 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    // Destello cálido que acompaña el cambio de página
    destelloPagina() {
        const velo = this.add.rectangle(CINE_ANCHO / 2, CINE_ALTO / 2, CINE_ANCHO, CINE_ALTO, 0xfff6d5, 0).setDepth(40);
        this.tweens.add({
            targets: velo,
            alpha: 0.55,
            duration: 450,
            yoyo: true,
            ease: "Sine.easeInOut",
            onComplete: () => velo.destroy()
        });
    }

    // =============================================================
    // AMBIENTE "ECLIPSE" (Kukulcán)
    // Solo se usa si la cinemática tiene ambiente: "eclipse".
    // La historia ocurre mientras el eclipse avanza despacio: el
    // emblema de arriba lo va cubriendo de página en página, pero
    // nunca llega a ser total.
    // =============================================================

    // Textura de pluma de quetzal (se tiñe de verde, turquesa o dorado)
    crearTexturasEclipse() {
        if (this.textures.exists("cine_pluma")) {
            return;
        }
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.beginPath();
        g.moveTo(12, 0);
        g.lineTo(19, 10);
        g.lineTo(22, 25);
        g.lineTo(19, 41);
        g.lineTo(12, 54);
        g.lineTo(5, 41);
        g.lineTo(2, 25);
        g.lineTo(5, 10);
        g.closePath();
        g.fillPath();
        // Nervadura central
        g.lineStyle(2, 0x1b7a4c, 1);
        g.beginPath();
        g.moveTo(12, 3);
        g.lineTo(12, 52);
        g.strokePath();
        g.generateTexture("cine_pluma", 24, 54);
        g.destroy();
    }

    // Plumas que se mecen en los márgenes de la página (detrás de las viñetas)
    agregarPlumasPagina(pagina) {
        const puntos = [
            [24, 110], [1256, 170], [20, 300], [1260, 430], [26, 580], [1254, 630],
            [330, 30], [500, 28], [780, 30], [960, 28],
            [180, 698], [420, 700], [860, 698], [1010, 700]
        ];
        const tintes = [0x2fbf7a, 0x22b8b0, 0xe0a41c];
        puntos.forEach((punto, i) => {
            const escala = 0.5 + (i % 3) * 0.14;
            const base = -18 + (i % 5) * 9;
            const pluma = this.add.image(punto[0], punto[1], "cine_pluma")
                .setTint(tintes[i % tintes.length])
                .setAlpha(0.6)
                .setScale(escala)
                .setAngle(base);
            pagina.add(pluma);
            this.tweensAmbiente.push(this.tweens.add({
                targets: pluma,
                angle: base + 16,
                y: punto[1] + 5,
                alpha: 0.95,
                duration: 2200 + (i % 4) * 400,
                delay: i * 140,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            }));
        });
    }

    // Emblema del eclipse (arriba al centro): un sol que la luna va cubriendo
    crearEmblemaEclipse() {
        this.coberturaEclipse = 0.08;
        this.haloEclipse = this.add.graphics().setPosition(CINE_ANCHO / 2, 38).setDepth(49);
        this.haloEclipse.fillStyle(0xffc933, 0.22);
        this.haloEclipse.fillCircle(0, 0, 27);
        this.haloEclipse.fillStyle(0xffc933, 0.12);
        this.haloEclipse.fillCircle(0, 0, 34);
        this.tweens.add({
            targets: this.haloEclipse,
            alpha: 0.45,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
        this.gEclipse = this.add.graphics().setPosition(CINE_ANCHO / 2, 38).setDepth(50);
        this.dibujarEclipse();
    }

    dibujarEclipse() {
        const g = this.gEclipse;
        const luna = -38 + 40 * this.coberturaEclipse;
        g.clear();
        g.fillStyle(0xffb300, 1);
        g.fillCircle(0, 0, 16);
        g.fillStyle(0xffe680, 1);
        g.fillCircle(-2, -2, 11);
        g.fillStyle(0x2b1d08, 1);
        g.fillCircle(luna, 0, 16.5);
    }

    // Cada página el eclipse avanza un poco más, muy despacio
    avanzarEclipse(indice) {
        const paginas = this.cfg.paginas.length;
        const objetivo = 0.3 + 0.58 * indice / Math.max(1, paginas - 1);
        if (this.tweenEclipse) {
            this.tweenEclipse.stop();
        }
        this.tweenEclipse = this.tweens.addCounter({
            from: this.coberturaEclipse,
            to: objetivo,
            duration: 40000,
            ease: "Sine.easeInOut",
            onUpdate: (tween) => {
                this.coberturaEclipse = tween.getValue();
                this.dibujarEclipse();
            }
        });
    }

    // Las viñetas "respiran" muy despacio una vez que aparecen
    iniciarRespiracion(p) {
        p.flotarTween = this.tweens.add({
            targets: p.cont,
            scale: 1.012,
            angle: p.angulo + 0.3,
            duration: 2800 + Math.random() * 1400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    // Detiene los tweens de una página y la destruye
    limpiarPagina(pagina, paneles, ambiente) {
        paneles.forEach((p) => {
            if (p.zoomTween) {
                p.zoomTween.stop();
            }
            if (p.flotarTween) {
                p.flotarTween.stop();
            }
        });
        if (Array.isArray(ambiente)) {
            ambiente.forEach((tween) => tween.stop());
        }
        pagina.destroy();
    }

    // =============================================================
    // AVANCE (máquina de estados)
    // =============================================================
    avanzar() {
        if (this.terminada) {
            return;
        }
        if (this.estado === "escribiendo") {
            this.terminarEscritura();
        } else if (this.estado === "esperando") {
            this.siguientePaso();
        }
        // En "transicion" y "entrando" el clic se ignora
    }

    siguientePaso() {
        if (this.terminada) {
            return;
        }
        this.ocultarIndicador();

        // ¿Se acabaron los pasos de esta página?
        if (this.pasoActual >= this.pasos.length) {
            if (this.indicePagina + 1 < this.cfg.paginas.length) {
                this.cambiarPagina(this.indicePagina + 1);
            } else {
                this.terminar(false);
            }
            return;
        }

        const paso = this.pasos[this.pasoActual++];
        const panel = this.paneles[paso.p];
        if (paso.k === 0) {
            this.estado = "entrando";
            this.revelarPanel(panel, () => {
                this.mostrarSfx(panel);
                this.mostrarTextoDelPaso(panel, 0);
            });
        } else {
            this.mostrarTextoDelPaso(panel, paso.k);
        }
    }

    mostrarTextoDelPaso(panel, k) {
        const texto = panel.cfg.textos && panel.cfg.textos[k];
        if (!texto) {
            this.estado = "esperando";
            this.mostrarIndicador();
            return;
        }
        this.estado = "escribiendo";
        const listo = () => {
            this.estado = "esperando";
            this.mostrarIndicador();
        };
        if (texto.tipo === "dialogo") {
            this.mostrarGlobo(panel, texto, listo);
        } else {
            this.mostrarCaja(panel, texto, listo);
        }
    }

    // "comic": la página nueva entra deslizándose desde la derecha
    // "estrella": la página nueva se funde sobre la anterior con un destello
    cambiarPagina(indice) {
        this.estado = "transicion";
        const vieja = this.contenedorPagina;
        const panelesViejos = this.paneles;
        const ambienteViejo = this.tweensAmbiente;
        const nueva = this.construirPagina(indice);

        if (this.estrella) {
            nueva.setAlpha(0);
            this.destelloPagina();
            this.tweens.add({
                targets: nueva,
                alpha: 1,
                duration: 1200,
                ease: "Sine.easeInOut",
                onComplete: () => {
                    this.limpiarPagina(vieja, panelesViejos, ambienteViejo);
                    this.siguientePaso();
                }
            });
            return;
        }

        nueva.x = CINE_ANCHO;
        this.tweens.add({
            targets: vieja,
            x: -CINE_ANCHO,
            duration: 700,
            ease: "Cubic.easeInOut",
            onComplete: () => this.limpiarPagina(vieja, panelesViejos, ambienteViejo)
        });
        this.tweens.add({
            targets: nueva,
            x: 0,
            duration: 700,
            ease: "Cubic.easeInOut",
            onComplete: () => this.siguientePaso()
        });
    }

    // Fin de la cinemática (terminada o saltada): guarda y continúa
    terminar(saltada) {
        if (this.terminada) {
            return;
        }
        this.terminada = true;
        this.estado = "fin";
        this.indicador.setVisible(false);
        Progreso.marcarCinematicaVista(this.skin, saltada);

        if (this.musica) {
            this.tweens.add({ targets: this.musica, volume: 0, duration: 600 });
        }
        const cam = this.cameras.main;
        cam.fadeOut(600, 0, 0, 0);
        cam.once("camerafadeoutcomplete", () => {
            this.scene.start(this.destino);
        });
    }

    // =============================================================
    // TEXTO: máquina de escribir
    // =============================================================

    // Crea un texto ya "pre-cortado" en líneas para que, al escribirlo
    // letra por letra, las palabras no salten de renglón.
    crearTextoTipeable(texto, estilo, anchoMax) {
        const txt = this.add.text(0, 0, texto, Object.assign({
            resolution: 2,
            wordWrap: { width: anchoMax }
        }, estilo));
        const pre = txt.getWrappedText().join("\n");
        txt.setText(pre);
        const w = Math.ceil(txt.width);
        const h = Math.ceil(txt.height);
        txt.setFixedSize(w, h);
        txt.setText("");
        return { txt: txt, pre: pre, w: w, h: h };
    }

    escribir(txt, completo, alTerminar) {
        this.escritura = { txt: txt, completo: completo, alTerminar: alTerminar, evento: null };
        if (completo.length === 0) {
            this.terminarEscritura();
            return;
        }
        let n = 0;
        let i = 0;

        // Estilo "estrella": el texto aparece palabra por palabra
        let cortes = null;
        if (this.estrella) {
            cortes = [];
            const palabra = /\S+/g;
            let coincidencia;
            while ((coincidencia = palabra.exec(completo)) !== null) {
                cortes.push(coincidencia.index + coincidencia[0].length);
            }
        }
        const retardo = this.estrella ? (this.cfg.velocidadPalabra || 170) : (this.cfg.velocidadTexto || 28);

        this.escritura.evento = this.time.addEvent({
            delay: retardo,
            loop: true,
            callback: () => {
                let fin;
                if (cortes) {
                    n = cortes[i];
                    i++;
                    fin = i >= cortes.length;
                } else {
                    n++;
                    fin = n >= completo.length;
                }
                txt.setText(completo.substring(0, n));
                if (fin) {
                    this.terminarEscritura();
                }
            }
        });
    }

    // Completa el texto de golpe (también se usa al llegar al final)
    terminarEscritura() {
        const e = this.escritura;
        if (!e) {
            return;
        }
        this.escritura = null;
        if (e.evento) {
            e.evento.remove(false);
        }
        e.txt.setText(e.completo);
        if (e.alTerminar) {
            e.alTerminar();
        }
    }

    // Posición (relativa al centro del panel) de una caja o globo
    posicionEnPanel(rect, pos, bw, bh) {
        const hw = rect.w / 2;
        const hh = rect.h / 2;
        const m = 14;
        const izq = -hw + m + bw / 2;
        const der = hw - m - bw / 2;
        const arr = -hh + m + bh / 2;
        const aba = hh - m - bh / 2;
        const limitar = (v, a, b) => (a > b ? (a + b) / 2 : Math.min(Math.max(v, a), b));

        if (Array.isArray(pos)) {
            return {
                x: limitar(-hw + pos[0] * rect.w, izq, der),
                y: limitar(-hh + pos[1] * rect.h, arr, aba)
            };
        }
        switch (pos) {
            case "arriba-der": return { x: der, y: arr };
            case "abajo-izq":  return { x: izq, y: aba };
            case "abajo-der":  return { x: der, y: aba };
            case "arriba":     return { x: 0, y: arr };
            case "abajo":      return { x: 0, y: aba };
            case "centro":     return { x: 0, y: 0 };
            default:           return { x: izq, y: arr }; // "arriba-izq"
        }
    }

    // ---------------------------------------------------------
    // CAJA DE NARRACIÓN (rectángulo con borde negro)
    // ---------------------------------------------------------
    mostrarCaja(p, t, alTerminar) {
        const est = this.est;
        const anchoMax = Math.min(t.ancho || 420, p.rect.w - 60);
        const { txt, pre, w, h } = this.crearTextoTipeable(Idioma.dato(t.texto), {
            fontFamily: "Georgia, serif",
            fontSize: (t.tam || 22) + "px",
            color: est.tinta,
            align: "left"
        }, anchoMax);

        const pad = 14;
        const bw = w + pad * 2;
        const bh = h + pad * 2;
        const pos = this.posicionEnPanel(p.rect, t.pos || "arriba-izq", bw, bh);

        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.35);
        g.fillRect(-bw / 2 + 5, -bh / 2 + 5, bw, bh);
        g.fillStyle(est.caja, 1);
        g.fillRect(-bw / 2, -bh / 2, bw, bh);
        g.lineStyle(3, 0x111111, 1);
        g.strokeRect(-bw / 2, -bh / 2, bw, bh);
        txt.setPosition(-w / 2, -h / 2);

        if (this.estrella) {
            // Estilo "estrella": la caja sube y se aclara suavemente
            const cajaSuave = this.add.container(pos.x, pos.y + 14, [g, txt]).setAlpha(0);
            p.cont.add(cajaSuave);
            this.tweens.add({
                targets: cajaSuave,
                alpha: 1,
                y: pos.y,
                duration: 600,
                ease: "Sine.easeOut",
                onComplete: () => this.escribir(txt, pre, alTerminar)
            });
            return;
        }

        const caja = this.add.container(pos.x, pos.y, [g, txt]).setScale(0);
        p.cont.add(caja);
        this.tweens.add({
            targets: caja,
            scale: 1,
            duration: 220,
            ease: "Back.easeOut",
            onComplete: () => this.escribir(txt, pre, alTerminar)
        });
    }

    // ---------------------------------------------------------
    // GLOBO DE DIÁLOGO (elipse con colita)
    // ---------------------------------------------------------
    mostrarGlobo(p, t, alTerminar) {
        const textoBase = Idioma.dato(t.texto);
        const texto = (t.mayusculas === false) ? textoBase : textoBase.toUpperCase();
        const anchoMax = Math.min(t.ancho || 320, p.rect.w * 0.6);
        const { txt, pre, w, h } = this.crearTextoTipeable(texto, {
            fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Trebuchet MS', sans-serif",
            fontSize: (t.tam || 24) + "px",
            fontStyle: "bold",
            color: "#111111",
            align: "center"
        }, anchoMax);

        // El texto (rectángulo) debe caber dentro de la elipse
        const bw = w * 1.42 + 34;
        const bh = h * 1.5 + 26;
        const pos = this.posicionEnPanel(p.rect, t.pos || [0.5, 0.3], bw, bh);

        // Punta de la colita, relativa al centro del globo
        let punta = null;
        if (t.cola !== false) {
            if (Array.isArray(t.cola)) {
                punta = {
                    x: -p.rect.w / 2 + t.cola[0] * p.rect.w - pos.x,
                    y: -p.rect.h / 2 + t.cola[1] * p.rect.h - pos.y
                };
            } else {
                punta = { x: -bw * 0.15, y: bh / 2 + 38 };
            }
        }

        const g = this.add.graphics();
        this.dibujarGlobo(g, bw, bh, punta);
        txt.setPosition(-w / 2, -h / 2);

        const globo = this.add.container(pos.x, pos.y, [g, txt]).setScale(0);
        p.cont.add(globo);
        this.tweens.add({
            targets: globo,
            scale: 1,
            duration: 220,
            ease: "Back.easeOut",
            onComplete: () => this.escribir(txt, pre, alTerminar)
        });
    }

    dibujarGlobo(g, bw, bh, punta) {
        const a = bw / 2;
        const b = bh / 2;
        const borde = 0x111111;

        // Sombra y borde
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(5, 6, bw + 8, bh + 8);
        g.fillStyle(borde, 1);
        g.fillEllipse(0, 0, bw + 8, bh + 8);

        // Colita: solo si la punta queda claramente fuera de la elipse
        if (punta && (Math.pow(punta.x / a, 2) + Math.pow(punta.y / b, 2)) > 1.2) {
            const th = Math.atan2(punta.y / b, punta.x / a);
            const abertura = 0.3;
            const sobre = (r1, r2, ang) => ({ x: r1 * Math.cos(ang), y: r2 * Math.sin(ang) });

            // Colita negra (da el borde)
            const n1 = sobre(a + 4, b + 4, th - abertura - 0.05);
            const n2 = sobre(a + 4, b + 4, th + abertura + 0.05);
            g.fillStyle(borde, 1);
            g.fillTriangle(n1.x, n1.y, n2.x, n2.y, punta.x, punta.y);

            // Colita blanca (tapa el borde en la unión con el globo)
            const b1 = sobre(a - 6, b - 6, th - abertura);
            const b2 = sobre(a - 6, b - 6, th + abertura);
            const largo = Math.hypot(punta.x, punta.y) || 1;
            const puntaBlanca = {
                x: punta.x - (punta.x / largo) * 7,
                y: punta.y - (punta.y / largo) * 7
            };
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(b1.x, b1.y, b2.x, b2.y, puntaBlanca.x, puntaBlanca.y);
        }

        // Relleno blanco
        g.fillStyle(0xffffff, 1);
        g.fillEllipse(0, 0, bw, bh);
    }

    // ---------------------------------------------------------
    // ONOMATOPEYA (¡CRAC!, ¡BOOM!...)
    // ---------------------------------------------------------
    mostrarSfx(p) {
        const s = p.cfg.sfx;
        if (!s) {
            return;
        }
        const pos = s.pos || [0.5, 0.5];
        const angulo = (s.angulo !== undefined) ? s.angulo : -8;
        const txt = this.add.text(
            -p.rect.w / 2 + pos[0] * p.rect.w,
            -p.rect.h / 2 + pos[1] * p.rect.h,
            Idioma.dato(s.texto),
            {
                fontFamily: "Impact, 'Arial Black', sans-serif",
                fontSize: (s.tam || 72) + "px",
                color: s.color || "#ffe14d",
                stroke: "#111111",
                strokeThickness: 10,
                resolution: 2
            }
        ).setOrigin(0.5).setAngle(angulo - 14).setScale(2.4).setAlpha(0);
        txt.setShadow(5, 6, "#000000", 0, true, true);
        p.cont.add(txt);
        this.tweens.add({
            targets: txt,
            scale: 1,
            angle: angulo,
            alpha: 1,
            duration: 260,
            ease: "Back.easeOut"
        });
        this.cameras.main.shake(140, 0.004);
    }
}