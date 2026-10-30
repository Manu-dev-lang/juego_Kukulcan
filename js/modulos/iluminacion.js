class Iluminacion {
    constructor(escena) {
        this.escena = escena;
        this.luzJugador = null;
        this.luzAmbientalSuperior = null;
        this.tiempoLuzPulso = 0;
    }

    // capasFondo: array con los fondos que recibirán la luz
    configurar(capasFondo) {
        const escena = this.escena;
        const esNavidadLuz = escena.esNavidad;
        const anchoPantalla = escena.scale.width;
        const altoPantalla = escena.scale.height;

        escena.lights.enable();
        const colorAmbiente = 0xf7f4ff;
        escena.lights.setAmbientColor(colorAmbiente);

        const colorLuzJugador = esNavidadLuz ? 0xffe4f2 : 0xffd6f5;
        this.luzJugador = escena.lights.addLight(anchoPantalla / 2, altoPantalla - 120, 500)
            .setColor(colorLuzJugador)
            .setIntensity(1);

        const colorLuzSuperior = esNavidadLuz ? 0xdff4ff : 0xcfeeff;
        this.luzAmbientalSuperior = escena.lights.addLight(anchoPantalla / 2, 0, 1000)
            .setColor(colorLuzSuperior)
            .setIntensity(0.7);

        this.tiempoLuzPulso = 0;

        capasFondo.forEach(capaFondo => {
            if (capaFondo) {
                capaFondo.setPipeline("Light2D");
            }
        });
    }

    actualizar(delta) {
        if (!this.luzJugador || !this.luzAmbientalSuperior) {
            return;
        }
        const escena = this.escena;
        this.luzJugador.x = escena.jugador.x;
        this.luzJugador.y = escena.jugador.y;
        this.tiempoLuzPulso += delta;
        this.luzJugador.setIntensity(1 + Math.sin(this.tiempoLuzPulso / 450) * 0.12);
        this.luzAmbientalSuperior.x = escena.scale.width / 2;
    }
}