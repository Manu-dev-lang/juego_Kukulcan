// Lienzo virtual sobre el que se dibuja todo
const CINE_ANCHO = 1280;
const CINE_ALTO = 720;

// Zona de la página donde se reparten las viñetas
const CINE_AREA = { x: 40, y: 64, w: 1200, h: 596 };

// Separación (canaleta) entre viñetas
const CINE_GOTA = 16;

// Inclinación de reposo de las viñetas (grados)
const CINE_INCLINACION = [-0.5, 0.4, -0.3, 0.5];

// Layouts disponibles. Cada viñeta es [x, y, ancho, alto] como fracción
const CINE_LAYOUTS = {
    unico:         [[0, 0, 1, 1]],
    dos_lado:      [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
    dos_apilados:  [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]],
    tres_columnas: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
    grande_y_dos:  [[0, 0, 1, 0.58], [0, 0.58, 0.5, 0.42], [0.5, 0.58, 0.5, 0.42]],
    dos_y_grande:  [[0, 0, 0.5, 0.42], [0.5, 0, 0.5, 0.42], [0, 0.42, 1, 0.58]],
    cuatro:        [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    mosaico:       [[0, 0, 0.42, 1], [0.42, 0, 0.58, 0.5], [0.42, 0.5, 0.58, 0.5]]
};

// =====================================================================
// LAS CINEMÁTICAS
// =====================================================================
const CINEMATICAS = {

    // -----------------------------------------------------------------
    // SKIN NORMAL  (carpeta assets_normal/)
    // -----------------------------------------------------------------
    normal: {
        titulo: { es: "Prólogo", en: "Prologue" },
        animacion: "comic",
        ambiente: "eclipse",
        velocidadTexto: 28,                        // milisegundos por letra
        estilo: {
            papel: 0xefe0bd,          // color del fondo de la página
            puntos: 0x8a6d3b,         // puntitos de semitono del fondo
            caja: 0xffe9a8,           // caja de narración
            tinta: "#2b1d08",         // color de textos e indicadores
            botonFondo: "#1a5e20",    // botón SALTAR
            botonHover: "#00ff7f",
            rellenoA: "#1f6b4a",      // colores del panel de relleno
            rellenoB: "#0b2e22"
        },
        paginas: [
            {
                layout: "grande_y_dos",
                paneles: [
                    {
                        imagen: "cinematica/cine_01.png",
                        entrada: "fundido",
                        textos: [
                            { tipo: "narracion", pos: "abajo-izq", texto: { es: "El día amaneció dorado sobre la selva, y Kukulcán, la serpiente de plumas y luz, despertó entre los templos.", en: "The day dawned golden over the jungle, and Kukulcán, the serpent of feathers and light, awoke among the temples." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_02.png",
                        entrada: "izquierda",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Los sabios lo habían anunciado en los códices: ese día, la luna se cruzaría frente al sol.", en: "The sages had foretold it in the codices: on that day, the moon would pass in front of the sun." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_03.png",
                        entrada: "derecha",
                        zoom: "out",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Al principio nadie lo notó. El cielo seguía brillante, y la sombra avanzaba muy despacio.", en: "At first, no one noticed. The sky was still bright, and the shadow crept forward very slowly." } }
                        ]
                    }
                ]
            },
            {
                layout: "tres_columnas",
                paneles: [
                    {
                        imagen: "cinematica/cine_04.png",
                        entrada: "arriba",
                        textos: [
                            { tipo: "narracion", pos: "arriba", texto: { es: "Pero el eclipse ya había comenzado.", en: "But the eclipse had already begun." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_05.png",
                        entrada: "golpe",
                        sfx: { texto: { es: "¡TUM!", en: "THUMP!" }, pos: [0.5, 0.45], angulo: -10, color: "#ffe14d", tam: 74 },
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Una fina sombra tocó el borde del sol, y la selva contuvo el aliento.", en: "A thin shadow touched the edge of the sun, and the jungle held its breath." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_06.png",
                        entrada: "abajo",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "La luz aún llenaba el mundo, pero cada instante quedaba un poco menos.", en: "Light still filled the world, but with every moment there was a little less of it." } }
                        ]
                    }
                ]
            },
            {
                layout: "unico",
                paneles: [
                    {
                        imagen: "cinematica/cine_07.png",
                        entrada: "zoom",
                        textos: [
                            { tipo: "narracion", pos: "arriba", texto: { es: "Kukulcán debía ascender a Ka'an, atravesando la selva y la copa de los árboles, antes de que el eclipse terminara de cubrir el sol.", en: "Kukulcán had to ascend to Ka'an, crossing the jungle and the treetops, before the eclipse could finish covering the sun." } },
                            { tipo: "narracion", pos: "abajo", texto: { es: "Solo así su luz no se apagaría, y el firmamento volvería a brillar.", en: "Only then would his light not go out, and the firmament shine again." } }
                        ]
                    }
                ]
            }
        ]
    },

    // -----------------------------------------------------------------
    // SKIN NAVIDEÑA  (carpeta assets_navidad/)
    // -----------------------------------------------------------------
    navidad: {
        titulo: { es: "Prólogo", en: "Prologue" },
        animacion: "estrella",
        velocidadPalabra: 170,                     // milisegundos por palabra
        estilo: {
            papel: 0xe4eff9,
            puntos: 0x5b8fb9,
            caja: 0xd6efff,
            tinta: "#12324f",
            botonFondo: "#b71c1c",
            botonHover: "#ff5252",
            rellenoA: "#2a5f8f",
            rellenoB: "#0d2238"
        },
        paginas: [
            {
                layout: "grande_y_dos",
                paneles: [
                    {
                        imagen: "cinematica/cine_01.png",
                        entrada: "amanecer",
                        textos: [
                            { tipo: "narracion", pos: "abajo-izq", texto: { es: "Una noche, en el lejano Oriente, unos sabios vieron nacer una estrella nueva en el cielo.", en: "One night, in the distant East, some wise men saw a new star appear in the sky." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_02.png",
                        entrada: "florecer",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Era una señal: había nacido un niño, y esa estrella debía guiarlos hasta él.", en: "It was a sign: a child had been born, and that star was to guide them to him." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_03.png",
                        entrada: "descender",
                        zoom: "out",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Pero la noche era larga y el camino hasta Belén estaba lleno de sombras.", en: "But the night was long, and the road to Bethlehem was full of shadows." } }
                        ]
                    }
                ]
            },
            {
                layout: "tres_columnas",
                paneles: [
                    {
                        imagen: "cinematica/cine_04.png",
                        entrada: "descender",
                        textos: [
                            { tipo: "narracion", pos: "arriba", texto: { es: "Nubes de tormenta cubrieron el cielo.", en: "Storm clouds covered the sky." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_05.png",
                        entrada: "florecer",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Las sombras quisieron apagar su luz para que nadie encontrara el camino.", en: "The shadows tried to put out its light so that no one would find the way." } }
                        ]
                    },
                    {
                        imagen: "cinematica/cine_06.png",
                        entrada: "destello",
                        textos: [
                            { tipo: "narracion", pos: "abajo", texto: { es: "Pero la estrella resistió, y su brillo se hizo más fuerte.", en: "But the star held on, and its glow grew stronger." } }
                        ]
                    }
                ]
            },
            {
                layout: "unico",
                paneles: [
                    {
                        imagen: "cinematica/cine_07.png",
                        entrada: "amanecer",
                        textos: [
                            { tipo: "narracion", pos: "arriba", texto: { es: "Para vencer a las sombras, la estrella gastó todo su poder en una última estela de luz, y sin fuerzas cayó a la tierra.", en: "To defeat the shadows, the star spent all its power on one last trail of light, and, with no strength left, it fell to the earth." } },
                            { tipo: "narracion", pos: "abajo", texto: { es: "Ahora debe volver al cielo, esquivar las sombras y reunir luz para guiar a los viajeros hasta el pesebre de Belén.", en: "Now it must return to the sky, dodge the shadows, and gather light to guide the travelers to the manger in Bethlehem." } }
                        ]
                    }
                ]
            }
        ]
    }
};

// =====================================================================
// PANTALLA DE VICTORIA (cuando el jefe es derrotado)
// =====================================================================
const VICTORIA_JEFE = {
    normal: {
        imagen: "cinematica/victoria_jefe.png",
        texto: { es: "Kukulcán lo logró: el eclipse se desvaneció y la luz volvió a bañar la selva. Desde lo alto de Ka'an, el sol brilla otra vez.", en: "Kukulcán did it: the eclipse faded away and light poured over the jungle once more. From atop Ka'an, the sun shines again." },
        sfx: { texto: { es: "¡VICTORIA!", en: "VICTORY!" }, pos: [0.80, 0.16], angulo: -8, color: "#ffe14d", tam: 64 }
    },
    navidad: {
        imagen: "cinematica/victoria_jefe.png",
        texto: { es: "Las sombras fueron vencidas y la estrella volvió a su lugar. Su luz ahora señala el pesebre de Belén y guía a los viajeros hasta el niño.", en: "The shadows were defeated and the star returned to its place. Its light now points to the manger in Bethlehem, guiding the travelers to the child." },
        sfx: { texto: { es: "¡VICTORIA!", en: "VICTORY!" }, pos: [0.80, 0.16], angulo: -8, color: "#9be7ff", tam: 64 }
    }
};