import { 
  collection, 
  doc, 
  writeBatch, 
  addDoc, 
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ProductionPlan,
  Task,
  CalendarItem,
  ProductionAssignment,
  Department,
  TaskStatus,
  Priority
} from '../types';

/**
 * Generate production tasks from a production plan
 * Creates separate tasks for calendar items and manual tasks
 */
export const generateProductionTasks = async (
  plan: ProductionPlan,
  calendarItems: CalendarItem[],
  manualTasks: Task[],
  currentUserId: string
): Promise<string[]> => {
  const batch = writeBatch(db);
  const generatedTaskIds: string[] = [];

  try {
    // Generate tasks from calendar items
    for (const calendarItem of calendarItems) {
      const taskRef = doc(collection(db, 'tasks'));
      const taskId = taskRef.id;

      const productionTask: Partial<Task> = {
        id: taskId,
        projectId: '', // Will need to be filled with actual project
        title: `🎬 ${calendarItem.autoName}`,
        description: calendarItem.primaryBrief || null,
        voiceOver: null,
        department: Department.PRODUCTION,
        priority: Priority.MEDIUM,
        taskType: calendarItem.type.toLowerCase() as any,
        status: TaskStatus.NEW,
        startDate: plan.productionDate,
        dueDate: plan.productionDate,
        assigneeIds: plan.teamMemberIds,
        createdBy: currentUserId,
        approvalPath: [],
        currentApprovalLevel: 0,
        isClientApprovalRequired: false,
        
        // Calendar linkage
        calendarItemId: calendarItem.id,
        publishAt: calendarItem.publishAt,
        originalPublishAt: calendarItem.publishAt,
        
        // Production-specific fields
        isProductionCopy: true,
        productionPlanId: plan.id,
        sourceType: 'CALENDAR',
        sourceCalendarItemId: calendarItem.id,
        sourceTaskId: null,
        
        // Copy references (no file duplication)
        referenceLinks: [],
        referenceImages: [],
        
        attachments: [],
        isArchived: false,
        isDeleted: false,
        client: plan.clientName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      batch.set(taskRef, productionTask);
      generatedTaskIds.push(taskId);

      // Update calendar item with task reference
      if (calendarItem.taskId !== taskId) {
        const calendarItemRef = doc(db, 'calendar_items', calendarItem.id);
        batch.update(calendarItemRef, { taskId });
      }
    }

    // Generate tasks from manual tasks
    for (const originalTask of manualTasks) {
      const taskRef = doc(collection(db, 'tasks'));
      const taskId = taskRef.id;

      const productionTask: Partial<Task> = {
        ...originalTask,
        id: taskId,
        title: `🎬 PROD: ${originalTask.title}`,
        startDate: plan.productionDate,
        dueDate: plan.productionDate,
        assigneeIds: plan.teamMemberIds,
        status: TaskStatus.NEW,
        
        // Production-specific fields
        isProductionCopy: true,
        productionPlanId: plan.id,
        sourceType: 'MANUAL',
        sourceCalendarItemId: null,
        sourceTaskId: originalTask.id,
        originalPublishAt: originalTask.publishAt || null,
        
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      batch.set(taskRef, productionTask);
      generatedTaskIds.push(taskId);
    }

    // Create production assignments (one per team member)
    for (const userId of plan.teamMemberIds) {
      const assignmentRef = doc(collection(db, 'production_assignments'));
      
      const assignment: Omit<ProductionAssignment, 'userName'> & { userName?: string } = {
        id: assignmentRef.id,
        productionPlanId: plan.id,
        userId,
        userName: '', // Will be filled by caller
        productionDate: plan.productionDate,
        planName: plan.name,
        clientName: plan.clientName,
        itemCount: calendarItems.length + manualTasks.length,
        status: plan.status,
        createdAt: new Date().toISOString()
      };

      batch.set(assignmentRef, assignment);
    }

    // Update production plan with generated task IDs
    const planRef = doc(db, 'production_plans', plan.id);
    batch.update(planRef, {
      generatedTaskIds,
      updatedAt: new Date().toISOString()
    });

    // Commit the batch
    await batch.commit();

    console.log(`✅ Generated ${generatedTaskIds.length} production tasks for plan: ${plan.name}`);
    return generatedTaskIds;

  } catch (error) {
    console.error('Error generating production tasks:', error);
    throw new Error('Failed to generate production tasks');
  }
};

/**
 * Update existing production tasks (for edit mode)
 */
export const updateProductionTasks = async (
  plan: ProductionPlan,
  taskIds: string[],
  updateMode: 'SAFE' | 'FORCE',
  forceUpdateReason?: string
): Promise<void> => {
  const batch = writeBatch(db);

  try {
    for (const taskId of taskIds) {
      const taskRef = doc(db, 'tasks', taskId);
      
      // Query to check task status
      const taskDoc = await getDocs(query(collection(db, 'tasks'), where('__name__', '==', taskId)));
      
      if (!taskDoc.empty) {
        const task = taskDoc.docs[0].data() as Task;
        
        // In SAFE mode, only update PENDING tasks
        if (updateMode === 'SAFE' && task.status !== TaskStatus.NEW) {
          console.log(`⏭️  Skipping task ${taskId} (status: ${task.status})`);
          continue;
        }

        // Update task with new assignments and dates
        const updates: Partial<Task> = {
          assigneeIds: plan.teamMemberIds,
          dueDate: plan.productionDate,
          startDate: plan.productionDate,
          updatedAt: new Date().toISOString()
        };

        if (updateMode === 'FORCE' && forceUpdateReason) {
          (updates as any).forceUpdateReason = forceUpdateReason;
          (updates as any).forceUpdatedAt = new Date().toISOString();
        }

        batch.update(taskRef, updates);
      }
    }

    // Update production assignments
    const assignmentsQuery = query(
      collection(db, 'production_assignments'),
      where('productionPlanId', '==', plan.id)
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    // Delete old assignments
    assignmentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Create new assignments
    for (const userId of plan.teamMemberIds) {
      const assignmentRef = doc(collection(db, 'production_assignments'));
      
      const assignment: Partial<ProductionAssignment> = {
        id: assignmentRef.id,
        productionPlanId: plan.id,
        userId,
        productionDate: plan.productionDate,
        planName: plan.name,
        clientName: plan.clientName,
        itemCount: plan.calendarItemIds.length + plan.manualTaskIds.length,
        status: plan.status,
        createdAt: new Date().toISOString()
      };

      batch.set(assignmentRef, assignment);
    }

    await batch.commit();
    console.log(`✅ Updated production tasks for plan: ${plan.name}`);

  } catch (error) {
    console.error('Error updating production tasks:', error);
    throw new Error('Failed to update production tasks');
  }
};

/**
 * Archive production plan and all related tasks
 */
export const archiveProductionPlan = async (
  planId: string,
  userId: string,
  reason: 'user_deleted' | 'plan_superseded'
): Promise<void> => {
  const batch = writeBatch(db);

  try {
    const planRef = doc(db, 'production_plans', planId);
    const planDoc = await getDocs(query(collection(db, 'production_plans'), where('__name__', '==', planId)));
    
    if (planDoc.empty) {
      throw new Error('Production plan not found');
    }

    const plan = planDoc.docs[0].data() as ProductionPlan;
    const now = new Date();
    const restoreDate = new Date(now);
    restoreDate.setDate(restoreDate.getDate() + 30);

    // Archive the plan
    batch.update(planRef, {
      isArchived: true,
      archivedAt: now.toISOString(),
      archivedBy: userId,
      archiveReason: reason,
      canRestoreUntil: restoreDate.toISOString(),
      status: 'ARCHIVED',
      updatedAt: now.toISOString()
    });

    // Archive all generated tasks
    if (plan.generatedTaskIds && plan.generatedTaskIds.length > 0) {
      for (const taskId of plan.generatedTaskIds) {
        const taskRef = doc(db, 'tasks', taskId);
        batch.update(taskRef, {
          isArchived: true,
          archivedAt: now.toISOString(),
          archivedBy: userId,
          archiveReason: 'plan_deleted',
          updatedAt: now.toISOString()
        });
      }
    }

    // Update production assignments status
    const assignmentsQuery = query(
      collection(db, 'production_assignments'),
      where('productionPlanId', '==', planId)
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    assignmentsSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        status: 'ARCHIVED'
      });
    });

    await batch.commit();
    console.log(`✅ Archived production plan: ${plan.name}`);

  } catch (error) {
    console.error('Error archiving production plan:', error);
    throw new Error('Failed to archive production plan');
  }
};

/**
 * Restore archived production plan
 */
export const restoreProductionPlan = async (planId: string): Promise<void> => {
  const batch = writeBatch(db);

  try {
    const planRef = doc(db, 'production_plans', planId);
    const planDoc = await getDocs(query(collection(db, 'production_plans'), where('__name__', '==', planId)));
    
    if (planDoc.empty) {
      throw new Error('Production plan not found');
    }

    const plan = planDoc.docs[0].data() as ProductionPlan;

    // Check if restore window has expired
    if (plan.canRestoreUntil) {
      const restoreDeadline = new Date(plan.canRestoreUntil);
      if (new Date() > restoreDeadline) {
        throw new Error('Restore window has expired (30 days limit)');
      }
    }

    // Restore the plan
    batch.update(planRef, {
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      canRestoreUntil: null,
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    });

    // Restore all generated tasks
    if (plan.generatedTaskIds && plan.generatedTaskIds.length > 0) {
      for (const taskId of plan.generatedTaskIds) {
        const taskRef = doc(db, 'tasks', taskId);
        batch.update(taskRef, {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Update production assignments status
    const assignmentsQuery = query(
      collection(db, 'production_assignments'),
      where('productionPlanId', '==', planId)
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    assignmentsSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        status: 'DRAFT'
      });
    });

    await batch.commit();
    console.log(`✅ Restored production plan: ${plan.name}`);

  } catch (error) {
    console.error('Error restoring production plan:', error);
    throw new Error('Failed to restore production plan');
  }
};

/**
 * Calculate days until/since production date
 */
export const getProductionCountdown = (productionDate: string): { 
  days: number; 
  label: string; 
  color: string 
} => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const prodDate = new Date(productionDate);
  prodDate.setHours(0, 0, 0, 0);
  
  const diffTime = prodDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      days: Math.abs(diffDays),
      label: `${Math.abs(diffDays)} days ago`,
      color: 'text-slate-400'
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      label: 'Today',
      color: 'text-yellow-400'
    };
  } else if (diffDays === 1) {
    return {
      days: 1,
      label: 'Tomorrow',
      color: 'text-orange-400'
    };
  } else if (diffDays <= 3) {
    return {
      days: diffDays,
      label: `In ${diffDays} days`,
      color: 'text-red-400'
    };
  } else if (diffDays <= 7) {
    return {
      days: diffDays,
      label: `In ${diffDays} days`,
      color: 'text-orange-400'
    };
  } else {
    return {
      days: diffDays,
      label: `In ${diffDays} days`,
      color: 'text-green-400'
    };
  }
};
