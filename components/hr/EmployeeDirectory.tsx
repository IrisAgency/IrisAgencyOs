import React, { useState } from 'react';
import { User, EmployeeProfile, RoleDefinition, DepartmentDefinition } from '../../types';
import { Search, Mail, Phone, MapPin, MoreHorizontal, Trash2, CheckCircle, Eye, Building2, Filter } from 'lucide-react';
import HRStatusBadge from './HRStatusBadge';

interface EmployeeDirectoryProps {
  users: User[];
  employeeProfiles: EmployeeProfile[];
  roles: RoleDefinition[];
  departments: DepartmentDefinition[];
  currentUser?: User;
  checkPermission?: (code: string) => boolean;
  onViewProfile: (userId: string) => void;
  onUpdateUser: (user: User) => void;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  users,
  employeeProfiles,
  departments,
  currentUser,
  checkPermission,
  onViewProfile,
  onUpdateUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const getEmployeeProfile = (userId: string) => employeeProfiles.find(ep => ep.userId === userId);

  const filteredUsers = users.filter(u => {
    if (!u || !u.name) return false;
    if (!showInactive && u.status === 'inactive') return false;
    const profile = getEmployeeProfile(u.id);
    if (selectedDept !== 'all') {
      const deptMatch = departments.find(d => d.id === selectedDept);
      if (deptMatch && u.department !== deptMatch.name && profile?.departmentId !== selectedDept) return false;
    }
    return (
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'inactive': return 'bg-slate-100 text-slate-500';
      case 'on_leave': return 'bg-amber-100 text-amber-700';
      default: return 'bg-emerald-100 text-emerald-700';
    }
  };

  const handleRemoveUser = (user: User) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      onUpdateUser({ ...user, status: 'inactive' });
      setActiveMenuUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, role, or email..."
            className="w-full pl-10 pr-4 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white placeholder:text-iris-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-2 focus:ring-iris-red focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.filter(d => d.isActive).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-iris-white/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-iris-white/10 text-iris-red focus:ring-iris-red bg-iris-black/80"
            />
            Show Inactive
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-iris-black/80 border border-iris-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-iris-white">{users.filter(u => u.status !== 'inactive').length}</p>
          <p className="text-xs text-iris-white/50">Active Employees</p>
        </div>
        <div className="bg-iris-black/80 border border-iris-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{users.filter(u => u.status === 'on_leave').length}</p>
          <p className="text-xs text-iris-white/50">On Leave</p>
        </div>
        <div className="bg-iris-black/80 border border-iris-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{employeeProfiles.filter(ep => ep.employmentStatus === 'probation').length}</p>
          <p className="text-xs text-iris-white/50">Probation</p>
        </div>
        <div className="bg-iris-black/80 border border-iris-white/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-iris-white">{departments.filter(d => d.isActive).length}</p>
          <p className="text-xs text-iris-white/50">Departments</p>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {filteredUsers.map((u) => {
          const profile = getEmployeeProfile(u.id);
          return (
            <div
              key={u.id}
              className={`bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 p-4 md:p-5 shadow-sm hover:shadow-md hover:border-iris-red/40 transition-all flex flex-col items-center text-center group relative cursor-pointer ${u.status === 'inactive' ? 'opacity-60 grayscale' : ''}`}
              onClick={() => onViewProfile(u.id)}
            >
              {/* Context Menu */}
              <div className={`absolute top-3 right-3 ${activeMenuUserId === u.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenuUserId(activeMenuUserId === u.id ? null : u.id); }}
                    className="text-iris-white/70 hover:text-iris-red"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {activeMenuUserId === u.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-iris-black/95 backdrop-blur-sm rounded-lg shadow-lg border border-iris-white/10 py-1 z-10 text-left">
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewProfile(u.id); setActiveMenuUserId(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-iris-white/70 hover:bg-iris-white/5 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> View Profile
                      </button>
                      {u.status !== 'inactive' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveUser(u); }}
                          className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateUser({ ...u, status: 'active' }); setActiveMenuUserId(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Avatar */}
              <div className="w-16 h-16 rounded-full overflow-hidden mb-3 ring-4 ring-iris-white/10">
                <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} alt={u.name} className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <h3 className="font-bold text-iris-white text-sm">{u.name}</h3>
              <p className="text-iris-red text-xs font-medium mb-1">{u.jobTitle || u.role || 'No Role'}</p>
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                <span className="bg-iris-black/95 text-iris-white/70 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border border-iris-white/10">
                  {u.department}
                </span>
                {profile?.employmentStatus ? (
                  <HRStatusBadge status={profile.employmentStatus} />
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${getStatusColor(u.status)}`}>
                    {u.status || 'active'}
                  </span>
                )}
                {profile?.employmentType && (
                  <span className="bg-iris-white/5 text-iris-white/50 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border border-iris-white/5">
                    {profile.employmentType}
                  </span>
                )}
              </div>

              {/* Contact */}
              <div className="w-full border-t border-iris-white/10 pt-3 mt-auto space-y-1.5">
                {u.email && (
                  <div className="flex items-center justify-center gap-2 text-xs text-iris-white/70">
                    <Mail className="w-3 h-3 text-iris-white/40" /> <span className="ltr-text truncate">{u.email}</span>
                  </div>
                )}
                {u.phone && (
                  <div className="flex items-center justify-center gap-2 text-xs text-iris-white/70">
                    <Phone className="w-3 h-3 text-iris-white/40" /> <span className="ltr-text">{u.phone}</span>
                  </div>
                )}
                {(profile?.workMode || u.location) && (
                  <div className="flex items-center justify-center gap-2 text-xs text-iris-white/70">
                    <MapPin className="w-3 h-3 text-iris-white/40" /> {profile?.workMode ? `${profile.workMode}${u.location ? ` • ${u.location}` : ''}` : u.location}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-iris-white/50">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No employees found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
