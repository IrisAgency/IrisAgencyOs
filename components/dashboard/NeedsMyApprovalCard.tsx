import React, { useState } from 'react';
import { Task, User, UserRole, ApprovalStep, TaskStatus } from '../../types';
import { AlertCircle, Clock, ArrowRight, CheckCircle2, Users, UserCheck } from 'lucide-react';
import { taskNeedsMyApproval } from '../../utils/approvalUtils';

interface NeedsMyApprovalCardProps {
  tasks: Task[];
  approvalSteps: ApprovalStep[];
  currentUser: User;
  users?: User[];
  onNavigateToTask?: (taskId: string) => void;
  onViewAll?: () => void;
}

const NeedsMyApprovalCard: React.FC<NeedsMyApprovalCardProps> = ({
  tasks,
  approvalSteps,
  currentUser,
  users = [],
  onNavigateToTask,
  onViewAll
}) => {
  const isManager = currentUser.role === UserRole.GENERAL_MANAGER || currentUser.role === UserRole.ACCOUNT_MANAGER;
  const [viewMode, setViewMode] = useState<'mine' | 'team'>('mine');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);

  // Filter tasks that need current user's approval
  const needsApprovalTasks = tasks.filter(task => 
    taskNeedsMyApproval(task, currentUser, approvalSteps)
  );

  // For team view: find ALL tasks that have pending approval steps (held by any member)
  const allTeamPendingApprovals = isManager && viewMode === 'team'
    ? tasks.filter(task => {
        if (task.status === TaskStatus.COMPLETED || task.isArchived) return false;
        const taskSteps = approvalSteps
          .filter(s => s.taskId === task.id)
          .sort((a, b) => a.level - b.level);
        if (taskSteps.length === 0) return false;
        return taskSteps.some(s => s.status === 'pending');
      })
    : [];

  // Get unique approver IDs from pending steps for filter pills
  const teamApproverIds = Array.from(new Set(
    allTeamPendingApprovals.flatMap(task => {
      const pending = approvalSteps
        .filter(s => s.taskId === task.id && s.status === 'pending')
        .map(s => s.approverId);
      return pending;
    })
  ));
  const teamApprovers = teamApproverIds
    .map(id => users.find(u => u.id === id))
    .filter((u): u is User => !!u);

  // Apply member filter
  const teamPendingApprovals = filterUserId
    ? allTeamPendingApprovals.filter(task => {
        const pendingStep = approvalSteps
          .filter(s => s.taskId === task.id)
          .sort((a, b) => a.level - b.level)
          .find(s => s.status === 'pending');
        return pendingStep?.approverId === filterUserId;
      })
    : allTeamPendingApprovals;

  const activeTasks = viewMode === 'mine' ? needsApprovalTasks : teamPendingApprovals;

  // Sort by urgency: overdue first, then earliest due date, then newest
  const sortedTasks = [...activeTasks].sort((a, b) => {
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

  // Take top 8 for team view, 5 for mine
  const maxItems = viewMode === 'team' ? 8 : 5;
  const displayTasks = sortedTasks.slice(0, maxItems);
  const count = activeTasks.length;

  return (
    <>
      {/* Header */}
      <div className="widget-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle style={{ width: '16px', height: '16px', color: 'rgb(251 191 36)', flexShrink: 0 }} />
          <span>{viewMode === 'mine' ? 'Needs My Approval' : 'Team Approvals'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {count > 0 && (
            <span className="data-mono ltr-text" style={{ color: 'rgb(251 191 36)' }}>
              {count}
            </span>
          )}
          {isManager && (
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(251,191,36,0.2)' }}>
              <button
                onClick={() => { setViewMode('mine'); setFilterUserId(null); }}
                style={{
                  padding: '3px 8px', fontSize: '0.6rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: viewMode === 'mine' ? 'rgba(251,191,36,0.2)' : 'transparent',
                  color: viewMode === 'mine' ? 'rgb(253 224 71)' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.2s', letterSpacing: '0.5px'
                }}
              >MINE</button>
              <button
                onClick={() => { setViewMode('team'); setFilterUserId(null); }}
                style={{
                  padding: '3px 8px', fontSize: '0.6rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: viewMode === 'team' ? 'rgba(251,191,36,0.2)' : 'transparent',
                  color: viewMode === 'team' ? 'rgb(253 224 71)' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.2s', letterSpacing: '0.5px'
                }}
              >TEAM</button>
            </div>
          )}
        </div>
      </div>

      {/* Team member filter pills */}
      {isManager && viewMode === 'team' && teamApprovers.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '0 0 8px 0' }}>
          <button
            onClick={() => setFilterUserId(null)}
            style={{
              padding: '2px 8px', fontSize: '0.6rem', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer',
              background: !filterUserId ? 'rgba(251,191,36,0.15)' : 'transparent',
              color: !filterUserId ? 'rgb(253 224 71)' : 'rgba(255,255,255,0.35)',
              fontWeight: !filterUserId ? 600 : 400, transition: 'all 0.2s'
            }}
          >All</button>
          {teamApprovers.map(u => (
            <button
              key={u.id}
              onClick={() => setFilterUserId(u.id)}
              style={{
                padding: '2px 8px', fontSize: '0.6rem', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer',
                background: filterUserId === u.id ? 'rgba(251,191,36,0.15)' : 'transparent',
                color: filterUserId === u.id ? 'rgb(253 224 71)' : 'rgba(255,255,255,0.35)',
                fontWeight: filterUserId === u.id ? 600 : 400, transition: 'all 0.2s'
              }}
            >{u.name.split(' ')[0]}</button>
          ))}
        </div>
      )}

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

            // Get the pending approver for team view
            const pendingStep = viewMode === 'team'
              ? approvalSteps
                  .filter(s => s.taskId === task.id)
                  .sort((a, b) => a.level - b.level)
                  .find(s => s.status === 'pending')
              : null;
            const approverUser = pendingStep ? users.find(u => u.id === pendingStep.approverId) : null;
            
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
                  }}>
                    <AlertCircle style={{ width: '10px', height: '10px', flexShrink: 0 }} />
                    <span>{viewMode === 'mine' ? 'YOUR APPROVAL NEEDED' : 'PENDING APPROVAL'}</span>
                  </div>
                  {viewMode === 'team' && approverUser && (
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                      Held by: {approverUser.name?.split(' ')[0] || 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show More Indicator */}
      {count > maxItems && (
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
            +{count - maxItems} more approval{count - maxItems !== 1 ? 's' : ''} waiting · Click to view all
          </button>
        </div>
      )}
    </>
  );
};

export default NeedsMyApprovalCard;
