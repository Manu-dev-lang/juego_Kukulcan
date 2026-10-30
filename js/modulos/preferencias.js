class Preferencias {

    // -----------------------------------------------------------------
    // Nodo de ajustes. Se vuelve a leer en cada llamada (no se guarda
    // la referencia) porque Progreso.reiniciar() puede reemplazar todo
    // el registro. Además garantiza que no falte ningún campo.
    // -----------------------------------------------------------------
    static cfg() {
        const datos = Progreso.datos();
        const d = Preferencias.DEFECTO;
        if (!datos.ajustes || typeof datos.ajustes !== "object" || Array.isArray(datos.ajustes)) {
            datos.ajustes = {};
        }
        const a = datos.ajustes;
        a.idioma = (a.idioma === "en") ? "en" : "es";
        a.audio = Preferencias._grupo(a.audio, d.audio);
        a.camara = Preferencias._grupo(a.camara, d.camara);
        a.pantalla = Preferencias._grupo(a.pantalla, d.pantalla);
        return a;
    }

    // Completa un grupo con los valores por defecto y descarta tipos raros
    static _grupo(actual, defecto) {
        const g = (actual && typeof actual === "object" && !Array.isArray(actual)) ? actual : {};
        Object.keys(defecto).forEach((clave) => {
            const porDefecto = defecto[clave];
            if (typeof porDefecto === "number") {
                // Solo números reales (null o texto cuentan como dato dañado)
                g[clave] = (typeof g[clave] === "number" && Number.isFinite(g[clave])) ? g[clave] : porDefecto;
            } else {
                g[clave] = (typeof g[clave] === "boolean") ? g[clave] : porDefecto;
            }
        });
        return g;
    }

    static _limitar(valor, min = 0, max = 1) {
        return Math.min(max, Math.max(min, valor));
    }

    static guardar() {
        Progreso.guardar();
    }

    // Valores de fábrica. El idioma NO se cambia (un jugador que lo puso en
    // inglés no quiere que "restablecer" lo devuelva al español).
    static restablecer() {
        const idioma = Preferencias.cfg().idioma;
        const copia = JSON.parse(JSON.stringify(Preferencias.DEFECTO));
        copia.idioma = idioma;
        Progreso.datos().ajustes = copia;
        Preferencias.guardar();
        Preferencias.aplicarCamaraDOM();
    }

    // -----------------------------------------------------------------
    // AUDIO
    // -----------------------------------------------------------------
    static audio(clave) {
        return Preferencias.cfg().audio[clave];
    }

    static setAudio(clave, valor) {
        const a = Preferencias.cfg().audio;
        if (typeof Preferencias.DEFECTO.audio[clave] === "number") {
            a[clave] = Preferencias._limitar(Number(valor) || 0);
        } else {
            a[clave] = valor === true;
        }
    }

    // Factor 0..1 de cada categoría (0 si está silenciada)
    static factorMusica() {
        const a = Preferencias.cfg().audio;
        return a.silenciarMusica ? 0 : Preferencias._limitar(a.musica);
    }

    static factorEfectos() {
        const a = Preferencias.cfg().audio;
        return a.silenciarEfectos ? 0 : Preferencias._limitar(a.efectos);
    }

    // Volumen que debe tener un sonido de música / efecto que el juego
    // diseñó con volumen "base" (ej. Preferencias.musica(0.5))
    static musica(base) {
        return base * Preferencias.factorMusica();
    }

    static efectos(base) {
        return base * Preferencias.factorEfectos();
    }

    static esMusica(clave) {
        return typeof clave === "string" &&
            (clave.indexOf("musica") === 0 || clave.indexOf("cine_musica_") === 0);
    }

    // Aplica los ajustes de audio a un juego (volumen general, silencio
    // general y la música que ya esté sonando). Se puede llamar las veces
    // que haga falta.
    static aplicarAudio(juego) {
        const manager = juego && juego.sound;
        if (!manager) {
            return;
        }
        const a = Preferencias.cfg().audio;
        manager.volume = Preferencias._limitar(a.general);
        manager.mute = a.silenciarGeneral === true;

        const factor = Preferencias.factorMusica();
        (manager.sounds || []).forEach((sonido) => {
            if (sonido && sonido.categoriaAudio === "musica") {
                sonido.volume = (sonido.volumenObjetivo || 0.5) * factor;
            }
        });
    }

    // Envuelve sound.add() y sound.play() para que todo sonido nuevo nazca
    // con el volumen del jugador. Seguro de llamar varias veces.
    static instalarAudio(juego) {
        const manager = juego && juego.sound;
        if (!manager) {
            return;
        }
        if (!manager._preferenciasInstalado) {
            manager._preferenciasInstalado = true;
            const addOriginal = manager.add;
            const playOriginal = manager.play;

            manager.add = function (clave, config) {
                const musica = Preferencias.esMusica(clave);
                const cfg = Object.assign({}, config || {});
                const base = (typeof cfg.volume === "number") ? cfg.volume : 1;
                cfg.volume = base * (musica ? Preferencias.factorMusica() : Preferencias.factorEfectos());
                const sonido = addOriginal.call(manager, clave, cfg);
                if (sonido) {
                    sonido.categoriaAudio = musica ? "musica" : "efectos";
                    if (musica) {
                        // Volumen "de diseño" al que debe volver al mover el control
                        sonido.volumenObjetivo = Preferencias.BASE_MUSICA[clave] || 0.5;
                    }
                }
                return sonido;
            };

            manager.play = function (clave, extra) {
                if (extra && typeof extra.volume === "number" && !Preferencias.esMusica(clave)) {
                    extra = Object.assign({}, extra, { volume: Preferencias.efectos(extra.volume) });
                }
                return playOriginal.call(manager, clave, extra);
            };
        }
        Preferencias.aplicarAudio(juego);
        Preferencias.aplicarCamaraDOM();
    }

    // -----------------------------------------------------------------
    // CÁMARA
    // -----------------------------------------------------------------
    static camara(clave) {
        return Preferencias.cfg().camara[clave];
    }

    static setCamara(clave, valor) {
        const c = Preferencias.cfg().camara;
        if (typeof Preferencias.DEFECTO.camara[clave] === "number") {
            c[clave] = Number(valor);
        } else {
            c[clave] = valor === true;
        }
    }

    // Cuánto se amplifica el movimiento detectado respecto al centro
    static sensibilidadCamara() {
        const s = Preferencias.SENSIBILIDAD;
        return Preferencias._limitar(Preferencias.cfg().camara.sensibilidad, s.min, s.max);
    }

    // Filtro de ruido del objetivo (0.1 = muy suave y lento, 0.6 = muy
    // directo). El ajuste "suavizado" va de 0 a 1 en sentido contrario.
    static filtroCamara() {
        const suavizado = Preferencias._limitar(Preferencias.cfg().camara.suavizado);
        return Preferencias._limitar(0.6 - suavizado * 0.5, 0.1, 0.6);
    }

    static camaraVisible() {
        return Preferencias.cfg().camara.mostrar !== false;
    }

    static puntoGuia() {
        return Preferencias.cfg().camara.puntoGuia !== false;
    }

    // Muestra u oculta el video de la cámara (sin dejar de analizarlo)
    static aplicarCamaraDOM() {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        document.body.classList.toggle("camara-oculta", !Preferencias.camaraVisible());
    }

    // -----------------------------------------------------------------
    // PANTALLA
    // -----------------------------------------------------------------
    // Destellos y sacudidas de la cámara del juego (supernova, muerte...)
    static efectosVisuales() {
        return Preferencias.cfg().pantalla.efectosVisuales !== false;
    }
}

Preferencias.DEFECTO = {
    idioma: "es",
    audio: {
        general: 1,
        musica: 1,
        efectos: 1,
        silenciarGeneral: false,
        silenciarMusica: false,
        silenciarEfectos: false
    },
    camara: {
        sensibilidad: 1.6,
        suavizado: 0.6,
        mostrar: true,
        puntoGuia: true
    },
    pantalla: {
        efectosVisuales: true
    }
};
Preferencias.SENSIBILIDAD = { min: 1, max: 2.5 };

// Volumen "de diseño" de cada música (el que tenía el juego antes de
// existir los ajustes). El control del jugador lo multiplica.
Preferencias.BASE_MUSICA = { musica: 0.5, musicaJ: 0.5, musicaG: 0.5 };

// El video de la cámara se oculta con opacidad (no con display:none) para
// que el navegador siga entregando fotogramas y el control no se detenga.
(function () {
    const estilo = document.createElement("style");
    estilo.id = "estilo-camara-oculta";
    estilo.textContent = "body.camara-oculta #camara-juego { opacity: 0 !important; }";
    document.head.appendChild(estilo);
    Preferencias.aplicarCamaraDOM();
})();