// =====================================================================
// UTILIDADES COMPARTIDAS DEL JUEGO
// =====================================================================
class UtilJuego {

    // -----------------------------------------------------------------
    // Textura de partículas (rastros, victoria). Se crea una sola vez.
    // -----------------------------------------------------------------
    static asegurarTexturaRastro(escena) {
        if (!escena.textures.exists("particulaRastro")) {
            let pG = escena.make.graphics({
                x: 0,
                y: 0,
                add: false
            });
            pG.fillStyle(0xffffff, 1);
            pG.fillCircle(4, 4, 4);
            pG.generateTexture("particulaRastro", 8, 8);
        }
    }

    // -----------------------------------------------------------------
    // Límites del área jugable (según el marco lateral)
    // -----------------------------------------------------------------
    static obtenerLimitesJugables(ancho) {
        const margen = window.calcularMargenMarco(ancho);
        return {
            margen: margen,
            izquierdo: margen,
            derecho: ancho - margen
        };
    }

    // -----------------------------------------------------------------
    // Posición X aleatoria dentro del área jugable
    // -----------------------------------------------------------------
    static posicionXAleatoriaJugable(ancho, paddingInterno = 20) {
        const limites = UtilJuego.obtenerLimitesJugables(ancho);
        let minX = limites.izquierdo + paddingInterno;
        let maxX = limites.derecho - paddingInterno;
        if (maxX <= minX) {
            minX = limites.izquierdo;
            maxX = limites.derecho;
        }
        return Phaser.Math.FloatBetween(minX, maxX);
    }

    // -----------------------------------------------------------------
    // Escala, hitbox circular y brillo de un sprite (enemigo/item/boss)
    // -----------------------------------------------------------------
    static configurarEntidadGrafica(sprite, tamanoMaximo, colorGlow) {
        const ancho = sprite.width;
        const alto = sprite.height;
        if (ancho > 0 && alto > 0) {
            const escala = Math.min(tamanoMaximo / ancho, tamanoMaximo / alto);
            sprite.setScale(escala);
            let radio = Math.min(ancho, alto) / 2 * 0.8;
            sprite.body.setCircle(radio, ancho / 2 - radio, alto / 2 - radio);
        }
        if (sprite.preFX && sprite.preFX.list.length === 0) {
            sprite.preFX.addGlow(colorGlow, 4, 1, false, 0.1, 15);
        }
    }

    // -----------------------------------------------------------------
    // Rastro de partículas que sigue a una entidad
    // -----------------------------------------------------------------
    static configurarEmisorRastro(escena, entidad, colores, frecMinima = 25) {
        if (entidad.emisor) {
            entidad.emisor.setConfig({ color: colores });
            entidad.emisor.emitting = true;
        } else {
            entidad.emisor = escena.add.particles(0, 0, "particulaRastro", {
                speed: {
                    min: 10,
                    max: 40
                },
                scale: {
                    start: 1.2,
                    end: 0
                },
                alpha: {
                    start: 0.8,
                    end: 0
                },
                lifespan: 350,
                blendMode: "ADD",
                color: colores,
                frequency: frecMinima
            });
            entidad.emisor.startFollow(entidad);
        }
    }
}