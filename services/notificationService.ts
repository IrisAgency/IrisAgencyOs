import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { 
  Notification, 
  NotificationPreference, 
  NotificationType, 
  NotificationSeverity, 
  NotificationCategory,
  NotificationEntityType,
  NotificationAction,
  User,
  UserRole
} from '../types';

/**
 * Notification metadata that maps notification types to their default properties
 */
const NOTIFICATION_METADATA: Record<
  NotificationType,
  {
    category: NotificationCategory;
    severity: NotificationSeverity;
    entityType?: NotificationEntityType;
  }
> = {
  // Tasks & Workflow
  TASK_ASSIGNED: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_UNASSIGNED: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_DUE_SOON: { category: 'tasks', severity: 'warning', entityType: 'task' },
  TASK_OVERDUE: { category: 'tasks', severity: 'urgent', entityType: 'task' },
  TASK_STATUS_CHANGED: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_SUBMITTED_FOR_REVIEW: { category: 'tasks', severity: 'warning', entityType: 'task' },
  TASK_REVISION_REQUESTED: { category: 'tasks', severity: 'warning', entityType: 'task' },
  TASK_APPROVED_STEP: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_REJECTED_STEP: { category: 'tasks', severity: 'warning', entityType: 'task' },
  TASK_APPROVED_FINAL: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_ARCHIVED: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_COMMENT_MENTION: { category: 'tasks', severity: 'info', entityType: 'task' },
  TASK_COMMENT_REPLY: { category: 'tasks', severity: 'info', entityType: 'task' },
  
  // Approvals
  APPROVAL_REQUESTED: { category: 'approvals', severity: 'warning', entityType: 'task' },
  APPROVAL_REMINDER: { category: 'approvals', severity: 'warning', entityType: 'task' },
  APPROVAL_ESCALATION: { category: 'approvals', severity: 'urgent', entityType: 'task' },
  
  // Posting & Captions
  POST_CREATED_FROM_TASK: { category: 'posting', severity: 'info', entityType: 'post' },
  POST_ASSIGNED: { category: 'posting', severity: 'info', entityType: 'post' },
  POST_CAPTION_SUBMITTED: { category: 'posting', severity: 'warning', entityType: 'post' },
  POST_REVISION_REQUESTED: { category: 'posting', severity: 'warning', entityType: 'post' },
  POST_APPROVED: { category: 'posting', severity: 'info', entityType: 'post' },
  POST_SCHEDULED: { category: 'posting', severity: 'info', entityType: 'post' },
  POST_PUBLISHING_TODAY: { category: 'posting', severity: 'warning', entityType: 'post' },
  POST_PUBLISHED: { category: 'posting', severity: 'info', entityType: 'post' },
  
  // Clients & Projects
  NEW_CLIENT_CREATED: { category: 'projects', severity: 'info', entityType: 'client' },
  PROJECT_CREATED: { category: 'projects', severity: 'info', entityType: 'project' },
  PROJECT_ARCHIVED: { category: 'projects', severity: 'info', entityType: 'project' },
  MILESTONE_STARTED: { category: 'projects', severity: 'info', entityType: 'milestone' },
  MILESTONE_AT_RISK: { category: 'projects', severity: 'urgent', entityType: 'milestone' },
  
  // Meetings
  MEETING_SCHEDULED: { category: 'meetings', severity: 'info', entityType: 'meeting' },
  MEETING_REMINDER_24H: { category: 'meetings', severity: 'warning', entityType: 'meeting' },
  MEETING_REMINDER_1H: { category: 'meetings', severity: 'urgent', entityType: 'meeting' },
  MINUTES_UPLOADED: { category: 'meetings', severity: 'info', entityType: 'meeting' },
  
  // Finance
  INVOICE_CREATED: { category: 'finance', severity: 'info', entityType: 'invoice' },
  INVOICE_DUE_SOON: { category: 'finance', severity: 'warning', entityType: 'invoice' },
  PAYMENT_RECORDED: { category: 'finance', severity: 'info', entityType: 'invoice' },
  BUDGET_EXCEEDED: { category: 'finance', severity: 'urgent', entityType: 'project' },
  
  // Legacy
  task_assigned: { category: 'tasks', severity: 'info', entityType: 'task' },
  task_status_changed: { category: 'tasks', severity: 'info', entityType: 'task' },
  approval_request: { category: 'approvals', severity: 'warning', entityType: 'task' },
  comment_mention: { category: 'tasks', severity: 'info', entityType: 'task' },
  invoice_overdue: { category: 'finance', severity: 'urgent', entityType: 'invoice' },
  production_update: { category: 'system', severity: 'info' },
  system: { category: 'system', severity: 'info' },

  // Missing required types
  TASK_DUE_DATE_CHANGED: { category: 'tasks', severity: 'info', entityType: 'task' },
  PROJECT_MEMBER_ADDED: { category: 'projects', severity: 'info', entityType: 'project' },
  MILESTONE_CREATED: { category: 'projects', severity: 'info', entityType: 'milestone' },

  // Creative Direction
  CREATIVE_ASSIGNED: { category: 'creative' as any, severity: 'info', entityType: 'creative_project' as any },
  CREATIVE_SUBMITTED_FOR_REVIEW: { category: 'creative' as any, severity: 'warning', entityType: 'creative_project' as any },
  CREATIVE_REVISION_REQUESTED: { category: 'creative' as any, severity: 'warning', entityType: 'creative_project' as any },
  CREATIVE_APPROVED: { category: 'creative' as any, severity: 'info', entityType: 'creative_project' as any },

  // Calendar → Creative Revision Workflow
  CALENDAR_REVISION_REQUESTED: { category: 'calendar' as any, severity: 'warning', entityType: 'calendar_item' as any },
  CALENDAR_REVISION_SUBMITTED: { category: 'calendar' as any, severity: 'warning', entityType: 'calendar_item' as any },
  CALENDAR_REVISION_APPROVED: { category: 'calendar' as any, severity: 'info', entityType: 'calendar_item' as any },
  CALENDAR_REVISION_REJECTED: { category: 'calendar' as any, severity: 'warning', entityType: 'calendar_item' as any },
  CALENDAR_REVISION_SYNCED: { category: 'calendar' as any, severity: 'info', entityType: 'calendar_item' as any },

  // Quality Control
  QC_REVIEW_REQUESTED: { category: 'qc' as any, severity: 'warning', entityType: 'task' },
  QC_APPROVED: { category: 'qc' as any, severity: 'info', entityType: 'task' },
  QC_REJECTED: { category: 'qc' as any, severity: 'warning', entityType: 'task' },
  QC_NEEDS_INTERVENTION: { category: 'qc' as any, severity: 'urgent', entityType: 'task' },
};

/**
 * Parameters for creating a notification
 */
export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  recipientIds: string[];
  entityId?: string;
  actionUrl?: string;
  actions?: NotificationAction[];
  groupKey?: string;
  dedupeKey?: string;
  // Override defaults from metadata
  severity?: NotificationSeverity;
  category?: NotificationCategory;
  entityType?: NotificationEntityType;
}

/**
 * Get user's notification preferences from Firestore
 */
export async function getUserPreferences(userId: string): Promise<NotificationPreference | null> {
  try {
    const prefsDoc = await getDoc(doc(db, 'notification_preferences', userId));
    if (prefsDoc.exists()) {
      return prefsDoc.data() as NotificationPreference;
    }
    return null;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
}

/**
 * Check if a user should receive a notification based on their preferences
 */
export async function shouldNotifyUser(
  userId: string,
  type: NotificationType,
  category: NotificationCategory,
  severity: NotificationSeverity
): Promise<boolean> {
  const prefs = await getUserPreferences(userId);
  
  // If no preferences, allow all notifications
  if (!prefs) {
    return true;
  }

  // Check if category is muted
  if (prefs.mutedCategories.includes(category)) {
    return false;
  }

  // Check severity threshold
  const severityLevels: Record<NotificationSeverity, number> = {
    info: 1,
    warning: 2,
    urgent: 3,
  };

  if (severityLevels[severity] < severityLevels[prefs.severityThreshold]) {
    return false;
  }

  // Check if in-app notifications are enabled
  if (!prefs.inAppEnabled && !prefs.delivery?.inApp) {
    return false;
  }

  return true;
}

/**
 * Resolve user IDs from various target types (roles, project members, etc.)
 */
export async function resolveRecipients(
  targetType: 'user' | 'role' | 'project' | 'all',
  targetIds: string[] = []
): Promise<string[]> {
  try {
    if (targetType === 'user') {
      return targetIds;
    }

    if (targetType === 'all') {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => doc.id);
    }

    if (targetType === 'role') {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as User }));
      return users.filter(u => targetIds.includes(u.role)).map(u => u.id);
    }

    if (targetType === 'project') {
      const recipientIds = new Set<string>();
      for (const projectId of targetIds) {
        const membersQuery = query(
          collection(db, 'project_members'),
          where('projectId', '==', projectId)
        );
        const membersSnapshot = await getDocs(membersQuery);
        membersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId) {
            recipientIds.add(data.userId);
          }
        });
      }
      return Array.from(recipientIds);
    }

    return [];
  } catch (error) {
    console.error('Error resolving recipients:', error);
    return [];
  }
}

/**
 * Create a single notification for multiple recipients
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const {
      type,
      title,
      message,
      recipientIds,
      entityId,
      actionUrl,
      actions,
      groupKey,
      dedupeKey,
    } = params;

    // Get metadata for this notification type
    const metadata = NOTIFICATION_METADATA[type];
    const category = params.category || metadata.category;
    const severity = params.severity || metadata.severity;
    const entityType = params.entityType || metadata.entityType;

    const createdAt = new Date().toISOString();
    const batch = writeBatch(db);
    let notificationCount = 0;

    // Create a notification for each recipient who should receive it
    for (const userId of recipientIds) {
      const shouldNotify = await shouldNotifyUser(userId, type, category, severity);
      
      if (!shouldNotify) {
        continue;
      }

      const notificationRef = doc(collection(db, 'notifications'));
      const notificationData: Record<string, any> = {
        userId,
        type,
        title,
        message,
        severity,
        category,
        entityType,
        entityId,
        actionUrl,
        isRead: false,
        createdAt,
      };
      // Only include optional fields if defined (Firestore rejects undefined values)
      if (actions !== undefined) notificationData.actions = actions;
      if (groupKey !== undefined) notificationData.groupKey = groupKey;
      if (dedupeKey !== undefined) notificationData.dedupeKey = dedupeKey;

      batch.set(notificationRef, notificationData);
      notificationCount++;
    }

    // Commit all notifications in a single batch
    if (notificationCount > 0) {
      await batch.commit();
      console.log(`Created ${notificationCount} notifications for type: ${type}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

/**
 * Create multiple notifications with different content for different users
 * Useful for personalized notifications (e.g., "John assigned you a task" vs "You assigned a task to Mary")
 */
export async function createBatchNotifications(
  notifications: Array<Omit<CreateNotificationParams, 'recipientIds'> & { recipientId: string }>
): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    const createdAt = new Date().toISOString();

    for (const notif of notifications) {
      const {
        type,
        title,
        message,
        recipientId,
        entityId,
        actionUrl,
        actions,
        groupKey,
        dedupeKey,
      } = notif;

      // Get metadata for this notification type
      const metadata = NOTIFICATION_METADATA[type];
      const category = notif.category || metadata.category;
      const severity = notif.severity || metadata.severity;
      const entityType = notif.entityType || metadata.entityType;

      // Check if user should receive this notification
      const shouldNotify = await shouldNotifyUser(recipientId, type, category, severity);
      
      if (!shouldNotify) {
        continue;
      }

      const notificationRef = doc(collection(db, 'notifications'));
      const notificationData: Record<string, any> = {
        userId: recipientId,
        type,
        title,
        message,
        severity,
        category,
        entityType,
        entityId,
        actionUrl,
        isRead: false,
        createdAt,
      };
      // Only include optional fields if defined (Firestore rejects undefined values)
      if (actions !== undefined) notificationData.actions = actions;
      if (groupKey !== undefined) notificationData.groupKey = groupKey;
      if (dedupeKey !== undefined) notificationData.dedupeKey = dedupeKey;

      batch.set(notificationRef, notificationData);
    }

    await batch.commit();
    console.log(`Created ${notifications.length} batch notifications`);
    return true;
  } catch (error) {
    console.error('Error creating batch notifications:', error);
    return false;
  }
}

/**
 * Queue notification for push delivery via Cloud Function
 * This writes to notifications_outbox which triggers the processOutbox function
 */
export async function queuePushNotification(params: {
  title: string;
  body: string;
  targetType: 'user' | 'role' | 'project' | 'all';
  targetIds?: string[];
  targetUserIds?: string[];
  createdBy: string;
}): Promise<boolean> {
  try {
    const createdAt = new Date().toISOString();
    
    await addDoc(collection(db, 'notifications_outbox'), {
      ...params,
      createdAt,
    });

    return true;
  } catch (error) {
    console.error('Error queueing push notification:', error);
    return false;
  }
}

/**
 * Create notification with optional push delivery
 * This is the main function to use throughout the app
 */
export async function notifyUsers(
  params: CreateNotificationParams & {
    sendPush?: boolean;
    createdBy?: string;
  }
): Promise<boolean> {
  try {
    // Create in-app notifications
    const inAppSuccess = await createNotification(params);

    // Optionally queue push notifications
    if (params.sendPush && params.createdBy) {
      await queuePushNotification({
        title: params.title,
        body: params.message,
        targetType: 'user',
        targetUserIds: params.recipientIds,
        createdBy: params.createdBy,
      });
    }

    return inAppSuccess;
  } catch (error) {
    console.error('Error in notifyUsers:', error);
    return false;
  }
}
