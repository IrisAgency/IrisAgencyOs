importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

// Firebase configuration - must be hardcoded for push event handlers to work
const firebaseConfig = {
  apiKey: "AIzaSyBoRMa1GuSPL73aphbJMG-AGkNqm17lWoY",
  authDomain: "iris-os-43718.firebaseapp.com",
  projectId: "iris-os-43718",
  storageBucket: "iris-os-43718.firebasestorage.app",
  messagingSenderId: "841502880440",
  appId: "1:841502880440:web:97ecdc90363c668610fa4d",
  measurementId: "G-F7KS3SN7YB"
};

// Initialize Firebase immediately (required for push event handlers)
console.log('[SW] Initializing Firebase with config:', firebaseConfig.projectId);
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

console.log('[SW] Setting up background message handler');
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  const notification = payload.notification || {};
  const notificationTitle = notification.title || 'New Notification';
  const notificationOptions = {
    body: notification.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload.data || {},
    tag: 'iris-notification-' + Date.now(),
    requireInteraction: false
  };
  
  console.log('[SW] Showing notification:', notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

console.log('[SW] ✓ Firebase messaging initialized successfully');

// Force this service worker to activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing, skip waiting');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating, claiming clients');
  event.waitUntil(self.clients.claim());
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
