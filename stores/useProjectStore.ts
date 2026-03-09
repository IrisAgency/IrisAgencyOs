/**
 * Projects Store — manages project state and Firestore subscriptions.
 * Collections: projects, project_members, project_milestones,
 *              project_activity_logs, project_marketing_assets, milestones (smart creation)
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { prefixedId } from '../utils/id';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import { notifyUsers } from '../services/notificationService';
import { createProjectFolder } from '../utils/folderUtils';
import type {
  Project, ProjectMember, ProjectMilestone, ProjectActivityLog,
  ProjectMarketingAsset, Milestone, User, Client, FileFolder, AgencyFile,
} from '../types';

interface ProjectState {
  projects: Project[];
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  activityLogs: ProjectActivityLog[];
  marketingAssets: ProjectMarketingAsset[];
  dynamicMilestones: Milestone[];

  /** Alias for `members` — used by App.tsx and child components */
  readonly projectMembers: ProjectMember[];
  /** Alias for `milestones` — used by App.tsx and child components */
  readonly projectMilestones: ProjectMilestone[];

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  // Project CRUD
  addProject: (project: Project, user: User, clients: Client[]) => Promise<void>;
  updateProject: (project: Project, userId?: string) => Promise<void>;
  deleteProject: (projectId: string, showToast: (t: { title: string; message: string }) => void, addAuditLog: (a: string, e: string, id: string | null, d: string) => Promise<void>) => Promise<void>;

  // Members
  addMember: (member: ProjectMember, user?: User) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  // Milestones
  addMilestone: (milestone: ProjectMilestone, userId?: string) => Promise<void>;
  updateMilestone: (milestone: ProjectMilestone, userId?: string) => Promise<void>;

  // Smart Project Creation milestones
  addDynamicMilestone: (milestone: Milestone) => Promise<void>;
  updateDynamicMilestone: (milestone: Milestone) => Promise<void>;

  // Marketing Assets
  addMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>;
  updateMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>;
  deleteMarketingAsset: (assetId: string) => Promise<void>;

  // Archive
  archiveProject: (projectId: string, userId: string, projects: Project[], folders: FileFolder[], files: AgencyFile[], checkPermission: (perm: string) => boolean, showToast: (t: { title: string; message: string }) => void) => Promise<void>;
  unarchiveProject: (projectId: string, userId: string, projects: Project[], folders: FileFolder[], files: AgencyFile[], checkPermission: (perm: string) => boolean, showToast: (t: { title: string; message: string }) => void) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  members: [],
  milestones: [],
  activityLogs: [],
  marketingAssets: [],
  dynamicMilestones: [],
  _unsubscribers: [],

  // Computed aliases (kept in sync by the setters above — they're just getters)
  get projectMembers() { return get().members; },
  get projectMilestones() { return get().milestones; },

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<Project>('projects', (items) => set({ projects: items })));
    unsubs.push(subscribeCollection<ProjectMember>('project_members', (items) => set({ members: items })));
    unsubs.push(subscribeCollection<ProjectMilestone>('project_milestones', (items) => set({ milestones: items })));
    unsubs.push(subscribeCollection<ProjectActivityLog>('project_activity_logs', (items) => set({ activityLogs: items })));
    unsubs.push(subscribeCollection<ProjectMarketingAsset>('project_marketing_assets', (items) => set({ marketingAssets: items })));
    unsubs.push(subscribeCollection<Milestone>('milestones', (items) => set({ dynamicMilestones: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach((fn) => fn());
    set({ _unsubscribers: [] });
  },

  addProject: async (project, user, clients) => {
    await setDoc(doc(db, 'projects', project.id), project);
    try {
      await createProjectFolder(project.id, project.name, project.clientId, project.code);
    } catch (error) {
      console.error('Error creating project folders:', error);
    }

    if (user) {
      const log: ProjectActivityLog = {
        id: prefixedId('log'), projectId: project.id, userId: user.id,
        type: 'status_change', message: 'Project created', createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);

      const member: ProjectMember = {
        id: prefixedId('pm'), projectId: project.id, userId: user.id,
        roleInProject: 'Project Lead', isExternal: false,
      };
      await setDoc(doc(db, 'project_members', member.id), member);

      if (project.accountManagerId && project.accountManagerId !== user.id) {
        const mgr: ProjectMember = {
          id: prefixedId('pm'), projectId: project.id, userId: project.accountManagerId,
          roleInProject: 'Account Manager', isExternal: false,
        };
        await setDoc(doc(db, 'project_members', mgr.id), mgr);
      }

      const recipientIds: string[] = [];
      if (project.accountManagerId && project.accountManagerId !== user.id) recipientIds.push(project.accountManagerId);
      if (project.memberIds?.length) {
        project.memberIds.forEach((id: string) => {
          if (id !== user.id && !recipientIds.includes(id)) recipientIds.push(id);
        });
      }

      if (recipientIds.length > 0) {
        const client = clients.find((c: Client) => c.id === project.clientId);
        await notifyUsers({
          type: 'PROJECT_CREATED', title: 'New Project Created',
          message: `${user.name} created project "${project.name}"${client ? ` for ${client.name}` : ''}`,
          recipientIds, entityId: project.id, actionUrl: `/projects/${project.id}`,
          sendPush: true, createdBy: user.id,
        });
      }
    }
  },

  updateProject: async (project, userId) => {
    await updateDoc(doc(db, 'projects', project.id), project as any);
    if (userId) {
      const log: ProjectActivityLog = {
        id: prefixedId('log'), projectId: project.id, userId,
        type: 'status_change', message: `Status updated to ${project.status}`,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);
    }
  },

  deleteProject: async (projectId, showToast, addAuditLog) => {
    try {
      const project = get().projects.find(p => p.id === projectId);
      if (!project) { showToast({ title: 'Error', message: 'Project not found.' }); return; }

      if (!window.confirm(`Are you sure you want to delete "${project.name}"?\n\n⚠️ This will permanently delete all linked data.`)) return;

      const batch = writeBatch(db);
      batch.delete(doc(db, 'projects', projectId));

      const subcollections = ['tasks', 'folders', 'files', 'project_milestones', 'project_members', 'project_activity_logs', 'project_marketing_assets', 'freelancer_assignments'];
      const counts: Record<string, number> = {};

      for (const col of subcollections) {
        const q = query(collection(db, col), where('projectId', '==', projectId));
        const snap = await getDocs(q);
        counts[col] = snap.docs.length;
        snap.docs.forEach(d => batch.delete(d.ref));
      }

      await batch.commit();
      await addAuditLog('delete', 'Project', projectId, `Deleted project "${project.name}" (${counts.tasks || 0} tasks, ${counts.files || 0} files)`);
      showToast({ title: 'Success', message: `Project "${project.name}" deleted successfully.` });
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast({ title: 'Error', message: 'Failed to delete project.' });
    }
  },

  addMember: async (member, user) => {
    await setDoc(doc(db, 'project_members', member.id), member);
    if (user && member.userId !== user.id) {
      const project = get().projects.find(p => p.id === member.projectId);
      if (project) {
        await notifyUsers({
          type: 'PROJECT_MEMBER_ADDED', title: 'Added to Project',
          message: `${user.name} added you to project "${project.name}" as ${member.roleInProject}`,
          recipientIds: [member.userId], entityId: project.id,
          actionUrl: `/projects/${project.id}`, sendPush: true, createdBy: user.id,
        });
      }
    }
  },
  removeMember: async (memberId) => { await deleteDoc(doc(db, 'project_members', memberId)); },

  addMilestone: async (milestone, userId) => {
    await setDoc(doc(db, 'project_milestones', milestone.id), milestone);
    if (userId) {
      const members = get().members.filter(pm => pm.projectId === milestone.projectId);
      const recipientIds = members.map(pm => pm.userId).filter(id => id !== userId);
      if (recipientIds.length > 0) {
        const project = get().projects.find(p => p.id === milestone.projectId);
        if (project) {
          const user = { id: userId, name: userId }; // Will be resolved by caller
          await notifyUsers({
            type: 'MILESTONE_CREATED', title: 'New Milestone',
            message: `Milestone "${milestone.name}" created in ${project.name}`,
            recipientIds, entityId: milestone.id,
            actionUrl: `/projects/${milestone.projectId}`, sendPush: true, createdBy: userId,
          });
        }
      }
    }
  },
  updateMilestone: async (milestone, userId) => {
    await updateDoc(doc(db, 'project_milestones', milestone.id), milestone as any);
    if (userId && milestone.status === 'completed') {
      const log: ProjectActivityLog = {
        id: prefixedId('log'), projectId: milestone.projectId, userId,
        type: 'milestone_completed', message: `Milestone completed: ${milestone.name}`,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);
    }
  },

  addDynamicMilestone: async (milestone) => { await setDoc(doc(db, 'milestones', milestone.id), milestone); },
  updateDynamicMilestone: async (milestone) => { await updateDoc(doc(db, 'milestones', milestone.id), milestone as any); },

  addMarketingAsset: async (asset) => { await setDoc(doc(db, 'project_marketing_assets', asset.id), asset); },
  updateMarketingAsset: async (asset) => { await updateDoc(doc(db, 'project_marketing_assets', asset.id), asset as any); },
  deleteMarketingAsset: async (assetId) => { await deleteDoc(doc(db, 'project_marketing_assets', assetId)); },

  archiveProject: async (projectId, userId, projects, folders, files, checkPermission, showToast) => {
    if (!checkPermission('projects.archive')) {
      showToast({ title: 'Access Denied', message: 'You do not have permission to archive projects.' });
      return;
    }
    const project = projects.find(p => p.id === projectId);
    if (!project || project.isArchived) return;
    if (!confirm(`Are you sure you want to archive project "${project.name}"?`)) return;

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        isArchived: true, archivedAt: new Date().toISOString(), archivedBy: userId, status: 'Completed',
      } as any);

      let archiveRoot = folders.find(f => f.clientId === project.clientId && f.isArchiveRoot);
      if (!archiveRoot) {
        const newRootId = `f_archive_${project.clientId}`;
        archiveRoot = {
          id: newRootId, clientId: project.clientId, projectId: null, parentId: null,
          name: 'Archive', isArchiveRoot: true, isTaskArchiveFolder: false, isProjectArchiveFolder: false,
        } as FileFolder;
        await setDoc(doc(db, 'folders', newRootId), archiveRoot);
      }

      const archFolderId = `f_proj_arch_${projectId}`;
      await setDoc(doc(db, 'folders', archFolderId), {
        id: archFolderId, clientId: project.clientId, projectId, parentId: archiveRoot.id,
        name: `[Archived] ${project.name}`, isArchiveRoot: false, isTaskArchiveFolder: false, isProjectArchiveFolder: true,
      });

      const projectFiles = files.filter(f => f.projectId === projectId);
      if (projectFiles.length) {
        const batch = writeBatch(db);
        projectFiles.forEach(file => {
          batch.update(doc(db, 'files', file.id), {
            folderId: archFolderId, isArchived: true, archivedAt: new Date().toISOString(), archivedBy: userId,
          });
        });
        await batch.commit();
      }

      showToast({ title: 'Project Archived', message: `${project.name} has been archived.` });
    } catch (error) {
      console.error('Error archiving project:', error);
      showToast({ title: 'Error', message: 'Failed to archive project.' });
    }
  },

  unarchiveProject: async (projectId, userId, projects, folders, files, checkPermission, showToast) => {
    if (!checkPermission('projects.archive')) {
      showToast({ title: 'Access Denied', message: 'You do not have permission to unarchive projects.' });
      return;
    }
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.isArchived) return;
    if (!confirm(`Are you sure you want to unarchive project "${project.name}"?`)) return;

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        isArchived: false, archivedAt: null, archivedBy: null, status: 'active',
      } as any);

      const archFolder = folders.find(f => f.projectId === projectId && f.isProjectArchiveFolder);
      if (archFolder) {
        await updateDoc(doc(db, 'folders', archFolder.id), { name: archFolder.name.replace('[Archived] ', '') });
      }

      const projectFiles = files.filter(f => f.projectId === projectId && f.isArchived);
      if (projectFiles.length) {
        const batch = writeBatch(db);
        projectFiles.forEach(file => {
          batch.update(doc(db, 'files', file.id), { isArchived: false, archivedAt: null, archivedBy: null });
        });
        await batch.commit();
      }

      showToast({ title: 'Project Unarchived', message: `${project.name} has been restored.` });
    } catch (error) {
      console.error('Error unarchiving project:', error);
      showToast({ title: 'Error', message: 'Failed to unarchive project.' });
    }
  },
}));
