import React from 'react';
import { Task, User, ApprovalStep } from '../../types';
import { AlertCircle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { taskNeedsMyApproval } from '../../utils/approvalUtils';

interface NeedsMyApprovalCardProps {
  tasks: Task[];
  approvalSteps: ApprovalStep[];
  currentUser: User;
  onNavigateToTask?: (taskId: string) => void;
  onViewAll?: () => void;
}

const NeedsMyApprovalCard: React.FC<NeedsMyApprovalCardProps> = ({
  tasks,
  approvalSteps,
  currentUser,
  onNavigateToTask,
  onViewAll
}) => {
  // Filter tasks that need current user's approval
  const needsApprovalTasks = tasks.filter(task => 
    taskNeedsMyApproval(task, currentUser, approvalSteps)
  );

  // Sort by urgency: overdue first, then earliest due date, then newest
  const sortedTasks = needsApprovalTasks.sort((a, b) => {
    const now = new Date().getTime();
    const aDue = new Date(a.dueDate).getTime();
    const bDue = new Date(b.dueDate).getTime();
    
    const aOverdue = aDue < now;
    const bOverdue = bDue < now;
    
    // Overdue items first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Then by due date (earliest first)
    if (aDue !== bDue) return aDue - bDue;
    
    // Then by creation date (newest first)
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Take top 5
  const displayTasks = sortedTasks.slice(0, 5);
  const count = needsApprovalTasks.length;

  const formatDueDate = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const isOverdue = due < now;
    
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    
    if (isOverdue) {
      return { text: 'Overdue', className: 'bg-rose-500/15 text-rose-200 border-rose-400/30' };
    }
    
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) {
      return { text: `Due ${formatter.format(due)}`, className: 'bg-amber-500/15 text-amber-200 border-amber-400/30' };
    }
    
    return { text: `Due ${formatter.format(due)}`, className: 'bg-blue-500/15 text-blue-200 border-blue-400/30' };
  };

  return (
    <section className="glass-panel animate-reveal">
      {/* Header */}
      <div className="widget-title">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Needs My Approval</span>
          {count > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
              {count}
            </span>
          )}
        </div>
        {count > 0 && (
          <button
            onClick={onViewAll}
            className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        {count === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mb-3" />
            <p className="text-sm text-slate-400">No approvals waiting</p>
            <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          // Task List
          displayTasks.map((task) => {
            const dueMeta = formatDueDate(task.dueDate);
            
            return (
              <div
                key={task.id}
                onClick={() => onNavigateToTask?.(task.id)}
                className="p-3 rounded-lg border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/60 hover:bg-[color:var(--dash-surface-elevated)] hover:border-amber-500/30 transition-all cursor-pointer group"
              >
                <div className="flex flex-col gap-2">
                  {/* Task Title & Client */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-100 truncate group-hover:text-white transition-colors">
                        {task.title}
                      </h4>
                      {task.client && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {task.client}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Approval Label */}
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-200 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/30">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">Your approval needed</span>
                    </div>

                    {/* Due Date Badge */}
                    <span className={`text-[10px] px-2 py-1 rounded-md border font-medium flex items-center gap-1 whitespace-nowrap ${dueMeta.className}`}>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {dueMeta.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show More Indicator */}
      {count > 5 && (
        <div className="mt-3 pt-3 border-t border-[color:var(--dash-glass-border)]">
          <button
            onClick={onViewAll}
            className="w-full text-xs text-slate-400 hover:text-amber-200 transition-colors text-center"
          >
            +{count - 5} more approval{count - 5 !== 1 ? 's' : ''} waiting
          </button>
        </div>
      )}
    </section>
  );
};

export default NeedsMyApprovalCard;
