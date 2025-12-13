import React, { useState } from 'react';
import { Task, Project, User, TaskStatus, Priority, Department, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval, AgencyFile, TaskType, WorkflowTemplate, WorkflowStepTemplate, ProjectMember, RoleDefinition, ProjectMilestone, SocialPlatform, SocialPost } from '../types';
import { 
  Plus, Search, Filter, Calendar, Clock, CheckCircle, 
  MessageSquare, FileText, Link, Paperclip, MoreVertical, 
  Play, Pause, AlertCircle, ChevronRight, User as UserIcon, Send,
  ThumbsUp, ThumbsDown, ShieldCheck, CornerUpLeft, Upload, Download,
  X, ChevronDown, SlidersHorizontal, GitMerge, Check, Archive, RotateCcw, Edit2, Share2
} from 'lucide-react';
import { archiveTask } from '../utils/archiveUtils';
import { deleteField } from 'firebase/firestore';

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
}

const TasksHub: React.FC<TasksHubProps> = ({ 
  tasks = [], projects = [], users = [], comments = [], timeLogs = [], dependencies = [], activityLogs = [], 
  approvalSteps = [], clientApprovals = [], files = [], workflowTemplates = [], projectMembers = [], roles = [], milestones = [], currentUser,
  onAddTask, onUpdateTask, onAddComment, onAddTimeLog, onAddDependency,
  onUpdateApprovalStep, onAddApprovalSteps, onUpdateClientApproval, onAddClientApproval, onUploadFile, onNotify, checkPermission, onDeleteTask,
  initialSelectedTaskId, onAddSocialPost
}) => {
  // State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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

  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskDept, setNewTaskDept] = useState<Department>(Department.CREATIVE);
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [newTaskType, setNewTaskType] = useState<TaskType>('design');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskMilestone, setNewTaskMilestone] = useState('');
  const [newTaskWorkflow, setNewTaskWorkflow] = useState<string>('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskRequiresSocial, setNewTaskRequiresSocial] = useState(false);
  const [newTaskSocialPlatforms, setNewTaskSocialPlatforms] = useState<SocialPlatform[]>([]);
  const [newTaskSocialManagerId, setNewTaskSocialManagerId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  
  // Derive unique lists for dropdowns
  const uniqueClients = Array.from(new Set(projects.map(p => p.client))).sort();
  const taskTypes: TaskType[] = ['design', 'video', 'photo', 'motion', 'post_production', 'copywriting', 'meeting', 'production', 'social_content', 'other'];
  const socialPlatforms: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'website', 'twitter', 'other'];

  // Auto-select workflow when dept/type changes
  React.useEffect(() => {
      if (isCreateModalOpen && !editingTask) {
          const active = getActiveWorkflow(newTaskDept, newTaskType);
          setNewTaskWorkflow(active?.id || '');
      }
  }, [newTaskDept, newTaskType, isCreateModalOpen, editingTask]);

  const openEditModal = (task: Task) => {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskProject(task.projectId);
      setNewTaskDept(task.department);
      setNewTaskPriority(task.priority);
      setNewTaskType(task.taskType);
      setNewTaskDue(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      setNewTaskMilestone(task.milestoneId || '');
      setNewTaskWorkflow(task.workflowTemplateId || '');
      setNewTaskRequiresSocial(task.requiresSocialPost || false);
      setNewTaskSocialPlatforms(task.socialPlatforms || []);
      setNewTaskSocialManagerId(task.socialManagerId || '');
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

  // -- Smart Workflow Engine --

  const getAvailableWorkflows = (dept: string, type: string) => {
      return workflowTemplates.filter(w => 
          (w.departmentId === dept || w.departmentId === null) && 
          (w.taskType === type || w.taskType === null) &&
          (w.status === 'active' || w.status === 'available' || !w.status) // Include legacy/undefined status
      );
  };

  const getActiveWorkflow = (dept: string, type: string) => {
      // 1. Specific Active match (Dept + Type)
      let match = workflowTemplates.find(w => w.departmentId === dept && w.taskType === type && w.status === 'active');
      // 2. Dept Active default (if any)
      if (!match) match = workflowTemplates.find(w => w.departmentId === dept && w.status === 'active' && !w.taskType);
      // 3. Global Active default (fallback)
      if (!match) match = workflowTemplates.find(w => !w.departmentId && w.status === 'active');
      
      // Fallback to old logic if no active status found (backward compatibility)
      if (!match) match = workflowTemplates.find(w => w.departmentId === dept && w.taskType === type && w.isDefault);
      
      return match;
  };

  const resolveApprover = (step: WorkflowStepTemplate, task: Task): string | null => {
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

  // -- Actions --

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskProject) return;

    if (editingTask) {
        // --- PERMISSION ENFORCEMENT ---
        const canEditAll = checkPermission('tasks.edit_all');
        const canEditOwn = checkPermission('tasks.edit_own');
        const isAssigneeOrCreator = (editingTask.assigneeIds || []).includes(currentUser.id) || editingTask.createdBy === currentUser.id;

        if (!canEditAll && !(canEditOwn && isAssigneeOrCreator)) {
             onNotify('error', 'Permission Denied', 'You are not allowed to edit this task.');
             return;
        }

        // Update existing
        const updatedTask: Task = {
            ...editingTask,
            title: newTaskTitle,
            // Restricted fields: Only 'edit_all' can change Project, Dept, Type
            projectId: canEditAll ? newTaskProject : editingTask.projectId,
            department: canEditAll ? newTaskDept : editingTask.department,
            taskType: canEditAll ? newTaskType : editingTask.taskType,
            
            priority: newTaskPriority,
            dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : editingTask.dueDate,
            milestoneId: newTaskMilestone || undefined,
            
            // Workflow: Only if permission
            workflowTemplateId: checkPermission('workflows.override_task_workflow') ? (newTaskWorkflow || editingTask.workflowTemplateId) : editingTask.workflowTemplateId,
            
            // Only update assignees if user has permission
            // Social Handover
            requiresSocialPost: newTaskRequiresSocial,
            socialPlatforms: newTaskRequiresSocial ? newTaskSocialPlatforms : [],
            socialManagerId: newTaskRequiresSocial ? newTaskSocialManagerId : null,

            updatedAt: new Date().toISOString()
        };
        onUpdateTask(updatedTask);
        onNotify('task_updated', 'Task Updated', `Task "${newTaskTitle}" has been updated.`);
    } else {
        // Create New
        const project = projects.find(p => p.id === newTaskProject);
        
        // Use selected workflow or auto-assign active
        let workflowId = newTaskWorkflow;
        if (!workflowId) {
            const activeWf = getActiveWorkflow(newTaskDept, newTaskType);
            workflowId = activeWf?.id || null;
        }
        const workflow = workflowTemplates.find(w => w.id === workflowId);

        // Determine assignees based on permission
        const finalAssignees = checkPermission('tasks.manage_assignees') 
            ? newTaskAssignees 
            : [currentUser.id]; // Default to self-assign if no permission

        // Start with IN_PROGRESS if workflow exists (assignee can work immediately)
        // Otherwise start with ASSIGNED (traditional flow)
        const initialStatus = workflowId ? TaskStatus.IN_PROGRESS : TaskStatus.ASSIGNED;

        const newTask: Task = {
        id: `t${Date.now()}`,
        projectId: newTaskProject,
        title: newTaskTitle,
        description: '',
        department: newTaskDept,
        priority: newTaskPriority,
        taskType: newTaskType,
        status: initialStatus,
        startDate: new Date().toISOString(),
        dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : new Date().toISOString(),
        milestoneId: newTaskMilestone || undefined,
        assigneeIds: finalAssignees,
        createdBy: currentUser.id,
        approvalPath: [], // Deprecated in favor of dynamic flow, kept for fallback
        workflowTemplateId: workflowId,
        currentApprovalLevel: 0,
        isClientApprovalRequired: workflow ? workflow.requiresClientApproval : false,
        attachments: [],
        client: project?.client,
        isArchived: false,
        // Social Handover
        requiresSocialPost: newTaskRequiresSocial,
        socialPlatforms: newTaskRequiresSocial ? newTaskSocialPlatforms : [],
        socialManagerId: newTaskRequiresSocial ? newTaskSocialManagerId : null,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
        };

        onAddTask(newTask);
        onNotify('task_assigned', 'Task Created', `New task "${newTaskTitle}" created in ${project?.name}.`);
    }
    
    setIsCreateModalOpen(false);
    setEditingTask(null);
    setNewTaskTitle('');
    setNewTaskProject('');
    setNewTaskRequiresSocial(false);
    setNewTaskSocialPlatforms([]);
    setNewTaskSocialManagerId('');
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

    // Archive Filter
    const matchArchived = showArchived ? true : !t.isArchived;

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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] -m-4 sm:-m-6 lg:-m-8">
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
                              {(checkPermission('tasks.manage_assignees') 
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
                            className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                                viewMode === 'my_approvals'
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
            <div className="p-8 text-center text-slate-400 text-sm">No tasks match your filters.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                  const isMyApproval = approvalSteps.some(s => s.taskId === task.id && s.approverId === currentUser.id && s.status === 'pending');
                  return (
                    <div 
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 relative ${
                        selectedTaskId === task.id ? 'bg-indigo-50 border-indigo-500' : 'border-transparent'
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
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{task.client}</span>
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
                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
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
            onDeleteTask={onDeleteTask}
            onEditTask={openEditModal}
            checkPermission={checkPermission}
            getStatusColor={getStatusColor}
            resolveApprover={resolveApprover}
            onAddSocialPost={onAddSocialPost}
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
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-w-lg max-h-screen overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-900">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button onClick={() => { setIsCreateModalOpen(false); setEditingTask(null); }} className="text-slate-400 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
            <form onSubmit={handleSaveTask} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
                <input required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Design Homepage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
                <select 
                  required 
                  value={newTaskProject} 
                  onChange={e => setNewTaskProject(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={!!editingTask && !checkPermission('tasks.edit_all')}
                >
                  <option value="">Select Project</option>
                  {projects.filter(p => p.status === 'active' || p.status === 'planning').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.client})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Milestone (Optional)</label>
                <select 
                  value={newTaskMilestone} 
                  onChange={e => setNewTaskMilestone(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" 
                  disabled={!newTaskProject || (!!editingTask && !checkPermission('tasks.edit_all'))}
                >
                  <option value="">Select Milestone</option>
                  {milestones.filter(m => m.projectId === newTaskProject).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                   <select 
                     value={newTaskType} 
                     onChange={e => setNewTaskType(e.target.value as TaskType)} 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                     disabled={!!editingTask && !checkPermission('tasks.edit_all')}
                   >
                      {taskTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                   <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as Priority)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                   <select 
                     value={newTaskDept} 
                     onChange={e => setNewTaskDept(e.target.value as Department)} 
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                     disabled={!!editingTask && !checkPermission('tasks.edit_all')}
                   >
                      {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              {/* Assignees Selection */}
              {checkPermission('tasks.manage_assignees') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Team Members</label>
                <div className="border border-slate-300 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newTaskAssignees.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTaskAssignees([...newTaskAssignees, user.id]);
                          } else {
                            setNewTaskAssignees(newTaskAssignees.filter(id => id !== user.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{user.name}</span>
                      <span className="text-xs text-slate-400">({user.role})</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    {newTaskAssignees.length === 0 ? 'No members assigned' : `${newTaskAssignees.length} member(s) assigned`}
                </p>
              </div>
              )}

              {/* Workflow Selection */}
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Workflow</label>
                  <select 
                      value={newTaskWorkflow} 
                      onChange={e => setNewTaskWorkflow(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={!checkPermission('workflows.override_task_workflow')}
                  >
                      <option value="" disabled>Select Workflow</option>
                      {getAvailableWorkflows(newTaskDept, newTaskType).map(wf => (
                          <option key={wf.id} value={wf.id}>
                              {wf.name} ({wf.status === 'active' || (!wf.status && wf.isDefault) ? 'Active' : 'Available'})
                          </option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                      {newTaskWorkflow 
                          ? `Selected: ${workflowTemplates.find(w => w.id === newTaskWorkflow)?.name}`
                          : `Default: ${getActiveWorkflow(newTaskDept, newTaskType)?.name || 'None'}`
                      }
                  </p>
              </div>

              {/* Social Handover Options */}
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <label className="flex items-center space-x-2 cursor-pointer mb-2">
                      <input 
                          type="checkbox" 
                          checked={newTaskRequiresSocial} 
                          onChange={e => setNewTaskRequiresSocial(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-indigo-900">Requires Social Media Post?</span>
                  </label>
                  
                  {newTaskRequiresSocial && (
                      <div className="pl-6 animate-in fade-in slide-in-from-top-1">
                          <div className="mb-3">
                              <label className="block text-xs font-medium text-indigo-800 mb-1">Social Manager</label>
                              <select 
                                  value={newTaskSocialManagerId} 
                                  onChange={e => setNewTaskSocialManagerId(e.target.value)} 
                                  className="w-full px-2 py-1.5 border border-indigo-200 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                  <option value="">Select Manager</option>
                                  {users.filter(u => u.role === 'Social Manager' || u.department === 'Marketing').map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                              </select>
                          </div>

                          <label className="block text-xs font-medium text-indigo-800 mb-1">Select Platforms</label>
                          <div className="grid grid-cols-2 gap-2">
                              {socialPlatforms.map(platform => (
                                  <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          checked={newTaskSocialPlatforms.includes(platform)}
                                          onChange={(e) => {
                                              if (e.target.checked) {
                                                  setNewTaskSocialPlatforms([...newTaskSocialPlatforms, platform]);
                                              } else {
                                                  setNewTaskSocialPlatforms(newTaskSocialPlatforms.filter(p => p !== platform));
                                              }
                                          }}
                                          className="rounded text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span className="text-xs text-indigo-700 capitalize">{platform}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => { setIsCreateModalOpen(false); setEditingTask(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                    {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: DETAIL VIEW ---

interface DetailViewProps {
  task: Task;
  project?: Project;
  users: User[];
  comments: TaskComment[];
  timeLogs: TaskTimeLog[];
  dependencies: TaskDependency[];
  activityLogs: TaskActivityLog[];
  taskSteps: ApprovalStep[];
  clientApproval?: ClientApproval;
  taskFiles: AgencyFile[]; 
  allTasks: Task[];
  currentUser: User;
  workflowTemplates: WorkflowTemplate[];
  milestones: ProjectMilestone[];
  onUpdateTask: (t: Task) => void;
  onAddTask: (t: Task) => void; // Added for social task creation
  onAddComment: (c: TaskComment) => void;
  onAddTimeLog: (l: TaskTimeLog) => void;
  onAddDependency: (d: TaskDependency) => void;
  onUpdateApprovalStep: (s: ApprovalStep) => void;
  onAddApprovalSteps: (steps: ApprovalStep[]) => void;
  onUpdateClientApproval: (ca: ClientApproval) => void;
  onAddClientApproval: (ca: ClientApproval) => void;
  onUploadFile: (file: AgencyFile) => void; 
  onNotify: (type: string, title: string, message: string) => void;
  onArchiveTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  checkPermission: (code: string) => boolean;
  getStatusColor: (s: TaskStatus) => string;
  resolveApprover: (step: WorkflowStepTemplate, task: Task) => string | null;
  onAddSocialPost: (post: SocialPost) => void;
}

const TaskDetailView: React.FC<DetailViewProps> = ({ 
  task, project, users, comments, timeLogs, dependencies, activityLogs, taskSteps, clientApproval,
  taskFiles, allTasks, currentUser, workflowTemplates, milestones,
  onUpdateTask, onAddTask, onAddComment, onAddTimeLog, onAddDependency, 
  onUpdateApprovalStep, onAddApprovalSteps, onUpdateClientApproval, onAddClientApproval, onUploadFile, onNotify, onArchiveTask, onDeleteTask, onEditTask, checkPermission,
  getStatusColor, resolveApprover, onAddSocialPost
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const usedTemplate = workflowTemplates.find(w => w.id === task.workflowTemplateId);
  
  // Helper: Auto-track task lifecycle events
  const trackTimeEvent = (
    eventType: 'task_accepted' | 'task_started' | 'task_submitted' | 'task_approved' | 'task_rejected' | 'status_change' | 'assignment_changed',
    fromStatus?: TaskStatus,
    toStatus?: TaskStatus,
    note?: string
  ) => {
    const timeLog: TaskTimeLog = {
      id: `tl${Date.now()}_${currentUser.id}`,
      taskId: task.id,
      userId: currentUser.id,
      hours: 0, // Automatic events don't count as work hours
      logDate: new Date().toISOString(),
      note: note || `${eventType.replace(/_/g, ' ')}`,
      eventType,
      fromStatus,
      toStatus,
      isAutomatic: true,
      timestamp: new Date().toISOString()
    };
    onAddTimeLog(timeLog);
  };
  
  // Determine label for next step
  let nextStepLabel = '';
  if (usedTemplate && task.status === TaskStatus.IN_PROGRESS) {
      const firstStep = usedTemplate.steps.find(s => s.order === 0);
      if (firstStep) nextStepLabel = firstStep.label;
  }

  // Transition Helpers
  const canAdvance = () => {
    const controlledStatuses = [TaskStatus.AWAITING_REVIEW, TaskStatus.APPROVED, TaskStatus.CLIENT_REVIEW, TaskStatus.CLIENT_APPROVED];
    
    // Block if task is in controlled status (approvals only)
    if (controlledStatuses.includes(task.status) || task.status === TaskStatus.COMPLETED || task.status === TaskStatus.ARCHIVED) {
      return false;
    }

    // Allow ASSIGNED, IN_PROGRESS, or REVISIONS_REQUIRED to be advanced (submitted for approval/completion)
    // And only by assigned users
    if (task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVISIONS_REQUIRED) {
      return (task.assigneeIds || []).includes(currentUser.id);
    }

    // No other statuses can be advanced via this button
    return false;
  };
  
  const handleAdvanceStatus = () => {
    // Security Check: Only allow if canAdvance returns true
    if (!canAdvance()) {
      console.warn('Unauthorized attempt to advance task');
      onNotify('error', 'Access Denied', 'You are not authorized to advance this task.');
      return;
    }

    const oldStatus = task.status;

    // Submit for approval from ASSIGNED, IN_PROGRESS or REVISIONS_REQUIRED
    if (task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVISIONS_REQUIRED) {
         // Check if workflow exists
         if (task.workflowTemplateId) {
             // If resubmitting after revisions, reset the approval step that requested revisions
             if (task.status === TaskStatus.REVISIONS_REQUIRED && taskSteps.length > 0) {
                 // Find the step(s) that have revision_requested or rejected status
                 const stepsToReset = taskSteps.filter(s => 
                     s.status === 'revision_requested' || s.status === 'rejected'
                 );
                 
                 // Reset each step back to pending so the approver can act again
                 stepsToReset.forEach(step => {
                     onUpdateApprovalStep({ 
                         ...step, 
                         status: 'pending',
                         reviewedAt: '',
                         comment: ''
                     });
                 });
                 
                 // Also set any previous steps that were set to 'pending' during revision to 'approved'
                 // This ensures the workflow continues from where it was
                 const currentLevel = task.currentApprovalLevel || 0;
                 const previousPendingSteps = taskSteps.filter(s => 
                     s.level < currentLevel && s.status === 'pending'
                 );
                 
                 previousPendingSteps.forEach(step => {
                     onUpdateApprovalStep({ 
                         ...step, 
                         status: 'approved',
                         reviewedAt: new Date().toISOString()
                     });
                 });
                 
                 // Track resubmission event
                 trackTimeEvent('task_submitted', oldStatus, TaskStatus.AWAITING_REVIEW, `Resubmitted task after revisions`);
                 
                 // Clear revision data and move back to review
                 onUpdateTask({ 
                     ...task, 
                     status: TaskStatus.AWAITING_REVIEW,
                     revisionAssignedTo: deleteField() as any,
                     revisionComment: deleteField() as any,
                     updatedAt: new Date().toISOString() 
                 });
                 onNotify('approval_request', 'Resubmitted for Review', `Task "${task.title}" has been resubmitted for approval.`);
                 return;
             }
             
             // Moving to Review: Generate Steps Dynamically (first time submission)
             if (taskSteps.length === 0) {
                 const template = workflowTemplates.find(w => w.id === task.workflowTemplateId);
                 if (template && template.steps.length > 0) {
                     const newSteps: ApprovalStep[] = template.steps.map((step, index) => {
                         const approverId = resolveApprover(step, task);
                         return {
                             id: `as${Date.now()}_${index}`,
                             taskId: task.id,
                             milestoneId: task.milestoneId || null, // Link to milestone
                             approverId: approverId || 'unassigned', // Fallback needs handling
                             level: step.order,
                             status: index === 0 ? 'pending' : 'waiting',
                             createdAt: new Date().toISOString()
                         };
                     });
                     onAddApprovalSteps(newSteps);
                     onNotify('system', 'Workflow Started', `Approval workflow "${template.name}" initiated.`);
                 }
             }
             
             // Track submission event
             trackTimeEvent('task_submitted', oldStatus, TaskStatus.AWAITING_REVIEW, `Submitted task for review`);
             
             onUpdateTask({ ...task, status: TaskStatus.AWAITING_REVIEW, updatedAt: new Date().toISOString() });
             onNotify('approval_request', 'Approval Requested', `Task "${task.title}" is now awaiting review.`);
         } else {
             // No workflow - direct completion
             trackTimeEvent('task_submitted', oldStatus, TaskStatus.COMPLETED, `Completed task (no workflow)`);
             
             // Check for Social Handover
             if (task.requiresSocialPost && !task.socialPostId) {
                 const socialPost = createSocialPostFromTask(task);
                 
                 // Update Task with social post link
                 onUpdateTask({ 
                     ...task, 
                     status: TaskStatus.COMPLETED, 
                     socialPostId: socialPost.id,
                     completedAt: new Date().toISOString(),
                     updatedAt: new Date().toISOString() 
                 });
             } else {
                 // Normal Completion
                 onUpdateTask({ 
                     ...task, 
                     status: TaskStatus.COMPLETED, 
                     completedAt: new Date().toISOString(),
                     updatedAt: new Date().toISOString() 
                 });
                 onNotify('task_completed', 'Task Completed', `Task "${task.title}" has been completed.`);
             }
         }
    }
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    onAddComment({
      id: `tc${Date.now()}`,
      taskId: task.id,
      userId: currentUser.id,
      message: newComment,
      createdAt: new Date().toISOString()
    });
    setNewComment('');
  };

  const handleFileUpload = () => {
    try {
      console.log('Upload button clicked');
      console.log('Current user:', currentUser.name, currentUser.role);
      console.log('File input ref:', fileInputRef.current);
      console.log('Project:', project?.name, project?.id);
      console.log('Task:', task.title, task.id);
      
      if (!fileInputRef.current) {
        console.error('File input ref is null!');
        return;
      }
      
      fileInputRef.current.click();
      console.log('File input clicked successfully');
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('handleFileSelected called');
      
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) {
        console.log('No file selected');
        return;
      }
      
      if (!project) {
        console.error('No project found!');
        alert('Error: No project associated with this task');
        return;
      }
      
      console.log('File selected:', selectedFile.name, selectedFile.type, selectedFile.size);
      console.log('Project:', project.name, project.id);
      console.log('Current user:', currentUser.name, currentUser.id, currentUser.role);
      
      const newFile: AgencyFile = {
          id: `file${Date.now()}`,
          projectId: project.id,
          taskId: task.id,
          uploaderId: currentUser.id,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: '', // Will be set after upload
          version: 1,
          isDeliverable: false,
          tags: ['task-attachment'],
          isArchived: false,
          createdAt: new Date().toISOString()
      };
      
      console.log('Created file object:', newFile);
      
      // Attach the raw file for upload processing
      (newFile as any).file = selectedFile;
      
      console.log('Calling onUploadFile with file:', newFile.name);
      console.log('onUploadFile function:', typeof onUploadFile);
      
      onUploadFile(newFile);
      
      console.log('onUploadFile called successfully');
      
      // Reset file input
      if (event.target) event.target.value = '';
    } catch (error) {
      console.error('Error in handleFileSelected:', error);
      alert('Error selecting file: ' + (error as Error).message);
    }
  };

  // Helper to create social post
  const createSocialPostFromTask = (originalTask: Task) => {
      const newPost: SocialPost = {
          id: `sp${Date.now()}`,
          sourceTaskId: originalTask.id,
          projectId: originalTask.projectId,
          clientId: project?.clientId || '',
          title: originalTask.title,
          platforms: originalTask.socialPlatforms || [],
          caption: '', // To be filled by Social Manager
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser.id,
          timezone: 'UTC', // Default, can be changed
          socialManagerId: originalTask.socialManagerId || null,
          notesFromTask: originalTask.publishingNotes || null,
          publishAt: null
      };
      
      onAddSocialPost(newPost);
      onNotify('system', 'Social Handover', `Social post created in Posting Hub.`);
      return newPost;
  };

  // Approval Actions
  const handleApprovalAction = (action: 'approve' | 'reject' | 'revise', comment?: string) => {
      // Find the pending step for current user
      const currentStep = taskSteps.find(s => s.approverId === currentUser.id && s.status === 'pending');
      if (!currentStep) {
        console.warn('No pending approval step found for current user');
        onNotify('error', 'Access Denied', 'You are not authorized to approve this task at this time.');
        return;
      }

      if (action === 'approve') {
          // Track approval event
          trackTimeEvent('task_approved', task.status, TaskStatus.AWAITING_REVIEW, `Approved by ${currentUser.name}`);
          
          // 1. Mark current step approved
          onUpdateApprovalStep({ ...currentStep, status: 'approved', reviewedAt: new Date().toISOString(), comment: 'Approved' });
          
          // 2. Activate next step
          const nextLevel = currentStep.level + 1;
          const nextStep = taskSteps.find(s => s.level === nextLevel);
          
          if (nextStep) {
              onUpdateApprovalStep({ ...nextStep, status: 'pending' });
              onUpdateTask({ ...task, currentApprovalLevel: nextLevel, updatedAt: new Date().toISOString() });
          } else {
              // No more internal steps
              if (task.isClientApprovalRequired) {
                  onUpdateTask({ ...task, status: TaskStatus.CLIENT_REVIEW, updatedAt: new Date().toISOString() });
                  // Create Client Approval record if missing
                  if (!clientApproval && project?.clientId) {
                      onAddClientApproval({
                          id: `ca${Date.now()}`,
                          taskId: task.id,
                          clientId: project.clientId,
                          status: 'pending'
                      });
                  }
                  onNotify('task_status_changed', 'Ready for Client', `"${task.title}" moved to Client Review.`);
              } else {
                  // --- FINAL APPROVAL LOGIC ---
                  
                  // Check for Social Handover
                  if (task.requiresSocialPost && !task.socialPostId) {
                      const socialPost = createSocialPostFromTask(task);
                      
                      // Update Original Task
                      onUpdateTask({ 
                          ...task, 
                          status: TaskStatus.APPROVED, 
                          socialPostId: socialPost.id,
                          updatedAt: new Date().toISOString() 
                      });
                  } else {
                      // Normal Completion
                      onUpdateTask({ ...task, status: TaskStatus.APPROVED, updatedAt: new Date().toISOString() });
                      onNotify('task_status_changed', 'Approved', `"${task.title}" fully approved internally.`);
                  }
              }
          }
      } else {
          // Reject / Revise
          // Track rejection event
          trackTimeEvent('task_rejected', task.status, TaskStatus.REVISIONS_REQUIRED, `Revisions requested by ${currentUser.name}: ${comment || 'No comment'}`);
          
          // 1. Mark current step as revision requested
          onUpdateApprovalStep({ 
              ...currentStep, 
              status: action === 'reject' ? 'rejected' : 'revision_requested', 
              reviewedAt: new Date().toISOString(), 
              comment 
          });
          
          // 2. Determine previous user (who needs to fix it)
          let previousUserId = '';
          const previousLevel = currentStep.level - 1;
          
          if (previousLevel >= 0) {
              // Return to previous approver
              const previousStep = taskSteps.find(s => s.level === previousLevel);
              previousUserId = previousStep?.approverId || (task.assigneeIds || [])[0];
              
              // Re-open previous step
              if (previousStep) {
                  onUpdateApprovalStep({ ...previousStep, status: 'pending' });
              }
          } else {
              // Return to original assignee (Level 0 -> Assignee)
              previousUserId = (task.assigneeIds || [])[0];
          }

          // 3. Update Task with Revision Info
          const newHistory = [
              ...(task.revisionHistory || []),
              {
                  stepLevel: currentStep.level,
                  requestedBy: currentUser.id,
                  assignedTo: previousUserId,
                  comment: comment || 'Revisions requested',
                  date: new Date().toISOString()
              }
          ];

          onUpdateTask({ 
              ...task, 
              status: TaskStatus.REVISIONS_REQUIRED, 
              currentApprovalLevel: Math.max(0, previousLevel), // Move back one level
              revisionAssignedTo: previousUserId,
              revisionComment: comment,
              revisionHistory: newHistory,
              updatedAt: new Date().toISOString() 
          });

          onNotify('task_status_changed', 'Revisions Requested', `"${task.title}" returned to previous step for revisions.`);
      }
  };

  const handleClientAction = (action: 'approve' | 'reject') => {
      if (!clientApproval) return;
      if (action === 'approve') {
          onUpdateClientApproval({ ...clientApproval, status: 'approved', reviewedAt: new Date().toISOString() });
          
          // Check for Social Handover (Client Approved)
          if (task.requiresSocialPost && !task.socialPostId) {
               const socialPost = createSocialPostFromTask(task);
              
              onUpdateTask({ 
                  ...task, 
                  status: TaskStatus.CLIENT_APPROVED, 
                  socialPostId: socialPost.id,
                  updatedAt: new Date().toISOString() 
              });
          } else {
              onUpdateTask({ ...task, status: TaskStatus.CLIENT_APPROVED, updatedAt: new Date().toISOString() });
              onNotify('task_status_changed', 'Client Approved', `"${task.title}" approved by client.`);
          }

      } else {
          onUpdateClientApproval({ ...clientApproval, status: 'rejected', reviewedAt: new Date().toISOString() });
          onUpdateTask({ ...task, status: TaskStatus.REVISIONS_REQUIRED, updatedAt: new Date().toISOString() });
          onNotify('task_status_changed', 'Client Rejected', `"${task.title}" rejected by client.`);
      }
  };

  const handleAssignUser = (userId: string) => {
    const currentAssignees = task.assigneeIds || [];
    if (currentAssignees.includes(userId)) {
      // Remove user
      onUpdateTask({ 
        ...task, 
        assigneeIds: currentAssignees.filter(id => id !== userId),
        updatedAt: new Date().toISOString() 
      });
    } else {
      // Add user
      onUpdateTask({ 
        ...task, 
        assigneeIds: [...currentAssignees, userId],
        updatedAt: new Date().toISOString() 
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        accept="*/*"
      />
      
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex justify-between items-start mb-4">
           <div>
             <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
               <span>{project?.name || 'Unknown Project'}</span>
               <span>/</span>
               {task.milestoneId && (
                   <>
                    <span className="text-indigo-600 font-medium">{milestones.find(m => m.id === task.milestoneId)?.name || 'Unknown Milestone'}</span>
                    <span>/</span>
                   </>
               )}
               <span className="uppercase font-semibold text-slate-700">{task.id}</span>
             </div>
             <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
           </div>
           
           <div className="flex items-center space-x-2">
              {(checkPermission('tasks.edit_all') || (checkPermission('tasks.edit_own') && ((task.assigneeIds || []).includes(currentUser.id) || task.createdBy === currentUser.id))) && (
                  <button 
                    onClick={() => onEditTask(task)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                    title="Edit Task"
                  >
                     <Edit2 className="w-5 h-5" />
                  </button>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-bold border capitalize ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                 <MoreVertical className="w-5 h-5" />
              </button>
           </div>
        </div>
        
        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 flex-wrap gap-2">
           <div className="flex items-center space-x-4">
              <div className="flex -space-x-2">
                 {(task.assigneeIds || []).length > 0 ? (
                   (task.assigneeIds || []).map(uid => {
                     const u = users.find(user => user.id === uid);
                     return u ? <img key={uid} src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white" title={u.name} /> : null;
                   })
                 ) : <span className="text-xs text-slate-400 italic px-2">Unassigned</span>}
                 {checkPermission('tasks.manage_assignees') && (
                 <button 
                   onClick={() => setShowAssignModal(true)}
                   className="w-8 h-8 rounded-full bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300"
                 >
                    <Plus className="w-4 h-4" />
                 </button>
                 )}
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex items-center text-sm text-slate-600 space-x-2">
                 <Calendar className="w-4 h-4 text-slate-400" />
                 <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
           </div>

           {/* Manual Advance for Non-Review Statuses */}
           {canAdvance() && (
             <button 
               onClick={handleAdvanceStatus}
               className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
             >
               <span>
                 {task.status === TaskStatus.IN_PROGRESS 
                   ? (nextStepLabel ? `Submit to ${nextStepLabel}` : 'Submit for Review') 
                   : 'Advance'}
               </span>
               <ChevronRight className="w-4 h-4" />
             </button>
           )}

           {/* Show message if user cannot advance */}
           {!canAdvance() && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVISIONS_REQUIRED) && !(task.assigneeIds || []).includes(currentUser.id) && (
             <div className="flex items-center space-x-2 text-slate-400 text-xs italic">
               <AlertCircle className="w-4 h-4" />
               <span>Only assigned users can submit</span>
             </div>
           )}
           
           {/* Client Review Banner Sim */}
           {task.status === TaskStatus.CLIENT_REVIEW && (
               <div className="flex items-center space-x-2 text-purple-600 text-sm font-bold">
                   <ShieldCheck className="w-4 h-4" />
                   <span>Waiting for Client</span>
               </div>
           )}

           {/* Archive Action */}
           {!task.isArchived && (task.status === TaskStatus.APPROVED || task.status === TaskStatus.CLIENT_APPROVED || task.status === TaskStatus.COMPLETED) && (
               <button 
                   onClick={() => onArchiveTask(task)}
                   className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-900 shadow-sm transition-colors"
               >
                   <Archive className="w-4 h-4" />
                   <span>Archive Task</span>
               </button>
           )}

           {/* Delete Action */}
           {checkPermission('tasks.delete') && (
               <button 
                   onClick={() => onDeleteTask(task)}
                   className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 shadow-sm transition-colors border border-red-200"
               >
                   <X className="w-4 h-4" />
                   <span>Delete</span>
               </button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {['overview', 'approvals', 'files', 'comments', 'time_logs', 'dependencies'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                   
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                     <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px]"
                        value={task.description}
                        onChange={e => onUpdateTask({...task, description: e.target.value})}
                        placeholder="Add details about this task..."
                     />
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-sm mb-3">Meta Info</h3>
                      <div className="space-y-3">
                         <div>
                            <p className="text-xs text-slate-500">Department</p>
                            <p className="text-sm font-medium text-slate-800">{task.department}</p>
                         </div>
                         <div>
                            <p className="text-xs text-slate-500">Type</p>
                            <p className="text-sm font-medium text-slate-800 capitalize">{task.taskType?.replace('_', ' ') || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-xs text-slate-500">Priority</p>
                            <p className="text-sm font-medium text-slate-800 capitalize">{task.priority}</p>
                         </div>
                         <div>
                            <p className="text-xs text-slate-500">Created By</p>
                            <p className="text-sm font-medium text-slate-800">{users.find(u => u.id === task.createdBy)?.name || 'Unknown'}</p>
                         </div>
                         {usedTemplate && (
                             <div>
                                 <p className="text-xs text-slate-500">Workflow</p>
                                 <div className="flex items-center gap-1 mt-1">
                                     <GitMerge className="w-3 h-3 text-indigo-500" />
                                     <span className="text-xs font-medium text-indigo-600">{usedTemplate.name}</span>
                                 </div>
                             </div>
                         )}
                      </div>
                   </div>

                   {/* Social Publishing Assignment */}
                   {task.requiresSocialPost && (
                       <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                           <h3 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                               <Share2 className="w-4 h-4"/> Social Publishing
                           </h3>
                           
                           <div className="space-y-3">
                               <div>
                                   <label className="block text-xs font-bold text-indigo-800 mb-1">Social Manager</label>
                                   <select 
                                       className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                                       value={task.socialManagerId || ''}
                                       onChange={e => onUpdateTask({ ...task, socialManagerId: e.target.value || null })}
                                       disabled={!checkPermission('tasks.manage_publishing')}
                                   >
                                       <option value="">Select Manager</option>
                                       {users.filter(u => u.role === 'Social Manager' || u.department === 'Marketing').map(u => (
                                           <option key={u.id} value={u.id}>{u.name}</option>
                                       ))}
                                   </select>
                               </div>
                               
                               <div>
                                   <label className="block text-xs font-bold text-indigo-800 mb-1">Publishing Notes</label>
                                   <textarea 
                                       className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                       placeholder="Instructions for the social team..."
                                       value={task.publishingNotes || ''}
                                       onChange={e => onUpdateTask({ ...task, publishingNotes: e.target.value })}
                                       disabled={!checkPermission('tasks.manage_publishing')}
                                   />
                               </div>

                               {task.socialPostId && (
                                   <div className="pt-2 border-t border-indigo-200">
                                       <p className="text-xs text-indigo-600 flex items-center gap-1">
                                           <CheckCircle className="w-3 h-3" />
                                           <span>Handover Complete</span>
                                       </p>
                                   </div>
                               )}
                           </div>
                       </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'approvals' && (
           <div className="space-y-8">
             {/* Client Portal Simulation (If Active) */}
             {task.status === TaskStatus.CLIENT_REVIEW && (
                 <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl">
                     <h3 className="text-purple-800 font-bold text-lg mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Client Portal Simulation</h3>
                     <p className="text-purple-700 text-sm mb-4">This task is currently visible to the client ({task.client}). Use the controls below to simulate a client response.</p>
                     <div className="flex gap-3">
                         <button onClick={() => handleClientAction('approve')} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700">
                             <ThumbsUp className="w-4 h-4"/> <span>Client Approve</span>
                         </button>
                         <button onClick={() => handleClientAction('reject')} className="flex items-center space-x-2 bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-lg font-bold hover:bg-purple-50">
                             <ThumbsDown className="w-4 h-4"/> <span>Client Reject</span>
                         </button>
                     </div>
                 </div>
             )}

             <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4">Internal Approval Chain</h3>
                
                {/* Revision Alert */}
                {task.status === TaskStatus.REVISIONS_REQUIRED && task.revisionComment && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-3">
                            <div className="bg-rose-100 p-2 rounded-full text-rose-600 mt-1"><RotateCcw className="w-4 h-4"/></div>
                            <div>
                                <h4 className="font-bold text-rose-900">Revisions Requested</h4>
                                <p className="text-sm text-rose-800 mt-1">"{task.revisionComment}"</p>
                                <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                                    <span>Assigned to: <strong>{users.find(u => u.id === task.revisionAssignedTo)?.name || 'Assignee'}</strong></span>
                                </div>
                                {task.revisionAssignedTo === currentUser.id && (
                                    <button 
                                        onClick={handleAdvanceStatus} // Re-submit logic
                                        className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm"
                                    >
                                        Submit Revisions
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {taskSteps.length === 0 && task.status !== TaskStatus.COMPLETED && (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500 mb-4">
                        Approval chain will be generated when submitted for review.
                    </div>
                )}

                <div className="relative pl-4">
                    {/* Connecting Line */}
                    <div className="absolute left-[2.25rem] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                    
                    <div className="space-y-6 relative">
                    {taskSteps.map((step, index) => {
                        const approver = users.find(u => u.id === step.approverId);
                        const isPending = step.status === 'pending';
                        const isApproved = step.status === 'approved';
                        const isRejected = step.status === 'rejected' || step.status === 'revision_requested';
                        // const isWaiting = step.status === 'waiting';

                        // Should show controls? Only if:
                        // 1. Step is pending
                        // 2. Current user is the approver
                        // 3. Task is awaiting review (not in revisions, completed, etc.)
                        const showControls = isPending && 
                                           currentUser.id === step.approverId && 
                                           task.status === TaskStatus.AWAITING_REVIEW;

                        return (
                            <div key={index} className="flex items-start space-x-4">
                                <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-white transition-all ${
                                    isApproved ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 
                                    isRejected ? 'border-rose-500 text-rose-500 bg-rose-50' :
                                    isPending ? 'border-amber-500 text-amber-500 ring-4 ring-amber-100' : 
                                    'border-slate-200 text-slate-300'
                                }`}>
                                    {isApproved ? <CheckCircle className="w-5 h-5" /> : 
                                     isRejected ? <AlertCircle className="w-5 h-5" /> :
                                     <UserIcon className="w-5 h-5" />}
                                </div>
                                <div className="pt-1 flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-bold ${isPending ? 'text-amber-700' : 'text-slate-700'}`}>
                                                {approver?.name || 'Unassigned Approver'}
                                            </p>
                                            <p className="text-xs text-slate-500">{approver?.role || 'Pending assignment'}</p>
                                        </div>
                                        {step.reviewedAt && (
                                            <span className="text-[10px] text-slate-400">{new Date(step.reviewedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    
                                    {/* Comments */}
                                    {step.comment && (
                                        <div className={`mt-2 text-sm p-2 rounded ${isRejected ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-600'}`}>
                                            "{step.comment}"
                                        </div>
                                    )}

                                    {/* Action Buttons for Approver */}
                                    {showControls && (
                                        <div className="mt-3 flex space-x-2 animate-in fade-in slide-in-from-top-2 relative z-10">
                                            <button 
                                                onClick={() => handleApprovalAction('approve')}
                                                className="text-xs flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-emerald-700 shadow-sm"
                                            >
                                                <ThumbsUp className="w-3 h-3"/> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleApprovalAction('revise', 'Revisions requested')}
                                                className="text-xs flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-bold hover:bg-slate-50"
                                            >
                                                <CornerUpLeft className="w-3 h-3"/> Request Revisions
                                            </button>
                                        </div>
                                    )}

                                    {/* Show waiting message if it's pending but not for current user */}
                                    {isPending && currentUser.id !== step.approverId && (
                                        <div className="mt-2 text-xs text-amber-600 italic flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Waiting for {approver?.name || 'approver'} to review</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Client Step Marker */}
                    {task.isClientApprovalRequired && (
                        <div className="flex items-start space-x-4">
                            <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-white ${
                                task.status === TaskStatus.CLIENT_APPROVED || task.status === TaskStatus.COMPLETED ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 
                                task.status === TaskStatus.CLIENT_REVIEW ? 'border-purple-500 text-purple-500 ring-4 ring-purple-100' : 'border-slate-200 text-slate-300'
                            }`}>
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="pt-1">
                                <p className="font-bold text-slate-700">Client Approval</p>
                                <p className="text-xs text-slate-500">{task.client}</p>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
             </div>
           </div>
        )}

        {activeTab === 'files' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                   <h3 className="text-sm font-bold text-slate-900">Attached Assets</h3>
                   <button onClick={handleFileUpload} className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">
                       <Upload className="w-3 h-3" /> Upload File
                   </button>
               </div>
               
               {taskFiles.length > 0 ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {taskFiles.map(file => (
                           <div key={file.id} className="border border-slate-200 rounded-lg p-3 flex items-start space-x-3 hover:bg-slate-50 transition-colors cursor-pointer">
                               <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                   {file.type.startsWith('image/') ? (
                                       <img src={file.url} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                       <FileText className="w-6 h-6 text-slate-400" />
                                   )}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <p className="text-sm font-medium text-slate-900 truncate" title={file.name}>{file.name}</p>
                                   <p className="text-xs text-slate-500">v{file.version} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                   {file.isDeliverable && (
                                       <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded mt-1 inline-block">Final Deliverable</span>
                                   )}
                               </div>
                               <button className="text-slate-400 hover:text-indigo-600"><Download className="w-4 h-4"/></button>
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                       <p className="text-sm text-slate-500">No files attached to this task.</p>
                   </div>
               )}
            </div>
        )}

        {activeTab === 'comments' && (
           <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4 mb-4">
                 {comments.map(c => {
                   const u = users.find(user => user.id === c.userId);
                   return (
                     <div key={c.id} className="flex space-x-3">
                        <img src={u?.avatar} className="w-8 h-8 rounded-full" />
                        <div className="bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100">
                           <div className="flex items-center space-x-2 mb-1">
                              <span className="font-bold text-xs text-slate-900">{u?.name}</span>
                              <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                           </div>
                           <p className="text-sm text-slate-700">{c.message}</p>
                        </div>
                     </div>
                   );
                 })}
                 {comments.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">No comments yet.</p>}
              </div>
              <div className="mt-auto">
                 <div className="relative">
                    <input 
                      className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                      placeholder="Write a comment..." 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                    />
                    <button onClick={handlePostComment} className="absolute right-2 top-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded">
                       <Send className="w-5 h-5" />
                    </button>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'time_logs' && (
           <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">Task Timeline & Duration</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Auto-tracked events</span>
                </div>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-600 font-medium mb-1">Total Duration</div>
                      <div className="text-xl font-bold text-blue-900">
                          {(() => {
                              const sortedEvents = [...timeLogs].filter(l => l.isAutomatic).sort((a, b) => 
                                  new Date(a.timestamp || a.logDate).getTime() - new Date(b.timestamp || b.logDate).getTime()
                              );
                              if (sortedEvents.length < 2) return '—';
                              const start = new Date(sortedEvents[0].timestamp || sortedEvents[0].logDate);
                              const end = new Date(sortedEvents[sortedEvents.length - 1].timestamp || sortedEvents[sortedEvents.length - 1].logDate);
                              const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                              const days = Math.floor(hours / 24);
                              return days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
                          })()}
                      </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-3 rounded-lg border border-emerald-200">
                      <div className="text-xs text-emerald-600 font-medium mb-1">Manual Hours Logged</div>
                      <div className="text-xl font-bold text-emerald-900">
                          {timeLogs.filter(l => !l.isAutomatic).reduce((acc, curr) => acc + curr.hours, 0)} hrs
                      </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                      <div className="text-xs text-amber-600 font-medium mb-1">Events Tracked</div>
                      <div className="text-xl font-bold text-amber-900">
                          {timeLogs.filter(l => l.isAutomatic).length}
                      </div>
                  </div>
              </div>

              {/* Timeline Events */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700">Timeline</h4>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {[...timeLogs]
                          .sort((a, b) => new Date(b.timestamp || b.logDate).getTime() - new Date(a.timestamp || a.logDate).getTime())
                          .map(log => {
                              const user = users.find(u => u.id === log.userId);
                              const isAuto = log.isAutomatic;
                              
                              return (
                                  <div key={log.id} className={`p-3 flex gap-3 ${isAuto ? 'bg-blue-50/30' : ''}`}>
                                      <div className="flex-shrink-0">
                                          <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="text-sm font-medium text-slate-900">{user?.name}</span>
                                              {isAuto && (
                                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                                      Auto
                                                  </span>
                                              )}
                                              {!isAuto && log.hours > 0 && (
                                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                                                      {log.hours}h
                                                  </span>
                                              )}
                                          </div>
                                          <p className="text-sm text-slate-700 mb-1">{log.note}</p>
                                          {log.fromStatus && log.toStatus && (
                                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                                  <span className="px-2 py-0.5 bg-slate-100 rounded">{log.fromStatus}</span>
                                                  <span>→</span>
                                                  <span className="px-2 py-0.5 bg-slate-100 rounded">{log.toStatus}</span>
                                              </div>
                                          )}
                                          <div className="text-xs text-slate-400 mt-1">
                                              {new Date(log.timestamp || log.logDate).toLocaleString()}
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      {timeLogs.length === 0 && (
                          <div className="p-8 text-center text-slate-400 text-sm italic">
                              No timeline events yet
                          </div>
                      )}
                  </div>
              </div>

              {/* Manual Time Entry (Legacy) */}
              <details className="bg-slate-50 border border-slate-200 rounded-lg">
                  <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-slate-700 hover:bg-slate-100">
                      + Add Manual Time Entry
                  </summary>
                  <div className="p-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-3">For manual hour logging (optional)</p>
                      {/* Could add manual form here if needed */}
                  </div>
              </details>
           </div>
        )}

         {activeTab === 'dependencies' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold text-slate-900">Blocking Tasks</h3>
                 <button className="text-indigo-600 text-xs font-medium hover:underline">+ Add Dependency</button>
              </div>
              <div className="space-y-2">
                 {dependencies.map(dep => {
                    const parentTask = allTasks.find(t => t.id === dep.dependsOnTaskId);
                    if (!parentTask) return null;
                    return (
                       <div key={dep.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                          <div className="flex items-center space-x-3">
                             <div className={`w-2 h-2 rounded-full ${parentTask.status === TaskStatus.COMPLETED ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                             <div>
                                <p className="text-sm font-medium text-slate-900">{parentTask.title}</p>
                                <p className="text-xs text-slate-500">{parentTask.status}</p>
                             </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                       </div>
                    );
                 })}
                 {dependencies.length === 0 && <p className="text-slate-400 text-sm italic">No dependencies.</p>}
              </div>
            </div>
         )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Manage Assignees</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar space-y-1">
              {users.map(user => {
                const isAssigned = (task.assigneeIds || []).includes(user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => handleAssignUser(user.id)}>
                    <div className="flex items-center space-x-3">
                      <img src={user.avatar} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.role}</p>
                      </div>
                    </div>
                    {isAssigned && <CheckCircle className="w-5 h-5 text-indigo-600" />}
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

export default TasksHub;
