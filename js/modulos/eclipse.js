class Eclipse {
    constructor(escena) {
        this.escena = escena;
        this.graficos = null;
        this.estado = "inactivo";   // "inactivo" | "entrando" | "descendiendo"
        this.tiempo = 0;
        this.tiempoEntrada = 0;
        this.frente = 0;            // y del punto MÁS BAJO del borde
        this.velocidad = 0;         // px por segundo
        this.retrocesoPendiente = 0;

        // ---------------- AJUSTES (aquí se afina la dificultad) ----------------
        this.cfg = {
            segundosParaLlegar: 42,   // segundos (de juego activo) que tarda en alcanzar al jugador
            yInicial: 30,             // dónde queda el borde al terminar de entrar
            retroceso: 110,           // px que sube con cada supernova
            velocidadRetroceso: 240,  // px/s a los que sube (para que no sea un salto brusco)
            segundosEntrada: 2.2,     // duración del deslizamiento de entrada
            curvatura: 0.9,           // radio del borde = ancho * esto (menor = más curvo)
            distanciaAlerta: 150      // px de margen a partir de los cuales la corona se pone roja
        };

        // ---------------- AJUSTES DE LA TORMENTA (solo versión navideña) ----------------
        // Son solo visuales: no cambian la velocidad ni el alcance del eclipse.
        this.cfg.tormenta = {
            oleaje: 24,                   // px: altura de las "olas" del borde de la nube
            velocidadOleaje: 0.8,         // qué tan rápido se ondula la nube en calma
            empujeRafaga: 2.4,            // cuánto arrastra el viento al oleaje durante una ráfaga
            primeraRafaga: 2,             // s hasta la primera ráfaga
            entreRafagas: [2.8, 5.5],     // s (mín, máx) entre ráfagas
            duracionRafaga: [1.3, 2.2],   // s (mín, máx) que dura cada ráfaga
            rayasPorRafaga: [12, 17],     // líneas de viento por ráfaga
            entreRelampagos: [4.5, 9],    // s (mín, máx) entre relámpagos
            duracionRelampago: 0.55,      // s
            copos: 36                     // copos de nieve (0 = sin nieve)
        };
        this.tormenta = null;
    }

    crear() {
        this.graficos = this.escena.add.graphics().setDepth(-6).setVisible(false);
    }

    // -----------------------------------------------------------------
    // INICIAR: lo llama el jefe cuando empieza a subir a su lugar
    // -----------------------------------------------------------------
    iniciar() {
        if (this.estado !== "inactivo") {
            return;
        }
        const escena = this.escena;
        const j = escena.jugador;
        // Opcional: en window.configDificultad puedes poner  eclipse: 0.8  (más lento)  o  1.3  (más rápido)
        const mult = (escena.dificultad && escena.dificultad.eclipse) || 1;
        const yLlegada = j.y - j.radio * 0.7;
        this.velocidad = (yLlegada - this.cfg.yInicial) / this.cfg.segundosParaLlegar * mult;

        this.frente = this.yEntrada();
        this.tiempoEntrada = 0;
        this.retrocesoPendiente = 0;
        this.estado = "entrando";
        this.graficos.setVisible(true);
        if (escena.esNavidad) {
            this.prepararTormenta();
        }
        if (Preferencias.efectosVisuales()) {
            escena.cameras.main.shake(900, 0.004);
        }
        this.dibujar();
    }

    yEntrada() {
        return -this.escena.scale.width * 0.4;
    }

    // -----------------------------------------------------------------
    // Geometría: y del borde en una posición x
    // -----------------------------------------------------------------
    bordeEn(x) {
        const ancho = this.escena.scale.width;
        const R = ancho * this.cfg.curvatura;
        const dx = x - ancho / 2;
        return this.frente - R + Math.sqrt(Math.max(0, R * R - dx * dx));
    }

    // Píxeles libres entre el borde y la parte de arriba del jugador (<= 0 = contacto)
    margenAlJugador() {
        const j = this.escena.jugador;
        return (j.y - j.radio * 0.7) - this.bordeEn(j.x);
    }

    // -----------------------------------------------------------------
    // SUPERNOVA: empuja el eclipse hacia arriba (de forma suave)
    // -----------------------------------------------------------------
    retroceder() {
        if (this.estado !== "descendiendo") {
            return;
        }
        this.retrocesoPendiente += this.cfg.retroceso;
    }

    // -----------------------------------------------------------------
    // ACTUALIZAR (cada frame)
    // -----------------------------------------------------------------
    actualizar(deltaSecs) {
        if (this.estado === "inactivo" || this.escena.gameOver) {
            return;
        }
        const dt = Math.min(deltaSecs, 0.05);
        this.tiempo += dt;
        if (this.escena.esNavidad) {
            this.actualizarTormenta(dt);
        }

        if (this.estado === "entrando") {
            this.tiempoEntrada += dt;
            const p = Math.min(1, this.tiempoEntrada / this.cfg.segundosEntrada);
            const inicio = this.yEntrada();
            this.frente = inicio + (this.cfg.yInicial - inicio) * Phaser.Math.Easing.Cubic.Out(p);
            if (p >= 1) {
                this.estado = "descendiendo";
            }
        } else {
            this.frente += this.velocidad * dt;
            if (this.retrocesoPendiente > 0) {
                const paso = Math.min(this.retrocesoPendiente, this.cfg.velocidadRetroceso * dt);
                this.frente -= paso;
                this.retrocesoPendiente -= paso;
            }
            if (this.frente < this.cfg.yInicial) {
                this.frente = this.cfg.yInicial;
                this.retrocesoPendiente = 0;
            }
        }

        this.dibujar();

        if (this.estado === "descendiendo" && this.margenAlJugador() <= 0) {
            this.escena.modFin.perder();
        }
    }

    // -----------------------------------------------------------------
    // DIBUJO: según la versión, eclipse (normal) o tormenta (navideña)
    // -----------------------------------------------------------------
    dibujar() {
        if (this.escena.esNavidad) {
            this.dibujarTormenta();
        } else {
            this.dibujarEclipse();
        }
    }

    // -----------------------------------------------------------------
    // DIBUJO (versión normal): sombra con borde curvo, penumbra y corona luminosa
    // -----------------------------------------------------------------
    dibujarEclipse() {
        const escena = this.escena;
        const g = this.graficos;
        const ancho = escena.scale.width;
        const pasos = 36;

        // Puntos del borde de izquierda a derecha
        const base = [];
        for (let i = 0; i <= pasos; i++) {
            const x = -20 + (ancho + 40) * i / pasos;
            base.push({ x: x, y: this.bordeEn(x) });
        }
        const desplazado = (dy) => base.map((p) => ({ x: p.x, y: p.y + dy }));
        const rellenar = (puntos, color, alpha) => {
            const poligono = [{ x: -20, y: -60 }, { x: ancho + 20, y: -60 }];
            for (let i = puntos.length - 1; i >= 0; i--) {
                poligono.push(puntos[i]);
            }
            g.fillStyle(color, alpha);
            g.fillPoints(poligono, true);
        };

        const alerta = this.margenAlJugador() < this.cfg.distanciaAlerta;
        const colorCorona = alerta ? 0xff2200 : (escena.esNavidad ? 0x9be7ff : 0xffa030);
        const colorBorde = alerta ? 0xff8866 : (escena.esNavidad ? 0xffffff : 0xfff2c0);
        const pulso = 0.8 + 0.2 * Math.sin(this.tiempo * (alerta ? 9 : 3));

        g.clear();

        // Penumbra suave por debajo del borde
        rellenar(desplazado(36), 0x000000, 0.18);
        rellenar(desplazado(18), 0x000000, 0.28);

        // Corona: líneas anchas y transparentes sobre el borde
        [[34, 0.07], [20, 0.12], [9, 0.25]].forEach((capa) => {
            g.lineStyle(capa[0], colorCorona, capa[1] * pulso);
            g.strokePoints(base, false);
        });

        // Sombra principal (tapa la mitad interior de la corona)
        rellenar(base, 0x04000c, 0.94);

        // Filo brillante
        g.lineStyle(3, colorBorde, 0.95 * pulso);
        g.strokePoints(base, false);
    }

    // =================================================================
    // TORMENTA (versión navideña)
    //   - Nubarrón con borde esponjoso que se ondula.
    //   - Ráfagas de viento: líneas que cruzan la pantalla, la nieve sale
    //     disparada de lado y las olas de la nube se deslizan con el viento.
    //   - Relámpagos DENTRO de la nube (nunca llegan hasta el jugador).
    //     Si el jugador desactivó "Destellos y sacudidas", no hay relámpagos.
    // Todo se mueve desde actualizar() (sin tweens), igual que el jefe.
    // =================================================================
    azar(rango) {
        return rango[0] + Math.random() * (rango[1] - rango[0]);
    }

    prepararTormenta() {
        const ancho = this.escena.scale.width;
        const alto = this.escena.scale.height;
        const C = this.cfg.tormenta;
        const copos = [];
        for (let i = 0; i < C.copos; i++) {
            copos.push({
                x: Math.random() * ancho,
                y: Math.random() * alto,
                r: 1 + Math.random() * 1.8,
                vy: 35 + Math.random() * 55,
                fase: Math.random() * Math.PI * 2
            });
        }
        this.tormenta = {
            tiempo: 0,
            fase: 0,                              // desplazamiento de las olas de la nube
            rafaga: null,
            ultimaDir: 1,
            proximaRafaga: C.primeraRafaga,
            relampago: null,
            proximoRelampago: this.azar(C.entreRelampagos),
            copos: copos
        };
    }

    // 0 = sin viento, 1 = ráfaga en su punto máximo
    intensidadRafaga() {
        const r = this.tormenta && this.tormenta.rafaga;
        return r ? Math.sin(Math.PI * Math.min(1, r.t / r.dur)) : 0;
    }

    lanzarRafaga() {
        const T = this.tormenta;
        const C = this.cfg.tormenta;
        const alto = this.escena.scale.height;
        // Casi siempre cambia de lado, para que se sienta variada
        const dir = Math.random() < 0.65 ? -T.ultimaDir : T.ultimaDir;
        T.ultimaDir = dir;
        const dur = this.azar(C.duracionRafaga);
        const cantidad = Math.round(this.azar(C.rayasPorRafaga));
        const rayas = [];
        for (let i = 0; i < cantidad; i++) {
            rayas.push({
                y: alto * (0.08 + Math.random() * 0.87),
                largo: 140 + Math.random() * 200,
                vel: 1100 + Math.random() * 800,
                grosor: 1.5 + Math.random() * 1.5,
                alpha: 0.25 + Math.random() * 0.3,
                fase: Math.random() * Math.PI * 2,
                onda: 2 + Math.random() * 5,
                retraso: Math.random() * dur * 0.35
            });
        }
        T.rafaga = { t: 0, dur: dur, dir: dir, rayas: rayas };
    }

    lanzarRelampago() {
        const T = this.tormenta;
        const ancho = this.escena.scale.width;
        const cx = ancho * (0.15 + Math.random() * 0.7);
        // Rayo en zigzag; "dy" se mide desde el borde de la nube (hacia arriba)
        const rayo = [];
        const tramos = 7;
        let x = cx;
        for (let i = 0; i <= tramos; i++) {
            rayo.push({ x: x, dy: -190 + (184 * i) / tramos });
            x += (Math.random() - 0.5) * 46;
        }
        T.relampago = { t: 0, dur: this.cfg.tormenta.duracionRelampago, cx: cx, rayo: rayo };
    }

    // Brillo del relámpago (0..1): dos destellos seguidos que se apagan
    brilloRelampago() {
        const r = this.tormenta && this.tormenta.relampago;
        if (!r) {
            return 0;
        }
        const p = Math.min(1, r.t / r.dur);
        if (p < 0.12) {
            return p / 0.12;
        }
        if (p < 0.28) {
            return 1 - ((p - 0.12) / 0.16) * 0.75;
        }
        if (p < 0.40) {
            return 0.25 + ((p - 0.28) / 0.12) * 0.75;
        }
        return Math.max(0, 1 - (p - 0.40) / 0.60);
    }

    actualizarTormenta(dt) {
        const T = this.tormenta;
        if (!T) {
            return;
        }
        const C = this.cfg.tormenta;
        const ancho = this.escena.scale.width;
        const alto = this.escena.scale.height;

        T.tiempo += dt;

        // Ráfagas
        if (T.rafaga) {
            T.rafaga.t += dt;
            if (T.rafaga.t >= T.rafaga.dur) {
                T.rafaga = null;
                T.proximaRafaga = this.azar(C.entreRafagas);
            }
        } else {
            T.proximaRafaga -= dt;
            if (T.proximaRafaga <= 0) {
                this.lanzarRafaga();
            }
        }
        const intensidad = this.intensidadRafaga();
        const dir = T.rafaga ? T.rafaga.dir : 0;

        // Las olas de la nube se deslizan hacia donde sopla el viento
        T.fase += dt * (C.velocidadOleaje - intensidad * C.empujeRafaga * dir);

        // Relámpagos
        if (T.relampago) {
            T.relampago.t += dt;
            if (T.relampago.t >= T.relampago.dur) {
                T.relampago = null;
                T.proximoRelampago = this.azar(C.entreRelampagos);
            }
        } else {
            T.proximoRelampago -= dt;
            if (T.proximoRelampago <= 0) {
                if (Preferencias.efectosVisuales()) {
                    this.lanzarRelampago();
                } else {
                    T.proximoRelampago = this.azar(C.entreRelampagos);
                }
            }
        }

        // Nieve: cae despacio y sale disparada de lado con las ráfagas
        const viento = dir * intensidad * 950;
        T.copos.forEach((c) => {
            c.y += (c.vy + intensidad * 25) * dt;
            c.x += (viento + Math.sin(T.tiempo * 0.8 + c.fase) * 20) * dt;
            if (c.y > alto + 10) {
                c.y = -10;
                c.x = Math.random() * ancho;
            }
            if (c.x < -10) {
                c.x = ancho + 10;
            } else if (c.x > ancho + 10) {
                c.x = -10;
            }
        });
    }

    dibujarTormenta() {
        if (!this.tormenta) {
            this.prepararTormenta();
        }
        const escena = this.escena;
        const g = this.graficos;
        const T = this.tormenta;
        const C = this.cfg.tormenta;
        const ancho = escena.scale.width;
        const pasos = 48;
        const intensidad = this.intensidadRafaga();
        // Con viento fuerte las olas de la nube se hacen más grandes
        const oleaje = C.oleaje * (1 + 0.35 * intensidad);

        // Borde esponjoso de una capa de nubes. Sigue al borde real del
        // eclipse (bordeEn) y casi nunca baja de él (máx. ~8 px), así lo
        // que se ve coincide con cuándo el jugador pierde.
        const borde = (desfase, subida) => {
            const puntos = [];
            for (let i = 0; i <= pasos; i++) {
                const x = -20 + (ancho + 40) * i / pasos;
                const u = x / ancho;
                const v = 0.5
                    + 0.25 * Math.sin(u * 9 + T.fase + desfase)
                    + 0.15 * Math.sin(u * 17 - T.fase * 1.4 + desfase * 2)
                    + 0.10 * Math.sin(u * 31 + T.fase * 2.2 + desfase * 3);
                puntos.push({ x: x, y: this.bordeEn(x) + oleaje * (v - 0.75) - subida });
            }
            return puntos;
        };
        const bajar = (puntos, dy) => puntos.map((p) => ({ x: p.x, y: p.y + dy }));
        // Rellena desde arriba de la pantalla hasta el borde (opcional: solo un tramo en x)
        const rellenar = (puntos, color, alpha, x0, x1) => {
            const dentro = (x0 === undefined) ? puntos : puntos.filter((p) => p.x >= x0 && p.x <= x1);
            if (dentro.length < 2) {
                return;
            }
            const poligono = [{ x: dentro[0].x, y: -60 }, { x: dentro[dentro.length - 1].x, y: -60 }];
            for (let i = dentro.length - 1; i >= 0; i--) {
                poligono.push(dentro[i]);
            }
            g.fillStyle(color, alpha);
            g.fillPoints(poligono, true);
        };

        // Igual que el eclipse: el resplandor se pone rojo cuando el jugador está cerca
        const alerta = this.margenAlJugador() < this.cfg.distanciaAlerta;
        const colorCorona = alerta ? 0xff4a3a : 0x9be7ff;
        const colorBorde = alerta ? 0xff9a8a : 0xe6f6ff;
        const pulso = 0.8 + 0.2 * Math.sin(this.tiempo * (alerta ? 9 : 3));

        const atras = borde(1.7, 0);
        const frente = borde(0, 16);
        const arriba = borde(3.1, 60);

        g.clear();

        // Bruma bajo la nube
        rellenar(bajar(atras, 38), 0x0a1626, 0.16);
        rellenar(bajar(atras, 18), 0x0a1626, 0.26);

        // Resplandor del borde
        [[30, 0.06], [16, 0.11]].forEach((capa) => {
            g.lineStyle(capa[0], colorCorona, capa[1] * pulso);
            g.strokePoints(atras, false);
        });

        // Nubes: tres capas, de la más clara (atrás) a la más oscura (arriba)
        rellenar(atras, 0x24395a, 0.95);
        rellenar(frente, 0x0f1b30, 0.96);
        rellenar(arriba, 0x060c18, 0.9);

        // Borde iluminado
        g.lineStyle(3, colorBorde, 0.55 * pulso);
        g.strokePoints(atras, false);

        // Relámpago: ilumina un tramo de la nube y el rayo queda DENTRO de ella
        const brillo = this.brilloRelampago();
        if (brillo > 0) {
            const r = T.relampago;
            const x0 = r.cx - ancho * 0.3;
            const x1 = r.cx + ancho * 0.3;
            rellenar(atras, 0xbfd9ff, 0.30 * brillo, x0, x1);
            rellenar(frente, 0x9fc4f0, 0.22 * brillo, x0, x1);
            const yRef = this.bordeEn(r.cx) - 16;
            const rayo = r.rayo.map((p) => ({ x: p.x, y: yRef + p.dy }));
            g.lineStyle(9, 0xbfe6ff, 0.30 * brillo);
            g.strokePoints(rayo, false);
            g.lineStyle(3, 0xffffff, 0.95 * brillo);
            g.strokePoints(rayo, false);
        }

        // Ráfaga: líneas de viento con la cola que se desvanece
        const rafaga = T.rafaga;
        if (rafaga && intensidad > 0.02) {
            const tramos = 6;
            rafaga.rayas.forEach((r) => {
                const tt = rafaga.t - r.retraso;
                if (tt <= 0) {
                    return;
                }
                const cabeza = rafaga.dir > 0 ? -50 + r.vel * tt : ancho + 50 - r.vel * tt;
                const a = r.alpha * intensidad;
                let xAnt = cabeza;
                let yAnt = r.y + Math.sin(r.fase + T.tiempo * 6) * r.onda;
                for (let k = 1; k <= tramos; k++) {
                    const xk = cabeza - rafaga.dir * r.largo * k / tramos;
                    const yk = r.y + Math.sin(r.fase + k * 0.9 + T.tiempo * 6) * r.onda;
                    g.lineStyle(r.grosor, 0xeaf6ff, a * (1 - (k - 1) / tramos));
                    g.lineBetween(xAnt, yAnt, xk, yk);
                    xAnt = xk;
                    yAnt = yk;
                }
            });
        }

        // Nieve
        g.fillStyle(0xffffff, 0.6);
        T.copos.forEach((c) => {
            g.fillCircle(c.x, c.y, c.r);
        });
    }
}