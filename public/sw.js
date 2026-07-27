self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { message: event.data.text() };
    }
  }

  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : "KING OF CAPS";
  const message = typeof payload.message === "string" && payload.message.trim()
    ? payload.message.trim()
    : "Une nouveauté vous attend chez KING OF CAPS.";

  let targetUrl = "/";
  try {
    const candidate = new URL(
      typeof payload.url === "string" ? payload.url : "/",
      self.location.origin,
    );
    if (candidate.origin === self.location.origin) {
      targetUrl = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }
  } catch {
    targetUrl = "/";
  }

  let image;
  if (typeof payload.image === "string" && payload.image.trim()) {
    try {
      const candidate = new URL(payload.image.trim(), self.location.origin);
      if (candidate.protocol === "https:" || candidate.protocol === "http:") {
        image = candidate.href;
      }
    } catch {
      image = undefined;
    }
  }

  const tag = typeof payload.tag === "string" && payload.tag.trim()
    ? payload.tag.trim().slice(0, 128)
    : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: "/icon.png",
      badge: "/icon.png",
      ...(image ? { image } : {}),
      ...(tag ? { tag } : {}),
      data: { url: targetUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const relativeUrl =
    typeof event.notification.data?.url === "string"
      ? event.notification.data.url
      : "/";
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        const existingClient = clientList.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (existingClient) {
          if ("navigate" in existingClient) {
            await existingClient.navigate(targetUrl);
          }
          return existingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
