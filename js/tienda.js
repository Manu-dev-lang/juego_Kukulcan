// Lienzo virtual sobre el que se dibuja todo
const TIENDA_ANCHO = 1280;
const TIENDA_ALTO = 720;

// Medidas del museo sobre el lienzo virtual
const TIENDA_MURO_ALTO = 548;      // aquí empieza el zócalo
const TIENDA_SUELO = 564;          // aquí empieza el piso
const TIENDA_OBRA = { W: 230, H: 290, BORDE: 12, PASPARTU: 10, Y: 322 };
const TIENDA_PLACA = { W: 200, H: 72, Y: 508 };
const TIENDA_SEPARACION = 270;     // distancia entre obras

class Tienda extends Phaser.Scene {
    constructor() {
        super("Tienda");
    }

    //   Tienda.guiaDeImagenes()
    static guiaDeImagenes() {
        const filas = [];
        Object.keys(CATALOGO_TIENDA).forEach((skin) => {
            const cfg = CATALOGO_TIENDA[skin];
            Object.keys(cfg.salas).forEach((claveSala) => {
                const sala = cfg.salas[claveSala];
                sala.items.forEach((item) => {
                    if (!item.imagen) {
                        return;
                    }
                    filas.push({
                        skin: skin,
                        sala: sala.nombre,
                        id: item.id,
                        archivo: "assets_" + skin + "/" + item.imagen,
                        precio: item.precio + " " + sala.moneda,
                        tamano: item.tamano || TIENDA_TAMANO_SUGERIDO
                    });
                });
            });
        });
        console.table(filas);
        return filas;
    }

    // =============================================================
    // INIT
    // =============================================================
    init(data) {
        this.skin = Progreso.idSkin();
        this.cfg = CATALOGO_TIENDA[this.skin] || null;
        this.claveSala = (data && data.sala) || Tienda.ultimaSala;
        if (this.cfg && !this.cfg.salas[this.claveSala]) {
            this.claveSala = Object.keys(this.cfg.salas)[0];
        }
        this.pagina = 0;
        this.modal = null;
        this.objetosSala = [];
        this.pestanas = {};
        this.saliendo = false;
        this.videoOculto = null;
    }

    claveImagen(id) {
        return "tienda_" + this.skin + "_" + id;
    }

    salaActual() {
        return this.cfg.salas[this.claveSala];
    }

    // =============================================================
    // PRELOAD: imágenes de las obras. Las que no existan simplemente
    // quedan bloqueadas.
    // =============================================================
    preload() {
        if (!this.cfg) {
            return;
        }
        this.load.setPath(window.carpetaSkin);

        const alFallar = (archivo) => {
            console.warn("[Tienda] No se encontró '" + archivo.src + "'. Esa obra se mostrará bloqueada.");
        };
        this.load.on("loaderror", alFallar);
        this.load.once("complete", () => this.load.off("loaderror", alFallar));

        Object.keys(this.cfg.salas).forEach((claveSala) => {
            this.cfg.salas[claveSala].items.forEach((item) => {
                if (item.bloqueado || !item.imagen) {
                    return;
                }
                const clave = this.claveImagen(item.id);
                if (this.textures.exists(clave)) {
                    return;
                }
                this.load.image(clave, item.imagen);
            });
        });
    }

    // =============================================================
    // CREATE
    // =============================================================
    create() {
        if (!this.cfg) {
            console.warn("[Tienda] No hay catálogo para la skin '" + this.skin + "'. Se vuelve al menú.");
            this.scene.start("Inicio");
            return;
        }
        this.est = this.cfg.estilo;

        this.ocultarCamaraVideo();
        this.ajustarVista();
        this.scale.on("resize", this.ajustarVista, this);
        this.events.once("shutdown", this.alCerrar, this);

        this.dibujarMuseo();
        this.crearCabecera();
        this.crearAviso();
        this.actualizarPestanas();
        this.dibujarSala();

        const teclado = this.input.keyboard;
        if (teclado) {
            teclado.on("keydown-ESC", () => {
                if (this.modal) {
                    this.cerrarModal();
                } else {
                    this.volver();
                }
            });
            teclado.on("keydown-LEFT", () => this.cambiarPagina(-1));
            teclado.on("keydown-RIGHT", () => this.cambiarPagina(1));
        }

        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    // Al cerrar la escena: quitar listeners globales y restaurar cámara web
    alCerrar() {
        this.scale.off("resize", this.ajustarVista, this);
        this.modal = null;
        if (this.videoOculto) {
            this.videoOculto.style.display = this.displayPrevio || "block";
            this.videoOculto = null;
        }
    }

    // El video de la cámara web taparía las obras,
    // así que se oculta mientras dura la tienda (igual que en la cinemática).
    ocultarCamaraVideo() {
        const video = window.camaraVideo;
        if (video) {
            this.videoOculto = video;
            this.displayPrevio = video.style.display;
            video.style.display = "none";
        }
    }

    // Lienzo virtual 1280x720 (viewport + zoom de la cámara)
    ajustarVista() {
        const cam = this.cameras.main;
        if (!cam) {
            return;
        }
        const ancho = this.scale.width;
        const alto = this.scale.height;
        const escala = Math.min(ancho / TIENDA_ANCHO, alto / TIENDA_ALTO);
        const vw = Math.round(TIENDA_ANCHO * escala);
        const vh = Math.round(TIENDA_ALTO * escala);
        cam.setViewport(Math.round((ancho - vw) / 2), Math.round((alto - vh) / 2), vw, vh);
        cam.setZoom(escala);
        cam.centerOn(TIENDA_ANCHO / 2, TIENDA_ALTO / 2);
    }

    // =============================================================
    // AYUDAS
    // =============================================================
    txt(x, y, texto, estilo) {
        return this.add.text(x, y, texto, Object.assign({
            fontFamily: "Georgia, serif",
            fontSize: "18px",
            color: "#ffffff",
            resolution: 2
        }, estilo || {}));
    }

    // Registra un objeto de la sala actual (se destruye al redibujarla)
    reg(obj) {
        this.objetosSala.push(obj);
        return obj;
    }

    limpiarSala() {
        this.objetosSala.forEach((obj) => {
            if (obj && obj.scene) {
                this.tweens.killTweensOf(obj);
                obj.destroy();
            }
        });
        this.objetosSala = [];
    }

    // Icono de la moneda (pluma o jade), ajustado a un tamaño
    iconoMoneda(x, y, tam, sala) {
        if (sala.icono && this.textures.exists(sala.icono)) {
            const img = this.add.image(x, y, sala.icono);
            img.setScale(tam / Math.max(img.width, img.height));
            return img;
        }
        return this.add.circle(x, y, tam / 2, sala.moneda === "jades" ? 0x00ffaa : 0xffd700);
    }

    trapecio(g, cx, yArriba, mitadArriba, yAbajo, mitadAbajo) {
        g.fillTriangle(cx - mitadArriba, yArriba, cx + mitadArriba, yArriba, cx + mitadAbajo, yAbajo);
        g.fillTriangle(cx - mitadArriba, yArriba, cx + mitadAbajo, yAbajo, cx - mitadAbajo, yAbajo);
    }

    // Una "skin" es un objeto del catálogo con categoría (jugador / enemigos):
    // no usa imagen, se pinta en código con las mismas texturas del juego.
    esSkin(item) {
        return !!item.categoria;
    }

    // Texto de la placa cuando la obra/skin ya es tuya
    textoEstadoComprado(item) {
        if (this.esSkin(item) && Progreso.estaEquipada(item.id)) {
            return Idioma.t("tienda.equipada");
        }
        return Idioma.t("tienda.adquirida");
    }

    // Dibuja la skin con las texturas del juego pintadas (tinte) y un
    // balanceo suave. "registrar" es this.reg (sala) o this.regM (ventana).
    dibujarVistaSkin(item, cx, cy, ancho, alto, profundidad, registrar) {
        const texturas = (item.vista || []).filter((clave) => this.textures.exists(clave));
        if (texturas.length === 0) {
            registrar(this.txt(cx, cy, Idioma.t("tienda.imagenNo"), {
                fontSize: "16px",
                fontStyle: "italic",
                color: this.est.textoTenue,
                align: "center"
            })).setOrigin(0.5).setDepth(profundidad);
            return;
        }
        const lado = Math.min(ancho, alto);
        registrar(this.add.circle(cx, cy, lado * 0.42, item.tinte, 0.14)).setDepth(profundidad);

        const n = texturas.length;
        let posiciones = [[0, 0]];
        let tam = lado * 0.78;
        if (n === 2) {
            posiciones = [[-0.22, 0], [0.22, 0]];
            tam = lado * 0.44;
        } else if (n >= 3) {
            posiciones = [[0, -0.2], [-0.22, 0.2], [0.22, 0.2]];
            tam = lado * 0.42;
        }
        texturas.slice(0, 3).forEach((clave, i) => {
            const px = cx + posiciones[i][0] * ancho;
            const py = cy + posiciones[i][1] * alto;
            const img = registrar(this.add.image(px, py, clave)).setDepth(profundidad + 1);
            img.setScale(tam / Math.max(img.width, img.height));
            img.setTint(item.tinte);
            this.tweens.add({
                targets: img,
                y: py - 5,
                duration: 1100 + i * 180,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        });
    }

    // Línea "★ Nombre de la habilidad: descripción" para las ventanas
    textoHabilidad(item, x, y, ancho) {
        if (!item.habilidad) {
            return;
        }
        this.regM(this.txt(x, y,
            "★ " + Idioma.t("tienda.habilidad") + ": " + Idioma.dato(item.habilidad.nombre) +
            "\n" + Idioma.dato(item.habilidad.texto), {
            fontSize: "16px",
            fontStyle: "bold",
            color: this.est.acento,
            wordWrap: { width: ancho },
            lineSpacing: 3
        })).setOrigin(0, 0).setDepth(203);
    }

    estadoObra(item) {
        if (Progreso.comprado(item.id)) {
            return "comprado";
        }
        if (this.esSkin(item)) {
            return "disponible";
        }
        const tieneImagen = !item.bloqueado && this.textures.exists(this.claveImagen(item.id));
        return tieneImagen ? "disponible" : "bloqueado";
    }

    // =============================================================
    // EL MUSEO (pared, friso, zócalo y piso: se dibuja una sola vez)
    // =============================================================
    dibujarMuseo() {
        const est = this.est;
        const W = TIENDA_ANCHO;
        const H = TIENDA_ALTO;
        const g = this.add.graphics().setDepth(-10);

        // Pared con paneles verticales
        g.fillStyle(est.paredA, 1).fillRect(0, 0, W, TIENDA_SUELO);
        for (let x = 0; x < W; x += 96) {
            g.fillStyle(est.paredB, 0.28).fillRect(x, 0, 48, TIENDA_SUELO);
        }
        // Bordes en penumbra
        for (let i = 1; i <= 8; i++) {
            g.fillStyle(0x000000, 0.05);
            g.fillRect(0, 0, i * 20, TIENDA_SUELO);
            g.fillRect(W - i * 20, 0, i * 20, TIENDA_SUELO);
        }

        // Encabezado y friso
        g.fillStyle(est.paredB, 1).fillRect(0, 0, W, 92);
        g.fillStyle(est.paredB, 0.9).fillRect(0, 92, W, 30);
        g.lineStyle(3, est.friso, 1).lineBetween(0, 92, W, 92);
        g.lineStyle(2, est.friso, 0.7).lineBetween(0, 122, W, 122);

        if (est.frisoTipo === "guirnalda") {
            this.dibujarGuirnalda(g);
        } else {
            this.dibujarPiramides(g);
        }

        // Zócalo
        g.fillStyle(est.paredB, 1).fillRect(0, TIENDA_MURO_ALTO, W, TIENDA_SUELO - TIENDA_MURO_ALTO);
        g.lineStyle(2, est.friso, 0.7).lineBetween(0, TIENDA_MURO_ALTO, W, TIENDA_MURO_ALTO);

        // Piso
        g.fillStyle(est.piso, 1).fillRect(0, TIENDA_SUELO, W, H - TIENDA_SUELO);
        if (est.pisoTipo === "alfombra") {
            g.fillStyle(est.friso, 0.6);
            g.fillRect(0, TIENDA_SUELO + 14, W, 4);
            g.fillRect(0, H - 18, W, 4);
            g.fillStyle(est.pisoLinea, 1);
            for (let x = 20; x < W; x += 48) {
                g.fillCircle(x, TIENDA_SUELO + 60, 3);
                g.fillCircle(x + 24, TIENDA_SUELO + 90, 3);
            }
        } else {
            g.lineStyle(2, est.pisoLinea, 0.9);
            let fila = 0;
            for (let y = TIENDA_SUELO + 22; y < H; y += 22) {
                g.lineBetween(0, y, W, y);
                for (let x = (fila % 2) * 60 + 30; x < W; x += 120) {
                    g.lineBetween(x, y, x, y + 22);
                }
                fila++;
            }
        }
        g.fillStyle(0x000000, 0.35).fillRect(0, TIENDA_SUELO, W, 10);
    }

    // Friso de pirámides escalonadas (skin normal)
    dibujarPiramides(g) {
        g.fillStyle(this.est.friso, 0.6);
        for (let x = 6; x < TIENDA_ANCHO; x += 56) {
            g.beginPath();
            g.moveTo(x, 118);
            g.lineTo(x, 112);
            g.lineTo(x + 6, 112);
            g.lineTo(x + 6, 106);
            g.lineTo(x + 12, 106);
            g.lineTo(x + 12, 100);
            g.lineTo(x + 36, 100);
            g.lineTo(x + 36, 106);
            g.lineTo(x + 42, 106);
            g.lineTo(x + 42, 112);
            g.lineTo(x + 48, 112);
            g.lineTo(x + 48, 118);
            g.closePath();
            g.fillPath();
        }
    }

    // Guirnalda de luces (skin navideña)
    dibujarGuirnalda(g) {
        const colores = [0xff5252, 0xffd700, 0x00e5ff, 0x69f0ae];
        const largo = 128;
        let indice = 0;
        g.lineStyle(3, 0x1e7a3c, 1);
        for (let x0 = 0; x0 < TIENDA_ANCHO; x0 += largo) {
            g.beginPath();
            for (let paso = 0; paso <= 16; paso++) {
                const t = paso / 16;
                const px = x0 + t * largo;
                const py = 98 + Math.sin(Math.PI * t) * 16;
                if (paso === 0) {
                    g.moveTo(px, py);
                } else {
                    g.lineTo(px, py);
                }
            }
            g.strokePath();
        }
        for (let x0 = 0; x0 < TIENDA_ANCHO; x0 += largo) {
            [0.125, 0.375, 0.625, 0.875].forEach((t) => {
                const px = x0 + t * largo;
                const py = 98 + Math.sin(Math.PI * t) * 16 + 5;
                const color = colores[indice % colores.length];
                indice++;
                g.fillStyle(color, 0.25).fillCircle(px, py, 9);
                g.fillStyle(color, 1).fillCircle(px, py, 4);
            });
        }
    }

    // =============================================================
    // ENCABEZADO: botón volver y pestañas de las salas
    // =============================================================
    crearCabecera() {
        const volver = window.crearBotonEstilo(this, 40, 58, Idioma.t("comun.volver"), {
            tam: 22,
            origen: [0, 0.5],
            relleno: { x: 22, y: 8 },
            escalaHover: 1.06,
            profundidad: 30
        });
        volver.on("pointerdown", () => this.volver());

        const claves = Object.keys(this.cfg.salas);
        const anchoTab = 340;
        const altoTab = 68;
        const hueco = 16;
        const total = claves.length * anchoTab + (claves.length - 1) * hueco;
        const inicio = TIENDA_ANCHO / 2 - total / 2;

        claves.forEach((clave, i) => {
            const sala = this.cfg.salas[clave];
            const x = inicio + i * (anchoTab + hueco);
            const y = 24;

            const fondo = this.add.graphics().setDepth(20);
            const nombre = this.txt(x + 20, y + altoTab / 2, Idioma.dato(sala.nombre), {
                fontSize: "20px",
                fontStyle: "bold"
            }).setOrigin(0, 0.5).setDepth(22);
            const saldo = this.txt(x + anchoTab - 18, y + altoTab / 2, "0", {
                fontSize: "28px",
                fontStyle: "bold",
                color: "#ffffff"
            }).setOrigin(1, 0.5).setDepth(22);
            const icono = this.iconoMoneda(x + anchoTab - 60, y + altoTab / 2, 30, sala).setDepth(22);
            const zona = this.add.zone(x + anchoTab / 2, y + altoTab / 2, anchoTab, altoTab)
                .setDepth(25)
                .setInteractive({ useHandCursor: true });
            zona.on("pointerdown", () => this.cambiarSala(clave));

            this.pestanas[clave] = { fondo, nombre, saldo, icono, x, y, w: anchoTab, h: altoTab };
        });
    }

    actualizarPestanas() {
        const est = this.est;
        Object.keys(this.pestanas).forEach((clave) => {
            const p = this.pestanas[clave];
            const sala = this.cfg.salas[clave];
            const activa = clave === this.claveSala;
            const radio = { tl: 14, tr: 14, bl: 0, br: 0 };

            p.fondo.clear();
            p.fondo.fillStyle(activa ? est.placa : est.paredA, activa ? 1 : 0.85);
            p.fondo.fillRoundedRect(p.x, p.y, p.w, p.h, radio);
            p.fondo.lineStyle(activa ? 3 : 1.5, est.marco, activa ? 1 : 0.45);
            p.fondo.strokeRoundedRect(p.x, p.y, p.w, p.h, radio);

            p.nombre.setColor(activa ? est.textoPlaca : est.textoTenue);
            p.saldo.setText(String(Progreso.monedas(sala.moneda)));
            p.icono.x = p.saldo.x - p.saldo.width - 20;
        });
    }

    cambiarSala(clave) {
        if (this.modal || clave === this.claveSala) {
            return;
        }
        window.reproducirSonidoBoton(this);
        this.claveSala = clave;
        Tienda.ultimaSala = clave;
        this.pagina = 0;
        this.actualizarPestanas();
        this.dibujarSala();
    }

    cambiarPagina(dir) {
        if (this.modal) {
            return;
        }
        const sala = this.salaActual();
        const paginas = Math.max(1, Math.ceil(sala.items.length / TIENDA_POR_PAGINA));
        const nueva = this.pagina + dir;
        if (nueva < 0 || nueva >= paginas) {
            return;
        }
        this.pagina = nueva;
        this.dibujarSala();
    }

    volver() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("Inicio");
        });
    }

    // Refresca saldos y obras (después de comprar)
    refrescarTodo() {
        this.actualizarPestanas();
        this.dibujarSala();
    }

    // =============================================================
    // AVISO (mensaje que aparece un momento sobre el piso)
    // =============================================================
    crearAviso() {
        this.aviso = this.txt(TIENDA_ANCHO / 2, 592, "", {
            fontSize: "20px",
            fontStyle: "italic bold",
            color: "#ffffff",
            align: "center",
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            padding: { left: 16, right: 16, top: 8, bottom: 8 },
            wordWrap: { width: 900 }
        }).setOrigin(0.5).setDepth(300).setAlpha(0);
    }

    mostrarAviso(texto) {
        this.aviso.setText(texto);
        this.tweens.killTweensOf(this.aviso);
        this.aviso.setAlpha(1);
        this.tweens.add({
            targets: this.aviso,
            alpha: 0,
            delay: 2600,
            duration: 500
        });
    }

    // =============================================================
    // LA SALA ACTUAL (rótulo, obras, flechas y pie)
    // =============================================================
    dibujarSala() {
        this.limpiarSala();
        const est = this.est;
        const sala = this.salaActual();
        const total = sala.items.length;
        const paginas = Math.max(1, Math.ceil(total / TIENDA_POR_PAGINA));
        this.pagina = Phaser.Math.Clamp(this.pagina, 0, paginas - 1);
        const desde = this.pagina * TIENDA_POR_PAGINA;
        const items = sala.items.slice(desde, desde + TIENDA_POR_PAGINA);

        // Rótulo de la sala
        this.reg(this.txt(TIENDA_ANCHO / 2, 152, Idioma.dato(sala.subtitulo), {
            fontSize: "20px",
            fontStyle: "italic",
            color: est.textoTenue
        })).setOrigin(0.5).setDepth(5);

        // Obras (centradas según cuántas haya en esta página)
        items.forEach((item, i) => {
            const x = TIENDA_ANCHO / 2 + (i - (items.length - 1) / 2) * TIENDA_SEPARACION;
            this.crearObra(sala, item, x);
        });

        // Flechas de página
        if (paginas > 1) {
            [[-1, 62, "◀"], [1, TIENDA_ANCHO - 62, "▶"]].forEach((def) => {
                const dir = def[0];
                const activa = this.pagina + dir >= 0 && this.pagina + dir < paginas;
                const flecha = this.reg(this.txt(def[1], TIENDA_OBRA.Y, def[2], {
                    fontSize: "44px",
                    color: est.textoPlaca
                })).setOrigin(0.5).setDepth(20).setAlpha(activa ? 1 : 0.25);
                if (activa) {
                    flecha.setInteractive({ useHandCursor: true });
                    flecha.on("pointerover", () => flecha.setScale(1.15));
                    flecha.on("pointerout", () => flecha.setScale(1));
                    flecha.on("pointerdown", () => {
                        window.reproducirSonidoBoton(this);
                        this.cambiarPagina(dir);
                    });
                }
            });
            this.reg(this.txt(TIENDA_ANCHO / 2, 660, (this.pagina + 1) + " / " + paginas, {
                fontSize: "20px",
                fontStyle: "bold",
                color: est.textoPlaca
            })).setOrigin(0.5).setDepth(20);
        }

        // Pie: colección y pista
        let compradas = 0;
        sala.items.forEach((item) => {
            if (Progreso.comprado(item.id)) {
                compradas++;
            }
        });
        this.reg(this.txt(60, 660, Idioma.t("tienda.coleccion", { a: compradas, b: total }), {
            fontSize: "20px",
            fontStyle: "bold",
            color: est.textoPlaca
        })).setOrigin(0, 0.5).setDepth(20);
        this.reg(this.txt(TIENDA_ANCHO - 60, 660, Idioma.t(sala.items.some((i) => this.esSkin(i)) ? "tienda.clicSkin" : "tienda.clic"), {
            fontSize: "18px",
            fontStyle: "italic",
            color: est.textoTenue
        })).setOrigin(1, 0.5).setDepth(20);
    }

    // =============================================================
    // UNA OBRA: foco, marco, imagen y placa
    // =============================================================
    crearObra(sala, item, x) {
        const est = this.est;
        const { W, H, BORDE, PASPARTU, Y } = TIENDA_OBRA;
        const estado = this.estadoObra(item);
        const X0 = x - W / 2;
        const Y0 = Y - H / 2;
        const luzBase = estado === "bloqueado" ? 0 : (estado === "disponible" ? 0.7 : 1);

        // --- Foco del techo (apagado si la obra está bloqueada) ---
        const luz = this.reg(this.add.graphics()).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
        luz.fillStyle(est.luz, 0.05);
        this.trapecio(luz, x, 128, 12, 480, 175);
        luz.fillStyle(est.luz, 0.06);
        this.trapecio(luz, x, 128, 8, 470, 125);
        luz.setAlpha(luzBase);

        const lampara = this.reg(this.add.graphics()).setDepth(2);
        lampara.fillStyle(0x1a1a1a, 1).fillRoundedRect(x - 16, 120, 32, 10, 3);
        lampara.fillStyle(est.luz, estado === "bloqueado" ? 0.25 : 1).fillRect(x - 10, 129, 20, 3);

        // --- Marco ---
        const g = this.reg(this.add.graphics()).setDepth(2);
        g.fillStyle(0x000000, 0.35).fillRect(X0 + 8, Y0 + 10, W, H);
        g.fillStyle(est.marcoSombra, 1).fillRect(X0, Y0, W, H);
        g.fillStyle(est.marco, 1).fillRect(X0 + 3, Y0 + 3, W - 6, H - 6);
        g.fillStyle(est.marcoSombra, 1).fillRect(X0 + BORDE - 4, Y0 + BORDE - 4, W - 2 * (BORDE - 4), H - 2 * (BORDE - 4));
        g.fillStyle(est.paspartu, 1).fillRect(X0 + BORDE, Y0 + BORDE, W - 2 * BORDE, H - 2 * BORDE);
        const PX = X0 + BORDE + PASPARTU;
        const PY = Y0 + BORDE + PASPARTU;
        const PW = W - 2 * (BORDE + PASPARTU);
        const PH = H - 2 * (BORDE + PASPARTU);
        g.fillStyle(0x0a0a0a, 1).fillRect(PX, PY, PW, PH);
        g.lineStyle(2, 0x000000, 0.45).strokeRect(PX, PY, PW, PH);

        // --- Contenido del marco ---
        let candado = null;
        if (estado === "bloqueado") {
            this.reg(this.add.rectangle(x, Y, W, H, 0x000000, 0.5)).setDepth(4);
            candado = this.dibujarCandado(x, Y - 10);
            this.reg(this.txt(x, Y + 50, Idioma.t("tienda.proximamente"), {
                fontSize: "16px",
                fontStyle: "italic",
                color: est.textoTenue
            })).setOrigin(0.5).setDepth(5);
        } else if (this.esSkin(item)) {
            this.dibujarVistaSkin(item, x, PY + PH / 2 - 8, PW, PH - 24, 3, (o) => this.reg(o));
            if (item.habilidad) {
                this.reg(this.txt(x, PY + PH - 16, "★ " + Idioma.dato(item.habilidad.nombre), {
                    fontSize: "13px",
                    fontStyle: "bold",
                    color: est.acento,
                    align: "center",
                    wordWrap: { width: PW - 8 }
                })).setOrigin(0.5).setDepth(5);
            }
        } else {
            const clave = this.claveImagen(item.id);
            if (this.textures.exists(clave)) {
                const img = this.reg(this.add.image(x, PY + PH / 2, clave)).setDepth(3);
                img.setScale(Math.min(PW / img.width, PH / img.height));
                if (estado === "disponible") {
                    img.setTint(0x3a3a3a);
                }
            } else {
                this.reg(this.txt(x, Y, Idioma.t("tienda.imagenNo"), {
                    fontSize: "16px",
                    fontStyle: "italic",
                    color: est.textoTenue,
                    align: "center"
                })).setOrigin(0.5).setDepth(3);
            }
        }

        // --- Placa ---
        const py = TIENDA_PLACA.Y;
        const placa = this.reg(this.add.graphics()).setDepth(3);
        placa.fillStyle(0x000000, 0.35).fillRect(x - TIENDA_PLACA.W / 2 + 4, py - TIENDA_PLACA.H / 2 + 5, TIENDA_PLACA.W, TIENDA_PLACA.H);
        placa.fillStyle(est.placa, 1).fillRect(x - TIENDA_PLACA.W / 2, py - TIENDA_PLACA.H / 2, TIENDA_PLACA.W, TIENDA_PLACA.H);
        placa.lineStyle(2, est.marco, estado === "bloqueado" ? 0.4 : 0.9);
        placa.strokeRect(x - TIENDA_PLACA.W / 2, py - TIENDA_PLACA.H / 2, TIENDA_PLACA.W, TIENDA_PLACA.H);

        this.reg(this.txt(x, py - 16, Idioma.dato(item.titulo), {
            fontSize: "15px",
            fontStyle: "bold",
            color: estado === "bloqueado" ? est.textoTenue : est.textoPlaca,
            align: "center",
            wordWrap: { width: TIENDA_PLACA.W - 20 },
            maxLines: 2
        })).setOrigin(0.5).setDepth(4);

        if (estado === "comprado") {
            this.reg(this.txt(x, py + 20, this.textoEstadoComprado(item), {
                fontSize: "16px",
                fontStyle: "bold",
                color: est.acento
            })).setOrigin(0.5).setDepth(4);
        } else {
            const alcanza = Progreso.monedas(sala.moneda) >= item.precio;
            let colorPrecio = est.textoPlaca;
            if (estado === "bloqueado") {
                colorPrecio = est.textoTenue;
            } else if (!alcanza) {
                colorPrecio = est.sinSaldo;
            }
            const precio = this.reg(this.txt(0, py + 20, String(item.precio), {
                fontSize: "20px",
                fontStyle: "bold",
                color: colorPrecio
            })).setOrigin(0, 0.5).setDepth(4);
            const icono = this.reg(this.iconoMoneda(0, py + 20, 22, sala)).setDepth(4);
            if (estado === "bloqueado") {
                icono.setAlpha(0.5);
            }
            const ancho = 22 + 6 + precio.width;
            icono.x = x - ancho / 2 + 11;
            precio.x = x - ancho / 2 + 28;
        }

        // --- Zona de clic (obra + placa) ---
        const arriba = Y0;
        const abajo = py + TIENDA_PLACA.H / 2;
        const zona = this.reg(this.add.zone(x, (arriba + abajo) / 2, W, abajo - arriba))
            .setDepth(10)
            .setInteractive({ useHandCursor: true });
        zona.on("pointerover", () => {
            if (estado !== "bloqueado") {
                this.animarLuz(luz, Math.min(1, luzBase + 0.3));
            }
        });
        zona.on("pointerout", () => this.animarLuz(luz, luzBase));
        zona.on("pointerdown", () => this.alClicObra(sala, item, estado, candado));
    }

    animarLuz(luz, alfa) {
        if (!luz || !luz.scene) {
            return;
        }
        this.tweens.killTweensOf(luz);
        this.tweens.add({ targets: luz, alpha: alfa, duration: 160 });
    }

    dibujarCandado(x, y) {
        const c = this.est.marco;
        const g = this.reg(this.add.graphics()).setDepth(5);
        g.lineStyle(7, c, 0.9);
        g.beginPath();
        g.arc(x, y - 22, 14, Math.PI, Math.PI * 2, false);
        g.strokePath();
        g.lineBetween(x - 14, y - 22, x - 14, y - 12);
        g.lineBetween(x + 14, y - 22, x + 14, y - 12);
        g.fillStyle(c, 0.9).fillRoundedRect(x - 24, y - 14, 48, 38, 7);
        g.fillStyle(0x000000, 0.75).fillCircle(x, y + 1, 5);
        g.fillRect(x - 2, y + 2, 4, 11);
        return g;
    }

    alClicObra(sala, item, estado, candado) {
        if (this.modal) {
            return;
        }
        window.reproducirSonidoBoton(this);
        if (estado === "bloqueado") {
            this.mostrarAviso(Idioma.t("tienda.noDisponible", { moneda: Idioma.moneda(sala.moneda) }));
            if (candado && candado.scene) {
                this.tweens.killTweensOf(candado);
                candado.x = 0;
                this.tweens.add({
                    targets: candado,
                    x: 5,
                    duration: 45,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        if (candado.scene) {
                            candado.x = 0;
                        }
                    }
                });
            }
        } else if (estado === "disponible") {
            this.abrirCompra(sala, item);
        } else if (this.esSkin(item)) {
            this.abrirSkin(sala, item, false);
        } else {
            this.abrirVisor(item, false);
        }
    }

    // =============================================================
    // VENTANAS (compra y visor). Todo lo que se crea aquí se destruye
    // junto al cerrar la ventana.
    // =============================================================
    abrirModal() {
        this.cerrarModal();
        this.modal = { objs: [] };
    }

    regM(obj) {
        this.modal.objs.push(obj);
        return obj;
    }

    cerrarModal() {
        if (!this.modal) {
            return;
        }
        this.modal.objs.forEach((obj) => {
            if (obj && obj.scene) {
                this.tweens.killTweensOf(obj);
                obj.destroy();
            }
        });
        this.modal = null;
    }

    botonModal(x, y, texto, colorFondo, activo, origenX) {
        const b = this.regM(this.txt(x, y, texto, {
            fontSize: "22px",
            fontStyle: "bold",
            color: activo ? "#ffffff" : "#b5b5b5",
            backgroundColor: colorFondo,
            padding: { left: 24, right: 24, top: 10, bottom: 10 },
            stroke: "#000000",
            strokeThickness: 3
        })).setOrigin(origenX, 0.5).setDepth(203);
        if (activo) {
            b.setInteractive({ useHandCursor: true });
            b.on("pointerover", () => b.setScale(1.06));
            b.on("pointerout", () => b.setScale(1));
        }
        return b;
    }

    // Fila "Etiqueta [icono] 123"
    filaMoneda(x, y, etiqueta, valor, sala, colorValor) {
        const est = this.est;
        this.regM(this.txt(x, y, etiqueta, {
            fontSize: "18px",
            color: est.textoTenue
        })).setOrigin(0, 0.5).setDepth(203);
        this.regM(this.iconoMoneda(x + 96, y, 26, sala)).setDepth(203);
        this.regM(this.txt(x + 118, y, String(valor), {
            fontSize: "28px",
            fontStyle: "bold",
            color: colorValor
        })).setOrigin(0, 0.5).setDepth(203);
    }

    // ---------------------------------------------------------------
    // VENTANA DE COMPRA
    // ---------------------------------------------------------------
    abrirCompra(sala, item) {
        const est = this.est;
        this.abrirModal();

        const saldo = Progreso.monedas(sala.moneda);
        const falta = Math.max(0, item.precio - saldo);

        // Fondo oscuro (clic afuera = cancelar)
        this.regM(this.add.rectangle(TIENDA_ANCHO / 2, TIENDA_ALTO / 2, TIENDA_ANCHO, TIENDA_ALTO, 0x000000, 0.75))
            .setDepth(200)
            .setInteractive()
            .on("pointerdown", () => this.cerrarModal());

        // Cartela
        const px = 270;
        const py = 140;
        const pw = 740;
        const ph = 440;
        const panel = this.regM(this.add.graphics()).setDepth(201);
        panel.fillStyle(0x000000, 0.5).fillRect(px + 8, py + 10, pw, ph);
        panel.fillStyle(est.placa, 1).fillRect(px, py, pw, ph);
        panel.lineStyle(4, est.marco, 1).strokeRect(px, py, pw, ph);
        panel.lineStyle(1.5, est.marco, 0.6).strokeRect(px + 10, py + 10, pw - 20, ph - 20);
        this.regM(this.add.zone(px + pw / 2, py + ph / 2, pw, ph)).setDepth(201).setInteractive();

        // Vista previa (en penumbra hasta que la compres)
        const cx = px + 150;
        const cy = py + ph / 2;
        const FW = 200;
        const FH = 290;
        const marco = this.regM(this.add.graphics()).setDepth(202);
        marco.fillStyle(est.marcoSombra, 1).fillRect(cx - FW / 2, cy - FH / 2, FW, FH);
        marco.fillStyle(est.marco, 1).fillRect(cx - FW / 2 + 3, cy - FH / 2 + 3, FW - 6, FH - 6);
        marco.fillStyle(est.paspartu, 1).fillRect(cx - FW / 2 + 8, cy - FH / 2 + 8, FW - 16, FH - 16);
        marco.fillStyle(0x0a0a0a, 1).fillRect(cx - FW / 2 + 16, cy - FH / 2 + 16, FW - 32, FH - 32);
        const clave = this.claveImagen(item.id);
        if (this.esSkin(item)) {
            this.dibujarVistaSkin(item, cx, cy, FW - 32, FH - 32, 203, (o) => this.regM(o));
        } else if (this.textures.exists(clave)) {
            const img = this.regM(this.add.image(cx, cy, clave)).setDepth(203);
            img.setScale(Math.min((FW - 32) / img.width, (FH - 32) / img.height));
            img.setTint(0x3a3a3a);
        }

        // Datos de la obra
        const rx = px + 300;
        const titulo = this.regM(this.txt(rx, py + 44, Idioma.dato(item.titulo), {
            fontSize: "28px",
            fontStyle: "bold",
            color: est.textoPlaca,
            wordWrap: { width: 400 }
        })).setOrigin(0, 0).setDepth(203);
        const detalle = this.regM(this.txt(rx, py + 44 + titulo.height + 14, Idioma.dato(item.detalle), {
            fontSize: "18px",
            fontStyle: "italic",
            color: est.textoClaro,
            wordWrap: { width: 400 },
            lineSpacing: 4
        })).setOrigin(0, 0).setDepth(203);
        if (this.esSkin(item)) {
            this.textoHabilidad(item, rx, detalle.y + detalle.height + 12, 400);
        }

        panel.lineStyle(1.5, est.marco, 0.5).lineBetween(rx, py + 250, px + pw - 40, py + 250);
        this.filaMoneda(rx, py + 285, Idioma.t("tienda.precio"), item.precio, sala, est.textoPlaca);
        this.filaMoneda(rx, py + 330, Idioma.t("tienda.tienes"), saldo, sala, falta > 0 ? est.sinSaldo : est.acento);

        // Botones
        const yBotones = py + ph - 60;
        const textoComprar = falta > 0 ? Idioma.t("tienda.faltan", { n: falta }) : Idioma.t("tienda.comprar");
        const btnComprar = this.botonModal(rx, yBotones, textoComprar, falta > 0 ? "#444444" : est.botonFondo, falta === 0, 0);
        if (falta === 0) {
            btnComprar.on("pointerdown", () => this.confirmarCompra(sala, item));
        }
        const btnCancelar = this.botonModal(px + pw - 40, yBotones, Idioma.t("tienda.cancelar"), "#222222", true, 1);
        btnCancelar.on("pointerdown", () => {
            window.reproducirSonidoBoton(this);
            this.cerrarModal();
        });
    }

    confirmarCompra(sala, item) {
        const resultado = Progreso.comprar(item.id, sala.moneda, item.precio);
        this.cerrarModal();
        if (resultado !== "ok") {
            this.mostrarAviso(resultado === "sin_saldo" ? Idioma.t("tienda.sinSaldo", { moneda: Idioma.moneda(sala.moneda) }) : Idioma.t("tienda.yaEsTuya"));
            this.refrescarTodo();
            return;
        }
        if (sala.sonido && this.cache.audio.exists(sala.sonido)) {
            this.sound.play(sala.sonido);
        }
        this.cameras.main.flash(300, 255, 235, 170);
        this.refrescarTodo();
        if (this.esSkin(item)) {
            this.abrirSkin(sala, item, true);
        } else {
            this.abrirVisor(item, true);
        }
    }

    // ---------------------------------------------------------------
    // VENTANA DE SKIN: ver, equipar o quitar una skin ya comprada
    // ---------------------------------------------------------------
    abrirSkin(sala, item, nueva) {
        const est = this.est;
        this.abrirModal();
        const equipada = Progreso.estaEquipada(item.id);

        this.regM(this.add.rectangle(TIENDA_ANCHO / 2, TIENDA_ALTO / 2, TIENDA_ANCHO, TIENDA_ALTO, 0x000000, 0.75))
            .setDepth(200)
            .setInteractive()
            .on("pointerdown", () => this.cerrarModal());

        const px = 270;
        const py = 140;
        const pw = 740;
        const ph = 440;
        const panel = this.regM(this.add.graphics()).setDepth(201);
        panel.fillStyle(0x000000, 0.5).fillRect(px + 8, py + 10, pw, ph);
        panel.fillStyle(est.placa, 1).fillRect(px, py, pw, ph);
        panel.lineStyle(4, est.marco, 1).strokeRect(px, py, pw, ph);
        panel.lineStyle(1.5, est.marco, 0.6).strokeRect(px + 10, py + 10, pw - 20, ph - 20);
        this.regM(this.add.zone(px + pw / 2, py + ph / 2, pw, ph)).setDepth(201).setInteractive();

        if (nueva) {
            this.regM(this.txt(TIENDA_ANCHO / 2, py - 26, Idioma.t("tienda.nuevaSkin"), {
                fontSize: "24px",
                fontStyle: "bold",
                color: est.acento
            })).setOrigin(0.5).setDepth(203);
        }

        // Vista previa pintada
        const cx = px + 150;
        const cy = py + ph / 2;
        const FW = 200;
        const FH = 290;
        const marco = this.regM(this.add.graphics()).setDepth(202);
        marco.fillStyle(est.marcoSombra, 1).fillRect(cx - FW / 2, cy - FH / 2, FW, FH);
        marco.fillStyle(est.marco, 1).fillRect(cx - FW / 2 + 3, cy - FH / 2 + 3, FW - 6, FH - 6);
        marco.fillStyle(est.paspartu, 1).fillRect(cx - FW / 2 + 8, cy - FH / 2 + 8, FW - 16, FH - 16);
        marco.fillStyle(0x0a0a0a, 1).fillRect(cx - FW / 2 + 16, cy - FH / 2 + 16, FW - 32, FH - 32);
        this.dibujarVistaSkin(item, cx, cy, FW - 32, FH - 32, 203, (o) => this.regM(o));

        // Datos
        const rx = px + 300;
        const titulo = this.regM(this.txt(rx, py + 44, Idioma.dato(item.titulo), {
            fontSize: "28px",
            fontStyle: "bold",
            color: est.textoPlaca,
            wordWrap: { width: 400 }
        })).setOrigin(0, 0).setDepth(203);
        const detalle = this.regM(this.txt(rx, py + 44 + titulo.height + 14, Idioma.dato(item.detalle), {
            fontSize: "18px",
            fontStyle: "italic",
            color: est.textoClaro,
            wordWrap: { width: 400 },
            lineSpacing: 4
        })).setOrigin(0, 0).setDepth(203);
        this.textoHabilidad(item, rx, detalle.y + detalle.height + 12, 400);

        this.regM(this.txt(rx, py + 300, equipada ? Idioma.t("tienda.equipada") : Idioma.t("tienda.adquirida"), {
            fontSize: "22px",
            fontStyle: "bold",
            color: est.acento
        })).setOrigin(0, 0.5).setDepth(203);

        // Botones
        const yBotones = py + ph - 60;
        const textoBoton = equipada ? Idioma.t("tienda.quitar") : Idioma.t("tienda.equipar");
        const colorBoton = equipada ? "#7a2222" : est.botonFondo;
        const btn = this.botonModal(rx, yBotones, textoBoton, colorBoton, true, 0);
        btn.on("pointerdown", () => {
            window.reproducirSonidoBoton(this);
            if (equipada) {
                Progreso.desequipar(item.categoria);
                this.mostrarAviso(Idioma.t("tienda.skinQuitada"));
            } else {
                Progreso.equipar(item.categoria, item.id);
                this.mostrarAviso(Idioma.t("tienda.skinPuesta", { n: Idioma.dato(item.titulo) }));
            }
            this.cerrarModal();
            this.refrescarTodo();
        });
        const btnCerrar = this.botonModal(px + pw - 40, yBotones, Idioma.t("tienda.cancelar"), "#222222", true, 1);
        btnCerrar.on("pointerdown", () => {
            window.reproducirSonidoBoton(this);
            this.cerrarModal();
        });
    }

    // ---------------------------------------------------------------
    // VISOR: la obra en grande (clic o ESC para cerrar)
    // ---------------------------------------------------------------
    abrirVisor(item, nueva) {
        const est = this.est;
        this.abrirModal();

        this.regM(this.add.rectangle(TIENDA_ANCHO / 2, TIENDA_ALTO / 2, TIENDA_ANCHO, TIENDA_ALTO, 0x000000, 0.9))
            .setDepth(200)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.cerrarModal());

        const cx = TIENDA_ANCHO / 2;
        const cy = 335;
        const clave = this.claveImagen(item.id);
        if (this.textures.exists(clave)) {
            const img = this.regM(this.add.image(cx, cy, clave)).setDepth(202);
            img.setScale(Math.min(920 / img.width, 460 / img.height, 1.6));
            const w = img.displayWidth;
            const h = img.displayHeight;
            const m = this.regM(this.add.graphics()).setDepth(201);
            m.fillStyle(0x000000, 0.5).fillRect(cx - w / 2 - 4, cy - h / 2 - 2, w + 24, h + 24);
            m.fillStyle(est.marcoSombra, 1).fillRect(cx - w / 2 - 12, cy - h / 2 - 12, w + 24, h + 24);
            m.fillStyle(est.marco, 1).fillRect(cx - w / 2 - 9, cy - h / 2 - 9, w + 18, h + 18);
            m.fillStyle(est.marcoSombra, 1).fillRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8);
        } else {
            this.regM(this.txt(cx, cy, Idioma.t("tienda.imagenNo").replace("\n", " "), {
                fontSize: "24px",
                fontStyle: "italic",
                color: est.textoTenue
            })).setOrigin(0.5).setDepth(202);
        }

        if (nueva) {
            this.regM(this.txt(cx, 56, Idioma.t("tienda.nueva"), {
                fontSize: "24px",
                fontStyle: "bold",
                color: est.acento
            })).setOrigin(0.5).setDepth(203);
        }
        this.regM(this.txt(cx, 610, Idioma.dato(item.titulo), {
            fontSize: "28px",
            fontStyle: "italic bold",
            color: est.textoPlaca
        })).setOrigin(0.5).setDepth(203);
        this.regM(this.txt(cx, 648, Idioma.dato(item.detalle), {
            fontSize: "18px",
            color: est.textoClaro,
            align: "center",
            wordWrap: { width: 900 }
        })).setOrigin(0.5).setDepth(203);
        this.regM(this.txt(cx, 700, Idioma.t("tienda.cerrar"), {
            fontSize: "15px",
            color: est.textoTenue
        })).setOrigin(0.5).setDepth(203);
    }
}

// Última sala visitada (al volver a la tienda se abre en esa)
Tienda.ultimaSala = "plumas";