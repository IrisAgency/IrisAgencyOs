import React, { useState } from 'react';
import { AppBranding, AppSettings, User, RoleDefinition, Permission, AuditLog, UserRole, Department, WorkflowTemplate, WorkflowStepTemplate, TaskType, DepartmentDefinition } from '../types';
import { USERS, PERMISSIONS_LIST } from '../constants';
import {
    Shield, Palette, Users, Settings, Activity, Save, RotateCcw,
    CheckCircle, Lock, Globe, Database, UserPlus, Edit2, Trash2,
    Search, X, GitBranch, Plus, ArrowUp, ArrowDown, Building, Grid3x3
} from 'lucide-react';
import RolesManager from './RolesManager';
import PermissionMatrix from './PermissionMatrix';
import AdminOverview from './admin/AdminOverview';
import BrandingEditor from './admin/BrandingEditor';
import UsersManager from './admin/UsersManager';
import WorkflowsManager from './admin/WorkflowsManager';
import DepartmentsManager from './admin/DepartmentsManager';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

interface AdminHubProps {
    branding: AppBranding;
    settings: AppSettings;
    users: User[];
    roles: RoleDefinition[];
    auditLogs: AuditLog[];
    workflowTemplates: WorkflowTemplate[];
    departments: DepartmentDefinition[];
    onUpdateBranding: (branding: AppBranding) => void;
    onUpdateSettings: (settings: AppSettings) => void;
    onUpdateUser: (user: User) => void;
    onAddUser: (user: User) => void;
    onUpdateRole: (role: RoleDefinition) => void;
    onAddRole: (role: RoleDefinition) => void;
    onDeleteRole: (roleId: string) => void;
    onUpdateWorkflow: (wf: WorkflowTemplate) => void;
    onAddWorkflow: (wf: WorkflowTemplate) => void;
    onDeleteWorkflow: (wfId: string) => void;
    onSyncRoles: () => void;
    onAddDepartment: (dept: DepartmentDefinition) => void;
    onUpdateDepartment: (dept: DepartmentDefinition) => void;
    onDeleteDepartment: (deptId: string) => void;
}

const AdminHub: React.FC<AdminHubProps> = ({
    branding, settings, users, roles, auditLogs, workflowTemplates, departments,
    onUpdateBranding, onUpdateSettings, onUpdateUser, onAddUser, onUpdateRole, onAddRole, onDeleteRole, onUpdateWorkflow, onAddWorkflow, onDeleteWorkflow, onSyncRoles,
    onAddDepartment, onUpdateDepartment, onDeleteDepartment
}) => {
    const [activeTab, setActiveTab] = useState<'Overview' | 'Branding' | 'Users' | 'Roles' | 'Matrix' | 'Workflows' | 'Departments' | 'Settings' | 'Audit'>('Overview');

    return (
        <PageContainer>
            <PageHeader
                title="Admin Dashboard"
                subtitle="Control center for branding, users, and security."
            />

            <div className="border-b border-slate-200">
                <nav className="flex space-x-6 overflow-x-auto pb-1">
                    {['Overview', 'Branding', 'Users', 'Roles', 'Matrix', 'Departments', 'Workflows', 'Settings', 'Audit'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab === 'Workflows' && <GitBranch className="w-4 h-4" />}
                            {tab === 'Departments' && <Building className="w-4 h-4" />}
                            {tab === 'Matrix' && <Grid3x3 className="w-4 h-4" />}
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
                {activeTab === 'Branding' && <BrandingEditor branding={branding} onUpdateBranding={onUpdateBranding} />}
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
