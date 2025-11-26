

import React, { useState } from 'react';
import { AppBranding, AppSettings, User, RoleDefinition, Permission, AuditLog, UserRole, Department, WorkflowTemplate, WorkflowStepTemplate, TaskType } from '../types';
import { USERS, PERMISSIONS_LIST } from '../constants';
import { 
  Shield, Palette, Users, Settings, Activity, Save, RotateCcw, 
  CheckCircle, Lock, Globe, Database, UserPlus, Edit2, Trash2, 
  Search, X, GitBranch, Plus, ArrowUp, ArrowDown
} from 'lucide-react';

interface AdminHubProps {
  branding: AppBranding;
  settings: AppSettings;
  users: User[];
  roles: RoleDefinition[];
  auditLogs: AuditLog[];
  workflowTemplates: WorkflowTemplate[];
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
}

const AdminHub: React.FC<AdminHubProps> = ({ 
  branding, settings, users, roles, auditLogs, workflowTemplates,
  onUpdateBranding, onUpdateSettings, onUpdateUser, onAddUser, onUpdateRole, onAddRole, onDeleteRole, onUpdateWorkflow, onAddWorkflow, onDeleteWorkflow
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Branding' | 'Users' | 'Roles' | 'Workflows' | 'Settings' | 'Audit'>('Overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // -- Sub-Components --

  const Overview = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">Active Users</h3>
                <Users className="w-5 h-5 text-indigo-500" />
             </div>
             <p className="text-3xl font-bold text-slate-900">{users.filter(u => u.status === 'active').length}</p>
             <p className="text-xs text-slate-500 mt-1">Total {users.length} registered</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">Active Workflows</h3>
                <GitBranch className="w-5 h-5 text-emerald-500" />
             </div>
             <p className="text-3xl font-bold text-slate-900">{workflowTemplates.length}</p>
             <p className="text-xs text-slate-500 mt-1">Automated approval chains</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">Security</h3>
                <Lock className="w-5 h-5 text-rose-500" />
             </div>
             <p className="text-lg font-bold text-slate-900">{settings.security.enable2FA ? '2FA Enabled' : 'Standard Auth'}</p>
             <p className="text-xs text-slate-500 mt-1">Timeout: {settings.security.sessionTimeoutMinutes} mins</p>
          </div>
       </div>

       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                   <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
             ))}
          </div>
       </div>
    </div>
  );

  // ... BrandingEditor, UsersManager, RolesManager (Same as before, omitted for brevity in diff but included in XML return) ...
  
  const BrandingEditor = () => {
     const [localBranding, setLocalBranding] = useState(branding);
     const handleSave = () => { onUpdateBranding(localBranding); };
     return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
           <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-500"/> Theme Colors</h3>
                 <div className="space-y-4">
                    {/* Color Pickers */}
                    {['primaryColor', 'sidebarColor', 'backgroundColor'].map((field) => (
                        <div key={field}>
                           <label className="block text-sm font-medium text-slate-700 mb-1">{field.replace('Color', '')}</label>
                           <div className="flex items-center gap-3">
                              <input type="color" value={(localBranding as any)[field]} onChange={e => setLocalBranding({...localBranding, [field]: e.target.value})} className="h-10 w-20 rounded border border-slate-300 p-1 cursor-pointer"/>
                              <input type="text" value={(localBranding as any)[field]} onChange={e => setLocalBranding({...localBranding, [field]: e.target.value})} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono"/>
                           </div>
                        </div>
                    ))}
                 </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"><Save className="w-4 h-4"/> Save Changes</button>
              </div>
           </div>
        </div>
     );
  };

  const UsersManager = () => {
     const [isEditOpen, setIsEditOpen] = useState(false);
     const [editingUser, setEditingUser] = useState<Partial<User>>({});
     const filteredUsers = users.filter(u => u && u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()));
     const handleSaveUser = () => {
         if (editingUser.id) { onUpdateUser(editingUser as User); } else {
             const newUser: User = {
                id: `u${Date.now()}`,
                name: editingUser.name || 'New User',
                email: editingUser.email || '',
                role: (editingUser.role as UserRole) || UserRole.DESIGNER,
                department: (editingUser.department as Department) || Department.CREATIVE,
                avatar: `https://ui-avatars.com/api/?name=${editingUser.name}`,
                status: 'active',
                dateJoined: new Date().toISOString(),
                passwordHash: '',
                forcePasswordChange: true
             };
             onAddUser(newUser);
         }
         setIsEditOpen(false); setEditingUser({});
     };
     return (
        <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                 <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
                 <button onClick={() => { setEditingUser({}); setIsEditOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add User</button>
             </div>
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Dept</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 flex items-center gap-3"><img src={user.avatar} className="w-8 h-8 rounded-full" /><span className="font-medium">{user.name}</span></td>
                                <td className="px-6 py-4">{user.role || 'No Role'}</td><td className="px-6 py-4">{user.department}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : user.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>{user.status}</span></td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => { setEditingUser(user); setIsEditOpen(true); }} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Edit User"><Edit2 className="w-4 h-4"/></button>
                                        {user.status !== 'inactive' ? (
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to remove ${user.name}? They will be logged out immediately.`)) {
                                                        onUpdateUser({ ...user, status: 'inactive' });
                                                    }
                                                }} 
                                                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors"
                                                title="Remove User"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onUpdateUser({ ...user, status: 'active' })}
                                                className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                                                title="Reactivate User"
                                            >
                                                <CheckCircle className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
             {isEditOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-slate-900 mb-4">{editingUser.id ? 'Edit User' : 'Create User'}</h3>
                        <div className="space-y-4">
                            <input className="w-full px-3 py-2 border rounded-lg" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="Name" />
                            <input className="w-full px-3 py-2 border rounded-lg" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="Email" />
                            <button onClick={handleSaveUser} className="w-full bg-indigo-600 text-white py-2 rounded-lg">Save</button>
                            <button onClick={() => setIsEditOpen(false)} className="w-full text-slate-500 py-2">Cancel</button>
                        </div>
                    </div>
                 </div>
             )}
        </div>
     );
  };

  const RolesManager = () => {
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
          const hasPerm = selectedRole.permissions.includes(code);
          const newPerms = hasPerm ? selectedRole.permissions.filter(p => p !== code) : [...selectedRole.permissions, code];
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
                                          <label key={perm.code} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors bg-white ${selectedRole.permissions.includes(perm.code) ? 'ring-2 ring-indigo-500 border-transparent' : 'hover:border-indigo-300'}`}>
                                              <input type="checkbox" checked={selectedRole.permissions.includes(perm.code)} onChange={() => togglePermission(perm.code)} className="rounded text-indigo-600 w-4 h-4" />
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

  const WorkflowsManager = () => {
      const [isEditOpen, setIsEditOpen] = useState(false);
      const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null);
      const [activationTarget, setActivationTarget] = useState<WorkflowTemplate | null>(null);

      const handleEdit = (wf: WorkflowTemplate) => {
          setEditingWorkflow({ ...wf });
          setIsEditOpen(true);
      };

      const handleCreate = () => {
          setEditingWorkflow({
              id: `wf${Date.now()}`,
              name: 'New Workflow',
              description: '',
              departmentId: null,
              taskType: null,
              status: 'available',
              requiresClientApproval: true,
              steps: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          });
          setIsEditOpen(true);
      };

      const handleSave = () => {
          if (!editingWorkflow) return;
          if (workflowTemplates.find(w => w.id === editingWorkflow.id)) {
              onUpdateWorkflow(editingWorkflow);
          } else {
              onAddWorkflow(editingWorkflow);
          }
          setIsEditOpen(false);
          setEditingWorkflow(null);
      };

      const handleDelete = (wf: WorkflowTemplate) => {
          if (wf.status === 'active' || wf.status === 'system_protected') {
              alert("Cannot delete an active or system protected workflow.");
              return;
          }
          if (confirm(`Are you sure you want to delete "${wf.name}"?`)) {
              onDeleteWorkflow(wf.id);
          }
      };

      const initiateActivation = (wf: WorkflowTemplate) => {
          const existingActive = workflowTemplates.find(w => 
              w.id !== wf.id && 
              w.status === 'active' && 
              w.departmentId === wf.departmentId && 
              w.taskType === wf.taskType
          );

          if (existingActive) {
              setActivationTarget(wf);
          } else {
              confirmActivation(wf);
          }
      };

      const confirmActivation = (wf: WorkflowTemplate) => {
          workflowTemplates.forEach(w => {
              if (w.id !== wf.id && w.status === 'active' && w.departmentId === wf.departmentId && w.taskType === wf.taskType) {
                  onUpdateWorkflow({ ...w, status: 'available' });
              }
          });
          onUpdateWorkflow({ ...wf, status: 'active' });
          setActivationTarget(null);
      };

      const addStep = () => {
          if (!editingWorkflow) return;
          const defaultRoleId = roles.length > 0 ? roles[0].id : '';
          const newStep: WorkflowStepTemplate = {
              id: `s${Date.now()}`,
              workflowTemplateId: editingWorkflow.id,
              order: editingWorkflow.steps.length,
              label: 'New Approval Step',
              roleId: defaultRoleId, // Default to first role or empty
              projectRoleKey: null,
              useDepartmentHead: false
          };
          setEditingWorkflow({ ...editingWorkflow, steps: [...editingWorkflow.steps, newStep] });
      };

      const updateStep = (index: number, field: keyof WorkflowStepTemplate, value: any) => {
          if (!editingWorkflow) return;
          const newSteps = [...editingWorkflow.steps];
          newSteps[index] = { ...newSteps[index], [field]: value };
          // Reset others if switching type
          if (field === 'roleId') { newSteps[index].projectRoleKey = null; }
          if (field === 'projectRoleKey') { newSteps[index].roleId = null; }
          setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
      };

      const removeStep = (index: number) => {
          if (!editingWorkflow) return;
          const newSteps = editingWorkflow.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
          setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
      };

      const moveStep = (index: number, direction: 'up' | 'down') => {
          if (!editingWorkflow) return;
          const newSteps = [...editingWorkflow.steps];
          if (direction === 'up' && index > 0) {
              [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
          } else if (direction === 'down' && index < newSteps.length - 1) {
              [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
          }
          // Re-index
          newSteps.forEach((s, i) => s.order = i);
          setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
      };

      if (isEditOpen && editingWorkflow) {
          return (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900">Edit Workflow</h3>
                      <div className="flex gap-2">
                          <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-slate-600 bg-white border rounded-lg hover:bg-slate-50">Cancel</button>
                          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Workflow</button>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700">Workflow Name</label>
                          <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.name} onChange={e => setEditingWorkflow({...editingWorkflow, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700">Description</label>
                          <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.description} onChange={e => setEditingWorkflow({...editingWorkflow, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700">Department</label>
                              <select className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.departmentId || ''} onChange={e => setEditingWorkflow({...editingWorkflow, departmentId: e.target.value || null})}>
                                  <option value="">All / None</option>
                                  {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700">Task Type</label>
                              <select className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.taskType || ''} onChange={e => setEditingWorkflow({...editingWorkflow, taskType: e.target.value as any || null})}>
                                  <option value="">All / None</option>
                                  {['design', 'video', 'photo', 'motion', 'copywriting'].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div className="flex items-center mt-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={editingWorkflow.requiresClientApproval} onChange={e => setEditingWorkflow({...editingWorkflow, requiresClientApproval: e.target.checked})} className="rounded text-indigo-600" />
                                  <span className="text-sm text-slate-700">Requires Client Approval?</span>
                              </label>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-900">Approval Steps</h4>
                          <button onClick={addStep} className="text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded border border-indigo-100">+ Add Step</button>
                      </div>
                      
                      {editingWorkflow.steps.map((step, index) => (
                          <div key={step.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start">
                              <div className="flex flex-col gap-1 pt-2">
                                  <button onClick={() => moveStep(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                                  <span className="text-xs font-mono text-center font-bold text-slate-300">{index + 1}</span>
                                  <button onClick={() => moveStep(index, 'down')} disabled={index === editingWorkflow.steps.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">Step Label</label>
                                      <input className="w-full px-3 py-2 border rounded-lg text-sm" value={step.label} onChange={e => updateStep(index, 'label', e.target.value)} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">Approver Logic</label>
                                      <div className="flex gap-2">
                                          <select 
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                            value={step.projectRoleKey ? 'project' : 'role'}
                                            onChange={(e) => {
                                                if (e.target.value === 'role') {
                                                    const defaultRoleId = roles.length > 0 ? roles[0].id : '';
                                                    updateStep(index, 'roleId', defaultRoleId);
                                                }
                                                else updateStep(index, 'projectRoleKey', 'Account Manager');
                                            }}
                                          >
                                              <option value="role">System Role</option>
                                              <option value="project">Project Role</option>
                                          </select>
                                          
                                          {step.projectRoleKey ? (
                                              <select className="w-full px-3 py-2 border rounded-lg text-sm" value={step.projectRoleKey} onChange={e => updateStep(index, 'projectRoleKey', e.target.value)}>
                                                  {['Account Manager', 'Creative Lead', 'Project Lead', 'Producer'].map(r => <option key={r} value={r}>{r}</option>)}
                                              </select>
                                          ) : (
                                              <select className="w-full px-3 py-2 border rounded-lg text-sm" value={step.roleId || ''} onChange={e => updateStep(index, 'roleId', e.target.value)}>
                                                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                              </select>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <button onClick={() => removeStep(index)} className="text-slate-400 hover:text-rose-500 pt-8"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      ))}
                      {editingWorkflow.steps.length === 0 && <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">No steps defined.</div>}
                  </div>
              </div>
          );
      }

      return (
          <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Workflow Templates</h3>
                  <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4"/> Create Workflow</button>
              </div>

              {activationTarget && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Activity className="w-5 h-5"/></div>
                      <div className="flex-1">
                          <h4 className="font-bold text-amber-900">Replace Active Workflow?</h4>
                          <p className="text-sm text-amber-700 mt-1">
                              There is already an active workflow for <strong>{activationTarget.departmentId || 'All Departments'}</strong> / <strong>{activationTarget.taskType || 'All Tasks'}</strong>. 
                              Activating <strong>"{activationTarget.name}"</strong> will deactivate the current one.
                          </p>
                          <div className="flex gap-2 mt-3">
                              <button onClick={() => confirmActivation(activationTarget)} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700">Confirm & Replace</button>
                              <button onClick={() => setActivationTarget(null)} className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-xs font-bold rounded hover:bg-amber-50">Cancel</button>
                          </div>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {workflowTemplates.map(wf => (
                      <div key={wf.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group relative">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => handleEdit(wf)}>{wf.name}</h4>
                                  {wf.status === 'active' && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> ACTIVE</span>}
                                  {wf.status === 'system_protected' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> SYSTEM</span>}
                                  {wf.status === 'available' && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-bold">AVAILABLE</span>}
                              </div>
                              <div className="flex gap-1">
                                  <button onClick={() => handleEdit(wf)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4"/></button>
                                  {wf.status !== 'active' && wf.status !== 'system_protected' && (
                                      <button onClick={() => handleDelete(wf)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                  )}
                              </div>
                          </div>
                          
                          <p className="text-sm text-slate-500 mb-4 cursor-pointer" onClick={() => handleEdit(wf)}>{wf.description}</p>
                          
                          <div className="flex gap-2 mb-4">
                              {wf.departmentId ? <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{wf.departmentId}</span> : <span className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-400 italic">All Depts</span>}
                              {wf.taskType ? <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase">{wf.taskType}</span> : <span className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-400 italic">All Tasks</span>}
                          </div>

                          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-400">
                              <span>{wf.steps.length} Steps</span>
                              <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">{wf.requiresClientApproval ? <CheckCircle className="w-3 h-3 text-indigo-500"/> : <X className="w-3 h-3"/>} Client Approval</span>
                                  
                                  {wf.status === 'available' && (
                                      <button onClick={() => initiateActivation(wf)} className="text-indigo-600 font-bold hover:underline">Set Active</button>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Control center for branding, users, and security.</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['Overview', 'Branding', 'Users', 'Roles', 'Workflows', 'Settings', 'Audit'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Workflows' && <GitBranch className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">
         {activeTab === 'Overview' && <Overview />}
         {activeTab === 'Branding' && <BrandingEditor />}
         {activeTab === 'Users' && <UsersManager />}
         {activeTab === 'Roles' && <RolesManager />}
         {activeTab === 'Workflows' && <WorkflowsManager />}
         {/* SettingsEditor component omitted for brevity but implied present */}
         {activeTab === 'Audit' && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Entity</th><th className="px-6 py-4">Details</th></tr></thead>
                     <tbody className="divide-y divide-slate-100">
                         {auditLogs.map(log => (
                             <tr key={log.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 text-slate-500 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                 <td className="px-6 py-4 font-medium text-slate-900">{users.find(u => u.id === log.userId)?.name || log.userId}</td>
                                 <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">{log.action}</span></td>
                                 <td className="px-6 py-4 text-slate-600">{log.entityType}</td>
                                 <td className="px-6 py-4 text-slate-500">{log.description}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </div>
    </div>
  );
};

export default AdminHub;
