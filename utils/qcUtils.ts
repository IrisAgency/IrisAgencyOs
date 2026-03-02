/**
 * Quality Control (QC) Decision Engine
 * 
 * Implements the QC review rules:
 * - Rule A: GM/CD approve → QC Approved (override all rejects)
 * - Rule B: GM/CD silent + all others approve → QC Approved
 * - Rule C: GM/CD silent + others tied → NEEDS_INTERVENTION
 * - Rule D: GM/CD reject (other hasn't approved) → REJECTED
 */

import { doc, setDoc, updateDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyUsers } from '../services/notificationService';
import type {
  Task,
  User,
  QCStatus,
  QCReview,
  QCReviewDecision,
  QCReviewAttachment,
  TaskQCBlock,
  RoleDefinition,
  ProjectMember,
  UserRole,
  TaskStatus,
  ApprovalStep,
} from '../types';

// Roles that have override/veto power in QC
const OVERRIDE_ROLES: string[] = [
  'General Manager',
  'Creative Director',
];

/**
 * Check if a user's role is a GM or CD (override role).
 */
function isOverrideRole(userRole: string): boolean {
  return OVERRIDE_ROLES.some(r => r.toLowerCase() === userRole.toLowerCase());
}

/**
 * Compute the aggregated QC status from all individual reviews.
 * 
 * Rules:
 * A — GM/CD approve → APPROVED (even if all others reject)
 * B — GM/CD silent, all others approve → APPROVED
 * C — GM/CD silent, others tied → NEEDS_INTERVENTION
 * D — GM/CD reject (other hasn't approved) → REJECTED; both reject → REJECTED
 * 
 * "Silent" means the reviewer has not yet submitted a decision (no review doc, or decision === 'PENDING').
 */
export function computeQCStatus(
  reviews: QCReview[],
  reviewers: string[],
  requiredApprovals: string[],
  users: User[]
): QCStatus {
  // Build a map of reviewerId → decision
  const decisionMap = new Map<string, QCReviewDecision>();
  for (const review of reviews) {
    decisionMap.set(review.reviewerId, review.decision);
  }

  // Identify override reviewers (GM/CD) from the required list
  const overrideReviewerIds = requiredApprovals.filter(uid => {
    const u = users.find(usr => usr.id === uid);
    return u && isOverrideRole(u.role);
  });

  // Non-override reviewers
  const otherReviewerIds = reviewers.filter(uid => !overrideReviewerIds.includes(uid));

  // Get decisions for override reviewers
  const overrideDecisions = overrideReviewerIds.map(uid => ({
    uid,
    decision: decisionMap.get(uid) || 'PENDING' as QCReviewDecision,
  }));

  const overrideApprovals = overrideDecisions.filter(d => d.decision === 'APPROVED');
  const overrideRejections = overrideDecisions.filter(d => d.decision === 'REJECTED');
  const overridePending = overrideDecisions.filter(d => d.decision === 'PENDING');

  // Rule A: Any GM/CD approves → APPROVED
  if (overrideApprovals.length > 0) {
    return 'APPROVED';
  }

  // Rule D: Both GM/CD reject → REJECTED
  if (overrideRejections.length > 0 && overridePending.length === 0) {
    return 'REJECTED';
  }

  // Rule D: One GM/CD rejects, other hasn't decided
  if (overrideRejections.length > 0 && overridePending.length > 0) {
    // Still REJECTED unless the other overrides with an approval later
    return 'REJECTED';
  }

  // At this point, all override reviewers are silent (PENDING)
  // Check other reviewers
  const otherDecisions = otherReviewerIds.map(uid => ({
    uid,
    decision: decisionMap.get(uid) || 'PENDING' as QCReviewDecision,
  }));

  const otherApprovals = otherDecisions.filter(d => d.decision === 'APPROVED').length;
  const otherRejections = otherDecisions.filter(d => d.decision === 'REJECTED').length;
  const otherPending = otherDecisions.filter(d => d.decision === 'PENDING').length;

  // If any others are still pending, QC stays PENDING
  if (otherPending > 0) {
    return 'PENDING';
  }

  // All others have voted
  if (otherApprovals > 0 && otherRejections === 0) {
    // Rule B: All others approve, GM/CD silent → APPROVED
    return 'APPROVED';
  }

  if (otherRejections > 0 && otherApprovals === 0) {
    // All others reject → REJECTED (GM/CD can still override later)
    return 'REJECTED';
  }

  // Rule C: Others are split (equal or mixed) → NEEDS_INTERVENTION
  if (otherApprovals === otherRejections) {
    return 'NEEDS_INTERVENTION';
  }

  // Majority decides for non-tie cases
  if (otherApprovals > otherRejections) {
    return 'APPROVED';
  }

  return 'REJECTED';
}

/**
 * Initialize a QC block for a task entering review.
 * Auto-populates reviewers from project members by role.
 */
export function initializeQCBlock(
  task: Task,
  projectMembers: ProjectMember[],
  users: User[],
  roles: RoleDefinition[]
): TaskQCBlock {
  const taskProjectMembers = projectMembers.filter(pm => pm.projectId === task.projectId);

  // Find users who are GM, CD, AM, or Copywriter in the project
  const reviewerRoles = ['General Manager', 'Creative Director', 'Account Manager', 'Copywriter'];
  const requiredRoles = ['General Manager', 'Creative Director'];

  const reviewerIds: string[] = [];
  const requiredApprovalIds: string[] = [];

  for (const pm of taskProjectMembers) {
    const u = users.find(usr => usr.id === pm.userId);
    if (!u) continue;

    if (reviewerRoles.some(r => r.toLowerCase() === u.role.toLowerCase())) {
      if (!reviewerIds.includes(u.id)) {
        reviewerIds.push(u.id);
      }
    }
    if (requiredRoles.some(r => r.toLowerCase() === u.role.toLowerCase())) {
      if (!requiredApprovalIds.includes(u.id)) {
        requiredApprovalIds.push(u.id);
      }
    }
  }

  // Always ensure GM/CD are included as reviewers (they have override/veto power)
  // regardless of whether they're project members
  for (const u of users) {
    if (u.status === 'inactive') continue;
    if (requiredRoles.some(r => r.toLowerCase() === u.role.toLowerCase())) {
      if (!reviewerIds.includes(u.id)) {
        reviewerIds.push(u.id);
      }
      if (!requiredApprovalIds.includes(u.id)) {
        requiredApprovalIds.push(u.id);
      }
    }
  }

  // Fallback: if still no project-level reviewers found (no AM/Copywriter), look globally for all reviewer roles
  if (reviewerIds.length === requiredApprovalIds.length) {
    // Only GM/CD found so far — add other reviewer roles globally
    for (const u of users) {
      if (u.status === 'inactive') continue;
      if (reviewerRoles.some(r => r.toLowerCase() === u.role.toLowerCase())) {
        if (!reviewerIds.includes(u.id)) {
          reviewerIds.push(u.id);
        }
      }
    }
  }

  return {
    enabled: true,
    reviewers: reviewerIds,
    requiredApprovals: requiredApprovalIds,
    status: 'PENDING',
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Determine whether QC should be enabled for a task based on override and workflow template.
 */
export function shouldEnableQC(
  task: Task,
  workflowTemplateRequiresQC: boolean | undefined
): boolean {
  // Per-task override takes priority
  if (task.qcOverride === 'force_enable') return true;
  if (task.qcOverride === 'force_disable') return false;
  // Fall back to workflow template setting (default true)
  return workflowTemplateRequiresQC ?? true;
}

/**
 * Map QC outcome to the appropriate task status update.
 */
export function applyQCDecisionToTask(
  task: Task,
  qcStatus: QCStatus
): Partial<Task> {
  switch (qcStatus) {
    case 'APPROVED':
      // Move task forward: if client approval required, go to client_review; else approved
      if (task.isClientApprovalRequired) {
        return { status: 'client_review' as TaskStatus };
      }
      return { status: 'approved' as TaskStatus };

    case 'REJECTED':
      return { status: 'revisions_required' as TaskStatus };

    case 'NEEDS_INTERVENTION':
      // Task stays in awaiting_review but QC block is flagged
      return {};

    case 'PENDING':
    default:
      return {};
  }
}

/**
 * Submit a QC review decision for a task.
 * 
 * - Upserts into task_qc_reviews
 * - Recalculates aggregated QC status
 * - Updates the task's qc block
 * - Conditionally updates task status based on QC outcome
 * - Sends appropriate notifications
 */
export async function submitQCReview(params: {
  task: Task;
  reviewerId: string;
  reviewerRole: string;
  decision: 'APPROVED' | 'REJECTED';
  note: string | null;
  attachments: QCReviewAttachment[];
  allQCReviews: QCReview[];
  users: User[];
  createdBy: string;
}): Promise<{ newStatus: QCStatus }> {
  const { task, reviewerId, reviewerRole, decision, note, attachments, allQCReviews, users, createdBy } = params;

  if (!task.qc) {
    throw new Error('Task does not have QC enabled');
  }

  // Auto-add manager to reviewers/requiredApprovals if they're not already listed
  // This handles cases where a GM/CD with qc.manage reviews a task they weren't assigned to
  const reviewerIsInList = task.qc.reviewers.includes(reviewerId);
  if (!reviewerIsInList) {
    task.qc.reviewers = [...task.qc.reviewers, reviewerId];
    if (isOverrideRole(reviewerRole)) {
      task.qc.requiredApprovals = [...task.qc.requiredApprovals, reviewerId];
    }
  }

  const now = new Date().toISOString();
  const reviewDocId = `${task.id}_${reviewerId}`;

  // Build the review document
  const reviewDoc: QCReview = {
    id: reviewDocId,
    taskId: task.id,
    projectId: task.projectId,
    clientId: task.client || '',
    workflowId: task.workflowTemplateId || null,
    taskStatusSnapshot: task.status,
    reviewerId,
    reviewerRole,
    decision,
    note,
    attachments: attachments || [],
    createdAt: now,
    updatedAt: now,
  };

  // Check if this reviewer already has a review (update vs create)
  const existingReview = allQCReviews.find(r => r.taskId === task.id && r.reviewerId === reviewerId);
  if (existingReview) {
    reviewDoc.createdAt = existingReview.createdAt;
  }

  // Build updated reviews list for status computation
  const updatedReviews = [
    ...allQCReviews.filter(r => !(r.taskId === task.id && r.reviewerId === reviewerId)),
    reviewDoc,
  ];

  const taskReviews = updatedReviews.filter(r => r.taskId === task.id);

  // Compute new QC status
  const newStatus = computeQCStatus(
    taskReviews,
    task.qc.reviewers,
    task.qc.requiredApprovals,
    users
  );

  // Build batch write
  const batch = writeBatch(db);

  // 1. Upsert the review document
  batch.set(doc(db, 'task_qc_reviews', reviewDocId), reviewDoc);

  // 2. Update task.qc block
  const qcUpdate: TaskQCBlock = {
    ...task.qc,
    status: newStatus,
    lastUpdatedAt: now,
  };

  // 3. Determine task status changes
  const taskStatusUpdate = applyQCDecisionToTask(task, newStatus);
  const taskUpdate: Record<string, any> = {
    qc: qcUpdate,
    updatedAt: now,
    ...taskStatusUpdate,
  };

  // 4. If QC rejected, reset revision context for re-review cycle
  if (newStatus === 'REJECTED') {
    taskUpdate.revisionContext = {
      active: true,
      requestedByUserId: reviewerId,
      requestedByStepId: 'qc',
      assignedToUserId: task.assigneeIds?.[0] || task.createdBy,
      requestedAt: now,
      message: note || 'Rejected during Quality Control review',
      cycle: (task.revisionHistory?.length || 0) + 1,
    };
  }

  batch.update(doc(db, 'tasks', task.id), taskUpdate);

  await batch.commit();

  // Send notifications based on outcome
  try {
    if (newStatus === 'APPROVED') {
      const recipientIds = [...(task.assigneeIds || []), task.createdBy].filter(Boolean);
      await notifyUsers({
        type: 'QC_APPROVED',
        title: `QC Approved: ${task.title}`,
        message: `Task "${task.title}" passed Quality Control review`,
        recipientIds: [...new Set(recipientIds)].filter(id => id !== reviewerId),
        entityId: task.id,
        actionUrl: `/tasks/${task.id}`,
        sendPush: true,
        createdBy,
      });
    } else if (newStatus === 'REJECTED') {
      const recipientIds = [...(task.assigneeIds || []), task.createdBy].filter(Boolean);
      await notifyUsers({
        type: 'QC_REJECTED',
        title: `QC Rejected: ${task.title}`,
        message: note || `Task "${task.title}" was rejected in Quality Control`,
        recipientIds: [...new Set(recipientIds)].filter(id => id !== reviewerId),
        entityId: task.id,
        actionUrl: `/tasks/${task.id}`,
        sendPush: true,
        createdBy,
      });
    } else if (newStatus === 'NEEDS_INTERVENTION') {
      // Notify GM + CD specifically
      await notifyUsers({
        type: 'QC_NEEDS_INTERVENTION',
        title: `QC Requires Attention: ${task.title}`,
        message: `Task "${task.title}" has a tied QC vote and requires GM/CD intervention`,
        recipientIds: task.qc.requiredApprovals.filter(id => id !== reviewerId),
        entityId: task.id,
        actionUrl: `/quality-control`,
        sendPush: true,
        createdBy,
      });
    }
  } catch (err) {
    console.error('QC notification error:', err);
  }

  return { newStatus };
}

/**
 * Approve a task step from the QC Hub.
 * This links the QC review with the approval step system:
 * 1. Marks the user's pending approval_step as approved
 * 2. Activates the next approval step
 * 3. Writes a QC review record for the reviewer
 * 4. When all steps are approved, applies the final QC/task status
 */
export async function approveFromQCHub(params: {
  task: Task;
  reviewerId: string;
  reviewerRole: string;
  approvalSteps: ApprovalStep[];
  allQCReviews: QCReview[];
  users: User[];
  workflowTemplates: { id: string; requiresQC?: boolean; steps: any[] }[];
  createdBy: string;
}): Promise<{ success: boolean; message: string }> {
  const { task, reviewerId, reviewerRole, approvalSteps, allQCReviews, users, workflowTemplates, createdBy } = params;

  const taskSteps = approvalSteps.filter(s => s.taskId === task.id).sort((a, b) => a.level - b.level);
  const pendingStep = taskSteps.find(s => s.approverId === reviewerId && s.status === 'pending');

  if (!pendingStep) {
    return { success: false, message: 'No pending approval step found for this user.' };
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Mark current step approved
  batch.update(doc(db, 'approval_steps', pendingStep.id), {
    status: 'approved',
    reviewedAt: now,
    comment: 'Approved',
  });

  // 2. Write QC review record for traceability
  const reviewDocId = `${task.id}_${reviewerId}`;
  const reviewDoc: QCReview = {
    id: reviewDocId,
    taskId: task.id,
    projectId: task.projectId,
    clientId: task.client || '',
    workflowId: task.workflowTemplateId || null,
    taskStatusSnapshot: task.status,
    reviewerId,
    reviewerRole,
    decision: 'APPROVED',
    note: null,
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
  const existingReview = allQCReviews.find(r => r.taskId === task.id && r.reviewerId === reviewerId);
  if (existingReview) reviewDoc.createdAt = existingReview.createdAt;
  batch.set(doc(db, 'task_qc_reviews', reviewDocId), reviewDoc);

  // 3. Activate next step or finalize
  const nextLevel = pendingStep.level + 1;
  const nextStep = taskSteps.find(s => s.level === nextLevel);

  const taskUpdate: Record<string, any> = { updatedAt: now };

  if (nextStep) {
    // Activate next step
    batch.update(doc(db, 'approval_steps', nextStep.id), { status: 'pending' });
    taskUpdate.currentApprovalLevel = nextLevel;
  } else {
    // All approval steps done — finalize task status
    if (task.revisionContext?.active) {
      taskUpdate.revisionContext = { ...task.revisionContext, active: false };
    }

    if (task.isClientApprovalRequired) {
      taskUpdate.status = 'client_review';
    } else {
      taskUpdate.status = 'approved';
    }

    // Update QC block to APPROVED
    if (task.qc) {
      taskUpdate.qc = { ...task.qc, status: 'APPROVED', lastUpdatedAt: now };
    }
  }

  batch.update(doc(db, 'tasks', task.id), taskUpdate);
  await batch.commit();

  // Notifications
  try {
    if (!nextStep) {
      // All approved - notify assignees
      const recipientIds = [...(task.assigneeIds || []), task.createdBy].filter(Boolean);
      await notifyUsers({
        type: 'QC_APPROVED',
        title: `Approved: ${task.title}`,
        message: `Task "${task.title}" has been fully approved`,
        recipientIds: [...new Set(recipientIds)].filter(id => id !== reviewerId),
        entityId: task.id,
        actionUrl: `/tasks/${task.id}`,
        sendPush: true,
        createdBy,
      });
    } else {
      // Notify next approver
      await notifyUsers({
        type: 'APPROVAL_REQUESTED',
        title: `Approval Needed: ${task.title}`,
        message: `Task "${task.title}" is awaiting your approval`,
        recipientIds: [nextStep.approverId].filter(id => id !== reviewerId),
        entityId: task.id,
        actionUrl: `/quality-control`,
        sendPush: true,
        createdBy,
      });
    }
  } catch (err) {
    console.error('QC approve notification error:', err);
  }

  return { success: true, message: nextStep ? 'Step approved, next reviewer notified.' : 'All steps approved!' };
}

/**
 * Reject a task from the QC Hub.
 * This links the QC review with the approval step system:
 * 1. Marks the user's pending approval_step as revision_requested
 * 2. Creates a revision context on the task
 * 3. Writes a QC review record with REJECTED decision
 * 4. Moves task to revisions_required
 */
export async function rejectFromQCHub(params: {
  task: Task;
  reviewerId: string;
  reviewerRole: string;
  note: string;
  attachments: QCReviewAttachment[];
  approvalSteps: ApprovalStep[];
  allQCReviews: QCReview[];
  users: User[];
  createdBy: string;
}): Promise<{ success: boolean; message: string }> {
  const { task, reviewerId, reviewerRole, note, attachments, approvalSteps, allQCReviews, users, createdBy } = params;

  const taskSteps = approvalSteps.filter(s => s.taskId === task.id).sort((a, b) => a.level - b.level);
  const pendingStep = taskSteps.find(s => s.approverId === reviewerId && s.status === 'pending');

  if (!pendingStep) {
    return { success: false, message: 'No pending approval step found for this user.' };
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Mark current step as revision_requested
  batch.update(doc(db, 'approval_steps', pendingStep.id), {
    status: 'revision_requested',
    reviewedAt: now,
    comment: note,
  });

  // 2. Write QC review record
  const reviewDocId = `${task.id}_${reviewerId}`;
  const reviewDoc: QCReview = {
    id: reviewDocId,
    taskId: task.id,
    projectId: task.projectId,
    clientId: task.client || '',
    workflowId: task.workflowTemplateId || null,
    taskStatusSnapshot: task.status,
    reviewerId,
    reviewerRole,
    decision: 'REJECTED',
    note,
    attachments: attachments || [],
    createdAt: now,
    updatedAt: now,
  };
  const existingReview = allQCReviews.find(r => r.taskId === task.id && r.reviewerId === reviewerId);
  if (existingReview) reviewDoc.createdAt = existingReview.createdAt;
  batch.set(doc(db, 'task_qc_reviews', reviewDocId), reviewDoc);

  // 3. Create revision context and update task
  const currentCycle = (task.revisionHistory?.length || 0) + 1;
  const revisionContext = {
    active: true,
    requestedByUserId: reviewerId,
    requestedByStepId: pendingStep.id,
    assignedToUserId: task.assigneeIds?.[0] || task.createdBy,
    requestedAt: now,
    message: note || 'Revisions requested',
    cycle: currentCycle,
  };

  const newHistory = [
    ...(task.revisionHistory || []),
    {
      cycle: currentCycle,
      stepLevel: pendingStep.level,
      requestedBy: reviewerId,
      assignedTo: task.assigneeIds?.[0] || task.createdBy,
      comment: note,
      date: now,
    },
  ];

  const taskUpdate: Record<string, any> = {
    status: 'revisions_required',
    revisionContext,
    revisionHistory: newHistory,
    assigneeIds: [task.assigneeIds?.[0] || task.createdBy],
    updatedAt: now,
  };

  // Update QC block to REJECTED
  if (task.qc) {
    taskUpdate.qc = { ...task.qc, status: 'REJECTED', lastUpdatedAt: now };
  }

  batch.update(doc(db, 'tasks', task.id), taskUpdate);
  await batch.commit();

  // Notifications
  try {
    const recipientIds = [...(task.assigneeIds || []), task.createdBy].filter(Boolean);
    await notifyUsers({
      type: 'QC_REJECTED',
      title: `Revisions Requested: ${task.title}`,
      message: note || `Task "${task.title}" needs revisions`,
      recipientIds: [...new Set(recipientIds)].filter(id => id !== reviewerId),
      entityId: task.id,
      actionUrl: `/tasks/${task.id}`,
      sendPush: true,
      createdBy,
    });
  } catch (err) {
    console.error('QC reject notification error:', err);
  }

  return { success: true, message: 'Revisions requested.' };
}

/**
 * Sync an approval action from TaskDetailView to the QC review system.
 * Called when someone approves/rejects from the task card to keep QC records in sync.
 */
export async function syncApprovalToQCReview(params: {
  task: Task;
  reviewerId: string;
  reviewerRole: string;
  decision: 'APPROVED' | 'REJECTED';
  note: string | null;
}): Promise<void> {
  const { task, reviewerId, reviewerRole, decision, note } = params;
  
  if (!task.qc?.enabled) return; // No QC to sync with

  const now = new Date().toISOString();
  const reviewDocId = `${task.id}_${reviewerId}`;

  const reviewDoc: QCReview = {
    id: reviewDocId,
    taskId: task.id,
    projectId: task.projectId,
    clientId: task.client || '',
    workflowId: task.workflowTemplateId || null,
    taskStatusSnapshot: task.status,
    reviewerId,
    reviewerRole,
    decision,
    note,
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'task_qc_reviews', reviewDocId), reviewDoc);
}

/**
 * Reset QC state for a task being resubmitted after revision.
 * Deletes all existing QC review docs and resets the qc block to PENDING.
 */
export async function resetQCForResubmission(
  taskId: string,
  existingReviews: QCReview[],
  qcBlock: TaskQCBlock
): Promise<void> {
  const batch = writeBatch(db);

  // Delete all existing QC reviews for this task
  const taskReviews = existingReviews.filter(r => r.taskId === taskId);
  for (const review of taskReviews) {
    batch.delete(doc(db, 'task_qc_reviews', review.id));
  }

  // Reset QC status on the task
  batch.update(doc(db, 'tasks', taskId), {
    'qc.status': 'PENDING',
    'qc.lastUpdatedAt': new Date().toISOString(),
  });

  await batch.commit();
}
