/* ECHOX STORE Service Worker — Push Notifications & Mobile Control Room Alerts */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'ECHOX Store',
    body: 'لديك إشعار جديد في المتجر.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'echox-general',
    url: '/',
    severity: 'info',
    requireInteraction: false,
    renotify: true,
    timestamp: Date.now(),
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      try {
        payload.body = event.data.text();
      } catch {
        // ignore
      }
    }
  }

  const isCritical = payload.severity === 'critical' || payload.severity === 'warning';
  const vibrate = isCritical ? [300, 120, 300, 120, 300] : [200, 100, 200];

  event.waitUntil(
    self.registration.showNotification(payload.title || 'ECHOX Store', {
      body: payload.body || '',
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag || `echox-${Date.now()}`,
      renotify: payload.renotify !== false,
      requireInteraction: Boolean(payload.requireInteraction || isCritical),
      vibrate,
      dir: 'rtl',
      lang: 'ar',
      data: {
        url: payload.url || '/',
        severity: payload.severity || 'info',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          try {
            client.postMessage({ type: 'ECHOX_NOTIFICATION_CLICK', url: targetUrl });
          } catch {
            // ignore
          }
          if ('navigate' in client && targetUrl && targetUrl !== '/') {
            return client.navigate(targetUrl).catch(() => client);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
