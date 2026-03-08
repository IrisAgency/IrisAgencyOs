import React, { useState, useMemo } from 'react';
import { User, EmployeeProfile, Team, DepartmentDefinition } from '../../types';
import { Building2, Users, ChevronDown, ChevronRight, UserCircle, Plus, Trash2 } from 'lucide-react';
import HRStatusBadge from './HRStatusBadge';

interface OrgStructureViewProps {
  users: User[];
  employeeProfiles: EmployeeProfile[];
  teams: Team[];
  departments: DepartmentDefinition[];
  checkPermission?: (code: string) => boolean;
  onSelectEmployee: (userId: string) => void;
  onCreateTeam?: (team: Team) => void;
  onUpdateTeam?: (team: Team) => void;
}

interface DeptNode {
  department: DepartmentDefinition;
  teams: (Team & { members: (User & { profile?: EmployeeProfile })[] })[];
  unassigned: (User & { profile?: EmployeeProfile })[];
}

const OrgStructureView: React.FC<OrgStructureViewProps> = ({
  users,
  employeeProfiles,
  teams,
  departments,
  checkPermission,
  onSelectEmployee,
}) => {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(departments.map(d => d.id)));
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  const canManageOrg = checkPermission?.('hr.org.manage');

  const orgTree = useMemo<DeptNode[]>(() => {
    const activeUsers = users.filter(u => u.status !== 'inactive');

    return departments
      .filter(d => d.isActive)
      .map(dept => {
        const deptProfiles = employeeProfiles.filter(ep => ep.departmentId === dept.id);
        const deptUserIds = new Set(deptProfiles.map(ep => ep.userId));
        // Also include users with matching department name but no profile
        const deptUsers = activeUsers.filter(
          u => deptUserIds.has(u.id) || u.department === dept.name
        );
        const deptTeams = teams.filter(t => t.departmentId === dept.id && t.isActive);
        const teamMemberIds = new Set(deptTeams.flatMap(t => t.memberIds));

        const teamsWithMembers = deptTeams.map(team => ({
          ...team,
          members: team.memberIds
            .map(id => {
              const u = deptUsers.find(u => u.id === id);
              if (!u) return null;
              return { ...u, profile: employeeProfiles.find(ep => ep.userId === id) };
            })
            .filter(Boolean) as (User & { profile?: EmployeeProfile })[],
        }));

        const unassigned = deptUsers
          .filter(u => !teamMemberIds.has(u.id))
          .map(u => ({ ...u, profile: employeeProfiles.find(ep => ep.userId === u.id) }));

        return { department: dept, teams: teamsWithMembers, unassigned };
      })
      .sort((a, b) => a.department.name.localeCompare(b.department.name));
  }, [users, employeeProfiles, teams, departments]);

  const toggleDept = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleTeam = (id: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalEmployees = users.filter(u => u.status !== 'inactive').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-iris-white">Organization Structure</h3>
          <p className="text-xs text-iris-white/50">{departments.filter(d => d.isActive).length} departments · {teams.filter(t => t.isActive).length} teams · {totalEmployees} employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tree')} className={`px-3 py-1 rounded-lg text-xs font-medium ${viewMode === 'tree' ? 'bg-iris-red/20 text-iris-red' : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'}`}>
            Tree View
          </button>
          <button onClick={() => setViewMode('flat')} className={`px-3 py-1 rounded-lg text-xs font-medium ${viewMode === 'flat' ? 'bg-iris-red/20 text-iris-red' : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'}`}>
            Flat View
          </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div className="space-y-2">
          {orgTree.map(node => (
            <div key={node.department.id} className="bg-iris-black/60 border border-iris-white/10 rounded-xl overflow-hidden">
              {/* Department Header */}
              <button
                onClick={() => toggleDept(node.department.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-iris-white/5 transition"
              >
                {expandedDepts.has(node.department.id) ? <ChevronDown className="w-4 h-4 text-iris-red" /> : <ChevronRight className="w-4 h-4 text-iris-white/40" />}
                <Building2 className="w-5 h-5 text-iris-red" />
                <div className="flex-1 text-left">
                  <span className="font-bold text-iris-white">{node.department.name}</span>
                  <span className="ml-2 text-xs text-iris-white/40">
                    {node.teams.reduce((sum, t) => sum + t.members.length, 0) + node.unassigned.length} members
                  </span>
                </div>
                <span className="text-xs text-iris-white/30">{node.teams.length} teams</span>
              </button>

              {expandedDepts.has(node.department.id) && (
                <div className="px-4 pb-3 space-y-2 ml-6 border-l border-iris-white/5">
                  {/* Teams */}
                  {node.teams.map(team => (
                    <div key={team.id} className="space-y-1">
                      <button
                        onClick={() => toggleTeam(team.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-iris-white/5 transition"
                      >
                        {expandedTeams.has(team.id) ? <ChevronDown className="w-3.5 h-3.5 text-iris-red" /> : <ChevronRight className="w-3.5 h-3.5 text-iris-white/40" />}
                        <Users className="w-4 h-4 text-iris-red/80" />
                        <span className="text-sm font-medium text-iris-white">{team.name}</span>
                        <span className="text-xs text-iris-white/40">{team.members.length}</span>
                        {team.leadId && (
                          <span className="ml-auto text-xs text-iris-white/30">
                            Lead: {users.find(u => u.id === team.leadId)?.name || '—'}
                          </span>
                        )}
                      </button>
                      {expandedTeams.has(team.id) && (
                        <div className="ml-8 space-y-1">
                          {team.members.map(m => (
                            <button key={m.id} onClick={() => onSelectEmployee(m.id)} className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-iris-white/5 text-left transition">
                              <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&size=24`} alt="" className="w-6 h-6 rounded-full" />
                              <span className="text-sm text-iris-white flex-1">{m.name}</span>
                              <span className="text-xs text-iris-white/40">{m.jobTitle || m.role}</span>
                              {m.profile && <HRStatusBadge status={m.profile.employmentStatus} size="sm" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Unassigned */}
                  {node.unassigned.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-xs text-iris-white/30 px-3">No Team Assigned</span>
                      {node.unassigned.map(m => (
                        <button key={m.id} onClick={() => onSelectEmployee(m.id)} className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-iris-white/5 text-left transition">
                          <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&size=24`} alt="" className="w-6 h-6 rounded-full" />
                          <span className="text-sm text-iris-white flex-1">{m.name}</span>
                          <span className="text-xs text-iris-white/40">{m.jobTitle || m.role}</span>
                          {m.profile && <HRStatusBadge status={m.profile.employmentStatus} size="sm" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Flat View - simple grouped list */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {orgTree.map(node => (
            <div key={node.department.id} className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-iris-red" />
                <h4 className="text-sm font-bold text-iris-white">{node.department.name}</h4>
                <span className="ml-auto text-xs text-iris-white/40">{node.teams.reduce((s, t) => s + t.members.length, 0) + node.unassigned.length}</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {[...node.teams.flatMap(t => t.members), ...node.unassigned].map(m => (
                  <button key={m.id} onClick={() => onSelectEmployee(m.id)} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-iris-white/5 text-left transition">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&size=20`} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-xs text-iris-white truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgStructureView;
