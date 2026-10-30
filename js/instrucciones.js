class Instrucciones extends Phaser.Scene {
    constructor() {
        super("Instrucciones");
    }

    create() {
        let ancho = this.scale.width;
        let alto = this.scale.height;
        let rutaSkin = window.carpetaSkin || "assets_normal/";
        let esNavidad = rutaSkin.includes("navidad");

        // Configuración dinámica de colores según la temática activa (Normal vs Navidad)
        this.colorTexto = esNavidad ? "#ff0000" : "#ff8800";
        this.colorStroke = esNavidad ? "#c5daf0" : "#fff676";
        this.colorPunto = esNavidad ? 0xff0000 : 0xff8800;

        // Estado de la escena (se reinicia cada vez que se entra)
        this.pagina = 0;
        this.contenedor = null;
        this.saliendo = false;

        // ==========================================
        // MOSTRAR CÁMARA
        // ==========================================
        this.mostrarCamaraInstrucciones();

        // Fondo de la escena
        this.add.image(ancho / 2, alto / 2, "menu_background")
            .setDisplaySize(ancho, alto);

        // ==========================================
        // MARCO LATERAL (LÍMITE VISUAL DEL ÁREA JUGABLE)
        // ==========================================
        this.graficosMarco = this.add.graphics();
        window.dibujarMarcoLateral(this.graficosMarco, ancho, alto, esNavidad);

        // Título principal centrado
        this.add.text(ancho / 2, alto * 0.07, Idioma.t("instr.titulo"), {
            fontSize: "44px",
            fill: "#ff7878",
            stroke: this.colorStroke,
            strokeThickness: 6,
            fontFamily: "Georgia, serif",
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5);

        // ---------------------------------------------------------
        // NAVEGACIÓN ENTRE PÁGINAS: [ANTERIOR]  ● ○ ○ ○ ○  [SIGUIENTE]
        // ---------------------------------------------------------
        const yNavegacion = alto * 0.81;
        const total = Instrucciones.PAGINAS.length;

        this.botonAnterior = window.crearBotonEstilo(this, ancho / 2 - 200, yNavegacion, Idioma.t("instr.anterior"), {
            tam: 24,
            origen: [0.5, 0.5],
            relleno: { x: 25, y: 8 },
            escalaHover: 1.1
        });
        this.botonAnterior.on("pointerdown", () => this.cambiarPagina(-1));

        this.botonSiguiente = window.crearBotonEstilo(this, ancho / 2 + 200, yNavegacion, Idioma.t("instr.siguiente"), {
            tam: 24,
            origen: [0.5, 0.5],
            relleno: { x: 25, y: 8 },
            escalaHover: 1.1
        });
        this.botonSiguiente.on("pointerdown", () => this.cambiarPagina(1));

        // Puntos indicadores de la página actual
        this.puntos = [];
        for (let i = 0; i < total; i++) {
            const punto = this.add.circle(ancho / 2 + (i - (total - 1) / 2) * 30, yNavegacion, 8, 0x555555)
                .setStrokeStyle(2, 0xffffff);
            this.puntos.push(punto);
        }

        // ---------------------------------------------------------
        // BOTÓN VOLVER
        // ---------------------------------------------------------
        let botonVolver = window.crearBotonEstilo(this, ancho / 2, alto * 0.91, Idioma.t("comun.volver"), {
            tam: 26,
            origen: [0.5, 0.5],
            relleno: { x: 35, y: 10 },
            escalaHover: 1.1
        });
        botonVolver.on("pointerdown", () => this.volverAlInicio());

        // Atajos de teclado: flechas para cambiar de página, ESC para volver
        if (this.input.keyboard) {
            this.input.keyboard.on("keydown-RIGHT", () => this.cambiarPagina(1));
            this.input.keyboard.on("keydown-LEFT", () => this.cambiarPagina(-1));
            this.input.keyboard.on("keydown-ESC", () => this.volverAlInicio());
        }

        // Primera página
        this.mostrarPagina(0);

        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    // ==========================================
    // VOLVER AL MENÚ
    // ==========================================
    volverAlInicio() {
        if (this.saliendo) {
            return;
        }
        this.saliendo = true;
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("Inicio");
        });
    }

    // ==========================================
    // CAMBIAR DE PÁGINA (delta: -1 anterior, +1 siguiente)
    // ==========================================
    cambiarPagina(delta) {
        const nueva = Phaser.Math.Clamp(this.pagina + delta, 0, Instrucciones.PAGINAS.length - 1);
        if (nueva === this.pagina) {
            return;
        }
        this.pagina = nueva;
        this.mostrarPagina(nueva);
    }

    // ==========================================
    // DIBUJAR UNA PÁGINA
    //   Todo se mete en un contenedor: al cambiar de página se destruye
    //   completo y, si el contenido no cabe en la pantalla, se encoge solo.
    // ==========================================
    mostrarPagina(indice) {
        const ancho = this.scale.width;
        const alto = this.scale.height;
        const pagina = Instrucciones.PAGINAS[indice];

        // Quita la página anterior (y detiene sus animaciones)
        if (this.contenedor) {
            this.tweens.killTweensOf(this.contenedor.list.concat(this.contenedor));
            this.contenedor.destroy();
        }
        const contenedor = this.add.container(0, 0);
        this.contenedor = contenedor;

        // Medidas que se adaptan al tamaño de la pantalla
        const tamIcono = Phaser.Math.Clamp(Math.round(alto * 0.13), 64, 110);
        const tamTexto = Phaser.Math.Clamp(Math.round(alto * 0.037), 20, 30);
        const anchoFila = Math.min(ancho - 100, 1000);
        const anchoColumnaIconos = tamIcono * 2 + 24;
        const margenTexto = 24;
        const separacion = 22;

        const estiloTexto = {
            fontSize: tamTexto + "px",
            fill: this.colorTexto,
            stroke: this.colorStroke,
            strokeThickness: 5,
            fontStyle: "bold",
            fontFamily: "Georgia, serif"
        };

        let y = 0;

        // Subtítulo de la página
        const subtitulo = this.add.text(0, y, Idioma.t(pagina.titulo), {
            fontSize: Math.round(tamTexto * 1.25) + "px",
            fill: "#ff7878",
            stroke: this.colorStroke,
            strokeThickness: 6,
            fontStyle: "bold",
            fontFamily: "Georgia, serif",
            align: "center"
        }).setOrigin(0.5, 0);
        contenedor.add(subtitulo);
        y += subtitulo.height + separacion;

        // Filas: iconos a la izquierda y texto a la derecha
        pagina.filas.forEach((fila) => {
            const texto = Idioma.t(fila.texto);
            const tieneIconos = fila.iconos && fila.iconos.length > 0;
            let altoFila;

            if (!tieneIconos) {
                // Nota sin iconos: texto centrado y un poco más chico
                const nota = this.add.text(0, y, texto, Object.assign({}, estiloTexto, {
                    fontSize: Math.round(tamTexto * 0.9) + "px",
                    align: "center",
                    wordWrap: { width: anchoFila }
                })).setOrigin(0.5, 0);
                contenedor.add(nota);
                altoFila = nota.height;
            } else {
                const xTexto = -anchoFila / 2 + anchoColumnaIconos + margenTexto;
                const t = this.add.text(xTexto, 0, texto, Object.assign({}, estiloTexto, {
                    align: "left",
                    wordWrap: { width: anchoFila - anchoColumnaIconos - margenTexto }
                })).setOrigin(0, 0.5);
                altoFila = Math.max(t.height, tamIcono);
                const centroY = y + altoFila / 2;
                t.y = centroY;
                contenedor.add(t);
                this.crearIconosFila(contenedor, fila, -anchoFila / 2 + anchoColumnaIconos / 2, centroY, tamIcono);
            }
            y += altoFila + separacion;
        });

        // Si no cabe en la zona libre, se encoge; siempre se alinea arriba
        const altoTotal = Math.max(1, y - separacion);
        const zonaArriba = alto * 0.14;
        const zonaLibre = alto * 0.62;
        contenedor.setScale(Math.min(1, zonaLibre / altoTotal));
        contenedor.setPosition(ancho / 2, zonaArriba);

        // Aparece suavemente
        contenedor.setAlpha(0);
        this.tweens.add({
            targets: contenedor,
            alpha: 1,
            duration: 250
        });

        this.actualizarNavegacion();
    }

    // ==========================================
    // ICONOS DE UNA FILA (centrados en cx, centroY)
    // ==========================================
    crearIconosFila(contenedor, fila, cx, centroY, tam) {
        const claves = fila.iconos;
        const paso = tam + 8;
        claves.forEach((clave, i) => {
            const x = cx + (i - (claves.length - 1) / 2) * paso;
            const objetos = this.crearIcono(clave, x, centroY, tam);
            objetos.forEach((objeto) => {
                contenedor.add(objeto);
                if (fila.anim) {
                    this.animarIcono(objeto, fila.anim);
                }
            });
        });
    }

    // Crea la imagen ajustada a "tam" px. "jugador1_punto" = personaje + punto rojo guía.
    crearIcono(clave, x, y, tam) {
        const conPunto = clave === "jugador1_punto";
        const imagen = this.add.image(x, y, conPunto ? "jugador1" : clave);
        imagen.setScale(Math.min(tam / imagen.width, tam / imagen.height));
        const objetos = [imagen];
        if (conPunto) {
            // Igual que el punto del juego: rojo con borde blanco
            objetos.push(this.add.circle(x, y, 8, 0xff0000).setStrokeStyle(2, 0xffffff));
        }
        return objetos;
    }

    // Animaciones sencillas de los iconos
    //   mover: va de izquierda a derecha   apagar: parpadea (se apaga)
    //   pulso: late (crece y se encoge)    girar:  da vueltas
    animarIcono(objeto, tipo) {
        const base = {
            targets: objeto,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            duration: 900
        };
        if (tipo === "mover") {
            objeto.x -= 30;
            this.tweens.add(Object.assign(base, { x: objeto.x + 60, duration: 1000 }));
        } else if (tipo === "apagar") {
            this.tweens.add(Object.assign(base, { alpha: 0.15 }));
        } else if (tipo === "pulso") {
            this.tweens.add(Object.assign(base, { scale: objeto.scale * 1.25, duration: 700 }));
        } else if (tipo === "girar") {
            this.tweens.add({
                targets: objeto,
                angle: 360,
                duration: 3500,
                repeat: -1,
                ease: "Linear"
            });
        }
    }

    // ==========================================
    // BOTONES Y PUNTOS SEGÚN LA PÁGINA ACTUAL
    // ==========================================
    actualizarNavegacion() {
        const total = Instrucciones.PAGINAS.length;
        this.botonAnterior.setVisible(this.pagina > 0);
        this.botonSiguiente.setVisible(this.pagina < total - 1);
        this.puntos.forEach((punto, i) => {
            if (i === this.pagina) {
                punto.setFillStyle(this.colorPunto, 1);
            } else {
                punto.setFillStyle(0x555555, 0.6);
            }
        });
    }

    // ==========================================
    // MOSTRAR CÁMARA EN INSTRUCCIONES
    // ==========================================
    mostrarCamaraInstrucciones() {
        // Con la cámara apagada en AJUSTES no hay video que mostrar
        if (!Controles.usaCamara()) {
            return;
        }
        // ==========================================
        // USAR EL MISMO VIDEO GLOBAL
        // ==========================================
        let video = window.camaraVideo;

        // ==========================================
        // SI TODAVÍA NO ESTÁ CREADO, ESPERAMOS A QUE INICIO LO CREE
        // ==========================================
        if (!video) {
            let intentos = 0;
            const comprobar = () => {
                intentos++;
                video = window.camaraVideo;

                if (video) {
                    this.configurarVistaCamara(video);
                    return;
                }

                if (intentos >= 100) {
                    return;
                }

                setTimeout(comprobar, 100);
            };

            comprobar();
            return;
        }

        this.configurarVistaCamara(video);
    }

    // ==========================================
    // CONFIGURAR RECUADRO DE CÁMARA
    // ==========================================
    configurarVistaCamara(video) {
        if (!video) return;

        video.style.position = "fixed";
        video.style.bottom = "10px";
        video.style.right = "10px";
        video.style.width = "320px";
        video.style.height = "180px";
        video.style.objectFit = "cover";
        video.style.opacity = "1";
        video.style.visibility = "visible";
        video.style.display = "block";
        video.style.zIndex = "9999";
        video.style.border = "2px solid #ffffff"; // Marco blanco
        video.style.borderRadius = "8px";
        video.style.transform = "scaleX(-1)";
        video.style.pointerEvents = "none";
    }
}

// =====================================================================
// CONTENIDO DE LAS INSTRUCCIONES
// =====================================================================
Instrucciones.PAGINAS = [
    {
        titulo: "instr.p1.titulo",
        filas: [
            { iconos: ["jugador1"], anim: "mover", texto: "instr.p1.mover" },
            { iconos: ["jugador1_punto"], texto: "instr.p1.punto" },
            { iconos: [], texto: "instr.p1.ajuste" },
            { iconos: [], texto: "instr.p1.teclado" }
        ]
    },
    {
        titulo: "instr.p2.titulo",
        filas: [
            { iconos: ["enemigo_1", "enemigo_2"], anim: "girar", texto: "instr.p2.enemigos" },
            { iconos: ["jugador1"], anim: "apagar", texto: "instr.p2.luz" },
            { iconos: ["ItemPlu"], anim: "pulso", texto: "instr.p2.plumas" }
        ]
    },
    {
        titulo: "instr.p3.titulo",
        filas: [
            { iconos: ["ItemGem"], anim: "girar", texto: "instr.p3.jades" },
            { iconos: ["enemigo_1", "enemigo_2"], anim: "apagar", texto: "instr.p3.destruye" },
            { iconos: ["jugador1"], anim: "pulso", texto: "instr.p3.crece" }
        ]
    },
    {
        titulo: "instr.p4.titulo",
        filas: [
            { iconos: ["enemigo_1", "enemigo_2"], texto: "instr.p4.enemigos" },
            { iconos: ["boss2"], anim: "pulso", texto: "instr.p4.jefe" },
            { iconos: ["ItemPlu", "ItemGem"], texto: "instr.p4.items" }
        ]
    },
    {
        titulo: "instr.p5.titulo",
        filas: [
            { iconos: ["ItemPlu", "ItemGem"], anim: "pulso", texto: "instr.p5.guardar" },
            { iconos: [], texto: "instr.p5.tienda" }
        ]
    }
];