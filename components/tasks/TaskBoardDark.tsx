import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, User } from '../../types';
import { Clock, ChevronDown } from 'lucide-react';

export type ToneFn<T> = (value: T) => string;
export type DueTone = (date: string) => { label: string; className: string };

interface TaskBoardDarkProps {
  tasks: Task[];
  users: User[];
  selectedTaskId?: string | null;
  onSelectTask: (taskId: string) => void;
  onUpdateTask?: (task: Task) => void;
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
  onUpdateTask,
  statusTone,
  priorityTone,
  dueTone
}) => {
  const [activeTab, setActiveTab] = useState<TaskStatus>(TaskStatus.NEW);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStatusChange = (e: React.MouseEvent, task: Task, newStatus: TaskStatus) => {
    e.stopPropagation();
    if (onUpdateTask) {
      onUpdateTask({ ...task, status: newStatus });
    }
  };

  const renderColumn = (status: TaskStatus) => {
    const columnTasks = tasks.filter(t => t.status === status);
    
    return (
      <div
        key={status}
        className={`
          rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 backdrop-blur-sm shadow-[0_15px_45px_-28px_rgba(0,0,0,0.8)] flex flex-col
          ${isMobile ? 'h-full' : 'h-[calc(100vh-280px)]'}
        `}
      >
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-[color:var(--dash-surface-elevated)]/95 rounded-t-2xl border-b border-[color:var(--dash-glass-border)] z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <span className={`inline-flex h-2 w-2 rounded-full ${statusTone(status).replace('bg-', 'bg-').replace('/10', '')}`} />
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
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={`w-full text-left rounded-xl border transition-all duration-150 shadow-[0_10px_30px_-24px_rgba(0,0,0,1)] hover:shadow-[0_18px_35px_-22px_rgba(0,0,0,0.9)] cursor-pointer group relative ${
                    selectedTaskId === task.id ? 'border-[color:var(--dash-primary)]/60 bg-[color:var(--dash-surface)]' : 'border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]'
                  }`}
                >
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold truncate">{task.client}</div>
                        <div className="text-sm font-semibold text-slate-50 leading-tight line-clamp-2 break-words" title={task.title}>{task.title}</div>
                      </div>
                      
                      {/* Mobile Status Changer */}
                      {isMobile && onUpdateTask ? (
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(e as any, task, e.target.value as TaskStatus)}
                            className={`appearance-none text-[10px] px-2 py-1 pr-6 rounded-full border bg-transparent outline-none focus:ring-1 focus:ring-white/20 ${statusTone(task.status)}`}
                          >
                            {statusColumns.map(s => (
                              <option key={s} value={s} className="bg-slate-800 text-slate-200">
                                {s.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      ) : (
                        <span className={`text-[10px] px-2 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${statusTone(task.status)}`}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      )}
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
                        <span className="text-[11px] text-slate-400 truncate max-w-[100px]">{task.projectId}</span>
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

  return (
    <div className="w-full h-full flex flex-col">
      {isMobile ? (
        <div className="flex flex-col h-full gap-4">
          {/* Mobile Tabs */}
          <div className="flex overflow-x-auto pb-2 -mx-4 px-4 gap-2 no-scrollbar">
            {statusColumns.map(status => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`
                  px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all
                  ${activeTab === status 
                    ? 'bg-[color:var(--dash-primary)] text-white shadow-lg shadow-[color:var(--dash-primary)]/20' 
                    : 'bg-[color:var(--dash-surface-elevated)] text-slate-400 border border-[color:var(--dash-glass-border)] hover:text-slate-200'}
                `}
              >
                {status.replace(/_/g, ' ')}
                <span className="ml-2 opacity-60 text-[10px]">
                  {tasks.filter(t => t.status === status).length}
                </span>
              </button>
            ))}
          </div>
          
          {/* Mobile Single Column */}
          <div className="flex-1 min-h-0">
            {renderColumn(activeTab)}
          </div>
        </div>
      ) : (
        /* Desktop Grid */
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 pb-4">
          {statusColumns.map(status => renderColumn(status))}
        </div>
      )}
    </div>
  );
};

export default TaskBoardDark;
