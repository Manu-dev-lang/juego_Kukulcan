class Enemigos {
    constructor(escena) {
        this.escena = escena;
        this.grupo = null;
    }

    crear() {
        this.grupo = this.escena.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
    }

    // -----------------------------------------------------------------
    // GENERAR
    //   Nivel 1: 1 enemigo recto por oleada
    //   Nivel 2: 1 enemigo zigzag por oleada
    //   Nivel 3: 3 enemigos rectos por oleada
    // -----------------------------------------------------------------
    generar(ancho, limites, multiplicadorVelocidad) {
        const escena = this.escena;
        const j = escena.jugador;

        // Skin de la tienda puesta en los enemigos (null = diseño normal, sin habilidad)
        const skinEnemigos = SkinsTienda.activa("enemigos");

        // En el nivel 2 cae de uno en uno, igual que en el nivel 1
        const cantidad = escena.nivelActual === 2 ? 1 : escena.nivelActual;
        const tamEnemigo = window.configTamanos.enemigos;
        const mitad = tamEnemigo / 2;

        for (let k = 0; k < cantidad; k++) {
            let x;
            if (k === 0) {
                x = j.targetX + (Math.random() * 60 - 30);
            } else if (k === 1) {
                x = j.x > ancho / 2 ? j.x - tamEnemigo * 1.5 : j.x + tamEnemigo * 1.5;
            } else {
                x = ancho / 2 + (Math.random() * 200 - 100);
            }
            x = Phaser.Math.Clamp(x, limites.izquierdo + mitad, limites.derecho - mitad);

            let tipo = escena.nivelActual === 2 ? "zigzag" : "recto";
            let enemigo = this.crearImagen(tipo, x, -mitad - k * tamEnemigo * 0.6);
            if (!enemigo) {
                continue;
            }
            enemigo.tipo = tipo;
            const factorDif = escena.dificultad.enemigos;
            enemigo.velocidad = (Math.random() * 3 + 4) * escena.velocidadGlobalJuego * multiplicadorVelocidad * factorDif;
            enemigo.anguloZigZag = 0;
            enemigo.amplitud = (Math.random() * 4 + 2) * factorDif;
            enemigo.velocidadPersecucion = 2.5 * factorDif;
            enemigo.velocidadRotacion = Math.random() > 0.5 ? 0.05 : -0.05;
            enemigo.escalaBase = enemigo.scaleX;
            enemigo.vidasGem = undefined;

            // Colores del rastro según la skin
            const paletaNormal = {
                recto: [
                    0x00ff7f,
                    0x00fa9a,
                    0x40e0d0
                ],
                zigzag: [
                    0xffd700,
                    0xffa500,
                    0xff4500
                ],
                perseguidor: [
                    0x9932cc,
                    0x8a2be2,
                    0x00ffff
                ]
            };
            const paletaNavidad = {
                recto: [
                    0xffffff,
                    0x00ffff,
                    0xa0e0ff
                ],
                zigzag: [
                    0xff0000,
                    0x00ff00,
                    0xffd700
                ],
                perseguidor: [
                    0xffd700,
                    0xffffff,
                    0xff69b4
                ]
            };
            let paletaColores = escena.esNavidad ? paletaNavidad[tipo] : paletaNormal[tipo];
            // Con la skin de la tienda el rastro también se pinta (dorado)
            if (skinEnemigos && skinEnemigos.estela) {
                paletaColores = skinEnemigos.estela;
            }
            UtilJuego.configurarEmisorRastro(escena, enemigo, paletaColores, 25);
        }
    }

    // -----------------------------------------------------------------
    // SKIN DE LA TIENDA
    //   Con skin equipada: el sprite se pinta (tinte) y recibe su habilidad.
    //   Sin skin: diseño normal y NINGUNA habilidad.
    //   Se llama cada vez que se toma un sprite del pool (los sprites se
    //   reutilizan, por eso la inmunidad se reescribe siempre).
    // -----------------------------------------------------------------
    aplicarSkin(sprite, skin) {
        if (skin === undefined) {
            skin = SkinsTienda.activa("enemigos");
        }
        if (!skin) {
            sprite.clearTint();
            sprite.inmuneSupernova = false;
            return;
        }
        sprite.setTint(skin.tinte);
        sprite.inmuneSupernova = !!(skin.habilidad && skin.habilidad.id === "inmune_supernova");
        // Brillo del contorno del mismo color (si esta versión de Phaser lo permite)
        if (skin.brillo !== undefined && sprite.preFX && sprite.preFX.list.length > 0) {
            try {
                sprite.preFX.list[0].color = skin.brillo;
            } catch (e) { /* si no se puede recolorear, se queda el brillo original */ }
        }
    }

    // -----------------------------------------------------------------
    // CREAR IMAGEN (toma un sprite libre del pool)
    // -----------------------------------------------------------------
    crearImagen(tipo, x, y) {
        const texturas = {
            recto: "enemigo_1",
            zigzag: "enemigo_2",
            perseguidor: "enemigo_3"
        };
        const clave = texturas[tipo] || "enemigo_3";
        if (!this.escena.textures.exists(clave)) {
            return null;
        }
        let sprite = this.grupo.get(x, y);
        if (!sprite) {
            return null;
        }
        const skin = SkinsTienda.activa("enemigos");
        sprite.setTexture(clave)
            .setActive(true)
            .setVisible(true)
            .setOrigin(0.5)
            .setDepth(3)
            .clearTint();
        UtilJuego.configurarEntidadGrafica(sprite, window.configTamanos.enemigos, skin && skin.brillo !== undefined ? skin.brillo : 0xff4500);
        this.aplicarSkin(sprite, skin);
        return sprite;
    }

    // -----------------------------------------------------------------
    // ACTUALIZAR (se llama en cada frame)
    // -----------------------------------------------------------------
    actualizar() {
        const escena = this.escena;
        const alto = escena.scale.height;

        this.grupo.children.iterate(enemigo => {
            if (!enemigo || !enemigo.active) {
                return;
            }
            if (enemigo.tipo === "recto") {
                enemigo.y += enemigo.velocidad;
                enemigo.rotation += enemigo.velocidadRotacion || 0.05;
            } else if (enemigo.tipo === "zigzag") {
                enemigo.y += enemigo.velocidad;
                enemigo.anguloZigZag += 0.08;
                enemigo.x += Math.sin(enemigo.anguloZigZag) * enemigo.amplitud;
                enemigo.angle = Math.sin(enemigo.anguloZigZag) * 45;
            } else if (enemigo.tipo === "perseguidor") {
                enemigo.y += enemigo.velocidad * 0.9;
                let velocidadPersecucion = enemigo.velocidadPersecucion || 2.5;
                if (enemigo.x < escena.jugador.targetX) {
                    enemigo.x += velocidadPersecucion;
                }
                if (enemigo.x > escena.jugador.targetX) {
                    enemigo.x -= velocidadPersecucion;
                }
                enemigo.rotation += 0.09;
                const escalaPulsante = (enemigo.escalaBase || 1) * (1 + 0.18 * Math.sin(escena.cronometro * 10));
                enemigo.setScale(escalaPulsante);
            }
            if (enemigo.y > alto + 100) {
                if (enemigo.emisor) {
                    enemigo.emisor.emitting = false;
                }
                this.grupo.killAndHide(enemigo);
            }
        });
    }

    // -----------------------------------------------------------------
    // COLISIÓN CON EL JUGADOR (callback del overlap)
    // -----------------------------------------------------------------
    alColisionarJugador(jugadorSprite, enemigo) {
        if (!enemigo.active) {
            return;
        }
        if (enemigo.emisor) {
            enemigo.emisor.emitting = false;
        }

        // --- REPRODUCIR SONIDO DE CHOQUE ---
        // Se añade ignorePause para que el sonido no se corte si el juego se pausa al perder.
        this.escena.sound.play("sonido_choque", { ignorePause: true });

        this.escena.modFin.perder();
    }

    // -----------------------------------------------------------------
    // SUPERNOVA: destruye enemigos (enemigo_3 aguanta 3 supernovas)
    //   Los enemigos con la skin dorada de la tienda son INMUNES a la onda.
    // -----------------------------------------------------------------
    aplicarSupernova() {
        const escena = this.escena;
        this.grupo.children.iterate(en => {
            if (en && en.active) {
                // Inmune: la onda rebota (destello rápido) y el enemigo sigue
                if (en.inmuneSupernova) {
                    en.setTintFill(0xffffff);
                    escena.time.delayedCall(120, () => {
                        if (en && en.active) {
                            this.aplicarSkin(en);
                        }
                    });
                    return;
                }
                let textura = en.texture.key;
                if (textura === "enemigo_3") {
                    if (en.vidasGem === undefined) {
                        en.vidasGem = 3;
                    }
                    en.vidasGem--;
                    if (en.vidasGem <= 0) {
                        if (en.emisor) {
                            en.emisor.emitting = false;
                        }
                        this.grupo.killAndHide(en);
                    } else {
                        en.setTint(0xff0000);
                        escena.time.delayedCall(500, () => {
                            if (en && en.active) {
                                this.aplicarSkin(en);
                            }
                        });
                    }
                } else {
                    if (en.emisor) {
                        en.emisor.emitting = false;
                    }
                    this.grupo.killAndHide(en);
                }
            }
        });
    }

    // -----------------------------------------------------------------
    // ELIMINAR TODOS los enemigos activos
    // (no es la supernova: esto sí limpia a todos, también a los dorados)
    // -----------------------------------------------------------------
    eliminarTodos() {
        this.grupo.children.iterate(e => {
            if (e && e.active) {
                if (e.emisor) {
                    e.emisor.emitting = false;
                }
                this.grupo.killAndHide(e);
            }
        });
    }
}