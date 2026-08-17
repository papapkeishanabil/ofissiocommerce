self.addEventListener("push", (event) => {
  const fallback = {
    title: "Ofissio Admin",
    body: "Ada pembaruan operasional baru.",
    url: "/admin/notifications",
  };
  let data = fallback;
  try {
    data = { ...fallback, ...(event.data ? event.data.json() : {}) };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || "ofissio-admin",
      renotify: true,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/admin/notifications",
    self.location.origin,
  ).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
