
import React, { useState } from 'react';
import { User, UserRole, Department, Task, LeaveRequest, AttendanceRecord, UserStatus, RoleDefinition, Project } from '../types';
import {
    Mail, Phone, MapPin, Plus, Search, User as UserIcon, Briefcase,
    Calendar, Clock, CheckCircle, AlertCircle, BarChart2, Activity,
    MoreHorizontal, Filter, X, Copy, Trash2, CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './common/Modal';
import DataTable, { Column } from './common/DataTable';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

interface TeamHubProps {
    users: User[];
    tasks?: Task[]; // Needed for workload/performance
    leaveRequests: LeaveRequest[];
    attendanceRecords: AttendanceRecord[];
    roles?: RoleDefinition[];
    departments?: any[];
    projects?: Project[];
    checkPermission?: (code: string) => boolean;
    currentUser?: User;
    onAddUser?: (user: User) => void;
    onUpdateUser: (user: User) => void;
    onAddLeaveRequest: (req: LeaveRequest) => void;
    onUpdateLeaveRequest: (req: LeaveRequest) => void;
    onDeleteLeaveRequest?: (id: string) => void;
    onClockIn?: () => void;
    onClockOut?: () => void;
    onAddDepartment?: (dept: any) => void;
    onUpdateDepartment?: (dept: any) => void;
    onDeleteDepartment?: (id: string) => void;
}

const TeamHub: React.FC<TeamHubProps> = ({
    users = [], 
    tasks = [], 
    leaveRequests = [], 
    attendanceRecords = [], 
    roles = [],
    onAddUser, 
    onUpdateUser, 
    onAddLeaveRequest, 
    onUpdateLeaveRequest
}) => {
    const [activeTab, setActiveTab] = useState<'Directory' | 'Workload' | 'Performance' | 'Time & Leaves'>('Directory');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'User' | 'Leave'>('User');
    const [searchTerm, setSearchTerm] = useState('');
    const { inviteUser } = useAuth();

    // Form State (User)
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState<UserRole>(UserRole.DESIGNER);
    const [userDept, setUserDept] = useState<Department>(Department.CREATIVE);
    const [userEmail, setUserEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [pendingInvite, setPendingInvite] = useState<{ name: string; email: string; password: string } | null>(null);
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    // Form State (Leave)
    const [leaveType, setLeaveType] = useState('annual');
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveReason, setLeaveReason] = useState('');

    // --- Helpers ---

    const getStatusColor = (status: UserStatus | undefined) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'inactive': return 'bg-slate-100 text-slate-500';
            case 'on_leave': return 'bg-amber-100 text-amber-700';
            default: return 'bg-emerald-100 text-emerald-700';
        }
    };

    const getActiveTaskCount = (userId: string) => {
        return tasks.filter(t => (t.assigneeIds || []).includes(userId) && t.status !== 'completed' && t.status !== 'archived').length;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');

        if (!inviteUser) {
            setInviteError('Invites are not available.');
            return;
        }

        setInviteLoading(true);

        try {
            const result = await inviteUser({
                name: userName,
                email: userEmail,
                role: userRole,
                department: userDept,
                jobTitle: userRole
            });

            setPendingInvite({ name: userName, email: userEmail, password: result.tempPassword });
            setCopiedPassword(false);
            // Keep modal open to show password
            setUserName('');
            setUserEmail('');
        } catch (err: any) {
            console.error(err);
            setInviteError(err.message || 'Could not create user. Please try again.');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopyPassword = async () => {
        if (!pendingInvite) return;
        try {
            await navigator.clipboard.writeText(pendingInvite.password);
            setCopiedPassword(true);
            setTimeout(() => setCopiedPassword(false), 2000);
        } catch (error) {
            console.error('Failed to copy password:', error);
        }
    };

    const handleRemoveUser = (user: User) => {
        if (window.confirm(`Are you sure you want to remove ${user.name}? They will no longer be able to log in.`)) {
            onUpdateUser({ ...user, status: 'inactive' });
            setActiveMenuUserId(null);
        }
    };

    const handleRequestLeave = (e: React.FormEvent) => {
        e.preventDefault();
        // Mocking current user as 'u1' for now, or select user in a real admin view
        const req: LeaveRequest = {
            id: `lr${Date.now()}`,
            userId: 'u1', // Default to admin for demo
            startDate: leaveStart,
            endDate: leaveEnd,
            type: leaveType as any,
            reason: leaveReason,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        onAddLeaveRequest(req);
        setIsModalOpen(false);
        setLeaveReason('');
        setLeaveStart('');
        setLeaveEnd('');
    };

    // --- Views ---

    const DirectoryView = () => {
        const filteredUsers = users.filter(u =>
            u && u.name &&
            (showInactive || u.status !== 'inactive') &&
            (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase())))
        );

        return (
            <>
                <div className="flex items-center justify-between mb-6">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/40" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search employees by name or role..."
                            className="w-full pl-10 pr-4 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white placeholder:text-iris-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50"
                        />
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="showInactive"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="rounded border-iris-white/10 text-iris-red focus:ring-iris-red bg-iris-black/80"
                        />
                        <label htmlFor="showInactive" className="text-sm text-iris-white/70 cursor-pointer select-none">Show Inactive</label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-in fade-in duration-300">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className={`bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 p-4 md:p-6 shadow-sm hover:shadow-md hover:border-iris-red/40 transition-all flex flex-col items-center text-center group relative ${user.status === 'inactive' ? 'opacity-60 grayscale' : ''}`}>
                            <div className={`absolute top-4 right-4 ${activeMenuUserId === user.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                <div className="relative">
                                    <button onClick={() => setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)} className="text-iris-white/70 hover:text-iris-red"><MoreHorizontal className="w-5 h-5" /></button>
                                    {activeMenuUserId === user.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-iris-black/95 backdrop-blur-sm rounded-lg shadow-lg border border-iris-white/10 py-1 z-10 text-left">
                                            {user.status !== 'inactive' ? (
                                                <button
                                                    onClick={() => handleRemoveUser(user)}
                                                    className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Remove User
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { onUpdateUser({ ...user, status: 'active' }); setActiveMenuUserId(null); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Reactivate User
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mb-3 md:mb-4 ring-4 ring-iris-white/10 relative">
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="font-bold text-iris-white text-sm md:text-base">{user.name}</h3>
                            <p className="text-iris-red text-xs md:text-sm font-medium mb-1">{user.jobTitle || user.role || 'No Role'}</p>
                            <div className="flex gap-2 mb-4">
                                <span className="bg-iris-black/95 text-iris-white/70 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border border-iris-white/10">{user.department}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${getStatusColor(user.status)}`}>
                                    {user.status || 'active'}
                                </span>
                            </div>

                            <div className="w-full border-t border-iris-white/10 pt-4 mt-auto space-y-2">
                                <div className="flex items-center justify-center gap-2 text-sm text-iris-white/70">
                                    <Mail className="w-3.5 h-3.5 text-iris-white/40" /> <span className="ltr-text">{user.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm text-iris-white/70">
                                    <Phone className="w-3.5 h-3.5 text-iris-white/40" /> <span className="ltr-text">{user.phone || 'No phone'}</span>
                                </div>
                                {user.location && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-iris-white/70">
                                        <MapPin className="w-3.5 h-3.5 text-iris-white/40" /> {user.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    const WorkloadView = () => {
        // Calculate workload stats
        const workloadData = users.map(u => {
            const active = getActiveTaskCount(u.id);
            const completed = tasks.filter(t => (t.assigneeIds || []).includes(u.id) && t.status === 'completed').length;
            return { user: u, active, completed };
        }).sort((a, b) => b.active - a.active);

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-iris-white/10">
                        <h3 className="font-bold text-iris-white">Current Workload Distribution</h3>
                        <p className="text-sm text-iris-white/70">Active tasks per team member</p>
                    </div>
                    <div className="p-6 space-y-6">
                        {workloadData.map(item => (
                            <div key={item.user.id}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <img src={item.user.avatar} className="w-8 h-8 rounded-full" />
                                        <div>
                                            <p className="font-medium text-iris-white text-sm">{item.user.name}</p>
                                            <p className="text-xs text-iris-white/70">{item.user.jobTitle}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${item.active > 5 ? 'text-rose-400' : 'text-iris-white'}`}><span className="ltr-text">{item.active}</span> Tasks</span>
                                    </div>
                                </div>
                                <div className="w-full bg-iris-black/95 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full ${item.active > 5 ? 'bg-rose-500' : item.active > 2 ? 'bg-iris-red' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min((item.active / 10) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const PerformanceView = () => {
        // Mock performance calculation
        const performanceData = users.map(u => {
            const totalAssigned = tasks.filter(t => (t.assigneeIds || []).includes(u.id)).length;
            const completed = tasks.filter(t => (t.assigneeIds || []).includes(u.id) && t.status === 'completed').length;
            const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
            // Mock on-time rate based on user ID for variety
            const onTimeRate = 70 + (parseInt(u.id.replace('u', '')) * 5) % 30;

            return { user: u, totalAssigned, completed, completionRate, onTimeRate };
        });

        return (
            <div className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 shadow-sm p-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {performanceData.map(data => (
                        <div key={data.user.id} className="p-4 bg-iris-black/95 rounded-lg border border-iris-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <img src={data.user.avatar} className="w-10 h-10 rounded-full flex-shrink-0" alt="" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-iris-white truncate">{data.user.name}</p>
                                    <p className="text-xs text-iris-white/70">{data.user.department}</p>
                                </div>
                                {data.completionRate > 80 && (
                                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-400/40">
                                        <Activity className="w-3 h-3" /> Top
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-iris-white/70">Tasks Assigned</span>
                                        <span className="text-sm font-mono font-semibold text-iris-white ltr-text">{data.totalAssigned}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-iris-white/70">Completion Rate</span>
                                        <span className="text-xs font-semibold text-iris-white ltr-text">{data.completionRate}%</span>
                                    </div>
                                    <div className="bg-iris-black rounded-full h-2">
                                        <div className="bg-iris-red h-2 rounded-full transition-all" style={{ width: `${data.completionRate}%` }}></div>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-iris-white/70">On-Time Delivery</span>
                                        <span className="text-xs font-semibold text-iris-white ltr-text">{data.onTimeRate}%</span>
                                    </div>
                                    <div className="bg-iris-black rounded-full h-2">
                                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${data.onTimeRate}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const LeavesView = () => {
        const handleApprove = (req: LeaveRequest) => {
            onUpdateLeaveRequest({ ...req, status: 'approved', approverId: 'u1' });
            // Also update user status
            const user = users.find(u => u.id === req.userId);
            if (user) onUpdateUser({ ...user, status: 'on_leave' });
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in duration-300">
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    <div className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-iris-white/10 flex justify-between items-center bg-iris-black/95">
                            <h3 className="font-bold text-iris-white">Leave Requests</h3>
                            <button onClick={() => { setModalType('Leave'); setIsModalOpen(true); }} className="text-xs text-iris-red font-medium hover:text-iris-red/80">+ Request Leave</button>
                        </div>
                        <div className="divide-y divide-iris-white/10">
                            {leaveRequests.map(req => {
                                const user = users.find(u => u.id === req.userId);
                                return (
                                    <div key={req.id} className="p-4 hover:bg-iris-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center w-12 bg-iris-black/95 rounded p-1 border border-iris-white/10">
                                                <p className="text-xs text-iris-white/70 uppercase font-bold ltr-text">{new Date(req.startDate).toLocaleString('default', { month: 'short' })}</p>
                                                <p className="text-lg font-bold text-iris-white leading-none ltr-text">{new Date(req.startDate).getDate()}</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-iris-white text-sm">{user?.name} <span className="font-normal text-iris-white/70">requested {req.type} leave</span></p>
                                                <p className="text-xs text-iris-white/70"><span className="ltr-text">{new Date(req.startDate).toLocaleDateString()}</span> - <span className="ltr-text">{new Date(req.endDate).toLocaleDateString()}</span> • "{req.reason}"</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {req.status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleApprove(req)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded"><CheckCircle className="w-5 h-5" /></button>
                                                    <button className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded"><X className="w-5 h-5" /></button>
                                                </>
                                            ) : (
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {leaveRequests.length === 0 && <div className="p-8 text-center text-iris-white/70">No active leave requests.</div>}
                        </div>
                    </div>
                </div>

                <div className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 shadow-sm p-4 h-fit">
                    <h3 className="font-bold text-iris-white mb-4">Who's Out Today?</h3>
                    <div className="space-y-3">
                        {users.filter(u => u.status === 'on_leave').map(u => (
                            <div key={u.id} className="flex items-center gap-3">
                                <img src={u.avatar} className="w-8 h-8 rounded-full grayscale" />
                                <div>
                                    <p className="text-sm font-medium text-iris-white">{u.name}</p>
                                    <p className="text-xs text-iris-white/70">Return: TBD</p>
                                </div>
                            </div>
                        ))}
                        {users.filter(u => u.status === 'on_leave').length === 0 && <p className="text-sm text-iris-white/70 italic">Everyone is present.</p>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PageContainer>
            <PageHeader
                title="Team & HR"
                subtitle="Directory, performance, and workload management."
                actions={
                    <button
                        onClick={() => { setModalType('User'); setInviteError(''); setAdminPassword(''); setIsModalOpen(true); }}
                        className="flex items-center space-x-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Employee</span>
                    </button>
                }
            />

            <div className="border-b border-iris-white/10">
                <nav className="flex space-x-6">
                    {['Directory', 'Workload', 'Performance', 'Time & Leaves'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-iris-red text-iris-red' : 'border-transparent text-iris-white/70 hover:text-iris-white'
                                }`}
                        >
                            {tab === 'Directory' && <UserIcon className="w-4 h-4" />}
                            {tab === 'Workload' && <Briefcase className="w-4 h-4" />}
                            {tab === 'Performance' && <BarChart2 className="w-4 h-4" />}
                            {tab === 'Time & Leaves' && <Calendar className="w-4 h-4" />}
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <PageContent>
                {activeTab === 'Directory' && (
                    <>
                        <div className="relative max-w-md mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/40" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search employees by name or role..."
                                className="w-full pl-10 pr-4 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white placeholder:text-iris-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50"
                            />
                        </div>
                        <DirectoryView />
                    </>
                )}
                {activeTab === 'Workload' && <WorkloadView />}
                {activeTab === 'Performance' && <PerformanceView />}
                {activeTab === 'Time & Leaves' && <LeavesView />}
            </PageContent>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setInviteLoading(false); setInviteError(''); }}
                title={modalType === 'User' ? 'Onboard New Member' : 'Request Leave'}
                size="md"
            >

                {modalType === 'User' ? (
                    pendingInvite ? (
                        <div className="p-1 space-y-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-iris-white">User Created Successfully</h3>
                                <p className="text-sm text-iris-white/70 mt-1">Share these credentials with {pendingInvite.name}</p>
                            </div>

                            {inviteError && (
                                <div className="bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg p-3 text-sm flex items-start gap-2 text-left">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Attention:</p>
                                        <p>{inviteError}</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-iris-black/80 border border-iris-white/10 rounded-xl p-4 text-left">
                                <div className="mb-3">
                                    <p className="text-xs text-iris-white/40 uppercase font-bold mb-1">Email</p>
                                    <p className="font-medium text-iris-white">{pendingInvite.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-iris-white/40 uppercase font-bold mb-1">Temporary Password</p>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-iris-black/95 border border-iris-white/10 px-3 py-1.5 rounded text-lg font-mono text-iris-red font-bold flex-1">
                                            {pendingInvite.password}
                                        </code>
                                        <button
                                            onClick={handleCopyPassword}
                                            className="p-2 text-iris-white/40 hover:text-iris-red hover:bg-iris-red/10 rounded-lg transition-colors"
                                            title="Copy Password"
                                        >
                                            {copiedPassword ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-iris-white/40 mt-2">
                                        This password is valid for first login only. The user will be required to change it immediately.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => { setPendingInvite(null); setIsModalOpen(false); }}
                                className="w-full bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white py-2.5 rounded-lg font-medium hover:brightness-110 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-iris-white mb-1">Full Name</label>
                                <input required value={userName} onChange={e => setUserName(e.target.value)} type="text" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-iris-white mb-1">Email</label>
                                <input required value={userEmail} onChange={e => setUserEmail(e.target.value)} type="email" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-iris-white mb-1">Role</label>
                                    <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                                        {roles.map(role => (
                                            <option key={role.id} value={role.name}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-iris-white mb-1">Department</label>
                                    <select value={userDept} onChange={e => setUserDept(e.target.value as Department)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                                        {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            {inviteError && (
                                <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg p-3 text-sm">
                                    {inviteError}
                                </div>
                            )}
                            <div className="pt-2">
                                <button type="submit" disabled={inviteLoading} className="w-full bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white py-2.5 rounded-lg font-medium hover:brightness-110 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                                    {inviteLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
                                    <span>{inviteLoading ? 'Creating user...' : 'Create & Generate Password'}</span>
                                </button>
                            </div>
                        </form>
                    )
                ) : (
                    <form onSubmit={handleRequestLeave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-iris-white mb-1">Leave Type</label>
                            <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                                <option value="annual">Annual Leave</option>
                                <option value="sick">Sick Leave</option>
                                <option value="unpaid">Unpaid Leave</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-iris-white mb-1">Start Date</label>
                                <input type="date" required value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-iris-white mb-1">End Date</label>
                                <input type="date" required value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-iris-white mb-1">Reason</label>
                            <input type="text" required value={leaveReason} onChange={e => setLeaveReason(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white placeholder:text-iris-white/40 focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" placeholder="e.g. Family vacation" />
                        </div>
                        <div className="pt-2">
                            <button type="submit" className="w-full bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white py-2.5 rounded-lg font-medium hover:brightness-110 transition-all">Submit Request</button>
                        </div>
                    </form>
                )}
            </Modal>
        </PageContainer>
    );
};

export default TeamHub;
