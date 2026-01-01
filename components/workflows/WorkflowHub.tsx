import React, { useMemo, useState } from 'react';
import { ApprovalStep, Project, Task, TaskStatus, User, WorkflowTemplate } from '../../types';
import { Clock, GitBranch, Users2, Sparkles } from 'lucide-react';
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

const WorkflowHub: React.FC<WorkflowHubProps> = ({
  tasks,
  workflowTemplates,
  approvalSteps,
  users,
  projects,
  onSelectTask,
  statusTone,
  dueTone
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(workflowTemplates[0]?.id || null);

  const selectedTemplate = workflowTemplates.find(w => w.id === selectedTemplateId) || workflowTemplates[0] || null;

  const templateTasks = useMemo(() => {
    if (!selectedTemplate) return [] as Task[];
    return tasks.filter(t => t.workflowTemplateId === selectedTemplate.id && !t.isDeleted);
  }, [tasks, selectedTemplate]);

  const columns = useMemo(() => {
    if (!selectedTemplate) return [] as { key: string; label: string }[];
    const base = [
      { key: 'intake', label: 'Intake' },
      ...selectedTemplate.steps
        .sort((a, b) => a.order - b.order)
        .map(step => ({ key: `step-${step.order}`, label: step.label })),
    ];
    if (selectedTemplate.requiresClientApproval) {
      base.push({ key: 'client', label: 'Client Review' });
    }
    base.push({ key: 'done', label: 'Done' });
    return base;
  }, [selectedTemplate]);

  const getStageKey = (task: Task): string => {
    if (task.status === TaskStatus.CLIENT_REVIEW || task.status === TaskStatus.CLIENT_APPROVED) return 'client';
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.ARCHIVED) return 'done';
    const steps = approvalSteps.filter(s => s.taskId === task.id);
    if (steps.length === 0) return 'intake';
    const activeStep = steps.find(s => ['pending', 'revision_requested', 'revision_submitted'].includes(s.status))
      || steps.find(s => s.status === 'waiting')
      || steps[0];
    return `step-${activeStep.level}`;
  };

  const getTasksForColumn = (key: string) => {
    return templateTasks.filter(task => {
      const stage = getStageKey(task);
      if (key === 'client') return stage === 'client';
      return stage === key;
    });
  };

  const completionRate = useMemo(() => {
    if (templateTasks.length === 0) return 0;
    const done = templateTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.ARCHIVED).length;
    return Math.round((done / templateTasks.length) * 100);
  }, [templateTasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
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
            </button>
          ))}
        </div>

        {selectedTemplate && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)]"><GitBranch className="w-5 h-5" /></div>
              <div>
                <div className="text-sm text-slate-300">In Flow</div>
                <div className="text-xl font-semibold text-white">{templateTasks.length}</div>
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300"><Sparkles className="w-5 h-5" /></div>
              <div className="w-full">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Completion</span>
                  <span>{completionRate}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[color:var(--dash-primary)] to-emerald-400" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-300"><Users2 className="w-5 h-5" /></div>
              <div>
                <div className="text-sm text-slate-300">Approvers</div>
                <div className="text-xl font-semibold text-white">{selectedTemplate.steps.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[240px] sm:auto-cols-[280px] gap-3 sm:gap-4">
            {columns.map(col => {
              const tasksInCol = getTasksForColumn(col.key);
              return (
                <div key={col.key} className="rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 backdrop-blur-sm shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)] flex flex-col min-h-[360px]">
                  <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-[color:var(--dash-surface-elevated)]/90 rounded-t-2xl border-b border-[color:var(--dash-glass-border)]">
                    <div className="text-[11px] uppercase tracking-wide text-slate-300 font-semibold">{col.label}</div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-200">{tasksInCol.length}</span>
                  </div>
                  <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                    {tasksInCol.length === 0 ? (
                      <div className="text-xs text-slate-500 border border-dashed border-[color:var(--dash-glass-border)] rounded-xl px-3 py-6 text-center">
                        Empty stage
                      </div>
                    ) : (
                      tasksInCol.map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        const dueMeta = dueTone(task.dueDate);
                        return (
                          <button
                            key={task.id}
                            onClick={() => onSelectTask(task.id)}
                            className="w-full text-left rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] hover:border-[color:var(--dash-primary)]/50 transition-all"
                          >
                            <div className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold truncate">{task.client || project?.client || 'Client'}</div>
                                  <div className="text-sm font-semibold text-slate-50 leading-tight truncate" title={task.title}>{task.title}</div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusTone(task.status)}`}>
                                  {task.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${dueMeta.className}`}>
                                  <Clock className="w-3 h-3" />
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                {project && (
                                  <span className="px-2 py-0.5 rounded-full border border-[color:var(--dash-glass-border)] text-slate-200 text-[11px] truncate">{project.name}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
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
};

export default WorkflowHub;
