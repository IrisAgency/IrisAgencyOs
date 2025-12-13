import React, { useState } from 'react';
import { RoleDefinition } from '../types';
import { PERMISSIONS_LIST } from '../constants';
import { Plus, Trash2 } from 'lucide-react';

interface RolesManagerProps {
  roles: RoleDefinition[];
  onAddRole: (role: RoleDefinition) => void;
  onUpdateRole: (role: RoleDefinition) => void;
  onDeleteRole: (roleId: string) => void;
}

const RolesManager: React.FC<RolesManagerProps> = ({ roles, onAddRole, onUpdateRole, onDeleteRole }) => {
    const [selectedRole, setSelectedRole] = useState<RoleDefinition | undefined>(roles[0]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    
    React.useEffect(() => {
        if (roles.length > 0 && !selectedRole) {
            setSelectedRole(roles[0]);
        }
    }, [roles]);

    const handleCreateRole = () => {
        if (!newRoleName) return;
        const newRole: RoleDefinition = {
            id: `role_${Date.now()}`,
            name: newRoleName,
            description: newRoleDesc,
            permissions: [],
            isAdmin: false
        };
        onAddRole(newRole);
        setIsCreateOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setSelectedRole(newRole);
    };

    const handleDeleteRole = (roleId: string) => {
        if (confirm('Are you sure you want to delete this role?')) {
            onDeleteRole(roleId);
            if (selectedRole?.id === roleId) {
                setSelectedRole(roles.find(r => r.id !== roleId));
            }
        }
    };

    if (!selectedRole && roles.length === 0) return (
        <div className="p-8 text-center text-slate-400">
            <p className="mb-4">No roles defined.</p>
            <button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Create First Role</button>
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">Create New Role</h3>
                        <input className="w-full p-2 border rounded mb-3" placeholder="Role Name" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                        <input className="w-full p-2 border rounded mb-4" placeholder="Description" value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                            <button onClick={handleCreateRole} className="px-4 py-2 bg-indigo-600 text-white rounded">Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const togglePermission = (code: string) => {
        if (!selectedRole) return;
        const currentPerms = selectedRole.permissions || [];
        const hasPerm = currentPerms.includes(code);
        const newPerms = hasPerm ? currentPerms.filter(p => p !== code) : [...currentPerms, code];
        const updatedRole = { ...selectedRole, permissions: newPerms };
        setSelectedRole(updatedRole); onUpdateRole(updatedRole);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 flex justify-between items-center">
                    <span>Roles</span>
                    <button onClick={() => setIsCreateOpen(true)} className="p-1 hover:bg-slate-200 rounded"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                    {roles.map(role => (
                        <div key={role.id} onClick={() => setSelectedRole(role)} className={`p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center group ${selectedRole?.id === role.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                            <span className="font-medium">{role.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            </div>
            
            {selectedRole && (
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[600px] overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{selectedRole.name} Permissions</h3>
                            <p className="text-sm text-slate-500">{selectedRole.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">ID: {selectedRole.id}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        {Array.from(new Set(PERMISSIONS_LIST.map(p => p.module))).map(module => (
                            <div key={module} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-slate-700 mb-3">{module}</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {PERMISSIONS_LIST.filter(p => p.module === module).map(perm => (
                                        <label key={perm.code} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors bg-white ${(selectedRole.permissions || []).includes(perm.code) ? 'ring-2 ring-indigo-500 border-transparent' : 'hover:border-indigo-300'}`}>
                                            <input type="checkbox" checked={(selectedRole.permissions || []).includes(perm.code)} onChange={() => togglePermission(perm.code)} className="rounded text-indigo-600 w-4 h-4" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{perm.name}</p>
                                                <p className="text-xs text-slate-500">{perm.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button onClick={handleCreateRole} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create Role</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesManager;
