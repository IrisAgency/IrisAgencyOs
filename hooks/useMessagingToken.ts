import { useCallback, useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, firebaseConfig, messagingPromise, messagingVapidKey } from '../lib/firebase';
import { User } from '../types';

export function useMessagingToken(user: User | null) {
  const [token, setToken] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  const ensureServiceWorkerReady = useCallback(async () => {
    console.log('[ensureServiceWorkerReady] Registering service worker...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[ensureServiceWorkerReady] Registration state:', {
      active: registration.active?.state,
      waiting: registration.waiting?.state,
      installing: registration.installing?.state
    });

    // Wait for service worker to be fully ready
    const readyRegistration = await navigator.serviceWorker.ready;
    console.log('[ensureServiceWorkerReady] Service worker ready, active state:', readyRegistration.active?.state);

    return readyRegistration;
  }, []);

  const requestPermissionAndRegister = useCallback(async () => {
    try {
      console.log('[useMessagingToken] Starting registration, user:', user?.id);
      if (!user) return null;
      
      // Check basic browser features
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('[useMessagingToken] Notifications or ServiceWorker not supported');
        setPermissionState('unsupported');
        return null;
      }

      // Check if Firebase Messaging is supported
      const messaging = await messagingPromise;
      if (!messaging) {
        console.warn('[useMessagingToken] Firebase Messaging not supported in this browser/context');
        console.log('[useMessagingToken] This could be due to:', [
          '- Private/Incognito browsing mode',
          '- Service Workers disabled',
          '- Third-party cookies blocked',
          '- Browser extensions blocking notifications',
          '- Not running on HTTPS (except localhost)'
        ]);
        setPermissionState('unsupported');
        return null;
      }

      const permission = await Notification.requestPermission();
      console.log('[useMessagingToken] Permission result:', permission);
      setPermissionState(permission);
      if (permission !== 'granted') return null;

      if (!messagingVapidKey) {
        console.error('[useMessagingToken] Missing VITE_FIREBASE_VAPID_KEY');
        throw new Error('Missing VITE_FIREBASE_VAPID_KEY for push notifications');
      }
      console.log('[useMessagingToken] VAPID key present:', messagingVapidKey.substring(0, 20) + '...');

      const swRegistration = await ensureServiceWorkerReady();
      console.log('[useMessagingToken] Service worker ready:', swRegistration.active?.state);

      const currentToken = await getToken(messaging, {
        vapidKey: messagingVapidKey,
        serviceWorkerRegistration: swRegistration
      });

      console.log('[useMessagingToken] Token obtained:', currentToken ? currentToken.substring(0, 20) + '...' : 'null');
      if (!currentToken) return null;
      setToken(currentToken);

      const tokenDoc = {
        token: currentToken,
        userId: user.id,
        uid: user.id,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: 'web'
      };

      console.log('[useMessagingToken] Saving token to Firestore:', {
        collection: 'notification_tokens',
        docId: currentToken.substring(0, 20) + '...',
        userId: user.id
      });

      await setDoc(doc(db, 'notification_tokens', currentToken), tokenDoc, { merge: true });

      console.log('[useMessagingToken] ✓ Token saved successfully to Firestore');
      return currentToken;
    } catch (error) {
      console.error('[useMessagingToken] Registration failed:', error);
      throw error;
    }
  }, [user, ensureServiceWorkerReady]);

  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission);

    // If already granted, register quietly without prompting
    if (Notification.permission === 'granted') {
      requestPermissionAndRegister();
    }
  }, [user, requestPermissionAndRegister]);

  useEffect(() => {
    let unsubscribe = () => {};
    messagingPromise.then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'Notification';
        const body = payload.notification?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      });
    });
    return () => unsubscribe();
  }, []);

  return { token, permissionState, requestPermissionAndRegister };
}
