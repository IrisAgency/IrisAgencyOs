# Professional Notification System

## Overview
IRIS Agency OS now features an OS-grade notification system with comprehensive event tracking, severity levels, recipient routing, and professional UI components.

## Architecture

### Core Components

1. **Type System** (`types.ts`)
   - 40+ notification types organized by category
   - Severity levels: `info`, `warning`, `urgent`
   - Categories: `tasks`, `approvals`, `posting`, `projects`, `meetings`, `finance`
   - Entity types for linking notifications to resources
   - Action buttons with variants for quick actions

2. **NotificationService** (`services/notificationService.ts`)
   - Centralized notification creation
   - Automatic severity and category assignment
   - Deduplication logic (5-minute window)
   - Helper methods for common notification scenarios
   - Batch notification creation for multiple users

3. **NotificationsHub UI** (`components/NotificationsHub.tsx`)
   - Tabbed interface: All, Tasks, Approvals, Posting, Settings
   - Smart filtering: Unread only, Urgent only
   - Grouped notifications by entity (e.g., multiple updates for same task)
   - Quick action buttons: Open, Approve, Mark Read
   - Visual severity badges
   - Unread count badge in header

## Notification Types by Category

### Tasks (13 types)
- `TASK_ASSIGNED` - New task assignment
- `TASK_UNASSIGNED` - Removed from task
- `TASK_STATUS_CHANGED` - Status update
- `TASK_SUBMITTED_FOR_REVIEW` - Awaiting approval
- `TASK_REVISION_REQUESTED` - Changes needed
- `TASK_APPROVED_STEP` - Step approval
- `TASK_REJECTED_STEP` - Step rejection
- `TASK_APPROVED_FINAL` - Final approval
- `TASK_DUE_SOON` - Due in 24h
- `TASK_OVERDUE` - Past deadline
- `TASK_COMMENT_MENTION` - Mentioned in comment
- `TASK_COMMENT_REPLY` - Comment reply
- `TASK_ARCHIVED` - Task archived

### Approvals (3 types)
- `APPROVAL_REQUESTED` - New approval needed
- `APPROVAL_REMINDER` - Pending approval reminder
- `APPROVAL_ESCALATION` - Escalated to manager

### Posting (8 types)
- `POST_CREATED_FROM_TASK` - New post from task
- `POST_ASSIGNED` - Assigned to social manager
- `POST_CAPTION_SUBMITTED` - Caption ready for review
- `POST_REVISION_REQUESTED` - Caption changes needed
- `POST_APPROVED` - Caption approved
- `POST_SCHEDULED` - Scheduled for publishing
- `POST_PUBLISHING_TODAY` - Publishing today reminder
- `POST_PUBLISHED` - Successfully published

### Projects (5 types)
- `NEW_CLIENT_CREATED` - New client added
- `PROJECT_CREATED` - New project
- `PROJECT_ARCHIVED` - Project archived
- `MILESTONE_STARTED` - Milestone started
- `MILESTONE_AT_RISK` - Milestone at risk

### Meetings (4 types)
- `MEETING_SCHEDULED` - New meeting scheduled
- `MEETING_REMINDER_24H` - Meeting in 24h
- `MEETING_REMINDER_1H` - Meeting in 1h
- `MEETING_MINUTES_UPLOADED` - Minutes available

### Finance (4 types)
- `INVOICE_CREATED` - New invoice
- `INVOICE_DUE_SOON` - Invoice due soon
- `PAYMENT_RECORDED` - Payment received
- `BUDGET_EXCEEDED` - Budget limit exceeded

## Usage Examples

### Creating Notifications

```typescript
import { NotificationService } from './services/notificationService';

// Task assigned
await NotificationService.notifyTaskAssigned(
  taskId,
  taskTitle,
  [userId1, userId2], // assignees
  currentUserId // who assigned it
);

// Task submitted for review
await NotificationService.notifyTaskSubmittedForReview(
  taskId,
  taskTitle,
  [approverId] // only current step approver
);

// Task overdue (escalates to managers)
await NotificationService.notifyTaskOverdue(
  taskId,
  taskTitle,
  [assigneeId], // assignees
  [managerId1, managerId2] // managers for escalation
);

// Post scheduled
await NotificationService.notifyPostScheduled(
  postId,
  postTitle,
  scheduledDate,
  [managerId]
);

// Custom notification
await NotificationService.create({
  userId: targetUserId,
  type: 'BUDGET_EXCEEDED',
  title: 'Budget Alert',
  message: 'Project X has exceeded 80% of budget',
  entityType: 'project',
  entityId: projectId,
  actionUrl: `/projects/${projectId}/finance`,
  actions: [
    { label: 'View Budget', action: 'open', variant: 'primary' }
  ],
  groupKey: `budget_${projectId}`
});
```

## Recipient Rules

The notification service automatically routes notifications to the correct recipients:

### Task Notifications
- **TASK_ASSIGNED**: Assignees only
- **TASK_SUBMITTED_FOR_REVIEW**: Current approval step approver only
- **TASK_REVISION_REQUESTED**: Assignees + task creator
- **TASK_OVERDUE**: Assignees + escalation to PM/GM roles
- **TASK_COMMENT_MENTION**: Mentioned user only

### Posting Notifications
- **POST_CREATED_FROM_TASK**: Assigned social media manager only
- **POST_ASSIGNED**: Newly assigned manager
- **POST_SCHEDULED**: PM/GM roles for awareness
- **POST_PUBLISHING_TODAY**: Assigned manager + PM

### Approval Notifications
- **APPROVAL_REQUESTED**: Current step approver only
- **APPROVAL_REMINDER**: Same approver (if no action after 24h)
- **APPROVAL_ESCALATION**: PM/GM roles (if no action after 48h)

### Meeting Notifications
- **MEETING_SCHEDULED**: All attendees
- **MEETING_REMINDER_24H**: All attendees
- **MEETING_REMINDER_1H**: All attendees

### Finance Notifications
- **INVOICE_DUE_SOON**: Account manager + finance team
- **PAYMENT_RECORDED**: Account manager + creator
- **BUDGET_EXCEEDED**: PM + GM roles

## Features

### Deduplication
Prevents spam by checking for similar notifications within a 5-minute window using `groupKey`:
```typescript
groupKey: `task_${taskId}` // Groups all task updates together
```

### Grouping
Related notifications are visually grouped in the UI when they share a `groupKey`. Shows count badge (e.g., "3 updates").

### Quick Actions
Notifications can include action buttons:
- **Primary**: Main action (e.g., "Open Task", "Review")
- **Secondary**: Optional action (e.g., "Mark as Read")
- **Danger**: Destructive action (e.g., "Request Changes")

### Filters
- **Unread Only**: Shows only unread notifications
- **Urgent Only**: Shows only urgent severity notifications
- **Category Tabs**: Filter by Tasks, Approvals, Posting

### Settings Panel
Users can customize:
- **Delivery Channels**: In-App, Email, Push
- **Muted Categories**: Disable categories they don't need
- **Severity Threshold**: Only show notifications above selected level

## Integration Points

### Task Lifecycle
```typescript
// In TasksHub.tsx or task update handlers
import { NotificationService } from '../services/notificationService';

// When assigning task
await NotificationService.notifyTaskAssigned(task.id, task.title, newAssignees, currentUserId);

// When submitting for review
const currentApprover = getCurrentApprover(task);
await NotificationService.notifyTaskSubmittedForReview(task.id, task.title, [currentApprover.id]);

// When requesting revisions
await NotificationService.notifyTaskRevisionRequested(task.id, task.title, task.assignees, feedback);
```

### Scheduled Reminders
Implement using Firebase Cloud Functions or scheduled workers:

```typescript
// Cloud Function scheduled daily at 9 AM
export const sendDailyReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    // Task due soon (24h)
    const tasksDueSoon = await getTasksDueWithin24Hours();
    for (const task of tasksDueSoon) {
      await NotificationService.notifyTaskDueSoon(
        task.id,
        task.title,
        task.assignees,
        24
      );
    }

    // Overdue tasks
    const overdueTasks = await getOverdueTasks();
    for (const task of overdueTasks) {
      const managers = await getProjectManagers(task.projectId);
      await NotificationService.notifyTaskOverdue(
        task.id,
        task.title,
        task.assignees,
        managers
      );
    }

    // Posts publishing today
    const postsToday = await getPostsScheduledToday();
    for (const post of postsToday) {
      const manager = await getAssignedManager(post.id);
      const pm = await getProjectManager(post.projectId);
      await NotificationService.createForUsers(
        [manager.id, pm.id],
        {
          type: 'POST_PUBLISHING_TODAY',
          title: 'Post Publishing Today',
          message: `"${post.title}" is scheduled to publish today`,
          entityType: 'post',
          entityId: post.id,
          actionUrl: `/posting/${post.id}`
        }
      );
    }
  });
```

## Database Schema

Firestore collection: `notifications`

```typescript
{
  id: string;
  userId: string; // recipient
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  category: 'tasks' | 'approvals' | 'posting' | 'meetings' | 'finance';
  entityType?: 'task' | 'post' | 'project' | 'meeting' | 'invoice';
  entityId?: string;
  actionUrl?: string;
  actions?: NotificationAction[];
  isRead: boolean;
  createdAt: Timestamp;
  groupKey?: string; // e.g., "task_123"
  dedupeKey?: string; // e.g., "user123_task_123_1234567890"
}
```

## Performance Considerations

1. **Indexing**: Create Firestore composite indexes:
   - `userId + isRead + createdAt`
   - `userId + category + createdAt`
   - `userId + groupKey + createdAt`

2. **Pagination**: Load notifications in batches of 50

3. **Real-time Updates**: Use Firestore listeners for live updates:
```typescript
const unsubscribe = onSnapshot(
  query(
    collection(db, 'notifications'),
    where('userId', '==', currentUserId),
    orderBy('createdAt', 'desc'),
    limit(50)
  ),
  (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setNotifications(notifications);
  }
);
```

## Future Enhancements

- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Email notifications with templates
- [ ] Notification preferences per notification type
- [ ] Do Not Disturb mode
- [ ] Notification sound preferences
- [ ] Digest emails (daily/weekly summary)
- [ ] Mark all as read for specific category
- [ ] Archive old notifications (auto-delete after 30 days)
- [ ] Notification search and filtering
- [ ] Export notification history
