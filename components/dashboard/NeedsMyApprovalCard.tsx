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

  return (
    <>
      {/* Header */}
      <div className="widget-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle style={{ width: '16px', height: '16px', color: 'rgb(251 191 36)', flexShrink: 0 }} />
          <span>Needs My Approval</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {count > 0 && (
            <span className="data-mono ltr-text" style={{ color: 'rgb(251 191 36)' }}>
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="task-list">
        {count === 0 ? (
          // Empty State
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center' }}>
            <CheckCircle2 style={{ width: '48px', height: '48px', color: 'rgba(16, 185, 129, 0.3)', marginBottom: '12px' }} />
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '4px' }}>No approvals waiting</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>You're all caught up!</p>
          </div>
        ) : (
          // Task List
          displayTasks.map((task) => {
            const dueDate = new Date(task.dueDate);
            const now = new Date();
            const isOverdue = dueDate < now;
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isUrgent = diffDays <= 2 && !isOverdue;
            
            return (
              <div 
                key={task.id} 
                className="task-item" 
                onClick={() => onNavigateToTask?.(task.id)}
                style={{ 
                  borderLeftColor: isOverdue ? 'var(--dash-error)' : 'rgb(251 191 36)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{task.title}</div>
                  <div className="data-mono" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                    {task.client?.toUpperCase() || 'GENERAL'}
                    {task.dueDate && (
                      <>
                        <span className="mx-1">·</span>
                        <span className="ltr-text inline-block">
                          {isOverdue && '⚠️ '}
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  fontSize: '0.65rem',
                  color: 'rgb(253 224 71)',
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  alignSelf: 'flex-start'
                }}>
                  <AlertCircle style={{ width: '10px', height: '10px', flexShrink: 0 }} />
                  <span>YOUR APPROVAL NEEDED</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show More Indicator */}
      {count > 5 && (
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid var(--dash-glass-border)',
          textAlign: 'center'
        }}>
          <button
            onClick={onViewAll}
            style={{
              width: '100%',
              fontSize: '0.75rem',
              color: '#94a3b8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(251 191 36)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            +{count - 5} more approval{count - 5 !== 1 ? 's' : ''} waiting · Click to view all
          </button>
        </div>
      )}
    </>
  );
};

export default NeedsMyApprovalCard;
