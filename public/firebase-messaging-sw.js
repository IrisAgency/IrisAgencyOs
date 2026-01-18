importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

// Firebase configuration - must be hardcoded for push event handlers to work
const firebaseConfig = {
  apiKey: "AIzaSyCbD1PoHAh9JJSWjzZ7Z8Wk_xj-wNuJWb0",
  authDomain: "iris-os-43718.firebaseapp.com",
  projectId: "iris-os-43718",
  storageBucket: "iris-os-43718.firebasestorage.app",
  messagingSenderId: "488155542588",
  appId: "1:488155542588:web:c0da81dc83a51dd9cd6f0f",
  measurementId: "G-K9FBXZB06M"
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
