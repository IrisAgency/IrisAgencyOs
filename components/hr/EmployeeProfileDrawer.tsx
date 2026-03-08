import React, { useState } from 'react';
import { User, EmployeeProfile, EmploymentType, EmploymentStatus, WorkMode, RoleDefinition, DepartmentDefinition, Team } from '../../types';
import { X, Save, UserCircle, Building2, Briefcase, Calendar, Phone, Mail, MapPin, Shield, AlertTriangle } from 'lucide-react';
import HRStatusBadge from './HRStatusBadge';
import Modal from '../common/Modal';

interface EmployeeProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  users: User[];
  employeeProfiles: EmployeeProfile[];
  roles: RoleDefinition[];
  departments: DepartmentDefinition[];
  teams: Team[];
  checkPermission?: (code: string) => boolean;
  onCreateEmployeeProfile: (profile: EmployeeProfile) => void;
  onUpdateEmployeeProfile: (profile: EmployeeProfile) => void;
  onUpdateUser: (user: User) => void;
  currentUser?: User;
}

const EMPLOYMENT_TYPES: EmploymentType[] = ['full-time', 'part-time', 'freelancer', 'contractor', 'intern'];
const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['active', 'probation', 'on-leave', 'suspended', 'resigned', 'terminated'];
const WORK_MODES: WorkMode[] = ['on-site', 'hybrid', 'remote'];

const EmployeeProfileDrawer: React.FC<EmployeeProfileDrawerProps> = ({
  isOpen,
  onClose,
  userId,
  users,
  employeeProfiles,
  roles,
  departments,
  teams,
  checkPermission,
  onCreateEmployeeProfile,
  onUpdateEmployeeProfile,
  onUpdateUser,
  currentUser,
}) => {
  const user = users.find(u => u.id === userId);
  const existingProfile = employeeProfiles.find(ep => ep.userId === userId);
  const canEdit = checkPermission?.('hr.employees.edit') || currentUser?.id === userId;

  const [isEditing, setIsEditing] = useState(!existingProfile);
  const [profile, setProfile] = useState<Partial<EmployeeProfile>>(existingProfile || {
    userId,
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profilePhoto: user?.avatar || '',
    departmentId: '',
    jobTitle: user?.jobTitle || user?.role || '',
    employmentType: 'full-time' as EmploymentType,
    employmentStatus: 'active' as EmploymentStatus,
    joinDate: user?.dateJoined || new Date().toISOString().split('T')[0],
    workMode: 'on-site' as WorkMode,
    workLocation: user?.location || '',
  });

  if (!isOpen || !user) return null;

  const handleSave = () => {
    const now = new Date().toISOString();
    if (existingProfile) {
      onUpdateEmployeeProfile({
        ...existingProfile,
        ...profile,
        updatedAt: now,
        updatedBy: currentUser?.id || '',
      } as EmployeeProfile);
    } else {
      onCreateEmployeeProfile({
        id: `emp_${userId}`,
        userId,
        fullName: profile.fullName || user.name,
        preferredName: profile.preferredName,
        email: profile.email || user.email || '',
        phone: profile.phone || user.phone,
        profilePhoto: profile.profilePhoto || user.avatar,
        departmentId: profile.departmentId || '',
        teamId: profile.teamId,
        roleId: profile.roleId || user.roleId,
        jobTitle: profile.jobTitle || user.jobTitle || user.role,
        directManagerId: profile.directManagerId,
        employmentType: profile.employmentType || 'full-time',
        employmentStatus: profile.employmentStatus || 'active',
        joinDate: profile.joinDate || new Date().toISOString().split('T')[0],
        probationEndDate: profile.probationEndDate,
        contractStartDate: profile.contractStartDate,
        contractEndDate: profile.contractEndDate,
        workLocation: profile.workLocation,
        workMode: profile.workMode || 'on-site',
        salaryGrade: profile.salaryGrade,
        nationalId: profile.nationalId,
        emergencyContact: profile.emergencyContact,
        bankReference: profile.bankReference,
        notes: profile.notes,
        createdAt: now,
        updatedAt: now,
        updatedBy: currentUser?.id || '',
      } as EmployeeProfile);
    }
    setIsEditing(false);
  };

  const managers = users.filter(u => u.id !== userId && u.status !== 'inactive');
  const deptTeams = teams.filter(t => t.departmentId === profile.departmentId && t.isActive);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Profile" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-iris-white/10">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-iris-white/10">
            <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-iris-white">{user.name}</h3>
            <p className="text-sm text-iris-red">{user.jobTitle || user.role}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs bg-iris-black/60 text-iris-white/50 px-2 py-0.5 rounded-full border border-iris-white/10">{user.department}</span>
              {existingProfile && <HRStatusBadge status={existingProfile.employmentStatus} />}
              {user.employeeCode && <span className="text-xs text-iris-white/40">{user.employeeCode}</span>}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-iris-red/20 text-iris-red rounded-lg text-sm font-medium hover:bg-iris-red/30"
            >
              {isEditing ? <><Save className="w-4 h-4" /> Save</> : <><Briefcase className="w-4 h-4" /> Edit</>}
            </button>
          )}
        </div>

        {/* Form Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Personal Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2"><UserCircle className="w-4 h-4 text-iris-red" /> Personal Information</h4>
            <div>
              <label className="text-xs text-iris-white/50">Full Name</label>
              <input disabled={!isEditing} value={profile.fullName || ''} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Preferred Name</label>
              <input disabled={!isEditing} value={profile.preferredName || ''} onChange={e => setProfile(p => ({ ...p, preferredName: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Email</label>
              <input disabled={!isEditing} value={profile.email || ''} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Phone</label>
              <input disabled={!isEditing} value={profile.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">National ID / Reference</label>
              <input disabled={!isEditing} value={profile.nationalId || ''} onChange={e => setProfile(p => ({ ...p, nationalId: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
          </div>

          {/* Employment Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2"><Briefcase className="w-4 h-4 text-iris-red" /> Employment Details</h4>
            <div>
              <label className="text-xs text-iris-white/50">Job Title</label>
              <input disabled={!isEditing} value={profile.jobTitle || ''} onChange={e => setProfile(p => ({ ...p, jobTitle: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-iris-white/50">Employment Type</label>
                <select disabled={!isEditing} value={profile.employmentType || 'full-time'} onChange={e => setProfile(p => ({ ...p, employmentType: e.target.value as EmploymentType }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none">
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-iris-white/50">Status</label>
                <select disabled={!isEditing} value={profile.employmentStatus || 'active'} onChange={e => setProfile(p => ({ ...p, employmentStatus: e.target.value as EmploymentStatus }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none">
                  {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Department</label>
              <select disabled={!isEditing} value={profile.departmentId || ''} onChange={e => setProfile(p => ({ ...p, departmentId: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none">
                <option value="">Select Department</option>
                {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {deptTeams.length > 0 && (
              <div>
                <label className="text-xs text-iris-white/50">Team</label>
                <select disabled={!isEditing} value={profile.teamId || ''} onChange={e => setProfile(p => ({ ...p, teamId: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none">
                  <option value="">No Team</option>
                  {deptTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-iris-white/50">Direct Manager</label>
              <select disabled={!isEditing} value={profile.directManagerId || ''} onChange={e => setProfile(p => ({ ...p, directManagerId: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none">
                <option value="">No Manager Assigned</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.jobTitle || m.role}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dates & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2"><Calendar className="w-4 h-4 text-iris-red" /> Dates</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-iris-white/50">Join Date</label>
                <input type="date" disabled={!isEditing} value={profile.joinDate || ''} onChange={e => setProfile(p => ({ ...p, joinDate: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-iris-white/50">Probation End</label>
                <input type="date" disabled={!isEditing} value={profile.probationEndDate || ''} onChange={e => setProfile(p => ({ ...p, probationEndDate: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-iris-white/50">Contract Start</label>
                <input type="date" disabled={!isEditing} value={profile.contractStartDate || ''} onChange={e => setProfile(p => ({ ...p, contractStartDate: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-iris-white/50">Contract End</label>
                <input type="date" disabled={!isEditing} value={profile.contractEndDate || ''} onChange={e => setProfile(p => ({ ...p, contractEndDate: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2"><MapPin className="w-4 h-4 text-iris-red" /> Work Location</h4>
            <div>
              <label className="text-xs text-iris-white/50">Work Mode</label>
              <select disabled={!isEditing} value={profile.workMode || 'on-site'} onChange={e => setProfile(p => ({ ...p, workMode: e.target.value as WorkMode }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none">
                {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Location</label>
              <input disabled={!isEditing} value={profile.workLocation || ''} onChange={e => setProfile(p => ({ ...p, workLocation: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" placeholder="e.g. New York Office" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Salary Grade / Band</label>
              <input disabled={!isEditing} value={profile.salaryGrade || ''} onChange={e => setProfile(p => ({ ...p, salaryGrade: e.target.value }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" placeholder="e.g. Grade 5" />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-iris-red" /> Emergency Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-iris-white/50">Name</label>
              <input disabled={!isEditing} value={profile.emergencyContact?.name || ''} onChange={e => setProfile(p => ({ ...p, emergencyContact: { ...p.emergencyContact, name: e.target.value, relationship: p.emergencyContact?.relationship || '', phone: p.emergencyContact?.phone || '' } }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Relationship</label>
              <input disabled={!isEditing} value={profile.emergencyContact?.relationship || ''} onChange={e => setProfile(p => ({ ...p, emergencyContact: { ...p.emergencyContact, name: p.emergencyContact?.name || '', relationship: e.target.value, phone: p.emergencyContact?.phone || '' } }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-iris-white/50">Phone</label>
              <input disabled={!isEditing} value={profile.emergencyContact?.phone || ''} onChange={e => setProfile(p => ({ ...p, emergencyContact: { ...p.emergencyContact, name: p.emergencyContact?.name || '', relationship: p.emergencyContact?.relationship || '', phone: e.target.value } }))} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-xs text-iris-white/50">Notes</label>
          <textarea disabled={!isEditing} value={profile.notes || ''} onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white disabled:opacity-60 focus:ring-1 focus:ring-iris-red focus:outline-none resize-none" />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeProfileDrawer;
