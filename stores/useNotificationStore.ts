/**
 * Notification Store — manages notifications and preferences.
 * Collections: notifications, notification_preferences
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import { notifyUsers } from '../services/notificationService';
import type { Notification, NotificationPreference, NotificationType, User, ProjectMember, RoleDefinition } from '../types';

export interface ManualNotificationPayload {
  title: string;
  body: string;
  targetType: 'user' | 'role' | 'project' | 'all';
  targetIds: string[];
}

interface NotificationState {
  allNotifications: Notification[];
  preferences: NotificationPreference;

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  // Derived
  userNotifications: (userId: string) => Notification[];

  // Actions
  loadPreferences: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (prefs: NotificationPreference) => Promise<void>;

  // Notify helpers
  notify: (type: NotificationType, title: string, message: string, recipientIds?: string[], entityId?: string, actionUrl?: string, createdBy?: string) => Promise<void>;
  sendManualNotification: (payload: ManualNotificationPayload, activeUsers: User[], projectMembers: ProjectMember[], userId: string) => Promise<{ recipientCount: number }>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  allNotifications: [],
  preferences: {
    userId: 'placeholder',
    mutedCategories: [],
    mutedProjects: [],
    severityThreshold: 'info',
    inAppEnabled: true,
    emailEnabled: false,
    pushEnabled: true,
    delivery: { inApp: true, email: false, push: true },
  },
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<Notification>('notifications', (items) => set({ allNotifications: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  userNotifications: (userId: string) =>
    [...get().allNotifications.filter(n => n.userId === userId)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),

  loadPreferences: async (userId: string) => {
    try {
      const prefsDoc = await getDoc(doc(db, 'notification_preferences', userId));
      if (prefsDoc.exists()) {
        set({ preferences: prefsDoc.data() as NotificationPreference });
      } else {
        const defaultPrefs: NotificationPreference = {
          userId,
          mutedCategories: [],
          mutedProjects: [],
          severityThreshold: 'info',
          inAppEnabled: true,
          emailEnabled: false,
          pushEnabled: true,
          delivery: { inApp: true, email: false, push: true },
        };
        await setDoc(doc(db, 'notification_preferences', userId), defaultPrefs);
        set({ preferences: defaultPrefs });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true, readAt: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to mark notification read', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { isRead: true, readAt: new Date().toISOString() }));
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark all notifications read', error);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  },

  updatePreferences: async (prefs: NotificationPreference) => {
    try {
      const syncedPrefs = {
        ...prefs,
        inAppEnabled: prefs.delivery?.inApp ?? prefs.inAppEnabled,
        emailEnabled: prefs.delivery?.email ?? prefs.emailEnabled,
        pushEnabled: prefs.delivery?.push ?? prefs.pushEnabled,
        delivery: {
          inApp: prefs.delivery?.inApp ?? prefs.inAppEnabled,
          email: prefs.delivery?.email ?? prefs.emailEnabled,
          push: prefs.delivery?.push ?? prefs.pushEnabled,
        },
      };
      await setDoc(doc(db, 'notification_preferences', prefs.userId), syncedPrefs);
      set({ preferences: syncedPrefs });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  },

  notify: async (type, title, message, recipientIds = [], entityId, actionUrl, createdBy = 'system') => {
    if (recipientIds.length > 0) {
      try {
        await notifyUsers({ type, title, message, recipientIds, entityId, actionUrl, sendPush: false, createdBy });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    }
  },

  sendManualNotification: async (payload, activeUsers, projectMembers, userId) => {
    let recipientIds: string[];
    switch (payload.targetType) {
      case 'user':
        recipientIds = payload.targetIds;
        break;
      case 'role':
        recipientIds = activeUsers.filter(u => payload.targetIds.includes(u.role)).map(u => u.id);
        break;
      case 'project':
        recipientIds = projectMembers.filter(pm => payload.targetIds.includes(pm.projectId)).map(pm => pm.userId);
        break;
      case 'all':
      default:
        recipientIds = activeUsers.map(u => u.id);
    }
    recipientIds = Array.from(new Set(recipientIds));
    const createdAt = new Date().toISOString();

    await addDoc(collection(db, 'notifications_outbox'), {
      title: payload.title, body: payload.body, targetType: payload.targetType,
      targetIds: payload.targetIds, targetUserIds: recipientIds, createdAt, createdBy: userId,
    });

    if (recipientIds.length > 0) {
      const batch = writeBatch(db);
      recipientIds.forEach(uid => {
        const ref = doc(collection(db, 'notifications'));
        batch.set(ref, { userId: uid, type: 'system', title: payload.title, message: payload.body, severity: 'info', category: 'system', isRead: false, createdAt });
      });
      await batch.commit();
    }

    return { recipientCount: recipientIds.length || activeUsers.length };
  },
}));
