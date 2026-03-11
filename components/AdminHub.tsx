import React, { useState, useCallback } from 'react';
import { AppSettings, User, RoleDefinition, AuditLog, DepartmentDefinition, WorkflowTemplate, DashboardBanner } from '../types';
import { PERMISSIONS_LIST } from '../constants';
import { GitBranch, Building, Grid3x3, Image } from 'lucide-react';
import RolesManager from './RolesManager';
import PermissionMatrix from './PermissionMatrix';
import AdminOverview from './admin/AdminOverview';
import UsersManager from './admin/UsersManager';
import WorkflowsManager from './admin/WorkflowsManager';
import DepartmentsManager from './admin/DepartmentsManager';
import BannerManager from './admin/BannerManager';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';
import { useAdminStore } from '../stores/useAdminStore';
import { useHRStore } from '../stores/useHRStore';
import { useUIStore } from '../stores/useUIStore';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_SETTINGS: AppSettings = { id: 'default', timezone: 'UTC', defaultCurrency: 'USD', taxRateDefault: 0, security: { requireStrongPassword: false, sessionTimeoutMinutes: 60, enable2FA: false } };

const AdminHub: React.FC = () => {
    // ── Store reads ──
    const { currentUser } = useAuth();
    const adminStore = useAdminStore();
    const hrStore = useHRStore();
    const { showToast } = useUIStore();

    const settings = DEFAULT_SETTINGS;
    const users = hrStore.users;
    const roles = adminStore.systemRoles;
    const auditLogs = adminStore.auditLogs;
    const workflowTemplates = adminStore.workflowTemplates;
    const departments = adminStore.departments;
    const dashboardBanner = adminStore.dashboardBanners?.find(b => b.isActive) || null;
    const currentUserId = currentUser?.id || '';

    // ── Audit log helper ──
    const addAuditLog = useCallback(async (action: string, entityType: string, entityId: string | null, description: string) => {
        if (!currentUser) return;
        await adminStore.addAuditLog(currentUser.id, action, entityType, entityId, description);
    }, [currentUser, adminStore]);

    // ── Wrapped actions ──
    const onUpdateUser = useCallback(async (u: User) => await hrStore.updateUser(u, addAuditLog), [hrStore, addAuditLog]);
    const onAddUser = useCallback(async (u: User) => await hrStore.addUser(u, addAuditLog), [hrStore, addAuditLog]);
    const onUpdateRole = useCallback(async (r: RoleDefinition) => await adminStore.updateRole(r, currentUser!.id), [adminStore, currentUser]);
    const onAddRole = useCallback(async (r: RoleDefinition) => await adminStore.addRole(r, currentUser!.id), [adminStore, currentUser]);
    const onDeleteRole = useCallback(async (id: string) => await adminStore.deleteRole(id, currentUser!.id), [adminStore, currentUser]);
    const onUpdateWorkflow = useCallback(async (wf: WorkflowTemplate) => {
        await adminStore.updateWorkflow(wf);
        showToast({ title: 'Success', message: 'Workflow updated.' });
    }, [adminStore, showToast]);
    const onAddWorkflow = useCallback(async (wf: WorkflowTemplate) => {
        await adminStore.addWorkflow(wf);
        showToast({ title: 'Success', message: 'Workflow created.' });
    }, [adminStore, showToast]);
    const onDeleteWorkflow = useCallback(async (id: string) => {
        await adminStore.deleteWorkflow(id);
        showToast({ title: 'Success', message: 'Workflow deleted.' });
    }, [adminStore, showToast]);
    const onSyncRoles = useCallback(async () => {
        await adminStore.syncRoles();
        showToast({ title: 'Success', message: 'System roles synchronized.' });
    }, [adminStore, showToast]);
    const onAddDepartment = useCallback(async (d: DepartmentDefinition) => {
        await adminStore.addDepartment(d, currentUser!.id);
        showToast({ title: 'Success', message: `Department "${d.name}" created.` });
    }, [adminStore, currentUser, showToast]);
    const onUpdateDepartment = useCallback(async (d: DepartmentDefinition) => {
        await adminStore.updateDepartment(d, currentUser!.id);
        showToast({ title: 'Success', message: `Department "${d.name}" updated.` });
    }, [adminStore, currentUser, showToast]);
    const onDeleteDepartment = useCallback(async (id: string) => {
        await adminStore.deleteDepartment(id, currentUser!.id);
        showToast({ title: 'Success', message: 'Department deleted.' });
    }, [adminStore, currentUser, showToast]);
    const onSaveBanner = useCallback(async (b: DashboardBanner) => {
        await adminStore.saveBanner(b, currentUser!.id);
        showToast({ title: 'Success', message: 'Banner saved.' });
    }, [adminStore, currentUser, showToast]);
    const onDeleteBanner = useCallback(async () => {
        await adminStore.deleteBanner(currentUser!.id);
        showToast({ title: 'Success', message: 'Banner deleted.' });
    }, [adminStore, currentUser, showToast]);
    const [activeTab, setActiveTab] = useState<'Overview' | 'Users' | 'Roles' | 'Matrix' | 'Workflows' | 'Departments' | 'Banner' | 'Settings' | 'Audit'>('Overview');

    return (
        <PageContainer>
            <PageHeader
                title="Admin Dashboard"
                subtitle="Control center for users, security, and workflows."
            />

            <div className="border-b border-slate-200">
                <nav className="flex space-x-6 overflow-x-auto pb-1">
                    {['Overview', 'Users', 'Roles', 'Matrix', 'Departments', 'Workflows', 'Banner', 'Settings', 'Audit'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab === 'Workflows' && <GitBranch className="w-4 h-4" />}
                            {tab === 'Departments' && <Building className="w-4 h-4" />}
                            {tab === 'Matrix' && <Grid3x3 className="w-4 h-4" />}
                            {tab === 'Banner' && <Image className="w-4 h-4" />}
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <PageContent>
                {activeTab === 'Overview' && (
                    <AdminOverview
                        users={users}
                        departments={departments}
                        workflowTemplates={workflowTemplates}
                        settings={settings}
                        auditLogs={auditLogs}
                        onSyncRoles={onSyncRoles}
                    />
                )}
                {activeTab === 'Users' && <UsersManager users={users} onUpdateUser={onUpdateUser} onAddUser={onAddUser} />}
                {activeTab === 'Roles' && <RolesManager roles={roles} onAddRole={onAddRole} onUpdateRole={onUpdateRole} onDeleteRole={onDeleteRole} />}
                {activeTab === 'Matrix' && <PermissionMatrix roles={roles} permissions={PERMISSIONS_LIST} onUpdateRole={onUpdateRole} onSyncRoles={onSyncRoles} />}
                {activeTab === 'Departments' && (
                    <DepartmentsManager
                        departments={departments}
                        onAddDepartment={onAddDepartment}
                        onUpdateDepartment={onUpdateDepartment}
                        onDeleteDepartment={onDeleteDepartment}
                    />
                )}
                {activeTab === 'Workflows' && (
                    <WorkflowsManager
                        workflowTemplates={workflowTemplates}
                        roles={roles}
                        users={users}
                        onUpdateWorkflow={onUpdateWorkflow}
                        onAddWorkflow={onAddWorkflow}
                        onDeleteWorkflow={onDeleteWorkflow}
                    />
                )}

                {activeTab === 'Banner' && (
                    <BannerManager
                        banner={dashboardBanner}
                        currentUserId={currentUserId}
                        onSaveBanner={onSaveBanner}
                        onDeleteBanner={onDeleteBanner}
                    />
                )}

                {activeTab === 'Settings' && (
                    <div className="p-12 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-dashed">
                        Global Application Settings (Coming Soon)
                    </div>
                )}

                {activeTab === 'Audit' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-in fade-in duration-300">
                        <div className="space-y-2">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-semibold text-slate-900">{users.find(u => u.id === log.userId)?.name || log.userId}</span>
                                                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase text-slate-700">{log.action}</span>
                                                <span className="text-xs text-slate-500">{log.entityType}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-2">{log.description}</p>
                                            <p className="text-xs text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {auditLogs.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    <p>No audit logs found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </PageContent>
        </PageContainer>
    );
};

export default AdminHub;
