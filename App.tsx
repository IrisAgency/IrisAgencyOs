/**
 * App.tsx — Layout shell, store subscription orchestrator, and route definitions.
 *
 * All hub/page components read directly from Zustand stores.
 * App.tsx only handles: auth gates, store subscriptions, routing,
 * global task detail overlay, and push notification prompt.
 */
import React, { useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Layout components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AIAssistant from './components/AIAssistant';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import TaskDetailView from './components/tasks/TaskDetailView';

// Contexts & hooks
import { useAuth } from './contexts/AuthContext';
import { useBranding } from './contexts/BrandingContext';
import { useMessagingToken } from './hooks/useMessagingToken';
import { PERMISSIONS } from './lib/permissions';
import { startOverflowMonitoring } from './utils/overflowDetector';
import { archiveTask } from './utils/archiveUtils';
import { notifyUsers } from './services/notificationService';

// Stores
import { useUIStore } from './stores/useUIStore';
import { useClientStore } from './stores/useClientStore';
import { useProjectStore } from './stores/useProjectStore';
import { useTaskStore } from './stores/useTaskStore';
import { useNotificationStore } from './stores/useNotificationStore';
import { useFileStore } from './stores/useFileStore';
import { useFinanceStore } from './stores/useFinanceStore';
import { useHRStore } from './stores/useHRStore';
import { useProductionStore } from './stores/useProductionStore';
import { usePostingStore } from './stores/usePostingStore';
import { useCreativeStore } from './stores/useCreativeStore';
import { useCalendarStore } from './stores/useCalendarStore';
import { useAdminStore } from './stores/useAdminStore';
import { useNetworkStore } from './stores/useNetworkStore';
import { useNotesStore } from './stores/useNotesStore';
import { useQCStore } from './stores/useQCStore';

// Constants & types
import type {
  Task,
  TaskStatus,
  ProjectMember,
  RoleDefinition,
  NotificationType,
  AgencyFile,
} from './types';
import { X, Bell, ChevronRight } from 'lucide-react';

// Lazy-loaded route components
const Dashboard = lazy(() => import('./components/Dashboard'));
const ClientsHub = lazy(() => import('./components/ClientsHub'));
const ProjectsHub = lazy(() => import('./components/ProjectsHub'));
const TasksHub = lazy(() => import('./components/TasksHub'));
const PostingHub = lazy(() => import('./components/PostingHub'));
const CalendarHub = lazy(() => import('./components/CalendarHub'));
const CreativeDirectionHub = lazy(() => import('./components/CreativeDirectionHub'));
const QualityControlHub = lazy(() => import('./components/QualityControlHub'));
const FilesHub = lazy(() => import('./components/FilesHub'));
const ProductionHub = lazy(() => import('./components/ProductionHub'));
const VendorsHub = lazy(() => import('./components/VendorsHub'));
const FinanceHub = lazy(() => import('./components/FinanceHub'));
const TeamHub = lazy(() => import('./components/TeamHub'));
const UnifiedCalendar = lazy(() => import('./components/UnifiedCalendar'));
const AnalyticsHub = lazy(() => import('./components/AnalyticsHub'));
const NotificationsHub = lazy(() => import('./components/NotificationsHub'));
const NotificationConsole = lazy(() => import('./components/NotificationConsole'));
const AdminHub = lazy(() => import('./components/AdminHub'));

const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─────────────────────────────────────────────
// Path ↔ viewKey mapping for Sidebar compat
// ─────────────────────────────────────────────
const pathToViewKey: Record<string, string> = {
  '/': 'dashboard',
  '/clients': 'clients',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/posting': 'posting',
  '/calendar': 'calendar',
  '/creative': 'creative',
  '/quality-control': 'quality-control',
  '/assets': 'assets',
  '/production': 'production',
  '/network': 'network',
  '/finance': 'finance',
  '/hr': 'hr',
  '/schedule': 'schedule',
  '/analytics': 'analytics',
  '/notifications': 'notifications',
  '/admin': 'admin',
};
const viewKeyToPath: Record<string, string> = Object.fromEntries(Object.entries(pathToViewKey).map(([k, v]) => [v, k]));

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Auth & Branding ─────────────────────
  const { currentUser: user, loading, logout, checkPermission } = useAuth();
  const { branding, loading: brandingLoading } = useBranding();

  // ─── UI Store ─────────────────────────────
  const {
    targetProjectId,
    targetTaskId,
    isAIOpen,
    isSidebarOpen,
    toast,
    splashFinished,
    hidePushPrompt,
    setTargetProjectId,
    setTargetTaskId,
    setIsAIOpen,
    toggleSidebar,
    closeSidebar,
    showToast,
    clearToast,
    setSplashFinished,
    setHidePushPrompt,
  } = useUIStore();

  // Derive activeView from URL for Sidebar
  const activeView = pathToViewKey[location.pathname] || 'dashboard';

  // ─── Domain Store State (subscribe on mount) ─────
  const clientStore = useClientStore();
  const projectStore = useProjectStore();
  const taskStore = useTaskStore();
  const notifStore = useNotificationStore();
  const fileStore = useFileStore();
  const financeStore = useFinanceStore();
  const hrStore = useHRStore();
  const productionStore = useProductionStore();
  const postingStore = usePostingStore();
  const creativeStore = useCreativeStore();
  const calendarStore = useCalendarStore();
  const adminStore = useAdminStore();
  const networkStore = useNetworkStore();
  const notesStore = useNotesStore();
  const qcStore = useQCStore();

  // Subscribe all stores when user is authenticated, unsubscribe on logout/unmount
  useEffect(() => {
    if (!user) return; // Don't subscribe until authenticated — Firestore rules deny unauthenticated reads

    clientStore.subscribe();
    projectStore.subscribe();
    taskStore.subscribe();
    notifStore.subscribe();
    fileStore.subscribe();
    financeStore.subscribe();
    hrStore.subscribe();
    productionStore.subscribe();
    postingStore.subscribe();
    creativeStore.subscribe();
    calendarStore.subscribe();
    adminStore.subscribe();
    networkStore.subscribe();
    notesStore.subscribe();
    qcStore.subscribe();

    return () => {
      clientStore.unsubscribe();
      projectStore.unsubscribe();
      taskStore.unsubscribe();
      notifStore.unsubscribe();
      fileStore.unsubscribe();
      financeStore.unsubscribe();
      hrStore.unsubscribe();
      productionStore.unsubscribe();
      postingStore.unsubscribe();
      creativeStore.unsubscribe();
      calendarStore.unsubscribe();
      adminStore.unsubscribe();
      networkStore.unsubscribe();
      notesStore.unsubscribe();
      qcStore.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load notification preferences
  useEffect(() => {
    if (user) notifStore.loadPreferences(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── Derived Data (memoized) ───────────────
  const tasks = taskStore.tasks;
  const activeTasks = useMemo(() => tasks.filter((t) => !t.isDeleted), [tasks]);
  const projects = projectStore.projects;
  const clients = clientStore.clients;
  const safeUsers = useMemo(() => (Array.isArray(hrStore.users) ? hrStore.users : []), [hrStore.users]);
  const activeUsers = useMemo(() => safeUsers.filter((u) => u && u.status !== 'inactive'), [safeUsers]);
  const { files, folders } = fileStore;
  const { systemRoles, workflowTemplates, dashboardBanners } = adminStore;
  const dashboardBanner = useMemo(() => dashboardBanners.find((b) => b.isActive) || null, [dashboardBanners]);
  const canSendNotifications = checkPermission(PERMISSIONS.ADMIN_SETTINGS.VIEW);

  const notifications = useMemo(() => {
    if (!user) return [];
    return [...notifStore.allNotifications.filter((n) => n.userId === user.id)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifStore.allNotifications, user]);

  // ─── Messaging ────────────────────────────
  const { requestPermissionAndRegister, permissionState, token: messagingToken } = useMessagingToken(user);
  const shouldShowPushPrompt =
    permissionState === 'default' && !hidePushPrompt && permissionState !== ('unsupported' as any);

  useEffect(() => {
    if (permissionState === 'granted') setHidePushPrompt(true);
  }, [permissionState, setHidePushPrompt]);

  // Overflow detection in dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return startOverflowMonitoring();
  }, []);

  // ─── Handlers (memoized — delegates to stores) ─────

  const handleNavigate = useCallback(
    (viewKey: string) => {
      navigate(viewKeyToPath[viewKey] || '/');
      closeSidebar();
    },
    [navigate, closeSidebar],
  );

  const handleOpenProject = useCallback(
    (projectId: string) => {
      setTargetProjectId(projectId);
      navigate('/projects');
    },
    [setTargetProjectId, navigate],
  );

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Toast helper — accepts string for component compatibility, casts to NotificationType for persistence
  const handleNotify = useCallback(
    async (
      type: string,
      title: string,
      message: string,
      recipientIds: string[] = [],
      entityId?: string,
      actionUrl?: string,
    ) => {
      showToast({ title, message });
      setTimeout(() => clearToast(), 4000);
      if (recipientIds.length > 0) {
        try {
          await notifyUsers({
            type: type as NotificationType,
            title,
            message,
            recipientIds,
            entityId,
            actionUrl,
            sendPush: false,
            createdBy: user?.id || 'system',
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }
    },
    [showToast, clearToast, user?.id],
  );

  // Audit log helper
  const addAuditLog = useCallback(
    async (action: string, entityType: string, entityId: string | null, description: string) => {
      if (!user) return;
      await adminStore.addAuditLog(user.id, action, entityType, entityId, description);
    },
    [user, adminStore],
  );

  // Task handlers → delegates to store
  const handleAddTask = useCallback(
    async (task: Task) => {
      await taskStore.addTask(task, projects, hrStore.users, user!.id);
    },
    [taskStore, projects, hrStore.users, user],
  );

  const handleUpdateTask = useCallback(
    async (updatedTask: Task) => {
      await taskStore.updateTask(updatedTask, {
        tasks,
        userId: user!.id,
        workflowTemplates,
        qcReviews: qcStore.qcReviews,
        projectMembers: projectStore.projectMembers,
        activeUsers,
        systemRoles,
      });
    },
    [
      taskStore,
      tasks,
      user,
      workflowTemplates,
      qcStore.qcReviews,
      projectStore.projectMembers,
      activeUsers,
      systemRoles,
    ],
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      await taskStore.deleteTask(task, user!.id, checkPermission, showToast, addAuditLog);
    },
    [taskStore, user, checkPermission, showToast, addAuditLog],
  );

  const handleArchiveTask = useCallback(
    async (task: Task) => {
      if (!user) return;
      await archiveTask(task, user.id);
      handleNotify('system', 'Task Archived', `Task "${task.title}" has been archived.`);
    },
    [user, handleNotify],
  );

  // File handlers → delegates to store
  const handleUploadFile = useCallback(
    async (file: AgencyFile) => {
      showToast({ title: 'Uploading...', message: `Uploading ${file.name}...` });
      try {
        const savedFile = await fileStore.uploadFile(file, { projects, clients, activeTasks, folders });
        showToast({ title: 'Success', message: `${file.name} uploaded successfully!` });
        return savedFile;
      } catch (error: any) {
        showToast({ title: 'Upload Failed', message: error.message || 'Failed to upload file.' });
        throw error;
      }
    },
    [showToast, fileStore, projects, clients, activeTasks, folders],
  );

  // Task approval handlers → delegates to store
  const handleAddTaskComment = useCallback(async (c: any) => await taskStore.addComment(c), [taskStore]);
  const handleAddTaskTimeLog = useCallback(async (l: any) => await taskStore.addTimeLog(l), [taskStore]);
  const handleAddTaskDependency = useCallback(async (d: any) => await taskStore.addDependency(d), [taskStore]);
  const handleUpdateApprovalStep = useCallback(async (s: any) => await taskStore.updateApprovalStep(s), [taskStore]);
  const handleAddApprovalSteps = useCallback(async (s: any) => await taskStore.addApprovalSteps(s), [taskStore]);
  const handleUpdateClientApproval = useCallback(
    async (ca: any) => await taskStore.updateClientApproval(ca),
    [taskStore],
  );
  const handleAddClientApproval = useCallback(async (ca: any) => await taskStore.addClientApproval(ca), [taskStore]);

  // Social post handler (used by global TaskDetailView overlay)
  const handleAddSocialPost = useCallback(async (p: any) => await postingStore.addPost(p), [postingStore]);

  // Notification handler (used by Header)
  const handleMarkNotificationRead = useCallback(async (id: string) => await notifStore.markAsRead(id), [notifStore]);

  const handleEnablePushNotifications = useCallback(async () => {
    try {
      await requestPermissionAndRegister();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setHidePushPrompt(true);
    } catch {
      /* swallow */
    }
  }, [requestPermissionAndRegister, setHidePushPrompt]);

  // ─── Global Task Detail helpers (memoized) ───
  const globalSelectedTask = useMemo(
    () => activeTasks.find((t) => t.id === targetTaskId) || null,
    [activeTasks, targetTaskId],
  );

  const globalGetStatusColor = useCallback((s: TaskStatus): string => {
    const colors: Record<string, string> = {
      new: 'bg-white/5 text-slate-100 border-[color:var(--dash-glass-border)]',
      assigned: 'bg-blue-500/10 text-blue-100 border-blue-500/25',
      in_progress: 'bg-indigo-500/10 text-indigo-100 border-indigo-500/25',
      awaiting_review: 'bg-amber-500/10 text-amber-100 border-amber-500/20',
      revisions_required: 'bg-rose-500/10 text-rose-100 border-rose-500/25',
      approved: 'bg-emerald-500/10 text-emerald-100 border-emerald-500/25',
      client_review: 'bg-purple-500/10 text-purple-100 border-purple-500/25',
      client_approved: 'bg-teal-500/10 text-teal-100 border-teal-500/25',
      completed: 'bg-emerald-600/15 text-emerald-100 border-emerald-400/40',
      archived: 'bg-slate-800/60 text-slate-300 border-[color:var(--dash-glass-border)]',
    };
    return colors[s] || colors['new'];
  }, []);

  const globalResolveApprover = useCallback(
    (step: any, task: Task): string | null => {
      if (step.specificUserId) return step.specificUserId;
      if (step.projectRoleKey) {
        const member = projectStore.projectMembers.find(
          (pm: ProjectMember) => pm.projectId === task.projectId && pm.roleInProject === step.projectRoleKey,
        );
        return member ? member.userId : null;
      }
      if (step.roleId) {
        const roleDef = systemRoles.find((r: RoleDefinition) => r.id === step.roleId);
        if (roleDef) {
          const projectUserIds = projectStore.projectMembers
            .filter((pm: ProjectMember) => pm.projectId === task.projectId)
            .map((pm: ProjectMember) => pm.userId);
          const projectApprover = activeUsers.find((u) => u.role === roleDef.name && projectUserIds.includes(u.id));
          if (projectApprover) return projectApprover.id;
          const deptApprover = activeUsers.find((u) => u.role === roleDef.name && u.department === task.department);
          if (deptApprover) return deptApprover.id;
          return activeUsers.find((u) => u.role === roleDef.name)?.id || null;
        }
      }
      return null;
    },
    [projectStore.projectMembers, systemRoles, activeUsers],
  );

  // ─── Loading & Auth Gates ─────────────────
  const showSplash = !splashFinished || loading || brandingLoading;
  if (showSplash) return <SplashScreen onFinish={() => setSplashFinished(true)} minimumDisplayDuration={3000} />;
  if (!user) return <Login />;
  if (user.forcePasswordChange) return <ForcePasswordChange />;

  // ─── RENDER ───────────────────────────────
  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden" onClick={closeSidebar} />
      )}

      <Sidebar
        activeView={activeView}
        setActiveView={handleNavigate}
        currentUserRole={user.role as any}
        isSidebarOpen={isSidebarOpen}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />

      <Header
        currentUser={user}
        notifications={notifications}
        toggleAI={() => setIsAIOpen(true)}
        onLogout={handleLogout}
        onMarkAsRead={handleMarkNotificationRead}
        onViewAllNotifications={() => navigate('/notifications')}
        onToggleSidebar={toggleSidebar}
      />

      <main className="main">
        {/* Dashboard Banner */}
        {dashboardBanner && dashboardBanner.isActive && activeView === 'dashboard' && (
          <div className="dashboard-banner-wrapper">
            {dashboardBanner.linkUrl ? (
              <a
                href={dashboardBanner.linkUrl}
                target={dashboardBanner.linkTarget || '_blank'}
                rel="noopener noreferrer"
                className="block w-full overflow-hidden hover:opacity-95 transition-opacity duration-300"
              >
                {dashboardBanner.fileName?.match(/\.(mp4|webm|mov|avi)$/i) ? (
                  <video src={dashboardBanner.imageUrl} className="w-full h-auto" autoPlay muted loop playsInline />
                ) : (
                  <img src={dashboardBanner.imageUrl} alt="Dashboard Banner" className="w-full h-auto" />
                )}
              </a>
            ) : (
              <div className="w-full overflow-hidden">
                {dashboardBanner.fileName?.match(/\.(mp4|webm|mov|avi)$/i) ? (
                  <video src={dashboardBanner.imageUrl} className="w-full h-auto" autoPlay muted loop playsInline />
                ) : (
                  <img src={dashboardBanner.imageUrl} alt="Dashboard Banner" className="w-full h-auto" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Push notification prompt */}
        {shouldShowPushPrompt && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
            <div className="flex flex-col text-sm text-slate-800">
              <span className="font-semibold">Enable push notifications</span>
              <span className="text-slate-600">Stay in the loop for assignments and announcements.</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEnablePushNotifications}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Allow
              </button>
              <button
                onClick={() => setHidePushPrompt(true)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* ─── Routes ─── */}
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard />
              }
            />
            <Route
              path="/clients"
              element={
                <ClientsHub
                  onOpenProject={handleOpenProject}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <ProjectsHub
                  initialSelectedProjectId={targetProjectId}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <TasksHub
                  initialSelectedTaskId={targetTaskId}
                />
              }
            />
            <Route
              path="/posting"
              element={
                !checkPermission(PERMISSIONS.POSTING.VIEW_DEPT) && !checkPermission(PERMISSIONS.POSTING.VIEW_ALL) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <PostingHub />
                )
              }
            />
            <Route
              path="/calendar"
              element={
                !checkPermission(PERMISSIONS.CALENDAR.VIEW) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <CalendarHub />
                )
              }
            />
            <Route
              path="/creative"
              element={
                !checkPermission(PERMISSIONS.CREATIVE.VIEW) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <CreativeDirectionHub />
                )
              }
            />
            <Route
              path="/quality-control"
              element={
                !checkPermission(PERMISSIONS.QC.VIEW) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <QualityControlHub />
                )
              }
            />
            <Route
              path="/assets"
              element={
                <FilesHub />
              }
            />
            <Route
              path="/production"
              element={
                !checkPermission(PERMISSIONS.PRODUCTION.VIEW) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <ProductionHub />
                )
              }
            />
            <Route
              path="/network"
              element={
                <VendorsHub />
              }
            />
            <Route
              path="/finance"
              element={
                !checkPermission(PERMISSIONS.FINANCE.VIEW_OWN) &&
                !checkPermission(PERMISSIONS.FINANCE.VIEW_PROJECT) &&
                !checkPermission(PERMISSIONS.FINANCE.VIEW_ALL) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <FinanceHub />
                )
              }
            />
            <Route
              path="/hr"
              element={
                <TeamHub />
              }
            />
            <Route
              path="/schedule"
              element={
                <UnifiedCalendar />
              }
            />
            <Route
              path="/analytics"
              element={
                <AnalyticsHub />
              }
            />
            <Route
              path="/notifications"
              element={
                <div className="space-y-6">
                  {canSendNotifications && user && (
                    <Suspense fallback={<RouteFallback />}>
                      <NotificationConsole
                        onEnablePush={requestPermissionAndRegister}
                        permissionState={permissionState}
                        currentToken={messagingToken}
                      />
                    </Suspense>
                  )}
                  <NotificationsHub
                    permissionState={permissionState}
                    onRequestPermission={requestPermissionAndRegister}
                  />
                </div>
              }
            />
            <Route
              path="/admin"
              element={
                !checkPermission(PERMISSIONS.ROLES.VIEW) && !checkPermission(PERMISSIONS.ADMIN_SETTINGS.VIEW) ? (
                  <div className="p-8 text-center text-slate-400">Access Denied.</div>
                ) : (
                  <AdminHub />
                )
              }
            />
            {/* Catch-all */}
            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold">?</span>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-600">Page Not Found</h2>
                  <p className="mt-2">The requested page does not exist.</p>
                </div>
              }
            />
          </Routes>
        </Suspense>

        {/* ─── Global Task Detail Overlay ─── */}
        {globalSelectedTask && user && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setTargetTaskId(null)}
          >
            <div
              className="w-full max-w-[900px] max-h-[85vh] bg-[color:var(--dash-surface-elevated)] rounded-2xl border border-[color:var(--dash-glass-border)] shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/95 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-slate-100">Task Details</h3>
                <button
                  onClick={() => setTargetTaskId(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <TaskDetailView
                  task={globalSelectedTask}
                  project={projects.find((p) => p.id === globalSelectedTask.projectId)}
                  users={activeUsers}
                  comments={taskStore.comments.filter((c) => c.taskId === globalSelectedTask.id)}
                  timeLogs={taskStore.timeLogs.filter((t) => t.taskId === globalSelectedTask.id)}
                  dependencies={taskStore.dependencies.filter((d) => d.taskId === globalSelectedTask.id)}
                  activityLogs={taskStore.activityLogs.filter((l) => l.taskId === globalSelectedTask.id)}
                  taskSteps={taskStore.approvalSteps.filter((s) => s.taskId === globalSelectedTask.id)}
                  clientApproval={taskStore.clientApprovals.find((ca) => ca.taskId === globalSelectedTask.id)}
                  taskFiles={files.filter((f) => f.taskId === globalSelectedTask.id)}
                  allTasks={activeTasks}
                  currentUser={user}
                  workflowTemplates={workflowTemplates}
                  milestones={projectStore.projectMilestones}
                  onUpdateTask={handleUpdateTask}
                  onAddTask={handleAddTask}
                  onAddComment={handleAddTaskComment}
                  onAddTimeLog={handleAddTaskTimeLog}
                  onAddDependency={handleAddTaskDependency}
                  onUpdateApprovalStep={handleUpdateApprovalStep}
                  onAddApprovalSteps={handleAddApprovalSteps}
                  onUpdateClientApproval={handleUpdateClientApproval}
                  onAddClientApproval={handleAddClientApproval}
                  onUploadFile={handleUploadFile}
                  onNotify={handleNotify}
                  onArchiveTask={handleArchiveTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={() => navigate('/tasks')}
                  checkPermission={checkPermission}
                  getStatusColor={globalGetStatusColor}
                  resolveApprover={globalResolveApprover}
                  onAddSocialPost={handleAddSocialPost}
                  leaveRequests={hrStore.leaveRequests}
                />
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white border-l-4 border-indigo-600 shadow-xl rounded-lg p-4 flex items-start space-x-3 max-w-sm">
              <div className="p-1 bg-indigo-50 rounded-full text-indigo-600 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">{toast.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{toast.message}</p>
              </div>
              <button onClick={clearToast} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      <PWAInstallPrompt />
    </div>
  );
};

export default App;
