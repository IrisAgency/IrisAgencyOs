import { Task, User, ApprovalStep, TaskStatus } from '../types';

/**
 * Determines if a task needs approval from the current user.
 * 
 * A task "needs my approval" when:
 * 1. Task is NOT completed/archived
 * 2. Task has approval steps
 * 3. There exists a CURRENT approval step that:
 *    - Is in "pending" state (not approved/rejected/revision_requested)
 *    - Is assigned to currentUser (by userId)
 *    - Is the FIRST pending step in the chain (blocks progress)
 * 
 * EXAMPLES:
 * 
 * Example 1: User u1 is first approver, step is pending
 *   Task: { id: 't1', status: 'awaiting_review', approvalPath: ['u1', 'u2'] }
 *   ApprovalSteps: [
 *     { taskId: 't1', approverId: 'u1', level: 0, status: 'pending' },
 *     { taskId: 't1', approverId: 'u2', level: 1, status: 'waiting' }
 *   ]
 *   taskNeedsMyApproval(task, {id: 'u1'}) => TRUE
 *   taskNeedsMyApproval(task, {id: 'u2'}) => FALSE (u1 is blocking)
 * 
 * Example 2: First step approved, second step pending
 *   Task: { id: 't2', status: 'awaiting_review', approvalPath: ['u1', 'u2'] }
 *   ApprovalSteps: [
 *     { taskId: 't2', approverId: 'u1', level: 0, status: 'approved' },
 *     { taskId: 't2', approverId: 'u2', level: 1, status: 'pending' }
 *   ]
 *   taskNeedsMyApproval(task, {id: 'u1'}) => FALSE (already approved)
 *   taskNeedsMyApproval(task, {id: 'u2'}) => TRUE
 * 
 * Example 3: Revision requested, assignee resubmitted
 *   Task: { id: 't3', status: 'awaiting_review', approvalPath: ['u1'], revisionContext: { active: false } }
 *   ApprovalSteps: [
 *     { taskId: 't3', approverId: 'u1', level: 0, status: 'pending' }
 *   ]
 *   taskNeedsMyApproval(task, {id: 'u1'}) => TRUE (revision resubmitted, needs re-approval)
 * 
 * @param task The task to check
 * @param currentUser The logged-in user
 * @param approvalSteps All approval steps (will be filtered by taskId)
 * @returns true if task needs current user's approval
 */
export function taskNeedsMyApproval(
  task: Task,
  currentUser: User,
  approvalSteps: ApprovalStep[]
): boolean {
  // Rule 1: Task must not be completed or archived
  if (task.status === TaskStatus.COMPLETED || task.isArchived) {
    return false;
  }

  // Get approval steps for this task, sorted by level
  const taskApprovalSteps = approvalSteps
    .filter(step => step.taskId === task.id)
    .sort((a, b) => a.level - b.level);

  // Rule 2: Task must have approval steps
  if (taskApprovalSteps.length === 0) {
    return false;
  }

  // Find the first pending step (the one blocking progress)
  const firstPendingStep = taskApprovalSteps.find(
    step => step.status === 'pending' || step.status === 'waiting'
  );

  // No pending steps means nothing to approve
  if (!firstPendingStep) {
    return false;
  }

  // Rule 3: The first pending step must be assigned to current user
  // Only check if status is 'pending' (not 'waiting' which means it's not their turn yet)
  if (firstPendingStep.status === 'pending' && firstPendingStep.approverId === currentUser.id) {
    return true;
  }

  return false;
}

/**
 * Gets the current approval step information for display purposes
 * @param task The task
 * @param approvalSteps All approval steps
 * @returns Object with step info or null
 */
export function getCurrentApprovalStepInfo(
  task: Task,
  approvalSteps: ApprovalStep[]
): { stepName: string; approverName: string; level: number } | null {
  const taskApprovalSteps = approvalSteps
    .filter(step => step.taskId === task.id)
    .sort((a, b) => a.level - b.level);

  const firstPendingStep = taskApprovalSteps.find(
    step => step.status === 'pending'
  );

  if (!firstPendingStep) {
    return null;
  }

  return {
    stepName: `Step ${firstPendingStep.level + 1}`,
    approverName: firstPendingStep.approverId,
    level: firstPendingStep.level
  };
}

/**
 * Counts tasks that need the current user's approval
 * @param tasks All tasks
 * @param currentUser The logged-in user
 * @param approvalSteps All approval steps
 * @returns Count of tasks needing approval
 */
export function countTasksNeedingMyApproval(
  tasks: Task[],
  currentUser: User,
  approvalSteps: ApprovalStep[]
): number {
  return tasks.filter(task => 
    taskNeedsMyApproval(task, currentUser, approvalSteps)
  ).length;
}
