import React, { useState } from 'react';
import { User, UserRole, Department } from '../../types';
import { UserPlus, Search, Edit2, Trash2, CheckCircle } from 'lucide-react';
import Modal from '../common/Modal';
import DataTable from '../common/DataTable';

interface UsersManagerProps {
    users: User[];
    onUpdateUser: (user: User) => void;
    onAddUser: (user: User) => void;
}

const UsersManager: React.FC<UsersManagerProps> = ({ users, onUpdateUser, onAddUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});

    const filteredUsers = users.filter(u => u && u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser.id) {
            onUpdateUser(editingUser as User);
        } else {
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

            <DataTable<User>
                data={filteredUsers}
                keyExtractor={u => u.id}
                columns={[
                    {
                        header: 'User',
                        cell: (user) => (
                            <div className="flex items-center gap-3">
                                <img src={user.avatar} className="w-8 h-8 rounded-full" />
                                <span className="font-medium">{user.name}</span>
                            </div>
                        )
                    },
                    { header: 'Role', accessorKey: 'role', className: 'text-slate-600' },
                    { header: 'Dept', accessorKey: 'department', className: 'text-slate-600' },
                    {
                        header: 'Status',
                        cell: (user) => <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : user.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>{user.status}</span>
                    },
                    {
                        header: 'Actions',
                        cell: (user) => (
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setEditingUser(user); setIsEditOpen(true); }} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Edit User"><Edit2 className="w-4 h-4" /></button>
                                {user.status !== 'inactive' ? (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to remove ${user.name}? They will be logged out immediately.`)) {
                                                onUpdateUser({ ...user, status: 'inactive' });
                                            }
                                        }}
                                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors"
                                        title="Deactivate User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onUpdateUser({ ...user, status: 'active' })}
                                        className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                                        title="Reactivate User"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ),
                        className: 'text-right'
                    }
                ]}
            />

            {isEditOpen && (
                <Modal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    title={editingUser.id ? 'Edit User' : 'Create User'}
                    size="md"
                >
                    <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input className="w-full px-3 py-2 border rounded-lg" value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="Name" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input className="w-full px-3 py-2 border rounded-lg" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="Email" required type="email" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={editingUser.role || ''}
                                onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                                required
                            >
                                <option value="">Select Role</option>
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={editingUser.department || ''}
                                onChange={e => setEditingUser({ ...editingUser, department: e.target.value as Department })}
                                required
                            >
                                <option value="">Select Department</option>
                                {Object.values(Department).map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
                            <button type="button" onClick={() => setIsEditOpen(false)} className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-50">Cancel</button>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Save User</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default UsersManager;
