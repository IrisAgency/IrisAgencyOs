/**
 * Tasks Store — manages task state and Firestore subscriptions.
 * Collections: tasks, task_comments, task_time_logs, task_dependencies,
 *              task_activity_logs, approval_steps, client_approvals
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { prefixedId } from '../utils/id';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import { notifyUsers } from '../services/notificationService';
import { createTaskFolder } from '../utils/folderUtils';
import { initializeQCBlock, shouldEnableQC, resetQCForResubmission } from '../utils/qcUtils';
import { archiveTask } from '../utils/archiveUtils';
import type {
  Task, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog,
  ApprovalStep, ClientApproval, TaskStatus, Project, User, ProjectMember,
  RoleDefinition, WorkflowTemplate, QCReview, SocialPost,
} from '../types';

interface TaskState {
  tasks: Task[];
  comments: TaskComment[];
  timeLogs: TaskTimeLog[];
  dependencies: TaskDependency[];
  activityLogs: TaskActivityLog[];
  approvalSteps: ApprovalStep[];
  clientApprovals: ClientApproval[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  // Derived
  activeTasks: () => Task[];

  // Task CRUD
  addTask: (task: Task, projects: Project[], users: User[], userId: string) => Promise<void>;
  updateTask: (updatedTask: Task, deps: {
    tasks: Task[]; userId: string; workflowTemplates: WorkflowTemplate[];
    qcReviews: QCReview[]; projectMembers: ProjectMember[];
    activeUsers: User[]; systemRoles: RoleDefinition[];
  }) => Promise<void>;
  deleteTask: (task: Task, userId: string, checkPermission: (perm: string) => boolean, showToast: (t: { title: string; message: string }) => void, addAuditLog: (a: string, e: string, id: string | null, d: string) => Promise<void>) => Promise<void>;
  archiveTask: (task: Task, userId: string) => Promise<void>;

  // Sub-entity CRUD
  addComment: (comment: TaskComment) => Promise<void>;
  addTimeLog: (log: TaskTimeLog) => Promise<void>;
  addDependency: (dep: TaskDependency) => Promise<void>;

  // Approvals
  updateApprovalStep: (step: ApprovalStep) => Promise<void>;
  addApprovalSteps: (steps: ApprovalStep[]) => Promise<void>;
  updateClientApproval: (ca: ClientApproval) => Promise<void>;
  addClientApproval: (ca: ClientApproval) => Promise<void>;

  // Social Posts
  addSocialPost: (post: SocialPost) => Promise<void>;
  updateSocialPost: (post: SocialPost, notify: (type: string, title: string, msg: string) => void) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  comments: [],
  timeLogs: [],
  dependencies: [],
  activityLogs: [],
  approvalSteps: [],
  clientApprovals: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    let pending = 7;
    const markLoaded = () => { pending--; if (pending <= 0) set({ loading: false }); };
    unsubs.push(subscribeCollection<Task>('tasks', (items) => { set({ tasks: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<TaskComment>('task_comments', (items) => { set({ comments: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<TaskTimeLog>('task_time_logs', (items) => { set({ timeLogs: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<TaskDependency>('task_dependencies', (items) => { set({ dependencies: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<TaskActivityLog>('task_activity_logs', (items) => { set({ activityLogs: items }); markLoaded(); }, (ref) => query(ref, orderBy('createdAt', 'desc'), limit(500))));
    unsubs.push(subscribeCollection<ApprovalStep>('approval_steps', (items) => { set({ approvalSteps: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ClientApproval>('client_approvals', (items) => { set({ clientApprovals: items }); markLoaded(); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach((fn) => fn());
    set({ _unsubscribers: [] });
  },

  activeTasks: () => get().tasks.filter(t => !t.isDeleted),

  addTask: async (task, projects, users, userId) => {
    await setDoc(doc(db, 'tasks', task.id), task);

    try {
      const project = projects.find(p => p.id === task.projectId);
      if (project) await createTaskFolder(task.id, task.title, task.projectId, project.clientId);
    } catch { /* folder creation optional */ }

    const log: TaskActivityLog = {
      id: prefixedId('tal'), taskId: task.id, userId, type: 'status_change',
      message: 'Task created', createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'task_activity_logs', log.id), log);

    if (task.assigneeIds?.length) {
      const creatorName = users.find(u => u.id === userId)?.name || 'Someone';
      const project = projects.find(p => p.id === task.projectId);
      await notifyUsers({
        type: 'TASK_ASSIGNED', title: 'New Task Assigned',
        message: `${creatorName} assigned you to "${task.title}"${project ? ` in ${project.name}` : ''}`,
        recipientIds: task.assigneeIds.filter(id => id !== userId),
        entityId: task.id, actionUrl: `/tasks/${task.id}`, sendPush: true, createdBy: userId,
      });
    }

    if (task.milestoneId) {
      const milestoneQ = query(collection(db, 'tasks'), where('milestoneId', '==', task.milestoneId));
      const snapshot = await getDocs(milestoneQ);
      const allTasks = snapshot.docs.map(d => d.data() as Task);
      const progress = allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100) : 0;
      await updateDoc(doc(db, 'project_milestones', task.milestoneId), { progressPercent: progress });
    }
  },

  updateTask: async (updatedTask, deps) => {
    const { tasks, userId, workflowTemplates, qcReviews, projectMembers, activeUsers, systemRoles } = deps;
    const oldTask = tasks.find(t => t.id === updatedTask.id);
    const taskToSave = Object.fromEntries(Object.entries(updatedTask).filter(([_, v]) => v !== undefined));
    await updateDoc(doc(db, 'tasks', updatedTask.id), taskToSave as any);

    const log: TaskActivityLog = {
      id: prefixedId('tal'), taskId: updatedTask.id, userId, type: 'status_change',
      message: `Status updated to ${updatedTask.status}`, createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'task_activity_logs', log.id), log);

    // QC trigger on awaiting_review
    if (oldTask && oldTask.status !== updatedTask.status) {
      if (updatedTask.status === ('awaiting_review' as TaskStatus)) {
        const template = workflowTemplates.find(w => w.id === updatedTask.workflowTemplateId);
        const qcEnabled = shouldEnableQC(updatedTask, (template as any)?.requiresQC);
        if (qcEnabled) {
          if (oldTask.status === ('revisions_required' as TaskStatus) && oldTask.qc?.enabled) {
            try { await resetQCForResubmission(updatedTask.id, qcReviews, oldTask.qc); } catch { /* skip */ }
          }
          if (!updatedTask.qc?.enabled) {
            const qcBlock = initializeQCBlock(updatedTask, projectMembers, activeUsers, systemRoles);
            await updateDoc(doc(db, 'tasks', updatedTask.id), { qc: qcBlock });
            if (qcBlock.reviewers.length > 0) {
              await notifyUsers({
                type: 'QC_REVIEW_REQUESTED', title: `QC Review Needed: ${updatedTask.title}`,
                message: `Task "${updatedTask.title}" requires Quality Control review`,
                recipientIds: qcBlock.reviewers.filter((id: string) => id !== userId),
                entityId: updatedTask.id, actionUrl: `/quality-control`, sendPush: true, createdBy: userId,
              });
            }
          } else {
            await updateDoc(doc(db, 'tasks', updatedTask.id), { 'qc.status': 'PENDING', 'qc.lastUpdatedAt': new Date().toISOString() });
          }
        }
      }

      // Notify on status changes
      const statusMessages: Record<string, string> = {
        'assigned': 'Task has been assigned', 'in_progress': 'Task is now in progress',
        'awaiting_review': 'Task submitted for review', 'revisions_required': 'Revisions requested',
        'approved': 'Task has been approved', 'client_review': 'Task sent for client review',
        'client_approved': 'Task approved by client', 'completed': 'Task has been completed',
        'archived': 'Task has been archived',
      };
      const message = statusMessages[updatedTask.status] || `Task status changed to ${updatedTask.status}`;
      const recipientIds = updatedTask.assigneeIds || [];
      if (recipientIds.length > 0) {
        await notifyUsers({
          type: 'TASK_STATUS_CHANGED', title: `Task Updated: ${updatedTask.title}`, message,
          recipientIds: recipientIds.filter(id => id !== userId),
          entityId: updatedTask.id, actionUrl: `/tasks/${updatedTask.id}`, sendPush: true, createdBy: userId,
        });
      }
    }

    // Assignment change notifications
    if (oldTask?.assigneeIds && updatedTask.assigneeIds) {
      const oldSet = new Set(oldTask.assigneeIds);
      const newSet = new Set(updatedTask.assigneeIds);
      const added = [...newSet].filter(id => !oldSet.has(id));
      const removed = [...oldSet].filter(id => !newSet.has(id));
      if (added.length > 0) {
        await notifyUsers({ type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: `You've been assigned to "${updatedTask.title}"`, recipientIds: added.filter(id => id !== userId), entityId: updatedTask.id, actionUrl: `/tasks/${updatedTask.id}`, sendPush: true, createdBy: userId });
      }
      if (removed.length > 0) {
        await notifyUsers({ type: 'TASK_UNASSIGNED', title: 'Task Assignment Removed', message: `You've been unassigned from "${updatedTask.title}"`, recipientIds: removed.filter(id => id !== userId), entityId: updatedTask.id, sendPush: true, createdBy: userId });
      }
    }

    // Due date change notifications
    if (oldTask && oldTask.dueDate !== updatedTask.dueDate && updatedTask.dueDate) {
      const recipientIds = updatedTask.assigneeIds || [];
      if (recipientIds.length > 0) {
        const formatted = new Date(updatedTask.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        await notifyUsers({ type: 'TASK_DUE_DATE_CHANGED', title: `Due Date Updated: ${updatedTask.title}`, message: `Due date ${oldTask.dueDate ? 'changed' : 'set'} to ${formatted}`, recipientIds: recipientIds.filter(id => id !== userId), entityId: updatedTask.id, actionUrl: `/tasks/${updatedTask.id}`, sendPush: true, createdBy: userId });
      }
    }

    // Milestone progress
    if (updatedTask.milestoneId) {
      const milestoneQ = query(collection(db, 'tasks'), where('milestoneId', '==', updatedTask.milestoneId));
      const snapshot = await getDocs(milestoneQ);
      const allTasks = snapshot.docs.map(d => d.data() as Task);
      const progress = allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100) : 0;
      await updateDoc(doc(db, 'project_milestones', updatedTask.milestoneId), { progressPercent: progress });
    }
  },

  deleteTask: async (task, userId, checkPermission, showToast, addAuditLog) => {
    if (!checkPermission('tasks.delete')) {
      showToast({ title: 'Access Denied', message: 'You do not have permission to delete tasks.' });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    try {
      await updateDoc(doc(db, 'tasks', task.id), { isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: userId });
      const pending = get().approvalSteps.filter(s => s.taskId === task.id && s.status === 'pending');
      if (pending.length) {
        const batch = writeBatch(db);
        pending.forEach(step => batch.update(doc(db, 'approval_steps', step.id), { status: 'cancelled' }));
        await batch.commit();
      }
      await addAuditLog('delete_task', 'Task', task.id, `Soft deleted task ${task.title}`);
      showToast({ title: 'Task Deleted', message: 'Task has been moved to trash.' });
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast({ title: 'Error', message: 'Failed to delete task.' });
    }
  },

  archiveTask: async (task, userId) => { await archiveTask(task, userId); },

  addComment: async (comment) => { await setDoc(doc(db, 'task_comments', comment.id), comment); },
  addTimeLog: async (log) => { await setDoc(doc(db, 'task_time_logs', log.id), log); },
  addDependency: async (dep) => { await setDoc(doc(db, 'task_dependencies', dep.id), dep); },

  updateApprovalStep: async (step) => { await updateDoc(doc(db, 'approval_steps', step.id), step as any); },
  addApprovalSteps: async (steps) => {
    const batch = writeBatch(db);
    steps.forEach(s => batch.set(doc(db, 'approval_steps', s.id), s));
    await batch.commit();
  },
  updateClientApproval: async (ca) => { await updateDoc(doc(db, 'client_approvals', ca.id), ca as any); },
  addClientApproval: async (ca) => { await setDoc(doc(db, 'client_approvals', ca.id), ca); },

  addSocialPost: async (post) => { await setDoc(doc(db, 'social_posts', post.id), post); },
  updateSocialPost: async (post, notify) => {
    try {
      await updateDoc(doc(db, 'social_posts', post.id), post as any);
      notify('system', 'Post Updated', `Social post "${post.title}" updated successfully.`);
    } catch {
      notify('system', 'Update Failed', 'Failed to update social post.');
    }
  },
}));
