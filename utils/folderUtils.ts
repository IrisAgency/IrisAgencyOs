import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileFolder } from '../types';

export type FolderType = 
  | 'client_root'
  | 'project'
  | 'task'
  | 'meeting'
  | 'strategy'
  | 'archive'
  | 'videos'
  | 'photos'
  | 'documents'
  | 'deliverables';

export interface EnhancedFileFolder extends FileFolder {
  folderType?: FolderType;
  linkedEntityType?: 'client' | 'project' | 'task' | 'meeting';
  linkedEntityId?: string;
  clientId?: string | null;
}

/**
 * Creates the standard folder structure for a new client
 * 
 * Structure:
 * Client Root
 * ├── Projects
 * ├── Strategies
 * ├── Videos
 * ├── Photos
 * ├── Documents
 * ├── Deliverables
 * ├── Meetings
 * └── Archive
 */
export const createClientFolderStructure = async (clientId: string, clientName: string) => {
  try {
    const folders: EnhancedFileFolder[] = [];
    
    // Root folder for client
    const rootId = `client_${clientId}`;
    folders.push({
      id: rootId,
      clientId: clientId,
      projectId: null,
      parentId: null,
      name: clientName,
      isArchiveRoot: false,
      isTaskArchiveFolder: false,
      folderType: 'client_root',
      linkedEntityType: 'client',
      linkedEntityId: clientId
    });

    // Standard subfolders
    const subfolders = [
      { name: 'Projects', type: 'project' as FolderType },
      { name: 'Strategies', type: 'strategy' as FolderType },
      { name: 'Videos', type: 'videos' as FolderType },
      { name: 'Photos', type: 'photos' as FolderType },
      { name: 'Documents', type: 'documents' as FolderType },
      { name: 'Deliverables', type: 'deliverables' as FolderType },
      { name: 'Meetings', type: 'meeting' as FolderType },
      { name: 'Archive', type: 'archive' as FolderType }
    ];

    subfolders.forEach((sf, idx) => {
      folders.push({
        id: `${rootId}_${sf.name.toLowerCase()}`,
        clientId: clientId,
        projectId: null,
        parentId: rootId,
        name: sf.name,
        isArchiveRoot: sf.type === 'archive',
        isTaskArchiveFolder: false,
        folderType: sf.type,
        linkedEntityType: 'client',
        linkedEntityId: clientId
      });
    });

    // Save all folders to Firestore
    const promises = folders.map(folder => 
      setDoc(doc(db, 'folders', folder.id), folder)
    );
    await Promise.all(promises);

    return folders;
  } catch (error) {
    console.error('Error creating client folder structure:', error);
    throw error;
  }
};

/**
 * Creates a project-specific folder within a client's Projects folder
 */
export const createProjectFolder = async (
  projectId: string,
  projectName: string,
  clientId: string,
  projectCode?: string
) => {
  try {
    // Find client's Projects folder
    const clientProjectsFolderId = `client_${clientId}_projects`;
    
    // Create project folder
    const projectFolderId = `proj_${projectId}`;
    const displayName = projectCode ? `${projectCode} - ${projectName}` : projectName;
    
    const projectFolder: EnhancedFileFolder = {
      id: projectFolderId,
      clientId: clientId,
      projectId: projectId,
      parentId: clientProjectsFolderId,
      name: displayName,
      isArchiveRoot: false,
      isTaskArchiveFolder: false,
      folderType: 'project',
      linkedEntityType: 'project',
      linkedEntityId: projectId
    };

    await setDoc(doc(db, 'folders', projectFolderId), projectFolder);

    // Create subfolders for project
    const projectSubfolders = [
      'Tasks',
      'Videos',
      'Photos',
      'Documents',
      'Deliverables'
    ];

    const subfoldersPromises = projectSubfolders.map((name) => {
      const folderId = `${projectFolderId}_${name.toLowerCase()}`;
      const folder: EnhancedFileFolder = {
        id: folderId,
        clientId: clientId,
        projectId: projectId,
        parentId: projectFolderId,
        name: name,
        isArchiveRoot: false,
        isTaskArchiveFolder: false,
        linkedEntityType: 'project',
        linkedEntityId: projectId
      };
      return setDoc(doc(db, 'folders', folderId), folder);
    });

    await Promise.all(subfoldersPromises);

    return projectFolder;
  } catch (error) {
    console.error('Error creating project folder:', error);
    throw error;
  }
};

/**
 * Creates a task-specific folder within a project's Tasks folder
 */
export const createTaskFolder = async (
  taskId: string,
  taskTitle: string,
  projectId: string,
  clientId: string
) => {
  try {
    // Find project's Tasks folder
    const projectTasksFolderId = `proj_${projectId}_tasks`;
    
    // Sanitize task title for folder name
    const sanitizedTitle = taskTitle.replace(/[^a-zA-Z0-9-_\s]/g, '').slice(0, 50);
    const folderName = `${sanitizedTitle}`;
    
    const taskFolder: EnhancedFileFolder = {
      id: `task_${taskId}`,
      clientId: clientId,
      projectId: projectId,
      parentId: projectTasksFolderId,
      name: folderName,
      isArchiveRoot: false,
      isTaskArchiveFolder: true,
      taskId: taskId,
      folderType: 'task',
      linkedEntityType: 'task',
      linkedEntityId: taskId
    };

    await setDoc(doc(db, 'folders', taskFolder.id), taskFolder);
    
    return taskFolder;
  } catch (error) {
    console.error('Error creating task folder:', error);
    throw error;
  }
};

/**
 * Determines the appropriate file type category based on MIME type or file extension
 */
export const categorizeFileType = (fileName: string, mimeType: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Video types
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'].includes(ext)) {
    return 'video';
  }
  
  // Image types
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) {
    return 'image';
  }
  
  // Document types
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return 'document';
  }
  
  // Design files
  if (['psd', 'ai', 'sketch', 'figma', 'xd', 'indd'].includes(ext)) {
    return 'design';
  }
  
  // Strategy/Presentation
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) {
    return 'presentation';
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'numbers', 'ods'].includes(ext)) {
    return 'spreadsheet';
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'archive';
  }
  
  return 'other';
};

/**
 * Generates a standardized file name for uploads
 * Format: [ClientCode]-[TaskName]-[Version]-[OriginalName]
 */
export const generateFileName = (
  originalName: string,
  clientCode: string,
  taskTitle?: string,
  version: number = 1
): string => {
  const sanitizedTask = taskTitle 
    ? taskTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
    : 'General';
  
  const timestamp = Date.now();
  const ext = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, "").slice(0, 30);
  
  return `${clientCode}-${sanitizedTask}-v${version}-${timestamp}.${ext}`;
};

/**
 * Gets the appropriate folder for a file based on its type and context
 */
export const getDestinationFolder = async (
  fileType: string,
  taskId?: string,
  projectId?: string,
  clientId?: string
): Promise<string | null> => {
  try {
    // Priority 1: If task is specified, use task folder
    if (taskId) {
      const taskFolderId = `task_${taskId}`;
      const taskFolderRef = doc(db, 'folders', taskFolderId);
      const taskFolderSnap = await getDocs(query(collection(db, 'folders'), where('id', '==', taskFolderId)));
      if (!taskFolderSnap.empty) {
        return taskFolderId;
      }
    }

    // Priority 2: If project is specified, use project's type-specific folder
    if (projectId) {
      const typeMap: { [key: string]: string } = {
        'video': 'videos',
        'image': 'photos',
        'document': 'documents',
        'design': 'documents',
        'presentation': 'documents'
      };
      const folderName = typeMap[fileType] || 'documents';
      const projectTypeFolderId = `proj_${projectId}_${folderName}`;
      return projectTypeFolderId;
    }

    // Priority 3: Use client's type-specific folder
    if (clientId) {
      const typeMap: { [key: string]: string } = {
        'video': 'videos',
        'image': 'photos',
        'document': 'documents',
        'design': 'documents',
        'presentation': 'strategies'
      };
      const folderName = typeMap[fileType] || 'documents';
      const clientTypeFolderId = `client_${clientId}_${folderName}`;
      return clientTypeFolderId;
    }

    return null;
  } catch (error) {
    console.error('Error determining destination folder:', error);
    return null;
  }
};

/**
 * Ensures a folder exists, creating it if necessary
 */
export const ensureFolderExists = async (folderId: string): Promise<boolean> => {
  try {
    const folderRef = doc(db, 'folders', folderId);
    const folderSnap = await getDocs(query(collection(db, 'folders'), where('id', '==', folderId)));
    return !folderSnap.empty;
  } catch (error) {
    console.error('Error checking folder existence:', error);
    return false;
  }
};
