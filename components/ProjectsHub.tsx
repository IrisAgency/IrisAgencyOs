import React, { useState, useEffect, useMemo } from 'react';
import { Project, Client, User, ProjectMember, ProjectMilestone, ProjectActivityLog, ProjectStatus, ProjectType, AgencyFile, FileFolder, Freelancer, FreelancerAssignment, RateType, Task, ApprovalStep, ProjectMarketingAsset } from '../types';
import { Plus, Search, Calendar, DollarSign, Users, Briefcase, ChevronRight, Clock, Flag, ArrowLeft, MoreHorizontal, Settings, FileText, Activity, User as UserIcon, Trash2, CheckCircle, XCircle, AlertCircle, BarChart3, Link as LinkIcon, ExternalLink, File, Edit2, Archive } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageControls from './layout/PageControls';
import PageContent from './layout/PageContent';
import FilesHub from './FilesHub';
import ProjectCalendar from './ProjectCalendar';
import Modal from './common/Modal';
import DropdownMenu from './common/DropdownMenu';

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
  onRemoveMember, onRemoveFreelancerAssignment, initialSelectedProjectId, checkPermission = (_permission: string) => true, onNavigateToTask
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

  // Theming helpers for dashboard palette
  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full h-11 px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const pill = 'px-2 py-1 rounded-full text-xs font-medium border';

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
      case 'active': return 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40';
      case 'completed': return 'bg-blue-500/15 text-blue-100 border-blue-400/40';
      case 'planning': return 'bg-[color:var(--dash-primary)]/15 text-[color:var(--dash-primary)] border-[color:var(--dash-primary)]/40';
      case 'on_hold': return 'bg-amber-500/15 text-amber-100 border-amber-400/40';
      case 'cancelled': return 'bg-rose-500/15 text-rose-100 border-rose-400/40';
      default: return 'bg-slate-500/15 text-slate-100 border-slate-500/40';
    }
  };

  // --- Render List View ---
  if (viewMode === 'list') {
    return (
      <PageContainer>
        <PageHeader
          title="Projects"
          subtitle="Manage campaigns, retainers, and production workflows."
          actions={
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[color:var(--dash-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] hover:shadow-[0_18px_40px_-20px_rgba(230,60,60,0.9)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          }
        />

        <PageControls>
          {/* Search Field */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className={`${inputClass} pl-10 pr-4 h-11 bg-[color:var(--dash-surface-elevated)] text-slate-100`}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} max-w-[220px]`}
          >
            <option value="All">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </PageControls>

        <PageContent>
        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProjects.map((project) => {
            const am = users.find(u => u.id === project.accountManagerId);
            const projectTasks = tasks.filter(t => t.projectId === project.id && !t.isDeleted);
            const activeTasks = projectTasks.filter(t => !['completed', 'approved'].includes(t.status)).length;
            const budgetUsedPercent = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

            return (
              <div
                key={project.id}
                className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] hover:shadow-[0_22px_60px_-26px_rgba(0,0,0,0.9)] transition-shadow`}
              >
                {/* Card Content */}
                <div className="p-4 flex flex-col gap-3 overflow-hidden">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-[color:var(--dash-primary)]/15 border border-[color:var(--dash-primary)]/40 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-[color:var(--dash-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-tight text-slate-50 truncate">{project.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{project.client}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize flex-shrink-0 leading-none ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[color:var(--dash-glass-border)]">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Budget</p>
                      <p className="font-semibold text-slate-100 text-sm ltr-text">{budgetUsedPercent}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Tasks</p>
                      <p className="font-semibold text-slate-100 text-sm ltr-text">{activeTasks}/{projectTasks.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Type</p>
                      <p className="font-semibold text-slate-100 text-sm capitalize">{project.type.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {/* Manager & Deadline */}
                  <div className="flex items-center justify-between pt-2 border-t border-[color:var(--dash-glass-border)] text-xs text-slate-400">
                    <div className="flex items-center gap-2 min-w-0">
                      {am ? (
                        <>
                          <img src={am.avatar} alt={am.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                          <span className="truncate text-slate-100">{am.name}</span>
                        </>
                      ) : (
                        <span className="text-slate-500">No manager</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="ltr-text text-slate-100">{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="border-t border-[color:var(--dash-glass-border)] p-3 bg-[color:var(--dash-surface)]">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-center">
                    <button
                      onClick={() => { setSelectedProjectId(project.id); setViewMode('detail'); }}
                      className="h-11 bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm font-medium text-slate-100 hover:bg-[color:var(--dash-surface-elevated)]/80 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => { setSelectedProjectId(project.id); setViewMode('detail'); }}
                      className="h-11 bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm font-medium text-slate-100 hover:bg-[color:var(--dash-surface-elevated)]/80 transition-colors"
                    >
                      Details
                    </button>
                    <DropdownMenu
                      trigger={
                        <button className="w-11 h-11 flex items-center justify-center bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg hover:bg-[color:var(--dash-surface-elevated)]/80 transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-slate-300" />
                        </button>
                      }
                      items={[
                        ...(checkPermission('projects.edit') ? [{
                          label: 'Edit',
                          icon: <Edit2 className="w-4 h-4" />,
                          onClick: () => {
                            // Edit handler - would open edit modal
                            setSelectedProjectId(project.id);
                            setViewMode('detail');
                          }
                        }] : []),
                        ...(checkPermission('projects.archive') ? [{
                          label: project.archived ? 'Unarchive' : 'Archive',
                          icon: <Archive className="w-4 h-4" />,
                          onClick: () => {
                            onUpdateProject({ ...project, archived: !project.archived });
                          }
                        }] : []),
                        ...(checkPermission('projects.delete') ? [{
                          label: 'Delete',
                          icon: <Trash2 className="w-4 h-4" />,
                          onClick: () => {
                            if (window.confirm('Delete this project?')) {
                              onDeleteProject(project.id);
                            }
                          },
                          danger: true
                        }] : [])
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className={`${surface} text-center py-12 rounded-xl`}>
            <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No projects found matching your filters.</p>
          </div>
        )}
        </PageContent>

        {/* Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Start New Project"
          size="lg"
        >
          <form onSubmit={handleCreateProject} className="p-6 space-y-4 bg-[color:var(--dash-surface)] text-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Project Name *</label>
              <input required value={formName} onChange={e => setFormName(e.target.value)} type="text" className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Client *</label>
                <select required value={formClientId} onChange={e => setFormClientId(e.target.value)} className={inputClass}>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value as ProjectType)} className={inputClass}>
                  <option value="campaign">Campaign</option>
                  <option value="retainer">Retainer</option>
                  <option value="one_time">One Time</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Start Date</label>
                <input required value={formStart} onChange={e => setFormStart(e.target.value)} type="date" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">End Date</label>
                <input required value={formEnd} onChange={e => setFormEnd(e.target.value)} type="date" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Budget</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input value={formBudget} onChange={e => setFormBudget(e.target.value)} type="number" className={`${inputClass} pl-7`} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Brief Summary</label>
              <textarea value={formBrief} onChange={e => setFormBrief(e.target.value)} className={`${inputClass} min-h-[110px]`} rows={3} placeholder="What is the main goal?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Manager</label>
              <select value={formManager} onChange={e => setFormManager(e.target.value)} className={inputClass}>
                <option value="">Auto-assign (Client AM)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-[color:var(--dash-primary)] text-white py-2.5 rounded-lg font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all">Create Project</button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    );
  }

  // --- Render Detail View ---

  if (!selectedProject) {
    return (
      <PageContainer>
        <div className={`${surface} p-6 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] space-y-3`}> 
          <h2 className="text-lg font-bold text-slate-50">Project not found</h2>
          <p className="text-slate-400 text-sm">The selected project is unavailable. It may have been deleted or you may need to reselect it.</p>
          <button
            onClick={() => { setViewMode('list'); setSelectedProjectId(null); }}
            className="inline-flex items-center gap-2 bg-[color:var(--dash-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to projects
          </button>
        </div>
      </PageContainer>
    );
  }

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

  // Theming helpers for detail views
  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const pill = 'px-2 py-1 rounded-full text-[11px] font-medium border';

  // Status Change Handler
  const handleStatusChange = (newStatus: string) => {
    onUpdateProject({ ...project, status: newStatus as ProjectStatus, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <button onClick={onBack} className="text-slate-400 hover:text-[color:var(--dash-primary)] flex items-center space-x-2 w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className={`${elevated} p-4 md:p-6 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.9)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-50">{project.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wide font-bold ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm md:text-base text-slate-400 truncate">{project.client} • {project.type.replace('_', ' ')} • Due {new Date(project.endDate).toLocaleDateString()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100 text-xs md:text-sm rounded-lg focus:ring-[color:var(--dash-primary)] focus:border-[color:var(--dash-primary)] block p-2"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="p-2.5 text-slate-400 hover:bg-[color:var(--dash-surface)] hover:text-[color:var(--dash-primary)] rounded-lg transition-colors border border-[color:var(--dash-glass-border)]">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => { onDeleteProject(project.id); onBack(); }}
              className="p-2.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-200 rounded-lg transition-colors border border-[color:var(--dash-glass-border)]"
              title="Delete Project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[color:var(--dash-glass-border)] overflow-x-auto">
        <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max">
          {['Overview', 'Team', 'Milestones', 'Calendar', 'Files', 'Activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`
                whitespace-nowrap py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm
                ${activeTab === tab
                  ? 'border-[color:var(--dash-primary)] text-[color:var(--dash-primary)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-[color:var(--dash-glass-border)]'}
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
          <div className={`${elevated} h-[600px] rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] p-4`}>
            <FilesHub
              files={files}
              folders={folders}
              projects={[project]}
              users={users}
              currentProjectId={project.id}
              onUpload={onUploadFile}
              onDelete={() => { }}
              onMove={() => { }}
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

  // Local theming helpers for detail cards
  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const pill = 'px-2 py-1 rounded-full text-[11px] font-medium border';

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <div className="md:col-span-2 space-y-4 md:space-y-6">
        {/* Milestones Graph */}
        <div className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] overflow-hidden`}>
          <div className="p-3 md:p-5 border-b border-[color:var(--dash-glass-border)] flex flex-wrap justify-between items-center gap-2 bg-[color:var(--dash-surface)]">
            <h3 className="text-sm md:text-base font-bold text-slate-50 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-300" />
              This Month’s Milestones – Task Progress
            </h3>
            <span className={`${pill} bg-[color:var(--dash-surface-elevated)] text-slate-200 border-[color:var(--dash-glass-border)]`}>
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="p-3 md:p-6">
            {currentMonthMilestones.length > 0 ? (
              <div className="h-[250px] w-full overflow-x-auto">
                <div className="min-w-[350px] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={currentMonthMilestones}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="remaining" name="Remaining" stackId="a" fill="rgba(148,163,184,0.5)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                No milestones scheduled for this month.
              </div>
            )}
          </div>
        </div>

        {/* Team Progress Cards */}
        <div className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)]`}>
          <div className="p-5 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]">
            <h3 className="text-base font-bold text-slate-50 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-300" />
              Team Progress & Approvals
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {teamProgress.map((tp) => (
              <div key={tp.memberId} className="p-4 bg-[color:var(--dash-surface)] rounded-lg border border-[color:var(--dash-glass-border)]">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {tp.user ? (
                      <img src={tp.user.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0"></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-50 truncate">{tp.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-slate-400">{tp.role}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Tasks</p>
                    <p className="font-mono font-semibold text-slate-50">{tp.completed}/{tp.total}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-xs font-semibold text-slate-100">{tp.progress}%</span>
                  </div>
                  <div className="bg-[color:var(--dash-surface-elevated)] rounded-full h-2 border border-[color:var(--dash-glass-border)]">
                    <div
                      className="bg-[color:var(--dash-primary)] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${tp.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Approvals Status */}
                {(tp.approvals.awaiting > 0 || tp.approvals.revisions > 0 || tp.approvals.clientReview > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {tp.approvals.awaiting > 0 && (
                      <span className="px-2 py-1 bg-amber-500/15 text-amber-100 border border-amber-400/40 rounded text-xs font-medium">
                        {tp.approvals.awaiting} awaiting
                      </span>
                    )}
                    {tp.approvals.revisions > 0 && (
                      <span className="px-2 py-1 bg-rose-500/15 text-rose-100 border border-rose-400/40 rounded text-xs font-medium">
                        {tp.approvals.revisions} revisions
                      </span>
                    )}
                    {tp.approvals.clientReview > 0 && (
                      <span className="px-2 py-1 bg-blue-500/15 text-blue-100 border border-blue-400/40 rounded text-xs font-medium">
                        {tp.approvals.clientReview} at client
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {teamProgress.length === 0 && (
              <div className="p-6 text-center text-slate-400">No team members assigned.</div>
            )}
          </div>
        </div>

        <div className={`${elevated} p-6 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)]`}>
          <h3 className="font-bold text-slate-50 mb-4">Project Brief</h3>
          <p className="text-slate-300 leading-relaxed whitespace-pre-line">{project.brief || "No brief provided."}</p>
        </div>
      </div>
      <div className="space-y-6">
        {/* Marketing Strategies Card */}
        <div className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] overflow-hidden`}>
          <div className="p-4 border-b border-[color:var(--dash-glass-border)] flex justify-between items-center bg-[color:var(--dash-surface)]">
            <h3 className="font-bold text-slate-50 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-300" />
              Marketing Strategies
            </h3>
            {checkPermission('projects.marketing_assets_manage') && (
              <button onClick={() => openAssetModal()} className="text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-primary)]/10 p-1 rounded transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="divide-y divide-[color:var(--dash-glass-border)]">
            {marketingAssets.length > 0 ? (
              marketingAssets.map(asset => (
                <div key={asset.id} className="p-4 hover:bg-[color:var(--dash-surface)] transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-1.5 bg-[color:var(--dash-primary)]/15 text-[color:var(--dash-primary)] rounded-lg border border-[color:var(--dash-primary)]/30">
                        {asset.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-50">{asset.name}</h4>
                        <span className="text-xs text-slate-300 capitalize bg-[color:var(--dash-surface-elevated)] px-1.5 py-0.5 rounded mt-1 inline-block border border-[color:var(--dash-glass-border)]">
                          {asset.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.type === 'link' && asset.url && (
                        <a href={asset.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-300 hover:text-[color:var(--dash-primary)] rounded">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {asset.type === 'file' && asset.fileId && (() => {
                        const file = files.find(f => f.id === asset.fileId);
                        if (file && file.url) {
                          return (
                            <a href={file.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-300 hover:text-[color:var(--dash-primary)] rounded" title="View File">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          );
                        }
                        return (
                          <button className="p-1.5 text-slate-500 rounded opacity-50 cursor-not-allowed" title="File not found">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                      {checkPermission('projects.marketing_assets_manage') && (
                        <>
                          <button onClick={() => openAssetModal(asset)} className="p-1.5 text-slate-300 hover:text-[color:var(--dash-primary)] rounded">
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onDeleteMarketingAsset(asset.id)} className="p-1.5 text-slate-300 hover:text-rose-200 rounded">
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

        <div className={`${elevated} p-6 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] space-y-4`}>
          <h3 className="font-bold text-slate-50 border-b border-[color:var(--dash-glass-border)] pb-2">Key Info</h3>
          <div>
            <p className="text-xs text-slate-400 uppercase">Start Date</p>
            <p className="font-medium text-slate-100">{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">End Date</p>
            <p className="font-medium text-slate-100">{new Date(project.endDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Asset Modal */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title={editingAsset ? 'Edit Asset' : 'Add Strategy Asset'}
        size="md"
      >
        <form onSubmit={handleSaveAsset} className="p-4 space-y-4 bg-[color:var(--dash-surface)] text-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Name</label>
            <input required type="text" value={assetName} onChange={e => setAssetName(e.target.value)} className={inputClass} placeholder="e.g. Q3 Media Plan" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Category</label>
            <select value={assetCategory} onChange={e => setAssetCategory(e.target.value as any)} className={inputClass}>
              <option value="strategy_doc">Strategy Document</option>
              <option value="media_plan">Media Plan</option>
              <option value="content_calendar">Content Calendar</option>
              <option value="presentation">Presentation</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="assetType" value="link" checked={assetType === 'link'} onChange={() => setAssetType('link')} className="text-[color:var(--dash-primary)] bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]" />
                <span className="text-sm text-slate-100">External Link</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="assetType" value="file" checked={assetType === 'file'} onChange={() => setAssetType('file')} className="text-[color:var(--dash-primary)] bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]" />
                <span className="text-sm text-slate-100">File</span>
              </label>
            </div>
          </div>

          {assetType === 'link' ? (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">URL</label>
              <input required type="url" value={assetUrl} onChange={e => setAssetUrl(e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-4 border-b border-[color:var(--dash-glass-border)] pb-2">
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className={`text-xs font-bold uppercase pb-1 border-b-2 transition-colors ${uploadMode === 'upload' ? 'border-[color:var(--dash-primary)] text-[color:var(--dash-primary)]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Upload New
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('select')}
                  className={`text-xs font-bold uppercase pb-1 border-b-2 transition-colors ${uploadMode === 'select' ? 'border-[color:var(--dash-primary)] text-[color:var(--dash-primary)]' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Select Existing
                </button>
              </div>

              {uploadMode === 'select' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Select File</label>
                  <select required={uploadMode === 'select'} value={assetFileId} onChange={e => setAssetFileId(e.target.value)} className={inputClass}>
                    <option value="">Select a file...</option>
                    {files.filter(f => f.projectId === project.id).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Only showing files linked to this project.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Upload File</label>
                  <div className="border-2 border-dashed border-[color:var(--dash-glass-border)] rounded-lg p-4 text-center hover:bg-[color:var(--dash-surface-elevated)] transition-colors">
                    <input
                      type="file"
                      required={uploadMode === 'upload'}
                      onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[color:var(--dash-primary)]/15 file:text-white hover:file:bg-[color:var(--dash-primary)]/25"
                    />
                    <p className="text-xs text-slate-500 mt-2">Max size 10MB.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" className="w-full bg-[color:var(--dash-primary)] text-white py-2 rounded-lg font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all">Save Asset</button>
          </div>
        </form>
      </Modal>
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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [role, setRole] = useState('');

  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full p-2 text-sm rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';

  const [isFreelancerAddOpen, setIsFreelancerAddOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState('');
  const [freelancerRole, setFreelancerRole] = useState('');
  const [freelancerRate, setFreelancerRate] = useState(0);
  const [freelancerRateType, setFreelancerRateType] = useState<RateType>('hourly');

  const handleAdd = () => {
    if (selectedUsers.length === 0 || !role) return;
    
    selectedUsers.forEach((userId, index) => {
      // Check if already a member
      if (members.some(m => m.userId === userId)) return;

      onAddMember({
        id: `pm${Date.now()}_${index}`,
        projectId: project.id,
        userId: userId,
        roleInProject: role,
        isExternal: false
      });
    });

    setIsAddOpen(false);
    setSelectedUsers([]);
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
    <div className="space-y-6 text-slate-100">
      {/* Internal Team */}
      <div className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] overflow-hidden`}>
        <div className="p-4 border-b border-[color:var(--dash-glass-border)] flex justify-between items-center bg-[color:var(--dash-surface)]">
          <h3 className="font-bold text-slate-50">Internal Team</h3>
          <button onClick={() => setIsAddOpen(true)} className="text-[color:var(--dash-primary)] text-sm font-medium hover:bg-[color:var(--dash-primary)]/10 px-3 py-1 rounded">
            Add Members
          </button>
        </div>

        {isAddOpen && (
          <div className="p-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div>
              <label className="text-xs font-bold text-slate-300">Select Users</label>
              <div className="mt-1 p-2 border border-[color:var(--dash-glass-border)] rounded bg-[color:var(--dash-surface-elevated)] max-h-40 overflow-y-auto custom-scrollbar">
                {users.map(u => {
                  const isMember = members.some(m => m.userId === u.id);
                  return (
                    <label key={u.id} className={`flex items-center space-x-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${isMember ? 'opacity-50 bg-[color:var(--dash-surface)]' : 'hover:bg-[color:var(--dash-surface)]'}`}>
                      <input
                        type="checkbox"
                        disabled={isMember}
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          }
                        }}
                        className="rounded text-[color:var(--dash-primary)] bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]"
                      />
                      <div className="flex items-center gap-2">
                        <img src={u.avatar} className="w-5 h-5 rounded-full" alt="" />
                        <span className="text-sm text-slate-100">{u.name}</span>
                        {isMember && <span className="text-[10px] text-slate-500">(Joined)</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-[color:var(--dash-primary)] mt-1 font-medium">{selectedUsers.length} users selected</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300">Role on Project</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Designer" className={`${inputClass} mt-1`} />
              <p className="text-[10px] text-slate-400 mt-1">This role will be assigned to all selected users.</p>
            </div>
            <div className="flex space-x-2 pt-6">
              <button onClick={handleAdd} disabled={selectedUsers.length === 0 || !role} className="bg-[color:var(--dash-primary)] text-white px-4 py-2 rounded text-sm hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">Add Selected</button>
              <button onClick={() => { setIsAddOpen(false); setSelectedUsers([]); setRole(''); }} className="bg-[color:var(--dash-surface)] text-slate-200 px-4 py-2 rounded text-sm hover:bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {members.map(m => {
            const user = users.find(u => u.id === m.userId);
            if (!user) return null;
            return (
              <div key={m.id} className="flex items-center justify-between p-4 bg-[color:var(--dash-surface)] rounded-lg border border-[color:var(--dash-glass-border)]">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img src={user.avatar} className="w-10 h-10 rounded-full flex-shrink-0" alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-50 truncate">{user.name}</p>
                    <p className="text-sm text-slate-400">{m.roleInProject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400">{user.department}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-[color:var(--dash-surface-elevated)] text-slate-200 border border-[color:var(--dash-glass-border)]">Internal</span>
                  </div>
                  <button onClick={() => onRemoveMember(m.id)} className="text-slate-400 hover:text-rose-200 transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="p-6 text-center text-slate-400">No members assigned.</div>
          )}
        </div>
      </div>

      {/* External Freelancers */}
      <div className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] overflow-hidden`}>
        <div className="p-4 border-b border-[color:var(--dash-glass-border)] flex justify-between items-center bg-[color:var(--dash-surface)]">
          <h3 className="font-bold text-slate-50">External Freelancers</h3>
          <button onClick={() => setIsFreelancerAddOpen(true)} className="text-[color:var(--dash-primary)] text-sm font-medium hover:bg-[color:var(--dash-primary)]/10 px-3 py-1 rounded">Assign Freelancer</button>
        </div>

        {isFreelancerAddOpen && (
          <div className="p-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Freelancer</label>
                <select value={selectedFreelancer} onChange={e => {
                  const fId = e.target.value;
                  setSelectedFreelancer(fId);
                  const f = freelancers.find(fr => fr.id === fId);
                  if (f) {
                    setFreelancerRate(f.defaultRate);
                    setFreelancerRateType(f.rateType);
                  }
                }} className={`${inputClass} mt-1`}>
                  <option value="">Select...</option>
                  {freelancers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.specialization})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Role on Project</label>
                <input type="text" value={freelancerRole} onChange={e => setFreelancerRole(e.target.value)} placeholder="e.g. Lead Videographer" className={`${inputClass} mt-1`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-slate-300">Rate</label>
                <input type="number" value={freelancerRate} onChange={e => setFreelancerRate(Number(e.target.value))} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300">Rate Type</label>
                <select value={freelancerRateType} onChange={e => setFreelancerRateType(e.target.value as any)} className={`${inputClass} mt-1`}>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button onClick={handleAddFreelancer} className="bg-[color:var(--dash-primary)] text-white px-4 py-2 rounded text-sm w-full hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)]">Save Assignment</button>
                <button onClick={() => setIsFreelancerAddOpen(false)} className="bg-[color:var(--dash-surface)] text-slate-200 px-4 py-2 rounded text-sm w-full border border-[color:var(--dash-glass-border)] hover:bg-[color:var(--dash-surface-elevated)]">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {assignments.map(a => {
            const freelancer = freelancers.find(f => f.id === a.freelancerId);
            if (!freelancer) return null;
            return (
              <div key={a.id} className="flex items-center justify-between p-4 bg-[color:var(--dash-surface)] rounded-lg border border-[color:var(--dash-glass-border)]">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[color:var(--dash-primary)]/15 flex items-center justify-center text-[color:var(--dash-primary)] font-bold border border-[color:var(--dash-primary)]/30 flex-shrink-0">
                    {freelancer.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-50 truncate">{freelancer.name}</p>
                    <p className="text-xs text-slate-400">{freelancer.specialization}</p>
                    <p className="text-sm text-slate-300 mt-1">{a.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400">
                      {a.startDate ? `${new Date(a.startDate).toLocaleDateString()} - ${a.endDate ? new Date(a.endDate).toLocaleDateString() : 'Ongoing'}` : 'TBD'}
                    </p>
                    <p className="text-sm font-semibold text-slate-100 mt-1">
                      {a.currency} {a.agreedRate} / {a.agreedRateType}
                    </p>
                  </div>
                  <button onClick={() => onRemoveFreelancerAssignment(a.id)} className="text-slate-400 hover:text-rose-200 transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {assignments.length === 0 && (
            <div className="p-6 text-center text-slate-400">No freelancers assigned.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const MilestonesTab = ({ project, milestones, users, tasks, approvalSteps, onAdd, onUpdate, checkPermission }: { project: Project, milestones: ProjectMilestone[], users: User[], tasks: Task[], approvalSteps: ApprovalStep[], onAdd: any, onUpdate: any, checkPermission: (p: string) => boolean }) => {
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const pill = 'px-2 py-1 rounded-full text-[11px] font-medium border';

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
        <div className="flex space-x-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] p-1 rounded-lg">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'list' ? 'bg-[color:var(--dash-surface-elevated)] text-[color:var(--dash-primary)] shadow-sm border border-[color:var(--dash-glass-border)]' : 'text-slate-400 hover:text-slate-200'}`}>List View</button>
          <button onClick={() => setView('timeline')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'timeline' ? 'bg-[color:var(--dash-surface-elevated)] text-[color:var(--dash-primary)] shadow-sm border border-[color:var(--dash-glass-border)]' : 'text-slate-400 hover:text-slate-200'}`}>Timeline</button>
        </div>
        <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-[color:var(--dash-primary)] hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 border border-[color:var(--dash-glass-border)]">
          <Plus className="w-4 h-4" /> <span>Add Milestone</span>
        </button>
      </div>

      {/* Add/Edit Modal (Inline for simplicity) */}
      {isAddOpen && (
        <div className={`${elevated} p-6 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] space-y-4 animate-in fade-in slide-in-from-top-4`}>
          <h3 className="font-bold text-lg text-slate-50">{editingId ? 'Edit Milestone' : 'New Milestone'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Milestone Title" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} min-h-[90px]`} rows={2} placeholder="Key deliverables..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className={inputClass}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Target Tasks Configuration */}
            <div className="md:col-span-2 bg-[color:var(--dash-surface)] p-3 rounded-lg border border-[color:var(--dash-glass-border)]">
              <h4 className="text-xs font-bold text-slate-200 uppercase mb-2">Progress Tracking</h4>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Target Task Count (Optional)</label>
                  <input
                    type="number"
                    value={targetTaskCount}
                    onChange={e => setTargetTaskCount(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 5 tasks to complete"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Leave empty to calculate progress based on all linked tasks.</p>
                </div>
                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="autoComplete"
                    checked={autoCompleteOnTarget}
                    onChange={e => setAutoCompleteOnTarget(e.target.checked)}
                    className="rounded text-[color:var(--dash-primary)] bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)] focus:ring-[color:var(--dash-primary)]/80"
                  />
                  <label htmlFor="autoComplete" className="text-sm text-slate-200 cursor-pointer">
                    Auto-complete when target reached
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-[color:var(--dash-surface)] rounded-lg text-sm border border-[color:var(--dash-glass-border)]">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-[color:var(--dash-primary)] text-white rounded-lg text-sm font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)]">Save Milestone</button>
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
              <div key={m.id} className={`${elevated} p-5 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] hover:shadow-[0_22px_60px_-26px_rgba(0,0,0,0.9)] transition-shadow flex flex-col gap-4`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-bold text-slate-50 text-lg">{m.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${m.status === 'completed' ? 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40' :
                        m.status === 'in_progress' ? 'bg-blue-500/15 text-blue-100 border-blue-400/40' :
                          m.status === 'blocked' ? 'bg-rose-500/15 text-rose-100 border-rose-400/40' :
                            'bg-slate-500/15 text-slate-200 border-slate-400/40'
                        }`}>{m.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-slate-300 text-sm mb-3">{m.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
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
                          <span className="font-medium text-slate-200">Progress</span>
                          <span className="text-slate-400">{progressText}</span>
                      </div>
                        <div className="w-full bg-[color:var(--dash-surface)] rounded-full h-2 border border-[color:var(--dash-glass-border)]">
                          <div className="bg-[color:var(--dash-primary)] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                      <button onClick={() => startEdit(m)} className="p-2 text-slate-400 hover:text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-primary)]/10 rounded-lg transition-colors border border-[color:var(--dash-glass-border)]">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tasks & Approvals Section */}
                {milestoneTasks.length > 0 && (
                  <div className="mt-2 pt-4 border-t border-[color:var(--dash-glass-border)]">
                    <h5 className="text-xs font-bold text-slate-300 uppercase mb-2">Tasks & Approvals</h5>
                    <div className="space-y-2">
                      {milestoneTasks.map(task => {
                        const approval = getTaskApprovalStatus(task.id);
                        return (
                          <div key={task.id} className="flex items-center justify_between text-sm p-2 bg-[color:var(--dash-surface)] rounded-lg border border-[color:var(--dash-glass-border)]">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                              <span className="text-slate-100 font-medium">{task.title}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-slate-400 capitalize">{task.status.replace('_', ' ')}</span>
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
          {milestones.length === 0 && <div className={`${surface} text-center py-12 rounded-xl border border-dashed border-[color:var(--dash-glass-border)] text-slate-400`}>No milestones defined yet. Start planning your roadmap!</div>}
        </div>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <div className={`${elevated} p-6 rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] overflow-x-auto`}>
          <div className="min-w-[350px]">
            {/* Timeline Header */}
            <div className="flex justify-between text-xs text-slate-400 uppercase font-bold mb-4 border-b border-[color:var(--dash-glass-border)] pb-2">
              <span>{new Date(project.startDate).toLocaleDateString()}</span>
              <span>Project Timeline</span>
              <span>{new Date(project.endDate).toLocaleDateString()}</span>
            </div>

            {/* Timeline Tracks */}
            <div className="space-y-6 relative min-h-[200px]">
              {/* Grid Lines (Optional visual aid) */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                <div className="w-px h-full bg-white/20"></div>
                <div className="w-px h-full bg-white/20"></div>
                <div className="w-px h-full bg-white/20"></div>
                <div className="w-px h-full bg-white/20"></div>
                <div className="w-px h-full bg-white/20"></div>
              </div>

              {milestones.map(m => {
                const style = getTimelineStyles(m);
                return (
                  <div key={m.id} className="relative h-12">
                    <div
                      className={`absolute h-10 rounded-lg shadow-sm border flex items-center px-3 cursor-pointer hover:shadow-md transition-all ${m.status === 'completed' ? 'bg-emerald-500/15 border-emerald-400/40' :
                        m.status === 'in_progress' ? 'bg-blue-500/15 border-blue-400/40' :
                          'bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]'
                        }`}
                      style={style}
                      onClick={() => startEdit(m)}
                    >
                      <div className="truncate w-full">
                        <p className="text-xs font-bold text-slate-50 truncate">{m.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-300">{m.progressPercent || 0}%</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-1 mt-1">
                          <div className={`h-1 rounded-full ${m.status === 'completed' ? 'bg-emerald-400' : 'bg-[color:var(--dash-primary)]'
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
    {logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(log => {
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
