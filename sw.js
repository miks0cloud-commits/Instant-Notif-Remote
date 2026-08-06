// Service Worker for Android Notification Bar Alerts

// Force immediate activation when updated
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for trigger signals sent from script.js
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_NOTIFICATION") {
    // Post directly into Android status bar & notification shade
    self.registration.showNotification("🚨 ALARM TRIGGERED", {
      body: "The host has initiated a remote alarm!",
      icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png", // Status bar alert icon
      badge: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true, // Keeps notification pinned until dismissed
      tag: "alarm-notification"
    });
  }
});

// Open/focus the site if the user taps the notification in their status bar
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
