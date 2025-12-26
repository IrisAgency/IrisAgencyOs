import React, { useState } from 'react';
import { Task, Project, User, TaskStatus, Priority, Department, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval, AgencyFile, TaskType, WorkflowTemplate, WorkflowStepTemplate, ProjectMember, RoleDefinition, ProjectMilestone, SocialPost, UserRole } from '../types';
import {
  Plus, Search, SlidersHorizontal, ChevronDown, Archive, Clock, ChevronRight, CheckCircle
} from 'lucide-react';
import { PERMISSIONS } from '../lib/permissions';
import { archiveTask } from '../utils/archiveUtils';
import TaskDetailView from './tasks/TaskDetailView';
import CreateTaskModal from './tasks/CreateTaskModal';
import PageContainer from './layout/PageContainer';

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

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.NEW: return 'bg-slate-100 text-slate-600 border-slate-200';
      case TaskStatus.ASSIGNED: return 'bg-blue-50 text-blue-600 border-blue-100';
      case TaskStatus.IN_PROGRESS: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case TaskStatus.AWAITING_REVIEW: return 'bg-amber-50 text-amber-600 border-amber-100';
      case TaskStatus.REVISIONS_REQUIRED: return 'bg-rose-50 text-rose-600 border-rose-100';
      case TaskStatus.APPROVED: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case TaskStatus.CLIENT_REVIEW: return 'bg-purple-50 text-purple-600 border-purple-100';
      case TaskStatus.CLIENT_APPROVED: return 'bg-teal-50 text-teal-600 border-teal-100';
      case TaskStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
      case TaskStatus.ARCHIVED: return 'bg-gray-100 text-gray-400 border-gray-200';
      default: return 'bg-slate-100 text-slate-600';
    }
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

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'text-rose-600 bg-rose-50 border-rose-100';
      case Priority.HIGH: return 'text-orange-600 bg-orange-50 border-orange-100';
      case Priority.MEDIUM: return 'text-blue-600 bg-blue-50 border-blue-100';
      case Priority.LOW: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

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

  return (
    <PageContainer>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] -mx-6 lg:-mx-8">
        {/* --- LEFT PANEL: LIST --- */}
        <div className={`
          w-full lg:w-1/3 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col
          ${selectedTaskId ? 'hidden lg:flex' : 'flex'}
        `}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white z-20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Tasks</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`p-2 rounded-lg border transition-all ${isFilterPanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                title="Advanced Filters"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              {checkPermission('tasks.create') && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks by title or client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* View Toggle: Active vs Archived */}
          <div className="mt-3 flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setShowArchived(false)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!showArchived ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active Tasks
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${showArchived ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Archived & Completed
            </button>
          </div>

          {/* Advanced Filter Panel */}
          {isFilterPanelOpen && (
            <div className="mt-4 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner space-y-4 text-sm animate-in slide-in-from-top-2 duration-200">
              {/* Basic Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">All Statuses</option>
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">All Types</option>
                    {taskTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Assigned To</label>
                  <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Anyone</option>
                    {/* Filter users based on permission: manage_assignees sees all, others see only project members */}
                    {((checkPermission('tasks.manage_assignees') || checkPermission(PERMISSIONS.TASKS.ASSIGN_ALL) || checkPermission(PERMISSIONS.TASKS.ASSIGN_DEPT) || currentUser.role === UserRole.GENERAL_MANAGER)
                      ? users
                      : users.filter(u => projectMembers.some(pm => pm.userId === u.id && projects.some(p => p.id === pm.projectId)))
                    ).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">All Priorities</option>
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* More Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {showAdvancedFilters ? <ChevronDown className="w-3 h-3 rotate-180" /> : <ChevronDown className="w-3 h-3" />}
                {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
              </button>

              {/* Advanced Filters Section */}
              {showAdvancedFilters && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
                      <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Clients</option>
                        {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Project</label>
                      <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                      <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Departments</option>
                        {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Date Ranges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Start Date (From/To)</label>
                      <div className="flex flex-col sm:flex-row gap-1">
                        <input type="date" value={startDateFrom} onChange={e => setStartDateFrom(e.target.value)} className="w-full p-1 border rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                        <input type="date" value={startDateTo} onChange={e => setStartDateTo(e.target.value)} className="w-full p-1 border rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Due Date (From/To)</label>
                      <div className="flex flex-col sm:flex-row gap-1">
                        <input type="date" value={dueDateFrom} onChange={e => setDueDateFrom(e.target.value)} className="w-full p-1 border rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                        <input type="date" value={dueDateTo} onChange={e => setDueDateTo(e.target.value)} className="w-full p-1 border rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'my_approvals' ? 'all' : 'my_approvals')}
                    className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${viewMode === 'my_approvals'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {viewMode === 'my_approvals' ? 'Showing My Approvals' : 'Show My Approvals'}
                  </button>
                </div>
                <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <span>No tasks match your filters.</span>
              <button onClick={clearFilters} className="text-indigo-600 hover:underline font-medium">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                const isMyApproval = approvalSteps.some(s => s.taskId === task.id && s.approverId === currentUser.id && s.status === 'pending');
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 relative ${selectedTaskId === task.id ? 'bg-indigo-50 border-indigo-500' : 'border-transparent'
                      }`}
                  >
                    {isMyApproval && (
                      <div className="absolute right-4 top-4">
                        <span className="flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{task.client}</span>
                        <div className="flex -space-x-1 mt-1">
                          {(task.assigneeIds || []).map(uid => {
                            const u = users.find(user => user.id === uid);
                            return u ? (
                              <img 
                                key={uid} 
                                src={u.avatar} 
                                className="w-4 h-4 rounded-full border border-white" 
                                title={u.name} 
                              />
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {task.isArchived && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase font-bold tracking-wider flex items-center gap-1">
                            <Archive className="w-3 h-3" /> Archived
                          </span>
                        )}
                        {task.taskType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold tracking-wider">
                            {task.taskType}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <h3 className={`text-sm font-semibold mb-2 ${selectedTaskId === task.id ? 'text-indigo-700' : 'text-slate-900'}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <div className="flex items-center text-slate-400 text-xs space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT PANEL: DETAILS --- */}
      <div className={`
        flex-1 bg-slate-50 flex flex-col h-full overflow-hidden relative
        ${!selectedTaskId ? 'hidden lg:flex' : 'flex'}
      `}>
        {selectedTask ? (
          <>
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedTaskId(null)}
              className="lg:hidden flex items-center gap-2 p-4 bg-white border-b border-slate-200 text-slate-600 hover:text-slate-900"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span className="font-medium">Back to Tasks</span>
            </button>

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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a task to view details</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
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
