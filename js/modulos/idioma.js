class Idioma {

    static actual() {
        return Preferencias.cfg().idioma;
    }

    // Cambia el idioma, lo guarda y actualiza los textos de la página HTML
    static cambiar(codigo) {
        Preferencias.cfg().idioma = (codigo === "en") ? "en" : "es";
        Preferencias.guardar();
        Idioma.aplicarDOM();
    }

    // ¿Está elegida la carpeta de la skin navideña?
    static esNavidad() {
        return (window.carpetaSkin || "").includes("navidad");
    }

    static t(clave, valores) {
        const tabla = Idioma.TEXTOS[Idioma.actual()] || {};
        let texto;
        // Con la skin navideña, si existe "clave.navidad" se usa esa variante
        // (ej. regalos y mirra en lugar de plumas y jades)
        if (Idioma.esNavidad()) {
            texto = tabla[clave + ".navidad"];
        }
        if (texto === undefined) {
            texto = tabla[clave];
        }
        if (texto === undefined) {
            texto = Idioma.TEXTOS.es[clave];
        }
        if (texto === undefined) {
            return clave;
        }
        if (valores) {
            texto = texto.replace(/\{(\w+)\}/g, function (coincidencia, nombre) {
                return valores[nombre] !== undefined ? valores[nombre] : coincidencia;
            });
        }
        return texto;
    }

    // Texto que puede venir como string o como { es: "...", en: "..." }
    static dato(valor) {
        if (valor === null || valor === undefined) {
            return "";
        }
        if (typeof valor === "object") {
            const texto = valor[Idioma.actual()];
            if (texto !== undefined) {
                return String(texto);
            }
            return valor.es !== undefined ? String(valor.es) : "";
        }
        return String(valor);
    }

    // Nombre de una moneda de la tienda ("plumas" -> "feathers")
    static moneda(tipo) {
        const clave = "moneda." + tipo;
        const texto = Idioma.t(clave);
        return texto === clave ? tipo : texto;
    }

    // -----------------------------------------------------------------
    // IMÁGENES CON TEXTO (botones JUGAR / SALIR)
    //
    // Esas dos imágenes traen el texto dibujado. Si en la carpeta de la
    // skin existen boton_jugar_en.png y boton_salir_en.png, se usan en
    // inglés; si no existen, se queda con las de español sin dar error.
    // -----------------------------------------------------------------
    static textura(escena, clave) {
        if (Idioma.actual() === "en" && escena.textures.exists(clave + "_en")) {
            return clave + "_en";
        }
        return clave;
    }

    // Carga las imágenes en inglés si hace falta (al cambiar de idioma en
    // vivo). Siempre llama a alTerminar, aunque los archivos no existan.
    static cargarExtras(escena, alTerminar) {
        if (Idioma.actual() !== "en") {
            alTerminar();
            return;
        }
        const ruta = window.carpetaSkin || "";
        const pendientes = Idioma.IMAGENES_EN.filter(function (clave) {
            return !escena.textures.exists(clave) && !Idioma._fallidas[ruta + clave];
        });
        if (pendientes.length === 0) {
            alTerminar();
            return;
        }
        escena.load.setPath(ruta);
        pendientes.forEach(function (clave) {
            escena.load.image(clave, clave + ".png");
        });
        const alFallar = function (archivo) {
            Idioma._fallidas[ruta + archivo.key] = true;
        };
        escena.load.on("loaderror", alFallar);
        escena.load.once("complete", function () {
            escena.load.off("loaderror", alFallar);
            alTerminar();
        });
        escena.load.start();
    }

    // -----------------------------------------------------------------
    // PÁGINA HTML (menú de selección de versión, antes de iniciar Phaser)
    // Los elementos con data-i18n="clave" se traducen solos.
    // -----------------------------------------------------------------
    static aplicarDOM() {
        if (typeof document === "undefined") {
            return;
        }
        document.documentElement.lang = Idioma.actual();
        document.querySelectorAll("[data-i18n]").forEach(function (elemento) {
            elemento.textContent = Idioma.t(elemento.getAttribute("data-i18n"));
        });
        document.querySelectorAll("[data-idioma]").forEach(function (boton) {
            boton.classList.toggle("activo", boton.getAttribute("data-idioma") === Idioma.actual());
        });
    }
}

Idioma.IMAGENES_EN = ["boton_jugar_en", "boton_salir_en"];
Idioma._fallidas = {};

Idioma.TEXTOS = {

    // =================================================================
    // ESPAÑOL
    // =================================================================
    es: {
        // --- Página de selección de versión ---
        "skin.titulo": "Selecciona la versión del juego",
        "skin.normal": "Versión Normal",
        "skin.navidad": "Versión Navideña",

        // --- Comunes ---
        "comun.volver": "VOLVER",

        // --- Menú principal ---
        "menu.carpetas": "VERSIONES",
        "menu.cinematica": "CINEMÁTICA",
        "menu.tienda": "TIENDA",
        "menu.ajustes": "AJUSTES",
        "menu.instrucciones": "INSTRUCCIONES",

        // --- Pantalla de carga ---
        "carga.normal": "Sintonizando la energía de Kukulkán...",
        "carga.navidad": "Encendiendo la estrella navideña...",

        // --- Instrucciones ---
        "instr.titulo": "INSTRUCCIONES",
        "instr.anterior": "◀ ANTERIOR",
        "instr.siguiente": "SIGUIENTE ▶",
        // Página 1: control
        "instr.p1.titulo": "CÓMO MOVERTE",
        "instr.p1.mover": "MUÉVETE A IZQUIERDA Y DERECHA FRENTE A LA CÁMARA PARA CONTROLAR AL PERSONAJE",
        "instr.p1.punto": "EL PUNTO ROJO MARCA TU POSICIÓN (PUEDES OCULTARLO EN AJUSTES)",
        "instr.p1.ajuste": "¿NO TE SIGUE BIEN? AJUSTA LA SENSIBILIDAD Y EL SUAVIZADO EN AJUSTES",
        // Página 2: sobrevivir
        "instr.p2.titulo": "SOBREVIVE",
        "instr.p2.enemigos": "ESQUIVA A LOS ENEMIGOS: SI TE TOCAN, PIERDES",
        "instr.p2.luz": "TU LUZ SE APAGA CON EL TIEMPO: SI LLEGA A CERO, PIERDES",
        "instr.p2.plumas": "RECOLECTA PLUMAS PARA RECUPERAR TU LUZ",
        "instr.p2.plumas.navidad": "RECOLECTA REGALOS PARA RECUPERAR TU LUZ",
        // Página 3: supernova
        "instr.p3.titulo": "SUPERNOVA",
        "instr.p3.jades": "RECOLECTA 3 JADES PARA LANZAR UNA SUPERNOVA",
        "instr.p3.jades.navidad": "RECOLECTA 3 MIRRAS PARA LANZAR UNA SUPERNOVA",
        "instr.p3.destruye": "LA SUPERNOVA DESTRUYE A LOS ENEMIGOS Y, POR 10 SEGUNDOS, NO CAEN MÁS",
        "instr.p3.crece": "CADA JADE AGRANDA UN POCO TU ZONA DE CHOQUE: ¡CUIDADO!",
        "instr.p3.crece.navidad": "CADA MIRRA AGRANDA UN POCO TU ZONA DE CHOQUE: ¡CUIDADO!",
        // Página 4: niveles y jefe
        "instr.p4.titulo": "NIVELES Y JEFE",
        "instr.p4.enemigos": "LOS ENEMIGOS CAEN RECTOS EN EL NIVEL 1 Y EN ZIGZAG EN EL NIVEL 2",
        "instr.p4.jefe": "EN EL NIVEL 3 DESPIERTA EL JEFE: SE PONE ROJO ANTES DE EMBESTIR, ¡ESQUÍVALO!",
        "instr.p4.items": "AHÍ SOLO CAEN PLUMAS Y JADES: CON 2 SUPERNOVAS DERROTAS AL JEFE",
        "instr.p4.items.navidad": "AHÍ SOLO CAEN REGALOS Y MIRRAS: CON 2 SUPERNOVAS DERROTAS AL JEFE",
        // Página 5: recompensas
        "instr.p5.titulo": "RECOMPENSAS",
        "instr.p5.guardar": "LAS PLUMAS Y LOS JADES QUE RECOLECTAS SE GUARDAN, AUNQUE PIERDAS",
        "instr.p5.guardar.navidad": "LOS REGALOS Y LAS MIRRAS QUE RECOLECTAS SE GUARDAN, AUNQUE PIERDAS",
        "instr.p5.tienda": "GÁSTALOS EN LA TIENDA PARA CONSEGUIR NUEVAS OBRAS",

        // --- Cinemática ---
        "cine.preparando": "Preparando la historia...",
        "cine.saltar": "SALTAR ▶▶",
        "cine.clic": "Clic ▶",
        "cine.siguiente": "Siguiente página ▶",
        "cine.fin": "FIN ▶",

        // --- Partida ---
        "juego.nivel1": "Nivel 1: El Suelo de la Selva",
        "juego.nivel2": "Nivel 2: La Copa de los Árboles",
        "juego.nivel3": "Nivel 3: El Firmamento (Boss Final)",
        "juego.tiempo": "Tiempo restante: {t}",
        "juego.jades": "Jades para Supernova: {n} / {m}",
        "juego.jades.navidad": "Mirras para Supernova: {n} / {m}",
        "juego.ya": "¡YA!",
        "boss.aparece": "¡EL JEFE DESPIERTA!",

        // --- Pantallas finales ---
        "fin.victoria": "¡VICTORIA CELESTIAL!",
        "fin.tiempo.mensaje": "¡Citlalmina se ha integrado con éxito al firmamento!",
        "fin.reiniciar": "REINICIAR",
        "fin.menu": "MENÚ PRINCIPAL",
        "fin.perderNormal": "Kukulcán ha sido destruido",
        "fin.perderNavidad": "La estrella ha sido colapsada",
        "fin.jefeNormal": "¡Felicidades! Kukulcán logró regresar al firmamento",
        "fin.jefeNavidad": "¡Felicidades! La estrella logró guiar el camino hasta el pesebre",
        "fin.imagenFalta": "Falta la imagen de victoria:\n{ruta}\n(tamaño sugerido: {tam})",

        // --- Tienda ---
        "tienda.coleccion": "Colección: {a} de {b}",
        "tienda.clic": "Haz clic en una obra",
        "tienda.proximamente": "Próximamente",
        "tienda.imagenNo": "Imagen no\nencontrada",
        "tienda.adquirida": "✔ Adquirida",
        "tienda.noDisponible": "Esta obra todavía no está disponible. Tus {moneda} se siguen guardando.",
        "tienda.precio": "Precio",
        "tienda.tienes": "Tienes",
        "tienda.faltan": "Te faltan {n}",
        "tienda.comprar": "Comprar",
        "tienda.cancelar": "Cancelar",
        "tienda.sinSaldo": "No te alcanzan las {moneda}.",
        "tienda.yaEsTuya": "Esta obra ya es tuya.",
        "tienda.nueva": "Nueva obra en tu colección",
        "tienda.cerrar": "Clic o ESC para cerrar",
        "tienda.clicSkin": "Haz clic en una skin",
        "tienda.equipar": "Equipar",
        "tienda.quitar": "Quitar",
        "tienda.equipada": "● Equipada",
        "tienda.habilidad": "Habilidad",
        "tienda.nuevaSkin": "Nueva skin en tu colección",
        "tienda.skinPuesta": "Skin equipada: {n}",
        "tienda.skinQuitada": "Skin quitada",
        "moneda.plumas": "plumas",
        "moneda.plumas.navidad": "regalos",
        "moneda.jades": "jades",
        "moneda.jades.navidad": "mirras",

        // --- Ajustes ---
        "ajustes.titulo": "AJUSTES",
        "ajustes.sonido": "SONIDO",
        "ajustes.general": "Volumen general",
        "ajustes.musica": "Música",
        "ajustes.efectos": "Efectos",
        "ajustes.idioma": "IDIOMA",
        "ajustes.pantalla": "PANTALLA",
        "ajustes.completa": "Pantalla completa",
        "ajustes.efectosVisuales": "Destellos y sacudidas",
        "ajustes.camara": "CÁMARA",
        "ajustes.sensibilidad": "Sensibilidad",
        "ajustes.suavizado": "Suavizado",
        "ajustes.prueba": "Prueba de movimiento",
        "ajustes.pruebaAyuda": "Muévete frente a la cámara: el marcador debe seguirte",
        "ajustes.sinCamara": "Cámara no disponible: permite el acceso en el navegador",
        "ajustes.mostrarCamara": "Mostrar cámara",
        "ajustes.puntoGuia": "Mostrar punto guía",
        "ajustes.restablecer": "RESTABLECER",
        "ajustes.control": "CONTROL",
        "ajustes.usarCamara": "Jugar con la cámara",
        "ajustes.controlAyudaOn": "Apágala para jugar con el teclado o con botones en pantalla",
        "ajustes.controlTeclado": "Computadora: teclas A y D (o las flechas ← →)",
        "ajustes.controlTactil": "Celular o tableta: botones de flecha en pantalla",
        "juego.avisoTeclado": "Muévete con las teclas A y D (o ← →)",
        "juego.avisoTactil": "Muévete con los botones de flecha",
        "pausa.titulo": "PAUSA",
        "pausa.continuar": "CONTINUAR",
        "pausa.reiniciar": "REINICIAR",
        "pausa.menu": "MENÚ PRINCIPAL",
        "instr.p1.teclado": "SIN CÁMARA: USA A Y D EN COMPUTADORA, O LOS BOTONES DE FLECHA EN CELULAR Y TABLETA (VER AJUSTES)"
    },

    // =================================================================
    // ENGLISH
    // =================================================================
    en: {
        // --- Version select page ---
        "skin.titulo": "Select the game version",
        "skin.normal": "Normal Version",
        "skin.navidad": "Christmas Version",

        // --- Common ---
        "comun.volver": "BACK",

        // --- Main menu ---
        "menu.carpetas": "VERSIONS",
        "menu.cinematica": "CINEMATIC",
        "menu.tienda": "SHOP",
        "menu.ajustes": "SETTINGS",
        "menu.instrucciones": "INSTRUCTIONS",

        // --- Loading screen ---
        "carga.normal": "Tuning into Kukulkán's energy...",
        "carga.navidad": "Lighting the Christmas star...",

        // --- Instructions ---
        "instr.titulo": "INSTRUCTIONS",
        "instr.anterior": "◀ PREVIOUS",
        "instr.siguiente": "NEXT ▶",
        // Page 1: controls
        "instr.p1.titulo": "HOW TO MOVE",
        "instr.p1.mover": "MOVE LEFT AND RIGHT IN FRONT OF THE CAMERA TO CONTROL THE CHARACTER",
        "instr.p1.punto": "THE RED DOT MARKS YOUR POSITION (YOU CAN HIDE IT IN SETTINGS)",
        "instr.p1.ajuste": "NOT FOLLOWING YOU WELL? ADJUST SENSITIVITY AND SMOOTHING IN SETTINGS",
        // Page 2: survive
        "instr.p2.titulo": "SURVIVE",
        "instr.p2.enemigos": "DODGE THE ENEMIES: IF THEY TOUCH YOU, YOU LOSE",
        "instr.p2.luz": "YOUR LIGHT FADES OVER TIME: IF IT REACHES ZERO, YOU LOSE",
        "instr.p2.plumas": "COLLECT FEATHERS TO RESTORE YOUR LIGHT",
        "instr.p2.plumas.navidad": "COLLECT GIFTS TO RESTORE YOUR LIGHT",
        // Page 3: supernova
        "instr.p3.titulo": "SUPERNOVA",
        "instr.p3.jades": "COLLECT 3 JADES TO UNLEASH A SUPERNOVA",
        "instr.p3.jades.navidad": "COLLECT 3 MYRRH TO UNLEASH A SUPERNOVA",
        "instr.p3.destruye": "THE SUPERNOVA DESTROYS ENEMIES AND NO MORE FALL FOR 10 SECONDS",
        "instr.p3.crece": "EACH JADE ENLARGES YOUR COLLISION AREA A LITTLE: BE CAREFUL!",
        "instr.p3.crece.navidad": "EACH MYRRH ENLARGES YOUR COLLISION AREA A LITTLE: BE CAREFUL!",
        // Page 4: levels and boss
        "instr.p4.titulo": "LEVELS & BOSS",
        "instr.p4.enemigos": "ENEMIES FALL STRAIGHT IN LEVEL 1 AND IN ZIGZAGS IN LEVEL 2",
        "instr.p4.jefe": "IN LEVEL 3 THE BOSS AWAKENS: IT TURNS RED BEFORE CHARGING, SO DODGE IT!",
        "instr.p4.items": "ONLY FEATHERS AND JADES FALL THERE: 2 SUPERNOVAS DEFEAT THE BOSS",
        "instr.p4.items.navidad": "ONLY GIFTS AND MYRRH FALL THERE: 2 SUPERNOVAS DEFEAT THE BOSS",
        // Page 5: rewards
        "instr.p5.titulo": "REWARDS",
        "instr.p5.guardar": "THE FEATHERS AND JADES YOU COLLECT ARE SAVED, EVEN IF YOU LOSE",
        "instr.p5.guardar.navidad": "THE GIFTS AND MYRRH YOU COLLECT ARE SAVED, EVEN IF YOU LOSE",
        "instr.p5.tienda": "SPEND THEM IN THE SHOP TO GET NEW ARTWORKS",

        // --- Cinematic ---
        "cine.preparando": "Preparing the story...",
        "cine.saltar": "SKIP ▶▶",
        "cine.clic": "Click ▶",
        "cine.siguiente": "Next page ▶",
        "cine.fin": "END ▶",

        // --- Gameplay ---
        "juego.nivel1": "Level 1: The Jungle Floor",
        "juego.nivel2": "Level 2: The Treetops",
        "juego.nivel3": "Level 3: The Firmament (Final Boss)",
        "juego.tiempo": "Time left: {t}",
        "juego.jades": "Jades for Supernova: {n} / {m}",
        "juego.jades.navidad": "Myrrh for Supernova: {n} / {m}",
        "juego.ya": "GO!",
        "boss.aparece": "THE BOSS AWAKENS!",

        // --- End screens ---
        "fin.victoria": "CELESTIAL VICTORY!",
        "fin.tiempo.mensaje": "Citlalmina has successfully joined the firmament!",
        "fin.reiniciar": "RESTART",
        "fin.menu": "MAIN MENU",
        "fin.perderNormal": "Kukulcán has been destroyed",
        "fin.perderNavidad": "The star has collapsed",
        "fin.jefeNormal": "Congratulations! Kukulcán made it back to the firmament",
        "fin.jefeNavidad": "Congratulations! The star lit the way to the manger",
        "fin.imagenFalta": "Missing victory image:\n{ruta}\n(suggested size: {tam})",

        // --- Shop ---
        "tienda.coleccion": "Collection: {a} of {b}",
        "tienda.clic": "Click on an artwork",
        "tienda.proximamente": "Coming soon",
        "tienda.imagenNo": "Image not\nfound",
        "tienda.adquirida": "✔ Acquired",
        "tienda.noDisponible": "This piece isn't available yet. Your {moneda} are still being saved.",
        "tienda.precio": "Price",
        "tienda.tienes": "You have",
        "tienda.faltan": "Need {n} more",
        "tienda.comprar": "Buy",
        "tienda.cancelar": "Cancel",
        "tienda.sinSaldo": "You don't have enough {moneda}.",
        "tienda.yaEsTuya": "You already own this piece.",
        "tienda.nueva": "New piece in your collection",
        "tienda.cerrar": "Click or ESC to close",
        "tienda.clicSkin": "Click on a skin",
        "tienda.equipar": "Equip",
        "tienda.quitar": "Remove",
        "tienda.equipada": "● Equipped",
        "tienda.habilidad": "Ability",
        "tienda.nuevaSkin": "New skin in your collection",
        "tienda.skinPuesta": "Skin equipped: {n}",
        "tienda.skinQuitada": "Skin removed",
        "moneda.plumas": "feathers",
        "moneda.plumas.navidad": "gifts",
        "moneda.jades": "jades",
        "moneda.jades.navidad": "myrrh",

        // --- Settings ---
        "ajustes.titulo": "SETTINGS",
        "ajustes.sonido": "SOUND",
        "ajustes.general": "Master volume",
        "ajustes.musica": "Music",
        "ajustes.efectos": "Effects",
        "ajustes.idioma": "LANGUAGE",
        "ajustes.pantalla": "DISPLAY",
        "ajustes.completa": "Fullscreen",
        "ajustes.efectosVisuales": "Flashes & screen shake",
        "ajustes.camara": "CAMERA",
        "ajustes.sensibilidad": "Sensitivity",
        "ajustes.suavizado": "Smoothing",
        "ajustes.prueba": "Motion test",
        "ajustes.pruebaAyuda": "Move in front of the camera: the marker should follow you",
        "ajustes.sinCamara": "Camera unavailable: allow access in your browser",
        "ajustes.mostrarCamara": "Show camera",
        "ajustes.puntoGuia": "Show guide dot",
        "ajustes.restablecer": "RESET",
        "ajustes.control": "CONTROLS",
        "ajustes.usarCamara": "Play with the camera",
        "ajustes.controlAyudaOn": "Turn it off to play with the keyboard or on-screen buttons",
        "ajustes.controlTeclado": "Computer: A and D keys (or the ← → arrows)",
        "ajustes.controlTactil": "Phone or tablet: on-screen arrow buttons",
        "juego.avisoTeclado": "Move with the A and D keys (or ← →)",
        "juego.avisoTactil": "Move with the arrow buttons",
        "pausa.titulo": "PAUSED",
        "pausa.continuar": "RESUME",
        "pausa.reiniciar": "RESTART",
        "pausa.menu": "MAIN MENU",
        "instr.p1.teclado": "NO CAMERA? USE A AND D ON A COMPUTER, OR THE ARROW BUTTONS ON A PHONE OR TABLET (SEE SETTINGS)"
    }
};

// La página HTML ya existe cuando se carga este archivo (los scripts van al
// final del body), así que se traduce de inmediato.
Idioma.aplicarDOM();