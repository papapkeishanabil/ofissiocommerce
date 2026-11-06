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
      icon: "/brand/app-icon-192-v1.png",
      badge: "/favicon-ofissio-32.png",
      silent: false,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const parsedUrl = new URL(
    event.notification.data?.url || "/admin/notifications",
    self.location.origin,
  );
  const targetUrl = parsedUrl.origin === self.location.origin && parsedUrl.pathname.startsWith("/admin/")
    ? parsedUrl.href : new URL("/admin/chats", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith("/admin/"));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
