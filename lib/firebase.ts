import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(firebaseApp);
export const cloudFunctions = getFunctions(firebaseApp);

export const messagingPromise = isSupported().then((supported) => {
  console.log('[Firebase Messaging] Browser support check:', {
    supported,
    hasNotification: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
    notificationPermission: 'Notification' in window ? Notification.permission : 'N/A',
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol,
    userAgent: navigator.userAgent
  });
  if (!supported) {
    console.warn('[Firebase Messaging] Not supported. Reasons could be:', [
      'Running in private/incognito mode',
      'Service Workers disabled in browser',
      'Third-party cookies blocked',
      'Browser extensions interfering',
      'Not running on HTTPS (except localhost)'
    ]);
    return null;
  }
  return getMessaging(firebaseApp);
});

export const messagingVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
