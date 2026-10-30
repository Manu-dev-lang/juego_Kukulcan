// Service worker de "El Ascenso a Ka'an"
// Guarda el juego en el dispositivo para que funcione sin internet.
// Cuando hay internet, se actualiza solo en segundo plano (no necesitas cambiar nada aquí).
const CACHE = "kaan-cache";

const ARCHIVOS = [
  "./",
  "index.html",
  "manifest.json",
  "https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js",
  "js/modulos/progreso.js",
  "js/modulos/preferencias.js",
  "js/modulos/idioma.js",
  "js/datos/cinematicas.js",
  "js/datos/catalogo.js",
  "js/boot.js",
  "js/cinematica.js",
  "js/carga.js",
  "js/inicio.js",
  "js/instrucciones.js",
  "js/tienda.js",
  "js/ajustes.js",
  "js/modulos/utilidades.js",
  "js/modulos/fondos.js",
  "js/modulos/iluminacion.js",
  "js/modulos/jugador.js",
  "js/modulos/camara.js",
  "js/modulos/enemigos.js",
  "js/modulos/items.js",
  "js/modulos/boss.js",
  "js/modulos/eclipse.js",
  "js/modulos/ui.js",
  "js/modulos/pantallasfin.js",
  "js/juego.js",
  "js/main.js",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Uno por uno: si un archivo falla, los demás se guardan igual
      Promise.allSettled(ARCHIVOS.map((a) => cache.add(a)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Responde con lo guardado (rápido) y mientras tanto lo actualiza desde internet
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.headers.has("range")) {
    return;
  }
  const url = new URL(e.request.url);
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const guardado = await cache.match(e.request);
      const deInternet = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && url.origin === location.origin) {
            cache.put(e.request, res.clone());
          }
          return res;
        })
        .catch(() => guardado);
      return guardado || deInternet;
    })
  );
});