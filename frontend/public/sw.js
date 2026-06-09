self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { message: event.data?.text() ?? "" };
  }

  const title = data.title || "Task Manager";
  const options = {
    body: data.message || "",
    icon: "/notification-icon.svg",
    badge: "/notification-icon.svg",
    data: {
      link: data.link || "/",
      notificationId: data.notification_id || null,
    },
    tag: data.link || "task-manager-notification",
    renotify: true,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: "PUSH_NOTIFICATION",
            payload: { title, message: data.message || "", link: data.link || "" },
          });
        });
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  const notificationId = event.notification.data?.notificationId;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const path = link.startsWith("/") ? link : `/${link}`;
      const target = new URL(path, self.location.origin);
      if (notificationId) {
        target.searchParams.set("notificationId", String(notificationId));
      }
      const targetUrl = target.toString();

      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ("navigate" in client && typeof client.navigate === "function") {
          return client.navigate(targetUrl).then(() => client.focus());
        }
        if (client.url.includes(path) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
