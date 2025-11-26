import React, { useState } from 'react';
import { Project, Client, User, ProjectMember, ProjectMilestone, ProjectActivityLog, ProjectStatus, ProjectType, AgencyFile, FileFolder, Freelancer, FreelancerAssignment, RateType, Task, ApprovalStep } from '../types';
import { Plus, Search, Calendar, DollarSign, Users, Briefcase, ChevronRight, Clock, Flag, ArrowLeft, MoreHorizontal, Settings, FileText, Activity, User as UserIcon, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import FilesHub from './FilesHub';

interface ProjectsHubProps {
  projects: Project[];
  clients: Client[];
  users: User[];
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  activityLogs: ProjectActivityLog[];
  files: AgencyFile[];
  folders: FileFolder[];
  freelancers: Freelancer[];
  assignments: FreelancerAssignment[];
  tasks: Task[]; // New
  approvalSteps: ApprovalStep[]; // New
  onAddProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onAddMember: (member: ProjectMember) => void;
  onAddMilestone: (milestone: ProjectMilestone) => void;
  onUpdateMilestone: (milestone: ProjectMilestone) => void;
  onUploadFile: (file: AgencyFile) => void;
  onCreateFolder: (folder: FileFolder) => void;
  onAddFreelancerAssignment: (assignment: FreelancerAssignment) => void;
  onRemoveMember: (memberId: string) => void;
  onRemoveFreelancerAssignment: (assignmentId: string) => void;
}

const ProjectsHub: React.FC<ProjectsHubProps> = ({ 
  projects, clients, users, members, milestones, activityLogs, files, folders, freelancers, assignments, tasks, approvalSteps,
  onAddProject, onUpdateProject, onAddMember, onAddMilestone, onUpdateMilestone, onUploadFile, onCreateFolder, onAddFreelancerAssignment,
  onRemoveMember, onRemoveFreelancerAssignment
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // List Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Creation Form State
  const [formName, setFormName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formType, setFormType] = useState<ProjectType>('campaign');
  const [formBudget, setFormBudget] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formManager, setFormManager] = useState('');
  const [formBrief, setFormBrief] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // --- Handlers ---

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === formClientId);
    if (!client) return;

    const newProject: Project = {
      id: `p${Date.now()}`,
      clientId: formClientId,
      client: client.name, // denormalized for ease
      name: formName,
      type: formType,
      status: 'planning',
      budget: Number(formBudget),
      spent: 0,
      currency: 'USD',
      startDate: formStart,
      endDate: formEnd,
      deadline: formEnd, // legacy mapping
      accountManagerId: formManager || client.accountManagerId, // default to client AM
      brief: formBrief,
      objectives: '',
      notes: '',
      thumbnail: `https://picsum.photos/seed/${Date.now()}/400/300`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onAddProject(newProject);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormClientId('');
    setFormBudget('');
    setFormStart('');
    setFormEnd('');
    setFormBrief('');
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.client.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'planning': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'on_hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // --- Render List View ---
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-500 mt-1">Manage campaigns, retainers, and production workflows.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Project Name</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Deadline</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const am = users.find(u => u.id === project.accountManagerId);
                return (
                  <tr 
                    key={project.id} 
                    onClick={() => { setSelectedProjectId(project.id); setViewMode('detail'); }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{project.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{project.code || 'NO-CODE'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{project.client}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{project.type.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      {am ? (
                         <div className="flex items-center space-x-2">
                           <img src={am.avatar} alt={am.name} className="w-6 h-6 rounded-full" />
                           <span>{am.name}</span>
                         </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                        {new Date(project.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No projects found.
            </div>
          )}
        </div>

        {/* Create Modal */}
        {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Start New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
                <input required value={formName} onChange={e => setFormName(e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                    <select required value={formClientId} onChange={e => setFormClientId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                       <option value="">Select Client</option>
                       {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select value={formType} onChange={e => setFormType(e.target.value as ProjectType)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                      <option value="campaign">Campaign</option>
                      <option value="retainer">Retainer</option>
                      <option value="one_time">One Time</option>
                      <option value="internal">Internal</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                   <input required value={formStart} onChange={e => setFormStart(e.target.value)} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                   <input required value={formEnd} onChange={e => setFormEnd(e.target.value)} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
                 <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                     <input value={formBudget} onChange={e => setFormBudget(e.target.value)} type="number" className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="0.00" />
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brief Summary</label>
                <textarea value={formBrief} onChange={e => setFormBrief(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" rows={3} placeholder="What is the main goal?" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Manager</label>
                 <select value={formManager} onChange={e => setFormManager(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">Auto-assign (Client AM)</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                 </select>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    );
  }

  // --- Render Detail View ---

  if (!selectedProject) return null;

  return (
    <ProjectDetailView 
      project={selectedProject} 
      onBack={() => { setViewMode('list'); setSelectedProjectId(null); }}
      users={users}
      members={members.filter(m => m.projectId === selectedProject.id)}
      milestones={milestones.filter(m => m.projectId === selectedProject.id)}
      logs={activityLogs.filter(l => l.projectId === selectedProject.id)}
      files={files}
      folders={folders}
      freelancers={freelancers}
      assignments={assignments.filter(a => a.projectId === selectedProject.id)}
      tasks={tasks.filter(t => t.projectId === selectedProject.id)}
      approvalSteps={approvalSteps}
      onUpdateProject={onUpdateProject}
      onAddMember={onAddMember}
      onAddFreelancerAssignment={onAddFreelancerAssignment}
      onRemoveMember={onRemoveMember}
      onRemoveFreelancerAssignment={onRemoveFreelancerAssignment}
      onAddMilestone={onAddMilestone}
      onUpdateMilestone={onUpdateMilestone}
      onUploadFile={onUploadFile}
      onCreateFolder={onCreateFolder}
      getStatusColor={getStatusColor}
    />
  );
};

// --- Sub-Component: Project Detail View ---

interface ProjectDetailProps {
  project: Project;
  users: User[];
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  logs: ProjectActivityLog[];
  files: AgencyFile[];
  folders: FileFolder[];
  freelancers: Freelancer[];
  assignments: FreelancerAssignment[];
  tasks: Task[];
  approvalSteps: ApprovalStep[];
  onBack: () => void;
  onUpdateProject: (p: Project) => void;
  onAddMember: (m: ProjectMember) => void;
  onAddFreelancerAssignment: (a: FreelancerAssignment) => void;
  onRemoveMember: (memberId: string) => void;
  onRemoveFreelancerAssignment: (assignmentId: string) => void;
  onAddMilestone: (m: ProjectMilestone) => void;
  onUpdateMilestone: (m: ProjectMilestone) => void;
  onUploadFile: (f: AgencyFile) => void;
  onCreateFolder: (f: FileFolder) => void;
  getStatusColor: (s: string) => string;
}

const ProjectDetailView: React.FC<ProjectDetailProps> = ({ 
  project, users, members, milestones, logs, files, folders, freelancers, assignments, tasks, approvalSteps, onBack, 
  onUpdateProject, onAddMember, onAddFreelancerAssignment, onRemoveMember, onRemoveFreelancerAssignment, onAddMilestone, onUpdateMilestone, onUploadFile, onCreateFolder, getStatusColor 
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Team' | 'Milestones' | 'Files' | 'Activity'>('Overview');
  
  // Status Change Handler
  const handleStatusChange = (newStatus: string) => {
    onUpdateProject({ ...project, status: newStatus as ProjectStatus, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
         <button onClick={onBack} className="text-slate-500 hover:text-indigo-600 flex items-center space-x-2 w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wide font-bold ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-slate-500">{project.client} • {project.type.replace('_', ' ')} • Due {new Date(project.endDate).toLocaleDateString()}</p>
          </div>
          
          <div className="flex items-center space-x-3">
             <select 
               value={project.status}
               onChange={(e) => handleStatusChange(e.target.value)}
               className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
             >
               <option value="planning">Planning</option>
               <option value="active">Active</option>
               <option value="on_hold">On Hold</option>
               <option value="completed">Completed</option>
               <option value="cancelled">Cancelled</option>
             </select>
             <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {['Overview', 'Team', 'Milestones', 'Files', 'Activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'Overview' && <OverviewTab project={project} />}
        {activeTab === 'Team' && <TeamTab project={project} members={members} users={users} freelancers={freelancers} assignments={assignments} onAddMember={onAddMember} onAddFreelancerAssignment={onAddFreelancerAssignment} onRemoveMember={onRemoveMember} onRemoveFreelancerAssignment={onRemoveFreelancerAssignment} />}
        {activeTab === 'Milestones' && <MilestonesTab project={project} milestones={milestones} users={users} tasks={tasks} approvalSteps={approvalSteps} onAdd={onAddMilestone} onUpdate={onUpdateMilestone} />}
        {activeTab === 'Files' && (
            <div className="h-[600px]">
                <FilesHub 
                    files={files} 
                    folders={folders} 
                    projects={[project]} 
                    users={users} 
                    currentProjectId={project.id}
                    onUpload={onUploadFile}
                    onDelete={() => {}} 
                    onMove={() => {}}
                    onCreateFolder={onCreateFolder}
                />
            </div>
        )}
        {activeTab === 'Activity' && <ActivityTab logs={logs} users={users} />}
      </div>
    </div>
  );
};

// --- Tabs Components ---

const OverviewTab = ({ project }: { project: Project }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="md:col-span-2 space-y-6">
       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Project Brief</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.brief || "No brief provided."}</p>
       </div>
       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Objectives</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.objectives || "No objectives listed."}</p>
       </div>
    </div>
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Key Info</h3>
          <div>
            <p className="text-xs text-slate-500 uppercase">Budget</p>
            <p className="font-medium text-slate-900">{project.currency} {project.budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Spent</p>
            <p className="font-medium text-slate-900">{project.currency} {project.spent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Start Date</p>
            <p className="font-medium text-slate-900">{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">End Date</p>
            <p className="font-medium text-slate-900">{new Date(project.endDate).toLocaleDateString()}</p>
          </div>
       </div>
    </div>
  </div>
);

const TeamTab = ({ project, members, users, freelancers, assignments, onAddMember, onAddFreelancerAssignment, onRemoveMember, onRemoveFreelancerAssignment }: { 
    project: Project, members: ProjectMember[], users: User[], 
    freelancers: Freelancer[], assignments: FreelancerAssignment[], 
    onAddMember: (m: ProjectMember) => void,
    onAddFreelancerAssignment: (a: FreelancerAssignment) => void,
    onRemoveMember: (memberId: string) => void, // New
    onRemoveFreelancerAssignment: (assignmentId: string) => void // New
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('');

  const [isFreelancerAddOpen, setIsFreelancerAddOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState('');
  const [freelancerRole, setFreelancerRole] = useState('');
  const [freelancerRate, setFreelancerRate] = useState(0);
  const [freelancerRateType, setFreelancerRateType] = useState<RateType>('hourly');

  const handleAdd = () => {
    if (!selectedUser || !role) return;
    onAddMember({
      id: `pm${Date.now()}`,
      projectId: project.id,
      userId: selectedUser,
      roleInProject: role,
      isExternal: false
    });
    setIsAddOpen(false);
    setSelectedUser('');
    setRole('');
  };

  const handleAddFreelancer = () => {
    if (!selectedFreelancer || !freelancerRole) return;
    const freelancer = freelancers.find(f => f.id === selectedFreelancer);
    if (!freelancer) return;

    onAddFreelancerAssignment({
      id: `fa-${Date.now()}`,
      projectId: project.id,
      freelancerId: selectedFreelancer,
      role: freelancerRole,
      agreedRate: freelancerRate,
      agreedRateType: freelancerRateType,
      currency: 'USD', // Or from project settings
      status: 'pending',
      notes: '',
    });
    setIsFreelancerAddOpen(false);
    setSelectedFreelancer('');
    setFreelancerRole('');
    setFreelancerRate(0);
    setFreelancerRateType('hourly');
  };

  return (
    <div className="space-y-6">
        {/* Internal Team */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Internal Team</h3>
                <button onClick={() => setIsAddOpen(true)} className="text-indigo-600 text-sm font-medium hover:bg-indigo-50 px-3 py-1 rounded">Add Member</button>
            </div>
            
            {isAddOpen && (
                <div className="p-4 border-b border-indigo-100 bg-indigo-50 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="text-xs font-bold text-indigo-800">User</label>
                    <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full mt-1 p-2 text-sm border rounded">
                    <option value="">Select...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-indigo-800">Role on Project</label>
                    <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Lead Editor" className="w-full mt-1 p-2 text-sm border rounded" />
                </div>
                <div className="flex space-x-2">
                    <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm">Save</button>
                    <button onClick={() => setIsAddOpen(false)} className="bg-white text-slate-600 px-4 py-2 rounded text-sm">Cancel</button>
                </div>
                </div>
            )}

            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Project Role</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {members.map(m => {
                    const user = users.find(u => u.id === m.userId);
                    if (!user) return null;
                    return (
                    <tr key={m.id}>
                        <td className="px-6 py-4 flex items-center space-x-3">
                        <img src={user.avatar} className="w-8 h-8 rounded-full" alt="" />
                        <span className="font-medium text-slate-900">{user.name}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{m.roleInProject}</td>
                        <td className="px-6 py-4 text-slate-500">{user.department}</td>
                        <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            Internal
                        </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => onRemoveMember(m.id)} className="text-slate-400 hover:text-rose-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                    );
                })}
                {members.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No members assigned.</td></tr>}
                </tbody>
            </table>
        </div>

        {/* External Freelancers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">External Freelancers</h3>
                <button onClick={() => setIsFreelancerAddOpen(true)} className="text-indigo-600 text-sm font-medium hover:bg-indigo-50 px-3 py-1 rounded">Assign Freelancer</button>
            </div>

            {isFreelancerAddOpen && (
                <div className="p-4 border-b border-indigo-100 bg-indigo-50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-indigo-800">Freelancer</label>
                            <select value={selectedFreelancer} onChange={e => {
                                const fId = e.target.value;
                                setSelectedFreelancer(fId);
                                const f = freelancers.find(fr => fr.id === fId);
                                if (f) {
                                    setFreelancerRate(f.defaultRate);
                                    setFreelancerRateType(f.rateType);
                                }
                            }} className="w-full mt-1 p-2 text-sm border rounded">
                                <option value="">Select...</option>
                                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.specialization})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-indigo-800">Role on Project</label>
                            <input type="text" value={freelancerRole} onChange={e => setFreelancerRole(e.target.value)} placeholder="e.g. Lead Videographer" className="w-full mt-1 p-2 text-sm border rounded" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <div>
                            <label className="text-xs font-bold text-indigo-800">Rate</label>
                            <input type="number" value={freelancerRate} onChange={e => setFreelancerRate(Number(e.target.value))} className="w-full mt-1 p-2 text-sm border rounded" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-indigo-800">Rate Type</label>
                            <select value={freelancerRateType} onChange={e => setFreelancerRateType(e.target.value as any)} className="w-full mt-1 p-2 text-sm border rounded">
                                <option value="hourly">Hourly</option>
                                <option value="daily">Daily</option>
                                <option value="project">Project</option>
                            </select>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={handleAddFreelancer} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm w-full">Save Assignment</button>
                            <button onClick={() => setIsFreelancerAddOpen(false)} className="bg-white text-slate-600 px-4 py-2 rounded text-sm w-full">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Role / Service</th>
                    <th className="px-6 py-3">Dates</th>
                    <th className="px-6 py-3">Rate</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {assignments.map(a => {
                    const freelancer = freelancers.find(f => f.id === a.freelancerId);
                    if (!freelancer) return null;
                    return (
                    <tr key={a.id}>
                        <td className="px-6 py-4 flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                {freelancer.name.charAt(0)}
                             </div>
                             <div>
                                <span className="font-medium text-slate-900 block">{freelancer.name}</span>
                                <span className="text-xs text-slate-400">{freelancer.specialization}</span>
                             </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{a.role}</td>
                        <td className="px-6 py-4 text-slate-500">
                            {a.startDate ? `${new Date(a.startDate).toLocaleDateString()} - ${a.endDate ? new Date(a.endDate).toLocaleDateString() : 'Ongoing'}` : 'TBD'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                            {a.currency} {a.agreedRate} / {a.agreedRateType}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => onRemoveFreelancerAssignment(a.id)} className="text-slate-400 hover:text-rose-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                    );
                })}
                {assignments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No freelancers assigned.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};

const MilestonesTab = ({ project, milestones, users, tasks, approvalSteps, onAdd, onUpdate }: { project: Project, milestones: ProjectMilestone[], users: User[], tasks: Task[], approvalSteps: ApprovalStep[], onAdd: any, onUpdate: any }) => {
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [status, setStatus] = useState<ProjectMilestone['status']>('not_started');

  const resetForm = () => {
      setName(''); setDescription(''); setStartDate(''); setEndDate(''); setOwnerId(''); setStatus('not_started'); setEditingId(null);
  };

  const handleSave = () => {
      if (!name || !startDate || !endDate) return;
      
      const milestone: ProjectMilestone = {
          id: editingId || `ms${Date.now()}`,
          projectId: project.id,
          name,
          description,
          startDate,
          endDate,
          dueDate: endDate, // Keep for legacy compatibility if needed
          ownerId: ownerId || undefined,
          status,
          progressPercent: editingId ? milestones.find(m => m.id === editingId)?.progressPercent || 0 : 0,
          order: editingId ? milestones.find(m => m.id === editingId)?.order || 0 : milestones.length + 1
      };

      if (editingId) {
          onUpdate(milestone);
      } else {
          onAdd(milestone);
      }
      setIsAddOpen(false);
      resetForm();
  };

  const startEdit = (m: ProjectMilestone) => {
      setEditingId(m.id);
      setName(m.name);
      setDescription(m.description || '');
      setStartDate(m.startDate || m.dueDate); // Fallback
      setEndDate(m.endDate || m.dueDate);
      setOwnerId(m.ownerId || '');
      setStatus(m.status);
      setIsAddOpen(true);
  };

  // Timeline Helper
  const getTimelineStyles = (m: ProjectMilestone) => {
      const projectStart = new Date(project.startDate).getTime();
      const projectEnd = new Date(project.endDate).getTime();
      const totalDuration = projectEnd - projectStart;
      
      const mStart = new Date(m.startDate || m.dueDate).getTime();
      const mEnd = new Date(m.endDate || m.dueDate).getTime();
      
      const left = Math.max(0, ((mStart - projectStart) / totalDuration) * 100);
      const width = Math.max(2, ((mEnd - mStart) / totalDuration) * 100); // Min 2% width
      
      return { left: `${left}%`, width: `${width}%` };
  };

  const getTaskApprovalStatus = (taskId: string) => {
      const steps = approvalSteps.filter(s => s.taskId === taskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (steps.length === 0) return null;
      return steps[0];
  };

  return (
    <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex justify-between items-center">
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>List View</button>
                <button onClick={() => setView('timeline')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Timeline</button>
            </div>
            <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
                <Plus className="w-4 h-4" /> <span>Add Milestone</span>
            </button>
        </div>

        {/* Add/Edit Modal (Inline for simplicity) */}
        {isAddOpen && (
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-lg text-slate-900">{editingId ? 'Edit Milestone' : 'New Milestone'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="Milestone Title" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg text-sm" rows={2} placeholder="Key deliverables..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Owner</label>
                        <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                            <option value="">Unassigned</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2 border rounded-lg text-sm">
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save Milestone</button>
                </div>
            </div>
        )}

        {/* List View */}
        {view === 'list' && (
            <div className="grid grid-cols-1 gap-4">
                {milestones.map(m => {
                    const owner = users.find(u => u.id === m.ownerId);
                    const milestoneTasks = tasks.filter(t => t.milestoneId === m.id);
                    
                    return (
                        <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-1">
                                        <h4 className="font-bold text-slate-900 text-lg">{m.name}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                            m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                            m.status === 'blocked' ? 'bg-rose-100 text-rose-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>{m.status.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-3">{m.description}</p>
                                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                                        <div className="flex items-center space-x-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{new Date(m.startDate || m.dueDate).toLocaleDateString()} - {new Date(m.endDate || m.dueDate).toLocaleDateString()}</span>
                                        </div>
                                        {owner && (
                                            <div className="flex items-center space-x-1">
                                                <img src={owner.avatar} className="w-4 h-4 rounded-full" alt="" />
                                                <span>{owner.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-6 min-w-[200px]">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-700">Progress</span>
                                            <span className="text-slate-500">{m.progressPercent || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${m.progressPercent || 0}%` }}></div>
                                        </div>
                                    </div>
                                    <button onClick={() => startEdit(m)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Tasks & Approvals Section */}
                            {milestoneTasks.length > 0 && (
                                <div className="mt-2 pt-4 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Tasks & Approvals</h5>
                                    <div className="space-y-2">
                                        {milestoneTasks.map(task => {
                                            const approval = getTaskApprovalStatus(task.id);
                                            return (
                                                <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                        <span className="text-slate-700 font-medium">{task.title}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-xs text-slate-500 capitalize">{task.status.replace('_', ' ')}</span>
                                                        {approval && approval.status === 'pending' && (
                                                            <span className="flex items-center space-x-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                                <Clock className="w-3 h-3" />
                                                                <span>Pending Approval</span>
                                                            </span>
                                                        )}
                                                        {approval && approval.status === 'approved' && (
                                                            <span className="flex items-center space-x-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                <CheckCircle className="w-3 h-3" />
                                                                <span>Approved</span>
                                                            </span>
                                                        )}
                                                        {approval && approval.status === 'rejected' && (
                                                            <span className="flex items-center space-x-1 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                                                                <XCircle className="w-3 h-3" />
                                                                <span>Rejected</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {milestones.length === 0 && <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No milestones defined yet. Start planning your roadmap!</div>}
            </div>
        )}

        {/* Timeline View */}
        {view === 'timeline' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Timeline Header */}
                    <div className="flex justify-between text-xs text-slate-400 uppercase font-bold mb-4 border-b border-slate-100 pb-2">
                        <span>{new Date(project.startDate).toLocaleDateString()}</span>
                        <span>Project Timeline</span>
                        <span>{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Timeline Tracks */}
                    <div className="space-y-6 relative min-h-[200px]">
                        {/* Grid Lines (Optional visual aid) */}
                        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                            <div className="w-px h-full bg-slate-900"></div>
                            <div className="w-px h-full bg-slate-900"></div>
                            <div className="w-px h-full bg-slate-900"></div>
                            <div className="w-px h-full bg-slate-900"></div>
                            <div className="w-px h-full bg-slate-900"></div>
                        </div>

                        {milestones.map(m => {
                            const style = getTimelineStyles(m);
                            return (
                                <div key={m.id} className="relative h-12">
                                    <div 
                                        className={`absolute h-10 rounded-lg shadow-sm border flex items-center px-3 cursor-pointer hover:shadow-md transition-all ${
                                            m.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                                            m.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                                            'bg-slate-50 border-slate-200'
                                        }`}
                                        style={style}
                                        onClick={() => startEdit(m)}
                                    >
                                        <div className="truncate w-full">
                                            <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-slate-500">{m.progressPercent || 0}%</span>
                                            </div>
                                            <div className="w-full bg-black/5 rounded-full h-1 mt-1">
                                                <div className={`h-1 rounded-full ${
                                                    m.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                }`} style={{ width: `${m.progressPercent || 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const ActivityTab = ({ logs, users }: { logs: ProjectActivityLog[], users: User[] }) => (
  <div className="space-y-4">
    {logs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(log => {
      const user = users.find(u => u.id === log.userId);
      return (
        <div key={log.id} className="flex space-x-4">
          <div className="flex flex-col items-center">
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
               <Activity className="w-4 h-4 text-slate-500" />
             </div>
             <div className="w-px h-full bg-slate-200 my-2"></div>
          </div>
          <div className="pb-6">
             <p className="text-sm text-slate-900">
               <span className="font-semibold">{user?.name || 'Unknown'}</span> {log.message}
             </p>
             <p className="text-xs text-slate-500 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
          </div>
        </div>
      );
    })}
    {logs.length === 0 && <p className="text-slate-400 italic">No activity recorded yet.</p>}
  </div>
);

export default ProjectsHub;
