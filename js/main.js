const config = {
    type: Phaser.AUTO,
    // width y height se reemplazan al iniciar con el tamaño calculado en
    // window.calcularTamanoJuego() (ver más abajo: "TAMAÑO DE PANTALLA")
    width: 1280,
    height: 720,
    scale: {
        // FIT: el juego mantiene SIEMPRE el mismo tamaño interno y el navegador
        // lo estira o encoge para llenar la ventana. Así no importa la escala
        // de Windows (100%, 125%...) ni el zoom del navegador: se ve igual.
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    // Añadimos la lista de escenas
    scene: [Boot, Cinematica, Carga, Inicio, Instrucciones, Juego, Tienda, Ajustes, Pausa]
};

window.carpetaSkin = "";

// =====================================================================
// DIFICULTAD (se elige al pulsar JUGAR en el menú)
// =====================================================================
window.configDificultad = {
    facil: {
        enemigos: 0.65, items: 0.80, frecuencia: 0.90,
        boss: { preparacion: 2.2, ataque: 8, regreso: 7 }
    },
    normal: {
        enemigos: 1.15, items: 1.00, frecuencia: 1.15,
        boss: { preparacion: 1.6, ataque: 13, regreso: 11 }
    },
    dificil: {
        enemigos: 1.55, items: 1.30, frecuencia: 1.40,
        boss: { preparacion: 1.1, ataque: 17, regreso: 14 }
    }
};
window.dificultadActual = "normal";

// =====================================================================
// TAMAÑO DE LOS ELEMENTOS DEL JUEGO (en px, lado máximo del sprite)
// Pensado para video mapping: el jugador mide 130 px.
// Si al proyectar algo se ve chico o grande, cambia solo estos números.
// =====================================================================
window.configTamanos = {
    items: 80,          // pluma y jade
    enemigos: 110,      // enemigos recto / zigzag / perseguidor
    boss: 150,          // jefe skin normal (tamaño final tras la intro)
    bossNavidad: 175    // jefe navideño: su sprite es más ancho que alto, por eso necesita más
};

// =====================================================================
// CONFIGURACIÓN GLOBAL DEL MARCO LATERAL
// =====================================================================
window.configMarco = {
    porcentajeAncho: 0.16,
    anchoMinimo: 60,
    anchoMaximo: 240,
    colorMarco: 0xffffff,
    colorMarcoNavidad: 0xffffff,
    alphaMarco: 0,
    colorBorde: 0xffffff,
    colorBordeNavidad: 0xffffff,
    grosorBorde: 3,
    alphaBorde: 0
};

// =====================================================================
// CALCULAR EL ANCHO (EN PÍXELES) DEL MARCO SEGÚN EL ANCHO DE PANTALLA
// =====================================================================
window.calcularMargenMarco = function (anchoPantalla) {
    const cfg = window.configMarco;
    let margen = anchoPantalla * cfg.porcentajeAncho;
    margen = Phaser.Math.Clamp(margen, cfg.anchoMinimo, cfg.anchoMaximo);
    return margen;
};

// =====================================================================
// DIBUJAR EL MARCO LATERAL (IZQUIERDO Y DERECHO) SOBRE UN GRAPHICS
// =====================================================================
window.dibujarMarcoLateral = function (graphics, ancho, alto, esNavidad) {
    if (!graphics) return 0;

    const cfg = window.configMarco;
    const margen = window.calcularMargenMarco(ancho);
    const colorRelleno = esNavidad ? cfg.colorMarcoNavidad : cfg.colorMarco;
    const colorLinea = esNavidad ? cfg.colorBordeNavidad : cfg.colorBorde;

    graphics.clear();

    // --- Relleno del marco (franja izquierda y franja derecha) ---
    graphics.fillStyle(colorRelleno, cfg.alphaMarco);
    graphics.fillRect(0, 0, margen, alto);
    graphics.fillRect(ancho - margen, 0, margen, alto);

    // --- Línea que marca el límite exacto de la zona jugable ---
    graphics.lineStyle(cfg.grosorBorde, colorLinea, cfg.alphaBorde);
    graphics.beginPath();
    graphics.moveTo(margen, 0);
    graphics.lineTo(margen, alto);
    graphics.moveTo(ancho - margen, 0);
    graphics.lineTo(ancho - margen, alto);
    graphics.strokePath();

    return margen;
};

// =====================================================================
// BOTONES DE TEXTO CON ESTILO
// =====================================================================
window.configBotones = {
    fuente: "Georgia, serif",
    escalaHover: 1.07,
    sonidoVolumen: 0.6,          // volumen del clic de los botones (0 a 1)

    // Skin normal (Kukulcán): degradado rojizo a naranja, contorno amarillo brillante
    normal: {
        relleno: ["#ff2a1a", "#ff9a1a"],
        contorno: "#ffe600",
        brillo: "#ffd400",
        grosor: 3,
        blur: 9,
        hover: {
            relleno: ["#ff5a3d", "#ffc23d"],
            contorno: "#fff36b",
            brillo: "#ffee58",
            blur: 16
        }
    },

    // Skin navideña: rojo fuerte con contorno blanco
    navidad: {
        relleno: ["#e00000"],
        contorno: "#ffffff",
        brillo: "#ffffff",
        grosor: 3,
        blur: 7,
        hover: {
            relleno: ["#ff2222"],
            contorno: "#ffffff",
            brillo: "#ffffff",
            blur: 14
        }
    }
};

// =====================================================================
// SONIDO DE LOS BOTONES
// =====================================================================
window.reproducirSonidoBoton = function (escena) {
    if (!escena || !escena.sound || !escena.cache || !escena.cache.audio.exists("sonido_boton")) {
        return;
    }
    escena.sound.play("sonido_boton", { volume: window.configBotones.sonidoVolumen });
};

// =====================================================================
// CREAR UN BOTÓN DE TEXTO CON ESTILO
// =====================================================================
window.crearBotonEstilo = function (escena, x, y, texto, opciones) {
    const op = opciones || {};
    const cfg = window.configBotones;
    const skin = (window.carpetaSkin || "").includes("navidad") ? "navidad" : "normal";
    const est = cfg[skin];

    const R = 2;                                  // resolución del canvas
    const tam = op.tam || 24;
    const icono = op.icono || "";
    const rel = op.relleno || { x: 18, y: 10 };
    const origen = op.origen || [0.5, 0.5];

    const claveBase = "btn_" + skin + "_" + tam + "_" + icono + "_" + texto;
    const claveNormal = claveBase + "_n";
    const claveHover = claveBase + "_h";

    // --- Medidas ---
    const fuenteTexto = "bold " + (tam * R) + "px " + cfg.fuente;
    const fuenteIcono = (tam * R) + "px \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif";
    const medidor = document.createElement("canvas").getContext("2d");
    medidor.font = fuenteTexto;
    const anchoTexto = medidor.measureText(texto).width;
    let anchoIcono = 0;
    let hueco = 0;
    if (icono) {
        medidor.font = fuenteIcono;
        anchoIcono = medidor.measureText(icono).width;
        hueco = tam * 0.35 * R;
    }

    const grosor = est.grosor * R;
    const capH = tam * R * 0.7;                   // altura de las mayúsculas
    const margenBrillo = Math.max(est.blur, est.hover.blur) * R + grosor;
    const padX = Math.max(rel.x * R, margenBrillo);
    const padY = Math.max(rel.y * R, margenBrillo);
    const anchoContenido = anchoIcono + hueco + anchoTexto;
    const altoLinea = tam * R * 1.25;
    const w = Math.ceil(anchoContenido + padX * 2);
    const h = Math.ceil(altoLinea + padY * 2);

    // --- Dibujo de una variante (normal o hover) ---
    const dibujar = function (clave, v) {
        const lienzo = escena.textures.createCanvas(clave, w, h);
        const ctx = lienzo.getContext();
        ctx.clearRect(0, 0, w, h);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;

        const baseY = h / 2 + capH / 2;
        let cursorX = padX;

        // Icono (emoji): sin contorno, solo un halo suave
        if (icono) {
            ctx.font = fuenteIcono;
            ctx.shadowColor = v.brillo;
            ctx.shadowBlur = v.blur * R * 0.6;
            ctx.fillStyle = "#ffffff";
            ctx.fillText(icono, cursorX, baseY);
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            cursorX += anchoIcono + hueco;
        }

        ctx.font = fuenteTexto;

        // 1) Contorno con resplandor (dos pasadas para que el brillo se note)
        ctx.lineWidth = grosor * 2;               // la mitad queda tapada por el relleno
        ctx.strokeStyle = v.contorno;
        ctx.shadowColor = v.brillo;
        ctx.shadowBlur = v.blur * R;
        ctx.strokeText(texto, cursorX, baseY);
        ctx.strokeText(texto, cursorX, baseY);

        // 2) Contorno nítido, sin sombra
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.strokeText(texto, cursorX, baseY);

        // 3) Relleno de las letras (degradado vertical si hay 2 o más colores)
        let relleno = v.relleno[0];
        if (v.relleno.length > 1) {
            const g = ctx.createLinearGradient(0, baseY - capH, 0, baseY);
            v.relleno.forEach(function (color, i) {
                g.addColorStop(i / (v.relleno.length - 1), color);
            });
            relleno = g;
        }
        ctx.fillStyle = relleno;
        ctx.fillText(texto, cursorX, baseY);

        lienzo.refresh();
    };

    if (!escena.textures.exists(claveNormal)) {
        dibujar(claveNormal, est);
    }
    if (!escena.textures.exists(claveHover)) {
        dibujar(claveHover, est.hover);
    }

    // --- El botón ---
    // Zona de clic = texto + margen (sin contar el resplandor)
    const extraX = padX - rel.x * R;
    const extraY = padY - rel.y * R;
    const anchoClic = w - extraX * 2;
    const altoClic = h - extraY * 2;

    const escalaBase = 1 / R;
    const escalaHover = escalaBase * (op.escalaHover || cfg.escalaHover);

    const boton = escena.add.image(x, y, claveNormal);
    // El origen se calcula sobre la zona de clic, para que el botón quede
    // en el mismo lugar que tenía cuando era un texto con recuadro
    boton.setOrigin((extraX + origen[0] * anchoClic) / w, (extraY + origen[1] * altoClic) / h);
    boton.setScale(escalaBase);
    if (op.profundidad !== undefined) {
        boton.setDepth(op.profundidad);
    }
    boton.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(extraX, extraY, anchoClic, altoClic),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
    });

    // Sonido al hacer clic (se registra primero, así suena antes de la acción del botón)
    if (op.sonido !== false) {
        boton.on("pointerdown", function () {
            window.reproducirSonidoBoton(escena);
        });
    }

    boton.on("pointerover", function () {
        boton.setTexture(claveHover);
        boton.setScale(escalaHover);
    });
    boton.on("pointerout", function () {
        boton.setTexture(claveNormal);
        boton.setScale(escalaBase);
    });

    return boton;
};

// =====================================================================
// TAMAÑO DE PANTALLA (para que el juego se vea igual con cualquier
// escala de Windows o zoom del navegador)
// =====================================================================
window.configPantalla = {
    altoDiseno: 930,
    proporcionMin: 1.4,
    proporcionMax: 2.6
};

window.calcularTamanoJuego = function () {
    const cfg = window.configPantalla;
    const anchoVentana = window.innerWidth || 1280;
    const altoVentana = window.innerHeight || 720;
    const proporcion = Phaser.Math.Clamp(anchoVentana / altoVentana, cfg.proporcionMin, cfg.proporcionMax);
    return {
        ancho: Math.round(cfg.altoDiseno * proporcion),
        alto: cfg.altoDiseno
    };
};

// =====================================================================
// CÁMARA WEB (video HTML que flota sobre el juego)
// =====================================================================
(function () {
    const estilo = document.createElement("style");
    estilo.id = "estilo-camara-escala";
    estilo.textContent =
        "#camara-juego {" +
        " width: calc(320px * var(--escala-juego, 1)) !important;" +
        " height: calc(180px * var(--escala-juego, 1)) !important;" +
        " bottom: calc(10px * var(--escala-juego, 1)) !important;" +
        " right: calc(10px * var(--escala-juego, 1)) !important;" +
        " border-width: calc(2px * var(--escala-juego, 1)) !important;" +
        " border-radius: calc(8px * var(--escala-juego, 1)) !important;" +
        " }";
    document.head.appendChild(estilo);
})();

window.sincronizarEscalaDOM = function (juego) {
    const actualizar = function () {
        if (!juego.canvas || !juego.scale.width) {
            return;
        }
        const anchoEnPantalla = juego.canvas.getBoundingClientRect().width;
        if (!anchoEnPantalla) {
            return;
        }
        document.documentElement.style.setProperty("--escala-juego", (anchoEnPantalla / juego.scale.width).toFixed(4));
    };
    actualizar();
    juego.events.once("ready", actualizar);
    juego.scale.on("resize", actualizar);
    window.addEventListener("resize", actualizar);
    juego.events.once("destroy", function () {
        window.removeEventListener("resize", actualizar);
    });
};

function iniciarJuego(rutaCarpeta) {
    window.carpetaSkin = rutaCarpeta;
    document.getElementById("menu-skins").style.display = "none";

    // El tamaño se calcula aquí (no al cargar la página) para que tome la
    // escala de pantalla vigente en este momento.
    const tam = window.calcularTamanoJuego();
    config.width = tam.ancho;
    config.height = tam.alto;
    config.scale.width = tam.ancho;
    config.scale.height = tam.alto;

    const juego = new Phaser.Game(config);
    window.sincronizarEscalaDOM(juego);
}