class Boot extends Phaser.Scene {
    constructor(){
        super("Boot");
    }

    preload(){
      // Aplica los ajustes de audio del jugador a todos los sonidos del juego
      Preferencias.instalarAudio(this.sys.game);

      // Le decimos a Phaser qué carpeta usar como base
      this.load.setPath(window.carpetaSkin);

      // Ahora solo ponemos el nombre del archivo
      this.load.image("logo", "logo.png");
      this.load.image("menu_background", "menu_background.png");

      // Sonido de todos los botones (se carga aquí para que ya exista
      // en la cinemática, que sale antes de la pantalla de carga)
      this.load.audio("sonido_boton", "sonido_boton.mp3");
    }

    create(){
        // Primera vez que se elige esta skin: cinemática (no se puede saltar).
        // Si ya se vio completa, va directo a la carga; la cinemática queda
        // disponible desde el botón CINEMÁTICA del menú.
        if (Progreso.cinematicaVista()) {
            this.scene.start("Carga");
        } else {
            this.scene.start("Cinematica", { destino: "Carga" });
        }
    }
}