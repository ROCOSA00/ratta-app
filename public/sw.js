// Service worker de Ratta: solo se encarga de las notificaciones push.
// No guarda nada en caché (la app necesita conexión igualmente).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Ratta", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/inicio" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/inicio", self.location.origin);
  // Solo se abren páginas de la propia app.
  const url = target.origin === self.location.origin ? target.href : self.location.origin + "/inicio";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          try {
            await client.navigate(url);
          } catch {
            // Si no se puede navegar esa ventana, al menos se enfoca.
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
