import React, { useState } from 'react';
import { WorkflowTemplate, WorkflowStepTemplate, RoleDefinition, Department, User } from '../../types';
import { Plus, GitBranch, CheckCircle, Lock, Edit2, Trash2, X, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import Modal from '../common/Modal';

interface WorkflowsManagerProps {
    workflowTemplates: WorkflowTemplate[];
    roles: RoleDefinition[];
    users: User[];
    onUpdateWorkflow: (wf: WorkflowTemplate) => void;
    onAddWorkflow: (wf: WorkflowTemplate) => void;
    onDeleteWorkflow: (wfId: string) => void;
}

const WorkflowsManager: React.FC<WorkflowsManagerProps> = ({
    workflowTemplates,
    roles,
    users,
    onUpdateWorkflow,
    onAddWorkflow,
    onDeleteWorkflow
}) => {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null);

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
            requiresClientApproval: false,
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
        if (confirm(`Are you sure you want to delete "${wf.name}"?`)) {
            onDeleteWorkflow(wf.id);
        }
    };

    const addStep = () => {
        if (!editingWorkflow) return;
        const defaultRoleId = roles.length > 0 ? roles[0].id : '';
        const newStep: WorkflowStepTemplate = {
            id: `s${Date.now()}`,
            workflowTemplateId: editingWorkflow.id,
            order: editingWorkflow.steps.length,
            label: 'New Approval Step',
            roleId: defaultRoleId,
            projectRoleKey: null,
            specificUserId: null,
            useDepartmentHead: false
        };
        setEditingWorkflow({ ...editingWorkflow, steps: [...editingWorkflow.steps, newStep] });
    };

    const updateStep = (index: number, field: keyof WorkflowStepTemplate, value: any) => {
        if (!editingWorkflow) return;
        const newSteps = [...editingWorkflow.steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        
        // Clear conflicting fields based on what's being updated
        if (field === 'roleId') { 
            newSteps[index].projectRoleKey = null; 
            newSteps[index].specificUserId = null;
        }
        if (field === 'projectRoleKey') { 
            newSteps[index].roleId = null; 
            newSteps[index].specificUserId = null;
        }
        if (field === 'specificUserId') {
            newSteps[index].roleId = null;
            newSteps[index].projectRoleKey = null;
        }
        
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
        newSteps.forEach((s, i) => s.order = i);
        setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
    };

    // ... (removed EditModalContent definition) ...

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Workflow Templates</h3>
                <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Create Workflow</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workflowTemplates.map(wf => (
                    <div key={wf.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => handleEdit(wf)}>{wf.name}</h4>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(wf)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(wf)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mb-4 cursor-pointer" onClick={() => handleEdit(wf)}>{wf.description}</p>

                        <div className="flex gap-2 mb-4">
                            {wf.departmentId ? <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{wf.departmentId}</span> : <span className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-400 italic">All Depts</span>}
                            {wf.taskType ? <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase">{wf.taskType}</span> : <span className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-400 italic">All Tasks</span>}
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-400">
                            <span className="ltr-text">{wf.steps.length} Steps</span>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">{wf.requiresClientApproval ? <CheckCircle className="w-3 h-3 text-indigo-500" /> : <X className="w-3 h-3" />} Client Approval</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isEditOpen && editingWorkflow && (
                <Modal
                    isOpen={true}
                    onClose={() => setIsEditOpen(false)}
                    title="Edit Workflow"
                    size="xl"
                >
                    <div className="p-6">
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Workflow Name</label>
                                    <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.name} onChange={e => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Description</label>
                                    <input className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.description} onChange={e => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700">Department</label>
                                        <select className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.departmentId || ''} onChange={e => setEditingWorkflow({ ...editingWorkflow, departmentId: e.target.value || null })}>
                                            <option value="">All / None</option>
                                            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700">Task Type</label>
                                        <select className="w-full mt-1 px-3 py-2 border rounded-lg" value={editingWorkflow.taskType || ''} onChange={e => setEditingWorkflow({ ...editingWorkflow, taskType: e.target.value as any || null })}>
                                            <option value="">All / None</option>
                                            {['design', 'video', 'photo', 'motion', 'copywriting'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center mt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={editingWorkflow.requiresClientApproval} onChange={e => setEditingWorkflow({ ...editingWorkflow, requiresClientApproval: e.target.checked })} className="rounded text-indigo-600" />
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

                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                                    {editingWorkflow.steps.map((step, index) => (
                                        <div key={step.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start">
                                            <div className="flex flex-col gap-1 pt-2">
                                                <button onClick={() => moveStep(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                                <span className="text-xs font-mono text-center font-bold text-slate-300 ltr-text">{index + 1}</span>
                                                <button onClick={() => moveStep(index, 'down')} disabled={index === editingWorkflow.steps.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
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
                                                            value={step.specificUserId !== null ? 'user' : step.projectRoleKey !== null ? 'project' : 'role'}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'role') {
                                                                    const defaultRoleId = roles.length > 0 ? roles[0].id : '';
                                                                    updateStep(index, 'roleId', defaultRoleId);
                                                                    updateStep(index, 'projectRoleKey', null);
                                                                    updateStep(index, 'specificUserId', null);
                                                                } else if (val === 'project') {
                                                                    updateStep(index, 'projectRoleKey', 'Account Manager');
                                                                    updateStep(index, 'roleId', null);
                                                                    updateStep(index, 'specificUserId', null);
                                                                } else if (val === 'user') {
                                                                    const defaultUserId = users.length > 0 ? users[0].id : '';
                                                                    updateStep(index, 'specificUserId', defaultUserId);
                                                                    updateStep(index, 'roleId', null);
                                                                    updateStep(index, 'projectRoleKey', null);
                                                                }
                                                            }}
                                                        >
                                                            <option value="role">System Role</option>
                                                            <option value="project">Project Role</option>
                                                            <option value="user">Specific User</option>
                                                        </select>

                                                        {step.specificUserId !== null ? (
                                                            <select className="w-full px-3 py-2 border rounded-lg text-sm" value={step.specificUserId || ''} onChange={e => updateStep(index, 'specificUserId', e.target.value)}>
                                                                {users.length === 0 && <option value="">No users found</option>}
                                                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                                            </select>
                                                        ) : step.projectRoleKey !== null ? (
                                                            <select className="w-full px-3 py-2 border rounded-lg text-sm" value={step.projectRoleKey || ''} onChange={e => updateStep(index, 'projectRoleKey', e.target.value)}>
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
                                            <button onClick={() => removeStep(index)} className="text-slate-400 hover:text-rose-500 pt-8"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {editingWorkflow.steps.length === 0 && <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed">No steps defined.</div>}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-slate-600 bg-white border rounded-lg hover:bg-slate-50">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Workflow</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default WorkflowsManager;
