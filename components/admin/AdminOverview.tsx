import React from 'react';
import { User, DepartmentDefinition, WorkflowTemplate, AppSettings, AuditLog } from '../../types';
import { Users, Building, GitBranch, Lock, RotateCcw } from 'lucide-react';

interface AdminOverviewProps {
    users: User[];
    departments: DepartmentDefinition[];
    workflowTemplates: WorkflowTemplate[];
    settings: AppSettings;
    auditLogs: AuditLog[];
    onSyncRoles: () => void;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({
    users,
    departments,
    workflowTemplates,
    settings,
    auditLogs,
    onSyncRoles
}) => {
    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700">Active Users</h3>
                        <Users className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 ltr-text">{users.filter(u => u.status === 'active').length}</p>
                    <p className="text-xs text-slate-500 mt-1">Total <span className="ltr-text">{users.length}</span> registered</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700">Departments</h3>
                        <Building className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 ltr-text">{departments.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Operational Units</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700">Active Workflows</h3>
                        <GitBranch className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 ltr-text">{workflowTemplates.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Automated approval chains</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700">Security</h3>
                        <Lock className="w-5 h-5 text-rose-500" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">{settings.security.enable2FA ? '2FA Enabled' : 'Standard Auth'}</p>
                    <p className="text-xs text-slate-500 mt-1">Timeout: <span className="ltr-text">{settings.security.sessionTimeoutMinutes}</span> mins</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900">System Maintenance</h3>
                        <p className="text-sm text-slate-500">Perform system-wide maintenance tasks.</p>
                    </div>
                    <button
                        onClick={onSyncRoles}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Sync Default Roles
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900">Recent Audit Activity</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {auditLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900"><span className="font-bold">{log.action}</span> on {log.entityType}</p>
                                <p className="text-xs text-slate-500">{log.description}</p>
                            </div>
                            <span className="text-xs text-slate-400 ltr-text">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
