import { useCallback, useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, firebaseConfig, messagingPromise, messagingVapidKey } from '../lib/firebase';
import { User } from '../types';

export function useMessagingToken(user: User | null) {
  const [token, setToken] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  const ensureServiceWorkerReady = useCallback(async () => {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Wait for an active worker so INIT message is not lost
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing?.addEventListener('statechange', () => {
          if (registration.installing?.state === 'activated') resolve();
        });
      });
    }

    const readyRegistration = await navigator.serviceWorker.ready;
    const target = registration.active || registration.waiting || readyRegistration.active;
    target?.postMessage({ type: 'INIT_MESSAGING', config: firebaseConfig });

    return registration;
  }, []);

  const requestPermissionAndRegister = useCallback(async () => {
    if (!user) return null;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermissionState('unsupported');
      return null;
    }

    const permission = await Notification.requestPermission();
    setPermissionState(permission);
    if (permission !== 'granted') return null;

    const messaging = await messagingPromise;
    if (!messaging) return null;

    if (!messagingVapidKey) {
      throw new Error('Missing VITE_FIREBASE_VAPID_KEY for push notifications');
    }

    const swRegistration = await ensureServiceWorkerReady();

    const currentToken = await getToken(messaging, {
      vapidKey: messagingVapidKey,
      serviceWorkerRegistration: swRegistration
    });

    if (!currentToken) return null;
    setToken(currentToken);

    await setDoc(doc(db, 'notification_tokens', currentToken), {
      token: currentToken,
      userId: user.id,
      uid: user.id,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: 'web'
    }, { merge: true });

    return currentToken;
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
