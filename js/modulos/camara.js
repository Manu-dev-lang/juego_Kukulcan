class ControlCamara {
    constructor(escena) {
        this.escena = escena;
        this.video = null;
        this.ultimoTiempo = 0;
        this.saltoPendiente = null; // salto brusco que espera confirmación

        // Esqueleto
        this.ultimoVideoTime = -1;  // para no procesar dos veces el mismo fotograma
        this.msInferencia = 0;      // lo que tarda una lectura (promedio)
        this.erroresSeguidos = 0;
        this.sinDeteccionDesde = null; // desde cuándo no se ve a nadie (ms)
        this.esperandoDesde = null;    // desde cuándo el detector NO está listo (ms)

        // Aviso en pantalla ("No te veo...")
        this.aviso = null;

        // Amplifica la posición detectada respecto al centro para que
        // el jugador no necesite llegar a los bordes físicos del encuadre.
        // (El valor lo elige el jugador en AJUSTES: Preferencias.sensibilidadCamara())
    }

    // -----------------------------------------------------------------
    // INICIAR: conecta el video global y prepara lo necesario
    // -----------------------------------------------------------------
    iniciar() {
        this.video = window.camaraVideo;
        if (this.video && window.camaraStream) {
            if (this.video.srcObject !== window.camaraStream) {
                this.video.srcObject = window.camaraStream;
            }
            this.video.play().catch(() => {
            });
        }
        if (!this.video) {
            console.warn("La cámara todavía no está disponible. El juego continuará sin control por cámara.");
        } else {
            this.video.style.position = "fixed";
            this.video.style.bottom = "10px";
            this.video.style.right = "10px";
            this.video.style.width = "320px";
            this.video.style.height = "180px";
            this.video.style.objectFit = "cover";
            this.video.style.opacity = "1";
            this.video.style.visibility = "visible";
            this.video.style.display = "block";
            this.video.style.border = "2px solid #ffffff";
            this.video.style.borderRadius = "8px";
            this.video.style.transform = "scaleX(-1)";
            this.video.style.pointerEvents = "none";
            this.video.style.zIndex = "9999";
        }

        this.saltoPendiente = null;
        this.esperandoDesde = null;

        this.ultimoVideoTime = -1;
        this.sinDeteccionDesde = null;
        this.erroresSeguidos = 0;

        // Si todavía no empezó la carga del modelo, empieza ahora
        ControlCamara.precargar();
    }

    // =================================================================
    // CARGA DE MEDIAPIPE (una sola vez por página; se comparte entre
    // partidas y reinicios)
    // =================================================================
    static precargar() {
        if (ControlCamara._promesa) {
            return ControlCamara._promesa;
        }
        ControlCamara._estado = "cargando";
        ControlCamara._promesa = ControlCamara._cargar();
        return ControlCamara._promesa;
    }

    static _fuentes() {
        const c = ControlCamara.MEDIAPIPE;
        const absoluta = (ruta) => new URL(ruta, document.baseURI).href;
        const lista = [];
        if (c.usarLocal) {
            lista.push({
                nombre: "local",
                bundle: absoluta(c.rutaLocal + "vision_bundle.mjs"),
                wasm: absoluta(c.rutaLocal + "wasm"),
                modelo: absoluta(c.rutaLocal + "pose_landmarker_lite.task")
            });
        }
        // Dos servidores distintos con la MISMA versión fija: si uno está
        // caído o bloqueado en una red, el otro suele responder.
        const hosts = [
            ["jsdelivr", "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@"],
            ["unpkg", "https://unpkg.com/@mediapipe/tasks-vision@"]
        ];
        hosts.forEach((h) => {
            const base = h[1] + c.version;
            lista.push({
                nombre: "cdn " + h[0] + " " + c.version,
                bundle: base + "/vision_bundle.mjs",
                wasm: base + "/wasm",
                modelo: c.modeloUrl
            });
        });
        return lista;
    }

    // Falla si la promesa tarda más de "ms" (evita quedarse cargando para siempre)
    static _conTiempo(promesa, ms, nombre) {
        return new Promise((resolver, rechazar) => {
            const reloj = window.setTimeout(() => {
                rechazar(new Error("tiempo agotado (" + nombre + ")"));
            }, ms);
            promesa.then((valor) => {
                window.clearTimeout(reloj);
                resolver(valor);
            }, (error) => {
                window.clearTimeout(reloj);
                rechazar(error);
            });
        });
    }

    static async _crearLandmarker(modulo, vision, modelo) {
        const c = ControlCamara.MEDIAPIPE;
        const opciones = (delegado) => ({
            baseOptions: { modelAssetPath: modelo, delegate: delegado },
            runningMode: "VIDEO",
            numPoses: c.personas,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        if (c.delegado === "GPU") {
            try {
                const objeto = await modulo.PoseLandmarker.createFromOptions(vision, opciones("GPU"));
                return { objeto: objeto, delegado: "GPU" };
            } catch (error) {
                console.warn("[Camara] La GPU no está disponible para MediaPipe, se usa la CPU:", error);
            }
        }
        const objeto = await modulo.PoseLandmarker.createFromOptions(vision, opciones("CPU"));
        return { objeto: objeto, delegado: "CPU" };
    }

    static async _cargar() {
        const c = ControlCamara.MEDIAPIPE;
        let ronda = 0;
        // No hay "método de respaldo": si ninguna fuente responde, se espera
        // y se vuelve a intentar (3 s, 6 s, 12 s... hasta 30 s) sin recargar
        // la página. Mientras tanto la partida usa teclado / botones.
        while (ControlCamara._estado !== "listo") {
            ronda++;
            ControlCamara._estado = "cargando";
            const errores = [];
            const fuentes = ControlCamara._fuentes();
            for (let i = 0; i < fuentes.length; i++) {
                const fuente = fuentes[i];
                try {
                    const preparar = (async () => {
                        const modulo = await import(fuente.bundle);
                        const vision = await modulo.FilesetResolver.forVisionTasks(fuente.wasm);
                        return ControlCamara._crearLandmarker(modulo, vision, fuente.modelo);
                    })();
                    const listo = await ControlCamara._conTiempo(preparar, c.tiempoMaximoMs, fuente.nombre);
                    ControlCamara._landmarker = listo.objeto;
                    ControlCamara._delegado = listo.delegado;
                    ControlCamara._fuente = fuente.nombre;
                    ControlCamara._estado = "listo";
                    ControlCamara._error = null;
                    console.log("[Camara] detector de cuerpo listo v" + ControlCamara.VERSION,
                        "| fuente:", fuente.nombre, "| delegado:", listo.delegado,
                        "| intento:", ronda);
                    return;
                } catch (error) {
                    errores.push(fuente.nombre + ": " + (error && error.message ? error.message : error));
                    console.warn("[Camara] No se pudo cargar MediaPipe desde", fuente.nombre, error);
                }
            }
            ControlCamara._estado = "error";
            ControlCamara._error = errores.join(" | ");
            const espera = Math.min(c.reintentoMaxMs, c.reintentoBaseMs * ronda);
            console.warn("[Camara] MediaPipe no cargó (intento " + ronda + "). Reintento en " +
                Math.round(espera / 1000) + " s.", ControlCamara._error);
            await new Promise((resolver) => window.setTimeout(resolver, espera));
        }
    }

    // Si el detector se descompone en plena sesión (lecturas que fallan),
    // se cierra y se vuelve a crear desde cero, sin recargar la página.
    static _reiniciarDetector(motivo) {
        console.warn("[Camara] Reiniciando el detector:", motivo);
        try {
            if (ControlCamara._landmarker && ControlCamara._landmarker.close) {
                ControlCamara._landmarker.close();
            }
        } catch (e) { /* ya estaba cerrado */ }
        ControlCamara._landmarker = null;
        ControlCamara._estado = "error";
        ControlCamara._error = motivo;
        ControlCamara._promesa = null;
        ControlCamara.precargar();
    }

    // Estado del detector, para revisarlo desde la consola (F12)
    static diagnostico() {
        const datos = {
            version: ControlCamara.VERSION,
            estado: ControlCamara._estado,
            fuente: ControlCamara._fuente,
            delegado: ControlCamara._delegado,
            msPorLectura: Math.round(ControlCamara._ms * 10) / 10,
            error: ControlCamara._error
        };
        console.log("[Camara]", JSON.stringify(datos));
        return datos;
    }

    // =================================================================
    // POSICIÓN DEL TORSO (0 = borde izquierdo de la imagen, 1 = derecho)
    // Usa el punto medio de los hombros y de las caderas. Si hay varias
    // personas, se queda con la más grande (la más cercana). Devuelve
    // null si no hay nadie claramente visible.
    // =================================================================
    static _par(pose, a, b) {
        const p1 = pose[a];
        const p2 = pose[b];
        if (!p1 || !p2) {
            return null;
        }
        const minimo = ControlCamara.TORSO.visibilidadMinima;
        const v1 = typeof p1.visibility === "number" ? p1.visibility : 1;
        const v2 = typeof p2.visibility === "number" ? p2.visibility : 1;
        if (v1 < minimo || v2 < minimo) {
            return null;
        }
        return { x: (p1.x + p2.x) / 2, ancho: Math.abs(p1.x - p2.x) };
    }

    static posicionTorso(resultado) {
        const poses = resultado && resultado.landmarks;
        if (!poses || poses.length === 0) {
            return null;
        }
        let mejorX = null;
        let mejorEscala = 0;
        for (let i = 0; i < poses.length; i++) {
            const pose = poses[i];
            if (!pose) {
                continue;
            }
            // 11 y 12 = hombros, 23 y 24 = caderas
            const pares = [ControlCamara._par(pose, 11, 12), ControlCamara._par(pose, 23, 24)]
                .filter((par) => par !== null);
            if (pares.length === 0) {
                continue;
            }
            const escala = Math.max.apply(null, pares.map((par) => par.ancho));
            if (escala < ControlCamara.TORSO.anchoMinimo) {
                continue;   // demasiado pequeño: alguien muy lejos o un falso positivo
            }
            if (escala > mejorEscala) {
                mejorEscala = escala;
                mejorX = pares.reduce((suma, par) => suma + par.x, 0) / pares.length;
            }
        }
        return mejorX;
    }

    // -----------------------------------------------------------------
    // RECHAZO DE SALTOS FALSOS: una lectura que salta más de 25% del
    // ancho de golpe suele ser un error puntual. Solo se acepta si la
    // lectura SIGUIENTE confirma esa misma zona.
    // (Un movimiento rápido real sí se confirma, así que no se pierde.)
    // -----------------------------------------------------------------
    esSaltoFalso(objetivo) {
        const actual = this.escena.jugador.targetX;
        if (actual === undefined) {
            return false;
        }
        const ancho = this.escena.scale.width;
        if (Math.abs(objetivo - actual) <= ancho * 0.25) {
            this.saltoPendiente = null;
            return false;
        }
        if (this.saltoPendiente !== null && Math.abs(objetivo - this.saltoPendiente) < ancho * 0.12) {
            this.saltoPendiente = null;
            return false;
        }
        this.saltoPendiente = objetivo;
        return true;
    }

    // -----------------------------------------------------------------
    // APLICAR POSICIÓN: convierte la posición (0..1, ya espejada) en el
    // objetivo del personaje. Recibe la posición del torso detectado.
    //   1) Sensibilidad (ajuste del jugador) y límites del área jugable
    //   2) Rechazo de saltos falsos
    //   3) Zona muerta: cambios muy pequeños se ignoran, así el
    //      temblor normal de la detección no mueve al personaje
    //   4) Suavizado (ajuste del jugador)
    // -----------------------------------------------------------------
    aplicarPosicion(proporcionX) {
        const escena = this.escena;
        const j = escena.jugador;
        const ancho = escena.scale.width;

        proporcionX = 0.5 + (proporcionX - 0.5) * Preferencias.sensibilidadCamara();
        proporcionX = Phaser.Math.Clamp(proporcionX, 0, 1);
        const limiteIzquierdo = escena.margenLateral + j.radio;
        const limiteDerecho = ancho - escena.margenLateral - j.radio;
        const objetivo = Phaser.Math.Clamp(proporcionX * ancho, limiteIzquierdo, limiteDerecho);

        if (this.esSaltoFalso(objetivo)) {
            return;     // lectura sospechosa: se ignora hasta que se confirme
        }
        if (j.targetX === undefined) {
            j.targetX = objetivo;
            return;
        }
        let diferencia = objetivo - j.targetX;
        const zona = ancho * ControlCamara.ZONA_MUERTA;
        if (Math.abs(diferencia) <= zona) {
            return;     // dentro de la zona muerta: el personaje no se mueve
        }
        diferencia -= Math.sign(diferencia) * zona;
        j.targetX += diferencia * Preferencias.filtroCamara();
    }

    // -----------------------------------------------------------------
    // ACTUALIZAR (cada frame): las lecturas se hacen cada ~33 ms, o más
    // espaciadas si la computadora tarda mucho en cada una
    // -----------------------------------------------------------------
    actualizar(time) {
        const ahora = performance.now();
        const listo = ControlCamara._estado === "listo";

        // Vigilante (solo en una partida real, no en la prueba de AJUSTES):
        // si el detector no está listo, el jugador NO se queda atrapado; la
        // partida pasa sola a teclado (A / D, flechas) o botones táctiles,
        // que juego.js ya sabe activar con window.camaraFallo.
        if (listo) {
            this.esperandoDesde = null;
        } else if (this.escena.juegoActivo === true) {
            if (this.esperandoDesde === null) {
                this.esperandoDesde = ahora;
            }
            const demasiado = ahora - this.esperandoDesde > ControlCamara.MEDIAPIPE.esperaMaximaMs;
            if (ControlCamara._estado === "error" || demasiado) {
                if (window.camaraFallo !== true) {
                    console.warn("[Camara] Detector no disponible (" + ControlCamara._estado +
                        "). Se usa teclado / botones en esta partida.");
                    window.camaraFallo = true;
                }
                this.ocultarAviso();
                return;
            }
        }

        const espera = listo ? Math.max(33, this.msInferencia * 2) : 33;
        if (!this.ultimoTiempo || time - this.ultimoTiempo >= espera) {
            this.procesarMovimiento();
            this.ultimoTiempo = time;
        }
        this.actualizarAviso();
    }

    mostrarVideo() {
        this.ocultarAviso();
        if (this.video) {
            this.video.style.display = "block";
            this.video.style.visibility = "visible";
            this.video.style.opacity = "1";
        }
    }

    // -----------------------------------------------------------------
    // PROCESAMIENTO: SOLO el seguimiento de torso y hombros (esqueleto).
    // Mientras el detector no está listo el personaje espera quieto.
    // -----------------------------------------------------------------
    procesarMovimiento() {
        if (ControlCamara._estado === "listo") {
            this.procesarEsqueleto();
        }
    }

    procesarEsqueleto() {
        const video = this.video;
        if (!video || video.readyState < 2 || !video.videoWidth) {
            return;
        }
        if (video.currentTime === this.ultimoVideoTime) {
            return;     // todavía es el mismo fotograma
        }
        this.ultimoVideoTime = video.currentTime;

        const inicio = performance.now();
        let resultado = null;
        try {
            resultado = ControlCamara._landmarker.detectForVideo(video, inicio);
            this.erroresSeguidos = 0;
        } catch (error) {
            this.erroresSeguidos++;
            console.warn("[Camara] Falló una lectura del esqueleto (" + this.erroresSeguidos + "):", error);
            if (this.erroresSeguidos >= 5) {
                this.erroresSeguidos = 0;
                ControlCamara._reiniciarDetector("fallaron 5 lecturas seguidas: " +
                    (error && error.message ? error.message : error));
            }
            return;
        }
        const duracion = performance.now() - inicio;
        this.msInferencia = this.msInferencia ? this.msInferencia * 0.8 + duracion * 0.2 : duracion;
        ControlCamara._ms = this.msInferencia;

        const x = ControlCamara.posicionTorso(resultado);
        if (x === null) {
            if (this.sinDeteccionDesde === null) {
                this.sinDeteccionDesde = inicio;
            }
            return;     // no se ve a nadie: el personaje se queda donde está
        }
        this.sinDeteccionDesde = null;
        this.aplicarPosicion(1 - x);    // espejo: la imagen se ve como en un espejo
    }

    // -----------------------------------------------------------------
    // AVISO EN PANTALLA (solo durante la partida)
    // -----------------------------------------------------------------
    actualizarAviso() {
        const escena = this.escena;
        let texto = null;
        if (escena.juegoActivo === true && escena.gameOver !== true) {
            const estado = ControlCamara._estado;
            if (!this.video) {
                texto = Idioma.t("ajustes.sinCamara");
            } else if (estado === "cargando") {
                texto = Idioma.dato(ControlCamara.TEXTOS.cargando);
            } else if (estado === "listo" && this.sinDeteccionDesde !== null &&
                performance.now() - this.sinDeteccionDesde > ControlCamara.AVISO_SIN_DETECCION_MS) {
                texto = Idioma.dato(ControlCamara.TEXTOS.sinDeteccion);
            }
        }
        if (texto === null) {
            this.ocultarAviso();
        } else {
            this.mostrarAviso(texto);
        }
    }

    mostrarAviso(texto) {
        const escena = this.escena;
        if (!this.aviso || !this.aviso.scene) {
            this.aviso = escena.add.text(escena.scale.width / 2, escena.scale.height - 60, texto, {
                fontSize: "22px",
                fill: "#ffea00",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 5,
                align: "center",
                wordWrap: { width: escena.scale.width - 80 }
            }).setOrigin(0.5).setDepth(120).setScrollFactor(0);
        }
        if (this.aviso.text !== texto) {
            this.aviso.setText(texto);
        }
        this.aviso.setVisible(true);
    }

    ocultarAviso() {
        if (this.aviso && this.aviso.scene) {
            this.aviso.setVisible(false);
        }
    }

}

// ---------------------------------------------------------------------
// AJUSTES DEL DETECTOR
// ---------------------------------------------------------------------
// Versión del módulo (súbela si cambias la lógica de arriba)
ControlCamara.VERSION = 5;

ControlCamara.MEDIAPIPE = {
    // Versión FIJA de la librería (nunca "latest": así no cambia sola un día).
    version: "0.10.14",
    // Archivos propios dentro del proyecto (la opción más segura: el juego
    // deja de depender de internet y de cualquier CDN). Copia en esta ruta
    //   vision_bundle.mjs,  la carpeta  wasm/  y  pose_landmarker_lite.task
    // y pon usarLocal en true. Si falta algo, se usa el CDN automáticamente.
    // Necesita abrir el juego desde un servidor (no con doble clic).
    usarLocal: false,
    rutaLocal: "libs/mediapipe/",
    modeloUrl: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    // "GPU" (más rápido, con CPU de respaldo automático) o "CPU" (más
    // parejo en equipos raros; pruébalo si la GPU da problemas).
    delegado: "GPU",
    // Personas que busca a la vez. Con más de 1 se queda con la más cercana.
    personas: 1,
    // Si una fuente tarda más que esto en cargar, se pasa a la siguiente
    tiempoMaximoMs: 40000,
    // Si ninguna fuente responde: espera antes de reintentar (crece por ronda)
    reintentoBaseMs: 3000,
    reintentoMaxMs: 30000,
    // Si en plena partida el detector sigue sin estar listo tras este
    // tiempo, esa partida pasa a teclado / botones (el detector sigue
    // cargando por detrás para la siguiente)
    esperaMaximaMs: 8000
};

// Qué cuenta como "torso visible"
ControlCamara.TORSO = {
    visibilidadMinima: 0.5,   // confianza mínima de cada hombro / cadera
    anchoMinimo: 0.08         // ancho mínimo del torso (fracción del ancho de la imagen)
};

// Zona muerta: cambios menores a este % del ancho de pantalla se ignoran.
// Súbela (0.02) si el personaje todavía tiembla; bájala (0.006) si
// sientes que tarda en reaccionar a movimientos pequeños.
ControlCamara.ZONA_MUERTA = 0.012;

// Tras cuántos ms sin ver a nadie se muestra "No te veo..."
ControlCamara.AVISO_SIN_DETECCION_MS = 1500;

ControlCamara.TEXTOS = {
    cargando: {
        es: "Preparando la detección de tu cuerpo…",
        en: "Getting body detection ready…"
    },
    sinDeteccion: {
        es: "No te veo: colócate frente a la cámara con el torso a la vista",
        en: "I can't see you: stand in front of the camera with your torso in view"
    }
};

// Estado compartido de la carga (vive mientras la página esté abierta)
ControlCamara._estado = "sin_iniciar";   // sin_iniciar | cargando | listo | error
ControlCamara._promesa = null;
ControlCamara._landmarker = null;
ControlCamara._fuente = null;
ControlCamara._delegado = null;
ControlCamara._error = null;
ControlCamara._ms = 0;

// El modelo se empieza a descargar un instante después de abrir la página
// (mientras el jugador elige versión), para que ya esté listo al jugar.
window.addEventListener("load", function () {
    window.setTimeout(function () {
        ControlCamara.precargar();
    }, 1500);
});


// =====================================================================
// CONTROLES: qué método de control usa el jugador + cámara web global
//
//   Controles.usaCamara()  -> el jugador eligió jugar con la cámara (AJUSTES)
//   Controles.manual()     -> se juega con teclado (A / D) o botones en
//                             pantalla: cámara apagada en AJUSTES, o la
//                             cámara no pudo iniciar (permiso negado, etc.)
//   Controles.esTactil()   -> celular / tableta
// =====================================================================
class Controles {

    // ¿El dispositivo se maneja con los dedos?
    static esTactil() {
        try {
            if (window.matchMedia) {
                if (window.matchMedia("(pointer: coarse)").matches) {
                    return true;
                }
                if (navigator.maxTouchPoints > 0 && !window.matchMedia("(pointer: fine)").matches) {
                    return true;
                }
                return false;
            }
        } catch (e) { /* se usa el respaldo de abajo */ }
        return (navigator.maxTouchPoints || 0) > 0;
    }

    // Grupo "control" dentro de los ajustes guardados.
    // (Restablecer ajustes lo borra y vuelve al valor de fábrica: cámara activa.)
    static _cfg() {
        const a = Preferencias.cfg();
        if (!a.control || typeof a.control !== "object" || Array.isArray(a.control)) {
            a.control = {};
        }
        if (typeof a.control.usarCamara !== "boolean") {
            a.control.usarCamara = true;
        }
        return a.control;
    }

    static usaCamara() {
        return Controles._cfg().usarCamara;
    }

    static setUsaCamara(valor) {
        Controles._cfg().usarCamara = valor === true;
        Preferencias.guardar();
    }

    static manual() {
        return !Controles.usaCamara() || window.camaraFallo === true;
    }

    // -----------------------------------------------------------------
    // CÁMARA WEB GLOBAL (un solo <video> para todo el juego)
    // -----------------------------------------------------------------
    static crearVideo() {
        const existente = document.getElementById("camara-juego");
        if (existente) {
            window.camaraVideo = existente;
            return;
        }
        const video = document.createElement("video");
        video.id = "camara-juego";
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.width = 320;
        video.height = 180;
        video.setAttribute("autoplay", "");
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.style.position = "fixed";
        video.style.bottom = "10px";
        video.style.right = "10px";
        video.style.width = "320px";
        video.style.height = "180px";
        video.style.objectFit = "cover";
        video.style.border = "2px solid #ffffff";
        video.style.borderRadius = "8px";
        video.style.transform = "scaleX(-1)";
        video.style.pointerEvents = "none";
        video.style.zIndex = "9999";
        video.style.backgroundColor = "#000000";
        video.style.display = "block";
        document.body.appendChild(video);
        window.camaraVideo = video;
    }

    static conectar(stream) {
        if (!stream) {
            return;
        }
        Controles.crearVideo();
        const video = window.camaraVideo;
        if (!video) {
            return;
        }
        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }
        video.play().catch(() => {});
    }

    static mostrarVideo() {
        const video = window.camaraVideo;
        if (!video) {
            return;
        }
        video.style.position = "fixed";
        video.style.bottom = "10px";
        video.style.right = "10px";
        video.style.width = "320px";
        video.style.height = "180px";
        video.style.display = "block";
        video.style.opacity = "1";
        video.style.visibility = "visible";
        video.style.zIndex = "9999";
        video.style.border = "2px solid #ffffff";
        video.style.borderRadius = "8px";
        video.style.transform = "scaleX(-1)";
        video.style.pointerEvents = "none";
    }

    static ocultarVideo() {
        if (window.camaraVideo) {
            window.camaraVideo.style.display = "none";
        }
    }

    static _esperar() {
        let intentos = 0;
        const comprobar = () => {
            intentos++;
            if (window.camaraStream && window.camaraStream.active) {
                Controles.conectar(window.camaraStream);
                Controles.mostrarVideo();
                return;
            }
            if (intentos >= 100 || !window.camaraInicializando) {
                return;
            }
            setTimeout(comprobar, 100);
        };
        comprobar();
    }

    static _recuperar(stream) {
        if (!stream) {
            return;
        }
        stream.getVideoTracks().forEach((track) => {
            track.addEventListener("ended", () => {
                console.warn("La pista de cámara terminó. Intentando recuperar la cámara...");
                window.camaraStream = null;
                window.camaraInicializando = false;
                setTimeout(() => {
                    if (Controles.usaCamara()) {
                        Controles.iniciarCamara();
                    }
                }, 1000);
            });
        });
    }

    // Enciende la cámara (pide permiso si hace falta). Si el jugador la
    // apagó en AJUSTES, no hace nada y la deja apagada.
    // Si falla, window.camaraFallo = true y el juego pasa solo a teclado/botones.
    static iniciarCamara() {
        if (!Controles.usaCamara()) {
            Controles.detenerCamara();
            return;
        }
        if (window.camaraStream && window.camaraStream.active) {
            window.camaraFallo = false;
            Controles.conectar(window.camaraStream);
            Controles.mostrarVideo();
            return;
        }
        if (window.camaraInicializando) {
            Controles._esperar();
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("La cámara no está disponible en este navegador o contexto.");
            window.camaraFallo = true;
            return;
        }

        window.camaraInicializando = true;
        window.camaraFallo = false;
        Controles.crearVideo();

        navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                aspectRatio: { ideal: 16 / 9 }
            },
            audio: false
        })
        .then((stream) => {
            window.camaraInicializando = false;
            // Si mientras se pedía el permiso la apagaron en AJUSTES, se suelta
            if (!Controles.usaCamara()) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }
            window.camaraStream = stream;
            window.camaraFallo = false;
            Controles.conectar(stream);
            Controles._recuperar(stream);
            Controles.mostrarVideo();
        })
        .catch((error) => {
            window.camaraInicializando = false;
            window.camaraFallo = true;
            console.error("Error al acceder a la cámara web:", error);
            Controles.ocultarVideo();
        });
    }

    // Apaga la cámara por completo (se apaga también su luz)
    static detenerCamara() {
        const stream = window.camaraStream;
        window.camaraStream = null;
        window.camaraInicializando = false;
        window.camaraFallo = false;
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
        }
        const video = window.camaraVideo;
        if (video) {
            video.srcObject = null;
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
        }
        window.camaraVideo = null;
    }
}

// Evita que el navegador del celular haga zoom, scroll o "tirar para
// recargar" mientras se juega con los dedos.
(function () {
    const estilo = document.createElement("style");
    estilo.id = "estilo-controles-tactiles";
    estilo.textContent =
        "html, body { overscroll-behavior: none; touch-action: none; " +
        "-webkit-user-select: none; user-select: none; -webkit-touch-callout: none; } " +
        "canvas { touch-action: none; }";
    document.head.appendChild(estilo);
})();


// =====================================================================
// CONTROL MANUAL: se usa cuando NO se juega con la cámara.
//   Computadora: teclas A y D (también las flechas ← →)
//   Celular / tableta: dos botones de flecha en las franjas laterales
//
// Tiene la misma forma que ControlCamara (iniciar / actualizar /
// mostrarVideo), así el juego los usa igual.
// =====================================================================
class ControlManual {
    constructor(escena) {
        this.escena = escena;
        this.teclas = null;
        this.izquierda = false;   // botón en pantalla pulsado
        this.derecha = false;
        this.botones = [];
        this.aviso = null;
    }

    iniciar() {
        const escena = this.escena;
        Controles.ocultarVideo();

        if (escena.input.keyboard) {
            this.teclas = escena.input.keyboard.addKeys("A,D,LEFT,RIGHT");
        }
        // Permite mantener pulsado un botón mientras se toca otra cosa
        escena.input.addPointer(2);

        this.crearBotones();
        this.mostrarAvisoInicial();

        // Al volver de la pausa se sueltan todas las teclas y botones
        // (si se soltaron durante la pausa, el juego no se enteró)
        const alReanudar = () => this.reiniciarEntradas();
        escena.events.on("resume", alReanudar);
        escena.events.once("shutdown", () => escena.events.off("resume", alReanudar));
    }

    reiniciarEntradas() {
        this.izquierda = false;
        this.derecha = false;
        if (this.teclas && this.escena.input.keyboard) {
            this.escena.input.keyboard.resetKeys();
        }
        this.botones.forEach((b) => b.soltar());
    }

    // -----------------------------------------------------------------
    // BOTONES EN PANTALLA (dentro de las franjas laterales, sin tapar la
    // zona jugable)
    // -----------------------------------------------------------------
    crearBotones() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        const margen = escena.margenLateral || window.calcularMargenMarco(ancho);
        const radio = Math.max(50, Math.min(margen / 2 - 14, 100));
        const y = alto - radio - 50;

        this.botones = [
            this.crearBoton(margen / 2, y, radio, -1),
            this.crearBoton(ancho - margen / 2, y, radio, 1)
        ];

        // En computadora solo se ven si se toca la pantalla (pantalla táctil)
        const visible = Controles.esTactil();
        this.botones.forEach((b) => b.mostrar(visible));
        if (!visible) {
            const alTocar = (puntero) => {
                if (puntero.wasTouch) {
                    this.botones.forEach((b) => b.mostrar(true));
                    escena.input.off("pointerdown", alTocar);
                }
            };
            escena.input.on("pointerdown", alTocar);
        }
    }

    crearBoton(x, y, radio, dir) {
        const escena = this.escena;
        const fondo = escena.add.circle(x, y, radio, 0x000000, 0.35)
            .setStrokeStyle(5, 0xffffff, 0.8)
            .setDepth(150);
        const flecha = escena.add.graphics().setDepth(151);

        const dibujar = (pulsado) => {
            fondo.setFillStyle(pulsado ? 0xffffff : 0x000000, pulsado ? 0.45 : 0.35);
            flecha.clear();
            flecha.fillStyle(0xffffff, pulsado ? 1 : 0.85);
            const a = radio * 0.42;
            flecha.fillTriangle(
                x + dir * a * 0.9, y,
                x - dir * a * 0.7, y - a,
                x - dir * a * 0.7, y + a
            );
        };
        const poner = (valor) => {
            if (dir < 0) {
                this.izquierda = valor;
            } else {
                this.derecha = valor;
            }
            dibujar(valor);
        };

        fondo.setInteractive();
        fondo.on("pointerdown", () => poner(true));
        fondo.on("pointerover", (puntero) => {
            if (puntero.isDown) {
                poner(true);
            }
        });
        fondo.on("pointerup", () => poner(false));
        fondo.on("pointerout", () => poner(false));
        dibujar(false);

        return {
            mostrar: (visible) => {
                fondo.setVisible(visible);
                flecha.setVisible(visible);
                if (!visible) {
                    poner(false);
                }
            },
            soltar: () => dibujar(false)
        };
    }

    // Se llama al terminar la partida
    ocultarBotones() {
        this.botones.forEach((b) => b.mostrar(false));
        this.izquierda = false;
        this.derecha = false;
    }

    mostrarAvisoInicial() {
        const escena = this.escena;
        const clave = Controles.esTactil() ? "juego.avisoTactil" : "juego.avisoTeclado";
        this.aviso = escena.add.text(escena.scale.width / 2, escena.scale.height - 60, Idioma.t(clave), {
            fontSize: "22px",
            fill: "#ffea00",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
            align: "center",
            wordWrap: { width: escena.scale.width - 80 }
        }).setOrigin(0.5).setDepth(120);
        escena.tweens.add({
            targets: this.aviso,
            alpha: 0,
            delay: 6000,
            duration: 900
        });
    }

    // -----------------------------------------------------------------
    // ACTUALIZAR (cada frame): mueve el OBJETIVO del personaje; el
    // personaje lo sigue con el mismo suavizado de siempre.
    // -----------------------------------------------------------------
    actualizar(time, delta) {
        const escena = this.escena;
        const j = escena.jugador;
        if (!j) {
            return;
        }
        const t = this.teclas;
        const izq = this.izquierda || (t && (t.A.isDown || t.LEFT.isDown));
        const der = this.derecha || (t && (t.D.isDown || t.RIGHT.isDown));
        let dir = 0;
        if (izq) {
            dir -= 1;
        }
        if (der) {
            dir += 1;
        }
        if (dir === 0) {
            return;
        }
        const dt = Math.min(delta || 16, 50) / 1000;
        const ancho = escena.scale.width;
        const minX = escena.margenLateral + j.radio;
        const maxX = ancho - escena.margenLateral - j.radio;
        const actual = Number.isFinite(j.targetX) ? j.targetX : j.x;
        j.targetX = Phaser.Math.Clamp(actual + dir * ancho * ControlManual.VELOCIDAD * dt, minX, maxX);
    }

    // Las pantallas finales piden mostrar el video de la cámara: aquí no hay
    mostrarVideo() {
    }
}

// Velocidad con teclas / botones: fracción del ancho de pantalla por segundo
// (0.7 = cruza la pantalla en poco más de 1 segundo). Bájala si se siente brusco.
ControlManual.VELOCIDAD = 0.7;