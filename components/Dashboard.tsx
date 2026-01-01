import React, { useEffect, useRef, useState } from 'react';
import {
  Task,
  Project,
  User,
  Client,
  SocialPost,
  TaskTimeLog,
  ClientMeeting,
  Note,
  ProjectMilestone,
} from '../types';
import { PERMISSIONS } from '../lib/permissions';
import { usePermission } from '../hooks/usePermissions';
import './dashboard/DashboardTheme.css';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  clients: Client[];
  socialPosts: SocialPost[];
  timeLogs: TaskTimeLog[];
  currentUser: User;
  meetings?: ClientMeeting[];
  notes: Note[];
  milestones?: ProjectMilestone[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToPost?: (postId: string) => void;
  onViewAllTasks?: () => void;
  onNavigateToUserTasks?: (userId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
  onScheduleMeeting?: () => void;
  onNavigateToCalendar?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  tasks = [],
  projects = [],
  users = [],
  clients = [],
  socialPosts = [],
  timeLogs = [],
  currentUser,
  meetings = [],
  notes = [],
  milestones = [],
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onNavigateToTask,
  onNavigateToMeeting,
  onNavigateToPost,
  onViewAllTasks,
  onNavigateToUserTasks,
  onNavigateToClient,
  onScheduleMeeting,
  onNavigateToCalendar,
}) => {
  
  const canViewGmUrgent = usePermission(PERMISSIONS.DASHBOARD.VIEW_GM_URGENT);
  
  // Local State for My Tasks Widget
  const [taskViewMode, setTaskViewMode] = useState<'today' | 'week'>('today');
  const [taskClientFilter, setTaskClientFilter] = useState<string>('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [milestoneClientFilter, setMilestoneClientFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // -- Drag and Drop Logic --
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    'my-tasks', 'gm-urgent', 'team-progress', 'calendar', 'client-status', 'milestones', 'quick-notes'
  ]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Pre-calculate user tasks for filter population
  const userTasksAll = tasks.filter(t => 
    t.assigneeIds?.includes(selectedUserId) && 
    t.status !== 'completed' && 
    t.status !== 'archived'
  );

  // Generate Filter Options based on ACTUAL user data
  const availableTaskTypes = Array.from(new Set(userTasksAll.map(t => t.taskType || 'Other').filter(Boolean))).sort();
  
  const availableClients = clients
    .filter(c => userTasksAll.some(t => {
      const p = projects.find(proj => proj.id === t.projectId);
      return p?.clientId === c.id;
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Data Processing
  const myTasks = userTasksAll
    .filter(t => {
      // Time Filter
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const endOfToday = new Date(today);
      endOfToday.setHours(23,59,59,999);
      
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      endOfWeek.setHours(23,59,59,999);
      
      let matchesTime = true;
      if (dueDate) {
        if (taskViewMode === 'today') {
          // Show overdue tasks + tasks due today
          matchesTime = dueDate <= endOfToday;
        } else {
          // Show overdue tasks + tasks due within 7 days
          matchesTime = dueDate <= endOfWeek;
        }
      } else {
        // If no due date, only show if we are NOT in strict time mode? 
        // For now, let's hide them in "Today" view but maybe show in "Week"?
        // Or just hide them as they aren't "due".
        matchesTime = false; 
      }

      // Client Filter
      let matchesClient = true;
      if (taskClientFilter !== 'all') {
        const project = projects.find(p => p.id === t.projectId);
        matchesClient = project?.clientId === taskClientFilter;
      }

      // Type Filter
      let matchesType = true;
      if (taskTypeFilter !== 'all') {
        const type = t.taskType || 'Other';
        matchesType = type === taskTypeFilter;
      }

      return matchesTime && matchesClient && matchesType;
    })
    .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
    .slice(0, 5);

  const urgentTasks = tasks
    .filter(t => t.priority === 'high' || t.priority === 'urgent')
    .filter(t => t.status !== 'completed')
    .slice(0, 3);

  // Calculate Client Health & Activity
  const clientStats = clients.map(client => {
    const clientProjects = projects.filter(p => p.clientId === client.id);
    const clientTasks = tasks.filter(t => {
        const p = projects.find(proj => proj.id === t.projectId);
        return p?.clientId === client.id && t.status !== 'completed' && t.status !== 'archived';
    });
    
    const overdueCount = clientTasks.filter(t => new Date(t.dueDate || '') < new Date()).length;
    const health = overdueCount > 2 ? 'CRITICAL' : overdueCount > 0 ? 'AT RISK' : 'HEALTHY';
    
    return {
        ...client,
        activeTaskCount: clientTasks.length,
        health,
        overdueCount
    };
  }).sort((a, b) => b.activeTaskCount - a.activeTaskCount);

  const activeClients = clientStats.slice(0, 4); 

  const upcomingMilestones = milestones
    .filter(m => {
      if (m.status === 'completed') return false;
      
      // Filter by Client
      if (milestoneClientFilter !== 'all') {
        const project = projects.find(p => p.id === m.projectId);
        if (project?.clientId !== milestoneClientFilter) return false;
      }

      // Filter by Month (Current Month + Next Month to show upcoming)
      const dueDate = new Date(m.dueDate);
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);
      
      // Check if in current month or next month
      const isCurrentMonth = dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
      const isNextMonth = dueDate.getMonth() === nextMonth.getMonth() && dueDate.getFullYear() === nextMonth.getFullYear();
      
      return isCurrentMonth || isNextMonth;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5); // Increased from 1 to 5 to show more context

  // Team Workload Calculation
  const teamWorkload = users
    .filter(u => u.status === 'active')
    .map(u => {
      const activeCount = tasks.filter(t => 
        (t.assigneeIds || []).includes(u.id) && 
        t.status !== 'completed' && 
        t.status !== 'archived'
      ).length;
      return { user: u, count: activeCount };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calendar Days Generation
  const today = new Date();
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0,0,0,0);
    
    const hasEvent = meetings.some(m => {
        const mDate = new Date(m.date);
        mDate.setHours(0,0,0,0);
        return mDate.getTime() === d.getTime();
    }) || userTasksAll.some(t => {
        if (!t.dueDate) return false;
        const tDate = new Date(t.dueDate);
        tDate.setHours(0,0,0,0);
        return tDate.getTime() === d.getTime();
    });

    return {
      date: d,
      dayName: i === 0 ? 'TODAY' : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      isSelected: d.toDateString() === selectedDate.toDateString(),
      hasEvent
    };
  });

  // Filter meetings for selected date
  const selectedDateMeetings = meetings.filter(m => {
      const mDate = new Date(m.date);
      return mDate.toDateString() === selectedDate.toDateString();
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter tasks for selected date
  const selectedDateTasks = userTasksAll.filter(t => {
      if (!t.dueDate) return false;
      const tDate = new Date(t.dueDate);
      return tDate.toDateString() === selectedDate.toDateString();
  });

  // Mouse Interaction for Vitreous Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      const wrapper = document.querySelector('.dashboard-theme-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.backgroundImage = `
          radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(223, 30, 60, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 20% 30%, rgba(223, 30, 60, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(239, 184, 200, 0.05) 0%, transparent 40%)
        `;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // -- Drag and Drop Logic --
  useEffect(() => {
    const savedOrder = localStorage.getItem('dashboard_widget_order');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const defaultOrder = ['my-tasks', 'gm-urgent', 'team-progress', 'calendar', 'client-status', 'milestones', 'quick-notes'];
        // Ensure we have all widgets and no duplicates
        const merged = Array.from(new Set([...parsed, ...defaultOrder])).filter(id => defaultOrder.includes(id));
        setWidgetOrder(merged);
      } catch (e) { console.error('Failed to parse widget order', e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_widget_order', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentIndex = widgetOrder.indexOf(draggedId);
    const targetIndex = widgetOrder.indexOf(targetId);

    if (currentIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...widgetOrder];
      newOrder.splice(currentIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      setWidgetOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="dashboard-theme-wrapper" dir="ltr">
      <div className="dot-pattern"></div>
      
      <div className="viewport">
        <header className="animate-reveal" style={{ animationDelay: '0.1s' }}>
          <div className="greeting">
            <div className="role-badge">{currentUser.role}</div>
            <h1>Welcome back, {currentUser.name.split(' ')[0]}</h1>
          </div>
          <div className="glass-panel" style={{ padding: '10px 20px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="data-mono ltr-text" style={{ fontSize: '0.7rem', color: 'var(--dash-secondary)' }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · LIVE
            </div>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(45deg, var(--dash-primary), var(--dash-tertiary))', borderRadius: '50%' }}>
              {currentUser.avatar ? <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : null}
            </div>
          </div>
        </header>

        <div className="grid-container">
          {widgetOrder.map((widgetId) => {
            const isDragging = draggedId === widgetId;
            const dragProps = {
              draggable: true,
              onDragStart: (e: React.DragEvent) => handleDragStart(e, widgetId),
              onDragOver: (e: React.DragEvent) => handleDragOver(e, widgetId),
              onDragEnd: handleDragEnd,
              style: { 
                opacity: isDragging ? 0.4 : 1, 
                cursor: 'grab',
                transition: 'transform 0.2s, opacity 0.2s',
                animationDelay: '0.2s'
              }
            };

            switch (widgetId) {
              case 'my-tasks':
                return (
                  <section key={widgetId} className="my-tasks glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">
                      <span 
                        onClick={() => setSelectedUserId(currentUser.id)} 
                        style={{ cursor: 'pointer' }}
                        title="Click to reset to my tasks"
                      >
                        {selectedUserId === currentUser.id ? 'My Assigned Tasks' : `${users.find(u => u.id === selectedUserId)?.name.split(' ')[0]}'s Tasks`}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={() => setTaskViewMode('today')}
                            style={{
                              padding: '2px 6px', fontSize: '0.6rem', borderRadius: '4px',
                              background: taskViewMode === 'today' ? 'var(--dash-primary)' : 'transparent',
                              color: taskViewMode === 'today' ? 'var(--dash-on-primary)' : 'var(--dash-secondary)',
                              border: '1px solid var(--dash-outline)', cursor: 'pointer'
                            }}
                          >
                            Today
                          </button>
                          <button 
                            onClick={() => setTaskViewMode('week')}
                            style={{
                              padding: '2px 6px', fontSize: '0.6rem', borderRadius: '4px',
                              background: taskViewMode === 'week' ? 'var(--dash-primary)' : 'transparent',
                              color: taskViewMode === 'week' ? 'var(--dash-on-primary)' : 'var(--dash-secondary)',
                              border: '1px solid var(--dash-outline)', cursor: 'pointer'
                            }}
                          >
                            Week
                          </button>
                        </div>
                        <span className="data-mono ltr-text" style={{ color: 'var(--dash-primary)' }}>{myTasks.length} Active</span>
                      </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <select 
                        value={taskClientFilter}
                        onChange={(e) => setTaskClientFilter(e.target.value)}
                        style={{ flex: 1, fontSize: '0.75rem' }}
                      >
                        <option value="all">All Clients</option>
                        {availableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select 
                        value={taskTypeFilter}
                        onChange={(e) => setTaskTypeFilter(e.target.value)}
                        style={{ flex: 1, fontSize: '0.75rem' }}
                      >
                        <option value="all">All Types</option>
                        {availableTaskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="task-list">
                      {myTasks.map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        const isOverdue = new Date(task.dueDate || '') < new Date();
                        return (
                          <div key={task.id} className="task-item" onClick={() => onNavigateToTask?.(task.id)} style={{ borderLeftColor: isOverdue ? 'var(--dash-error)' : 'var(--dash-primary)' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{task.title}</div>
                              <div className="data-mono" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                {project?.name.toUpperCase() || 'GENERAL'} <span className="mx-1">·</span> <span className="ltr-text inline-block">{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase() : 'NO DATE'}</span>
                              </div>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                          </div>
                        );
                      })}
                      {myTasks.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                          No active tasks for {taskViewMode === 'today' ? 'today' : 'this week'}
                        </div>
                      )}
                    </div>
                  </section>
                );

              case 'gm-urgent':
                if (!canViewGmUrgent) return null;
                return (
                  <section key={widgetId} className="gm-urgent glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">
                      <span>Agency Blockers</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dash-error)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    {urgentTasks.map(task => (
                      <div key={task.id} className="urgent-item" onClick={() => onNavigateToTask?.(task.id)}>
                        <span style={{ fontSize: '0.9rem' }}>
                          <span className="status-dot"></span>
                          {task.title}
                        </span>
                        <span className="data-mono ltr-text" style={{ color: 'var(--dash-error)' }}>{task.priority.toUpperCase()}</span>
                      </div>
                    ))}
                    {urgentTasks.length === 0 && (
                      <div className="text-center py-4 text-slate-500 text-xs">No urgent blockers</div>
                    )}
                  </section>
                );

              case 'team-progress':
                return (
                  <section key={widgetId} className="team-progress glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">Team Workload</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {teamWorkload.map(({ user, count }) => (
                        <div 
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          style={{ cursor: 'pointer', opacity: selectedUserId === user.id ? 1 : 0.6, transition: 'opacity 0.2s' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                            <span style={{ fontWeight: selectedUserId === user.id ? 600 : 400 }}>{user.name.split(' ')[0]}</span>
                            <span className="data-mono ltr-text">{count} tasks</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min((count / 10) * 100, 100)}%`, background: count > 5 ? 'var(--dash-error)' : 'var(--dash-primary)' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );

              case 'calendar':
                return (
                  <section key={widgetId} className="calendar-widget glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">
                      <span>Schedule</span>
                      <span style={{ cursor: 'pointer', fontSize: '0.7rem', opacity: 0.7 }} onClick={onNavigateToCalendar}>VIEW ALL</span>
                    </div>
                    
                    {/* Calendar Strip */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      {calendarDays.map((day, i) => (
                        <div 
                            key={i} 
                            style={{ textAlign: 'center', opacity: day.isSelected ? 1 : 0.5, cursor: 'pointer' }}
                            onClick={() => setSelectedDate(day.date)}
                        >
                          <div style={{ fontSize: '0.7rem', marginBottom: '4px' }}>{day.dayName}</div>
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            background: day.isSelected ? 'var(--dash-primary)' : 'transparent',
                            color: day.isSelected ? 'var(--dash-on-primary)' : 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 'bold', margin: '0 auto',
                            border: day.isToday && !day.isSelected ? '1px solid var(--dash-primary)' : 'none'
                          }}>
                            {day.dayNum}
                          </div>
                          {day.hasEvent && <div style={{ width: '4px', height: '4px', background: 'var(--dash-tertiary)', borderRadius: '50%', margin: '4px auto 0' }}></div>}
                        </div>
                      ))}
                    </div>

                    {/* Upcoming Meetings & Tasks */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                        {/* Tasks Section */}
                        {selectedDateTasks.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                <div className="data-mono" style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>Due Today</div>
                                {selectedDateTasks.map(task => (
                                    <div key={task.id} className="meeting-card" onClick={() => onNavigateToTask?.(task.id)} style={{ borderLeft: '3px solid var(--dash-primary)' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{task.title}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                            {projects.find(p => p.id === task.projectId)?.name || 'General'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Meetings Section */}
                        {selectedDateMeetings.length > 0 && (
                            <div>
                                <div className="data-mono" style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>Events</div>
                                {selectedDateMeetings.map(meeting => (
                                    <div key={meeting.id} className="meeting-card" onClick={() => onNavigateToMeeting?.(meeting.id)} style={{ borderLeft: '3px solid var(--dash-tertiary)' }}>
                                        <div className="time-label">
                                        {new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{meeting.title}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{meeting.locationType}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedDateTasks.length === 0 && selectedDateMeetings.length === 0 && (
                            <div className="text-slate-500 text-xs py-8 text-center">
                                No schedule for {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
                            </div>
                        )}
                    </div>
                  </section>
                );

              case 'client-status':
                return (
                  <section key={widgetId} className="client-status glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">Key Accounts</div>
                    <div className="client-avatar-row">
                      {activeClients.map((client, i) => (
                        <div 
                          key={client.id} 
                          className="client-avatar" 
                          onClick={() => onNavigateToClient?.(client.id)}
                          style={{ 
                              background: client.health === 'CRITICAL' ? 'var(--dash-error)' : 
                                          client.health === 'AT RISK' ? '#F9AA33' : 
                                          'var(--dash-primary)',
                              color: client.health === 'CRITICAL' ? '#fff' : 'var(--dash-on-primary)',
                              border: '2px solid var(--dash-surface)'
                          }}
                          title={`${client.name}: ${client.activeTaskCount} active tasks`}
                        >
                          {client.name.charAt(0)}
                        </div>
                      ))}
                      {clients.length > 4 && (
                        <div className="client-avatar" style={{ background: '#121212', borderColor: 'var(--dash-outline)', fontSize: '0.7rem' }}>
                            +{clients.length - 4}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeClients.slice(0, 3).map(client => (
                        <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{client.name}</span>
                            <span className="data-mono ltr-text" style={{ fontSize: '0.65rem', opacity: 0.6 }}>{client.activeTaskCount} Active Tasks</span>
                          </div>
                          <span className="data-mono ltr-text" style={{ 
                              fontSize: '0.7rem',
                              color: client.health === 'CRITICAL' ? 'var(--dash-error)' : 
                                     client.health === 'AT RISK' ? '#F9AA33' : 
                                     '#4CAF50',
                              fontWeight: 600
                          }}>
                              {client.health}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                );

              case 'milestones':
                return (
                  <section key={widgetId} className="milestones glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">
                      <span>Milestones</span>
                      <select 
                        value={milestoneClientFilter}
                        onChange={(e) => setMilestoneClientFilter(e.target.value)}
                        style={{ fontSize: '0.7rem', padding: '2px 4px', width: 'auto' }}
                      >
                        <option value="all">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="milestone-track">
                      {upcomingMilestones.map(milestone => {
                        const project = projects.find(p => p.id === milestone.projectId);
                        const client = clients.find(c => c.id === project?.clientId);
                        return (
                          <div key={milestone.id} style={{ marginBottom: '20px' }}>
                            <div className="milestone-point" style={{ background: 'var(--dash-primary)', outline: '4px solid rgba(208, 188, 255, 0.1)' }}></div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dash-primary)' }}>{milestone.name}</div>
                            <div className="data-mono" style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '8px' }}>
                              {client?.name ? <span>{client.name} <span className="mx-1">·</span> </span> : ''}<span>{project?.name}</span> <span className="mx-1">·</span> <span className="ltr-text inline-block">{new Date(milestone.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--dash-outline)', borderRadius: '2px', overflow: 'hidden', width: '100%' }}>
                              <div style={{ 
                                height: '100%', 
                                width: `${milestone.progressPercent || 0}%`, 
                                background: 'var(--dash-tertiary)',
                                transition: 'width 0.5s ease'
                              }}></div>
                            </div>
                          </div>
                        );
                      })}
                      {upcomingMilestones.length === 0 && (
                        <div className="text-slate-500 text-xs">No upcoming milestones for this period</div>
                      )}
                    </div>
                  </section>
                );

              case 'quick-notes':
                return (
                  <section key={widgetId} className="quick-notes glass-panel animate-reveal" {...dragProps} style={{ ...dragProps.style, display: 'flex', flexDirection: 'column', maxHeight: '300px' }}>
                    <div className="widget-title">
                      <span>Scratchpad</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            placeholder="+ Add note (Press Enter)"
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--dash-outline)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: 'var(--dash-primary)',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const target = e.target as HTMLInputElement;
                                    if (target.value.trim()) {
                                        onAddNote({
                                            id: `note_${Date.now()}`,
                                            title: 'Quick Note',
                                            content: target.value,
                                            createdBy: currentUser.id,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString()
                                        });
                                        target.value = '';
                                    }
                                }
                            }}
                        />
                    </div>

                    <div className="notes-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {notes.filter(n => n.createdBy === currentUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(note => (
                            <div key={note.id} style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                borderRadius: '8px', 
                                padding: '10px', 
                                marginBottom: '8px',
                                border: '1px solid transparent',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <span className="data-mono ltr-text" style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </span>
                                    <button 
                                        onClick={() => onDeleteNote(note.id)}
                                        style={{ 
                                            background: 'transparent', 
                                            border: 'none', 
                                            color: 'var(--dash-error)', 
                                            cursor: 'pointer', 
                                            padding: '0 4px',
                                            opacity: 0.6,
                                            fontSize: '1.2rem',
                                            lineHeight: '0.5'
                                        }}
                                        title="Delete note"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                        const newContent = e.currentTarget.textContent;
                                        if (newContent && newContent !== note.content) {
                                            onUpdateNote({
                                                ...note,
                                                content: newContent,
                                                updatedAt: new Date().toISOString()
                                            });
                                        }
                                    }}
                                    style={{ 
                                        fontSize: '0.85rem', 
                                        color: '#E6E1E5', 
                                        outline: 'none',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        cursor: 'text'
                                    }}
                                >
                                    {note.content}
                                </div>
                            </div>
                        ))}
                        {notes.filter(n => n.createdBy === currentUser.id).length === 0 && (
                            <div className="text-slate-500 text-xs text-center py-4">
                                No notes yet.
                            </div>
                        )}
                    </div>
                  </section>
                );

              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
