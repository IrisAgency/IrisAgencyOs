/**
 * Admin Store — roles, audit logs, workflow templates, departments, dashboard banners.
 * Collections: roles, audit_logs, workflow_templates, departments, dashboard_banners
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, orderBy, limit, query as fsQuery } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { prefixedId } from '../utils/id';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import { DEFAULT_ROLES } from '../constants';
import type {
  RoleDefinition, AuditLog, WorkflowTemplate, DepartmentDefinition,
  DashboardBanner, User,
} from '../types';

interface AdminState {
  systemRoles: RoleDefinition[];
  auditLogs: AuditLog[];
  workflowTemplates: WorkflowTemplate[];
  departments: DepartmentDefinition[];
  dashboardBanners: DashboardBanner[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  // Derived
  activeBanner: () => DashboardBanner | null;

  // Audit log helper
  addAuditLog: (userId: string, action: string, entityType: string, entityId: string | null, description: string) => Promise<void>;

  // Roles
  updateRole: (role: RoleDefinition, userId: string) => Promise<void>;
  addRole: (role: RoleDefinition, userId: string) => Promise<void>;
  deleteRole: (roleId: string, userId: string) => Promise<void>;
  syncRoles: () => Promise<void>;

  // Workflows
  updateWorkflow: (wf: WorkflowTemplate) => Promise<void>;
  addWorkflow: (wf: WorkflowTemplate) => Promise<void>;
  deleteWorkflow: (wfId: string) => Promise<void>;

  // Departments
  addDepartment: (dept: DepartmentDefinition, userId: string) => Promise<void>;
  updateDepartment: (dept: DepartmentDefinition, userId: string) => Promise<void>;
  deleteDepartment: (deptId: string, userId: string) => Promise<void>;

  // Dashboard Banner
  saveBanner: (banner: DashboardBanner, userId: string) => Promise<void>;
  deleteBanner: (userId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  systemRoles: [],
  auditLogs: [],
  workflowTemplates: [],
  departments: [],
  dashboardBanners: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    let pending = 5;
    const markLoaded = () => { pending--; if (pending <= 0) set({ loading: false }); };
    unsubs.push(subscribeCollection<RoleDefinition>('roles', (items) => { set({ systemRoles: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<AuditLog>('audit_logs', (items) => { set({ auditLogs: items }); markLoaded(); }, (ref) => fsQuery(ref, orderBy('createdAt', 'desc'), limit(500))));
    unsubs.push(subscribeCollection<WorkflowTemplate>('workflow_templates', (items) => { set({ workflowTemplates: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<DepartmentDefinition>('departments', (items) => { set({ departments: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<DashboardBanner>('dashboard_banners', (items) => { set({ dashboardBanners: items }); markLoaded(); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  activeBanner: () => get().dashboardBanners.find(b => b.isActive) || null,

  addAuditLog: async (userId, action, entityType, entityId, description) => {
    const id = prefixedId('audit');
    await setDoc(doc(db, 'audit_logs', id), {
      id, userId, action, entityType, entityId, description,
      createdAt: serverTimestamp(),
    });
  },

  // --- Roles ---
  updateRole: async (role, userId) => {
    await updateDoc(doc(db, 'roles', role.id), role as any);
    await get().addAuditLog(userId, 'update_role', 'Role', role.id, `Updated permissions for ${role.name}`);
  },

  addRole: async (role, userId) => {
    await setDoc(doc(db, 'roles', role.id), role);
    await get().addAuditLog(userId, 'create_role', 'Role', role.id, `Created role ${role.name}`);
  },

  deleteRole: async (roleId, userId) => {
    await deleteDoc(doc(db, 'roles', roleId));
    await get().addAuditLog(userId, 'delete_role', 'Role', roleId, `Deleted role ${roleId}`);
  },

  syncRoles: async () => {
    const batch = writeBatch(db);
    for (const defaultRole of DEFAULT_ROLES) {
      batch.set(doc(db, 'roles', defaultRole.id), defaultRole, { merge: true });
    }
    await batch.commit();
  },

  // --- Workflows ---
  updateWorkflow: async (wf) => {
    await updateDoc(doc(db, 'workflow_templates', wf.id), wf as any);
  },

  addWorkflow: async (wf) => {
    await setDoc(doc(db, 'workflow_templates', wf.id), wf);
  },

  deleteWorkflow: async (wfId) => {
    await deleteDoc(doc(db, 'workflow_templates', wfId));
  },

  // --- Departments ---
  addDepartment: async (dept, userId) => {
    await setDoc(doc(db, 'departments', dept.id), dept);
    await get().addAuditLog(userId, 'create_department', 'Department', dept.id, `Created department ${dept.name}`);
  },

  updateDepartment: async (dept, userId) => {
    await updateDoc(doc(db, 'departments', dept.id), dept as any);
    await get().addAuditLog(userId, 'update_department', 'Department', dept.id, `Updated department ${dept.name}`);
  },

  deleteDepartment: async (deptId, userId) => {
    await deleteDoc(doc(db, 'departments', deptId));
    await get().addAuditLog(userId, 'delete_department', 'Department', deptId, `Deleted department ${deptId}`);
  },

  // --- Dashboard Banner ---
  saveBanner: async (banner, userId) => {
    await setDoc(doc(db, 'dashboard_banners', banner.id), banner);
    await get().addAuditLog(userId, 'save_banner', 'DashboardBanner', banner.id, 'Saved dashboard banner');
  },

  deleteBanner: async (userId) => {
    const banner = get().activeBanner();
    if (banner) {
      await deleteDoc(doc(db, 'dashboard_banners', banner.id));
      await get().addAuditLog(userId, 'delete_banner', 'DashboardBanner', banner.id, 'Deleted dashboard banner');
    }
  },
}));
