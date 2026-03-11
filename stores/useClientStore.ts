/**
 * Clients Store — manages all client-related state and Firestore subscriptions.
 * Collections: clients, client_social_links, client_notes, client_meetings,
 *              client_brand_assets, client_monthly_reports
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { Client, ClientSocialLink, ClientNote, ClientMeeting, ClientBrandAsset, ClientMonthlyReport, FileFolder, AuditLog } from '../types';
import { createClientFolderStructure } from '../utils/folderUtils';

interface ClientState {
  clients: Client[];
  socialLinks: ClientSocialLink[];
  notes: ClientNote[];
  meetings: ClientMeeting[];
  brandAssets: ClientBrandAsset[];
  monthlyReports: ClientMonthlyReport[];

  // Subscription management (ref-counted)
  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  // Client CRUD
  addClient: (client: Client, notify: (type: string, title: string, msg: string) => void) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string, folders: FileFolder[], userId: string, addAuditLog: (action: string, entityType: string, entityId: string | null, description: string) => Promise<void>, showToast: (toast: { title: string; message: string }) => void) => Promise<void>;

  // Social Links
  addSocialLink: (link: ClientSocialLink) => Promise<void>;
  updateSocialLink: (link: ClientSocialLink) => Promise<void>;
  deleteSocialLink: (linkId: string) => Promise<void>;

  // Notes
  addNote: (note: ClientNote) => Promise<void>;
  updateNote: (note: ClientNote) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

  // Meetings
  addMeeting: (meeting: ClientMeeting, folders: FileFolder[]) => Promise<void>;
  updateMeeting: (meeting: ClientMeeting) => Promise<void>;
  deleteMeeting: (meetingId: string) => Promise<void>;

  // Brand Assets
  addBrandAsset: (asset: ClientBrandAsset) => Promise<void>;
  updateBrandAsset: (asset: ClientBrandAsset) => Promise<void>;
  deleteBrandAsset: (assetId: string) => Promise<void>;

  // Monthly Reports
  addMonthlyReport: (report: ClientMonthlyReport) => Promise<void>;
  updateMonthlyReport: (report: ClientMonthlyReport) => Promise<void>;
  deleteMonthlyReport: (reportId: string) => Promise<void>;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  socialLinks: [],
  notes: [],
  meetings: [],
  brandAssets: [],
  monthlyReports: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return; // already subscribed
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    let pending = 6;
    const markLoaded = () => { pending--; if (pending <= 0) set({ loading: false }); };
    unsubs.push(subscribeCollection<Client>('clients', (items) => { set({ clients: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ClientSocialLink>('client_social_links', (items) => { set({ socialLinks: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ClientNote>('client_notes', (items) => { set({ notes: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ClientMeeting>('client_meetings', (items) => { set({ meetings: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ClientBrandAsset>('client_brand_assets', (items) => { set({ brandAssets: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ClientMonthlyReport>('client_monthly_reports', (items) => { set({ monthlyReports: items }); markLoaded(); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return; // other components still need this store
    get()._unsubscribers.forEach((fn) => fn());
    set({ _unsubscribers: [] });
  },

  // Client CRUD
  addClient: async (client, notify) => {
    await setDoc(doc(db, 'clients', client.id), client);
    try {
      await createClientFolderStructure(client.id, client.name);
      notify('system', 'Client Added', `Client "${client.name}" created with folder structure.`);
    } catch {
      notify('system', 'Client Added', `Client created but folder setup failed.`);
    }
  },

  updateClient: async (client) => {
    await updateDoc(doc(db, 'clients', client.id), client as any);
  },

  deleteClient: async (clientId, _folders, _userId, addAuditLog, showToast) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'clients', clientId));

      // Delete related data
      const collections = [
        { name: 'projects', field: 'clientId' },
        { name: 'invoices', field: 'clientId' },
        { name: 'quotations', field: 'clientId' },
        { name: 'client_approvals', field: 'clientId' },
        { name: 'payments', field: 'clientId' },
        { name: 'client_social_links', field: 'clientId' },
        { name: 'client_notes', field: 'clientId' },
        { name: 'client_meetings', field: 'clientId' },
      ];

      // Get project IDs first for cascading task deletion
      const projectsQuery = query(collection(db, 'projects'), where('clientId', '==', clientId));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectIds = projectsSnapshot.docs.map(d => d.id);
      projectsSnapshot.docs.forEach((d) => batch.delete(d.ref));

      // Delete tasks for each project
      for (const projectId of projectIds) {
        const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.docs.forEach((d) => batch.delete(d.ref));
      }

      // Delete other collections
      for (const col of collections.slice(1)) { // skip projects, already handled
        const q = query(collection(db, col.name), where(col.field, '==', clientId));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => batch.delete(d.ref));
      }

      await batch.commit();

      // Optional: delete client assets (folders + files)
      const deleteAssets = window.confirm(
        'Do you also want to delete all folders and files for this client from Assets Management?'
      );

      if (deleteAssets) {
        const assetBatch = writeBatch(db);
        let deletedFolders = 0;
        let deletedFiles = 0;

        const foldersQuery = query(collection(db, 'folders'), where('clientId', '==', clientId));
        const foldersSnapshot = await getDocs(foldersQuery);
        foldersSnapshot.docs.forEach((d) => { assetBatch.delete(d.ref); deletedFolders++; });

        const filesQuery = query(collection(db, 'files'), where('clientId', '==', clientId));
        const filesSnapshot = await getDocs(filesQuery);
        filesSnapshot.docs.forEach((d) => { assetBatch.delete(d.ref); deletedFiles++; });

        await assetBatch.commit();
        await addAuditLog('delete', 'Client Assets', clientId, `Deleted client and all data including ${deletedFolders} folders and ${deletedFiles} files`);
        showToast({ title: 'Success', message: `Client deleted. Removed ${deletedFolders} folders and ${deletedFiles} files.` });
      } else {
        await addAuditLog('delete', 'Client', clientId, `Deleted client and associated data (kept assets)`);
        showToast({ title: 'Success', message: 'Client deleted successfully. Assets were kept.' });
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast({ title: 'Error', message: 'Failed to delete client data completely.' });
    }
  },

  // Social Links
  addSocialLink: async (link) => { await setDoc(doc(db, 'client_social_links', link.id), link); },
  updateSocialLink: async (link) => { await updateDoc(doc(db, 'client_social_links', link.id), link as any); },
  deleteSocialLink: async (linkId) => { await deleteDoc(doc(db, 'client_social_links', linkId)); },

  // Notes
  addNote: async (note) => { await setDoc(doc(db, 'client_notes', note.id), note); },
  updateNote: async (note) => { await updateDoc(doc(db, 'client_notes', note.id), note as any); },
  deleteNote: async (noteId) => { await deleteDoc(doc(db, 'client_notes', noteId)); },

  // Meetings
  addMeeting: async (meeting, folders) => {
    // Ensure Client Meetings Root Folder
    let meetingsRoot = folders.find(f => f.clientId === meeting.clientId && f.name === 'Meetings' && f.isArchiveRoot === false);
    if (!meetingsRoot) {
      const newRootId = `f_meetings_${meeting.clientId}`;
      meetingsRoot = {
        id: newRootId, clientId: meeting.clientId, projectId: null, parentId: null,
        name: 'Meetings', isArchiveRoot: false, isTaskArchiveFolder: false,
        isProjectArchiveFolder: false, isMeetingFolder: false, meetingId: null,
      } as FileFolder;
      await setDoc(doc(db, 'folders', newRootId), meetingsRoot);
    }

    const meetingFolderId = `f_mtg_${meeting.id}`;
    const meetingDate = new Date(meeting.date).toISOString().split('T')[0];
    const meetingFolder: FileFolder = {
      id: meetingFolderId, clientId: meeting.clientId, projectId: null,
      parentId: meetingsRoot.id, name: `${meetingDate} – ${meeting.title}`,
      isArchiveRoot: false, isTaskArchiveFolder: false, isProjectArchiveFolder: false,
      isMeetingFolder: true, meetingId: meeting.id,
    };
    await setDoc(doc(db, 'folders', meetingFolderId), meetingFolder);

    const meetingWithFolder = { ...meeting, meetingFolderId };
    await setDoc(doc(db, 'client_meetings', meeting.id), meetingWithFolder);
  },
  updateMeeting: async (meeting) => { await updateDoc(doc(db, 'client_meetings', meeting.id), meeting as any); },
  deleteMeeting: async (meetingId) => { await deleteDoc(doc(db, 'client_meetings', meetingId)); },

  // Brand Assets
  addBrandAsset: async (asset) => { await setDoc(doc(db, 'client_brand_assets', asset.id), asset); },
  updateBrandAsset: async (asset) => { await updateDoc(doc(db, 'client_brand_assets', asset.id), asset as any); },
  deleteBrandAsset: async (assetId) => { await deleteDoc(doc(db, 'client_brand_assets', assetId)); },

  // Monthly Reports
  addMonthlyReport: async (report) => { await setDoc(doc(db, 'client_monthly_reports', report.id), report); },
  updateMonthlyReport: async (report) => { await updateDoc(doc(db, 'client_monthly_reports', report.id), report as any); },
  deleteMonthlyReport: async (reportId) => { await deleteDoc(doc(db, 'client_monthly_reports', reportId)); },
}));
