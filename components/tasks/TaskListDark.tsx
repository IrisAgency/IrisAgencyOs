import React from 'react';
import { Task, User, TaskStatus, Priority } from '../../types';
import { Clock } from 'lucide-react';
import { DueTone, ToneFn } from './TaskBoardDark';

interface TaskListDarkProps {
  tasks: Task[];
  users: User[];
  selectedTaskId?: string | null;
  onSelectTask: (taskId: string) => void;
  statusTone: ToneFn<TaskStatus>;
  priorityTone: ToneFn<Priority>;
  dueTone: DueTone;
}

const TaskListDark: React.FC<TaskListDarkProps> = ({
  tasks,
  users,
  selectedTaskId,
  onSelectTask,
  statusTone,
  priorityTone,
  dueTone
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.85)]">
      <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,1fr,0.7fr] text-[11px] uppercase tracking-wide text-slate-400 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]/70 px-4 py-2">
        <span>Task</span>
        <span>Status</span>
        <span>Assignees</span>
        <span>Due</span>
        <span className="text-right">Priority</span>
      </div>
      <div className="divide-y divide-[color:var(--dash-glass-border)]">
        {tasks.length === 0 && (
          <div className="p-6 text-sm text-slate-400 text-center">No tasks match the filters.</div>
        )}
        {tasks.map(task => {
          const dueMeta = dueTone(task.dueDate);
          const assignees = (task.assigneeIds || []).map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
          return (
            <button
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={`w-full text-left px-4 py-3 flex flex-col md:grid md:grid-cols-[2fr,1fr,1fr,1fr,0.7fr] gap-3 md:gap-4 items-center md:items-start transition-colors ${
                selectedTaskId === task.id ? 'bg-[color:var(--dash-surface)] border-l-2 border-[color:var(--dash-primary)]' : 'hover:bg-[color:var(--dash-surface)]/60'
              }`}
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{task.client}</div>
                <div className="text-sm font-semibold text-slate-50 leading-tight break-words">{task.title}</div>
                <div className="flex items-center gap-2 md:hidden text-[11px] text-slate-300">
                  <span className={`px-2 py-0.5 rounded-full border ${statusTone(task.status)}`}>{task.status.replace(/_/g, ' ')}</span>
                  <span className={`px-2 py-0.5 rounded-full border ${priorityTone(task.priority)}`}>{task.priority}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${dueMeta.className}`}>
                    <Clock className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="hidden md:flex items-center">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] ${statusTone(task.status)}`}>
                  {task.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex md:flex-nowrap flex-wrap items-center gap-2 md:gap-1 w-full">
                {assignees.length === 0 && <span className="text-[11px] text-slate-500">Unassigned</span>}
                {assignees.slice(0, 4).map(user => (
                  <div key={user.id} className="flex items-center gap-2 text-[11px] text-slate-200 bg-white/5 rounded-full px-2 py-1 border border-[color:var(--dash-glass-border)]">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[120px]">{user.name}</span>
                  </div>
                ))}
                {assignees.length > 4 && (
                  <span className="text-[11px] text-slate-300">+{assignees.length - 4}</span>
                )}
              </div>

              <div className="hidden md:flex items-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${dueMeta.className}`}>
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="hidden md:flex items-center justify-end w-full">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] ${priorityTone(task.priority)}`}>{task.priority}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TaskListDark;
