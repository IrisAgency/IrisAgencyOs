import React, { useMemo, useState } from 'react';
import { ApprovalStep, Priority, Project, Task, TaskStatus, User, WorkflowTemplate } from '../../types';
import { Clock, GitBranch, Users2, Sparkles, ShieldCheck, Layers, ArrowRight, User as UserIcon, AlertTriangle } from 'lucide-react';
import { DueTone, ToneFn } from '../tasks/TaskBoardDark';

interface WorkflowHubProps {
  tasks: Task[];
  workflowTemplates: WorkflowTemplate[];
  approvalSteps: ApprovalStep[];
  users: User[];
  projects: Project[];
  onSelectTask: (taskId: string) => void;
  statusTone: ToneFn<TaskStatus>;
  dueTone: DueTone;
}

/* ── Pipeline column definitions (status-based, shows ALL tasks) ── */
const PIPELINE_COLUMNS: { key: string; label: string; icon: string; statuses: TaskStatus[]; accent: string }[] = [
  { key: 'new',        label: 'New',             icon: '🆕', statuses: [TaskStatus.NEW],                                            accent: 'border-t-slate-400' },
  { key: 'assigned',   label: 'Assigned',        icon: '👤', statuses: [TaskStatus.ASSIGNED],                                       accent: 'border-t-blue-400' },
  { key: 'progress',   label: 'In Progress',     icon: '⚡', statuses: [TaskStatus.IN_PROGRESS],                                    accent: 'border-t-indigo-400' },
  { key: 'review',     label: 'Awaiting Review',  icon: '🔍', statuses: [TaskStatus.AWAITING_REVIEW],                                accent: 'border-t-amber-400' },
  { key: 'revisions',  label: 'Revisions',       icon: '🔄', statuses: [TaskStatus.REVISIONS_REQUIRED],                             accent: 'border-t-rose-400' },
  { key: 'approved',   label: 'Approved',        icon: '✅', statuses: [TaskStatus.APPROVED],                                       accent: 'border-t-emerald-400' },
  { key: 'client',     label: 'Client Review',   icon: '🤝', statuses: [TaskStatus.CLIENT_REVIEW, TaskStatus.CLIENT_APPROVED],      accent: 'border-t-purple-400' },
  { key: 'done',       label: 'Done',            icon: '🏁', statuses: [TaskStatus.COMPLETED, TaskStatus.ARCHIVED],                 accent: 'border-t-emerald-500' },
];

/* ── Priority badge helper ── */
const priorityDot = (p: Priority | undefined) => {
  switch (p) {
    case 'critical': return 'bg-rose-500';
    case 'high':     return 'bg-orange-500';
    case 'medium':   return 'bg-blue-400';
    default:         return 'bg-slate-500';
  }
};

const WorkflowHub: React.FC<WorkflowHubProps> = ({
  tasks,
  workflowTemplates,
  approvalSteps,
  users,
  projects,
  onSelectTask,
  statusTone,
  dueTone,
}) => {
  const [mode, setMode] = useState<'pipeline' | 'workflow'>('pipeline');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(workflowTemplates[0]?.id || null);

  const activeTasks = useMemo(() => tasks.filter(t => !t.isDeleted), [tasks]);

  /* ══════════════════════════════════════════
     ███  PIPELINE VIEW  (status-based)
     ══════════════════════════════════════════ */
  const pipelineData = useMemo(() => {
    return PIPELINE_COLUMNS.map(col => ({
      ...col,
      tasks: activeTasks.filter(t => col.statuses.includes(t.status)),
    }));
  }, [activeTasks]);

  /* ══════════════════════════════════════════
     ███  WORKFLOW VIEW  (template-based)
     ══════════════════════════════════════════ */
  const selectedTemplate = workflowTemplates.find(w => w.id === selectedTemplateId) || workflowTemplates[0] || null;

  const templateTasks = useMemo(() => {
    if (!selectedTemplate) return [] as Task[];
    return activeTasks.filter(t => t.workflowTemplateId === selectedTemplate.id);
  }, [activeTasks, selectedTemplate]);

  const workflowColumns = useMemo(() => {
    if (!selectedTemplate) return [] as { key: string; label: string }[];
    const base: { key: string; label: string }[] = [
      { key: 'intake', label: '📥 Intake' },
      ...selectedTemplate.steps
        .sort((a, b) => a.order - b.order)
        .map(step => ({ key: `step-${step.order}`, label: step.label })),
    ];
    if (selectedTemplate.requiresQC) {
      base.push({ key: 'qc', label: '🛡️ QC Review' });
    }
    if (selectedTemplate.requiresClientApproval) {
      base.push({ key: 'client', label: '🤝 Client Review' });
    }
    base.push({ key: 'done', label: '🏁 Done' });
    return base;
  }, [selectedTemplate]);

  const getStageKey = (task: Task): string => {
    if (task.qc?.enabled && task.status === TaskStatus.AWAITING_REVIEW &&
        (task.qc.status === 'PENDING' || task.qc.status === 'NEEDS_INTERVENTION')) {
      return 'qc';
    }
    if (task.status === TaskStatus.CLIENT_REVIEW || task.status === TaskStatus.CLIENT_APPROVED) return 'client';
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.ARCHIVED) return 'done';
    if (task.status === TaskStatus.NEW || task.status === TaskStatus.ASSIGNED) return 'intake';
    if (task.status === TaskStatus.REVISIONS_REQUIRED) return 'intake';
    const steps = approvalSteps.filter(s => s.taskId === task.id);
    if (steps.length === 0) return 'intake';
    const activeStep = steps.find(s => ['pending', 'revision_requested', 'revision_submitted'].includes(s.status))
      || steps.find(s => s.status === 'waiting')
      || steps[0];
    return `step-${activeStep.level}`;
  };

  const getWorkflowTasksForColumn = (key: string) => {
    return templateTasks.filter(task => getStageKey(task) === key);
  };

  /* ── Stats ── */
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.ARCHIVED).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const reviewTasks = activeTasks.filter(t => t.status === TaskStatus.AWAITING_REVIEW || t.status === TaskStatus.CLIENT_REVIEW).length;
  const overdueTasks = activeTasks.filter(t => {
    if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.ARCHIVED) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  /* ── Shared task card renderer ── */
  const renderTaskCard = (task: Task) => {
    const project = projects.find(p => p.id === task.projectId);
    const dueMeta = dueTone(task.dueDate);
    const assignees = (task.assigneeIds || []).map(id => users.find(u => u.id === id)).filter(Boolean);
    const isOverdue = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.ARCHIVED && new Date(task.dueDate) < new Date();

    return (
      <button
        key={task.id}
        onClick={() => onSelectTask(task.id)}
        className="w-full text-left rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] hover:border-[color:var(--dash-primary)]/50 hover:bg-[color:var(--dash-surface-elevated)]/50 transition-all group"
      >
        <div className="p-3 space-y-2.5">
          {/* Priority dot + Client */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(task.priority)}`} title={task.priority} />
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold truncate">
              {task.client || project?.client || 'No client'}
            </span>
          </div>

          {/* Title */}
          <div className="text-sm font-semibold text-slate-50 leading-tight line-clamp-2" title={task.title}>
            {task.title}
          </div>

          {/* Status badge */}
          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${statusTone(task.status)}`}>
            {task.status.replace(/_/g, ' ')}
          </span>

          {/* Bottom row: due + project + assignees */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${isOverdue ? 'text-rose-200 bg-rose-500/15 border border-rose-400/30' : dueMeta.className}`}>
                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              {project && (
                <span className="px-2 py-0.5 rounded-full border border-[color:var(--dash-glass-border)] text-slate-300 text-[10px] truncate max-w-[100px]">
                  {project.name}
                </span>
              )}
            </div>

            {/* Assignee avatars */}
            {assignees.length > 0 && (
              <div className="flex -space-x-1.5 shrink-0">
                {assignees.slice(0, 3).map(u => (
                  <div
                    key={u!.id}
                    title={u!.name}
                    className="w-5 h-5 rounded-full bg-[color:var(--dash-primary)]/20 border border-[color:var(--dash-glass-border)] flex items-center justify-center text-[9px] font-bold text-[color:var(--dash-primary)] uppercase"
                  >
                    {u!.name.charAt(0)}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-[color:var(--dash-glass-border)] flex items-center justify-center text-[9px] text-slate-300">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Header row: mode toggle + stats ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode toggle */}
          <div className="bg-white/5 border border-[color:var(--dash-glass-border)] rounded-full p-1 flex items-center gap-1">
            <button
              onClick={() => setMode('pipeline')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-2 ${mode === 'pipeline' ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 hover:bg-white/5'}`}
            >
              <Layers className="w-4 h-4" /> Pipeline
            </button>
            <button
              onClick={() => setMode('workflow')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-2 ${mode === 'workflow' ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 hover:bg-white/5'}`}
            >
              <GitBranch className="w-4 h-4" /> By Workflow
            </button>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)]">
              <span className="text-slate-400">Total</span>
              <span className="font-bold text-white">{totalTasks}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20">
              <span className="text-amber-200">In Review</span>
              <span className="font-bold text-amber-100">{reviewTasks}</span>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-400/20">
                <AlertTriangle className="w-3 h-3 text-rose-300" />
                <span className="text-rose-200">Overdue</span>
                <span className="font-bold text-rose-100">{overdueTasks}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20">
              <span className="text-emerald-200">Done</span>
              <span className="font-bold text-emerald-100">{completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Workflow template selector (only in workflow mode) */}
        {mode === 'workflow' && workflowTemplates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {workflowTemplates.map(wf => (
              <button
                key={wf.id}
                onClick={() => setSelectedTemplateId(wf.id)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${selectedTemplate?.id === wf.id
                  ? 'bg-[color:var(--dash-primary)] text-white border-[color:var(--dash-primary)]'
                  : 'bg-[color:var(--dash-surface-elevated)] text-slate-200 border-[color:var(--dash-glass-border)] hover:border-[color:var(--dash-primary)]/50'
                }`}
              >
                {wf.name}
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({activeTasks.filter(t => t.workflowTemplateId === wf.id).length})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════  PIPELINE MODE  ══════════ */}
      {mode === 'pipeline' && (
        <div className="overflow-x-auto pb-2">
          {/* Visual flow arrows header */}
          <div className="hidden sm:flex items-center gap-1 mb-3 px-1">
            {PIPELINE_COLUMNS.map((col, i) => (
              <React.Fragment key={col.key}>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                  {col.icon} {col.label}
                </span>
                {i < PIPELINE_COLUMNS.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-flow-col auto-cols-[220px] sm:auto-cols-[260px] gap-3">
            {pipelineData.map(col => (
              <div key={col.key} className={`rounded-2xl border border-[color:var(--dash-glass-border)] border-t-2 ${col.accent} bg-[color:var(--dash-surface-elevated)]/80 backdrop-blur-sm shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)] flex flex-col min-h-[300px]`}>
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between sticky top-0 bg-[color:var(--dash-surface-elevated)]/90 rounded-t-2xl border-b border-[color:var(--dash-glass-border)]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{col.icon}</span>
                    <span className="text-[11px] uppercase tracking-wide text-slate-300 font-semibold">{col.label}</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${col.tasks.length > 0 ? 'bg-[color:var(--dash-primary)]/15 text-[color:var(--dash-primary)] border border-[color:var(--dash-primary)]/30' : 'bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-400'}`}>
                    {col.tasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
                  {col.tasks.length === 0 ? (
                    <div className="text-[11px] text-slate-500 border border-dashed border-[color:var(--dash-glass-border)] rounded-xl px-3 py-8 text-center">
                      No tasks
                    </div>
                  ) : (
                    col.tasks.map(renderTaskCard)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════  WORKFLOW MODE  ══════════ */}
      {mode === 'workflow' && (
        <>
          {!selectedTemplate ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <GitBranch className="w-10 h-10 mx-auto text-slate-500" />
              <p className="text-sm">No workflow templates found.</p>
              <p className="text-xs text-slate-500">Create a workflow template in Admin → Workflows to use this view.</p>
            </div>
          ) : (
            <>
              {/* Template stats */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)]"><GitBranch className="w-5 h-5" /></div>
                  <div>
                    <div className="text-sm text-slate-300">Tasks in Workflow</div>
                    <div className="text-xl font-semibold text-white">{templateTasks.length}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300"><Sparkles className="w-5 h-5" /></div>
                  <div className="w-full">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Progress</span>
                      <span>{templateTasks.length > 0 ? Math.round((templateTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.ARCHIVED).length / templateTasks.length) * 100) : 0}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[color:var(--dash-primary)] to-emerald-400 transition-all"
                        style={{ width: `${templateTasks.length > 0 ? Math.round((templateTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.ARCHIVED).length / templateTasks.length) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-300"><Users2 className="w-5 h-5" /></div>
                  <div>
                    <div className="text-sm text-slate-300">Approval Steps</div>
                    <div className="text-xl font-semibold text-white">{selectedTemplate.steps.length}</div>
                  </div>
                </div>
              </div>

              {templateTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-sm">No tasks assigned to "{selectedTemplate.name}"</p>
                  <p className="text-xs text-slate-500">Tasks linked to this workflow will appear here. Switch to Pipeline view to see all tasks by status.</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="grid grid-flow-col auto-cols-[220px] sm:auto-cols-[260px] gap-3">
                    {workflowColumns.map(col => {
                      const tasksInCol = getWorkflowTasksForColumn(col.key);
                      return (
                        <div key={col.key} className="rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 backdrop-blur-sm shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)] flex flex-col min-h-[300px]">
                          <div className="px-3 py-2.5 flex items-center justify-between sticky top-0 bg-[color:var(--dash-surface-elevated)]/90 rounded-t-2xl border-b border-[color:var(--dash-glass-border)]">
                            <div className="text-[11px] uppercase tracking-wide text-slate-300 font-semibold">{col.label}</div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${tasksInCol.length > 0 ? 'bg-[color:var(--dash-primary)]/15 text-[color:var(--dash-primary)] border border-[color:var(--dash-primary)]/30' : 'bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-400'}`}>
                              {tasksInCol.length}
                            </span>
                          </div>
                          <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
                            {tasksInCol.length === 0 ? (
                              <div className="text-[11px] text-slate-500 border border-dashed border-[color:var(--dash-glass-border)] rounded-xl px-3 py-8 text-center">
                                No tasks
                              </div>
                            ) : (
                              tasksInCol.map(renderTaskCard)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WorkflowHub;
