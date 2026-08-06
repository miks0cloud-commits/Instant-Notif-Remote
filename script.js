// Service Worker to handle background notification bar alerts
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from script.js to show system notification bar alert
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_NOTIFICATION") {
    self.registration.showNotification("🚨 ALARM TRIGGERED", {
      body: "The host has initiated a remote alarm!",
      icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png", // Alarm Icon for status bar
      badge: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true, // Holds in notification bar until cleared
      tag: "alarm-notification"
    });
  }
});
