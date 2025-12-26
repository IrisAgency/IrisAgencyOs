import React, { useState } from 'react';
import { DepartmentDefinition, Department } from '../../types';
import { Building, Plus, Users, Shield, Edit2, Trash2, Database } from 'lucide-react';
import Modal from '../common/Modal';

interface DepartmentsManagerProps {
    departments: DepartmentDefinition[];
    onAddDepartment: (dept: DepartmentDefinition) => void;
    onUpdateDepartment: (dept: DepartmentDefinition) => void;
    onDeleteDepartment: (deptId: string) => void;
}

const DepartmentsManager: React.FC<DepartmentsManagerProps> = ({
    departments,
    onAddDepartment,
    onUpdateDepartment,
    onDeleteDepartment
}) => {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<DepartmentDefinition | null>(null);

    const handleEdit = (dept: DepartmentDefinition) => {
        setEditingDept({ ...dept });
        setIsEditOpen(true);
    };

    const handleCreate = () => {
        const now = new Date().toISOString();
        setEditingDept({
            id: `dept_${Date.now()}`,
            name: '',
            code: '',
            description: '',
            isActive: true,
            memberIds: [],
            defaultRoles: [],
            createdBy: 'u1',
            createdAt: now,
            updatedAt: now
        });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingDept) return;
        if (!editingDept.name || !editingDept.code) {
            alert("Name and Code are required.");
            return;
        }

        if (departments.find(d => d.id === editingDept.id)) {
            onUpdateDepartment(editingDept);
        } else {
            onAddDepartment(editingDept);
        }
        setIsEditOpen(false);
        setEditingDept(null);
    };

    const handleDelete = (deptId: string) => {
        if (confirm('Are you sure you want to delete this department?')) {
            onDeleteDepartment(deptId);
        }
    };

    const handleSeedDefaults = () => {
        const now = new Date().toISOString();
        const defaults: DepartmentDefinition[] = [
            {
                id: 'dept_posting',
                name: 'Posting',
                code: 'POST',
                description: 'Social Media and Content Posting Department',
                isActive: true,
                memberIds: [],
                defaultRoles: [],
                createdBy: 'system',
                createdAt: now,
                updatedAt: now
            },
            {
                id: 'dept_creative',
                name: 'Creative',
                code: 'CRE',
                description: 'Design, Video, and Copywriting',
                isActive: true,
                memberIds: [],
                defaultRoles: [],
                createdBy: 'system',
                createdAt: now,
                updatedAt: now
            },
            {
                id: 'dept_accounts',
                name: 'Accounts',
                code: 'ACC',
                description: 'Client Management and Sales',
                isActive: true,
                memberIds: [],
                defaultRoles: [],
                createdBy: 'system',
                createdAt: now,
                updatedAt: now
            }
        ];

        defaults.forEach(d => {
            if (!departments.find(existing => existing.id === d.id)) {
                onAddDepartment(d);
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Departments</h3>
                <div className="flex gap-2">
                    {departments.length === 0 && (
                        <button onClick={handleSeedDefaults} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                            <Database className="w-4 h-4" /> Seed Defaults
                        </button>
                    )}
                    <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Department</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map(dept => (
                    <div key={dept.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{dept.name}</h4>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">{dept.code}</span>
                                {!dept.isActive && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 font-bold">INACTIVE</span>}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(dept)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mb-4 min-h-[40px]">{dept.description || 'No description provided.'}</p>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {dept.memberIds.length} Members</span>
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {dept.defaultRoles.length} Roles</span>
                        </div>
                    </div>
                ))}
                {departments.length === 0 && (
                    <div className="col-span-full p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                        <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No departments defined yet.</p>
                        <button onClick={handleCreate} className="mt-4 text-indigo-600 font-bold hover:underline">Create First Department</button>
                    </div>
                )}
            </div>

            {isEditOpen && editingDept && (
                <Modal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    title={departments.find(d => d.id === editingDept.id) ? 'Edit Department' : 'Create Department'}
                    size="md"
                >
                    <div className="space-y-4 p-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
                            <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Creative" value={editingDept.name} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase" placeholder="e.g. CRE" value={editingDept.code} onChange={e => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="flex items-end pb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={editingDept.isActive} onChange={e => setEditingDept({ ...editingDept, isActive: e.target.checked })} className="rounded text-indigo-600 w-4 h-4" />
                                    <span className="text-sm text-slate-700">Active?</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" placeholder="Department description..." value={editingDept.description} onChange={e => setEditingDept({ ...editingDept, description: e.target.value })} />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
                            <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Department</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DepartmentsManager;
