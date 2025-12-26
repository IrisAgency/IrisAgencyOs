import React from 'react';
import { Task, Priority, TaskStatus } from '../../../types';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface GmUrgentTasksWidgetProps {
  tasks: Task[];
  onNavigateToTask: (taskId: string) => void;
  onViewAllUrgent: () => void;
}

const GmUrgentTasksWidget: React.FC<GmUrgentTasksWidgetProps> = ({ tasks = [], onNavigateToTask, onViewAllUrgent }) => {
  const urgentTasks = tasks.filter(t => {
    const isCritical = t.priority === Priority.CRITICAL || t.priority === Priority.HIGH;
    const isOverdue = new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED;
    const isAwaitingReview = t.status === TaskStatus.AWAITING_REVIEW;
    
    return (isCritical || isOverdue || isAwaitingReview) && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.ARCHIVED;
  }).slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-rose-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-rose-100 bg-rose-50 flex justify-between items-center">
        <h3 className="font-bold text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Urgent Attention
        </h3>
        <button 
          onClick={onViewAllUrgent}
          className="text-xs font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar max-h-[300px]">
        {urgentTasks.length > 0 ? (
          urgentTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => onNavigateToTask(task.id)}
              className="p-3 rounded-lg border border-rose-100 bg-white hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{task.client}</span>
                {new Date(task.dueDate) < new Date() && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">
                    OVERDUE
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-rose-700 mb-1 line-clamp-1">{task.title}</h4>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
                <span className={`font-medium ${task.priority === 'critical' ? 'text-rose-600' : 'text-orange-600'}`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
            <p className="text-sm">No urgent tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GmUrgentTasksWidget;
