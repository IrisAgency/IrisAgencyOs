
import React, { useState } from 'react';
import { User, UserRole, Department, Task, LeaveRequest, AttendanceRecord, UserStatus, RoleDefinition } from '../types';
import { 
    Mail, Phone, MapPin, Plus, Search, User as UserIcon, Briefcase, 
    Calendar, Clock, CheckCircle, AlertCircle, BarChart2, Activity,
    MoreHorizontal, Filter, X, Copy, Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TeamHubProps {
  users: User[];
  tasks: Task[]; // Needed for workload/performance
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  roles: RoleDefinition[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onAddLeaveRequest: (req: LeaveRequest) => void;
  onUpdateLeaveRequest: (req: LeaveRequest) => void;
}

const TeamHub: React.FC<TeamHubProps> = ({ 
  users, tasks, leaveRequests, attendanceRecords, roles,
  onAddUser, onUpdateUser, onAddLeaveRequest, onUpdateLeaveRequest 
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employees by name or role..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="ml-4 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="showInactive" 
                        checked={showInactive} 
                        onChange={(e) => setShowInactive(e.target.checked)} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="showInactive" className="text-sm text-slate-600 cursor-pointer select-none">Show Inactive</label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                {filteredUsers.map((user) => (
                <div key={user.id} className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group relative ${user.status === 'inactive' ? 'opacity-60 grayscale' : ''}`}>
                    <div className={`absolute top-4 right-4 ${activeMenuUserId === user.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        <div className="relative">
                            <button onClick={() => setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)} className="text-slate-400 hover:text-indigo-600"><MoreHorizontal className="w-5 h-5"/></button>
                            {activeMenuUserId === user.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-10 text-left">
                                    {user.status !== 'inactive' ? (
                                        <button 
                                            onClick={() => handleRemoveUser(user)}
                                            className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" /> Remove User
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => { onUpdateUser({ ...user, status: 'active' }); setActiveMenuUserId(null); }}
                                            className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Reactivate User
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-4 ring-4 ring-slate-50 relative">
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-bold text-slate-900">{user.name}</h3>
                    <p className="text-indigo-600 text-sm font-medium mb-1">{user.jobTitle || user.role || 'No Role'}</p>
                    <div className="flex gap-2 mb-4">
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">{user.department}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${getStatusColor(user.status)}`}>
                            {user.status || 'active'}
                        </span>
                    </div>
                    
                    <div className="w-full border-t border-slate-100 pt-4 mt-auto space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {user.email || 'No email'}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phone || 'No phone'}
                        </div>
                        {user.location && (
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {user.location}
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900">Current Workload Distribution</h3>
                      <p className="text-sm text-slate-500">Active tasks per team member</p>
                  </div>
                  <div className="p-6 space-y-6">
                      {workloadData.map(item => (
                          <div key={item.user.id}>
                              <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-3">
                                      <img src={item.user.avatar} className="w-8 h-8 rounded-full" />
                                      <div>
                                          <p className="font-medium text-slate-900 text-sm">{item.user.name}</p>
                                          <p className="text-xs text-slate-500">{item.user.jobTitle}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <span className={`text-sm font-bold ${item.active > 5 ? 'text-rose-600' : 'text-slate-700'}`}>{item.active} Tasks</span>
                                  </div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div 
                                    className={`h-2.5 rounded-full ${item.active > 5 ? 'bg-rose-500' : item.active > 2 ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
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
           const onTimeRate = 70 + (parseInt(u.id.replace('u','')) * 5) % 30; 
           
           return { user: u, totalAssigned, completed, completionRate, onTimeRate };
      });

      return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4 text-center">Tasks Assigned</th>
                          <th className="px-6 py-4 text-center">Completion Rate</th>
                          <th className="px-6 py-4 text-center">On-Time Delivery</th>
                          <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {performanceData.map(data => (
                          <tr key={data.user.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 flex items-center gap-3">
                                  <img src={data.user.avatar} className="w-8 h-8 rounded-full" />
                                  <div>
                                      <p className="font-medium text-slate-900">{data.user.name}</p>
                                      <p className="text-xs text-slate-500">{data.user.department}</p>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-center font-mono text-slate-600">{data.totalAssigned}</td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 justify-center">
                                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${data.completionRate}%` }}></div>
                                      </div>
                                      <span className="text-xs font-medium text-slate-700">{data.completionRate}%</span>
                                  </div>
                              </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 justify-center">
                                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${data.onTimeRate}%` }}></div>
                                      </div>
                                      <span className="text-xs font-medium text-slate-700">{data.onTimeRate}%</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  {data.completionRate > 80 ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                          <Activity className="w-3 h-3"/> Top Performer
                                      </span>
                                  ) : (
                                      <span className="text-xs text-slate-400">-</span>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-slate-900">Leave Requests</h3>
                          <button onClick={() => { setModalType('Leave'); setIsModalOpen(true); }} className="text-xs text-indigo-600 font-medium hover:underline">+ Request Leave</button>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {leaveRequests.map(req => {
                              const user = users.find(u => u.id === req.userId);
                              return (
                                  <div key={req.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                                      <div className="flex items-center gap-4">
                                          <div className="text-center w-12 bg-slate-100 rounded p-1">
                                              <p className="text-xs text-slate-500 uppercase font-bold">{new Date(req.startDate).toLocaleString('default', { month: 'short' })}</p>
                                              <p className="text-lg font-bold text-slate-800 leading-none">{new Date(req.startDate).getDate()}</p>
                                          </div>
                                          <div>
                                              <p className="font-bold text-slate-900 text-sm">{user?.name} <span className="font-normal text-slate-500">requested {req.type} leave</span></p>
                                              <p className="text-xs text-slate-500">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()} • "{req.reason}"</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {req.status === 'pending' ? (
                                              <>
                                                  <button onClick={() => handleApprove(req)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle className="w-5 h-5"/></button>
                                                  <button className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"><X className="w-5 h-5"/></button>
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
                          {leaveRequests.length === 0 && <div className="p-8 text-center text-slate-400">No active leave requests.</div>}
                      </div>
                  </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-fit">
                   <h3 className="font-bold text-slate-900 mb-4">Who's Out Today?</h3>
                   <div className="space-y-3">
                       {users.filter(u => u.status === 'on_leave').map(u => (
                           <div key={u.id} className="flex items-center gap-3">
                               <img src={u.avatar} className="w-8 h-8 rounded-full grayscale" />
                               <div>
                                   <p className="text-sm font-medium text-slate-700">{u.name}</p>
                                   <p className="text-xs text-slate-500">Return: TBD</p>
                               </div>
                           </div>
                       ))}
                       {users.filter(u => u.status === 'on_leave').length === 0 && <p className="text-sm text-slate-400 italic">Everyone is present.</p>}
                   </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team & HR</h1>
          <p className="text-slate-500 mt-1">Directory, performance, and workload management.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => { setModalType('User'); setInviteError(''); setAdminPassword(''); setIsModalOpen(true); }}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
            </button>
        </div>
      </div>

       <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['Directory', 'Workload', 'Performance', 'Time & Leaves'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Directory' && <UserIcon className="w-4 h-4"/>}
              {tab === 'Workload' && <Briefcase className="w-4 h-4"/>}
              {tab === 'Performance' && <BarChart2 className="w-4 h-4"/>}
              {tab === 'Time & Leaves' && <Calendar className="w-4 h-4"/>}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">
         {activeTab === 'Directory' && (
             <>
                <div className="relative max-w-md mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employees by name or role..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <DirectoryView />
             </>
         )}
         {activeTab === 'Workload' && <WorkloadView />}
         {activeTab === 'Performance' && <PerformanceView />}
         {activeTab === 'Time & Leaves' && <LeavesView />}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">
                  {modalType === 'User' ? 'Onboard New Member' : 'Request Leave'}
              </h2>
                            <button onClick={() => { setIsModalOpen(false); setInviteLoading(false); setInviteError(''); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            {modalType === 'User' ? (
                pendingInvite ? (
                    <div className="p-6 space-y-6 text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">User Created Successfully</h3>
                            <p className="text-sm text-slate-500 mt-1">Share these credentials with {pendingInvite.name}</p>
                        </div>
                        
                        {inviteError && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-sm flex items-start gap-2 text-left">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Attention:</p>
                                    <p>{inviteError}</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                            <div className="mb-3">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Email</p>
                                <p className="font-medium text-slate-900">{pendingInvite.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Temporary Password</p>
                                <div className="flex items-center gap-2">
                                    <code className="bg-white border border-slate-200 px-3 py-1.5 rounded text-lg font-mono text-indigo-600 font-bold flex-1">
                                        {pendingInvite.password}
                                    </code>
                                    <button 
                                        onClick={handleCopyPassword}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Copy Password"
                                    >
                                        {copiedPassword ? <CheckCircle className="w-5 h-5 text-emerald-500"/> : <Copy className="w-5 h-5"/>}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    This password is valid for first login only. The user will be required to change it immediately.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => { setPendingInvite(null); setIsModalOpen(false); }}
                            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input required value={userName} onChange={e => setUserName(e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input required value={userEmail} onChange={e => setUserEmail(e.target.value)} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {roles.map(role => (
                                    <option key={role.id} value={role.name}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <select value={userDept} onChange={e => setUserDept(e.target.value as Department)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    {inviteError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 text-sm">
                            {inviteError}
                        </div>
                    )}
                    <div className="pt-2">
                        <button type="submit" disabled={inviteLoading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                            {inviteLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
                            <span>{inviteLoading ? 'Creating user...' : 'Create & Generate Password'}</span>
                        </button>
                    </div>
                </form>
                )
            ) : (
                <form onSubmit={handleRequestLeave} className="p-6 space-y-4">
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                         <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                             <option value="annual">Annual Leave</option>
                             <option value="sick">Sick Leave</option>
                             <option value="unpaid">Unpaid Leave</option>
                             <option value="other">Other</option>
                         </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                            <input type="date" required value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                            <input type="date" required value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                        <input type="text" required value={leaveReason} onChange={e => setLeaveReason(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Family vacation"/>
                    </div>
                    <div className="pt-2">
                        <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Submit Request</button>
                    </div>
                </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamHub;
