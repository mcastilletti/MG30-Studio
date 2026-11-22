// Service worker minimo: serve a rendere il sito installabile. Non mette nulla in cache,
// così dopo ogni pubblicazione l'app mostra sempre la versione più recente.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
