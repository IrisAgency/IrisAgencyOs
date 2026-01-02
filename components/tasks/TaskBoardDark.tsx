import React, { useState } from 'react';
import { Task, TaskStatus, Priority, User } from '../../types';
import { Clock } from 'lucide-react';

export type ToneFn<T> = (value: T) => string;
export type DueTone = (date: string) => { label: string; className: string };

interface TaskBoardDarkProps {
  tasks: Task[];
  users: User[];
  onSelectTask: (taskId: string) => void;
  statusTone: ToneFn<TaskStatus>;
  priorityTone: ToneFn<Priority>;
  dueTone: DueTone;
}

const statusColumns: { status: TaskStatus; label: string }[] = [
  { status: TaskStatus.NEW, label: 'New' },
  { status: TaskStatus.ASSIGNED, label: 'Assigned' },
  { status: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { status: TaskStatus.AWAITING_REVIEW, label: 'Awaiting Review' },
  { status: TaskStatus.COMPLETED, label: 'Completed' }
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
  onSelectTask,
  statusTone,
  priorityTone,
  dueTone
}) => {
  const [activeStatus, setActiveStatus] = useState<TaskStatus>(TaskStatus.NEW);

  // Get counts for each status
  const getStatusCount = (status: TaskStatus) => {
    return tasks.filter(t => t.status === status).length;
  };

  // Get tasks for active status
  const activeTasks = tasks.filter(t => t.status === activeStatus);

  return (
    <div className="w-full max-w-[1280px] mx-auto overflow-x-hidden px-1 sm:px-0">
      {/* Status Switcher Bar */}
      <div className="mb-6 overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex gap-2 flex-nowrap">
          {statusColumns.map(({ status, label }) => {
            const count = getStatusCount(status);
            const isActive = activeStatus === status;
            
            return (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`
                  flex-shrink-0 min-w-[110px] sm:min-w-[130px] h-[44px] px-2 sm:px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-between gap-1.5 sm:gap-2
                  ${isActive 
                    ? 'bg-[color:var(--dash-primary)] text-white shadow-lg shadow-[color:var(--dash-primary)]/20 border-2 border-[color:var(--dash-primary)]' 
                    : 'bg-[color:var(--dash-surface-elevated)]/80 text-slate-300 border border-[color:var(--dash-glass-border)] hover:bg-[color:var(--dash-surface-elevated)] hover:text-white hover:border-[color:var(--dash-primary)]/30'
                  }
                `}
              >
                <span className="truncate">{label}</span>
                <span className={`
                  px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold min-w-[20px] sm:min-w-[24px] text-center flex-shrink-0
                  ${isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-slate-400'
                  }
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {activeTasks.length === 0 ? (
          <div className="col-span-full">
            <div className="text-center py-12 px-4 border border-dashed border-[color:var(--dash-glass-border)] rounded-2xl bg-[color:var(--dash-surface-elevated)]/40">
              <div className="text-slate-500 text-sm">
                No tasks in "{statusColumns.find(s => s.status === activeStatus)?.label}" status
              </div>
            </div>
          </div>
        ) : (
          activeTasks.map(task => {
            const dueMeta = dueTone(task.dueDate);
            
            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="min-h-[120px] p-3 sm:p-4 rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 backdrop-blur-sm shadow-[0_10px_30px_-24px_rgba(0,0,0,1)] hover:shadow-[0_18px_35px_-22px_rgba(0,0,0,0.9)] hover:border-[color:var(--dash-primary)]/40 transition-all duration-200 cursor-pointer group overflow-hidden"
              >
                <div className="flex flex-col gap-3 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold truncate">
                        {task.client}
                      </div>
                      <div className="text-sm font-semibold text-slate-50 leading-tight line-clamp-2 break-words" title={task.title}>
                        {task.title}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${statusTone(task.status)}`}>
                      {statusColumns.find(s => s.status === task.status)?.label || task.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center flex-wrap gap-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${priorityTone(task.priority)}`}>
                      {task.priority}
                    </span>
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

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[color:var(--dash-glass-border)]">
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
                            className="w-7 h-7 rounded-full border border-[color:var(--dash-glass-border)] bg-white/5 flex items-center justify-center font-semibold text-[10px] text-slate-300"
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
                      <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                        {task.projectId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskBoardDark;
