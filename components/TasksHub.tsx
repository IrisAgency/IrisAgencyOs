import React, { useState } from 'react';
import { Task, Project, User, TaskStatus, Priority, Department, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval, AgencyFile, TaskType, WorkflowTemplate, WorkflowStepTemplate, ProjectMember, RoleDefinition, ProjectMilestone, SocialPost, UserRole } from '../types';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  LayoutGrid,
  List,
  Filter
} from 'lucide-react';
import { PERMISSIONS } from '../lib/permissions';
import { archiveTask } from '../utils/archiveUtils';
import TaskDetailView from './tasks/TaskDetailView';
import CreateTaskModal from './tasks/CreateTaskModal';
import PageContainer from './layout/PageContainer';
import TaskBoardDark, { DueTone, ToneFn } from './tasks/TaskBoardDark';
import TaskListDark from './tasks/TaskListDark';
import TaskStatsRow from './tasks/TaskStatsRow';
import WorkflowHub from './workflows/WorkflowHub';

interface TasksHubProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  comments: TaskComment[];
  timeLogs: TaskTimeLog[];
  dependencies: TaskDependency[];
  activityLogs: TaskActivityLog[];
  approvalSteps: ApprovalStep[];
  clientApprovals: ClientApproval[];
  files: AgencyFile[];
  workflowTemplates: WorkflowTemplate[];
  projectMembers: ProjectMember[]; // Needed to resolve dynamic roles
  roles: RoleDefinition[]; // Needed to resolve role IDs
  milestones: ProjectMilestone[];
  currentUser: User;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onAddComment: (comment: TaskComment) => void;
  onAddTimeLog: (log: TaskTimeLog) => void;
  onAddDependency: (dep: TaskDependency) => void;
  onUpdateApprovalStep: (step: ApprovalStep) => void;
  onAddApprovalSteps: (steps: ApprovalStep[]) => void;
  onUpdateClientApproval: (ca: ClientApproval) => void;
  onAddClientApproval: (ca: ClientApproval) => void;
  onUploadFile: (file: AgencyFile) => void;
  onNotify: (type: string, title: string, message: string) => void;
  checkPermission: (code: string) => boolean;
  onDeleteTask: (task: Task) => void;
  initialSelectedTaskId?: string | null;
  onAddSocialPost: (post: SocialPost) => void;
  leaveRequests?: any[];
}

const TasksHub: React.FC<TasksHubProps> = ({
  tasks = [], projects = [], users = [], comments = [], timeLogs = [], dependencies = [], activityLogs = [],
  approvalSteps = [], clientApprovals = [], files = [], workflowTemplates = [], projectMembers = [], roles = [], milestones = [], currentUser,
  onAddTask, onUpdateTask, onAddComment, onAddTimeLog, onAddDependency,
  onUpdateApprovalStep, onAddApprovalSteps, onUpdateClientApproval, onAddClientApproval, onUploadFile, onNotify, checkPermission, onDeleteTask,
  initialSelectedTaskId, onAddSocialPost, leaveRequests = []
}) => {
  // State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Effect to handle external navigation to a specific task
  React.useEffect(() => {
    if (initialSelectedTaskId) {
      setSelectedTaskId(initialSelectedTaskId);
    }
  }, [initialSelectedTaskId]);

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'my_approvals'>('all'); // Replaced onlyMyApprovals with viewMode
  const [showArchived, setShowArchived] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'board' | 'list'>('board');
  const [activeArea, setActiveArea] = useState<'tasks' | 'workflows'>('tasks');

  // Date Filters
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Derive unique lists for dropdowns
  const uniqueClients = Array.from(new Set(projects.map(p => p.client))).sort();
  const taskTypes: TaskType[] = ['design', 'video', 'photo', 'motion', 'post_production', 'copywriting', 'meeting', 'production', 'social_content', 'other'];

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsCreateModalOpen(true);
  };

  // -- Helper Functions --

  const statusTone: ToneFn<TaskStatus> = (status) => {
    switch (status) {
      case TaskStatus.NEW: return 'bg-white/5 text-slate-100 border-[color:var(--dash-glass-border)]';
      case TaskStatus.ASSIGNED: return 'bg-blue-500/10 text-blue-100 border-blue-500/25';
      case TaskStatus.IN_PROGRESS: return 'bg-indigo-500/10 text-indigo-100 border-indigo-500/25';
      case TaskStatus.AWAITING_REVIEW: return 'bg-amber-500/10 text-amber-100 border-amber-500/20';
      case TaskStatus.REVISIONS_REQUIRED: return 'bg-rose-500/10 text-rose-100 border-rose-500/25';
      case TaskStatus.APPROVED: return 'bg-emerald-500/10 text-emerald-100 border-emerald-500/25';
      case TaskStatus.CLIENT_REVIEW: return 'bg-purple-500/10 text-purple-100 border-purple-500/25';
      case TaskStatus.CLIENT_APPROVED: return 'bg-teal-500/10 text-teal-100 border-teal-500/25';
      case TaskStatus.COMPLETED: return 'bg-emerald-600/15 text-emerald-100 border-emerald-400/40';
      case TaskStatus.ARCHIVED: return 'bg-slate-800/60 text-slate-300 border-[color:var(--dash-glass-border)]';
      default: return 'bg-white/5 text-slate-100 border-[color:var(--dash-glass-border)]';
    }
  };

  const getStatusColor = statusTone;

  const priorityTone: ToneFn<Priority> = (priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'text-rose-100 bg-rose-500/15 border border-rose-400/30';
      case Priority.HIGH: return 'text-orange-100 bg-orange-500/15 border border-orange-400/30';
      case Priority.MEDIUM: return 'text-blue-100 bg-blue-500/15 border border-blue-400/30';
      case Priority.LOW: return 'text-slate-200 bg-white/5 border border-[color:var(--dash-glass-border)]';
    }
  };

  const dueTone: DueTone = (date) => {
    const now = new Date();
    const due = new Date(date);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue', className: 'text-rose-200 bg-rose-500/10 border border-rose-500/25' };
    if (diffDays <= 3) return { label: 'Due soon', className: 'text-amber-200 bg-amber-500/10 border border-amber-500/25' };
    return { label: 'On track', className: 'text-emerald-200 bg-emerald-500/10 border border-emerald-500/25' };
  };

  const handleArchiveTask = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to archive "${task.title}"? This will move all files to the archive folder and lock the task.`)) return;
    try {
      await archiveTask(task, currentUser.id);
      onNotify('system', 'Task Archived', `Task "${task.title}" has been archived successfully.`);
      if (selectedTaskId === task.id) setSelectedTaskId(null);
    } catch (error) {
      console.error(error);
      onNotify('system', 'Error', 'Failed to archive task.');
    }
  };

  const handleReopenTask = async (task: Task) => {
    const action = task.isArchived ? 'unarchive' : 'reopen';
    if (!window.confirm(`Are you sure you want to ${action} "${task.title}"? This will move it back to In Progress.`)) return;
    try {
      const updatedTask = {
        ...task,
        status: TaskStatus.IN_PROGRESS,
        isArchived: false,
        completedAt: null as any,
        archivedAt: null,
        archivedBy: null
      };
      onUpdateTask(updatedTask);
      onNotify('success', `Task ${action === 'unarchive' ? 'Unarchived' : 'Reopened'}`, `Task "${task.title}" has been ${action}d.`);
    } catch (error) {
      console.error(error);
      onNotify('error', 'Error', `Failed to ${action} task.`);
    }
  };

  const getPriorityColor = priorityTone;

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterType('all');
    setFilterClient('all');
    setFilterAssignee('all');
    setFilterProject('all');
    setFilterDepartment('all');
    setStartDateFrom('');
    setStartDateTo('');
    setDueDateFrom('');
    setDueDateTo('');
    setViewMode('all');
    setSearchTerm('');
  };

  const resolveApprover = (step: WorkflowStepTemplate, task: Task): string | null => {
    // 0. Specific User
    if (step.specificUserId) {
      return step.specificUserId;
    }

    // A. Project Role (e.g. "Account Manager")
    if (step.projectRoleKey) {
      const member = projectMembers.find(pm => pm.projectId === task.projectId && pm.roleInProject === step.projectRoleKey);
      return member ? member.userId : null;
    }

    // B. System Role (e.g. "Creative Director")
    if (step.roleId) {
      // Find the role definition
      const roleDef = roles.find(r => r.id === step.roleId);
      if (roleDef) {
        // Find a user with this role
        // Priority 1: In the project?
        const projectUserIds = projectMembers.filter(pm => pm.projectId === task.projectId).map(pm => pm.userId);
        const projectApprover = users.find(u => u.role === roleDef.name && projectUserIds.includes(u.id));
        if (projectApprover) return projectApprover.id;

        // Priority 2: In the department?
        const deptApprover = users.find(u => u.role === roleDef.name && u.department === task.department);
        if (deptApprover) return deptApprover.id;

        // Priority 3: Any user with the role
        const anyApprover = users.find(u => u.role === roleDef.name);
        if (anyApprover) return anyApprover.id;
      }
    }
    return null; // Unresolved
  };

  // Filter Logic
  const filteredTasks = tasks.filter(t => {
    // Basic Filters
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchType = filterType === 'all' || t.taskType === filterType;
    const matchClient = filterClient === 'all' || t.client === filterClient;
    const matchProject = filterProject === 'all' || t.projectId === filterProject;
    const matchDepartment = filterDepartment === 'all' || t.department === filterDepartment;

    // Search
    const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.client?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    // Assignee
    const matchAssignee = filterAssignee === 'all' || (t.assigneeIds || []).includes(filterAssignee);

    // Date Range Logic
    const taskStart = new Date(t.startDate).getTime();
    const taskDue = new Date(t.dueDate).getTime();

    const matchStartFrom = !startDateFrom || taskStart >= new Date(startDateFrom).getTime();
    const matchStartTo = !startDateTo || taskStart <= new Date(startDateTo).getTime();

    const matchDueFrom = !dueDateFrom || taskDue >= new Date(dueDateFrom).getTime();
    const matchDueTo = !dueDateTo || taskDue <= new Date(dueDateTo).getTime();

    // Archive/Completed Filter
    let matchArchived = false;
    if (showArchived) {
      // Show Archived OR Completed
      matchArchived = t.isArchived || t.status === TaskStatus.COMPLETED;
    } else {
      // Show Active (Not Archived AND Not Completed)
      matchArchived = !t.isArchived && t.status !== TaskStatus.COMPLETED;
    }

    // "My Approvals" Filter
    let matchApproval = true;
    if (viewMode === 'my_approvals') {
      const myPendingStep = approvalSteps.find(s =>
        s.taskId === t.id &&
        s.approverId === currentUser.id &&
        s.status === 'pending'
      );
      matchApproval = !!myPendingStep;
    }

    return matchStatus && matchPriority && matchType && matchClient && matchAssignee && matchProject && matchDepartment &&
      matchSearch && matchApproval && matchStartFrom && matchStartTo && matchDueFrom && matchDueTo && matchArchived;
  });

  const today = new Date();
  const activeCount = filteredTasks.filter(t => !t.isArchived && t.status !== TaskStatus.COMPLETED).length;
  const reviewCount = filteredTasks.filter(t => [TaskStatus.AWAITING_REVIEW, TaskStatus.CLIENT_REVIEW].includes(t.status)).length;
  const overdueCount = filteredTasks.filter(t => {
    const due = new Date(t.dueDate);
    return (t.status !== TaskStatus.COMPLETED && !t.isArchived) && due < today;
  }).length;
  const completedCount = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED || t.isArchived).length;

  return (
    <PageContainer className="px-0 sm:px-2 lg:px-4">
      <div className="bg-[color:var(--dash-bg)] text-slate-100 rounded-3xl border border-[color:var(--dash-glass-border)] shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]/80 backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Tasks & Workflow</p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-white">Execution Control</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-white/5 border border-[color:var(--dash-glass-border)] rounded-full p-1 flex items-center gap-1">
                  <button
                    onClick={() => setActiveArea('tasks')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeArea === 'tasks' ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 hover:bg-white/5'}`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setActiveArea('workflows')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${activeArea === 'workflows' ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 hover:bg-white/5'}`}
                  >
                    Workflows
                  </button>
                </div>
                {checkPermission('tasks.create') && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--dash-primary)] text-white text-sm font-semibold shadow-lg shadow-[color:var(--dash-primary)]/20 hover:scale-[1.01] transition-transform"
                  >
                    <Plus className="w-4 h-4" /> New Task
                  </button>
                )}
              </div>
            </div>

            <TaskStatsRow
              stats={[
                { label: 'Active', value: activeCount, hint: 'Excludes completed/archived' },
                { label: 'In Review', value: reviewCount },
                { label: 'Overdue', value: overdueCount },
                { label: 'Completed/Archived', value: completedCount }
              ]}
            />

            <div className="rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-3 sm:p-4 shadow-[0_16px_38px_-28px_rgba(0,0,0,0.9)] space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by title, client, or project"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!showArchived ? 'bg-[color:var(--dash-primary)] text-white border-[color:var(--dash-primary)]' : 'text-slate-200 bg-white/5 border-[color:var(--dash-glass-border)]'}`}
                  >
                    {showArchived ? 'Show Active' : 'Hide Archived'}
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'my_approvals' ? 'all' : 'my_approvals')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${viewMode === 'my_approvals' ? 'bg-amber-500/20 text-amber-100 border-amber-400/30' : 'text-slate-200 bg-white/5 border-[color:var(--dash-glass-border)]'}`}
                  >
                    {viewMode === 'my_approvals' ? 'My approvals' : 'All tasks'}
                  </button>
                  <button
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[color:var(--dash-glass-border)] text-slate-200 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" /> Filters
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white/5 border border-[color:var(--dash-glass-border)] rounded-full p-1">
                  <button
                    onClick={() => setLayoutMode('board')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${layoutMode === 'board' ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 hover:bg-white/5'}`}
                  >
                    <LayoutGrid className="w-4 h-4" /> Board
                  </button>
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${layoutMode === 'list' ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 hover:bg-white/5'}`}
                  >
                    <List className="w-4 h-4" /> List
                  </button>
                </div>
              </div>

              {isFilterPanelOpen && (
                <div className="space-y-4 border-t border-[color:var(--dash-glass-border)] pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wide">Status</label>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                        <option value="all">All</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wide">Priority</label>
                      <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                        <option value="all">All</option>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wide">Type</label>
                      <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                        <option value="all">All</option>
                        {taskTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase tracking-wide">Assignee</label>
                      <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                        <option value="all">Anyone</option>
                        {((checkPermission('tasks.manage_assignees') || checkPermission(PERMISSIONS.TASKS.ASSIGN_ALL) || checkPermission(PERMISSIONS.TASKS.ASSIGN_DEPT) || currentUser.role === UserRole.GENERAL_MANAGER)
                          ? users
                          : users.filter(u => projectMembers.some(pm => pm.userId === u.id && projects.some(p => p.id === pm.projectId)))
                        ).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2 text-sm text-[color:var(--dash-primary)] font-semibold"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                    {showAdvancedFilters ? 'Hide advanced filters' : 'Show advanced filters'}
                  </button>

                  {showAdvancedFilters && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Client</label>
                          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                            <option value="all">All</option>
                            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Project</label>
                          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                            <option value="all">All</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Department</label>
                          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100">
                            <option value="all">All</option>
                            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Start Date</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={startDateFrom} onChange={e => setStartDateFrom(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100" />
                            <input type="date" value={startDateTo} onChange={e => setStartDateTo(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Due Date</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={dueDateFrom} onChange={e => setDueDateFrom(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100" />
                            <input type="date" value={dueDateTo} onChange={e => setDueDateTo(e.target.value)} className="w-full p-2 bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-lg text-sm text-slate-100" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button onClick={clearFilters} className="text-sm text-slate-200 hover:text-white underline-offset-4 hover:underline">
                          Clear filters
                        </button>
                        <span className="text-xs text-slate-500">{filteredTasks.length} matching tasks</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {activeArea === 'tasks' ? (
            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
              <div className="space-y-4">
                {layoutMode === 'board' ? (
                  <TaskBoardDark
                    tasks={filteredTasks}
                    users={users}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={setSelectedTaskId}
                    statusTone={statusTone}
                    priorityTone={priorityTone}
                    dueTone={dueTone}
                  />
                ) : (
                  <TaskListDark
                    tasks={filteredTasks}
                    users={users}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={setSelectedTaskId}
                    statusTone={statusTone}
                    priorityTone={priorityTone}
                    dueTone={dueTone}
                  />
                )}
              </div>

              <div className="hidden lg:flex flex-col rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.9)] overflow-hidden">
                {selectedTask ? (
                  <TaskDetailView
                    task={selectedTask}
                    project={projects.find(p => p.id === selectedTask.projectId)}
                    users={users}
                    comments={comments.filter(c => c.taskId === selectedTask.id)}
                    timeLogs={timeLogs.filter(t => t.taskId === selectedTask.id)}
                    dependencies={dependencies.filter(d => d.taskId === selectedTask.id)}
                    activityLogs={activityLogs.filter(l => l.taskId === selectedTask.id)}
                    taskSteps={approvalSteps.filter(s => s.taskId === selectedTask.id)}
                    clientApproval={clientApprovals.find(ca => ca.taskId === selectedTask.id)}
                    taskFiles={files.filter(f => f.taskId === selectedTask.id)}
                    allTasks={tasks}
                    currentUser={currentUser}
                    workflowTemplates={workflowTemplates}
                    milestones={milestones}
                    onUpdateTask={onUpdateTask}
                    onAddTask={onAddTask}
                    onAddComment={onAddComment}
                    onAddTimeLog={onAddTimeLog}
                    onAddDependency={onAddDependency}
                    onUpdateApprovalStep={onUpdateApprovalStep}
                    onAddApprovalSteps={onAddApprovalSteps}
                    onUpdateClientApproval={onUpdateClientApproval}
                    onAddClientApproval={onAddClientApproval}
                    onUploadFile={onUploadFile}
                    onNotify={onNotify}
                    onArchiveTask={handleArchiveTask}
                    onReopenTask={handleReopenTask}
                    onDeleteTask={onDeleteTask}
                    onEditTask={openEditModal}
                    checkPermission={checkPermission}
                    getStatusColor={getStatusColor}
                    resolveApprover={resolveApprover}
                    onAddSocialPost={onAddSocialPost}
                    leaveRequests={leaveRequests}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                    <CheckCircle className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Select a task to view details</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <WorkflowHub
              tasks={filteredTasks}
              workflowTemplates={workflowTemplates}
              approvalSteps={approvalSteps}
              users={users}
              projects={projects}
              onSelectTask={setSelectedTaskId}
              statusTone={statusTone}
              dueTone={dueTone}
            />
          )}

          {activeArea === 'tasks' && selectedTask && (
            <div className="lg:hidden rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[color:var(--dash-glass-border)] text-slate-200">
                <button onClick={() => setSelectedTaskId(null)} className="text-slate-300 hover:text-white"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                <span className="text-sm font-semibold">Task Detail</span>
              </div>
              <TaskDetailView
                task={selectedTask}
                project={projects.find(p => p.id === selectedTask.projectId)}
                users={users}
                comments={comments.filter(c => c.taskId === selectedTask.id)}
                timeLogs={timeLogs.filter(t => t.taskId === selectedTask.id)}
                dependencies={dependencies.filter(d => d.taskId === selectedTask.id)}
                activityLogs={activityLogs.filter(l => l.taskId === selectedTask.id)}
                taskSteps={approvalSteps.filter(s => s.taskId === selectedTask.id)}
                clientApproval={clientApprovals.find(ca => ca.taskId === selectedTask.id)}
                taskFiles={files.filter(f => f.taskId === selectedTask.id)}
                allTasks={tasks}
                currentUser={currentUser}
                workflowTemplates={workflowTemplates}
                milestones={milestones}
                onUpdateTask={onUpdateTask}
                onAddTask={onAddTask}
                onAddComment={onAddComment}
                onAddTimeLog={onAddTimeLog}
                onAddDependency={onAddDependency}
                onUpdateApprovalStep={onUpdateApprovalStep}
                onAddApprovalSteps={onAddApprovalSteps}
                onUpdateClientApproval={onUpdateClientApproval}
                onAddClientApproval={onAddClientApproval}
                onUploadFile={onUploadFile}
                onNotify={onNotify}
                onArchiveTask={handleArchiveTask}
                onReopenTask={handleReopenTask}
                onDeleteTask={onDeleteTask}
                onEditTask={openEditModal}
                checkPermission={checkPermission}
                getStatusColor={getStatusColor}
                resolveApprover={resolveApprover}
                onAddSocialPost={onAddSocialPost}
                leaveRequests={leaveRequests}
              />
            </div>
          )}
        </div>

        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false); setEditingTask(null); }}
          editingTask={editingTask}
          currentUser={currentUser}
          projects={projects}
          users={users}
          milestones={milestones}
          workflowTemplates={workflowTemplates}
          projectMembers={projectMembers}
          leaveRequests={leaveRequests}
          checkPermission={checkPermission}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onNotify={onNotify}
        />
      </div>
    </PageContainer>
  );
};

export default TasksHub;
