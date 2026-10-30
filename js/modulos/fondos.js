class Fondos {
    constructor(escena) {
        this.escena = escena;
        this.duracionMovimiento = 30000;
        this.solapamiento = 4;
        this.movimientoIniciado = false;
    }

    get capas() {
        return [this.fondo1, this.fondo2, this.fondo3];
    }

    // -----------------------------------------------------------------
    // CREAR
    // -----------------------------------------------------------------
    crear() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        this.altoBase = alto;

        this.fondo1 = escena.add.image(ancho / 2, alto / 2, "fondo1")
            .setDisplaySize(ancho, alto + this.solapamiento)
            .setOrigin(0.5)
            .setDepth(-10);
        this.fondo2 = escena.add.image(ancho / 2, -alto / 2 + this.solapamiento, "fondo2")
            .setDisplaySize(ancho, alto + this.solapamiento)
            .setOrigin(0.5)
            .setDepth(-10);
        this.fondo3 = escena.add.image(ancho / 2, -alto * 1.5 + this.solapamiento * 2, "fondo3")
            .setDisplaySize(ancho, alto + this.solapamiento)
            .setOrigin(0.5)
            .setDepth(-10);
        this.capaTransicion = escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0x000000, 0)
            .setDepth(-8);
        this.atmosfera = escena.add.rectangle(ancho / 2, alto / 2, ancho, alto, 0xdff7f0, 0.1)
            .setOrigin(0.5)
            .setDepth(-7);
        this.atmosfera.setBlendMode(Phaser.BlendModes.ADD);
    }

    // -----------------------------------------------------------------
    // Saltar directo al nivel 3 (modo "startAtLevel3")
    // -----------------------------------------------------------------
    saltarANivel3() {
        this.atmosfera.setFillStyle(0xd9d2ff, 0.14);
        this.fondo1.y += this.altoBase * 2;
        this.fondo2.y += this.altoBase * 2;
        this.fondo3.y += this.altoBase * 2;
    }

    // -----------------------------------------------------------------
    // Detener todos los tweens de fondo (al perder/ganar)
    // -----------------------------------------------------------------
    detenerTweens() {
        const tweens = this.escena.tweens;
        tweens.killTweensOf(this.fondo1);
        tweens.killTweensOf(this.fondo2);
        tweens.killTweensOf(this.fondo3);
        tweens.killTweensOf(this.capaTransicion);
        tweens.killTweensOf(this.atmosfera);
    }

    // -----------------------------------------------------------------
    // Movimiento de fondos: nivel 1 -> nivel 2 -> nivel 3
    // -----------------------------------------------------------------
    iniciarMovimiento() {
        if (this.movimientoIniciado) {
            return;
        }
        this.movimientoIniciado = true;

        const escena = this.escena;
        const alto = escena.scale.height;

        escena.tweens.add({
            targets: [
                this.fondo1,
                this.fondo2,
                this.fondo3
            ],
            y: `+=${ alto }`,
            duration: this.duracionMovimiento,
            ease: "Sine.easeInOut",
            onStart: () => {
                escena.tweens.add({
                    targets: this.capaTransicion,
                    alpha: 0.08,
                    duration: 1200
                });
                escena.tweens.add({
                    targets: this.atmosfera,
                    alpha: 0.1,
                    duration: 1500
                });
            },
            onComplete: () => {
                // ---------------- NIVEL 2 ----------------
                escena.nivelActual = 2;
                escena.modUI.setTextoNivel(Idioma.t("juego.nivel2"));
                escena.tweens.add({
                    targets: this.capaTransicion,
                    alpha: 0,
                    duration: 1200
                });
                escena.tweens.add({
                    targets: this.atmosfera,
                    alpha: 0.12,
                    duration: 1500
                });
                escena.tweens.add({
                    targets: [
                        this.fondo1,
                        this.fondo2,
                        this.fondo3
                    ],
                    y: `+=${ alto }`,
                    duration: this.duracionMovimiento,
                    ease: "Sine.easeInOut",
                    onStart: () => {
                        escena.tweens.add({
                            targets: this.capaTransicion,
                            alpha: 0.08,
                            duration: 1200
                        });
                    },
                    onComplete: () => {
                        // ---------------- NIVEL 3 ----------------
                        escena.nivelActual = 3;
                        escena.modUI.setTextoNivel(Idioma.t("juego.nivel3"));
                        this.atmosfera.setFillStyle(0xd9d2ff, 0.12);
                        escena.tweens.add({
                            targets: this.atmosfera,
                            alpha: 0.14,
                            duration: 1800
                        });
                        escena.tweens.add({
                            targets: this.capaTransicion,
                            alpha: 0,
                            duration: 1400
                        });
                        escena.modEnemigos.eliminarTodos();
                        escena.modBoss.inicializar();
                    }
                });
            }
        });
    }
}