class Boss {
    constructor(escena) {
        this.escena = escena;
        this.datos = null;
        this.intro = null;      // estado de la cinemática de aparición (null = no está en curso)
        this.colores = null;

        // ---------------- AJUSTES ----------------
        this.cfg = {
            // Inclinación (en radianes: 0.40 ≈ 23°, 0.60 ≈ 34°)
            inclinacionSeguir: 0.40,   // mientras te sigue
            inclinacionAtaque: 0.60,   // en la embestida y al regresar
            suavidadInclinacion: 10,   // más alto = se ladea más rápido
            signoInclinacion: 1,       // pon -1 si prefieres que se ladee hacia el lado contrario

            // Boca del jefe (sprites boss1 y boss2)
            texturaAbierta: "boss1",   // mandíbulas abiertas
            texturaCerrada: "boss2",   // mandíbulas cerradas
            tiempoMordidas: 0.7,       // segundos ANTES de embestir en los que muerde rápido
            velocidadMordida: 0.08,    // segundos que dura cada abrir o cerrar (más bajo = más rápido)

            // Aparición
            tamanoGigante: 420,        // px (se limita según el tamaño de la pantalla)
            escalaChico: 0.25,         // tamaño inicial respecto al tamaño normal
            fases: {                   // duración de cada fase, en segundos
                aparicion: 1.5,
                crecimiento: 1.1,
                rugido: 1.5,
                ascenso: 1.6
            }
        };
        this.ordenIntro = ["aparicion", "crecimiento", "rugido", "ascenso"];

        // ---------------- CINEMÁTICA DE MUERTE (aquí se afina) ----------------
        this.muerte = null;     // estado de la cinemática de muerte (null = no está en curso)
        this.cfgMuerte = {
            // Duración de cada fase, en segundos REALES
            impacto: 0.7,           // el golpe final: el jefe se congela y parpadea
            desintegracion: 3.6,    // se deshace en pedazos, de abajo hacia arriba
            explosion: 1.3,         // estalla y el tiempo vuelve a la normalidad
            oscuridad: 1.5,         // todo el juego se apaga hasta quedar en negro
            escalaLenta: 0.25,      // velocidad del juego en la cámara lenta (1 = normal)
            columnas: 8,            // el jefe se parte en columnas x filas pedazos
            filas: 8
        };
        this.ordenMuerte = ["impacto", "desintegracion", "explosion", "oscuridad"];
    }

    // ¿Está sonando una cinemática del jefe? (Juego pausa reloj y generación mientras tanto)
    get enCinematica() {
        return this.intro !== null || this.muerte !== null;
    }

    // Velocidad del juego: 1 normal; baja durante la cámara lenta de la muerte
    get escalaTiempo() {
        return this.muerte ? this.muerte.escala : 1;
    }

    // -----------------------------------------------------------------
    // INICIALIZAR: crea al jefe y arranca su cinemática de aparición
    // -----------------------------------------------------------------
    inicializar() {
        const escena = this.escena;
        let ancho = escena.scale.width;

        this.datos = {
            x: ancho / 2,
            y: 100,
            origenX: ancho / 2,
            origenY: 100,
            targetAtaqueX: ancho / 2,
            targetAtaqueY: escena.jugador.y,
            ancho: 90,
            alto: 90,
            estado: "intro",
            tiempoEstado: 0,
            sprite: null,
            emisor: null
        };
        this.datos.sprite = escena.physics.add.image(ancho / 2, 100, this.cfg.texturaCerrada);
        this.datos.sprite.setOrigin(0.5).setDepth(3);
        UtilJuego.configurarEntidadGrafica(this.datos.sprite, escena.esNavidad ? window.configTamanos.bossNavidad : window.configTamanos.boss, 0xff4500);

        this.colores = escena.esNavidad ? [
            0xffd700,
            0xff0000,
            0xffffff
        ] : [
            0xff0055,
            0x9932cc,
            0x00ffff
        ];

        if (this.datos.sprite) {
            this.datos.ancho = this.datos.sprite.displayWidth;
            this.datos.alto = this.datos.sprite.displayHeight;
            const emisorRastro = escena.add.particles(0, 0, "particulaRastro", {
                speed: {
                    min: 15,
                    max: 50
                },
                scale: {
                    start: 1.5,
                    end: 0
                },
                alpha: {
                    start: 0.9,
                    end: 0
                },
                lifespan: 400,
                blendMode: "ADD",
                color: this.colores,
                frequency: 20
            });
            emisorRastro.startFollow(this.datos.sprite);
            emisorRastro.emitting = false;   // se enciende cuando el jefe sube a su lugar
            this.datos.emisor = emisorRastro;
        }

        this.iniciarIntro();
    }

    // =================================================================
    // CINEMÁTICA DE APARICIÓN
    //   1) aparicion:   chispas de energía se juntan y asoma un jefe diminuto
    //   2) crecimiento: se hincha hasta ser gigante (impacto + destello)
    //   3) rugido:      tiembla gigante en el centro, aparece el título
    //   4) ascenso:     sube y se encoge hasta su lugar; entra el eclipse
    // Todo se mueve desde update() (no usa tweens), así que siempre queda
    // sincronizado con el juego.
    // =================================================================
    iniciarIntro() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        const s = this.datos.sprite;

        const escalaFinal = s.scaleX;
        const tamanoGigante = Math.min(this.cfg.tamanoGigante, ancho * 0.6, alto * 0.45);
        const escalaGigante = escalaFinal * tamanoGigante / this.datos.ancho;
        const cx = ancho / 2;
        const cy = alto * 0.42;

        const chispas = [];
        for (let i = 0; i < 36; i++) {
            chispas.push({
                ang: Math.random() * Math.PI * 2,
                dist: 150 + Math.random() * Math.min(ancho, alto) * 0.35,
                tam: 2 + Math.random() * 3,
                ret: Math.random() * 0.35,
                color: Phaser.Utils.Array.GetRandom(this.colores)
            });
        }

        const colorTitulo = escena.esNavidad ? "#ffd700" : "#ff4444";
        this.intro = {
            fase: "aparicion",
            t: 0,
            cx: cx,
            cy: cy,
            escalaFinal: escalaFinal,
            escalaChica: escalaFinal * this.cfg.escalaChico,
            escalaGigante: escalaGigante,
            radioGigante: tamanoGigante / 2,
            chispas: chispas,
            anillos: [],
            proximoAnillo: 0,
            disparo: {},
            fx: escena.add.graphics().setDepth(2),
            velo: escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 1)
                .setAlpha(0)
                .setDepth(1),
            titulo: escena.add.text(ancho / 2, alto * 0.14, Idioma.t("boss.aparece"), {
                fontSize: "34px",
                fill: colorTitulo,
                stroke: "#000000",
                strokeThickness: 8,
                fontStyle: "bold",
                fontFamily: "Georgia, serif",
                align: "center",
                wordWrap: { width: ancho - 60 }
            }).setOrigin(0.5).setAlpha(0).setScale(0.6).setDepth(30)
        };

        // El jefe empieza oculto en el centro; se limpia lo que haya caído
        s.setPosition(cx, cy).setScale(0).setAlpha(0).setRotation(0);
        this.datos.x = cx;
        this.datos.y = cy;
        escena.modEnemigos.eliminarTodos();
        escena.modItems.eliminarTodos();
    }

    pasarFase() {
        const i = this.ordenIntro.indexOf(this.intro.fase);
        this.intro.fase = this.ordenIntro[i + 1];
        this.intro.t = 0;
    }

    // Onda expansiva
    lanzarAnillo(x, y, radioMax, duracion) {
        this.intro.anillos.push({
            x: x,
            y: y,
            radioMax: radioMax,
            dur: duracion,
            edad: 0,
            color: this.colores[0]
        });
    }

    // Explosión de partículas (el emisor se destruye solo)
    explosion(x, y, cantidad) {
        const escena = this.escena;
        const emisor = escena.add.particles(x, y, "particulaRastro", {
            speed: {
                min: 150,
                max: 520
            },
            angle: {
                min: 0,
                max: 360
            },
            scale: {
                start: 2,
                end: 0
            },
            alpha: {
                start: 1,
                end: 0
            },
            lifespan: 1000,
            blendMode: "ADD",
            color: this.colores,
            emitting: false
        }).setDepth(4);
        emisor.explode(cantidad);
        escena.time.delayedCall(1500, () => {
            if (emisor && emisor.scene) {
                emisor.destroy();
            }
        });
    }

    actualizarIntro(deltaSecs) {
        const intro = this.intro;
        if (!intro || !this.datos) {
            return;
        }
        const escena = this.escena;
        const E = Phaser.Math.Easing;
        const dt = Math.min(deltaSecs, 0.05);
        const s = this.datos.sprite;
        const fx = intro.fx;
        const efectos = Preferencias.efectosVisuales();

        intro.t += dt;
        const p = Math.min(1, intro.t / this.cfg.fases[intro.fase]);

        fx.clear();

        // Ondas expansivas activas
        intro.anillos = intro.anillos.filter((a) => {
            a.edad += dt;
            const q = a.edad / a.dur;
            if (q >= 1) {
                return false;
            }
            fx.lineStyle(2 + 8 * (1 - q), a.color, 1 - q);
            fx.strokeCircle(a.x, a.y, a.radioMax * E.Expo.Out(q));
            return true;
        });

        if (intro.fase === "aparicion") {
            // Orbe de energía que va creciendo
            fx.fillStyle(0xffffff, 0.15 + 0.5 * p);
            fx.fillCircle(intro.cx, intro.cy, (4 + 16 * p) * (1 + 0.2 * Math.sin(intro.t * 20)));
            // Chispas que se juntan en espiral
            intro.chispas.forEach((c) => {
                if (p <= c.ret) {
                    return;
                }
                const q = Math.min(1, (p - c.ret) / (0.9 - c.ret));
                if (q >= 1) {
                    return;
                }
                const r = c.dist * (1 - E.Cubic.In(q));
                const a = c.ang + q * 1.6;
                fx.fillStyle(c.color, 0.9);
                fx.fillCircle(intro.cx + Math.cos(a) * r, intro.cy + Math.sin(a) * r, c.tam * (1 - 0.5 * q));
            });
            // El jefe asoma, diminuto
            const q = Phaser.Math.Clamp((p - 0.45) / 0.55, 0, 1);
            s.setAlpha(Math.min(1, q * 3));
            s.setScale(intro.escalaChica * E.Back.Out(q) * (1 + 0.12 * Math.sin(intro.t * 16)));

        } else if (intro.fase === "crecimiento") {
            s.setAlpha(1);
            s.setScale(Phaser.Math.Linear(intro.escalaChica, intro.escalaGigante, E.Back.Out(p)));
            s.setPosition(
                intro.cx + (Math.random() - 0.5) * 8 * p,
                intro.cy + (Math.random() - 0.5) * 8 * p
            );
            intro.velo.setAlpha(0.6 * p);
            if (!intro.disparo.inicio) {
                intro.disparo.inicio = true;
                this.lanzarAnillo(intro.cx, intro.cy, intro.radioGigante * 1.5, 0.6);
            }
            if (!intro.disparo.impacto && p >= 0.7) {
                // IMPACTO: llegó a su tamaño gigante
                intro.disparo.impacto = true;
                if (efectos) {
                    escena.cameras.main.flash(500, 255, 255, 255);
                    escena.cameras.main.shake(500, 0.015);
                }
                this.lanzarAnillo(intro.cx, intro.cy, intro.radioGigante * 2.6, 0.9);
                this.explosion(intro.cx, intro.cy, 70);
            }

        } else if (intro.fase === "rugido") {
            // Ruge con las mandíbulas abiertas
            this.abrirBoca(true);
            if (!intro.disparo.rugido) {
                intro.disparo.rugido = true;
                if (efectos) {
                    escena.cameras.main.shake(700, 0.012);
                }
            }
            // Tiembla, late y parpadea en rojo
            s.setScale(intro.escalaGigante * (1 + 0.03 * Math.sin(intro.t * 14)));
            s.setPosition(intro.cx + (Math.random() - 0.5) * 6, intro.cy + (Math.random() - 0.5) * 6);
            s.setRotation(Math.sin(intro.t * 28) * 0.03);
            if (Math.floor(intro.t * 8) % 2 === 0) {
                s.setTint(0xff3300);
            } else {
                s.clearTint();
            }
            intro.proximoAnillo -= dt;
            if (intro.proximoAnillo <= 0) {
                intro.proximoAnillo = 0.45;
                this.lanzarAnillo(intro.cx, intro.cy, intro.radioGigante * 2.2, 0.9);
            }
            // Título
            const entra = E.Back.Out(Phaser.Math.Clamp(p / 0.2, 0, 1));
            const sale = 1 - Phaser.Math.Clamp((p - 0.8) / 0.2, 0, 1);
            intro.titulo.setAlpha(Math.min(1, p / 0.15) * sale).setScale(0.6 + 0.4 * entra);

        } else if (intro.fase === "ascenso") {
            this.abrirBoca(false);
            if (!intro.disparo.ascenso) {
                intro.disparo.ascenso = true;
                escena.modEclipse.iniciar();            // entra el eclipse
                this.datos.emisor.emitting = true;      // rastro de partículas durante la subida
                this.lanzarAnillo(intro.cx, intro.cy, intro.radioGigante * 2, 0.7);
                intro.titulo.setAlpha(0);
            }
            const k = E.Cubic.InOut(p);
            s.clearTint();
            s.setRotation(0);
            s.setPosition(intro.cx, Phaser.Math.Linear(intro.cy, 100, k));
            s.setScale(Phaser.Math.Linear(intro.escalaGigante, intro.escalaFinal, k));
            intro.velo.setAlpha(0.6 * (1 - p));
        }

        if (p >= 1) {
            if (intro.fase === "ascenso") {
                this.terminarIntro();
            } else {
                this.pasarFase();
            }
        }
    }

    terminarIntro() {
        const intro = this.intro;
        const s = this.datos.sprite;
        s.setPosition(intro.cx, 100)
            .setScale(intro.escalaFinal)
            .setAlpha(1)
            .setRotation(0)
            .clearTint();
        this.datos.x = intro.cx;
        this.datos.y = 100;
        this.datos.origenX = intro.cx;
        this.datos.origenY = 100;
        this.datos.estado = "preparando";
        this.datos.tiempoEstado = 0;
        this.limpiarIntro();
    }

    limpiarIntro() {
        if (this.intro) {
            this.intro.fx.destroy();
            this.intro.velo.destroy();
            this.intro.titulo.destroy();
            this.intro = null;
        }
    }

    // -----------------------------------------------------------------
    // INCLINACIÓN: el jefe se ladea hacia el lado al que se mueve, sin
    // dar vueltas. direccion va de -1 (izquierda) a 1 (derecha).
    // -----------------------------------------------------------------
    inclinar(direccion, maximo, deltaSecs) {
        const sprite = this.datos.sprite;
        if (!sprite) {
            return;
        }
        const objetivo = Phaser.Math.Clamp(direccion, -1, 1) * maximo * this.cfg.signoInclinacion;
        const k = 1 - Math.exp(-this.cfg.suavidadInclinacion * deltaSecs);
        sprite.rotation += (objetivo - sprite.rotation) * k;
    }

    // -----------------------------------------------------------------
    // BOCA: cambia entre boss1 (abierta) y boss2 (cerrada)
    // -----------------------------------------------------------------
    abrirBoca(abierta) {
        const sprite = this.datos && this.datos.sprite;
        if (!sprite) {
            return;
        }
        const clave = abierta ? this.cfg.texturaAbierta : this.cfg.texturaCerrada;
        if (sprite.texture.key !== clave) {
            sprite.setTexture(clave);
        }
    }

    // Decide la boca según lo que esté haciendo el jefe:
    //   preparando (moviéndose por el escenario)  -> abierta
    //   preparando (justo antes de embestir)      -> muerde rápido (abre y cierra)
    //   atacando y regresando                     -> cerrada
    actualizarBoca() {
        const boss = this.datos;
        if (!boss || !boss.sprite) {
            return;
        }
        if (boss.estado === "preparando") {
            const duracionPrep = this.escena.dificultad.boss.preparacion;
            const inicioMordidas = duracionPrep - Math.min(this.cfg.tiempoMordidas, duracionPrep);
            if (boss.tiempoEstado >= inicioMordidas) {
                const paso = Math.floor((boss.tiempoEstado - inicioMordidas) / this.cfg.velocidadMordida);
                this.abrirBoca(paso % 2 === 0);
            } else {
                this.abrirBoca(true);
            }
        } else {
            this.abrirBoca(false);
        }
    }

    // -----------------------------------------------------------------
    // ACTUALIZAR (preparando -> atacando -> regresando)
    // -----------------------------------------------------------------
    actualizar(deltaSecs) {
        const escena = this.escena;
        if (!this.datos || this.intro || this.muerte || !escena.juegoActivo || escena.gameOver) {
            return;
        }
        let boss = this.datos;
        let jugador = escena.jugador;
        // Velocidades fijas del jefe según la dificultad (no aceleran con el tiempo)
        const cfgBoss = escena.dificultad.boss;
        let tiempoPrepActual = cfgBoss.preparacion;
        let velAtaqueActual = cfgBoss.ataque;
        let velRegresoActual = cfgBoss.regreso;
        boss.tiempoEstado += deltaSecs;
        let temblorX = 0;

        if (boss.estado === "preparando") {
            // Se ladea hacia el lado del jugador al que va siguiendo
            let dx = jugador.x - boss.x;
            this.inclinar(dx / 120, this.cfg.inclinacionSeguir, deltaSecs);
            boss.x += dx * 0.1;
            boss.y = 100 + Math.sin(escena.cronometro * 5) * 15;
            if (boss.sprite) {
                if (boss.tiempoEstado > tiempoPrepActual - 0.4) {
                    // Aviso de embestida: se pone rojo y tiembla
                    boss.sprite.setTint(0xff0000);
                    temblorX = (Math.random() - 0.5) * 6;
                } else {
                    boss.sprite.clearTint();
                }
            }
            if (boss.tiempoEstado >= tiempoPrepActual) {
                boss.targetAtaqueX = jugador.x;
                boss.targetAtaqueY = jugador.y;
                boss.origenX = boss.x;
                boss.origenY = boss.y;
                boss.estado = "atacando";
                boss.tiempoEstado = 0;
                if (boss.sprite) {
                    boss.sprite.clearTint();
                }
            }
        } else if (boss.estado === "atacando") {
            let angulo = Phaser.Math.Angle.Between(boss.x, boss.y, boss.targetAtaqueX, boss.targetAtaqueY);
            boss.x += Math.cos(angulo) * velAtaqueActual;
            boss.y += Math.sin(angulo) * velAtaqueActual;
            // Se inclina hacia el lado de la embestida
            this.inclinar(Math.cos(angulo) * 2.2, this.cfg.inclinacionAtaque, deltaSecs);
            let distAlObjetivo = Phaser.Math.Distance.Between(boss.x, boss.y, boss.targetAtaqueX, boss.targetAtaqueY);
            if (distAlObjetivo < 15 || boss.y >= boss.targetAtaqueY) {
                boss.estado = "regresando";
                boss.tiempoEstado = 0;
            }
        } else if (boss.estado === "regresando") {
            let anguloRegreso = Phaser.Math.Angle.Between(boss.x, boss.y, boss.origenX, boss.origenY);
            boss.x += Math.cos(anguloRegreso) * velRegresoActual;
            boss.y += Math.sin(anguloRegreso) * velRegresoActual;
            this.inclinar(Math.cos(anguloRegreso) * 2.2, this.cfg.inclinacionSeguir, deltaSecs);
            let distAlOrigen = Phaser.Math.Distance.Between(boss.x, boss.y, boss.origenX, boss.origenY);
            if (distAlOrigen < 15 || boss.y <= 110) {
                boss.y = 100;
                boss.estado = "preparando";
                boss.tiempoEstado = 0;
            }
        }

        if (boss.sprite) {
            boss.sprite.x = boss.x + temblorX;
            boss.sprite.y = boss.y;
        }

        // Boca: abierta al moverse, muerde antes de embestir, cerrada al atacar y regresar
        this.actualizarBoca();

        // Colisión con el jugador
        let distJugador = Phaser.Math.Distance.Between(jugador.x, jugador.y, boss.x, boss.y);
        // Radio de choque del jefe: proporcional a su tamaño (antes 35 px con 90 px de sprite)
        const radioJefe = Math.min(this.datos.ancho, this.datos.alto) * 0.39;
        if (distJugador < jugador.radio + radioJefe) {
            escena.modFin.perder();
            return;
        }

        // La supernova hace retroceder al jefe
        if (jugador.supernovaActiva) {
            let distSupernova = Phaser.Math.Distance.Between(jugador.x, jugador.y, boss.x, boss.y);
            if (distSupernova < jugador.supernovaRadio + radioJefe - 5) {
                boss.estado = "regresando";
                boss.tiempoEstado = 0;
            }
        }
    }

    // -----------------------------------------------------------------
    // SUPERNOVA: el jefe aguanta 2. Devuelve true si fue derrotado.
    // También empuja el eclipse hacia arriba.
    // -----------------------------------------------------------------
    recibirSupernova() {
        if (!this.datos || this.intro || this.muerte) {
            return false;
        }
        const escena = this.escena;
        if (escena.modEclipse) {
            escena.modEclipse.retroceder();
        }
        if (this.datos.vidasGem === undefined) {
            this.datos.vidasGem = 2;
        }
        this.datos.vidasGem--;
        if (this.datos.vidasGem <= 0) {
            // Muerte con cinemática; al terminar, ella misma llama a la pantalla de victoria
            this.iniciarMuerte();
            return true;
        }
        if (this.datos.sprite) {
            this.datos.sprite.setTint(0xff0000);
        }
        escena.time.delayedCall(500, () => {
            if (this.datos && this.datos.sprite) {
                this.datos.sprite.clearTint();
            }
        });
        return false;
    }

    // =================================================================
    // CINEMÁTICA DE MUERTE
    //   1) impacto:        el golpe final; el jefe se congela y parpadea
    //   2) desintegracion: CÁMARA LENTA. Se parte en pedazos que se
    //                      desprenden de abajo hacia arriba mientras su
    //                      núcleo de energía se carga
    //   3) explosion:      estalla; el tiempo vuelve a la normalidad
    //   4) oscuridad:      todo el juego se apaga hasta quedar en negro
    //                      y entra la pantalla de victoria (cómic)
    // Igual que la aparición, todo se mueve desde update() (sin tweens).
    // Respeta el ajuste "Destellos y sacudidas": sin él no hay parpadeos
    // ni flashes de pantalla.
    // =================================================================
    iniciarMuerte() {
        const escena = this.escena;
        const d = this.datos;
        if (!d || !d.sprite || this.muerte) {
            return;
        }
        const s = d.sprite;
        this.abrirBoca(true);   // grita con las mandíbulas abiertas al morir
        const ancho = escena.scale.width;
        const alto = escena.scale.height;

        // Nada más cae ni ataca mientras dura la cinemática
        escena.modEnemigos.eliminarTodos();
        escena.modItems.eliminarTodos();
        if (d.emisor) {
            d.emisor.emitting = false;
        }

        this.muerte = {
            fase: "impacto",
            t: 0,                 // segundos de la fase actual
            tFrag: 0,             // segundos desde que se partió el jefe
            escala: 1,            // velocidad del juego (cámara lenta)
            cx: s.x,
            cy: s.y,
            rot: s.rotation,
            radio: Math.max(1, Math.min(s.displayWidth, s.displayHeight) / 2),
            fx: escena.add.graphics().setDepth(3.5),
            velo: escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 1)
                .setAlpha(0)
                .setDepth(140),
            fragmentos: [],
            chispas: [],
            anillos: [],
            disparo: {},
            musica: escena.musica || null,
            volumenMusica: escena.musica ? escena.musica.volume : 0,
            alphaVelo: 0
        };
    }

    anilloMuerte(x, y, radioMax, duracion) {
        this.muerte.anillos.push({
            x: x,
            y: y,
            radioMax: radioMax,
            dur: duracion,
            edad: 0,
            color: this.colores[0]
        });
    }

    // Parte al jefe en una cuadrícula de pedazos (usa la misma imagen del jefe)
    crearFragmentos() {
        const escena = this.escena;
        const m = this.muerte;
        const s = this.datos.sprite;
        const columnas = this.cfgMuerte.columnas;
        const filas = this.cfgMuerte.filas;
        const fw = s.width;
        const fh = s.height;
        const cw = fw / columnas;
        const ch = fh / filas;
        const cos = Math.cos(m.rot);
        const sin = Math.sin(m.rot);

        for (let r = 0; r < filas; r++) {
            for (let c = 0; c < columnas; c++) {
                const ccx = c * cw + cw / 2;
                const ccy = r * ch + ch / 2;
                const nx = (ccx - fw / 2) / (fw / 2);
                const ny = (ccy - fh / 2) / (fh / 2);
                // Posición del centro del pedazo (con la inclinación que tenía el jefe)
                const lx = (ccx - fw / 2) * s.scaleX;
                const ly = (ccy - fh / 2) * s.scaleY;
                const x0 = m.cx + lx * cos - ly * sin;
                const y0 = m.cy + lx * sin + ly * cos;

                const img = escena.add.image(x0, y0, s.texture.key).setDepth(4);
                img.setCrop(c * cw, r * ch, cw, ch);
                img.setOrigin(ccx / fw, ccy / fh);
                img.setScale(s.scaleX, s.scaleY);
                img.setRotation(m.rot);

                const radial = Math.atan2(y0 - m.cy, x0 - m.cx);
                const ang = radial + (Math.random() - 0.5) * 0.9;
                const dist = 80 + Math.random() * 180;
                const altura = filas > 1 ? r / (filas - 1) : 0;   // 0 arriba, 1 abajo
                m.fragmentos.push({
                    img: img,
                    x0: x0,
                    y0: y0,
                    dentro: Math.sqrt(nx * nx + ny * ny) <= 1,
                    dx: Math.cos(ang) * dist,
                    dy: Math.sin(ang) * dist - 50 - Math.random() * 60,
                    ux: Math.cos(radial),
                    uy: Math.sin(radial),
                    vr: (Math.random() - 0.5) * 5,
                    escala0: s.scaleX,
                    // Los de abajo (por donde llegó la supernova) se sueltan primero
                    delay: (1 - altura) * 1.3 + Math.random() * 0.4,
                    vida: 1.4 + Math.random() * 0.6
                });
            }
        }
    }

    // Mueve los pedazos. empuje (0..1) = fuerza de la explosión que los lanza lejos.
    moverFragmentos(dt, empuje) {
        const m = this.muerte;
        const E = Phaser.Math.Easing;
        m.fragmentos.forEach((f) => {
            const q = Phaser.Math.Clamp((m.tFrag - f.delay) / f.vida, 0, 1);
            const k = E.Sine.Out(q);
            let x = f.x0 + f.dx * k + f.ux * 520 * empuje;
            let y = f.y0 + f.dy * k + f.uy * 520 * empuje;
            // Antes de soltarse, el pedazo vibra
            if (q === 0 && m.tFrag > f.delay - 0.5) {
                x += (Math.random() - 0.5) * 3;
                y += (Math.random() - 0.5) * 3;
            }
            let alpha = 1 - E.Quadratic.In(q);
            alpha *= 1 - Phaser.Math.Clamp(empuje * 2.5, 0, 1);
            f.img.setPosition(x, y);
            f.img.setRotation(m.rot + f.vr * q);
            f.img.setScale(f.escala0 * (1 - 0.35 * q));
            f.img.setAlpha(alpha);

            // Chispas de energía que se desprenden del pedazo
            if (f.dentro && q > 0 && q < 0.7 && m.chispas.length < 220 && Math.random() < 6 * dt) {
                m.chispas.push({
                    x: x,
                    y: y,
                    vx: f.ux * 15 + (Math.random() - 0.5) * 30,
                    vy: f.uy * 15 + (Math.random() - 0.5) * 30 - 20,
                    edad: 0,
                    vida: 0.9 + Math.random() * 0.7,
                    tam: 1.5 + Math.random() * 2.5,
                    color: Math.random() < 0.3 ? 0xffffff : Phaser.Utils.Array.GetRandom(this.colores)
                });
            }
        });
    }

    // deltaSecs = tiempo REAL (la cámara lenta la fija la propia cinemática)
    actualizarMuerte(deltaSecs) {
        const m = this.muerte;
        if (!m || !this.datos) {
            return;
        }
        const escena = this.escena;
        const E = Phaser.Math.Easing;
        const cfg = this.cfgMuerte;
        const dt = Math.min(deltaSecs, 0.05);
        const s = this.datos.sprite;
        const fx = m.fx;
        const efectos = Preferencias.efectosVisuales();
        const eclipse = escena.modEclipse && escena.modEclipse.graficos;

        m.t += dt;
        if (m.fragmentos.length > 0) {
            m.tFrag += dt;
        }
        const p = Math.min(1, m.t / cfg[m.fase]);

        fx.clear();

        // Ondas expansivas
        m.anillos = m.anillos.filter((a) => {
            a.edad += dt;
            const q = a.edad / a.dur;
            if (q >= 1) {
                return false;
            }
            fx.lineStyle(2 + 8 * (1 - q), a.color, 1 - q);
            fx.strokeCircle(a.x, a.y, a.radioMax * E.Expo.Out(q));
            return true;
        });

        // Chispas
        m.chispas = m.chispas.filter((c) => {
            c.edad += dt;
            if (c.edad >= c.vida) {
                return false;
            }
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            const v = 1 - c.edad / c.vida;
            fx.fillStyle(c.color, v);
            fx.fillCircle(c.x, c.y, c.tam * (0.5 + 0.5 * v));
            return true;
        });

        if (m.fase === "impacto") {
            if (!m.disparo.impacto) {
                m.disparo.impacto = true;
                if (efectos) {
                    escena.cameras.main.flash(250, 255, 255, 255);
                    escena.cameras.main.shake(500, 0.012, true);
                }
                this.anilloMuerte(m.cx, m.cy, m.radio * 2.6, 0.8);
            }
            m.escala = Phaser.Math.Linear(1, cfg.escalaLenta, E.Sine.Out(p));
            s.setPosition(m.cx + (Math.random() - 0.5) * 10, m.cy + (Math.random() - 0.5) * 10);
            if (efectos) {
                if (Math.floor(m.t * 24) % 2 === 0) {
                    s.setTintFill(0xffffff);
                } else {
                    s.clearTint();
                }
            } else {
                s.setTint(0xff8866);
            }
            m.velo.setAlpha(0.35 * p);

        } else if (m.fase === "desintegracion") {
            if (!m.disparo.desintegra) {
                m.disparo.desintegra = true;
                s.clearTint();
                s.setVisible(false);
                this.crearFragmentos();
                if (efectos) {
                    escena.cameras.main.shake(cfg.desintegracion * 1000, 0.002, true);
                }
            }
            m.escala = cfg.escalaLenta;
            m.velo.setAlpha(Phaser.Math.Linear(0.35, 0.6, p));
            this.moverFragmentos(dt, 0);

            // Núcleo de energía que se va cargando (pulsa cada vez más rápido)
            const pulso = 1 + 0.12 * Math.sin(m.t * (8 + 24 * p));
            const rNucleo = m.radio * (0.10 + 0.55 * E.Cubic.In(p)) * pulso;
            fx.fillStyle(this.colores[0], 0.18 + 0.2 * p);
            fx.fillCircle(m.cx, m.cy, rNucleo * 2.2);
            fx.fillStyle(this.colores[2], 0.35 + 0.3 * p);
            fx.fillCircle(m.cx, m.cy, rNucleo * 1.4);
            fx.fillStyle(0xffffff, 0.5 + 0.5 * p);
            fx.fillCircle(m.cx, m.cy, rNucleo);

        } else if (m.fase === "explosion") {
            if (!m.disparo.boom) {
                m.disparo.boom = true;
                if (efectos) {
                    escena.cameras.main.flash(800, 255, 255, 255);
                    escena.cameras.main.shake(900, 0.03, true);
                }
                if (escena.cache && escena.cache.audio.exists("sonido_choque")) {
                    escena.sound.play("sonido_choque");
                }
                this.anilloMuerte(m.cx, m.cy, m.radio * 3.2, 0.9);
                this.anilloMuerte(m.cx, m.cy, m.radio * 5.5, 1.2);
                this.anilloMuerte(m.cx, m.cy, m.radio * 8, 1.3);
                this.explosion(m.cx, m.cy, 160);
                escena.time.delayedCall(180, () => {
                    if (this.muerte) {
                        this.explosion(m.cx, m.cy, 100);
                    }
                });
                m.alphaVelo = m.velo.alpha;
            }
            // El tiempo vuelve a la normalidad
            m.escala = Phaser.Math.Linear(cfg.escalaLenta, 1, Phaser.Math.Clamp(p / 0.25, 0, 1));
            m.velo.setAlpha(Phaser.Math.Linear(m.alphaVelo, 0.15, Phaser.Math.Clamp(p * 4, 0, 1)));
            this.moverFragmentos(dt, E.Expo.Out(p));

            // Bola de luz que se expande y se desvanece
            const rGrande = m.radio * (0.7 + 9 * E.Expo.Out(p));
            fx.fillStyle(this.colores[0], 0.5 * (1 - E.Quadratic.In(p)));
            fx.fillCircle(m.cx, m.cy, rGrande * 1.3);
            fx.fillStyle(0xffffff, 1 - E.Quadratic.In(p));
            fx.fillCircle(m.cx, m.cy, rGrande);

            if (eclipse) {
                eclipse.setAlpha(1 - p);
            }

        } else {
            if (!m.disparo.oscuridad) {
                m.disparo.oscuridad = true;
                m.alphaVelo = m.velo.alpha;
                m.fragmentos.forEach((f) => f.img.setVisible(false));
            }
            m.escala = 1;
            const k = E.Sine.InOut(p);
            m.velo.setAlpha(Phaser.Math.Linear(m.alphaVelo, 1, k));
            if (m.musica) {
                try {
                    m.musica.volume = m.volumenMusica * (1 - k);
                } catch (e) { /* si no se puede, la música se corta al final */ }
            }
            if (eclipse) {
                eclipse.setAlpha(0);
            }
        }

        // La música se arrastra durante la cámara lenta
        if (m.musica) {
            const n = (m.escala - cfg.escalaLenta) / (1 - cfg.escalaLenta);
            try {
                m.musica.rate = 0.6 + 0.4 * Phaser.Math.Clamp(n, 0, 1);
            } catch (e) { /* algunos navegadores no permiten cambiar la velocidad */ }
        }

        if (p >= 1) {
            const i = this.ordenMuerte.indexOf(m.fase);
            if (i < this.ordenMuerte.length - 1) {
                m.fase = this.ordenMuerte[i + 1];
                m.t = 0;
            } else {
                // Todo está en negro: entra la pantalla de victoria
                // (ella limpia esta cinemática al detener el juego)
                escena.modFin.victoriaJefe();
            }
        }
    }

    limpiarMuerte() {
        const m = this.muerte;
        if (!m) {
            return;
        }
        m.fragmentos.forEach((f) => {
            if (f.img && f.img.scene) {
                f.img.destroy();
            }
        });
        if (m.fx && m.fx.scene) {
            m.fx.destroy();
        }
        if (m.velo && m.velo.scene) {
            m.velo.destroy();
        }
        this.muerte = null;
    }

    // -----------------------------------------------------------------
    // ELIMINAR (no hace nada si el jefe no existe)
    // -----------------------------------------------------------------
    eliminar() {
        this.limpiarIntro();
        this.limpiarMuerte();
        if (this.datos) {
            if (this.datos.emisor) {
                this.datos.emisor.emitting = false;
            }
            if (this.datos.sprite) {
                this.datos.sprite.destroy();
            }
            this.datos = null;
        }
    }
}