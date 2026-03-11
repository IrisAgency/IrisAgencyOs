import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { prefixedId } from '../utils/id';
import {
  Task,
  Project,
  User,
  UserRole,
  Client,
  SocialPost,
  TaskTimeLog,
  ClientMeeting,
  Note,
  ProjectMilestone,
  Milestone,
  ApprovalStep,
  ProductionPlan,
  TaskStatus,
} from '../types';
import { PERMISSIONS } from '../lib/permissions';
import { usePermission } from '../hooks/usePermissions';
import NeedsMyApprovalCard from './dashboard/NeedsMyApprovalCard';
import './dashboard/DashboardTheme.css';
import { useTaskStore } from '../stores/useTaskStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useHRStore } from '../stores/useHRStore';
import { useClientStore } from '../stores/useClientStore';
import { usePostingStore } from '../stores/usePostingStore';
import { useNotesStore } from '../stores/useNotesStore';
import { useUIStore } from '../stores/useUIStore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  // ─── Store reads ───
  const { currentUser: _authUser, checkPermission } = useAuth();
  const currentUser = _authUser!; // Guaranteed non-null by auth guard in App.tsx
  const taskStore = useTaskStore();
  const projectStore = useProjectStore();
  const hrStore = useHRStore();
  const clientStore = useClientStore();
  const postingStore = usePostingStore();
  const notesStore = useNotesStore();
  const { showToast, clearToast, setTargetTaskId } = useUIStore();
  const navigate = useNavigate();

  const activeTasks = useMemo(() => taskStore.tasks.filter(t => !t.isDeleted), [taskStore.tasks]);
  const tasks = useMemo(() => {
    if (checkPermission(PERMISSIONS.TASKS.VIEW_ALL)) return activeTasks;
    return activeTasks.filter(t => {
      const assignees = t.assigneeIds;
      const isAssigned = Array.isArray(assignees) && assignees.includes(currentUser?.id || '');
      return isAssigned || t.createdBy === currentUser?.id;
    });
  }, [checkPermission, activeTasks, currentUser?.id]);
  const projects = useMemo(() => {
    const allProjects = projectStore.projects;
    if (checkPermission(PERMISSIONS.PROJECTS.VIEW_ALL)) return allProjects;
    return allProjects.filter(p =>
      projectStore.projectMembers.some(m => m.projectId === p.id && m.userId === currentUser?.id) ||
      p.accountManagerId === currentUser?.id ||
      p.projectManagerId === currentUser?.id ||
      activeTasks.some(t => t.projectId === p.id && t.assigneeIds?.includes(currentUser?.id || ''))
    );
  }, [projectStore.projects, projectStore.projectMembers, currentUser?.id, checkPermission, activeTasks]);
  const users = useMemo(() => {
    const safe = Array.isArray(hrStore.users) ? hrStore.users : [];
    return safe.filter(u => u && u.status !== 'inactive');
  }, [hrStore.users]);
  const clients = clientStore.clients;
  const socialPosts = postingStore.socialPosts;
  const timeLogs = taskStore.timeLogs;
  const meetings = clientStore.meetings;
  const notes = notesStore.notes;
  const milestones = projectStore.projectMilestones;
  const dynamicMilestones = projectStore.dynamicMilestones;
  const approvalSteps = taskStore.approvalSteps;

  // ─── Wrapped actions ───
  const onAddNote = useCallback(async (n: Note) => {
    await notesStore.addNote(n);
    showToast({ title: 'Note Created', message: 'Note added successfully.' });
  }, [notesStore, showToast]);
  const onUpdateNote = useCallback(async (n: Note) => {
    await notesStore.updateNote(n);
    showToast({ title: 'Note Updated', message: 'Note updated successfully.' });
  }, [notesStore, showToast]);
  const onDeleteNote = useCallback(async (id: string) => {
    await notesStore.deleteNote(id);
    showToast({ title: 'Note Deleted', message: 'Note deleted.' });
  }, [notesStore, showToast]);
  const onNavigateToTask = useCallback((taskId: string) => setTargetTaskId(taskId), [setTargetTaskId]);
  const onNavigateToMeeting = useCallback((_id?: string) => navigate('/clients'), [navigate]);
  const onNavigateToPost = useCallback(() => navigate('/posting'), [navigate]);
  const onViewAllTasks = useCallback(() => navigate('/tasks'), [navigate]);
  const onViewAllApprovals = useCallback(() => navigate('/tasks'), [navigate]);
  const onNavigateToUserTasks = useCallback(() => navigate('/tasks'), [navigate]);
  const onNavigateToClient = useCallback((_id?: string) => navigate('/clients'), [navigate]);
  const onScheduleMeeting = useCallback(() => navigate('/clients'), [navigate]);
  const onNavigateToCalendar = useCallback(() => navigate('/calendar'), [navigate]);
  
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
    'my-tasks', 'needs-my-approval', 'revisions', 'gm-urgent', 'team-progress', 'calendar', 'client-status', 'milestones', 'quick-notes'
  ]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const today = new Date();

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
  const myTasksFiltered = userTasksAll
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

  // If no tasks match the time filter, show the nearest upcoming tasks instead
  const showingUpcoming = myTasksFiltered.length === 0;
  const myTasks = showingUpcoming
    ? userTasksAll
        .filter(t => {
          const dueDate = t.dueDate ? new Date(t.dueDate) : null;
          if (!dueDate) return false;

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
          return matchesClient && matchesType;
        })
        .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
        .slice(0, 5)
    : myTasksFiltered;

  const isManagerRole = currentUser.role === UserRole.GENERAL_MANAGER || currentUser.role === UserRole.ACCOUNT_MANAGER;

  // Revisions Card State
  const [revisionTypeFilter, setRevisionTypeFilter] = useState<string>('all');

  // Compute revision tasks: tasks with status 'revisions_required' or active revisionContext
  const revisionTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === TaskStatus.ARCHIVED || t.isArchived || t.isDeleted) return false;
      const isRevision = t.status === TaskStatus.REVISIONS_REQUIRED || (t.revisionContext?.active === true);
      if (!isRevision) return false;
      // Also check approval steps with revision_requested status
      const hasRevisionStep = approvalSteps.some(s => s.taskId === t.id && (s.status === 'revision_requested' || s.status === 'rejected'));
      return isRevision || hasRevisionStep;
    });
  }, [tasks, approvalSteps]);

  // For GM/AM: group by assignee; for others: only show their own
  const myRevisionTasks = useMemo(() => {
    const filtered = revisionTasks.filter(t => {
      if (revisionTypeFilter !== 'all' && t.taskType !== revisionTypeFilter) return false;
      if (isManagerRole) return true; // GM/AM see all
      return (t.assigneeIds || []).includes(currentUser.id) || t.revisionContext?.assignedToUserId === currentUser.id;
    });
    return filtered;
  }, [revisionTasks, isManagerRole, currentUser.id, revisionTypeFilter]);

  // Group revisions by team member (for manager view)
  const revisionsByMember = useMemo(() => {
    if (!isManagerRole) return [];
    const map = new Map<string, Task[]>();
    myRevisionTasks.forEach(t => {
      // Use revision assigned user if available, otherwise first assignee
      const assigneeId = t.revisionContext?.assignedToUserId || t.assigneeIds?.[0] || 'unassigned';
      if (!map.has(assigneeId)) map.set(assigneeId, []);
      map.get(assigneeId)!.push(t);
    });
    return Array.from(map.entries())
      .map(([userId, tasks]) => ({ user: users.find(u => u.id === userId), userId, tasks }))
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [myRevisionTasks, isManagerRole, users]);

  // Available task types for revision filter
  const revisionTaskTypes = useMemo(() => {
    return Array.from(new Set(revisionTasks.map(t => t.taskType).filter(Boolean))).sort();
  }, [revisionTasks]);

  const urgentTasks = tasks
    .filter(t => {
      if (t.status === 'completed' || t.status === 'archived') return false;
      // GM and AM see ALL active tasks from all team members
      if (isManagerRole) return true;
      // Other roles see only urgent/overdue/due-soon/awaiting-review tasks
      const isHighPriority = t.priority === 'high' || t.priority === 'critical';
      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
      const isAwaitingReview = t.status === 'awaiting_review';
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
      const isDueSoon = t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= tomorrow;
      return isHighPriority || isOverdue || isAwaitingReview || isDueSoon;
    })
    .sort((a, b) => {
      // Overdue first, then by priority, then by due date
      const now = new Date();
      const aOverdue = a.dueDate && new Date(a.dueDate) < now ? 1 : 0;
      const bOverdue = b.dueDate && new Date(b.dueDate) < now ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const pDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      if (pDiff !== 0) return pDiff;
      return new Date(a.dueDate || '9999').getTime() - new Date(b.dueDate || '9999').getTime();
    });

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

  // Convert dynamic milestones (from smart project creation) into a unified display format
  const dynamicMilestonesConverted: { id: string; projectId: string; name: string; dueDate: string; status: string; progressPercent: number; isDynamic: true; targetCount: number; completedCount: number; type: string }[] = dynamicMilestones.map(dm => {
    const dmTasks = tasks.filter(t => (t as any).dynamicMilestoneId === dm.id);
    const completedCount = dmTasks.filter(t => t.status === 'completed').length;
    const totalCount = dm.targetCount || dmTasks.length || 1;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    // Use createdAt as a rough date for sorting
    return {
      id: dm.id,
      projectId: dm.projectId,
      name: dm.title,
      dueDate: dm.createdAt, // Use createdAt for sorting/display
      status: progress >= 100 ? 'completed' : 'in_progress',
      progressPercent: progress,
      isDynamic: true as const,
      targetCount: totalCount,
      completedCount,
      type: dm.type
    };
  });

  // Merge legacy ProjectMilestones and dynamic milestones
  const allMilestones = [
    ...milestones
      .filter(m => {
        if (!m || m.status === 'completed') return false;
        // Exclude deleted milestones
        if ((m as any).isDeleted) return false;
        // Must belong to a valid, non-deleted project with a client
        const project = projects.find(p => p.id === m.projectId);
        if (!project || (project as any).isDeleted || !project.clientId) return false;
        // Client filter
        if (milestoneClientFilter !== 'all' && project.clientId !== milestoneClientFilter) return false;
        const dueDate = new Date(m.dueDate);
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(now.getMonth() + 1);
        const isCurrentMonth = dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
        const isNextMonth = dueDate.getMonth() === nextMonth.getMonth() && dueDate.getFullYear() === nextMonth.getFullYear();
        return isCurrentMonth || isNextMonth;
      })
      .map(m => ({ ...m, isDynamic: false as const, targetCount: 0, completedCount: 0, type: '' })),
    ...dynamicMilestonesConverted.filter(dm => {
      if (dm.status === 'completed') return false;
      // Must belong to a valid, non-deleted project with a client
      const project = projects.find(p => p.id === dm.projectId);
      if (!project || (project as any).isDeleted || !project.clientId) return false;
      // Client filter
      if (milestoneClientFilter !== 'all' && project.clientId !== milestoneClientFilter) return false;
      return true;
    })
  ];

  const upcomingMilestones = allMilestones
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8);

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

  // Calendar: Monthly Grid State
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [calendarViewMode, setCalendarViewMode] = useState<'mine' | 'team'>('mine');
  const [calendarFilterUserId, setCalendarFilterUserId] = useState<string | null>(null);

  // Tasks to show on the calendar based on view mode
  const calendarTasks = useMemo(() => {
    const allActiveTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
    if (calendarViewMode === 'mine') {
      return allActiveTasks.filter(t => t.assigneeIds?.includes(selectedUserId));
    }
    // Team mode
    if (calendarFilterUserId) {
      return allActiveTasks.filter(t => t.assigneeIds?.includes(calendarFilterUserId));
    }
    return allActiveTasks; // All team tasks
  }, [tasks, calendarViewMode, calendarFilterUserId, selectedUserId]);

  const calendarMonthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    // Build a map of date → tasks/meetings for fast lookup
    const tasksByDate: Record<string, Task[]> = {};
    const meetingsByDate: Record<string, typeof meetings> = {};

    calendarTasks.forEach(t => {
      if (!t.dueDate) return;
      const key = new Date(t.dueDate).toDateString();
      if (!tasksByDate[key]) tasksByDate[key] = [];
      tasksByDate[key].push(t);
    });
    meetings.forEach(m => {
      const key = new Date(m.date).toDateString();
      if (!meetingsByDate[key]) meetingsByDate[key] = [];
      meetingsByDate[key].push(m);
    });

    const days: { date: Date; dayNum: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; tasks: Task[]; meetings: typeof meetings }[] = [];

    // Leading blanks for alignment
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, -(startDow - 1 - i));
      const key = d.toDateString();
      days.push({ date: d, dayNum: d.getDate(), isCurrentMonth: false, isToday: false, isSelected: d.toDateString() === selectedDate.toDateString(), tasks: tasksByDate[key] || [], meetings: meetingsByDate[key] || [] });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const key = d.toDateString();
      days.push({ date: d, dayNum: i, isCurrentMonth: true, isToday: d.toDateString() === today.toDateString(), isSelected: d.toDateString() === selectedDate.toDateString(), tasks: tasksByDate[key] || [], meetings: meetingsByDate[key] || [] });
    }
    // Trailing blanks
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        const key = d.toDateString();
        days.push({ date: d, dayNum: i, isCurrentMonth: false, isToday: false, isSelected: d.toDateString() === selectedDate.toDateString(), tasks: tasksByDate[key] || [], meetings: meetingsByDate[key] || [] });
      }
    }
    return days;
  }, [calendarMonth, calendarTasks, meetings, selectedDate]);

  // Task type → dot color mapping
  const taskTypeDotColor = (type: string): string => {
    switch (type) {
      case 'video': return '#ef4444';       // red
      case 'photo': return '#3b82f6';       // blue
      case 'motion': return '#a855f7';      // purple
      case 'design': return '#f59e0b';      // amber
      case 'copywriting': return '#10b981'; // emerald
      case 'social_content': case 'social_publishing': return '#ec4899'; // pink
      case 'meeting': return '#06b6d4';     // cyan
      default: return '#64748b';            // slate
    }
  };

  // Filter meetings for selected date
  const selectedDateMeetings = meetings.filter(m => {
      const mDate = new Date(m.date);
      return mDate.toDateString() === selectedDate.toDateString();
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter tasks for selected date
  const selectedDateTasks = calendarTasks.filter(t => {
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
        const defaultOrder = ['my-tasks', 'needs-my-approval', 'revisions', 'gm-urgent', 'team-progress', 'calendar', 'client-status', 'milestones', 'quick-notes'];
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
    <>
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
                      {showingUpcoming && myTasks.length > 0 && (
                        <div style={{ 
                          fontSize: '0.65rem', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          marginBottom: '8px',
                          padding: '4px 8px',
                          background: 'var(--dash-primary)',
                          borderRadius: '6px',
                          display: 'inline-block',
                          color: 'var(--dash-on-primary)',
                          fontWeight: 600
                        }}>
                          ↗ Upcoming — nearest tasks
                        </div>
                      )}
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
                          No assigned tasks yet
                        </div>
                      )}
                    </div>
                  </section>
                );

              case 'needs-my-approval':
                return (
                  <section key={widgetId} className="needs-my-approval glass-panel animate-reveal" {...dragProps}>
                    <NeedsMyApprovalCard
                      tasks={tasks}
                      approvalSteps={approvalSteps}
                      currentUser={currentUser}
                      users={users}
                      onNavigateToTask={onNavigateToTask}
                      onViewAll={onViewAllApprovals}
                    />
                  </section>
                );

              case 'revisions':
                return (
                  <section key={widgetId} className="revisions glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">
                      <span>
                        {isManagerRole ? 'Team Revisions' : 'My Revisions'}
                        {myRevisionTasks.length > 0 && (
                          <span style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: 6 }}>({myRevisionTasks.length})</span>
                        )}
                      </span>
                      {isManagerRole && (
                        <select
                          value={revisionTypeFilter}
                          onChange={(e) => setRevisionTypeFilter(e.target.value)}
                          style={{ fontSize: '0.7rem', padding: '2px 4px', width: 'auto' }}
                        >
                          <option value="all">All Types</option>
                          {revisionTaskTypes.map(t => (
                            <option key={t} value={t}>{(t || 'other').replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
                      {isManagerRole ? (
                        /* Manager view: grouped by team member */
                        revisionsByMember.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--dash-secondary)', opacity: 0.5, fontSize: '0.85rem' }}>
                            No active revisions
                          </div>
                        ) : (
                          revisionsByMember.map(({ user: member, userId, tasks: memberTasks }) => (
                            <div key={userId} style={{ marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-tertiary))',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.65rem', fontWeight: 700, color: 'var(--dash-on-primary)', flexShrink: 0
                                }}>
                                  {member?.name?.charAt(0) || '?'}
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{member?.name || 'Unassigned'}</span>
                                <span className="data-mono ltr-text" style={{ fontSize: '0.65rem', opacity: 0.5, marginLeft: 'auto' }}>
                                  {memberTasks.length} revision{memberTasks.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {memberTasks.map(task => {
                                const project = projects.find(p => p.id === task.projectId);
                                const revCycle = task.revisionContext?.cycle || (task.revisionHistory?.length || 0) + 1;
                                return (
                                  <div
                                    key={task.id}
                                    onClick={() => onNavigateToTask?.(task.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '10px',
                                      padding: '10px 12px', marginBottom: '6px', borderRadius: '12px',
                                      background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                                      borderLeft: `3px solid ${revCycle >= 3 ? 'var(--dash-error)' : revCycle >= 2 ? '#F9AA33' : 'var(--dash-primary)'}`,
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                                      <div className="data-mono ltr-text" style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '2px' }}>
                                        {project?.name || 'No project'} · {(task.taskType || 'other').replace(/_/g, ' ')}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                                      <span style={{
                                        fontSize: '0.6rem', padding: '2px 8px', borderRadius: '9px', fontWeight: 700,
                                        letterSpacing: '0.5px', textTransform: 'uppercase',
                                        background: revCycle >= 3 ? 'rgba(239,68,68,0.15)' : revCycle >= 2 ? 'rgba(249,170,51,0.15)' : 'rgba(223,30,60,0.1)',
                                        color: revCycle >= 3 ? '#f87171' : revCycle >= 2 ? '#fbbf24' : 'var(--dash-primary)'
                                      }}>
                                        Cycle {revCycle}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))
                        )
                      ) : (
                        /* Non-manager view: flat list of own revisions */
                        myRevisionTasks.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--dash-secondary)', opacity: 0.5, fontSize: '0.85rem' }}>
                            No revisions assigned to you
                          </div>
                        ) : (
                          myRevisionTasks.map(task => {
                            const project = projects.find(p => p.id === task.projectId);
                            const revCycle = task.revisionContext?.cycle || (task.revisionHistory?.length || 0) + 1;
                            const requestedBy = task.revisionContext?.requestedByUserId
                              ? users.find(u => u.id === task.revisionContext?.requestedByUserId)?.name?.split(' ')[0]
                              : null;
                            return (
                              <div
                                key={task.id}
                                onClick={() => onNavigateToTask?.(task.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  padding: '12px', marginBottom: '8px', borderRadius: '12px',
                                  background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                                  borderLeft: `3px solid ${revCycle >= 3 ? 'var(--dash-error)' : revCycle >= 2 ? '#F9AA33' : 'var(--dash-primary)'}`,
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                                  <div className="data-mono ltr-text" style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '2px' }}>
                                    {project?.name || 'No project'}
                                    {requestedBy ? ` · by ${requestedBy}` : ''}
                                  </div>
                                  {task.revisionContext?.message && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', color: 'var(--dash-secondary)', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      &ldquo;{task.revisionContext.message}&rdquo;
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                                  <span style={{
                                    fontSize: '0.6rem', padding: '2px 8px', borderRadius: '9px', fontWeight: 700,
                                    letterSpacing: '0.5px', textTransform: 'uppercase',
                                    background: revCycle >= 3 ? 'rgba(239,68,68,0.15)' : revCycle >= 2 ? 'rgba(249,170,51,0.15)' : 'rgba(223,30,60,0.1)',
                                    color: revCycle >= 3 ? '#f87171' : revCycle >= 2 ? '#fbbf24' : 'var(--dash-primary)'
                                  }}>
                                    Cycle {revCycle}
                                  </span>
                                  <span className="data-mono ltr-text" style={{ fontSize: '0.6rem', opacity: 0.4 }}>
                                    {(task.taskType || 'other').replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  </section>
                );

              case 'gm-urgent':
                if (!canViewGmUrgent) return null;
                return (
                  <section key={widgetId} className="gm-urgent glass-panel animate-reveal" {...dragProps}>
                    <div className="widget-title">
                      <span>Agency Blockers {urgentTasks.length > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: 6 }}>({urgentTasks.length})</span>}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dash-error)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
                      {urgentTasks.map(task => {
                        const now = new Date();
                        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
                        const isOverdue = task.dueDate && new Date(task.dueDate) < now;
                        const isDueSoon = task.dueDate && !isOverdue && new Date(task.dueDate) <= tomorrow;
                        const isAwaitingReview = task.status === 'awaiting_review';
                        const isCritical = task.priority === 'critical';
                        const isHigh = task.priority === 'high';
                        const assigneeNames = isManagerRole && task.assigneeIds?.length
                          ? task.assigneeIds.map(id => users.find(u => u.id === id)?.name?.split(' ')[0] || '').filter(Boolean)
                          : [];
                        const statusLabel = task.status?.replace(/_/g, ' ');
                        return (
                          <div key={task.id} className="urgent-item" onClick={() => onNavigateToTask?.(task.id)} style={{ flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
                              <span style={{ fontSize: '0.85rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span className="status-dot"></span>
                                {task.title}
                              </span>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                                {isOverdue && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 9, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, letterSpacing: '0.5px' }}>OVERDUE</span>}
                                {isDueSoon && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 9, background: 'rgba(251,146,60,0.15)', color: '#fb923c', fontWeight: 700, letterSpacing: '0.5px' }}>DUE SOON</span>}
                                {isAwaitingReview && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 9, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.5px' }}>REVIEW</span>}
                                {isCritical && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 9, background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, letterSpacing: '0.5px' }}>CRITICAL</span>}
                                {isHigh && !isCritical && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 9, background: 'rgba(251,146,60,0.15)', color: '#fb923c', fontWeight: 700, letterSpacing: '0.5px' }}>HIGH</span>}
                                {!isOverdue && !isDueSoon && !isAwaitingReview && !isCritical && !isHigh && (
                                  <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 9, background: 'rgba(148,163,184,0.12)', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{statusLabel}</span>
                                )}
                              </div>
                            </div>
                            {isManagerRole && assigneeNames.length > 0 && (
                              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', paddingLeft: 16 }}>
                                {assigneeNames.join(', ')}{task.dueDate ? ` · ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {urgentTasks.length === 0 && (
                      <div className="text-center py-4 text-slate-500 text-xs">No urgent blockers</div>
                    )}
                  </section>
                );

              case 'team-progress':
                if (currentUser.role !== UserRole.GENERAL_MANAGER && currentUser.role !== UserRole.ACCOUNT_MANAGER) return null;
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

                    {/* Team / Mine Toggle (GM & AM only) */}
                    {isManagerRole && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: calendarViewMode === 'team' ? '8px' : '0' }}>
                          <button
                            onClick={() => { setCalendarViewMode('mine'); setCalendarFilterUserId(null); }}
                            style={{
                              padding: '3px 10px', fontSize: '0.65rem', borderRadius: '6px', border: '1px solid var(--dash-outline)', cursor: 'pointer',
                              background: calendarViewMode === 'mine' ? 'var(--dash-primary)' : 'transparent',
                              color: calendarViewMode === 'mine' ? 'var(--dash-on-primary)' : 'var(--dash-secondary)',
                              fontWeight: 600
                            }}
                          >
                            Mine
                          </button>
                          <button
                            onClick={() => { setCalendarViewMode('team'); setCalendarFilterUserId(null); }}
                            style={{
                              padding: '3px 10px', fontSize: '0.65rem', borderRadius: '6px', border: '1px solid var(--dash-outline)', cursor: 'pointer',
                              background: calendarViewMode === 'team' ? 'var(--dash-primary)' : 'transparent',
                              color: calendarViewMode === 'team' ? 'var(--dash-on-primary)' : 'var(--dash-secondary)',
                              fontWeight: 600
                            }}
                          >
                            Team
                          </button>
                        </div>
                        {calendarViewMode === 'team' && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setCalendarFilterUserId(null)}
                              style={{
                                padding: '2px 8px', fontSize: '0.6rem', borderRadius: '12px', border: '1px solid var(--dash-outline)', cursor: 'pointer',
                                background: !calendarFilterUserId ? 'rgba(223, 30, 60, 0.15)' : 'transparent',
                                color: !calendarFilterUserId ? 'var(--dash-primary)' : 'var(--dash-secondary)',
                                fontWeight: !calendarFilterUserId ? 600 : 400
                              }}
                            >
                              All
                            </button>
                            {users.filter(u => u.status === 'active').map(u => (
                              <button
                                key={u.id}
                                onClick={() => setCalendarFilterUserId(u.id)}
                                style={{
                                  padding: '2px 8px', fontSize: '0.6rem', borderRadius: '12px', border: '1px solid var(--dash-outline)', cursor: 'pointer',
                                  background: calendarFilterUserId === u.id ? 'rgba(223, 30, 60, 0.15)' : 'transparent',
                                  color: calendarFilterUserId === u.id ? 'var(--dash-primary)' : 'var(--dash-secondary)',
                                  fontWeight: calendarFilterUserId === u.id ? 600 : 400
                                }}
                              >
                                {u.name.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Month Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <button
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        style={{ background: 'none', border: 'none', color: 'var(--dash-text)', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px', borderRadius: '6px', opacity: 0.6 }}
                      >
                        ‹
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.03em' }}>
                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                      </span>
                      <button
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        style={{ background: 'none', border: 'none', color: 'var(--dash-text)', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px', borderRadius: '6px', opacity: 0.6 }}
                      >
                        ›
                      </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '4px' }}>
                      {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                        <div key={d} style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 600, letterSpacing: '0.05em', padding: '2px 0' }}>{d}</div>
                      ))}
                    </div>

                    {/* Monthly Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                      {calendarMonthDays.map((day, i) => {
                        const hasTasks = day.tasks.length > 0;
                        const hasMeetings = day.meetings.length > 0;
                        // Collect unique task type colors (max 3 dots)
                        const dotColors = Array.from(new Set(day.tasks.map(t => taskTypeDotColor(t.taskType || 'other')))).slice(0, 3);
                        if (hasMeetings) dotColors.push('#06b6d4'); // cyan for meetings

                        return (
                          <div
                            key={i}
                            onClick={() => { if (day.isCurrentMonth) setSelectedDate(day.date); }}
                            style={{
                              textAlign: 'center',
                              padding: '4px 2px 2px',
                              cursor: day.isCurrentMonth ? 'pointer' : 'default',
                              opacity: day.isCurrentMonth ? 1 : 0.2,
                              borderRadius: '8px',
                              background: day.isSelected ? 'var(--dash-primary)' : day.isToday ? 'rgba(223, 30, 60, 0.12)' : 'transparent',
                              transition: 'background 0.15s',
                              minHeight: '38px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-start'
                            }}
                          >
                            <div style={{
                              fontSize: '0.75rem',
                              fontWeight: day.isToday ? 800 : 500,
                              color: day.isSelected ? 'var(--dash-on-primary)' : day.isToday ? 'var(--dash-primary)' : 'inherit',
                              lineHeight: 1.4
                            }}>
                              {day.dayNum}
                            </div>
                            {/* Task/meeting dots */}
                            {dotColors.length > 0 && (
                              <div style={{ display: 'flex', gap: '2px', marginTop: '2px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {dotColors.slice(0, 4).map((c, j) => (
                                  <div key={j} style={{ width: '4px', height: '4px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Day Detail */}
                    <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {/* Tasks Section */}
                        {selectedDateTasks.length > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                                <div className="data-mono" style={{ fontSize: '0.6rem', opacity: 0.4, marginBottom: '6px', textTransform: 'uppercase' }}>
                                  Tasks — {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                {selectedDateTasks.map(task => (
                                    <div key={task.id} onClick={() => onNavigateToTask?.(task.id)} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                                      background: 'var(--dash-surface-elevated)', marginBottom: '4px',
                                      transition: 'background 0.15s',
                                      borderLeft: `3px solid ${taskTypeDotColor(task.taskType || 'other')}`
                                    }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                          {task.taskType?.toUpperCase() || 'TASK'} · {projects.find(p => p.id === task.projectId)?.name || 'General'}
                                          {calendarViewMode === 'team' && task.assigneeIds?.length ? (
                                            <span> · {task.assigneeIds.map(aid => users.find(u => u.id === aid)?.name.split(' ')[0]).filter(Boolean).join(', ')}</span>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: taskTypeDotColor(task.taskType || 'other'), color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                                        {task.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                                      </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Meetings Section */}
                        {selectedDateMeetings.length > 0 && (
                            <div>
                                <div className="data-mono" style={{ fontSize: '0.6rem', opacity: 0.4, marginBottom: '6px', textTransform: 'uppercase' }}>Meetings</div>
                                {selectedDateMeetings.map(meeting => (
                                    <div key={meeting.id} onClick={() => onNavigateToMeeting?.(meeting.id)} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                                      background: 'var(--dash-surface-elevated)', marginBottom: '4px',
                                      borderLeft: '3px solid #06b6d4'
                                    }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meeting.title}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                          {new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {clients.find(c => c.id === meeting.clientId)?.name || meeting.locationType}
                                        </div>
                                      </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedDateTasks.length === 0 && selectedDateMeetings.length === 0 && (
                            <div className="text-center" style={{ padding: '16px 8px' }}>
                                <div style={{ fontSize: '0.8rem', opacity: 0.4 }}>
                                    No events on {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        )}
                    </div>
                  </section>
                );

              case 'client-status':
                if (currentUser.role !== UserRole.GENERAL_MANAGER && currentUser.role !== UserRole.ACCOUNT_MANAGER) return null;
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
                if (currentUser.role !== UserRole.GENERAL_MANAGER && currentUser.role !== UserRole.ACCOUNT_MANAGER) return null;
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
                        const typeColors: Record<string, string> = { VIDEO: '#ef4444', PHOTO: '#3b82f6', MOTION: '#a855f7', POSTING: '#06b6d4' };
                        const accentColor = milestone.isDynamic && milestone.type ? (typeColors[milestone.type] || 'var(--dash-primary)') : 'var(--dash-primary)';
                        return (
                          <div key={milestone.id} style={{ marginBottom: '20px' }}>
                            <div className="milestone-point" style={{ background: accentColor, outline: '4px solid rgba(208, 188, 255, 0.1)' }}></div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: accentColor }}>{milestone.name}</div>
                            <div className="data-mono" style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '8px' }}>
                              {client?.name ? <span>{client.name} <span className="mx-1">·</span> </span> : ''}<span>{project?.name}</span>
                              {milestone.isDynamic ? (
                                <span> <span className="mx-1">·</span> <span className="ltr-text inline-block">{milestone.completedCount}/{milestone.targetCount} done</span></span>
                              ) : (
                                <span> <span className="mx-1">·</span> <span className="ltr-text inline-block">{new Date(milestone.dueDate).toLocaleDateString()}</span></span>
                              )}
                            </div>
                            <div style={{ height: '4px', background: 'var(--dash-outline)', borderRadius: '2px', overflow: 'hidden', width: '100%' }}>
                              <div style={{ 
                                height: '100%', 
                                width: `${milestone.progressPercent || 0}%`, 
                                background: milestone.isDynamic ? accentColor : 'var(--dash-tertiary)',
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
                                            id: prefixedId('note'),
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
    </>
  );
};

export default Dashboard;
