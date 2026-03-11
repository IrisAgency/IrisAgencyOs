import React, { useState, useMemo } from 'react';
import { RoleDefinition } from '../types';
import { PERMISSIONS_LIST } from '../constants';
import { DANGEROUS_PERMISSIONS, validatePermissionSet } from '../lib/permissions';
import { Plus, Trash2, Search, Copy, Shield, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { prefixedId } from '../utils/id';

interface RolesManagerProps {
  roles: RoleDefinition[];
  onAddRole: (role: RoleDefinition) => void;
  onUpdateRole: (role: RoleDefinition) => void;
  onDeleteRole: (roleId: string) => void;
  users?: { id: string; role: string }[];
}

const RolesManager: React.FC<RolesManagerProps> = ({ roles, onAddRole, onUpdateRole, onDeleteRole, users = [] }) => {
    const [selectedRole, setSelectedRole] = useState<RoleDefinition | undefined>(roles[0]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [permissionSearch, setPermissionSearch] = useState('');
    const [cloneFrom, setCloneFrom] = useState<string>('');
    
    React.useEffect(() => {
        if (roles.length > 0 && !selectedRole) {
            setSelectedRole(roles[0]);
        }
    }, [roles]);

    // Sync selected role with latest from props
    React.useEffect(() => {
        if (selectedRole) {
            const updated = roles.find(r => r.id === selectedRole.id);
            if (updated) setSelectedRole(updated);
        }
    }, [roles]);

    // Count users per role for deletion safety
    const userCountByRole = useMemo(() => {
        const counts: Record<string, number> = {};
        users.forEach(u => {
            if (u.role) {
                counts[u.role] = (counts[u.role] || 0) + 1;
            }
        });
        return counts;
    }, [users]);

    // Filtered permissions based on search
    const filteredPermissions = useMemo(() => {
        if (!permissionSearch.trim()) return PERMISSIONS_LIST;
        const q = permissionSearch.toLowerCase();
        return PERMISSIONS_LIST.filter(p =>
            p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.module.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }, [permissionSearch]);

    // Validation warnings for selected role
    const validationWarnings = useMemo(() => {
        if (!selectedRole) return [] as { permission: string; message: string }[];
        return validatePermissionSet(selectedRole.permissions || []).warnings;
    }, [selectedRole?.permissions]);

    const handleCreateRole = () => {
        if (!newRoleName) return;
        let basePerms: string[] = [];
        if (cloneFrom) {
            const sourceRole = roles.find(r => r.id === cloneFrom);
            if (sourceRole) basePerms = [...(sourceRole.permissions || [])];
        }
        const newRole: RoleDefinition = {
            id: prefixedId('role'),
            name: newRoleName,
            description: newRoleDesc,
            permissions: basePerms,
            isAdmin: false,
            isSystem: false,
            riskLevel: 'low',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        onAddRole(newRole);
        setIsCreateOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setCloneFrom('');
        setSelectedRole(newRole);
    };

    const handleDeleteRole = (role: RoleDefinition) => {
        // Block deletion of system roles
        if (role.isSystem) {
            alert(`Cannot delete system role "${role.name}". System roles are protected.`);
            return;
        }
        // Check if users are assigned to this role
        const count = userCountByRole[role.name] || 0;
        if (count > 0) {
            alert(`Cannot delete role "${role.name}" — ${count} user(s) are still assigned to it. Reassign them first.`);
            return;
        }
        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            onDeleteRole(role.id);
            if (selectedRole?.id === role.id) {
                setSelectedRole(roles.find(r => r.id !== role.id));
            }
        }
    };

    if (!selectedRole && roles.length === 0) return (
        <div className="p-8 text-center text-slate-400">
            <p className="mb-4">No roles defined.</p>
            <button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Create First Role</button>
        </div>
    );

    const togglePermission = (code: string) => {
        if (!selectedRole) return;
        const currentPerms = selectedRole.permissions || [];
        const hasPerm = currentPerms.includes(code);
        const newPerms = hasPerm ? currentPerms.filter(p => p !== code) : [...currentPerms, code];
        const updatedRole = {
            ...selectedRole,
            permissions: newPerms,
            updatedAt: new Date().toISOString(),
        };
        setSelectedRole(updatedRole);
        onUpdateRole(updatedRole);
    };

    const dangerousCount = (selectedRole?.permissions || []).filter(p => DANGEROUS_PERMISSIONS.has(p)).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Role List Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 flex justify-between items-center">
                    <span>Roles ({roles.length})</span>
                    <button onClick={() => setIsCreateOpen(true)} className="p-1 hover:bg-slate-200 rounded" title="Create new role"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                    {roles.map(role => {
                        const count = userCountByRole[role.name] || 0;
                        return (
                            <div key={role.id} onClick={() => setSelectedRole(role)} className={`p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center group ${selectedRole?.id === role.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                    {role.isSystem && <span title="System role"><Lock className="w-3 h-3 text-slate-400 flex-shrink-0" /></span>}
                                    <span className="font-medium truncate">{role.name}</span>
                                    {role.isAdmin && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">ADMIN</span>}
                                    {count > 0 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0">{count}</span>}
                                </div>
                                {!role.isSystem && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Permissions Panel */}
            {selectedRole && (
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[600px] overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-900">{selectedRole.name}</h3>
                                {selectedRole.isSystem && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">SYSTEM</span>}
                                {selectedRole.riskLevel && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                        selectedRole.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                                        selectedRole.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                                        selectedRole.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>{selectedRole.riskLevel.toUpperCase()}</span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500">{selectedRole.description}</p>
                            {selectedRole.updatedAt && (
                                <p className="text-[10px] text-slate-400 mt-1">Last updated: {new Date(selectedRole.updatedAt).toLocaleDateString()}{selectedRole.updatedBy ? ` by ${selectedRole.updatedBy}` : ''}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                {(selectedRole.permissions || []).length} perms
                            </span>
                            {dangerousCount > 0 && (
                                <span className="text-xs bg-amber-100 px-2 py-1 rounded text-amber-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {dangerousCount} dangerous
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Validation Warnings */}
                    {validationWarnings.length > 0 && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                                <AlertTriangle className="w-4 h-4" /> Permission Warnings
                            </div>
                            <ul className="text-xs text-amber-600 space-y-0.5 ml-6 list-disc">
                                {validationWarnings.map((w, i) => <li key={i}>{w.permission}: {w.message}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Permission Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search permissions..."
                            value={permissionSearch}
                            onChange={e => setPermissionSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    
                    <div className="space-y-6">
                        {Array.from(new Set(filteredPermissions.map(p => p.module))).map(module => {
                            const modulePerms = filteredPermissions.filter(p => p.module === module);
                            if (modulePerms.length === 0) return null;
                            return (
                                <div key={module} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3">{module}</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        {modulePerms.map(perm => {
                                            const isDangerous = DANGEROUS_PERMISSIONS.has(perm.code);
                                            const isChecked = (selectedRole.permissions || []).includes(perm.code);
                                            return (
                                                <label key={perm.code} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                                    isChecked
                                                        ? isDangerous
                                                            ? 'ring-2 ring-amber-400 border-transparent bg-amber-50'
                                                            : 'ring-2 ring-indigo-500 border-transparent bg-white'
                                                        : 'bg-white hover:border-indigo-300'
                                                }`}>
                                                    <input type="checkbox" checked={isChecked} onChange={() => togglePermission(perm.code)} className="rounded text-indigo-600 w-4 h-4" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-medium text-slate-900">{perm.name}</p>
                                                            {isDangerous && <span title="Dangerous permission"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" /></span>}
                                                        </div>
                                                        <p className="text-xs text-slate-500 truncate">{perm.description}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-900">Create New Role</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                                <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Senior Editor" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Role description..." value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Clone permissions from (optional)</label>
                                <select value={cloneFrom} onChange={e => setCloneFrom(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">Start with no permissions</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({(r.permissions || []).length} perms)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => { setIsCreateOpen(false); setCloneFrom(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button onClick={handleCreateRole} disabled={!newRoleName.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Create Role</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesManager;
