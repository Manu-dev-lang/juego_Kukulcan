class Progreso {

    // -----------------------------------------------------------------
    // Identificador de la skin activa: "normal" o "navidad"
    // (se deduce de la carpeta elegida en el menú de skins)
    // -----------------------------------------------------------------
    static idSkin() {
        return (window.carpetaSkin || "").includes("navidad") ? "navidad" : "normal";
    }

    // -----------------------------------------------------------------
    // Datos completos (se leen una sola vez y se mantienen en memoria)
    // -----------------------------------------------------------------
    static datos() {
        if (Progreso._cache) {
            return Progreso._cache;
        }
        let datos = null;
        try {
            const crudo = window.localStorage.getItem(Progreso.CLAVE);
            if (crudo) {
                datos = JSON.parse(crudo);
            }
        } catch (error) {
            console.warn("[Progreso] No se pudo leer el registro guardado:", error);
        }
        Progreso._cache = Progreso.normalizar(datos);
        return Progreso._cache;
    }

    // Asegura que el registro tenga la forma esperada (y sirve de punto de
    // migración si algún día cambia Progreso.VERSION).
    static normalizar(datos) {
        if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
            datos = {};
        }
        if (!datos.cinematicas || typeof datos.cinematicas !== "object") {
            datos.cinematicas = {};
        }
        if (!datos.tienda || typeof datos.tienda !== "object" || Array.isArray(datos.tienda)) {
            datos.tienda = {};
        }
        datos.version = Progreso.VERSION;
        return datos;
    }

    // -----------------------------------------------------------------
    // Guardar en el navegador. Si localStorage no está disponible
    // (modo privado, permisos), el progreso vive solo mientras la
    // página está abierta y el juego sigue funcionando igual.
    // -----------------------------------------------------------------
    static guardar() {
        try {
            window.localStorage.setItem(Progreso.CLAVE, JSON.stringify(Progreso.datos()));
        } catch (error) {
            console.warn("[Progreso] No se pudo guardar (solo se mantendrá en esta sesión):", error);
        }
    }

    // -----------------------------------------------------------------
    // Lectura / escritura genéricas con ruta separada por puntos
    //   Progreso.leer("cinematicas.normal.vista", false)
    //   Progreso.escribir("records.mejorTiempo", 95)
    // -----------------------------------------------------------------
    static leer(ruta, porDefecto) {
        let nodo = Progreso.datos();
        for (const parte of ruta.split(".")) {
            if (nodo === null || typeof nodo !== "object" || !(parte in nodo)) {
                return porDefecto;
            }
            nodo = nodo[parte];
        }
        return nodo;
    }

    static escribir(ruta, valor) {
        const partes = ruta.split(".");
        const ultima = partes.pop();
        let nodo = Progreso.datos();
        for (const parte of partes) {
            if (nodo[parte] === null || typeof nodo[parte] !== "object") {
                nodo[parte] = {};
            }
            nodo = nodo[parte];
        }
        nodo[ultima] = valor;
        Progreso.guardar();
    }

    // -----------------------------------------------------------------
    // CINEMÁTICA
    // -----------------------------------------------------------------

    // ¿Esta skin ya vio su cinemática completa al menos una vez?
    static cinematicaVista(skin = Progreso.idSkin()) {
        return Progreso.leer("cinematicas." + skin + ".vista", false) === true;
    }

    // Cuántas veces se ha terminado (o saltado) la cinemática de esta skin
    static vecesCinematica(skin = Progreso.idSkin()) {
        return Progreso.leer("cinematicas." + skin + ".veces", 0);
    }

    // Se llama al terminar la cinemática (o al saltarla)
    static marcarCinematicaVista(skin = Progreso.idSkin(), saltada = false) {
        const ruta = "cinematicas." + skin;
        const previo = Progreso.leer(ruta, null) || {};
        const ahora = new Date().toISOString();
        Progreso.escribir(ruta, {
            vista: true,
            veces: (previo.veces || 0) + 1,
            saltadas: (previo.saltadas || 0) + (saltada ? 1 : 0),
            primeraVez: previo.primeraVez || ahora,
            ultimaVez: ahora
        });
    }

    // Solo para pruebas: esa skin vuelve a comportarse como "primera vez"
    static reiniciarCinematica(skin = Progreso.idSkin()) {
        delete Progreso.datos().cinematicas[skin];
        Progreso.guardar();
    }

    // -----------------------------------------------------------------
    // TIENDA: MONEDAS Y COMPRAS
    //
    // Cada skin tiene su propia cartera y su propia colección:
    //   Progreso.monedas("plumas")                 -> saldo que se puede gastar
    //   Progreso.sumarMonedas("jades", 1)          -> al recoger un jade
    //   Progreso.comprado("arte_01")               -> ¿ya está en la colección?
    //   Progreso.comprar("arte_01", "plumas", 25)  -> "ok" | "sin_saldo" | "ya_comprado"
    //
    // SKINS EQUIPABLES (Taller de Skins):
    //   Progreso.equipar("enemigos", "skin_enemigos_dorado") -> true | false
    //   Progreso.desequipar("enemigos")
    //   Progreso.equipada("enemigos")        -> id de la skin puesta o null
    //   Progreso.estaEquipada("skin_...")    -> true | false
    //
    // OJO: estos saldos NO son escena.jugador.jades. Ese es el contador de
    // la partida (las gemas de la supernova) y se reinicia en cada create().
    // Los de aquí son los ahorros para la tienda y sobreviven entre partidas.
    // -----------------------------------------------------------------

    // Nodo de una skin, con todos sus campos garantizados
    static _tienda(skin = Progreso.idSkin()) {
        const datos = Progreso.datos();
        if (!datos.tienda || typeof datos.tienda !== "object" || Array.isArray(datos.tienda)) {
            datos.tienda = {};
        }
        let t = datos.tienda[skin];
        if (!t || typeof t !== "object" || Array.isArray(t)) {
            t = datos.tienda[skin] = {};
        }
        if (!t.ganadas || typeof t.ganadas !== "object" || Array.isArray(t.ganadas)) {
            t.ganadas = {};
        }
        if (!t.compradas || typeof t.compradas !== "object" || Array.isArray(t.compradas)) {
            t.compradas = {};
        }
        if (!t.equipadas || typeof t.equipadas !== "object" || Array.isArray(t.equipadas)) {
            t.equipadas = {};
        }
        Progreso.TIPOS_MONEDA.forEach((tipo) => {
            t[tipo] = Progreso._entero(t[tipo]);
            t.ganadas[tipo] = Progreso._entero(t.ganadas[tipo]);
        });
        return t;
    }

    // Entero >= 0 (cualquier otra cosa cuenta como 0)
    static _entero(valor) {
        const n = Math.floor(Number(valor));
        return Number.isFinite(n) && n > 0 ? n : 0;
    }

    // Saldo actual de una moneda ("plumas" o "jades")
    static monedas(tipo, skin = Progreso.idSkin()) {
        if (!Progreso.TIPOS_MONEDA.includes(tipo)) {
            return 0;
        }
        return Progreso._tienda(skin)[tipo];
    }

    // Total que se ha ganado en la historia (no baja al gastar)
    static monedasGanadas(tipo, skin = Progreso.idSkin()) {
        if (!Progreso.TIPOS_MONEDA.includes(tipo)) {
            return 0;
        }
        return Progreso._tienda(skin).ganadas[tipo];
    }

    // Suma monedas a la cartera y guarda. Devuelve el saldo nuevo.
    static sumarMonedas(tipo, cantidad = 1, skin = Progreso.idSkin()) {
        if (!Progreso.TIPOS_MONEDA.includes(tipo)) {
            console.warn("[Progreso] Moneda desconocida:", tipo);
            return 0;
        }
        const t = Progreso._tienda(skin);
        const n = Progreso._entero(cantidad);
        if (n > 0) {
            t[tipo] += n;
            t.ganadas[tipo] += n;
            Progreso.guardar();
        }
        return t[tipo];
    }

    // ¿Esta obra ya está en la colección?
    static comprado(id, skin = Progreso.idSkin()) {
        return Object.prototype.hasOwnProperty.call(Progreso._tienda(skin).compradas, id);
    }

    // Compra atómica: cobra y registra la obra en un solo paso.
    // Devuelve "ok", "sin_saldo" o "ya_comprado".
    static comprar(id, tipo, precio, skin = Progreso.idSkin()) {
        if (!Progreso.TIPOS_MONEDA.includes(tipo)) {
            return "sin_saldo";
        }
        const t = Progreso._tienda(skin);
        if (Object.prototype.hasOwnProperty.call(t.compradas, id)) {
            return "ya_comprado";
        }
        const costo = Progreso._entero(precio);
        if (t[tipo] < costo) {
            return "sin_saldo";
        }
        t[tipo] -= costo;
        t.compradas[id] = new Date().toISOString();
        Progreso.guardar();
        return "ok";
    }

    // -----------------------------------------------------------------
    // SKINS EQUIPABLES
    // -----------------------------------------------------------------

    // Id de la skin puesta en una categoría ("jugador" | "enemigos"), o null.
    // Solo cuenta si de verdad está comprada.
    static equipada(categoria, skin = Progreso.idSkin()) {
        const t = Progreso._tienda(skin);
        const id = t.equipadas[categoria];
        if (typeof id === "string" && Object.prototype.hasOwnProperty.call(t.compradas, id)) {
            return id;
        }
        return null;
    }

    static estaEquipada(id, skin = Progreso.idSkin()) {
        const t = Progreso._tienda(skin);
        return Object.keys(t.equipadas).some((categoria) => t.equipadas[categoria] === id) &&
            Object.prototype.hasOwnProperty.call(t.compradas, id);
    }

    // Pone una skin comprada (reemplaza la que hubiera en esa categoría)
    static equipar(categoria, id, skin = Progreso.idSkin()) {
        const t = Progreso._tienda(skin);
        if (!Object.prototype.hasOwnProperty.call(t.compradas, id)) {
            return false;
        }
        t.equipadas[categoria] = id;
        Progreso.guardar();
        return true;
    }

    // Quita la skin de una categoría (vuelve al diseño normal, sin habilidad)
    static desequipar(categoria, skin = Progreso.idSkin()) {
        const t = Progreso._tienda(skin);
        delete t.equipadas[categoria];
        Progreso.guardar();
    }

    // Solo para pruebas: vacía cartera y compras de una skin
    static reiniciarTienda(skin = Progreso.idSkin()) {
        delete Progreso.datos().tienda[skin];
        Progreso.guardar();
    }

    // Solo para pruebas: borra todo el progreso
    static reiniciar() {
        Progreso._cache = Progreso.normalizar(null);
        try {
            window.localStorage.removeItem(Progreso.CLAVE);
        } catch (error) {
            // Sin localStorage no hay nada que borrar
        }
    }
}

Progreso.CLAVE = "ascenso_a_kaan_progreso";
Progreso.VERSION = 2;
Progreso.TIPOS_MONEDA = ["plumas", "jades"];
Progreso._cache = null;