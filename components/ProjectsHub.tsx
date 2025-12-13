import React, { useState, useEffect, useMemo } from 'react';
import { Project, Client, User, ProjectMember, ProjectMilestone, ProjectActivityLog, ProjectStatus, ProjectType, AgencyFile, FileFolder, Freelancer, FreelancerAssignment, RateType, Task, ApprovalStep, ProjectMarketingAsset } from '../types';
import { Plus, Search, Calendar, DollarSign, Users, Briefcase, ChevronRight, Clock, Flag, ArrowLeft, MoreHorizontal, Settings, FileText, Activity, User as UserIcon, Trash2, CheckCircle, XCircle, AlertCircle, BarChart3, Link as LinkIcon, ExternalLink, File } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import FilesHub from './FilesHub';
import ProjectCalendar from './ProjectCalendar';

interface ProjectsHubProps {
  projects: Project[];
  clients: Client[];
  users: User[];
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  activityLogs: ProjectActivityLog[];
  marketingAssets: ProjectMarketingAsset[]; // New
  files: AgencyFile[];
  folders: FileFolder[];
  freelancers: Freelancer[];
  assignments: FreelancerAssignment[];
  tasks: Task[]; 
  approvalSteps: ApprovalStep[]; 
  onAddProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onAddMember: (member: ProjectMember) => void;
  onAddMilestone: (milestone: ProjectMilestone) => void;
  onUpdateMilestone: (milestone: ProjectMilestone) => void;
  onAddMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>; // New
  onUpdateMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>; // New
  onDeleteMarketingAsset: (assetId: string) => Promise<void>; // New
  onUploadFile: (file: AgencyFile) => Promise<void>;
  onCreateFolder: (folder: FileFolder) => void;
  onAddFreelancerAssignment: (assignment: FreelancerAssignment) => void;
  onRemoveMember: (memberId: string) => void;
  onRemoveFreelancerAssignment: (assignmentId: string) => void;
  initialSelectedProjectId?: string | null;
  checkPermission?: (permission: string) => boolean;
  onNavigateToTask?: (taskId: string) => void;
}

const ProjectsHub: React.FC<ProjectsHubProps> = ({ 
  projects, clients, users, members, milestones, activityLogs, marketingAssets, files, folders, freelancers, assignments, tasks, approvalSteps,
  onAddProject, onUpdateProject, onDeleteProject, onAddMember, onAddMilestone, onUpdateMilestone, onAddMarketingAsset, onUpdateMarketingAsset, onDeleteMarketingAsset, onUploadFile, onCreateFolder, onAddFreelancerAssignment,
  onRemoveMember, onRemoveFreelancerAssignment, initialSelectedProjectId, checkPermission = () => true, onNavigateToTask
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(initialSelectedProjectId ? 'detail' : 'list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialSelectedProjectId || null);
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
      marketingAssets={marketingAssets.filter(a => a.projectId === selectedProject.id)} // Filter here
      files={files}
      folders={folders}
      freelancers={freelancers}
      assignments={assignments.filter(a => a.projectId === selectedProject.id)}
      tasks={tasks.filter(t => t && t.projectId === selectedProject.id)}
      approvalSteps={approvalSteps}
      onUpdateProject={onUpdateProject}
      onDeleteProject={onDeleteProject}
      onAddMember={onAddMember}
      onAddFreelancerAssignment={onAddFreelancerAssignment}
      onRemoveMember={onRemoveMember}
      onRemoveFreelancerAssignment={onRemoveFreelancerAssignment}
      onAddMilestone={onAddMilestone}
      onUpdateMilestone={onUpdateMilestone}
      onAddMarketingAsset={onAddMarketingAsset}
      onUpdateMarketingAsset={onUpdateMarketingAsset}
      onDeleteMarketingAsset={onDeleteMarketingAsset}
      onUploadFile={onUploadFile}
      onCreateFolder={onCreateFolder}
      getStatusColor={getStatusColor}
      checkPermission={checkPermission}
      onNavigateToTask={onNavigateToTask}
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
  marketingAssets: ProjectMarketingAsset[];
  files: AgencyFile[];
  folders: FileFolder[];
  freelancers: Freelancer[];
  assignments: FreelancerAssignment[];
  tasks: Task[];
  approvalSteps: ApprovalStep[];
  onBack: () => void;
  onUpdateProject: (p: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onAddMember: (m: ProjectMember) => void;
  onAddFreelancerAssignment: (a: FreelancerAssignment) => void;
  onRemoveMember: (memberId: string) => void;
  onRemoveFreelancerAssignment: (assignmentId: string) => void;
  onAddMilestone: (m: ProjectMilestone) => void;
  onUpdateMilestone: (m: ProjectMilestone) => void;
  onAddMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>;
  onUpdateMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>;
  onDeleteMarketingAsset: (assetId: string) => Promise<void>;
  onUploadFile: (f: AgencyFile) => Promise<void>;
  onCreateFolder: (f: FileFolder) => void;
  getStatusColor: (s: string) => string;
  checkPermission: (permission: string) => boolean;
  onNavigateToTask?: (taskId: string) => void;
}

const ProjectDetailView: React.FC<ProjectDetailProps> = ({ 
  project, users, members, milestones, logs, marketingAssets, files, folders, freelancers, assignments, tasks, approvalSteps, onBack, 
  onUpdateProject, onDeleteProject, onAddMember, onAddFreelancerAssignment, onRemoveMember, onRemoveFreelancerAssignment, onAddMilestone, onUpdateMilestone, onAddMarketingAsset, onUpdateMarketingAsset, onDeleteMarketingAsset, onUploadFile, onCreateFolder, getStatusColor, checkPermission, onNavigateToTask
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Team' | 'Milestones' | 'Calendar' | 'Files' | 'Activity'>('Overview');
  
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
             <button 
               onClick={() => { onDeleteProject(project.id); onBack(); }}
               className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
               title="Delete Project"
             >
               <Trash2 className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {['Overview', 'Team', 'Milestones', 'Calendar', 'Files', 'Activity'].map((tab) => (
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
        {activeTab === 'Overview' && (
            <OverviewTab 
                project={project} 
                milestones={milestones} 
                tasks={tasks} 
                members={members} 
                users={users} 
                marketingAssets={marketingAssets}
                files={files}
                onAddMarketingAsset={onAddMarketingAsset}
                onUpdateMarketingAsset={onUpdateMarketingAsset}
                onDeleteMarketingAsset={onDeleteMarketingAsset}
                onUploadFile={onUploadFile}
                checkPermission={checkPermission}
            />
        )}
        {activeTab === 'Team' && <TeamTab project={project} members={members} users={users} freelancers={freelancers} assignments={assignments} onAddMember={onAddMember} onAddFreelancerAssignment={onAddFreelancerAssignment} onRemoveMember={onRemoveMember} onRemoveFreelancerAssignment={onRemoveFreelancerAssignment} />}
        {activeTab === 'Milestones' && <MilestonesTab project={project} milestones={milestones} users={users} tasks={tasks} approvalSteps={approvalSteps} onAdd={onAddMilestone} onUpdate={onUpdateMilestone} checkPermission={checkPermission} />}
        {activeTab === 'Calendar' && (
            <div className="h-[800px]">
                <ProjectCalendar 
                    project={project} 
                    tasks={tasks} 
                    users={users} 
                    onTaskClick={(taskId) => onNavigateToTask && onNavigateToTask(taskId)} 
                />
            </div>
        )}
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

const OverviewTab = ({ project, milestones, tasks, members, users, marketingAssets, files, onAddMarketingAsset, onUpdateMarketingAsset, onDeleteMarketingAsset, onUploadFile, checkPermission }: { project: Project, milestones: ProjectMilestone[], tasks: Task[], members: ProjectMember[], users: User[], marketingAssets: ProjectMarketingAsset[], files: AgencyFile[], onAddMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>, onUpdateMarketingAsset: (asset: ProjectMarketingAsset) => Promise<void>, onDeleteMarketingAsset: (assetId: string) => Promise<void>, onUploadFile: (f: AgencyFile) => Promise<void>, checkPermission: (p: string) => boolean }) => {
  
  // Asset Modal State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ProjectMarketingAsset | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<ProjectMarketingAsset['category']>('strategy_doc');
  const [assetType, setAssetType] = useState<'file' | 'link'>('link');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetFileId, setAssetFileId] = useState('');
  
  // New File Upload State
  const [uploadMode, setUploadMode] = useState<'select' | 'upload'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetAssetForm = () => {
      setAssetName('');
      setAssetCategory('strategy_doc');
      setAssetType('link');
      setAssetUrl('');
      setAssetFileId('');
      setEditingAsset(null);
      setUploadMode('upload');
      setSelectedFile(null);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let finalFileId = assetFileId;

      // Handle File Upload if needed
      if (assetType === 'file' && uploadMode === 'upload' && selectedFile) {
          const newFileId = `f${Date.now()}`;
          const newFile: AgencyFile = {
              id: newFileId,
              projectId: project.id,
              uploaderId: 'current-user-id', // Should be passed from context
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              url: '', // Empty initially, will be filled by App.tsx
              version: 1,
              isDeliverable: false,
              isArchived: false,
              tags: ['marketing_asset'],
              createdAt: new Date().toISOString()
          };
          
          // Attach the raw file for the uploader to use
          (newFile as any).file = selectedFile;
          
          // Upload the file
          await onUploadFile(newFile);
          finalFileId = newFileId;
      }

      const asset: ProjectMarketingAsset = {
          id: editingAsset ? editingAsset.id : `pma${Date.now()}`,
          projectId: project.id,
          name: assetName,
          category: assetCategory,
          type: assetType,
          url: assetType === 'link' ? assetUrl : null,
          fileId: assetType === 'file' ? finalFileId : null,
          description: '',
          createdAt: editingAsset ? editingAsset.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: editingAsset ? editingAsset.createdBy : 'current-user-id'
      };

      if (editingAsset) {
          await onUpdateMarketingAsset(asset);
      } else {
          await onAddMarketingAsset(asset);
      }
      setIsAssetModalOpen(false);
      resetAssetForm();
  };

  const openAssetModal = (asset?: ProjectMarketingAsset) => {
      if (asset) {
          setEditingAsset(asset);
          setAssetName(asset.name);
          setAssetCategory(asset.category);
          setAssetType(asset.type);
          setAssetUrl(asset.url || '');
          setAssetFileId(asset.fileId || '');
          setUploadMode('select'); // Default to select for existing assets
      } else {
          resetAssetForm();
      }
      setIsAssetModalOpen(true);
  };

  // 1. Milestones Graph Data
  const currentMonthMilestones = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return milestones.filter(m => {
        if (!m || m.projectId !== project.id) return false;
        const d = new Date(m.endDate || m.dueDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).map(m => {
        const mTasks = tasks.filter(t => t && t.milestoneId === m.id && !t.isDeleted);
        const completedCount = mTasks.filter(t => {
            if (!t || !t.status) return false;
            return ['completed', 'approved', 'client_approved'].includes(t.status);
        }).length;
        const totalCount = mTasks.length;
        
        // Determine "Total" based on Target or Actual
        let displayTotal = totalCount;
        let displayCompleted = completedCount;

        if (m.targetTaskCount && m.targetTaskCount > 0) {
             displayTotal = m.targetTaskCount;
             displayCompleted = Math.min(completedCount, m.targetTaskCount);
        }
        
        return {
            name: m.name,
            completed: displayCompleted,
            remaining: Math.max(0, displayTotal - displayCompleted),
            total: displayTotal,
            actualTotal: totalCount,
            actualCompleted: completedCount
        };
    });
  }, [milestones, tasks, project.id]);

  // 2. Team Progress Data
  const teamProgress = useMemo(() => {
    const projectMembers = members.filter(m => m && m.projectId === project.id);
    
    return projectMembers.map(member => {
        const user = users.find(u => u.id === member.userId);
        const userTasks = tasks.filter(t => {
            if (!t) return false;
            if (t.projectId !== project.id) return false;
            if (t.isDeleted) return false;
            
            // Safe check for assigneeIds
            const assignees = t.assigneeIds;
            if (!Array.isArray(assignees)) return false;
            
            return assignees.includes(member.userId);
        });
        
        const total = userTasks.length;
        const completed = userTasks.filter(t => {
            if (!t || !t.status) return false;
            return ['completed', 'approved', 'client_approved'].includes(t.status);
        }).length;
        
        const awaiting = userTasks.filter(t => t.status === 'awaiting_review').length;
        const revisions = userTasks.filter(t => t.status === 'revisions_required').length;
        const clientReview = userTasks.filter(t => t.status === 'client_review').length;
        
        return {
            memberId: member.id,
            user: user,
            role: member.roleInProject,
            total,
            completed,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            approvals: { awaiting, revisions, clientReview }
        };
    });
  }, [members, users, tasks, project.id]);

  return (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="md:col-span-2 space-y-6">
       {/* Milestones Graph */}
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-slate-900 flex items-center gap-2">
               <BarChart3 className="w-4 h-4 text-slate-400"/> 
               This Month’s Milestones – Task Progress
             </h3>
             <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
               {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
             </span>
          </div>
          <div className="p-6">
             {currentMonthMilestones.length > 0 ? (
               <div className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                     layout="vertical"
                     data={currentMonthMilestones}
                     margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                   >
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <XAxis type="number" />
                     <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                     <Tooltip 
                        formatter={(value: number, name: string, props: any) => {
                            if (name === 'Completed') return [value, 'Completed Tasks'];
                            if (name === 'Remaining') return [value, 'Remaining Tasks'];
                            return [value, name];
                        }}
                     />
                     <Legend />
                     <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                     <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <div className="text-center py-8 text-slate-400">
                 No milestones scheduled for this month.
               </div>
             )}
          </div>
       </div>

       {/* Team Progress Table */}
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
             <h3 className="font-bold text-slate-900 flex items-center gap-2">
               <Users className="w-4 h-4 text-slate-400"/> 
               Team Progress & Approvals
             </h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                   <tr>
                      <th className="px-6 py-3">Team Member</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Tasks</th>
                      <th className="px-6 py-3 w-1/4">Progress</th>
                      <th className="px-6 py-3">Approvals Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {teamProgress.map((tp) => (
                      <tr key={tp.memberId} className="hover:bg-slate-50">
                         <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                               {tp.user ? (
                                 <img src={tp.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                               ) : (
                                 <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                               )}
                               <span className="font-medium text-slate-900">{tp.user?.name || 'Unknown'}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-slate-600">{tp.role}</td>
                         <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                            {tp.completed} / {tp.total}
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                  <div 
                                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                                    style={{ width: `${tp.progress}%` }}
                                  ></div>
                               </div>
                               <span className="text-xs text-slate-500 w-8 text-right">{tp.progress}%</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            {tp.approvals.awaiting === 0 && tp.approvals.revisions === 0 && tp.approvals.clientReview === 0 ? (
                               <span className="text-slate-400 text-xs">-</span>
                            ) : (
                               <div className="flex flex-col gap-1 text-xs">
                                  {tp.approvals.awaiting > 0 && (
                                     <span className="text-amber-600 font-medium">{tp.approvals.awaiting} awaiting review</span>
                                  )}
                                  {tp.approvals.revisions > 0 && (
                                     <span className="text-rose-600 font-medium">{tp.approvals.revisions} in revisions</span>
                                  )}
                                  {tp.approvals.clientReview > 0 && (
                                     <span className="text-indigo-600 font-medium">{tp.approvals.clientReview} in client review</span>
                                  )}
                               </div>
                            )}
                         </td>
                      </tr>
                   ))}
                   {teamProgress.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400">No team members assigned.</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Project Brief</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.brief || "No brief provided."}</p>
       </div>
    </div>
    <div className="space-y-6">
       {/* Marketing Strategies Card */}
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400"/>
                    Marketing Strategies
                </h3>
                {checkPermission('projects.marketing_assets_manage') && (
                    <button onClick={() => openAssetModal()} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="divide-y divide-slate-100">
                {marketingAssets.length > 0 ? (
                    marketingAssets.map(asset => (
                        <div key={asset.id} className="p-4 hover:bg-slate-50 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                    <div className="mt-1 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                        {asset.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900">{asset.name}</h4>
                                        <span className="text-xs text-slate-500 capitalize bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                            {asset.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {asset.type === 'link' && asset.url && (
                                        <a href={asset.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                    {asset.type === 'file' && asset.fileId && (() => {
                                        const file = files.find(f => f.id === asset.fileId);
                                        if (file && file.url) {
                                            return (
                                                <a href={file.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600 rounded" title="View File">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            );
                                        }
                                        return (
                                            <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded opacity-50 cursor-not-allowed" title="File not found">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        );
                                    })()}
                                    {checkPermission('projects.marketing_assets_manage') && (
                                        <>
                                            <button onClick={() => openAssetModal(asset)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => onDeleteMarketingAsset(asset.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        No strategy assets added yet.
                    </div>
                )}
            </div>
       </div>

       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Key Info</h3>
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

    {/* Asset Modal */}
    {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">{editingAsset ? 'Edit Asset' : 'Add Strategy Asset'}</h3>
                    <button onClick={() => setIsAssetModalOpen(false)}><XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSaveAsset} className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                        <input required type="text" value={assetName} onChange={e => setAssetName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Q3 Media Plan" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <select value={assetCategory} onChange={e => setAssetCategory(e.target.value as any)} className="w-full p-2 border rounded-lg text-sm">
                            <option value="strategy_doc">Strategy Document</option>
                            <option value="media_plan">Media Plan</option>
                            <option value="content_calendar">Content Calendar</option>
                            <option value="presentation">Presentation</option>
                            <option value="report">Report</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="assetType" value="link" checked={assetType === 'link'} onChange={() => setAssetType('link')} className="text-indigo-600" />
                                <span className="text-sm text-slate-700">External Link</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="assetType" value="file" checked={assetType === 'file'} onChange={() => setAssetType('file')} className="text-indigo-600" />
                                <span className="text-sm text-slate-700">File</span>
                            </label>
                        </div>
                    </div>
                    
                    {assetType === 'link' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL</label>
                            <input required type="url" value={assetUrl} onChange={e => setAssetUrl(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="https://..." />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex space-x-4 border-b border-slate-100 pb-2">
                                <button 
                                    type="button"
                                    onClick={() => setUploadMode('upload')}
                                    className={`text-xs font-bold uppercase pb-1 border-b-2 transition-colors ${uploadMode === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    Upload New
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setUploadMode('select')}
                                    className={`text-xs font-bold uppercase pb-1 border-b-2 transition-colors ${uploadMode === 'select' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    Select Existing
                                </button>
                            </div>

                            {uploadMode === 'select' ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select File</label>
                                    <select required={uploadMode === 'select'} value={assetFileId} onChange={e => setAssetFileId(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                                        <option value="">Select a file...</option>
                                        {files.filter(f => f.projectId === project.id).map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400 mt-1">Only showing files linked to this project.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload File</label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="file" 
                                            required={uploadMode === 'upload'}
                                            onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} 
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        />
                                        <p className="text-xs text-slate-400 mt-2">Max size 10MB.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-2">
                        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">Save Asset</button>
                    </div>
                </form>
            </div>
        </div>
    )}
  </div>
  );
};

const TeamTab = ({ project, members, users, freelancers, assignments, onAddMember, onAddFreelancerAssignment, onRemoveMember, onRemoveFreelancerAssignment }: { 
    project: Project, members: ProjectMember[], users: User[], 
    freelancers: Freelancer[], assignments: FreelancerAssignment[], 
    onAddMember: (m: ProjectMember) => void,
    onAddFreelancerAssignment: (a: FreelancerAssignment) => void,
    onRemoveMember: (memberId: string) => void,
    onRemoveFreelancerAssignment: (assignmentId: string) => void
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

const MilestonesTab = ({ project, milestones, users, tasks, approvalSteps, onAdd, onUpdate, checkPermission }: { project: Project, milestones: ProjectMilestone[], users: User[], tasks: Task[], approvalSteps: ApprovalStep[], onAdd: any, onUpdate: any, checkPermission: (p: string) => boolean }) => {
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
  
  // New Fields
  const [targetTaskCount, setTargetTaskCount] = useState<string>('');
  const [autoCompleteOnTarget, setAutoCompleteOnTarget] = useState(false);

  const resetForm = () => {
      setName(''); setDescription(''); setStartDate(''); setEndDate(''); setOwnerId(''); setStatus('not_started'); 
      setTargetTaskCount(''); setAutoCompleteOnTarget(false);
      setEditingId(null);
  };

  const handleSave = () => {
      if (!name || !startDate || !endDate) return;
      
      const targetCount = targetTaskCount ? parseInt(targetTaskCount) : null;

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
          order: editingId ? milestones.find(m => m.id === editingId)?.order || 0 : milestones.length + 1,
          targetTaskCount: targetCount,
          autoCompleteOnTarget
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
      setTargetTaskCount(m.targetTaskCount ? m.targetTaskCount.toString() : '');
      setAutoCompleteOnTarget(m.autoCompleteOnTarget || false);
      setIsAddOpen(true);
  };

  // Auto-complete Effect
  useEffect(() => {
    milestones.forEach(m => {
      if (m.autoCompleteOnTarget && m.targetTaskCount && m.status !== 'completed') {
        const mTasks = tasks.filter(t => t.milestoneId === m.id && !t.isDeleted);
        const completedCount = mTasks.filter(t => ['completed', 'approved', 'client_approved'].includes(t.status)).length;
        
        if (completedCount >= m.targetTaskCount) {
           // Avoid infinite loop by checking if it's already completed (handled by if condition above)
           // But we need to be careful about onUpdate triggering this again.
           // Ideally, we should only call onUpdate if we are sure.
           onUpdate({
             ...m,
             status: 'completed',
             completedAt: new Date().toISOString(),
             progressPercent: 100
           });
        }
      }
    });
  }, [milestones, tasks, onUpdate]);

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
                    
                    {/* Target Tasks Configuration */}
                    {checkPermission('milestones.manage') && (
                    <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Progress Tracking</h4>
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Target Task Count (Optional)</label>
                                <input 
                                    type="number" 
                                    value={targetTaskCount} 
                                    onChange={e => setTargetTaskCount(e.target.value)} 
                                    className="w-full p-2 border rounded-lg text-sm" 
                                    placeholder="e.g. 5 tasks to complete"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Leave empty to calculate progress based on all linked tasks.</p>
                            </div>
                            <div className="flex items-center space-x-2 pt-4">
                                <input 
                                    type="checkbox" 
                                    id="autoComplete"
                                    checked={autoCompleteOnTarget}
                                    onChange={e => setAutoCompleteOnTarget(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="autoComplete" className="text-sm text-slate-700 cursor-pointer">
                                    Auto-complete when target reached
                                </label>
                            </div>
                        </div>
                    </div>
                    )}
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
                    const milestoneTasks = tasks.filter(t => t.milestoneId === m.id && !t.isDeleted);
                    
                    // Calculate Progress
                    const completedTasksCount = milestoneTasks.filter(t => ['completed', 'approved', 'client_approved'].includes(t.status)).length;
                    let progress = 0;
                    let progressText = '';

                    if (m.targetTaskCount && m.targetTaskCount > 0) {
                        const ratio = Math.min(1, completedTasksCount / m.targetTaskCount);
                        progress = Math.round(ratio * 100);
                        progressText = `${completedTasksCount} / ${m.targetTaskCount} tasks`;
                    } else {
                        const total = milestoneTasks.length;
                        progress = total > 0 ? Math.round((completedTasksCount / total) * 100) : 0;
                        progressText = `${progress}%`;
                    }
                    
                    // Override if status is completed manually
                    if (m.status === 'completed') progress = 100;
                    
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
                                            <span className="text-slate-500">{progressText}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
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
