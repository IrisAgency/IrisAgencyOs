import { 
  doc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, AgencyFile, FileFolder, ProjectActivityLog } from '../types';

/**
 * Archives a task and its associated files.
 * 
 * 1. Marks task as archived and completed.
 * 2. Ensures a project-level "Archive" folder exists.
 * 3. Creates a task-specific archive folder.
 * 4. Moves all task files to that folder and marks them archived.
 * 5. Logs the activity.
 */
export const archiveTask = async (task: Task, archivedByUserId: string) => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Update Task
    const taskRef = doc(db, 'tasks', task.id);
    batch.update(taskRef, {
      status: 'completed', // Ensure it's marked completed
      isArchived: true,
      archivedAt: now,
      updatedAt: now
    });

    // 2. Find or Create Archive Root Folder
    let archiveRootId: string;
    const foldersRef = collection(db, 'folders');
    const archiveRootQuery = query(
      foldersRef, 
      where('projectId', '==', task.projectId),
      where('isArchiveRoot', '==', true)
    );
    const archiveRootSnapshot = await getDocs(archiveRootQuery);

    if (!archiveRootSnapshot.empty) {
      archiveRootId = archiveRootSnapshot.docs[0].id;
    } else {
      archiveRootId = `f_archive_${task.projectId}_${Date.now()}`;
      const newArchiveRoot: FileFolder = {
        id: archiveRootId,
        projectId: task.projectId,
        parentId: null,
        name: 'Archive',
        isArchiveRoot: true,
        isTaskArchiveFolder: false,
        taskId: null
      };
      batch.set(doc(db, 'folders', archiveRootId), newArchiveRoot);
    }

    // 3. Create Task Archive Folder
    const taskArchiveFolderId = `f_task_archive_${task.id}`;
    const taskArchiveFolder: FileFolder = {
      id: taskArchiveFolderId,
      projectId: task.projectId,
      parentId: archiveRootId,
      name: `Task-${task.id}-${task.title}`, // e.g. Task-t123-Design Logo
      isArchiveRoot: false,
      isTaskArchiveFolder: true,
      taskId: task.id
    };
    batch.set(doc(db, 'folders', taskArchiveFolderId), taskArchiveFolder);

    // 4. Move & Archive Files
    // Find all files linked to this task
    const filesRef = collection(db, 'files');
    const taskFilesQuery = query(filesRef, where('taskId', '==', task.id));
    const taskFilesSnapshot = await getDocs(taskFilesQuery);

    taskFilesSnapshot.forEach((fileDoc) => {
      batch.update(fileDoc.ref, {
        folderId: taskArchiveFolderId,
        isArchived: true,
        archivedAt: now,
        archivedBy: archivedByUserId
      });
    });

    // 5. Log Activity
    const logId = `log_archive_${Date.now()}`;
    const log: ProjectActivityLog = {
      id: logId,
      projectId: task.projectId,
      userId: archivedByUserId,
      type: 'status_change',
      message: `Task "${task.title}" was archived.`,
      createdAt: now
    };
    batch.set(doc(db, 'project_activity_logs', logId), log);

    await batch.commit();
    return true;

  } catch (error) {
    console.error("Error archiving task:", error);
    throw error;
  }
};
