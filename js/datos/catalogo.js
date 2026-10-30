// Cuántas obras se ven a la vez en una sala
const TIENDA_POR_PAGINA = 4;

// Tamaño de las imágenes del Museo (las skins del Taller NO usan imagen)
const TIENDA_TAMANO_SUGERIDO = "900x1200 (vertical 3:4)";

const CATALOGO_TIENDA = {

    // -----------------------------------------------------------------
    // SKIN NORMAL  (carpeta assets_normal/)
    // -----------------------------------------------------------------
    normal: {
        estilo: {
            paredA: 0x1b3a2d,
            paredB: 0x0f241b,
            friso: 0xd4a73a,
            frisoTipo: "piramides",
            piso: 0x2b1d10,
            pisoLinea: 0x3d2a17,
            pisoTipo: "madera",
            marco: 0xd4a73a,
            marcoSombra: 0x6f5216,
            paspartu: 0xefe0bd,
            placa: 0x140d05,
            luz: 0xfff0c2,
            textoPlaca: "#f3dc94",
            textoClaro: "#e9e0c8",
            textoTenue: "#9a8a5c",
            acento: "#00ff7f",
            sinSaldo: "#ff8a80",
            botonFondo: "#1a5e20",
            botonHover: "#00ff7f"
        },
        salas: {
            plumas: {
                nombre: { es: "Museo de Arte 2D", en: "2D Art Museum" },
                subtitulo: {
                    es: "Bocetos y diseños que quedaron fuera del juego",
                    en: "Sketches and designs that didn't make it into the game"
                },
                moneda: "plumas",
                icono: "ItemPlu",             // textura ya cargada en Carga
                sonido: "sonido_pluma",       // suena al comprar
                items: [
                    {
                        id: "arte_01",
                        titulo: { es: "Kukulcán, primer boceto", en: "Kukulcán, first sketch" },
                        detalle: { es: "La serpiente emplumada en sus primeros trazos: una cabeza verde, un pico amarillo y plumas rojas que ya prometían a un héroe.", en: "The feathered serpent in its first strokes: a green head, a yellow beak and red feathers that already promised a hero." },
                        precio: 25,
                        imagen: "tienda/arte_01.png"
                    },
                    {
                        id: "arte_02",
                        titulo: { es: "Selva a medianoche", en: "Jungle at midnight" },
                        detalle: { es: "Una pequeña estrella despierta al pie de un árbol gigante, junto a un estanque rodeado de rocas, en plena noche de selva.", en: "A tiny star awakens at the foot of a giant tree, beside a pond ringed with rocks, deep in the jungle night." },
                        precio: 40,
                        imagen: "tienda/arte_02.png"
                    },
                    {
                        id: "arte_03",
                        titulo: { es: "Kukulcán sobre la copa", en: "Kukulcán above the canopy" },
                        detalle: { es: "Un enorme Kukulcán se asoma entre las nubes, sobre una copa de árboles salpicada de flores azules.", en: "A huge Kukulcán rises through the clouds, above a treetop canopy dotted with blue flowers." },
                        precio: 60,
                        imagen: "tienda/arte_03.png"
                    },
                    {
                        id: "arte_04",
                        titulo: { es: "Luna carmesí", en: "Crimson moon" },
                        detalle: { es: "Una pequeña estrella asciende entre nubes rosadas mientras una luna roja la vigila desde lo alto.", en: "A tiny star rises among pink clouds while a red moon watches over it from above." },
                        precio: 80,
                        imagen: "tienda/arte_04.png"
                    }
                ]
            },
            jades: {
                nombre: { es: "Taller de Skins", en: "Skin Workshop" },
                subtitulo: {
                    es: "Pinta a tu héroe y a tus enemigos: cada skin trae una habilidad",
                    en: "Paint your hero and your enemies: every skin comes with an ability"
                },
                moneda: "jades",
                icono: "ItemGem",
                sonido: "sonido_jade",
                // Las skins NO usan imagen: se pintan en código con las mismas
                // texturas del juego (vista) y un tinte. "categoria" dice qué
                // pinta: "jugador" o "enemigos". Solo hay una equipada por categoría.
                items: [
                    {
                        id: "skin_jugador_1",
                        categoria: "jugador",
                        tinte: 0x35e0a1,
                        vista: ["jugador1"],
                        titulo: { es: "Kukulcán esmeralda", en: "Emerald Kukulcán" },
                        detalle: { es: "La serpiente de luz con escamas verde esmeralda.", en: "The serpent of light with emerald-green scales." },
                        habilidad: {
                            id: "iman_plumas",
                            nombre: { es: "Imán de plumas", en: "Feather magnet" },
                            texto: { es: "Las plumas cercanas vuelan hacia ti.", en: "Nearby feathers fly toward you." }
                        },
                        precio: 30
                    },
                    {
                        id: "skin_jugador_2",
                        categoria: "jugador",
                        tinte: 0x8f7bff,
                        vista: ["jugador1"],
                        titulo: { es: "Kukulcán, vuelo nocturno", en: "Kukulcán, night flight" },
                        detalle: { es: "Una versión más oscura, pensada para el nivel final.", en: "A darker version, made for the final level." },
                        habilidad: {
                            id: "luz_lenta",
                            nombre: { es: "Luz persistente", en: "Lingering light" },
                            texto: { es: "Tu luz se apaga mucho más despacio.", en: "Your light fades much more slowly." }
                        },
                        precio: 45
                    },
                    {
                        id: "skin_jugador_3",
                        categoria: "jugador",
                        tinte: 0xff8a3d,
                        vista: ["jugador1"],
                        titulo: { es: "Kukulcán, forma ancestral", en: "Kukulcán, ancestral form" },
                        detalle: { es: "El diseño más antiguo de la serpiente, lleno de poder.", en: "The oldest design of the serpent, full of power." },
                        habilidad: {
                            id: "supernova_rapida",
                            nombre: { es: "Poder ancestral", en: "Ancestral power" },
                            texto: { es: "La supernova se activa con solo 2 jades.", en: "The supernova triggers with just 2 jades." }
                        },
                        precio: 70
                    },
                    {
                        id: "skin_enemigos_dorado",
                        categoria: "enemigos",
                        tinte: 0xffd700,
                        brillo: 0xffd700,
                        estela: [0xffd700, 0xffa500, 0xfff2a8],
                        vista: ["enemigo_1", "enemigo_2", "boss2"],
                        titulo: { es: "Enemigos dorados", en: "Golden enemies" },
                        detalle: { es: "Todos los enemigos se bañan en oro.", en: "Every enemy is bathed in gold." },
                        habilidad: {
                            id: "inmune_supernova",
                            nombre: { es: "Coraza de oro", en: "Golden armor" },
                            texto: {
                                es: "¡Cuidado! Los enemigos dorados resisten la onda de la supernova.",
                                en: "Careful! Golden enemies resist the supernova wave."
                            }
                        },
                        precio: 25
                    }
                ]
            }
        }
    },

    // -----------------------------------------------------------------
    // SKIN NAVIDEÑA  (carpeta assets_navidad/)
    // -----------------------------------------------------------------
    navidad: {
        estilo: {
            paredA: 0x13294a,
            paredB: 0x0a1729,
            friso: 0xffd700,
            frisoTipo: "guirnalda",
            piso: 0x5a1220,
            pisoLinea: 0x7a1c2e,
            pisoTipo: "alfombra",
            marco: 0xe2b93b,
            marcoSombra: 0x7a5a12,
            paspartu: 0xe4eff9,
            placa: 0x08121f,
            luz: 0xdff4ff,
            textoPlaca: "#ffe9a8",
            textoClaro: "#dcecff",
            textoTenue: "#7f9bbd",
            acento: "#00ffff",
            sinSaldo: "#ff8a80",
            botonFondo: "#b71c1c",
            botonHover: "#ff5252"
        },
        salas: {
            plumas: {
                nombre: { es: "Museo de Arte 2D", en: "2D Art Museum" },
                subtitulo: {
                    es: "Bocetos y diseños que quedaron fuera del juego",
                    en: "Sketches and designs that didn't make it into the game"
                },
                moneda: "plumas",
                icono: "ItemPlu",             // textura ya cargada en Carga
                sonido: "sonido_pluma",       // suena al comprar
                items: [
                    {
                        id: "arte_01",
                        titulo: { es: "La estrella, primer boceto", en: "The star, first sketch" },
                        detalle: { es: "Antes de guiar a los sabios, tenía otra forma.", en: "Before guiding the wise men, it had a different shape." },
                        precio: 25,
                        imagen: "tienda/arte_01.png"
                    },
                    {
                        id: "arte_02",
                        titulo: { es: "Montañas nevadas", en: "Snowy mountains" },
                        detalle: { es: "Boceto del primer nivel: montañas nevadas bajo un cielo de niebla violeta, con pinos oscuros y un valle de nieve al frente.", en: "Sketch of the first level: snowy mountains under a violet misty sky, with dark pines and a snowy valley in the foreground." },
                        precio: 40,
                        imagen: "tienda/arte_02.png"
                    },
                    {
                        id: "arte_03",
                        titulo: { es: "Luna sobre las nubes", en: "Moon above the clouds" },
                        detalle: { es: "Boceto del segundo nivel: una luna resplandeciente derrama rayos de luz sobre un mar de nubes, en un cielo nocturno con estrellas.", en: "Sketch of the second level: a glowing moon pours rays of light over a sea of clouds, in a starry night sky." },
                        precio: 60,
                        imagen: "tienda/arte_03.png"
                    },
                    {
                        id: "arte_04",
                        titulo: { es: "Noche estrellada", en: "Starry night" },
                        detalle: { es: "Boceto del tercer nivel: un cielo nocturno cuajado de estrellas sobre colinas suaves y pinos oscuros que se pierden en la sombra.", en: "Sketch of the third level: a night sky packed with stars above gentle hills and dark pines fading into the shadows." },
                        precio: 80,
                        imagen: "tienda/arte_04.png"
                    }
                ]
            },
            jades: {
                nombre: { es: "Taller de Skins", en: "Skin Workshop" },
                subtitulo: {
                    es: "Pinta a tu héroe y a tus enemigos: cada skin trae una habilidad",
                    en: "Paint your hero and your enemies: every skin comes with an ability"
                },
                moneda: "jades",
                icono: "ItemGem",
                sonido: "sonido_jade",
                // Las skins NO usan imagen: se pintan en código con las mismas
                // texturas del juego (vista) y un tinte. "categoria" dice qué
                // pinta: "jugador" o "enemigos". Solo hay una equipada por categoría.
                items: [
                    {
                        id: "skin_jugador_1",
                        categoria: "jugador",
                        tinte: 0x4cff9a,
                        vista: ["jugador1"],
                        titulo: { es: "La estrella verde", en: "The green star" },
                        detalle: { es: "Una estrella con brillo de pino y esperanza.", en: "A star glowing with pine and hope." },
                        habilidad: {
                            id: "iman_plumas",
                            nombre: { es: "Imán de regalos", en: "Gift magnet" },
                            texto: { es: "Los regalos cercanos vuelan hacia ti.", en: "Nearby gifts fly toward you." }
                        },
                        precio: 30
                    },
                    {
                        id: "skin_jugador_2",
                        categoria: "jugador",
                        tinte: 0x9be7ff,
                        vista: ["jugador1"],
                        titulo: { es: "La estrella, luz de escarcha", en: "The star, frost light" },
                        detalle: { es: "El diseño más frío y más duradero de la estrella.", en: "The coldest and longest-lasting design of the star." },
                        habilidad: {
                            id: "luz_lenta",
                            nombre: { es: "Luz persistente", en: "Lingering light" },
                            texto: { es: "Tu luz se apaga mucho más despacio.", en: "Your light fades much more slowly." }
                        },
                        precio: 45
                    },
                    {
                        id: "skin_jugador_3",
                        categoria: "jugador",
                        tinte: 0xff4d6d,
                        vista: ["jugador1"],
                        titulo: { es: "La estrella, brillo carmesí", en: "The star, crimson glow" },
                        detalle: { es: "Una versión encendida, hecha para el nivel final.", en: "A blazing version, made for the final level." },
                        habilidad: {
                            id: "supernova_rapida",
                            nombre: { es: "Poder ancestral", en: "Ancestral power" },
                            texto: { es: "La supernova se activa con solo 2 mirras.", en: "The supernova triggers with just 2 myrrh." }
                        },
                        precio: 70
                    },
                    {
                        id: "skin_enemigos_dorado",
                        categoria: "enemigos",
                        tinte: 0xffd700,
                        brillo: 0xffd700,
                        estela: [0xffd700, 0xffa500, 0xfff2a8],
                        vista: ["enemigo_1", "enemigo_2", "boss2"],
                        titulo: { es: "Sombras doradas", en: "Golden shadows" },
                        detalle: { es: "Todas las sombras se visten de oro.", en: "Every shadow is dressed in gold." },
                        habilidad: {
                            id: "inmune_supernova",
                            nombre: { es: "Coraza de oro", en: "Golden armor" },
                            texto: {
                                es: "¡Cuidado! Los enemigos dorados resisten la onda de la supernova.",
                                en: "Careful! Golden enemies resist the supernova wave."
                            }
                        },
                        precio: 25
                    }
                ]
            }
        }
    }
};

// =====================================================================
// SKINS DE LA TIENDA (lo que el juego consulta al empezar una partida)
//
//   SkinsTienda.activa("jugador")    -> objeto del catálogo o null
//   SkinsTienda.activa("enemigos")   -> objeto del catálogo o null
//   SkinsTienda.habilidad("jugador") -> "iman_plumas" | "luz_lenta" |
//                                       "supernova_rapida" | null
//   SkinsTienda.habilidad("enemigos")-> "inmune_supernova" | null
//
// Solo cuenta si la skin está COMPRADA y EQUIPADA. Sin skin puesta no hay
// tinte ni habilidad.
// =====================================================================
class SkinsTienda {

    static buscar(id, skin = Progreso.idSkin()) {
        const cfg = CATALOGO_TIENDA[skin];
        if (!cfg) {
            return null;
        }
        const salas = Object.keys(cfg.salas);
        for (let s = 0; s < salas.length; s++) {
            const items = cfg.salas[salas[s]].items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === id) {
                    return items[i];
                }
            }
        }
        return null;
    }

    static activa(categoria, skin = Progreso.idSkin()) {
        const id = Progreso.equipada(categoria, skin);
        if (!id) {
            return null;
        }
        const item = SkinsTienda.buscar(id, skin);
        return item && item.categoria === categoria ? item : null;
    }

    static habilidad(categoria, skin = Progreso.idSkin()) {
        const item = SkinsTienda.activa(categoria, skin);
        return item && item.habilidad ? item.habilidad.id : null;
    }
}