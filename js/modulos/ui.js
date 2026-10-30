class UI {
    constructor(escena) {
        this.escena = escena;
    }

    // Jades que pide la supernova (3, o 2 con la skin "Poder ancestral").
    // Si el jugador todavía no existe al crear el HUD, se deduce de la skin.
    jadesNecesarios() {
        const j = this.escena.jugador;
        if (j && j.jadesNecesarios) {
            return j.jadesNecesarios;
        }
        return SkinsTienda.habilidad("jugador") === "supernova_rapida" ? 2 : 3;
    }

    // -----------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------
    crearInterfaz() {
        const escena = this.escena;
        const ancho = escena.scale.width;

        let textoNiv = escena.startAtLevel3 ? Idioma.t("juego.nivel3") : Idioma.t("juego.nivel1");
        this.textoNivel = escena.add.text(ancho / 2, 30, textoNiv, {
            fontSize: "18px",
            fill: "#ffffff"
        }).setOrigin(0.5).setDepth(20);

        let textoTiem = escena.startAtLevel3 ? Idioma.t("juego.tiempo", { t: "01:00" }) : Idioma.t("juego.tiempo", { t: "02:00" });
        this.textoTiempo = escena.add.text(ancho / 2, 55, textoTiem, {
            fontSize: "20px",
            fill: "#00ff7f",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(20);

        escena.add.rectangle(ancho / 2, 85, 204, 18, 0xffffff).setOrigin(0.5).setDepth(20);
        escena.add.rectangle(ancho / 2, 85, 200, 14, 0x333333).setOrigin(0.5).setDepth(20);
        this.barraLuzLleno = escena.add.rectangle(ancho / 2 - 100, 85, 200, 14, 0xffffd700)
            .setOrigin(0, 0.5)
            .setDepth(21);

        this.textoJades = escena.add.text(ancho / 2, 110, Idioma.t("juego.jades", { n: 0, m: this.jadesNecesarios() }), {
            fontSize: "16px",
            fill: "#ffffff"
        }).setOrigin(0.5).setDepth(20);
    }

    setTextoNivel(texto) {
        this.textoNivel.setText(texto);
    }

    actualizarTiempo(cronometro) {
        let tiempoRestante = Math.max(0, 120 - Math.floor(cronometro));
        let minutos = Math.floor(tiempoRestante / 60);
        let segundos = tiempoRestante % 60;
        let textoSegundos = segundos < 10 ? "0" + segundos : segundos;
        let textoMinutos = minutos < 10 ? "0" + minutos : minutos;
        this.textoTiempo.setText(Idioma.t("juego.tiempo", { t: textoMinutos + ":" + textoSegundos }));
    }

    actualizarBarraLuz() {
        const j = this.escena.jugador;
        this.barraLuzLleno.width = Math.max(0, j.luz / j.maxLuz * 200);
    }

    actualizarJades() {
        const j = this.escena.jugador;
        this.textoJades.setText(Idioma.t("juego.jades", { n: j.jades, m: this.jadesNecesarios() }));
    }

    // -----------------------------------------------------------------
    // MARCO LATERAL (límite visual del área jugable)
    // Actualiza escena.margenLateral, que usan jugador y cámara.
    // -----------------------------------------------------------------
    crearMarco() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        this.graficosMarco = escena.add.graphics().setDepth(6).setVisible(false);
        escena.margenLateral = window.dibujarMarcoLateral(this.graficosMarco, ancho, alto, escena.esNavidad);
        this.anchoMarcoAnterior = ancho;
        this.altoMarcoAnterior = alto;
    }

    // Redibuja el marco solo si cambió el tamaño de la pantalla
    actualizarMarco() {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;
        if (ancho !== this.anchoMarcoAnterior || alto !== this.altoMarcoAnterior) {
            escena.margenLateral = window.dibujarMarcoLateral(this.graficosMarco, ancho, alto, escena.esNavidad);
            this.anchoMarcoAnterior = ancho;
            this.altoMarcoAnterior = alto;
        }
    }

    // -----------------------------------------------------------------
    // CUENTA REGRESIVA (3, 2, 1, ¡YA!)
    // alTerminar: función que se ejecuta cuando arranca la partida
    // -----------------------------------------------------------------
    iniciarCuentaRegresiva(alTerminar) {
        const escena = this.escena;
        const ancho = escena.scale.width;
        const alto = escena.scale.height;

        this.textoCuentaRegresiva = escena.add.text(ancho / 2, alto / 2, "3", {
            fontSize: "150px",
            fill: "#00ff7f",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 15
        }).setOrigin(0.5).setDepth(100);

        let conteo = 3;
        escena.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                conteo--;
                if (conteo > 0) {
                    this.textoCuentaRegresiva.setText(conteo);
                    this.textoCuentaRegresiva.setScale(1.5);
                    escena.tweens.add({
                        targets: this.textoCuentaRegresiva,
                        scale: 1,
                        duration: 300,
                        ease: "Bounce.easeOut"
                    });
                } else if (conteo === 0) {
                    this.textoCuentaRegresiva.setText(Idioma.t("juego.ya"));
                    this.textoCuentaRegresiva.setStyle({ fill: "#ffea00" });
                    this.textoCuentaRegresiva.setScale(1.5);
                    escena.tweens.add({
                        targets: this.textoCuentaRegresiva,
                        scale: 1,
                        duration: 300,
                        ease: "Bounce.easeOut"
                    });
                } else {
                    this.textoCuentaRegresiva.setVisible(false);
                    alTerminar();
                }
            }
        });
    }
}