class Carga extends Phaser.Scene {
    constructor() {
        super("Carga");
    }

    preload() {
        let ancho = this.scale.width;
        let alto = this.scale.height;

        // Detectar si la carpeta seleccionada es la versión Navideña
        let ruta = window.carpetaSkin || "assets_normal/"; 
        this.esNavidad = ruta.includes("navidad");

        // --- Configuración Visual ---
        const xBase = ancho / 2;
        // La estrella navideña va más abajo para que su brillo y sus partículas
        // no tapen el texto de carga. La serpiente conserva su posición original.
        const yBase = alto / 2 + (this.esNavidad ? 280 : 220);
        const anchoSerpiente = 600; 
        const altoSerpiente = 150; 
        const radioEstrella = 100;

        // ==========================================
        // Fondo y Logo
        // ==========================================
        if (this.textures.exists('menu_background')) {
            let fondo = this.add.image(ancho/2, alto/2, 'menu_background').setOrigin(0.5);
            fondo.setDisplaySize(ancho, alto);
        }
        if (this.textures.exists('logo')) {
            let logo = this.add.image(ancho / 2, alto / 2 - 180, "logo");
            logo.setScale(0.3);
        }

        // ==========================================
        // MARCO LATERAL (LÍMITE VISUAL DEL ÁREA JUGABLE)
        // ==========================================
        this.graficosMarco = this.add.graphics();
        window.dibujarMarcoLateral(this.graficosMarco, ancho, alto, this.esNavidad);

        // Texto temático dinámico según la skin
        let textoCarga = this.esNavidad 
            ? Idioma.t("carga.navidad") 
            : Idioma.t("carga.normal");
            
        let colorTexto = this.esNavidad ? "#00ffff" : "#00ff7f";

        this.add.text(ancho / 2, alto / 2 + 90, textoCarga, {
            fontSize: "24px",
            fill: colorTexto,
            fontStyle: "bold",
            fontFamily: "Arial",
            stroke: '#000000', 
            strokeThickness: 3
        }).setOrigin(0.5);

        // --------------------------------------------------------
        // 1. DIBUJO DE LA FORMA (SERPIENTE O ESTRELLA)
        // --------------------------------------------------------
        let graficoRelleno;

        if (this.esNavidad) {
            // Fondo de la estrella (Gris/Oscuro)
            let estrellaGris = this.add.graphics();
            this.dibujarEstrella(estrellaGris, xBase, yBase, 5, radioEstrella, radioEstrella / 2, 0x444444, 0x222222);

            // Estrella cargada (Dorada brillante)
            graficoRelleno = this.add.graphics();
            this.dibujarEstrella(graficoRelleno, xBase, yBase, 5, radioEstrella, radioEstrella / 2, 0xffd700, 0xffffff);
        } else {
            // Serpiente gris y verde
            let serpienteGris = this.add.graphics();
            this.dibujarFormaKukulcan(serpienteGris, xBase, yBase, anchoSerpiente, altoSerpiente, 0x555555); 

            graficoRelleno = this.add.graphics();
            this.dibujarFormaKukulcan(graficoRelleno, xBase, yBase, anchoSerpiente, altoSerpiente, 0x00ff7f); 
        }

        // --------------------------------------------------------
        // 2. MÁSCARA DE RECORTE (EFECTO DE LLENADO)
        // --------------------------------------------------------
        this.mascaraCarga = this.make.graphics({x: 0, y: 0, add: false});
        graficoRelleno.setMask(this.mascaraCarga.createGeometryMask());

        // --------------------------------------------------------
        // 3. SISTEMA DE PARTÍCULAS
        // --------------------------------------------------------
        if (!this.textures.exists('energia_maya')) {
            let pTextura = this.make.graphics({x: 0, y: 0, add: false});
            pTextura.fillStyle(0xffffff);
            pTextura.fillCircle(4, 4, 4); 
            pTextura.generateTexture('energia_maya', 8, 8);
        }

        let coloresParticulas = this.esNavidad
            ? [0xffffff, 0xffd700, 0x00ffff, 0xff4500]
            : [0x00ffff, 0x00ff7f, 0x40e0d0];

        this.particulasKukulcan = this.add.particles(0, 0, 'energia_maya', {
            speed: { min: 60, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 700,
            gravityY: -50,
            color: coloresParticulas,
            frequency: 15,
            emitting: false
        });

        // --------------------------------------------------------
        // 4. ACTUALIZACIÓN DEL PROGRESO (DINÁMICO)
        // --------------------------------------------------------
        this.load.on("progress", (value) => {
            this.mascaraCarga.clear();
            this.mascaraCarga.fillStyle(0xffffff, 1);
            
            if (this.esNavidad) {
                // Llenado de abajo hacia arriba para la Estrella
                let altoMascara = (radioEstrella * 2 + 40) * value;
                let yInicio = (yBase + radioEstrella + 20) - altoMascara;
                
                this.mascaraCarga.fillRect(xBase - radioEstrella - 20, yInicio, (radioEstrella + 20) * 2, altoMascara);

                if (value > 0.05) {
                    this.particulasKukulcan.emitting = true;
                    let xAleatoria = xBase + (Math.random() * radioEstrella - radioEstrella / 2);
                    this.particulasKukulcan.setPosition(xAleatoria, yInicio);
                }
            } else {
                // Llenado horizontal con la curva de Kukulcán
                let mascaraAncho = (anchoSerpiente + 100) * value;
                this.mascaraCarga.fillRect(xBase - (anchoSerpiente / 2) - 50, yBase - altoSerpiente, mascaraAncho, altoSerpiente * 2);

                if (value > 0.05) {
                    let posCabeza = this.obtenerPuntoEnCurva(value, xBase, yBase, anchoSerpiente, altoSerpiente);
                    this.particulasKukulcan.emitting = true;
                    this.particulasKukulcan.setPosition(posCabeza.x, posCabeza.y);
                }
            }
        });

        // --------------------------------------------------------
        // Assets a Cargar (DINÁMICO)
        // --------------------------------------------------------
        this.load.setPath(ruta);

        this.load.image("boton_jugar", "boton_jugar.png");
        this.load.image("boton_salir", "boton_salir.png");
        this.load.image("menu_background", "menu_background.png");
        this.load.image("ItemPlu", "ItemPlu.png"); 
        this.load.image("ItemGem", "ItemGem.png"); 
        this.load.image("sprite_1", "sprite_1.png");
        this.load.image("sprite_2", "sprite_2.png");
        this.load.image("jugador1", "jugador1.png");
        this.load.image("jugador2", "jugador2.png");
        this.load.image("jugador3", "jugador3.png");
        this.load.image("enemigo_1", "enemigo_1.png");
        this.load.image("enemigo_2", "enemigo_2.png");
        this.load.image("boss1", "boss1.png");   // jefe con la boca abierta
        this.load.image("boss2", "boss2.png");   // jefe con la boca cerrada
        this.load.image("fondo1", "fondo1.jpg");
        this.load.image("fondo2", "fondo2.jpg");
        this.load.image("fondo3", "fondo3.jpg");

        // Botones con texto en inglés (opcionales: si no existen, se usan los de español)
        if (Idioma.actual() === "en") {
            this.load.image("boton_jugar_en", "boton_jugar_en.png");
            this.load.image("boton_salir_en", "boton_salir_en.png");
        }
        
        this.load.audio("musica", "musica.mp3"); 
        this.load.audio("musicaG", "musicaG.mp3");
        this.load.audio("musicaJ", "musicaJ.mp3");

        // --- CARGA DE LOS NUEVOS SONIDOS DE RECOLECCIÓN ---
        this.load.audio("sonido_pluma", "sonido_pluma.mp3");
        this.load.audio("sonido_jade", "sonido_jade.mp3");
        
        // --- CARGA DEL SONIDO DE CHOQUE CON ENEMIGOS ---
        this.load.audio("sonido_choque", "sonido_choque.mp3");

        // Simulación de carga larga
        for (let i = 0; i < 60; i++) {
            this.load.image("fake_asset_" + i, "sprite_1.png");
        }
    }

    create() {
        let ancho = this.scale.width;
        let alto = this.scale.height;

        this.mascaraCarga.clear();
        this.mascaraCarga.fillStyle(0xffffff, 1);
        const xBase = ancho / 2;
        const yBase = alto / 2 + (this.esNavidad ? 280 : 220);
        const anchoSerpiente = 600;
        const altoSerpiente = 150;
        const radioEstrella = 100;
        
        if (this.esNavidad) {
            this.mascaraCarga.fillRect(xBase - radioEstrella - 30, yBase - radioEstrella - 30, (radioEstrella + 30) * 2, (radioEstrella + 30) * 2);
        } else {
            this.mascaraCarga.fillRect(xBase - (anchoSerpiente / 2) - 50, yBase - altoSerpiente, anchoSerpiente + 100, altoSerpiente * 2);
        }

        this.tweens.add({
            targets: this.mascaraCarga,
            alpha: { from: 1, to: 0.8 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.time.delayedCall(1800, () => {
            this.scene.start("Inicio");
        });
    }

    // Dibujar la figura de la serpiente Kukulcán
    dibujarFormaKukulcan(graphics, x, y, ancho, alto, color) {
        graphics.clear();
        const segmentos = 100; 

        graphics.lineStyle(38, 0x000000, 1);
        graphics.beginPath();
        for (let i = 0; i <= segmentos; i++) {
            let t = i / segmentos;
            let punto = this.obtenerPuntoEnCurva(t, x, y, ancho, alto);
            if (i === 0) graphics.moveTo(punto.x, punto.y);
            else graphics.lineTo(punto.x, punto.y);
        }
        graphics.strokePath();

        graphics.lineStyle(30, color, 1);
        graphics.beginPath();
        for (let i = 0; i <= segmentos; i++) {
            let t = i / segmentos;
            let punto = this.obtenerPuntoEnCurva(t, x, y, ancho, alto);
            if (i === 0) graphics.moveTo(punto.x, punto.y);
            else graphics.lineTo(punto.x, punto.y);
        }
        graphics.strokePath();

        let cabeza = this.obtenerPuntoEnCurva(1, x, y, ancho, alto);
        
        graphics.fillStyle(color, 1);
        graphics.lineStyle(4, 0x000000, 1);
        graphics.fillCircle(cabeza.x, cabeza.y, 30);
        graphics.strokeCircle(cabeza.x, cabeza.y, 30);

        for(let i=0; i<12; i++){
            let angulo = (i / 12) * Math.PI * 2;
            let px = cabeza.x + 40 * Math.cos(angulo);
            let py = cabeza.y + 40 * Math.sin(angulo);
            graphics.fillCircle(px, py, 8);
            graphics.strokeCircle(px, py, 8);
        }
    }

    // Dibujar la Estrella de Navidad
    dibujarEstrella(graphics, x, y, puntos, radioExterior, radioInterior, colorRelleno, colorBorde) {
        graphics.clear();
        graphics.lineStyle(6, colorBorde, 1);
        graphics.fillStyle(colorRelleno, 1);

        let paso = Math.PI / puntos;
        let angulo = -Math.PI / 2;

        graphics.beginPath();
        for (let i = 0; i < 2 * puntos; i++) {
            let r = (i % 2 === 0) ? radioExterior : radioInterior;
            let px = x + Math.cos(angulo) * r;
            let py = y + Math.sin(angulo) * r;
            if (i === 0) graphics.moveTo(px, py);
            else graphics.lineTo(px, py);
            angulo += paso;
        }
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
    }

    obtenerPuntoEnCurva(t, xBase, yBase, anchoSerpiente, altoSerpiente) {
        let x = xBase - (anchoSerpiente / 2) + (anchoSerpiente * t);
        let amplitudeY = altoSerpiente / 2;
        let y = yBase + Math.sin(t * Math.PI * 4) * amplitudeY; 
        return { x, y };
    }
}