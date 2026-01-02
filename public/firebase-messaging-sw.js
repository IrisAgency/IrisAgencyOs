importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

// Force this service worker to activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing, skip waiting');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating, claiming clients');
  event.waitUntil(self.clients.claim());
});

let messagingInitialized = false;
let messagingInstance = null;

const initializeMessaging = (config) => {
  console.log('[SW] initializeMessaging called, already initialized:', messagingInitialized);
  if (messagingInitialized) return messagingInstance;
  messagingInitialized = true;
  
  console.log('[SW] Initializing Firebase with config:', config.projectId);
  firebase.initializeApp(config);
  messagingInstance = firebase.messaging();

  messagingInstance.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    const notification = payload.notification || {};
    const notificationTitle = notification.title || 'Notification';
    const notificationOptions = {
      body: notification.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: payload.data || {},
      tag: 'iris-notification',
      requireInteraction: false
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

  console.log('[SW] Firebase messaging initialized');
  return messagingInstance;
};

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data?.type);
  if (event.data && event.data.type === 'INIT_MESSAGING' && event.data.config) {
    initializeMessaging(event.data.config);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
