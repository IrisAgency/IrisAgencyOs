importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

let messagingInitialized = false;
let messagingInstance = null;

const initializeMessaging = (config) => {
  if (messagingInitialized) return messagingInstance;
  messagingInitialized = true;
  firebase.initializeApp(config);
  messagingInstance = firebase.messaging();

  messagingInstance.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    self.registration.showNotification(notification.title || 'Notification', {
      body: notification.body || '',
      data: payload.data || {}
    });
  });

  return messagingInstance;
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_MESSAGING' && event.data.config) {
    initializeMessaging(event.data.config);
  }
});
