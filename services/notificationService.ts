import { 
  Notification, 
  NotificationType, 
  NotificationSeverity, 
  NotificationCategory,
  NotificationEntityType,
  NotificationAction,
  User
} from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  actionUrl?: string;
  actions?: NotificationAction[];
  groupKey?: string;
}

export class NotificationService {
  private static notificationsCollection = 'notifications';

  // Get severity and category based on notification type
  private static getMetadata(type: NotificationType): { severity: NotificationSeverity; category: NotificationCategory } {
    const metadata: Record<string, { severity: NotificationSeverity; category: NotificationCategory }> = {
      // Tasks - Info
      'TASK_ASSIGNED': { severity: 'info', category: 'tasks' },
      'TASK_UNASSIGNED': { severity: 'info', category: 'tasks' },
      'TASK_STATUS_CHANGED': { severity: 'info', category: 'tasks' },
      'TASK_APPROVED_FINAL': { severity: 'info', category: 'tasks' },
      'TASK_ARCHIVED': { severity: 'info', category: 'tasks' },
      'TASK_COMMENT_REPLY': { severity: 'info', category: 'tasks' },
      
      // Tasks - Warning
      'TASK_DUE_SOON': { severity: 'warning', category: 'tasks' },
      
      // Tasks - Urgent
      'TASK_OVERDUE': { severity: 'urgent', category: 'tasks' },
      'TASK_SUBMITTED_FOR_REVIEW': { severity: 'urgent', category: 'tasks' },
      'TASK_REVISION_REQUESTED': { severity: 'urgent', category: 'tasks' },
      'TASK_COMMENT_MENTION': { severity: 'urgent', category: 'tasks' },
      
      // Approvals - Urgent
      'APPROVAL_REQUESTED': { severity: 'urgent', category: 'approvals' },
      'APPROVAL_REMINDER': { severity: 'urgent', category: 'approvals' },
      'APPROVAL_ESCALATION': { severity: 'urgent', category: 'approvals' },
      'TASK_APPROVED_STEP': { severity: 'info', category: 'approvals' },
      'TASK_REJECTED_STEP': { severity: 'warning', category: 'approvals' },
      
      // Posting
      'POST_CREATED_FROM_TASK': { severity: 'info', category: 'posting' },
      'POST_ASSIGNED': { severity: 'info', category: 'posting' },
      'POST_CAPTION_SUBMITTED': { severity: 'info', category: 'posting' },
      'POST_REVISION_REQUESTED': { severity: 'warning', category: 'posting' },
      'POST_APPROVED': { severity: 'info', category: 'posting' },
      'POST_SCHEDULED': { severity: 'info', category: 'posting' },
      'POST_PUBLISHING_TODAY': { severity: 'warning', category: 'posting' },
      'POST_PUBLISHED': { severity: 'info', category: 'posting' },
      
      // Projects
      'NEW_CLIENT_CREATED': { severity: 'info', category: 'projects' },
      'PROJECT_CREATED': { severity: 'info', category: 'projects' },
      'PROJECT_ARCHIVED': { severity: 'info', category: 'projects' },
      'MILESTONE_STARTED': { severity: 'info', category: 'projects' },
      'MILESTONE_AT_RISK': { severity: 'warning', category: 'projects' },
      
      // Meetings
      'MEETING_SCHEDULED': { severity: 'info', category: 'meetings' },
      'MEETING_REMINDER_24H': { severity: 'info', category: 'meetings' },
      'MEETING_REMINDER_1H': { severity: 'warning', category: 'meetings' },
      'MINUTES_UPLOADED': { severity: 'info', category: 'meetings' },
      
      // Finance
      'INVOICE_CREATED': { severity: 'info', category: 'finance' },
      'INVOICE_DUE_SOON': { severity: 'warning', category: 'finance' },
      'PAYMENT_RECORDED': { severity: 'info', category: 'finance' },
      'BUDGET_EXCEEDED': { severity: 'urgent', category: 'finance' },
    };

    return metadata[type] || { severity: 'info', category: 'system' };
  }

  // Create a notification
  static async create(params: CreateNotificationParams): Promise<void> {
    const { severity, category } = this.getMetadata(params.type);
    const dedupeKey = params.groupKey ? `${params.userId}_${params.groupKey}_${Date.now()}` : undefined;

    // Check for duplicates if dedupeKey provided
    if (dedupeKey) {
      const recentDuplicates = await this.checkDuplicates(params.userId, params.groupKey!, 300000); // 5 min window
      if (recentDuplicates) return; // Skip if duplicate found
    }

    const notification: Omit<Notification, 'id'> = {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity,
      category,
      entityType: params.entityType,
      entityId: params.entityId,
      actionUrl: params.actionUrl,
      actions: params.actions,
      isRead: false,
      createdAt: new Date().toISOString(),
      groupKey: params.groupKey,
      dedupeKey,
    };

    try {
      await addDoc(collection(db, this.notificationsCollection), {
        ...notification,
        createdAt: serverTimestamp(),
      });
      console.log(`✅ Notification created: ${params.type} for user ${params.userId}`);
    } catch (error) {
      console.error('❌ Error creating notification:', error);
    }
  }

  // Create notifications for multiple users
  static async createForUsers(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>): Promise<void> {
    const promises = userIds.map(userId => this.create({ ...params, userId }));
    await Promise.all(promises);
  }

  // Check for recent duplicates
  private static async checkDuplicates(userId: string, groupKey: string, timeWindowMs: number): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();
    const q = query(
      collection(db, this.notificationsCollection),
      where('userId', '==', userId),
      where('groupKey', '==', groupKey),
      where('createdAt', '>=', cutoffTime)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  // Task notification helpers
  static async notifyTaskAssigned(taskId: string, taskTitle: string, assigneeIds: string[], assignedBy: string): Promise<void> {
    await this.createForUsers(assigneeIds, {
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned to "${taskTitle}"`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
      groupKey: `task_${taskId}`,
      actions: [
        { label: 'Open Task', action: 'open', variant: 'primary' },
        { label: 'Mark as Read', action: 'read', variant: 'secondary' }
      ]
    });
  }

  static async notifyTaskSubmittedForReview(taskId: string, taskTitle: string, approverIds: string[]): Promise<void> {
    await this.createForUsers(approverIds, {
      type: 'TASK_SUBMITTED_FOR_REVIEW',
      title: 'Approval Needed',
      message: `"${taskTitle}" is awaiting your approval`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
      groupKey: `task_${taskId}_approval`,
      actions: [
        { label: 'Review', action: 'open', variant: 'primary' },
        { label: 'Approve', action: 'approve', variant: 'primary' },
        { label: 'Request Changes', action: 'reject', variant: 'danger' }
      ]
    });
  }

  static async notifyTaskRevisionRequested(taskId: string, taskTitle: string, assigneeIds: string[], feedback: string): Promise<void> {
    await this.createForUsers(assigneeIds, {
      type: 'TASK_REVISION_REQUESTED',
      title: 'Revisions Requested',
      message: `Changes requested for "${taskTitle}": ${feedback}`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
      groupKey: `task_${taskId}`,
      actions: [
        { label: 'View Feedback', action: 'open', variant: 'primary' }
      ]
    });
  }

  static async notifyTaskDueSoon(taskId: string, taskTitle: string, assigneeIds: string[], hoursUntilDue: number): Promise<void> {
    await this.createForUsers(assigneeIds, {
      type: 'TASK_DUE_SOON',
      title: 'Task Due Soon',
      message: `"${taskTitle}" is due in ${hoursUntilDue} hours`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
      groupKey: `task_${taskId}_due`,
      actions: [
        { label: 'Open Task', action: 'open', variant: 'primary' }
      ]
    });
  }

  static async notifyTaskOverdue(taskId: string, taskTitle: string, assigneeIds: string[], managerIds: string[]): Promise<void> {
    // Notify assignees
    await this.createForUsers(assigneeIds, {
      type: 'TASK_OVERDUE',
      title: 'Task Overdue',
      message: `"${taskTitle}" is now overdue`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
      groupKey: `task_${taskId}_overdue`,
      actions: [
        { label: 'Open Task', action: 'open', variant: 'danger' }
      ]
    });

    // Escalate to managers
    await this.createForUsers(managerIds, {
      type: 'APPROVAL_ESCALATION',
      title: 'Task Overdue - Escalation',
      message: `"${taskTitle}" is overdue and requires attention`,
      entityType: 'task',
      entityId: taskId,
      actionUrl: `/tasks/${taskId}`,
      groupKey: `task_${taskId}_escalation`,
      actions: [
        { label: 'Review Task', action: 'open', variant: 'danger' }
      ]
    });
  }

  // Posting notification helpers
  static async notifyPostCreated(postId: string, postTitle: string, socialManagerIds: string[]): Promise<void> {
    await this.createForUsers(socialManagerIds, {
      type: 'POST_CREATED_FROM_TASK',
      title: 'New Post Created',
      message: `Post "${postTitle}" is ready for scheduling`,
      entityType: 'post',
      entityId: postId,
      actionUrl: `/posting/${postId}`,
      groupKey: `post_${postId}`,
      actions: [
        { label: 'Open Post', action: 'open', variant: 'primary' }
      ]
    });
  }

  static async notifyPostScheduled(postId: string, postTitle: string, scheduledDate: string, managerIds: string[]): Promise<void> {
    await this.createForUsers(managerIds, {
      type: 'POST_SCHEDULED',
      title: 'Post Scheduled',
      message: `"${postTitle}" scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
      entityType: 'post',
      entityId: postId,
      actionUrl: `/posting/${postId}`,
      groupKey: `post_${postId}`,
    });
  }

  // Meeting notification helpers
  static async notifyMeetingScheduled(meetingId: string, meetingTitle: string, attendeeIds: string[], startTime: string): Promise<void> {
    await this.createForUsers(attendeeIds, {
      type: 'MEETING_SCHEDULED',
      title: 'Meeting Scheduled',
      message: `"${meetingTitle}" on ${new Date(startTime).toLocaleString()}`,
      entityType: 'meeting',
      entityId: meetingId,
      actionUrl: `/meetings/${meetingId}`,
      groupKey: `meeting_${meetingId}`,
      actions: [
        { label: 'View Details', action: 'open', variant: 'primary' }
      ]
    });
  }

  // Finance notification helpers
  static async notifyInvoiceDueSoon(invoiceId: string, invoiceNumber: string, clientName: string, accountManagerIds: string[]): Promise<void> {
    await this.createForUsers(accountManagerIds, {
      type: 'INVOICE_DUE_SOON',
      title: 'Invoice Due Soon',
      message: `Invoice ${invoiceNumber} for ${clientName} is due soon`,
      entityType: 'invoice',
      entityId: invoiceId,
      actionUrl: `/finance/invoices/${invoiceId}`,
      groupKey: `invoice_${invoiceId}`,
      actions: [
        { label: 'View Invoice', action: 'open', variant: 'primary' }
      ]
    });
  }
}
