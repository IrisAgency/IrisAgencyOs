/**
 * File Store — manages files and folders with Firebase Storage uploads.
 * Collections: files, folders
 */
import { create } from 'zustand';
import { doc, setDoc, deleteDoc, writeBatch, query, where, getDocs, collection, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import {
  categorizeFileType,
  generateFileName,
  getDestinationFolder,
} from '../utils/folderUtils';
import type {
  AgencyFile, FileFolder, Project, Client, Task, ProjectActivityLog,
} from '../types';

interface FileState {
  files: AgencyFile[];
  folders: FileFolder[];

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  // File CRUD
  uploadFile: (file: AgencyFile, deps: {
    projects: Project[]; clients: Client[]; activeTasks: Task[];
    folders: FileFolder[];
  }) => Promise<AgencyFile>;
  deleteFile: (fileId: string, deps: { userId: string }) => Promise<void>;

  // Folder CRUD
  createFolder: (folder: FileFolder) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  folders: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<AgencyFile>('files', (items) => set({ files: items })));
    unsubs.push(subscribeCollection<FileFolder>('folders', (items) => set({ folders: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  uploadFile: async (file, deps) => {
    const { projects, clients, activeTasks, folders } = deps;
    let fileUrl = file.url;
    const rawFile = (file as any).file;

    if (rawFile) {
      let storagePath: string;
      if (file.category === 'document' && file.folderId?.startsWith('client_reports_')) {
        const clientId = file.folderId.replace('client_reports_', '');
        storagePath = `clients/${clientId}/reports/${file.id}_${rawFile.name}`;
      } else {
        const project = projects.find(p => p.id === file.projectId);
        const client = project ? clients.find(c => c.id === project.clientId) : null;
        const clientId = client?.id || 'unknown-client';
        const projectId = file.projectId || 'unknown-project';
        storagePath = `clients/${clientId}/projects/${projectId}/assets/${file.id}_${rawFile.name}`;
      }
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, rawFile);
      fileUrl = await getDownloadURL(snapshot.ref);
    } else if (!fileUrl) {
      fileUrl = 'https://picsum.photos/800/600';
    }

    const category = file.category || categorizeFileType(file.name, file.type);
    const project = projects.find(p => p.id === file.projectId);
    const task = file.taskId ? activeTasks.find(t => t.id === file.taskId) : null;
    const client = project ? clients.find(c => c.id === project.clientId) : null;

    let finalFileName = file.name;
    if (client && task) {
      const clientCode = client.name.substring(0, 3).toUpperCase();
      finalFileName = generateFileName(file.name, clientCode, task.title, file.version);
    }

    let destinationFolder = file.folderId;
    if (!destinationFolder && client) {
      destinationFolder = await getDestinationFolder(category, file.taskId || undefined, file.projectId, client.id);
    }

    const fileToSave = {
      ...file,
      url: fileUrl,
      category,
      originalName: file.name,
      name: finalFileName,
      folderId: destinationFolder,
      clientId: client?.id || null,
    };
    delete (fileToSave as any).file;

    await setDoc(doc(db, 'files', file.id), fileToSave);
    return fileToSave as AgencyFile;
  },

  deleteFile: async (fileId, deps) => {
    const file = get().files.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');
    await deleteDoc(doc(db, 'files', fileId));

    if (file.projectId && deps.userId) {
      const log: ProjectActivityLog = {
        id: `log${Date.now()}`, projectId: file.projectId, userId: deps.userId,
        type: 'file_upload', message: `Deleted file: ${file.name}`, createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);
    }
  },

  createFolder: async (folder) => {
    await setDoc(doc(db, 'folders', folder.id), folder);
  },

  deleteFolder: async (folderId) => {
    const { files, folders } = get();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) throw new Error('Folder not found');

    const batch = writeBatch(db);

    // Delete files in this folder
    const filesQuery = query(collection(db, 'files'), where('folderId', '==', folderId));
    const filesSnapshot = await getDocs(filesQuery);
    filesSnapshot.docs.forEach(d => batch.delete(d.ref));

    // Recursive subfolder deletion
    const deleteSubfolders = async (parentId: string) => {
      const subfoldersQ = query(collection(db, 'folders'), where('parentId', '==', parentId));
      const subfoldersSnap = await getDocs(subfoldersQ);
      for (const sfDoc of subfoldersSnap.docs) {
        await deleteSubfolders(sfDoc.id);
        const subFilesQ = query(collection(db, 'files'), where('folderId', '==', sfDoc.id));
        const subFilesSnap = await getDocs(subFilesQ);
        subFilesSnap.docs.forEach(fd => batch.delete(fd.ref));
        batch.delete(sfDoc.ref);
      }
    };
    await deleteSubfolders(folderId);
    batch.delete(doc(db, 'folders', folderId));
    await batch.commit();
  },
}));
