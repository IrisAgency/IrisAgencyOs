import React from 'react';
import { Task, TaskStatus, Priority, User } from '../../types';
import { Clock } from 'lucide-react';

export type ToneFn<T> = (value: T) => string;
export type DueTone = (date: string) => { label: string; className: string };

interface TaskBoardDarkProps {
  tasks: Task[];
  users: User[];
  selectedTaskId?: string | null;
  onSelectTask: (taskId: string) => void;
  statusTone: ToneFn<TaskStatus>;
  priorityTone: ToneFn<Priority>;
  dueTone: DueTone;
}

const statusColumns: TaskStatus[] = [
  TaskStatus.NEW,
  TaskStatus.ASSIGNED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.AWAITING_REVIEW,
  TaskStatus.CLIENT_REVIEW,
  TaskStatus.COMPLETED
];

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const TaskBoardDark: React.FC<TaskBoardDarkProps> = ({
  tasks,
  users,
  selectedTaskId,
  onSelectTask,
  statusTone,
  priorityTone,
  dueTone
}) => {
  return (
    <div className="w-full overflow-x-auto pb-2 -mx-2 px-2">
      <div className="flex gap-3 sm:gap-4 min-w-max">
        {statusColumns.map((status) => {
          const columnTasks = tasks.filter(t => t.status === status);
          return (
            <div
              key={status}
              className="w-[280px] sm:w-[340px] rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 backdrop-blur-sm shadow-[0_15px_45px_-28px_rgba(0,0,0,0.8)] flex flex-col min-h-[420px] flex-shrink-0"
            >
              <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-[color:var(--dash-surface-elevated)]/95 rounded-t-2xl border-b border-[color:var(--dash-glass-border)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[color:var(--dash-primary)]" />
                  {status.replace(/_/g, ' ')}
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-200">
                  {columnTasks.length}
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                {columnTasks.length === 0 ? (
                  <div className="text-xs text-slate-500 border border-dashed border-[color:var(--dash-glass-border)] rounded-xl px-3 py-6 text-center">
                    No tasks here yet.
                  </div>
                ) : (
                  columnTasks.map(task => {
                    const dueMeta = dueTone(task.dueDate);
                    return (
                      <button
                        key={task.id}
                        onClick={() => onSelectTask(task.id)}
                        className={`w-full text-left rounded-xl border transition-all duration-150 shadow-[0_10px_30px_-24px_rgba(0,0,0,1)] hover:shadow-[0_18px_35px_-22px_rgba(0,0,0,0.9)] ${
                          selectedTaskId === task.id ? 'border-[color:var(--dash-primary)]/60 bg-[color:var(--dash-surface)]' : 'border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]'
                        }`}
                      >
                        <div className="p-3 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold truncate">{task.client}</div>
                              <div className="text-sm font-semibold text-slate-50 leading-tight line-clamp-2 break-words" title={task.title}>{task.title}</div>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${statusTone(task.status)}`}>
                              {task.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-300">
                            <span className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${priorityTone(task.priority)}`}>{task.priority}</span>
                            {task.taskType && (
                              <span className="px-2 py-0.5 rounded-full border border-[color:var(--dash-glass-border)] text-slate-200 uppercase whitespace-nowrap">
                                {task.taskType.replace(/_/g, ' ')}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${dueMeta.className}`}>
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--dash-glass-border)] text-[11px] text-slate-300">
                            <div className="flex -space-x-2">
                              {(task.assigneeIds || []).slice(0, 4).map(id => {
                                const assignee = users.find(u => u.id === id);
                                if (!assignee) return null;
                                return assignee.avatar ? (
                                  <img
                                    key={id}
                                    src={assignee.avatar}
                                    alt={assignee.name}
                                    className="w-7 h-7 rounded-full border border-[color:var(--dash-glass-border)] object-cover"
                                    title={assignee.name}
                                  />
                                ) : (
                                  <div
                                    key={id}
                                    className="w-7 h-7 rounded-full border border-[color:var(--dash-glass-border)] bg-white/5 flex items-center justify-center font-semibold text-[10px]"
                                    title={assignee.name}
                                  >
                                    {getInitials(assignee.name)}
                                  </div>
                                );
                              })}
                              {(task.assigneeIds?.length || 0) > 4 && (
                                <span className="w-7 h-7 rounded-full border border-[color:var(--dash-glass-border)] bg-white/5 flex items-center justify-center text-[10px] text-slate-200">
                                  +{(task.assigneeIds?.length || 0) - 4}
                                </span>
                              )}
                            </div>
                            {task.projectId && (
                              <span className="text-[11px] text-slate-400 truncate">{task.projectId}</span>
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
  );
};

export default TaskBoardDark;
