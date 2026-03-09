/**
 * App.tsx — Layout shell and store orchestrator.
 *
 * Phase 2 rewrite: Reads from Zustand stores instead of 63 useFirestoreCollection hooks.
 * Still passes props to child components (children will be individually migrated in Phase 3).
 * Uses React Router for navigation instead of switch/case on activeView string.
 */
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
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
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from './constants';
import type {
  Task, TaskStatus, ApprovalStep, ProjectMember, RoleDefinition,
  NotificationType, NotificationPreference, AppSettings,
  AgencyFile, User,
} from './types';
import { X, Bell, ChevronRight } from 'lucide-react';
import { doc, setDoc, updateDoc, addDoc, collection, deleteDoc, writeBatch, query, where, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './lib/firebase';

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
  '/': 'dashboard', '/clients': 'clients', '/projects': 'projects',
  '/tasks': 'tasks', '/posting': 'posting', '/calendar': 'calendar',
  '/creative': 'creative', '/quality-control': 'quality-control',
  '/assets': 'assets', '/production': 'production', '/network': 'network',
  '/finance': 'finance', '/hr': 'hr', '/schedule': 'schedule',
  '/analytics': 'analytics', '/notifications': 'notifications', '/admin': 'admin',
};
const viewKeyToPath: Record<string, string> = Object.fromEntries(
  Object.entries(pathToViewKey).map(([k, v]) => [v, k]),
);

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Auth & Branding ─────────────────────
  const { currentUser: user, loading, logout, checkPermission } = useAuth();
  const { branding, loading: brandingLoading } = useBranding();

  // ─── UI Store ─────────────────────────────
  const {
    targetProjectId, targetTaskId, isAIOpen, isSidebarOpen,
    toast, splashFinished, hidePushPrompt,
    setTargetProjectId, setTargetTaskId, setIsAIOpen,
    toggleSidebar, closeSidebar,
    showToast, clearToast, setSplashFinished, setHidePushPrompt,
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
  const activeTasks = useMemo(() => tasks.filter(t => !t.isDeleted), [tasks]);
  const projects = projectStore.projects;
  const clients = clientStore.clients;
  const safeUsers = useMemo(() => Array.isArray(hrStore.users) ? hrStore.users : [], [hrStore.users]);
  const activeUsers = useMemo(() => safeUsers.filter(u => u && u.status !== 'inactive'), [safeUsers]);
  const { files, folders } = fileStore;
  const { invoices, quotations, payments, expenses } = financeStore;
  const { systemRoles, auditLogs, workflowTemplates, departments, dashboardBanners } = adminStore;
  const dashboardBanner = useMemo(() => dashboardBanners.find(b => b.isActive) || null, [dashboardBanners]);
  const [appSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const canSendNotifications = checkPermission(PERMISSIONS.ADMIN_SETTINGS.VIEW);

  const notifications = useMemo(() => {
    if (!user) return [];
    return [...notifStore.allNotifications.filter(n => n.userId === user.id)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifStore.allNotifications, user]);

  // ─── Messaging ────────────────────────────
  const { requestPermissionAndRegister, permissionState, token: messagingToken } = useMessagingToken(user);
  const shouldShowPushPrompt = permissionState === 'default' && !hidePushPrompt && permissionState !== ('unsupported' as any);

  useEffect(() => {
    if (permissionState === 'granted') setHidePushPrompt(true);
  }, [permissionState, setHidePushPrompt]);

  // Overflow detection in dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return startOverflowMonitoring();
  }, []);

  // ─── Loading & Auth Gates ─────────────────
  const showSplash = !splashFinished || loading || brandingLoading;
  if (showSplash) return <SplashScreen onFinish={() => setSplashFinished(true)} minimumDisplayDuration={3000} />;
  if (!user) return <Login />;
  if (user.forcePasswordChange) return <ForcePasswordChange />;

  // ─── Handlers (memoized — delegates to stores) ─────

  const handleNavigate = useCallback((viewKey: string) => {
    navigate(viewKeyToPath[viewKey] || '/');
    closeSidebar();
  }, [navigate, closeSidebar]);

  const handleNavigateToTask = useCallback((taskId: string) => setTargetTaskId(taskId), [setTargetTaskId]);

  const handleOpenProject = useCallback((projectId: string) => {
    setTargetProjectId(projectId);
    navigate('/projects');
  }, [setTargetProjectId, navigate]);

  const handleLogout = useCallback(async () => { await logout(); }, [logout]);

  // Toast helper
  const handleNotify = useCallback(async (type: NotificationType, title: string, message: string, recipientIds: string[] = [], entityId?: string, actionUrl?: string) => {
    showToast({ title, message });
    setTimeout(() => clearToast(), 4000);
    if (recipientIds.length > 0) {
      try {
        await notifyUsers({ type, title, message, recipientIds, entityId, actionUrl, sendPush: false, createdBy: user?.id || 'system' });
      } catch (error) { console.error('Failed to create notification:', error); }
    }
  }, [showToast, clearToast, user?.id]);

  // Audit log helper
  const addAuditLog = useCallback(async (action: string, entityType: string, entityId: string | null, description: string) => {
    if (!user) return;
    await adminStore.addAuditLog(user.id, action, entityType, entityId, description);
  }, [user, adminStore]);

  // Task handlers → delegates to store
  const handleAddTask = useCallback(async (task: Task) => {
    await taskStore.addTask(task, projects, hrStore.users, user!.id);
  }, [taskStore, projects, hrStore.users, user]);

  const handleUpdateTask = useCallback(async (updatedTask: Task) => {
    await taskStore.updateTask(updatedTask, {
      tasks, userId: user!.id, workflowTemplates,
      qcReviews: qcStore.qcReviews,
      projectMembers: projectStore.projectMembers,
      activeUsers, systemRoles,
    });
  }, [taskStore, tasks, user, workflowTemplates, qcStore.qcReviews, projectStore.projectMembers, activeUsers, systemRoles]);

  const handleDeleteTask = useCallback(async (task: Task) => {
    await taskStore.deleteTask(task, user!.id, checkPermission, showToast, addAuditLog);
  }, [taskStore, user, checkPermission, showToast, addAuditLog]);

  const handleArchiveTask = useCallback(async (task: Task) => {
    if (!user) return;
    await archiveTask(task, user.id);
    handleNotify('system', 'Task Archived', `Task "${task.title}" has been archived.`);
  }, [user, handleNotify]);

  // File handlers → delegates to store
  const handleUploadFile = useCallback(async (file: AgencyFile) => {
    showToast({ title: 'Uploading...', message: `Uploading ${file.name}...` });
    try {
      const savedFile = await fileStore.uploadFile(file, { projects, clients, activeTasks, folders });
      showToast({ title: 'Success', message: `${file.name} uploaded successfully!` });
      return savedFile;
    } catch (error: any) {
      showToast({ title: 'Upload Failed', message: error.message || 'Failed to upload file.' });
      throw error;
    }
  }, [showToast, fileStore, projects, clients, activeTasks, folders]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      await fileStore.deleteFile(fileId, { userId: user!.id });
      handleNotify('system', 'File Deleted', 'File has been deleted.');
    } catch (error) {
      showToast({ title: 'Delete Failed', message: 'Failed to delete file.' });
    }
  }, [fileStore, user, handleNotify, showToast]);

  const handleCreateFolder = useCallback(async (folder: any) => await fileStore.createFolder(folder), [fileStore]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) { showToast({ title: 'Error', message: 'Folder not found.' }); return; }
    const hasSubfolders = folders.some(f => f.parentId === folderId);
    const folderFiles = files.filter(f => f.folderId === folderId);
    let confirmMessage = `Are you sure you want to delete the folder "${folder.name}"?\n\n`;
    if (hasSubfolders || folderFiles.length > 0) {
      confirmMessage += '⚠️ Warning: This folder contains:\n';
      if (hasSubfolders) confirmMessage += '• Subfolders\n';
      if (folderFiles.length > 0) confirmMessage += `• ${folderFiles.length} file(s)\n`;
      confirmMessage += '\nAll contents will be permanently deleted!\n\n';
    }
    confirmMessage += 'This action CANNOT be undone.';
    if (!window.confirm(confirmMessage)) return;
    try {
      await fileStore.deleteFolder(folderId);
      addAuditLog('delete', 'Folder', folderId, `Deleted folder "${folder.name}"`);
      showToast({ title: 'Success', message: `Folder "${folder.name}" deleted successfully.` });
    } catch {
      showToast({ title: 'Error', message: 'Failed to delete folder.' });
    }
  }, [folders, files, fileStore, showToast, addAuditLog]);

  // Project handlers → delegates to store
  const handleAddProject = useCallback(async (p: any) => await projectStore.addProject(p, user!, clients), [projectStore, user, clients]);
  const handleUpdateProject = useCallback(async (p: any) => await projectStore.updateProject(p, user!.id), [projectStore, user]);
  const handleDeleteProject = useCallback(async (id: string) => {
    await projectStore.deleteProject(id, showToast, addAuditLog);
  }, [projectStore, showToast, addAuditLog]);
  const handleAddProjectMember = useCallback(async (m: any) => await projectStore.addMember(m, user!), [projectStore, user]);
  const handleRemoveProjectMember = useCallback(async (id: string) => await deleteDoc(doc(db, 'project_members', id)), []);
  const handleAddProjectMilestone = useCallback(async (m: any) => await projectStore.addMilestone(m, user!.id), [projectStore, user]);
  const handleUpdateProjectMilestone = useCallback(async (m: any) => await projectStore.updateMilestone(m, user!.id), [projectStore, user]);
  const handleAddMilestone = useCallback(async (m: any) => await projectStore.addDynamicMilestone(m), [projectStore]);
  const handleUpdateMilestone = useCallback(async (m: any) => await projectStore.updateDynamicMilestone(m), [projectStore]);
  const handleAddProjectMarketingAsset = useCallback(async (a: any) => { await projectStore.addMarketingAsset(a); handleNotify('system', 'Marketing Asset Added', `Added ${a.name} to project strategy.`); }, [projectStore, handleNotify]);
  const handleUpdateProjectMarketingAsset = useCallback(async (a: any) => await projectStore.updateMarketingAsset(a), [projectStore]);
  const handleDeleteProjectMarketingAsset = useCallback(async (id: string) => await projectStore.deleteMarketingAsset(id), [projectStore]);
  const handleArchiveProject = useCallback(async (id: string) => {
    await projectStore.archiveProject(id, user!.id, projects, folders, files, checkPermission, showToast);
  }, [projectStore, user, projects, folders, files, checkPermission, showToast]);
  const handleUnarchiveProject = useCallback(async (id: string) => {
    await projectStore.unarchiveProject(id, user!.id, projects, folders, files, checkPermission, showToast);
  }, [projectStore, user, projects, folders, files, checkPermission, showToast]);

  // Client handlers → delegates to store
  const handleAddClient = useCallback(async (c: any) => { await clientStore.addClient(c, (type, title, msg) => handleNotify(type as any, title, msg)); }, [clientStore, handleNotify]);
  const handleUpdateClient = useCallback(async (c: any) => await clientStore.updateClient(c), [clientStore]);
  const handleDeleteClient = useCallback(async (id: string) => await clientStore.deleteClient(id, folders, user!.id, addAuditLog, showToast), [clientStore, folders, user, addAuditLog, showToast]);
  const handleAddSocialLink = useCallback(async (l: any) => await clientStore.addSocialLink(l), [clientStore]);
  const handleUpdateSocialLink = useCallback(async (l: any) => await clientStore.updateSocialLink(l), [clientStore]);
  const handleDeleteSocialLink = useCallback(async (id: string) => await clientStore.deleteSocialLink(id), [clientStore]);
  const handleAddClientNote = useCallback(async (n: any) => await clientStore.addNote(n), [clientStore]);
  const handleUpdateClientNote = useCallback(async (n: any) => await clientStore.updateNote(n), [clientStore]);
  const handleDeleteClientNote = useCallback(async (id: string) => await clientStore.deleteNote(id), [clientStore]);
  const handleAddClientMeeting = useCallback(async (m: any) => { await clientStore.addMeeting(m, folders); handleNotify('system' as any, 'Meeting Scheduled', `Meeting "${m.title}" has been scheduled.`); }, [clientStore, folders, handleNotify]);
  const handleUpdateClientMeeting = useCallback(async (m: any) => await clientStore.updateMeeting(m), [clientStore]);
  const handleDeleteClientMeeting = useCallback(async (id: string) => await clientStore.deleteMeeting(id), [clientStore]);
  const handleAddBrandAsset = useCallback(async (a: any) => await clientStore.addBrandAsset(a), [clientStore]);
  const handleUpdateBrandAsset = useCallback(async (a: any) => await clientStore.updateBrandAsset(a), [clientStore]);
  const handleDeleteBrandAsset = useCallback(async (id: string) => await clientStore.deleteBrandAsset(id), [clientStore]);
  const handleAddMonthlyReport = useCallback(async (r: any) => await clientStore.addMonthlyReport(r), [clientStore]);
  const handleUpdateMonthlyReport = useCallback(async (r: any) => await clientStore.updateMonthlyReport(r), [clientStore]);
  const handleDeleteMonthlyReport = useCallback(async (id: string) => await clientStore.deleteMonthlyReport(id), [clientStore]);

  // Finance handlers
  const handleAddInvoice = useCallback(async (inv: any) => await financeStore.addInvoice(inv), [financeStore]);
  const handleUpdateInvoice = useCallback(async (inv: any) => await financeStore.updateInvoice(inv), [financeStore]);
  const handleAddQuotation = useCallback(async (q: any) => await financeStore.addQuotation(q), [financeStore]);
  const handleUpdateQuotation = useCallback(async (q: any) => await financeStore.updateQuotation(q), [financeStore]);
  const handleAddPayment = useCallback(async (p: any) => { await financeStore.addPayment(p); handleNotify('PAYMENT_RECORDED', 'Payment Received', `Payment of $${p.amount} recorded.`); }, [financeStore, handleNotify]);
  const handleAddExpense = useCallback(async (e: any) => await financeStore.addExpense(e, handleUpdateProject, projects), [financeStore, handleUpdateProject, projects]);

  // HR handlers
  const handleAddUser = useCallback(async (u: User) => await hrStore.addUser(u, addAuditLog), [hrStore, addAuditLog]);
  const handleUpdateUser = useCallback(async (u: User) => await hrStore.updateUser(u, addAuditLog), [hrStore, addAuditLog]);
  const handleCreateEmployeeProfile = useCallback(async (p: any) => await hrStore.createEmployeeProfile(p, addAuditLog), [hrStore, addAuditLog]);
  const handleUpdateEmployeeProfile = useCallback(async (p: any) => await hrStore.updateEmployeeProfile(p, user!.id, addAuditLog), [hrStore, user, addAuditLog]);
  const handleAddLeaveRequest = useCallback(async (r: any) => await hrStore.addLeaveRequest(r, addAuditLog, handleNotify), [hrStore, addAuditLog, handleNotify]);
  const handleApproveLeaveRequest = useCallback(async (r: any) => await hrStore.approveLeaveRequest(r, user!.id, addAuditLog, handleNotify), [hrStore, user, addAuditLog, handleNotify]);
  const handleRejectLeaveRequest = useCallback(async (r: any, reason: string) => await hrStore.rejectLeaveRequest(r, reason, user!.id, addAuditLog, handleNotify), [hrStore, user, addAuditLog, handleNotify]);
  const handleCancelLeaveRequest = useCallback(async (r: any) => await hrStore.cancelLeaveRequest(r, user!.id, addAuditLog), [hrStore, user, addAuditLog]);
  const handleUpdateLeaveRequest = useCallback(async (r: any) => await hrStore.updateLeaveRequest(r), [hrStore]);
  const handleDeleteLeaveRequest = useCallback(async (id: string) => await hrStore.deleteLeaveRequest(id, addAuditLog), [hrStore, addAuditLog]);
  const handleCheckIn = useCallback(async () => { const msg = await hrStore.checkIn(user!.id, user!.name, addAuditLog); if (msg) handleNotify('system', 'Info', msg); else handleNotify('system', 'Checked In', `Clock-in recorded at ${new Date().toLocaleTimeString()}.`); }, [hrStore, user, addAuditLog, handleNotify]);
  const handleCheckOut = useCallback(async () => { const msg = await hrStore.checkOut(user!.id, user!.name, addAuditLog); if (msg) handleNotify('system', 'Info', msg); else handleNotify('system', 'Checked Out', 'Clock-out recorded.'); }, [hrStore, user, addAuditLog, handleNotify]);
  const handleSubmitAttendanceCorrection = useCallback(async (c: any) => await hrStore.submitAttendanceCorrection(c, addAuditLog), [hrStore, addAuditLog]);
  const handleApproveAttendanceCorrection = useCallback(async (id: string) => await hrStore.approveAttendanceCorrection(id, user!.id, user!.name, addAuditLog, handleNotify), [hrStore, user, addAuditLog, handleNotify]);
  const handleStartOnboarding = useCallback(async (c: any) => await hrStore.startOnboarding(c, addAuditLog, handleNotify), [hrStore, addAuditLog, handleNotify]);
  const handleCompleteOnboardingStep = useCallback(async (cId: string, sId: string) => await hrStore.completeOnboardingStep(cId, sId, user!.id, addAuditLog), [hrStore, user, addAuditLog]);
  const handleStartOffboarding = useCallback(async (c: any) => await hrStore.startOffboarding(c, user!.id, addAuditLog, handleNotify), [hrStore, user, addAuditLog, handleNotify]);
  const handleAssignEmployeeAsset = useCallback(async (a: any) => await hrStore.assignEmployeeAsset(a, addAuditLog, handleNotify), [hrStore, addAuditLog, handleNotify]);
  const handleReturnEmployeeAsset = useCallback(async (id: string) => await hrStore.returnEmployeeAsset(id, addAuditLog), [hrStore, addAuditLog]);
  const handleCreatePerformanceReview = useCallback(async (r: any) => await hrStore.createPerformanceReview(r, addAuditLog), [hrStore, addAuditLog]);
  const handleSubmitPerformanceReview = useCallback(async (id: string) => await hrStore.submitPerformanceReview(id, addAuditLog, handleNotify), [hrStore, addAuditLog, handleNotify]);
  const handleFinalizePerformanceReview = useCallback(async (id: string) => await hrStore.finalizePerformanceReview(id, addAuditLog, handleNotify), [hrStore, addAuditLog, handleNotify]);
  const handleUpdatePerformanceReview = useCallback(async (r: any) => await hrStore.updatePerformanceReview(r), [hrStore]);

  // Network handlers
  const handleAddVendor = useCallback(async (v: any) => await networkStore.addVendor(v), [networkStore]);
  const handleUpdateVendor = useCallback(async (v: any) => await networkStore.updateVendor(v), [networkStore]);
  const handleAddFreelancer = useCallback(async (f: any) => await networkStore.addFreelancer(f), [networkStore]);
  const handleUpdateFreelancer = useCallback(async (f: any) => await networkStore.updateFreelancer(f), [networkStore]);
  const handleAddFreelancerAssignment = useCallback(async (a: any) => await networkStore.addFreelancerAssignment(a), [networkStore]);
  const handleRemoveFreelancerAssignment = useCallback(async (id: string) => await networkStore.removeFreelancerAssignment(id), [networkStore]);

  // Production handlers
  const handleAddShotList = useCallback(async (sl: any) => await productionStore.addShotList(sl), [productionStore]);
  const handleAddCallSheet = useCallback(async (cs: any) => { await productionStore.addCallSheet(cs); handleNotify('production_update', 'Call Sheet Published', `Call sheet for ${cs.date} is now available.`); }, [productionStore, handleNotify]);
  const handleAddLocation = useCallback(async (loc: any) => await productionStore.addLocation(loc), [productionStore]);
  const handleAddEquipment = useCallback(async (eq: any) => await productionStore.addEquipment(eq), [productionStore]);
  const handleUpdateEquipment = useCallback(async (eq: any) => await productionStore.updateEquipment(eq), [productionStore]);

  // Social/Posting handlers
  const handleAddSocialPost = useCallback(async (p: any) => await postingStore.addPost(p), [postingStore]);
  const handleUpdateSocialPost = useCallback(async (p: any) => { await postingStore.updatePost(p); handleNotify('system', 'Post Updated', `Social post "${p.title}" updated.`); }, [postingStore, handleNotify]);

  // Notification handlers
  const handleMarkNotificationRead = useCallback(async (id: string) => await notifStore.markAsRead(id), [notifStore]);
  const handleMarkAllNotificationsRead = useCallback(async () => { if (user) await notifStore.markAllAsRead(user.id); }, [notifStore, user]);
  const handleDeleteNotification = useCallback(async (id: string) => await notifStore.deleteNotification(id), [notifStore]);
  const handleUpdatePreferences = useCallback(async (p: NotificationPreference) => { await notifStore.updatePreferences(p); }, [notifStore]);
  const handleManualNotificationSend = useCallback(async (payload: any) => {
    const result = await notifStore.sendManualNotification(payload, activeUsers, projectStore.projectMembers, user?.id || 'system');
    showToast({ title: 'Notification queued', message: `Sent to ${result.recipientCount} recipient(s).` });
  }, [notifStore, activeUsers, projectStore.projectMembers, user?.id, showToast]);

  // Admin handlers
  const handleUpdateRole = useCallback(async (r: any) => { await adminStore.updateRole(r, user!.id); }, [adminStore, user]);
  const handleAddRole = useCallback(async (r: any) => { await adminStore.addRole(r, user!.id); }, [adminStore, user]);
  const handleDeleteRole = useCallback(async (id: string) => { await adminStore.deleteRole(id, user!.id); }, [adminStore, user]);
  const handleSyncRoles = useCallback(async () => { await adminStore.syncRoles(); showToast({ title: 'Success', message: 'System roles synchronized.' }); }, [adminStore, showToast]);
  const handleUpdateWorkflow = useCallback(async (wf: any) => { await adminStore.updateWorkflow(wf); showToast({ title: 'Success', message: 'Workflow updated.' }); }, [adminStore, showToast]);
  const handleAddWorkflow = useCallback(async (wf: any) => { await adminStore.addWorkflow(wf); showToast({ title: 'Success', message: 'Workflow created.' }); }, [adminStore, showToast]);
  const handleDeleteWorkflow = useCallback(async (id: string) => { await adminStore.deleteWorkflow(id); showToast({ title: 'Success', message: 'Workflow deleted.' }); }, [adminStore, showToast]);
  const handleAddDepartment = useCallback(async (d: any) => { await adminStore.addDepartment(d, user!.id); showToast({ title: 'Success', message: `Department "${d.name}" created.` }); }, [adminStore, user, showToast]);
  const handleUpdateDepartment = useCallback(async (d: any) => { await adminStore.updateDepartment(d, user!.id); showToast({ title: 'Success', message: `Department "${d.name}" updated.` }); }, [adminStore, user, showToast]);
  const handleDeleteDepartment = useCallback(async (id: string) => { await adminStore.deleteDepartment(id, user!.id); showToast({ title: 'Success', message: 'Department deleted.' }); }, [adminStore, user, showToast]);
  const handleSaveBanner = useCallback(async (b: any) => { await adminStore.saveBanner(b, user!.id); showToast({ title: 'Success', message: 'Banner saved.' }); }, [adminStore, user, showToast]);
  const handleDeleteBanner = useCallback(async () => { await adminStore.deleteBanner(user!.id); showToast({ title: 'Success', message: 'Banner deleted.' }); }, [adminStore, user, showToast]);

  // Notes handlers
  const handleAddNote = useCallback(async (n: any) => { await notesStore.addNote(n); showToast({ title: 'Note Created', message: 'Note added successfully.' }); }, [notesStore, showToast]);
  const handleUpdateNote = useCallback(async (n: any) => { await notesStore.updateNote(n); showToast({ title: 'Note Updated', message: 'Note updated successfully.' }); }, [notesStore, showToast]);
  const handleDeleteNote = useCallback(async (id: string) => { await notesStore.deleteNote(id); showToast({ title: 'Note Deleted', message: 'Note deleted.' }); }, [notesStore, showToast]);

  // Task approval handlers → delegates to store
  const handleAddTaskComment = useCallback(async (c: any) => await taskStore.addComment(c), [taskStore]);
  const handleAddTaskTimeLog = useCallback(async (l: any) => await taskStore.addTimeLog(l), [taskStore]);
  const handleAddTaskDependency = useCallback(async (d: any) => await taskStore.addDependency(d), [taskStore]);
  const handleUpdateApprovalStep = useCallback(async (s: any) => await taskStore.updateApprovalStep(s), [taskStore]);
  const handleAddApprovalSteps = useCallback(async (s: any) => await taskStore.addApprovalSteps(s), [taskStore]);
  const handleUpdateClientApproval = useCallback(async (ca: any) => await taskStore.updateClientApproval(ca), [taskStore]);
  const handleAddClientApproval = useCallback(async (ca: any) => await taskStore.addClientApproval(ca), [taskStore]);

  const handleEnablePushNotifications = useCallback(async () => {
    try {
      await requestPermissionAndRegister();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setHidePushPrompt(true);
    } catch { /* swallow */ }
  }, [requestPermissionAndRegister, setHidePushPrompt]);

  // ─── Permission-filtered data (memoized) ───
  const getVisibleTasks = useCallback(() => {
    if (checkPermission(PERMISSIONS.TASKS.VIEW_ALL)) return activeTasks;
    return activeTasks.filter(t => {
      const assignees = t.assigneeIds;
      const isAssigned = Array.isArray(assignees) && assignees.includes(user?.id || '');
      return isAssigned || t.createdBy === user?.id;
    });
  }, [checkPermission, activeTasks, user?.id]);

  const getVisibleProjects = useCallback(() => {
    if (checkPermission(PERMISSIONS.PROJECTS.VIEW_ALL)) return projects;
    return projects.filter(p =>
      projectStore.projectMembers.some(m => m.projectId === p.id && m.userId === user?.id) ||
      p.accountManagerId === user?.id || p.projectManagerId === user?.id ||
      activeTasks.some(t => t.projectId === p.id && t.assigneeIds?.includes(user?.id || ''))
    );
  }, [checkPermission, projects, projectStore.projectMembers, user?.id, activeTasks]);

  // ─── Global Task Detail helpers (memoized) ───
  const globalSelectedTask = useMemo(() => activeTasks.find(t => t.id === targetTaskId) || null, [activeTasks, targetTaskId]);

  const globalGetStatusColor = useCallback((s: TaskStatus): string => {
    const colors: Record<string, string> = {
      'new': 'bg-white/5 text-slate-100 border-[color:var(--dash-glass-border)]',
      'assigned': 'bg-blue-500/10 text-blue-100 border-blue-500/25',
      'in_progress': 'bg-indigo-500/10 text-indigo-100 border-indigo-500/25',
      'awaiting_review': 'bg-amber-500/10 text-amber-100 border-amber-500/20',
      'revisions_required': 'bg-rose-500/10 text-rose-100 border-rose-500/25',
      'approved': 'bg-emerald-500/10 text-emerald-100 border-emerald-500/25',
      'client_review': 'bg-purple-500/10 text-purple-100 border-purple-500/25',
      'client_approved': 'bg-teal-500/10 text-teal-100 border-teal-500/25',
      'completed': 'bg-emerald-600/15 text-emerald-100 border-emerald-400/40',
      'archived': 'bg-slate-800/60 text-slate-300 border-[color:var(--dash-glass-border)]',
    };
    return colors[s] || colors['new'];
  }, []);

  const globalResolveApprover = useCallback((step: any, task: Task): string | null => {
    if (step.specificUserId) return step.specificUserId;
    if (step.projectRoleKey) {
      const member = projectStore.projectMembers.find((pm: ProjectMember) => pm.projectId === task.projectId && pm.roleInProject === step.projectRoleKey);
      return member ? member.userId : null;
    }
    if (step.roleId) {
      const roleDef = systemRoles.find((r: RoleDefinition) => r.id === step.roleId);
      if (roleDef) {
        const projectUserIds = projectStore.projectMembers.filter((pm: ProjectMember) => pm.projectId === task.projectId).map((pm: ProjectMember) => pm.userId);
        const projectApprover = activeUsers.find(u => u.role === roleDef.name && projectUserIds.includes(u.id));
        if (projectApprover) return projectApprover.id;
        const deptApprover = activeUsers.find(u => u.role === roleDef.name && u.department === task.department);
        if (deptApprover) return deptApprover.id;
        return activeUsers.find(u => u.role === roleDef.name)?.id || null;
      }
    }
    return null;
  }, [projectStore.projectMembers, systemRoles, activeUsers]);

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
              <a href={dashboardBanner.linkUrl} target={dashboardBanner.linkTarget || '_blank'} rel="noopener noreferrer" className="block w-full overflow-hidden hover:opacity-95 transition-opacity duration-300">
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
              <button onClick={handleEnablePushNotifications} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700">Allow</button>
              <button onClick={() => setHidePushPrompt(true)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Later</button>
            </div>
          </div>
        )}

        {/* ─── Routes ─── */}
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={
              <Dashboard tasks={getVisibleTasks()} projects={getVisibleProjects()} users={activeUsers} clients={clients}
                socialPosts={postingStore.socialPosts} timeLogs={taskStore.timeLogs} currentUser={user}
                meetings={clientStore.meetings} notes={notesStore.notes} milestones={projectStore.projectMilestones}
                dynamicMilestones={projectStore.dynamicMilestones} approvalSteps={taskStore.approvalSteps}
                onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote}
                onNavigateToTask={handleNavigateToTask} onNavigateToMeeting={() => navigate('/clients')}
                onNavigateToPost={() => navigate('/posting')} onViewAllTasks={() => navigate('/tasks')}
                onViewAllApprovals={() => navigate('/tasks')} onNavigateToUserTasks={() => navigate('/tasks')}
                onNavigateToClient={() => navigate('/clients')} onScheduleMeeting={() => navigate('/clients')}
                onNavigateToCalendar={() => navigate('/calendar')}
              />
            } />
            <Route path="/clients" element={
              <ClientsHub clients={clients} projects={getVisibleProjects()} tasks={activeTasks}
                milestones={projectStore.projectMilestones} invoices={invoices} socialLinks={clientStore.socialLinks}
                notes={clientStore.notes} meetings={clientStore.meetings} brandAssets={clientStore.brandAssets}
                monthlyReports={clientStore.monthlyReports} files={files} folders={folders} users={activeUsers}
                accountManagers={activeUsers.filter(u => u.department === 'Accounts' || u.department === 'Management')}
                onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient}
                onArchiveProject={handleArchiveProject} onUnarchiveProject={handleUnarchiveProject}
                onOpenProject={handleOpenProject}
                onAddSocialLink={handleAddSocialLink} onUpdateSocialLink={handleUpdateSocialLink} onDeleteSocialLink={handleDeleteSocialLink}
                onAddNote={handleAddClientNote} onUpdateNote={handleUpdateClientNote} onDeleteNote={handleDeleteClientNote}
                onAddMeeting={handleAddClientMeeting} onUpdateMeeting={handleUpdateClientMeeting} onDeleteMeeting={handleDeleteClientMeeting}
                onAddBrandAsset={handleAddBrandAsset} onUpdateBrandAsset={handleUpdateBrandAsset} onDeleteBrandAsset={handleDeleteBrandAsset}
                onAddMonthlyReport={handleAddMonthlyReport} onUpdateMonthlyReport={handleUpdateMonthlyReport} onDeleteMonthlyReport={handleDeleteMonthlyReport}
                onUploadFile={handleUploadFile as any} checkPermission={checkPermission} currentUser={user}
              />
            } />
            <Route path="/projects" element={
              <ProjectsHub projects={getVisibleProjects()} clients={clients} users={activeUsers}
                members={projectStore.projectMembers} milestones={projectStore.projectMilestones}
                activityLogs={projectStore.activityLogs} marketingAssets={projectStore.marketingAssets}
                files={files} folders={folders} freelancers={networkStore.freelancers} assignments={networkStore.assignments}
                tasks={activeTasks} approvalSteps={taskStore.approvalSteps}
                onAddProject={handleAddProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject}
                onAddMember={handleAddProjectMember} onAddFreelancerAssignment={handleAddFreelancerAssignment}
                onRemoveMember={handleRemoveProjectMember} onRemoveFreelancerAssignment={handleRemoveFreelancerAssignment}
                onAddMilestone={handleAddProjectMilestone} onUpdateMilestone={handleUpdateProjectMilestone}
                onAddMarketingAsset={handleAddProjectMarketingAsset} onUpdateMarketingAsset={handleUpdateProjectMarketingAsset}
                onDeleteMarketingAsset={handleDeleteProjectMarketingAsset}
                onUploadFile={handleUploadFile as any} onDeleteFile={handleDeleteFile} onCreateFolder={handleCreateFolder}
                initialSelectedProjectId={targetProjectId} checkPermission={checkPermission}
                onNavigateToTask={handleNavigateToTask}
                workflowTemplates={workflowTemplates} calendarMonths={calendarStore.calendarMonths}
                calendarItems={calendarStore.calendarItems} dynamicMilestones={projectStore.dynamicMilestones}
                onAddDynamicMilestone={handleAddMilestone} onUpdateDynamicMilestone={handleUpdateMilestone}
                onAddTask={handleAddTask} onAddApprovalSteps={handleAddApprovalSteps}
              />
            } />
            <Route path="/tasks" element={
              <TasksHub tasks={getVisibleTasks()} projects={getVisibleProjects()} users={activeUsers}
                comments={taskStore.comments} timeLogs={taskStore.timeLogs} dependencies={taskStore.dependencies}
                activityLogs={taskStore.activityLogs} approvalSteps={taskStore.approvalSteps}
                clientApprovals={taskStore.clientApprovals} files={files} milestones={projectStore.projectMilestones}
                currentUser={user} workflowTemplates={workflowTemplates} projectMembers={projectStore.projectMembers}
                roles={systemRoles}
                onAddTask={handleAddTask} onUpdateTask={handleUpdateTask}
                onAddComment={handleAddTaskComment} onAddTimeLog={handleAddTaskTimeLog}
                onAddDependency={handleAddTaskDependency} onUpdateApprovalStep={handleUpdateApprovalStep}
                onAddApprovalSteps={handleAddApprovalSteps} onUpdateClientApproval={handleUpdateClientApproval}
                onAddClientApproval={handleAddClientApproval} onUploadFile={handleUploadFile}
                onNotify={handleNotify} checkPermission={checkPermission} onDeleteTask={handleDeleteTask}
                initialSelectedTaskId={targetTaskId} onAddSocialPost={handleAddSocialPost}
                leaveRequests={hrStore.leaveRequests}
              />
            } />
            <Route path="/posting" element={
              !checkPermission(PERMISSIONS.POSTING.VIEW_DEPT) && !checkPermission(PERMISSIONS.POSTING.VIEW_ALL)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <PostingHub socialPosts={postingStore.socialPosts} tasks={activeTasks} projects={projects} clients={clients}
                    users={activeUsers} currentUser={user} checkPermission={checkPermission}
                    onUpdatePost={handleUpdateSocialPost} onArchiveTask={handleArchiveTask}
                    onNotify={handleNotify} files={files} comments={taskStore.comments}
                  />
            } />
            <Route path="/calendar" element={
              !checkPermission(PERMISSIONS.CALENDAR.VIEW)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <CalendarHub clients={clients} calendarMonths={calendarStore.calendarMonths}
                    calendarItems={calendarStore.calendarItems} calendarItemRevisions={calendarStore.calendarItemRevisions}
                    creativeProjects={creativeStore.creativeProjects} creativeCalendars={creativeStore.creativeCalendars}
                    creativeCalendarItems={creativeStore.creativeCalendarItems}
                    users={activeUsers} currentUser={user} checkPermission={checkPermission} onNotify={handleNotify}
                  />
            } />
            <Route path="/creative" element={
              !checkPermission(PERMISSIONS.CREATIVE.VIEW)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <CreativeDirectionHub creativeProjects={creativeStore.creativeProjects}
                    creativeCalendars={creativeStore.creativeCalendars} creativeCalendarItems={creativeStore.creativeCalendarItems}
                    clients={clients} users={activeUsers} calendarMonths={calendarStore.calendarMonths}
                    calendarItems={calendarStore.calendarItems} calendarItemRevisions={calendarStore.calendarItemRevisions}
                    files={files} currentUser={user} checkPermission={checkPermission}
                    onNotify={handleNotify} onUploadFile={handleUploadFile as any}
                  />
            } />
            <Route path="/quality-control" element={
              !checkPermission(PERMISSIONS.QC.VIEW)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <QualityControlHub tasks={activeTasks} qcReviews={qcStore.qcReviews} users={activeUsers}
                    projects={projects} clients={clients} projectMembers={projectStore.projectMembers}
                    workflowTemplates={workflowTemplates} approvalSteps={taskStore.approvalSteps}
                    taskComments={taskStore.comments} files={files} currentUser={{ ...user, email: user.email || null, displayName: user.name } as any}
                    checkPermission={checkPermission} onUpdateTask={handleUpdateTask}
                    onNotify={handleNotify} onUploadFile={handleUploadFile as any}
                  />
            } />
            <Route path="/assets" element={
              <FilesHub files={files} folders={folders} projects={getVisibleProjects()} clients={clients} users={activeUsers}
                onUpload={handleUploadFile} onDelete={handleDeleteFile} onMove={() => {}}
                onCreateFolder={handleCreateFolder} onDeleteFolder={handleDeleteFolder}
              />
            } />
            <Route path="/production" element={
              !checkPermission(PERMISSIONS.PRODUCTION.VIEW)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <ProductionHub assets={productionStore.productionAssets} shotLists={productionStore.shotLists}
                    callSheets={productionStore.callSheets} locations={productionStore.locations}
                    equipment={productionStore.equipment} projects={getVisibleProjects()} users={activeUsers}
                    clients={clients} leaveRequests={hrStore.leaveRequests} currentUserId={user.id}
                    onAddShotList={handleAddShotList} onAddCallSheet={handleAddCallSheet}
                    onAddLocation={handleAddLocation} onAddEquipment={handleAddEquipment}
                    onUpdateEquipment={handleUpdateEquipment} projectMembers={projectStore.projectMembers}
                    tasks={getVisibleTasks()} calendarItems={calendarStore.calendarItems}
                    comments={taskStore.comments} timeLogs={taskStore.timeLogs} dependencies={taskStore.dependencies}
                    activityLogs={taskStore.activityLogs} approvalSteps={taskStore.approvalSteps}
                    clientApprovals={taskStore.clientApprovals} files={files} milestones={projectStore.projectMilestones}
                    workflowTemplates={workflowTemplates} roles={systemRoles} currentUser={user}
                    onUpdateTask={handleUpdateTask} onAddTask={handleAddTask}
                    onAddComment={handleAddTaskComment} onAddTimeLog={handleAddTaskTimeLog}
                    onAddDependency={handleAddTaskDependency} onUpdateApprovalStep={handleUpdateApprovalStep}
                    onAddApprovalSteps={handleAddApprovalSteps} onUpdateClientApproval={handleUpdateClientApproval}
                    onAddClientApproval={handleAddClientApproval} onUploadFile={handleUploadFile as any}
                    checkPermission={checkPermission} onNotify={handleNotify}
                    onArchiveTask={handleArchiveTask} onDeleteTask={handleDeleteTask}
                    onAddSocialPost={handleAddSocialPost}
                  />
            } />
            <Route path="/network" element={
              <VendorsHub vendors={networkStore.vendors} freelancers={networkStore.freelancers}
                assignments={networkStore.assignments} serviceOrders={networkStore.serviceOrders}
                onAddVendor={handleAddVendor} onUpdateVendor={handleUpdateVendor}
                onAddFreelancer={handleAddFreelancer} onUpdateFreelancer={handleUpdateFreelancer}
              />
            } />
            <Route path="/finance" element={
              !checkPermission(PERMISSIONS.FINANCE.VIEW_OWN) && !checkPermission(PERMISSIONS.FINANCE.VIEW_PROJECT) && !checkPermission(PERMISSIONS.FINANCE.VIEW_ALL)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <FinanceHub invoices={invoices} quotations={quotations} payments={payments} expenses={expenses}
                    projects={projects} clients={clients}
                    onAddInvoice={handleAddInvoice} onUpdateInvoice={handleUpdateInvoice}
                    onAddQuotation={handleAddQuotation} onUpdateQuotation={handleUpdateQuotation}
                    onAddPayment={handleAddPayment} onAddExpense={handleAddExpense}
                  />
            } />
            <Route path="/hr" element={
              <TeamHub users={activeUsers} tasks={tasks} leaveRequests={hrStore.leaveRequests}
                attendanceRecords={hrStore.attendanceRecords} roles={systemRoles} departments={departments}
                projects={projects} checkPermission={checkPermission} currentUser={user}
                onAddUser={handleAddUser} onUpdateUser={handleUpdateUser}
                onAddLeaveRequest={handleAddLeaveRequest} onUpdateLeaveRequest={handleUpdateLeaveRequest}
                onDeleteLeaveRequest={handleDeleteLeaveRequest} onApproveLeaveRequest={handleApproveLeaveRequest}
                onRejectLeaveRequest={handleRejectLeaveRequest} onCancelLeaveRequest={handleCancelLeaveRequest}
                onClockIn={handleCheckIn} onClockOut={handleCheckOut}
                onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment} onDeleteDepartment={handleDeleteDepartment}
                employeeProfiles={hrStore.employeeProfiles} teams={hrStore.teams}
                leavePolicies={hrStore.leavePolicies} leaveBalances={hrStore.leaveBalances}
                attendanceCorrections={hrStore.attendanceCorrections}
                onboardingChecklists={hrStore.onboardingChecklists} offboardingChecklists={hrStore.offboardingChecklists}
                employeeAssets={hrStore.employeeAssets} performanceReviews={hrStore.performanceReviews}
                equipment={productionStore.equipment}
                onCreateEmployeeProfile={handleCreateEmployeeProfile} onUpdateEmployeeProfile={handleUpdateEmployeeProfile}
                onSubmitAttendanceCorrection={handleSubmitAttendanceCorrection}
                onApproveAttendanceCorrection={handleApproveAttendanceCorrection}
                onStartOnboarding={handleStartOnboarding} onCompleteOnboardingStep={handleCompleteOnboardingStep}
                onStartOffboarding={handleStartOffboarding} onAssignEmployeeAsset={handleAssignEmployeeAsset}
                onReturnEmployeeAsset={handleReturnEmployeeAsset}
                onCreatePerformanceReview={handleCreatePerformanceReview}
                onSubmitPerformanceReview={handleSubmitPerformanceReview}
                onFinalizePerformanceReview={handleFinalizePerformanceReview}
                onUpdatePerformanceReview={handleUpdatePerformanceReview}
              />
            } />
            <Route path="/schedule" element={
              <UnifiedCalendar tasks={activeTasks} callSheets={productionStore.callSheets}
                socialPosts={postingStore.socialPosts} milestones={projectStore.projectMilestones}
                leaveRequests={hrStore.leaveRequests} users={safeUsers} checkPermission={checkPermission}
              />
            } />
            <Route path="/analytics" element={
              <AnalyticsHub tasks={activeTasks} projects={projects} invoices={invoices}
                users={activeUsers} payments={payments} expenses={expenses} clients={clients}
              />
            } />
            <Route path="/notifications" element={
              <div className="space-y-6">
                {canSendNotifications && user && (
                  <Suspense fallback={<RouteFallback />}>
                    <NotificationConsole currentUserId={user.id} users={activeUsers} projects={projects}
                      roles={Array.isArray(systemRoles) ? systemRoles : []} onSend={handleManualNotificationSend}
                      onEnablePush={requestPermissionAndRegister} permissionState={permissionState}
                      currentToken={messagingToken}
                    />
                  </Suspense>
                )}
                <NotificationsHub notifications={notifications} preferences={notifStore.preferences}
                  onMarkAsRead={handleMarkNotificationRead} onMarkAllAsRead={handleMarkAllNotificationsRead}
                  onDelete={handleDeleteNotification} onUpdatePreferences={handleUpdatePreferences}
                  permissionState={permissionState} onRequestPermission={requestPermissionAndRegister}
                />
              </div>
            } />
            <Route path="/admin" element={
              !checkPermission(PERMISSIONS.ROLES.VIEW) && !checkPermission(PERMISSIONS.ADMIN_SETTINGS.VIEW)
                ? <div className="p-8 text-center text-slate-400">Access Denied.</div>
                : <AdminHub settings={appSettings} users={hrStore.users} roles={systemRoles}
                    auditLogs={auditLogs} workflowTemplates={workflowTemplates} departments={departments}
                    dashboardBanner={dashboardBanner} currentUserId={user?.id || ''}
                    onUpdateUser={handleUpdateUser} onAddUser={handleAddUser}
                    onUpdateRole={handleUpdateRole} onAddRole={handleAddRole} onDeleteRole={handleDeleteRole}
                    onUpdateWorkflow={handleUpdateWorkflow} onAddWorkflow={handleAddWorkflow}
                    onDeleteWorkflow={handleDeleteWorkflow} onSyncRoles={handleSyncRoles}
                    onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment}
                    onDeleteDepartment={handleDeleteDepartment}
                    onSaveBanner={handleSaveBanner} onDeleteBanner={handleDeleteBanner}
                  />
            } />
            {/* Catch-all */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold">?</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-600">Page Not Found</h2>
                <p className="mt-2">The requested page does not exist.</p>
              </div>
            } />
          </Routes>
        </Suspense>

        {/* ─── Global Task Detail Overlay ─── */}
        {globalSelectedTask && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTargetTaskId(null)}>
            <div className="w-full max-w-[900px] max-h-[85vh] bg-[color:var(--dash-surface-elevated)] rounded-2xl border border-[color:var(--dash-glass-border)] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/95 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-slate-100">Task Details</h3>
                <button onClick={() => setTargetTaskId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <TaskDetailView
                  task={globalSelectedTask}
                  project={projects.find(p => p.id === globalSelectedTask.projectId)}
                  users={activeUsers}
                  comments={taskStore.comments.filter(c => c.taskId === globalSelectedTask.id)}
                  timeLogs={taskStore.timeLogs.filter(t => t.taskId === globalSelectedTask.id)}
                  dependencies={taskStore.dependencies.filter(d => d.taskId === globalSelectedTask.id)}
                  activityLogs={taskStore.activityLogs.filter(l => l.taskId === globalSelectedTask.id)}
                  taskSteps={taskStore.approvalSteps.filter(s => s.taskId === globalSelectedTask.id)}
                  clientApproval={taskStore.clientApprovals.find(ca => ca.taskId === globalSelectedTask.id)}
                  taskFiles={files.filter(f => f.taskId === globalSelectedTask.id)}
                  allTasks={activeTasks}
                  currentUser={user}
                  workflowTemplates={workflowTemplates}
                  milestones={projectStore.projectMilestones}
                  onUpdateTask={handleUpdateTask} onAddTask={handleAddTask}
                  onAddComment={handleAddTaskComment} onAddTimeLog={handleAddTaskTimeLog}
                  onAddDependency={handleAddTaskDependency} onUpdateApprovalStep={handleUpdateApprovalStep}
                  onAddApprovalSteps={handleAddApprovalSteps} onUpdateClientApproval={handleUpdateClientApproval}
                  onAddClientApproval={handleAddClientApproval} onUploadFile={handleUploadFile}
                  onNotify={handleNotify} onArchiveTask={handleArchiveTask} onDeleteTask={handleDeleteTask}
                  onEditTask={() => navigate('/tasks')}
                  checkPermission={checkPermission} getStatusColor={globalGetStatusColor}
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
              <div className="p-1 bg-indigo-50 rounded-full text-indigo-600 shrink-0"><Bell className="w-4 h-4" /></div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">{toast.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{toast.message}</p>
              </div>
              <button onClick={clearToast} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
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
