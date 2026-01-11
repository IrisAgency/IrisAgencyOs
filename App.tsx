import React, { useState, useEffect, useMemo } from 'react';
import { USERS, TASKS, PROJECTS, INVOICES, PRODUCTION_ASSETS, CLIENTS, CLIENT_SOCIAL_LINKS, CLIENT_NOTES, CLIENT_MEETINGS, CLIENT_BRAND_ASSETS, CLIENT_MONTHLY_REPORTS, PROJECT_MEMBERS, PROJECT_MILESTONES, PROJECT_ACTIVITY_LOGS, TASK_COMMENTS, TASK_TIME_LOGS, TASK_DEPENDENCIES, TASK_ACTIVITY_LOGS, APPROVAL_STEPS, CLIENT_APPROVALS, FILES, FOLDERS, AGENCY_LOCATIONS, AGENCY_EQUIPMENT, SHOT_LISTS, CALL_SHEETS, QUOTATIONS, PAYMENTS, EXPENSES, VENDORS, FREELANCERS, FREELANCER_ASSIGNMENTS, VENDOR_SERVICE_ORDERS, LEAVE_REQUESTS, ATTENDANCE_RECORDS, DEFAULT_BRANDING, DEFAULT_SETTINGS, DEFAULT_ROLES, AUDIT_LOGS, WORKFLOW_TEMPLATES, PROJECT_MARKETING_ASSETS, SOCIAL_POSTS, NOTES } from './constants';
import type { Task, Project, Invoice, ProductionAsset, TaskStatus, User, UserRole, Client, ClientSocialLink, ClientNote, ClientMeeting, ClientBrandAsset, ClientMonthlyReport, ProjectMember, ProjectMilestone, ProjectActivityLog, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval, AgencyFile, FileFolder, ShotList, CallSheet, AgencyLocation, AgencyEquipment, Quotation, Payment, Expense, Vendor, Freelancer, FreelancerAssignment, VendorServiceOrder, LeaveRequest, AttendanceRecord, Notification, NotificationPreference, AppBranding, AppSettings, RoleDefinition, AuditLog, WorkflowTemplate, ProjectMarketingAsset, SocialPost, DepartmentDefinition, Note } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TasksHub from './components/TasksHub';
import ProductionHub from './components/ProductionHub';
import FinanceHub from './components/FinanceHub';
import ProjectsHub from './components/ProjectsHub';
import TeamHub from './components/TeamHub';
import AnalyticsHub from './components/AnalyticsHub';
import AIAssistant from './components/AIAssistant';
import ClientsHub from './components/ClientsHub';
import FilesHub from './components/FilesHub';
import VendorsHub from './components/VendorsHub';
import NotificationsHub from './components/NotificationsHub';
import NotificationConsole, { ManualNotificationPayload } from './components/NotificationConsole';
import AdminHub from './components/AdminHub';
import PostingHub from './components/PostingHub';
import UnifiedCalendar from './components/UnifiedCalendar';
import Login from './components/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import SplashScreen from './components/SplashScreen';
import ReloadPrompt from './components/ReloadPrompt';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useAuth } from './contexts/AuthContext';
import { useBranding } from './contexts/BrandingContext';
import { PERMISSIONS } from './lib/permissions';
import { X, Bell } from 'lucide-react';
import { useFirestoreCollection } from './hooks/useFirestore';
import { useMessagingToken } from './hooks/useMessagingToken';
import { doc, setDoc, updateDoc, addDoc, collection, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './lib/firebase';
import { archiveTask } from './utils/archiveUtils';
import {
  createClientFolderStructure,
  createProjectFolder,
  createTaskFolder,
  categorizeFileType,
  generateFileName,
  getDestinationFolder
} from './utils/folderUtils';
import { startOverflowMonitoring } from './utils/overflowDetector';

// Helper hook for LocalStorage persistence
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string, message: string } | null>(null);
  const [splashFinished, setSplashFinished] = useState(false);
  const [hidePushPrompt, setHidePushPrompt] = useStickyState<boolean>(false, 'iris_hide_push_prompt');

  // Overflow detection in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const cleanup = startOverflowMonitoring();
      return cleanup;
    }
  }, []);

  // -- Application State (Persisted) --
  const { currentUser: user, loading, logout, checkPermission } = useAuth();
  const [tasks] = useFirestoreCollection<Task>('tasks', TASKS);
  const activeTasks = tasks.filter(t => !t.isDeleted);
  const [projects] = useFirestoreCollection<Project>('projects', PROJECTS);
  const [users] = useFirestoreCollection<User>('users', USERS);
  const [clients] = useFirestoreCollection<Client>('clients', CLIENTS);
  const [clientSocialLinks] = useFirestoreCollection<ClientSocialLink>('client_social_links', CLIENT_SOCIAL_LINKS);
  const [clientNotes] = useFirestoreCollection<ClientNote>('client_notes', CLIENT_NOTES);
  const [clientMeetings] = useFirestoreCollection<ClientMeeting>('client_meetings', CLIENT_MEETINGS);
  const [clientBrandAssets] = useFirestoreCollection<ClientBrandAsset>('client_brand_assets', CLIENT_BRAND_ASSETS);
  const [clientMonthlyReports] = useFirestoreCollection<ClientMonthlyReport>('client_monthly_reports', CLIENT_MONTHLY_REPORTS);

  // Finance State
  const [invoices] = useFirestoreCollection<Invoice>('invoices', INVOICES);
  const [quotations] = useFirestoreCollection<Quotation>('quotations', QUOTATIONS);
  const [payments] = useFirestoreCollection<Payment>('payments', PAYMENTS);
  const [expenses] = useFirestoreCollection<Expense>('expenses', EXPENSES);

  // Project Related State
  const [projectMembers] = useFirestoreCollection<ProjectMember>('project_members', PROJECT_MEMBERS);
  const [projectMilestones] = useFirestoreCollection<ProjectMilestone>('project_milestones', PROJECT_MILESTONES);
  const [projectLogs] = useFirestoreCollection<ProjectActivityLog>('project_activity_logs', PROJECT_ACTIVITY_LOGS);
  const [projectMarketingAssets] = useFirestoreCollection<ProjectMarketingAsset>('project_marketing_assets', PROJECT_MARKETING_ASSETS);

  // Social Media State
  const [socialPosts] = useFirestoreCollection<SocialPost>('social_posts', SOCIAL_POSTS);

  // Task Related State
  const [taskComments] = useFirestoreCollection<TaskComment>('task_comments', TASK_COMMENTS);
  const [taskTimeLogs] = useFirestoreCollection<TaskTimeLog>('task_time_logs', TASK_TIME_LOGS);
  const [taskDependencies] = useFirestoreCollection<TaskDependency>('task_dependencies', TASK_DEPENDENCIES);
  const [taskLogs] = useFirestoreCollection<TaskActivityLog>('task_activity_logs', TASK_ACTIVITY_LOGS);

  // Approval Workflow State
  const [approvalSteps] = useFirestoreCollection<ApprovalStep>('approval_steps', APPROVAL_STEPS);
  const [clientApprovals] = useFirestoreCollection<ClientApproval>('client_approvals', CLIENT_APPROVALS);

  // File Management State
  const [files] = useFirestoreCollection<AgencyFile>('files', FILES);
  const [folders] = useFirestoreCollection<FileFolder>('folders', FOLDERS);

  // Production Module State
  const [productionAssets] = useFirestoreCollection<ProductionAsset>('production_assets', PRODUCTION_ASSETS); // Legacy
  const [shotLists] = useFirestoreCollection<ShotList>('shot_lists', SHOT_LISTS);
  const [callSheets] = useFirestoreCollection<CallSheet>('call_sheets', CALL_SHEETS);
  const [locations] = useFirestoreCollection<AgencyLocation>('agency_locations', AGENCY_LOCATIONS);
  const [equipment] = useFirestoreCollection<AgencyEquipment>('agency_equipment', AGENCY_EQUIPMENT);

  // Vendors & Freelancers Module State
  const [vendors] = useFirestoreCollection<Vendor>('vendors', VENDORS);
  const [freelancers] = useFirestoreCollection<Freelancer>('freelancers', FREELANCERS);
  const [assignments] = useFirestoreCollection<FreelancerAssignment>('freelancer_assignments', FREELANCER_ASSIGNMENTS);
  const [serviceOrders] = useFirestoreCollection<VendorServiceOrder>('vendor_service_orders', VENDOR_SERVICE_ORDERS);

  // HR Module State
  const [leaveRequests] = useFirestoreCollection<LeaveRequest>('leave_requests', LEAVE_REQUESTS);
  const [attendanceRecords] = useFirestoreCollection<AttendanceRecord>('attendance_records', ATTENDANCE_RECORDS);

  // Notifications State
  const [fetchedNotifications] = useFirestoreCollection<Notification>('notifications', []);
  const notifications = useMemo(() => {
    if (!user) return [] as Notification[];
    return [...fetchedNotifications.filter(n => n.userId === user.id)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [fetchedNotifications, user]);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference>({
    userId: user?.id || 'placeholder',
    mutedCategories: [],
    mutedProjects: [],
    severityThreshold: 'info',
    inAppEnabled: true,
    emailEnabled: false,
    pushEnabled: true,
  });

  // Notes State
  const [notes] = useFirestoreCollection<Note>('notes', NOTES);

  // Admin & Settings State
  // const [appBranding, setAppBranding] = useStickyState<AppBranding>(DEFAULT_BRANDING, 'iris_branding');
  // const [appSettings, setAppSettings] = useStickyState<AppSettings>(DEFAULT_SETTINGS, 'iris_settings');
  const [systemRoles] = useFirestoreCollection<RoleDefinition>('roles', DEFAULT_ROLES);
  const [auditLogs] = useFirestoreCollection<AuditLog>('audit_logs', AUDIT_LOGS);
  const [workflowTemplates] = useFirestoreCollection<WorkflowTemplate>('workflow_templates', WORKFLOW_TEMPLATES);
  const [departments] = useFirestoreCollection<DepartmentDefinition>('departments', []);

  const { branding, loading: brandingLoading } = useBranding();
  const [appSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Defensive check for users array
  const safeUsers = Array.isArray(users) ? users : [];
  const activeUsers = safeUsers.filter(u => u && u.status !== 'inactive');
  const canSendNotifications = checkPermission(PERMISSIONS.ADMIN_SETTINGS.VIEW);

  // Show splash screen during initial load, hide loading states behind splash
  const showSplash = !splashFinished || loading || brandingLoading;

  const { requestPermissionAndRegister, permissionState, token: messagingToken } = useMessagingToken(user);
  const shouldShowPushPrompt = permissionState === 'default' && !hidePushPrompt && permissionState !== 'unsupported';

  useEffect(() => {
    if (permissionState === 'granted') {
      setHidePushPrompt(true);
    }
  }, [permissionState, setHidePushPrompt]);

  if (showSplash) {
    return (
      <SplashScreen 
        onFinish={() => setSplashFinished(true)} 
        minimumDisplayDuration={3000}
      />
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.forcePasswordChange) {
    return <ForcePasswordChange />;
  }

  // --- Handlers ---

  const handleEnablePushNotifications = async () => {
    try {
      await requestPermissionAndRegister();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setHidePushPrompt(true);
      }
    } catch (error) {
      console.error('Failed to enable push notifications', error);
    }
  };

  const handleDismissPushPrompt = () => {
    setHidePushPrompt(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigateToTask = (taskId: string) => {
    setTargetTaskId(taskId);
    setActiveView('tasks');
  };

  const resolveNotificationTargetUserIds = (payload: ManualNotificationPayload): string[] => {
    switch (payload.targetType) {
      case 'user':
        return payload.targetIds;
      case 'role':
        return activeUsers.filter(u => payload.targetIds.includes(u.role)).map(u => u.id);
      case 'project':
        return projectMembers
          .filter(pm => payload.targetIds.includes(pm.projectId))
          .map(pm => pm.userId);
      case 'all':
      default:
        return activeUsers.map(u => u.id);
    }
  };

  const handleManualNotificationSend = async (payload: ManualNotificationPayload) => {
    const recipientIds = Array.from(new Set(resolveNotificationTargetUserIds(payload)));
    const createdAt = new Date().toISOString();

    await addDoc(collection(db, 'notifications_outbox'), {
      title: payload.title,
      body: payload.body,
      targetType: payload.targetType,
      targetIds: payload.targetIds,
      targetUserIds: recipientIds,
      createdAt,
      createdBy: user?.id || 'system'
    });

    if (recipientIds.length > 0) {
      const batch = writeBatch(db);
      recipientIds.forEach((uid) => {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: uid,
          type: 'system',
          title: payload.title,
          message: payload.body,
          severity: 'info',
          category: 'system',
          isRead: false,
          createdAt
        });
      });
      await batch.commit();
    }

    setToast({ title: 'Notification queued', message: `Sent to ${recipientIds.length || activeUsers.length} recipient(s).` });
  };

  // Notification Logic
  const handleNotify = async (type: string, title: string, message: string) => {
    // Placeholder: in-app toast only until notifications are reimplemented
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to mark notification read', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { isRead: true, readAt: new Date().toISOString() }));
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark all notifications read', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  const handleUpdatePreferences = (prefs: NotificationPreference) => {
    setNotificationPreferences(prefs);
  };


  // -- Task Handlers --
  const handleAddTask = async (newTask: Task) => {
    await setDoc(doc(db, 'tasks', newTask.id), newTask);

    // Auto-create task folder
    try {
      const project = projects.find(p => p.id === newTask.projectId);
      if (project) {
        await createTaskFolder(
          newTask.id,
          newTask.title,
          newTask.projectId,
          project.clientId
        );
      }
    } catch (error) {
      console.error('Error creating task folder:', error);
    }

    const log: TaskActivityLog = {
      id: `tal${Date.now()}`, taskId: newTask.id, userId: user!.id, type: 'status_change', message: 'Task created', createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'task_activity_logs', log.id), log);

    // Recalculate Milestone Progress if linked
    if (newTask.milestoneId) {
      const milestoneTasksQuery = query(collection(db, 'tasks'), where('milestoneId', '==', newTask.milestoneId));
      const snapshot = await getDocs(milestoneTasksQuery);
      const tasks = snapshot.docs.map(d => d.data() as Task);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Update Milestone
      const milestoneRef = doc(db, 'project_milestones', newTask.milestoneId);
      await updateDoc(milestoneRef, { progressPercent: progress });
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const oldTask = tasks.find(t => t.id === updatedTask.id);
    
    await updateDoc(doc(db, 'tasks', updatedTask.id), updatedTask as any);

    const log: TaskActivityLog = {
      id: `tal${Date.now()}`, taskId: updatedTask.id, userId: user!.id, type: 'status_change', message: `Status updated to ${updatedTask.status}`, createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'task_activity_logs', log.id), log);

    // Recalculate Milestone Progress if linked
    if (updatedTask.milestoneId) {
      const milestoneTasksQuery = query(collection(db, 'tasks'), where('milestoneId', '==', updatedTask.milestoneId));
      const snapshot = await getDocs(milestoneTasksQuery);
      const tasks = snapshot.docs.map(d => d.data() as Task);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Update Milestone
      const milestoneRef = doc(db, 'project_milestones', updatedTask.milestoneId);
      await updateDoc(milestoneRef, { progressPercent: progress });
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!checkPermission(PERMISSIONS.TASKS.DELETE)) {
      setToast({ title: 'Access Denied', message: 'You do not have permission to delete tasks.' });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) return;

    try {
      // Soft Delete
      await updateDoc(doc(db, 'tasks', task.id), {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.id
      });

      // Cancel pending approvals
      const pendingSteps = approvalSteps.filter(s => s.taskId === task.id && s.status === 'pending');
      const batch = writeBatch(db);
      pendingSteps.forEach(step => {
        batch.update(doc(db, 'approval_steps', step.id), { status: 'cancelled' });
      });
      await batch.commit();

      await addAuditLog('delete_task', 'Task', task.id, `Soft deleted task ${task.title}`);
      setToast({ title: 'Task Deleted', message: 'Task has been moved to trash.' });
    } catch (error) {
      console.error("Error deleting task:", error);
      setToast({ title: 'Error', message: 'Failed to delete task.' });
    }
  };

  const handleAddTaskComment = async (comment: TaskComment) => {
    await setDoc(doc(db, 'task_comments', comment.id), comment);
  };

  const handleAddTaskTimeLog = async (log: TaskTimeLog) => {
    await setDoc(doc(db, 'task_time_logs', log.id), log);
  };

  const handleAddTaskDependency = async (dep: TaskDependency) => {
    await setDoc(doc(db, 'task_dependencies', dep.id), dep);
  };

  const handleUpdateApprovalStep = async (updatedStep: ApprovalStep) => {
    await updateDoc(doc(db, 'approval_steps', updatedStep.id), updatedStep as any);
  };

  const handleAddApprovalSteps = async (newSteps: ApprovalStep[]) => {
    const batch = writeBatch(db);
    newSteps.forEach(step => {
      batch.set(doc(db, 'approval_steps', step.id), step);
    });
    await batch.commit();
  };

  const handleUpdateClientApproval = async (updatedCA: ClientApproval) => {
    await updateDoc(doc(db, 'client_approvals', updatedCA.id), updatedCA as any);
  };

  const handleAddClientApproval = async (newCA: ClientApproval) => {
    await setDoc(doc(db, 'client_approvals', newCA.id), newCA);
  };  // -- File Handlers --
  const handleUploadFile = async (file: AgencyFile) => {
    try {
      // Show upload starting toast
      setToast({ title: 'Uploading...', message: `Uploading ${file.name}...` });

      let fileUrl = file.url;

      // Check if we have a raw file object to upload
      const rawFile = (file as any).file;

      if (rawFile) {
        // Determine storage path based on file type/category
        let storagePath: string;
        
        // Check if this is a client report
        if (file.category === 'document' && file.folderId?.startsWith('client_reports_')) {
          const clientId = file.folderId.replace('client_reports_', '');
          storagePath = `clients/${clientId}/reports/${file.id}_${rawFile.name}`;
        } else {
          // Find associated entities for organized storage
          const project = projects.find(p => p.id === file.projectId);
          const client = project ? clients.find(c => c.id === project.clientId) : null;

          // Build organized storage path: clients/{clientId}/projects/{projectId}/assets/{fileName}
          const clientId = client?.id || 'unknown-client';
          const projectId = file.projectId || 'unknown-project';
          storagePath = `clients/${clientId}/projects/${projectId}/assets/${file.id}_${rawFile.name}`;
        }

        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, rawFile);
        fileUrl = await getDownloadURL(snapshot.ref);
      } else if (!fileUrl) {
        // Fallback if no file and no URL
        fileUrl = 'https://picsum.photos/800/600';
      }

      // Categorize file type
      const category = file.category || categorizeFileType(file.name, file.type);

      // Find associated entities
      const project = projects.find(p => p.id === file.projectId);
      const task = file.taskId ? activeTasks.find(t => t.id === file.taskId) : null;
      const client = project ? clients.find(c => c.id === project.clientId) : null;

      // Generate standardized file name if we have context
      let finalFileName = file.name;
      if (client && task) {
        const clientCode = client.name.substring(0, 3).toUpperCase();
        finalFileName = generateFileName(file.name, clientCode, task.title, file.version);
      }

      // Determine destination folder intelligently
      let destinationFolder = file.folderId;
      if (!destinationFolder && client) {
        destinationFolder = await getDestinationFolder(
          category,
          file.taskId || undefined,
          file.projectId,
          client.id
        );
      }

      const fileToSave = {
        ...file,
        url: fileUrl,
        category,
        originalName: file.name,
        name: finalFileName,
        folderId: destinationFolder,
        clientId: client?.id || null
      };

      // Remove the raw file object before saving to Firestore
      delete (fileToSave as any).file;

      await setDoc(doc(db, 'files', file.id), fileToSave);

      setToast({ title: 'Success', message: `${file.name} uploaded successfully!` });
      handleNotify('system', 'File Uploaded', `${file.name} was uploaded successfully to ${task ? task.title : 'project'}.`);
      
      return fileToSave; // Return the saved file with URL
    } catch (error: any) {
      console.error("Error uploading file:", error);
      console.error("Error details:", error.message, error.code);
      setToast({
        title: 'Upload Failed',
        message: error.message || 'Failed to upload file to storage. Please check permissions.'
      });
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleCreateFolder = async (folder: FileFolder) => {
    await setDoc(doc(db, 'folders', folder.id), folder);
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) {
        setToast({ title: 'Error', message: 'Folder not found.' });
        return;
      }

      // Check if folder has subfolders
      const hasSubfolders = folders.some(f => f.parentId === folderId);
      // Check if folder has files
      const folderFiles = files.filter(f => f.folderId === folderId);
      const hasFiles = folderFiles.length > 0;

      // Build confirmation message
      let confirmMessage = `Are you sure you want to delete the folder "${folder.name}"?\n\n`;

      if (hasSubfolders || hasFiles) {
        confirmMessage += '⚠️ Warning: This folder contains:\n';
        if (hasSubfolders) confirmMessage += '• Subfolders\n';
        if (hasFiles) confirmMessage += `• ${folderFiles.length} file(s)\n`;
        confirmMessage += '\nAll contents will be permanently deleted!\n\n';
      }

      confirmMessage += 'This action CANNOT be undone.';

      if (!window.confirm(confirmMessage)) {
        return;
      }

      const batch = writeBatch(db);

      // Delete all files in this folder
      const filesQuery = query(collection(db, 'files'), where('folderId', '==', folderId));
      const filesSnapshot = await getDocs(filesQuery);
      filesSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // Delete all subfolders recursively
      const deleteSubfolders = async (parentId: string, batchRef: any) => {
        const subfoldersQuery = query(collection(db, 'folders'), where('parentId', '==', parentId));
        const subfoldersSnapshot = await getDocs(subfoldersQuery);

        for (const subfolderDoc of subfoldersSnapshot.docs) {
          // Recursively delete children
          await deleteSubfolders(subfolderDoc.id, batchRef);

          // Delete files in subfolder
          const subFilesQuery = query(collection(db, 'files'), where('folderId', '==', subfolderDoc.id));
          const subFilesSnapshot = await getDocs(subFilesQuery);
          subFilesSnapshot.docs.forEach(fileDoc => {
            batchRef.delete(fileDoc.ref);
          });

          // Delete the subfolder itself
          batchRef.delete(subfolderDoc.ref);
        }
      };

      await deleteSubfolders(folderId, batch);

      // Delete the folder itself
      batch.delete(doc(db, 'folders', folderId));

      await batch.commit();

      addAuditLog('delete', 'Folder', folderId,
        `Deleted folder "${folder.name}" and all its contents (${folderFiles.length} files)`);
      setToast({
        title: 'Success',
        message: `Folder "${folder.name}" and all contents deleted successfully.`
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
      setToast({ title: 'Error', message: 'Failed to delete folder.' });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) {
        setToast({ title: 'Error', message: 'File not found.' });
        return;
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'files', fileId));

      // Optionally: Delete from Firebase Storage (if using real storage)
      // const storageRef = ref(storage, file.url);
      // await deleteObject(storageRef);

      // Log activity
      if (file.projectId && user) {
        const log: ProjectActivityLog = {
          id: `log${Date.now()}`,
          projectId: file.projectId,
          userId: user.id,
          type: 'file_upload',
          message: `Deleted file: ${file.name}`,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'project_activity_logs', log.id), log);
      }

      handleNotify('system', 'File Deleted', `${file.name} has been deleted.`);
    } catch (error) {
      console.error("Error deleting file:", error);
      setToast({ title: 'Delete Failed', message: 'Failed to delete file.' });
    }
  };

  // -- Production Handlers --
  const handleAddShotList = async (sl: ShotList) => await setDoc(doc(db, 'shot_lists', sl.id), sl);
  const handleAddCallSheet = async (cs: CallSheet) => {
    await setDoc(doc(db, 'call_sheets', cs.id), cs);
    handleNotify('production_update', 'Call Sheet Published', `Call sheet for ${cs.date} is now available.`);
  };
  const handleAddLocation = async (loc: AgencyLocation) => await setDoc(doc(db, 'agency_locations', loc.id), loc);
  const handleAddEquipment = async (eq: AgencyEquipment) => await setDoc(doc(db, 'agency_equipment', eq.id), eq);
  const handleUpdateEquipment = async (eq: AgencyEquipment) => await updateDoc(doc(db, 'agency_equipment', eq.id), eq as any);

  // -- Network Handlers --
  const handleAddVendor = async (v: Vendor) => await setDoc(doc(db, 'vendors', v.id), v);
  const handleUpdateVendor = async (v: Vendor) => await updateDoc(doc(db, 'vendors', v.id), v as any);
  const handleAddFreelancer = async (f: Freelancer) => await setDoc(doc(db, 'freelancers', f.id), f);
  const handleUpdateFreelancer = async (f: Freelancer) => await updateDoc(doc(db, 'freelancers', f.id), f as any);
  const handleAddFreelancerAssignment = async (a: FreelancerAssignment) => await setDoc(doc(db, 'freelancer_assignments', a.id), a);

  // -- HR Handlers --
  const handleAddUser = async (newUser: User) => {
    const userToSave: User = {
      ...newUser,
      passwordHash: newUser.passwordHash || '',
      forcePasswordChange: typeof newUser.forcePasswordChange === 'boolean' ? newUser.forcePasswordChange : false
    };
    await setDoc(doc(db, 'users', userToSave.id), userToSave);
    addAuditLog('create_user', 'User', newUser.id, `Created user ${newUser.name}`);
  };
  const handleUpdateUser = async (updatedUser: User) => {
    await updateDoc(doc(db, 'users', updatedUser.id), updatedUser as any);
    addAuditLog('update_user', 'User', updatedUser.id, `Updated user ${updatedUser.name}`);
  };
  const handleAddLeaveRequest = async (req: LeaveRequest) => {
    await setDoc(doc(db, 'leave_requests', req.id), req);
    handleNotify('system', 'Leave Request Submitted', 'Your request has been sent for approval.');
  };
  const handleUpdateLeaveRequest = async (req: LeaveRequest) => {
    await updateDoc(doc(db, 'leave_requests', req.id), req as any);
    if (req.status === 'approved') handleNotify('system', 'Leave Approved', 'Your leave request was approved.');
  };


  // -- Finance Handlers --
  const handleAddInvoice = async (inv: Invoice) => await setDoc(doc(db, 'invoices', inv.id), inv);
  const handleUpdateInvoice = async (inv: Invoice) => await updateDoc(doc(db, 'invoices', inv.id), inv as any);
  const handleAddQuotation = async (quo: Quotation) => await setDoc(doc(db, 'quotations', quo.id), quo);
  const handleUpdateQuotation = async (quo: Quotation) => await updateDoc(doc(db, 'quotations', quo.id), quo as any);

  const handleAddPayment = async (pay: Payment) => {
    await setDoc(doc(db, 'payments', pay.id), pay);
    // Update Invoice status automatically
    const invoice = invoices.find(i => i.id === pay.invoiceId);
    if (invoice) {
      const newPaid = invoice.paid + pay.amount;
      const newBalance = invoice.total - newPaid;
      let newStatus: any = 'partially_paid';
      if (newBalance <= 0) newStatus = 'paid';
      const updatedInvoice = { ...invoice, paid: newPaid, balance: newBalance, status: newStatus };
      await handleUpdateInvoice(updatedInvoice);
      handleNotify('financeUpdates', 'Payment Received', `Payment of $${pay.amount} recorded for ${invoice.invoiceNumber}.`);
    }
  };

  const handleAddExpense = async (exp: Expense) => {
    await setDoc(doc(db, 'expenses', exp.id), exp);
    // If linked to project, update project spent amount
    if (exp.projectId) {
      const project = projects.find(p => p.id === exp.projectId);
      if (project) {
        await handleUpdateProject({ ...project, spent: project.spent + exp.amount });
      }
    }
  };

  // -- Project Handlers --

  const handleAddProject = async (newProject: Project) => {
    await setDoc(doc(db, 'projects', newProject.id), newProject);

    // Auto-create project folder structure
    try {
      await createProjectFolder(
        newProject.id,
        newProject.name,
        newProject.clientId,
        newProject.code
      );
    } catch (error) {
      console.error('Error creating project folders:', error);
    }

    if (user) {
      // 1. Log Activity
      const log: ProjectActivityLog = {
        id: `log${Date.now()}`,
        projectId: newProject.id,
        userId: user.id,
        type: 'status_change',
        message: 'Project created',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);

      // 2. Add Creator as Project Member (Project Lead)
      const member: ProjectMember = {
        id: `pm${Date.now()}`,
        projectId: newProject.id,
        userId: user.id,
        roleInProject: 'Project Lead',
        isExternal: false
      };
      await setDoc(doc(db, 'project_members', member.id), member);

      // 3. Add Assigned Manager if different from creator
      if (newProject.accountManagerId && newProject.accountManagerId !== user.id) {
        const managerMember: ProjectMember = {
          id: `pm${Date.now()}_mgr`,
          projectId: newProject.id,
          userId: newProject.accountManagerId,
          roleInProject: 'Account Manager',
          isExternal: false
        };
        await setDoc(doc(db, 'project_members', managerMember.id), managerMember);
      }

      handleNotify('system', 'Project Created', `Project "${newProject.name}" is now active.`);
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    await updateDoc(doc(db, 'projects', updatedProject.id), updatedProject as any);
    if (user) {
      const log: ProjectActivityLog = {
        id: `log${Date.now()}`,
        projectId: updatedProject.id,
        userId: user.id,
        type: 'status_change',
        message: `Status updated to ${updatedProject.status}`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);
    }
  };

  const handleAddProjectMember = async (member: ProjectMember) => {
    await setDoc(doc(db, 'project_members', member.id), member);
  };

  const handleRemoveProjectMember = async (memberId: string) => {
    await deleteDoc(doc(db, 'project_members', memberId));
  };

  const handleRemoveFreelancerAssignment = async (assignmentId: string) => {
    await deleteDoc(doc(db, 'freelancer_assignments', assignmentId));
  };

  const handleAddProjectMilestone = async (milestone: ProjectMilestone) => {
    await setDoc(doc(db, 'project_milestones', milestone.id), milestone);
  };

  const handleUpdateProjectMilestone = async (milestone: ProjectMilestone) => {
    await updateDoc(doc(db, 'project_milestones', milestone.id), milestone as any);
    if (user && milestone.status === 'completed') {
      const log: ProjectActivityLog = {
        id: `log${Date.now()}`,
        projectId: milestone.projectId,
        userId: user.id,
        type: 'milestone_completed',
        message: `Milestone completed: ${milestone.name}`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'project_activity_logs', log.id), log);
    }
  };

  const handleAddProjectMarketingAsset = async (asset: ProjectMarketingAsset) => {
    await setDoc(doc(db, 'project_marketing_assets', asset.id), asset);
    handleNotify('system', 'Marketing Asset Added', `Added ${asset.name} to project strategy.`);
  };

  const handleUpdateProjectMarketingAsset = async (asset: ProjectMarketingAsset) => {
    await updateDoc(doc(db, 'project_marketing_assets', asset.id), asset as any);
  };

  const handleDeleteProjectMarketingAsset = async (assetId: string) => {
    await deleteDoc(doc(db, 'project_marketing_assets', assetId));
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        setToast({ title: 'Error', message: 'Project not found.' });
        return;
      }

      const confirmMessage = `Are you sure you want to delete the project "${project.name}"?\n\n` +
        `⚠️ Warning: This will permanently delete:\n` +
        `• The project\n` +
        `• All linked tasks\n` +
        `• All project files and folders\n` +
        `• All milestones and activity logs\n` +
        `• All project members and assignments\n\n` +
        `This action CANNOT be undone!`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      const batch = writeBatch(db);

      // 1. Delete the project
      batch.delete(doc(db, 'projects', projectId));

      // 2. Delete all tasks linked to this project
      const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 3. Delete all project folders
      const foldersQuery = query(collection(db, 'folders'), where('projectId', '==', projectId));
      const foldersSnapshot = await getDocs(foldersQuery);
      foldersSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 4. Delete all project files
      const filesQuery = query(collection(db, 'files'), where('projectId', '==', projectId));
      const filesSnapshot = await getDocs(filesQuery);
      filesSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 5. Delete project milestones
      const milestonesQuery = query(collection(db, 'project_milestones'), where('projectId', '==', projectId));
      const milestonesSnapshot = await getDocs(milestonesQuery);
      milestonesSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 6. Delete project members
      const membersQuery = query(collection(db, 'project_members'), where('projectId', '==', projectId));
      const membersSnapshot = await getDocs(membersQuery);
      membersSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 7. Delete project activity logs
      const logsQuery = query(collection(db, 'project_activity_logs'), where('projectId', '==', projectId));
      const logsSnapshot = await getDocs(logsQuery);
      logsSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 8. Delete project marketing assets
      const assetsQuery = query(collection(db, 'project_marketing_assets'), where('projectId', '==', projectId));
      const assetsSnapshot = await getDocs(assetsQuery);
      assetsSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 9. Delete freelancer assignments
      const assignmentsQuery = query(collection(db, 'freelancer_assignments'), where('projectId', '==', projectId));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      assignmentsSnapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();

      addAuditLog('delete', 'Project', projectId,
        `Deleted project "${project.name}" and all associated data (${tasksSnapshot.docs.length} tasks, ${filesSnapshot.docs.length} files)`);
      setToast({
        title: 'Success',
        message: `Project "${project.name}" and all related data deleted successfully.`
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      setToast({ title: 'Error', message: 'Failed to delete project.' });
    }
  };

  // -- Social Media Handlers --
  const handleAddSocialPost = async (post: SocialPost) => {
    await setDoc(doc(db, 'social_posts', post.id), post);
  };

  const handleUpdateSocialPost = async (post: SocialPost) => {
    try {
      await updateDoc(doc(db, 'social_posts', post.id), post as any);
      handleNotify('success', 'Post Updated', `Social post "${post.title}" updated successfully.`);
    } catch (error) {
      console.error("Error updating social post:", error);
      handleNotify('error', 'Update Failed', 'Failed to update social post.');
    }
  };

  const handleArchiveTask = async (task: Task) => {
    if (!user) return;
    await archiveTask(task, user.id);
    handleNotify('system', 'Task Archived', `Task "${task.title}" has been archived.`);
  };

  const handleAddClient = async (newClient: Client) => {
    await setDoc(doc(db, 'clients', newClient.id), newClient);

    // Auto-create client folder structure
    try {
      await createClientFolderStructure(newClient.id, newClient.name);
      handleNotify('system', 'Client Added', `Client "${newClient.name}" created with folder structure.`);
    } catch (error) {
      console.error('Error creating client folders:', error);
      handleNotify('system', 'Client Added', `Client created but folder setup failed.`);
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    await updateDoc(doc(db, 'clients', updatedClient.id), updatedClient as any);
  };

  const handleAddSocialLink = async (link: ClientSocialLink) => {
    await setDoc(doc(db, 'client_social_links', link.id), link);
  };

  const handleUpdateSocialLink = async (link: ClientSocialLink) => {
    await updateDoc(doc(db, 'client_social_links', link.id), link as any);
  };

  const handleDeleteSocialLink = async (linkId: string) => {
    await deleteDoc(doc(db, 'client_social_links', linkId));
  };

  const handleAddClientNote = async (note: ClientNote) => {
    await setDoc(doc(db, 'client_notes', note.id), note);
  };

  const handleUpdateClientNote = async (note: ClientNote) => {
    await updateDoc(doc(db, 'client_notes', note.id), note as any);
  };

  const handleDeleteClientNote = async (noteId: string) => {
    await deleteDoc(doc(db, 'client_notes', noteId));
  };

  const handleAddClientMeeting = async (meeting: ClientMeeting) => {
    // 1. Ensure Client Meetings Root Folder
    let meetingsRoot = folders.find(f => f.clientId === meeting.clientId && f.name === 'Meetings' && f.isArchiveRoot === false);

    if (!meetingsRoot) {
      const newRootId = `f_meetings_${meeting.clientId}`;
      meetingsRoot = {
        id: newRootId,
        clientId: meeting.clientId,
        projectId: null,
        parentId: null,
        name: 'Meetings',
        isArchiveRoot: false,
        isTaskArchiveFolder: false,
        isProjectArchiveFolder: false,
        isMeetingFolder: false,
        meetingId: null
      };
      await setDoc(doc(db, 'folders', newRootId), meetingsRoot);
    }

    // 2. Create Folder for this Meeting
    const meetingFolderId = `f_mtg_${meeting.id}`;
    const meetingDate = new Date(meeting.date).toISOString().split('T')[0];
    const meetingFolder: FileFolder = {
      id: meetingFolderId,
      clientId: meeting.clientId,
      projectId: null,
      parentId: meetingsRoot.id,
      name: `${meetingDate} – ${meeting.title}`,
      isArchiveRoot: false,
      isTaskArchiveFolder: false,
      isProjectArchiveFolder: false,
      isMeetingFolder: true,
      meetingId: meeting.id
    };
    await setDoc(doc(db, 'folders', meetingFolderId), meetingFolder);

    // 3. Save Meeting with folderId
    const meetingWithFolder = { ...meeting, meetingFolderId };
    await setDoc(doc(db, 'client_meetings', meeting.id), meetingWithFolder);

    handleNotify('system', 'Meeting Scheduled', `Meeting "${meeting.title}" has been scheduled.`);
  };

  const handleUpdateClientMeeting = async (meeting: ClientMeeting) => {
    await updateDoc(doc(db, 'client_meetings', meeting.id), meeting as any);
  };

  const handleDeleteClientMeeting = async (meetingId: string) => {
    await deleteDoc(doc(db, 'client_meetings', meetingId));
  };

  const handleAddBrandAsset = async (asset: ClientBrandAsset) => {
    await setDoc(doc(db, 'client_brand_assets', asset.id), asset);
  };

  const handleUpdateBrandAsset = async (asset: ClientBrandAsset) => {
    await updateDoc(doc(db, 'client_brand_assets', asset.id), asset as any);
  };

  const handleDeleteBrandAsset = async (assetId: string) => {
    await deleteDoc(doc(db, 'client_brand_assets', assetId));
  };

  const handleAddMonthlyReport = async (report: ClientMonthlyReport) => {
    await setDoc(doc(db, 'client_monthly_reports', report.id), report);
  };

  const handleUpdateMonthlyReport = async (report: ClientMonthlyReport) => {
    await updateDoc(doc(db, 'client_monthly_reports', report.id), report as any);
  };

  const handleDeleteMonthlyReport = async (reportId: string) => {
    await deleteDoc(doc(db, 'client_monthly_reports', reportId));
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const batch = writeBatch(db);

      // 1. Delete Client
      batch.delete(doc(db, 'clients', clientId));

      // 2. Delete Projects & Tasks
      const projectsQuery = query(collection(db, 'projects'), where('clientId', '==', clientId));
      const projectsSnapshot = await getDocs(projectsQuery);

      const projectIds = projectsSnapshot.docs.map(doc => doc.id);

      // Delete projects
      projectsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete tasks associated with these projects
      for (const projectId of projectIds) {
        const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }

      // 3. Delete Invoices
      const invoicesQuery = query(collection(db, 'invoices'), where('clientId', '==', clientId));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      invoicesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. Delete Quotations
      const quotationsQuery = query(collection(db, 'quotations'), where('clientId', '==', clientId));
      const quotationsSnapshot = await getDocs(quotationsQuery);
      quotationsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 5. Delete Client Approvals
      const approvalsQuery = query(collection(db, 'client_approvals'), where('clientId', '==', clientId));
      const approvalsSnapshot = await getDocs(approvalsQuery);
      approvalsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 6. Delete Payments
      const paymentsQuery = query(collection(db, 'payments'), where('clientId', '==', clientId));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 7. Delete Social Links
      const socialLinksQuery = query(collection(db, 'client_social_links'), where('clientId', '==', clientId));
      const socialLinksSnapshot = await getDocs(socialLinksQuery);
      socialLinksSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 8. Delete Client Notes
      const notesQuery = query(collection(db, 'client_notes'), where('clientId', '==', clientId));
      const notesSnapshot = await getDocs(notesQuery);
      notesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 9. Delete Client Meetings
      const meetingsQuery = query(collection(db, 'client_meetings'), where('clientId', '==', clientId));
      const meetingsSnapshot = await getDocs(meetingsQuery);
      meetingsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Ask if user wants to delete client folders and files from Assets Management
      const deleteAssets = window.confirm(
        'Do you also want to delete all folders and files for this client from Assets Management?\n\n' +
        '⚠️ This will permanently delete:\n' +
        '• All client folders\n' +
        '• All uploaded files (videos, photos, documents, etc.)\n' +
        '• All project and task folders\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Click OK to delete folders and files, or Cancel to keep them.'
      );

      if (deleteAssets) {
        try {
          const assetBatch = writeBatch(db);
          let deletedFolders = 0;
          let deletedFiles = 0;

          // 10. Delete all folders associated with this client
          const foldersQuery = query(collection(db, 'folders'), where('clientId', '==', clientId));
          const foldersSnapshot = await getDocs(foldersQuery);
          foldersSnapshot.docs.forEach((doc) => {
            assetBatch.delete(doc.ref);
            deletedFolders++;
          });

          // 11. Delete all files associated with this client
          const filesQuery = query(collection(db, 'files'), where('clientId', '==', clientId));
          const filesSnapshot = await getDocs(filesQuery);
          filesSnapshot.docs.forEach((doc) => {
            assetBatch.delete(doc.ref);
            deletedFiles++;
          });

          await assetBatch.commit();

          addAuditLog('delete', 'Client Assets', clientId,
            `Deleted client and all associated data including ${deletedFolders} folders and ${deletedFiles} files from Assets Management`);
          setToast({
            title: 'Success',
            message: `Client deleted successfully. Removed ${deletedFolders} folders and ${deletedFiles} files from Assets Management.`
          });
        } catch (assetError) {
          console.error("Error deleting client assets:", assetError);
          setToast({
            title: 'Warning',
            message: 'Client data deleted, but some assets may remain. Please check Assets Management.'
          });
        }
      } else {
        addAuditLog('delete', 'Client', clientId, `Deleted client and all associated data (kept assets)`);
        setToast({ title: 'Success', message: 'Client deleted successfully. Assets Management files were kept.' });
      }

    } catch (error) {
      console.error("Error deleting client:", error);
      setToast({ title: 'Error', message: 'Failed to delete client data completely.' });
    }
  };

  const addAuditLog = async (action: string, entityType: string, entityId: string | null, description: string) => {
    if (!user) return;
    const newLog: AuditLog = {
      id: `audit${Date.now()}`,
      userId: user.id,
      action,
      entityType,
      entityId,
      description,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'audit_logs', newLog.id), newLog);
  };

  const handleUpdateRole = async (newRole: RoleDefinition) => {
    await updateDoc(doc(db, 'roles', newRole.id), newRole as any);
    await addAuditLog('update_role', 'Role', newRole.id, `Updated permissions for ${newRole.name}`);
  };

  const handleAddRole = async (newRole: RoleDefinition) => {
    await setDoc(doc(db, 'roles', newRole.id), newRole);
    await addAuditLog('create_role', 'Role', newRole.id, `Created role ${newRole.name}`);
  };

  const handleDeleteRole = async (roleId: string) => {
    await deleteDoc(doc(db, 'roles', roleId));
    await addAuditLog('delete_role', 'Role', roleId, `Deleted role ${roleId}`);
  };

  const handleUpdateWorkflow = async (wf: WorkflowTemplate) => {
    try {
      await updateDoc(doc(db, 'workflow_templates', wf.id), wf as any);
      setToast({ title: 'Success', message: 'Workflow updated successfully' });
    } catch (error) {
      console.error("Error updating workflow:", error);
      setToast({ title: 'Error', message: 'Failed to update workflow' });
    }
  };

  const handleAddWorkflow = async (wf: WorkflowTemplate) => {
    await setDoc(doc(db, 'workflow_templates', wf.id), wf);
    setToast({ title: 'Success', message: 'Workflow created successfully' });
  };

  const handleDeleteWorkflow = async (wfId: string) => {
    await deleteDoc(doc(db, 'workflow_templates', wfId));
    setToast({ title: 'Success', message: 'Workflow deleted successfully' });
  };

  // -- Department Handlers --
  const handleAddDepartment = async (dept: DepartmentDefinition) => {
    await setDoc(doc(db, 'departments', dept.id), dept);
    await addAuditLog('create_department', 'Department', dept.id, `Created department ${dept.name}`);
    setToast({ title: 'Success', message: `Department "${dept.name}" created.` });
  };

  const handleUpdateDepartment = async (dept: DepartmentDefinition) => {
    await updateDoc(doc(db, 'departments', dept.id), dept as any);
    await addAuditLog('update_department', 'Department', dept.id, `Updated department ${dept.name}`);
    setToast({ title: 'Success', message: `Department "${dept.name}" updated.` });
  };

  const handleDeleteDepartment = async (deptId: string) => {
    await deleteDoc(doc(db, 'departments', deptId));
    await addAuditLog('delete_department', 'Department', deptId, `Deleted department ${deptId}`);
    setToast({ title: 'Success', message: 'Department deleted.' });
  };

  const getVisibleTasks = () => {
    if (checkPermission(PERMISSIONS.TASKS.VIEW_ALL)) return activeTasks;
    return activeTasks.filter(t => {
      if (!t) return false;
      const assignees = t.assigneeIds;
      const isAssigned = Array.isArray(assignees) && assignees.includes(user?.id || '');
      const isCreator = t.createdBy === user?.id;
      return isAssigned || isCreator;
    });
  };

  const getVisibleProjects = () => {
    if (checkPermission(PERMISSIONS.PROJECTS.VIEW_ALL)) return projects;

    // Get projects where user is a member, manager, or has assigned tasks
    return projects.filter(p =>
      projectMembers.some(m => m.projectId === p.id && m.userId === user?.id) ||
      p.accountManagerId === user?.id ||
      p.projectManagerId === user?.id ||
      activeTasks.some(t => t.projectId === p.id && t.assigneeIds?.includes(user?.id || ''))
    );
  };

  const getVisibleFiles = () => {
    return files;
  };

  const handleSyncRoles = async () => {
    try {
      const batch = writeBatch(db);
      for (const defaultRole of DEFAULT_ROLES) {
        const roleRef = doc(db, 'roles', defaultRole.id);
        batch.set(roleRef, defaultRole, { merge: true });
      }
      await batch.commit();
      setToast({ title: 'Success', message: 'System roles synchronized successfully.' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error syncing roles:", error);
      setToast({ title: 'Error', message: 'Failed to sync roles.' });
    }
  };

  // Auto-sync roles if critical permissions are missing (e.g. after an update)
  // useEffect(() => {
  //   if (systemRoles.length > 0) {
  //     const gmRole = systemRoles.find(r => r.name === 'General Manager');
  //     // Check if GM role is missing the new notes permission
  //     if (gmRole && !gmRole.permissions.includes('notes.create')) {
  //       console.log('Detected outdated roles (missing notes permissions). Auto-syncing...');
  //       handleSyncRoles();
  //     }
  //   }
  // }, [systemRoles]);

  const handleOpenProject = (projectId: string) => {
    setTargetProjectId(projectId);
    setActiveView('projects');
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!user) return;
    if (!checkPermission(PERMISSIONS.PROJECTS.ARCHIVE)) {
      setToast({ title: 'Access Denied', message: 'You do not have permission to archive projects.' });
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project || project.isArchived) return;

    if (!confirm(`Are you sure you want to archive project "${project.name}"?`)) return;

    try {
      // 1. Mark project as archived
      const updatedProject = {
        ...project,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: user.id,
        status: 'Completed' as const
      };
      await updateDoc(doc(db, 'projects', projectId), updatedProject as any);

      // 2. Ensure Archive Root Folder for Client
      let archiveRoot = folders.find(f => f.clientId === project.clientId && f.isArchiveRoot);
      if (!archiveRoot) {
        const newRootId = `f_archive_${project.clientId}`;
        archiveRoot = {
          id: newRootId,
          clientId: project.clientId,
          projectId: null,
          parentId: null,
          name: 'Archive',
          isArchiveRoot: true,
          isTaskArchiveFolder: false,
          isProjectArchiveFolder: false
        };
        await setDoc(doc(db, 'folders', newRootId), archiveRoot);
      }

      // 3. Create Project Archive Folder
      const projectArchiveFolderId = `f_proj_arch_${projectId}`;
      const projectArchiveFolder: FileFolder = {
        id: projectArchiveFolderId,
        clientId: project.clientId,
        projectId: projectId,
        parentId: archiveRoot.id,
        name: `[Archived] ${project.name}`,
        isArchiveRoot: false,
        isTaskArchiveFolder: false,
        isProjectArchiveFolder: true
      };
      await setDoc(doc(db, 'folders', projectArchiveFolderId), projectArchiveFolder);

      // 4. Move Project Files
      const projectFiles = files.filter(f => f.projectId === projectId);
      const batch = writeBatch(db);

      projectFiles.forEach(file => {
        const fileRef = doc(db, 'files', file.id);
        batch.update(fileRef, {
          folderId: projectArchiveFolderId,
          isArchived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: user.id
        });
      });

      await batch.commit();

      setToast({ title: 'Project Archived', message: `${project.name} has been archived successfully.` });

    } catch (error) {
      console.error("Error archiving project:", error);
      setToast({ title: 'Error', message: 'Failed to archive project.' });
    }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    if (!user) return;
    if (!checkPermission(PERMISSIONS.PROJECTS.ARCHIVE)) {
      setToast({ title: 'Access Denied', message: 'You do not have permission to unarchive projects.' });
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project || !project.isArchived) return;

    if (!confirm(`Are you sure you want to unarchive project "${project.name}"?`)) return;

    try {
      // 1. Mark project as unarchived
      const updatedProject = {
        ...project,
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        status: 'active' as const // Reset to active
      };
      await updateDoc(doc(db, 'projects', projectId), updatedProject as any);

      // 2. Find Project Archive Folder and Rename (remove [Archived])
      const projectArchiveFolder = folders.find(f => f.projectId === projectId && f.isProjectArchiveFolder);
      if (projectArchiveFolder) {
        const newName = projectArchiveFolder.name.replace('[Archived] ', '');
        await updateDoc(doc(db, 'folders', projectArchiveFolder.id), { name: newName });
      }

      // 3. Mark Files as Unarchived
      const projectFiles = files.filter(f => f.projectId === projectId && f.isArchived);
      const batch = writeBatch(db);

      projectFiles.forEach(file => {
        const fileRef = doc(db, 'files', file.id);
        batch.update(fileRef, {
          isArchived: false,
          archivedAt: null,
          archivedBy: null
        });
      });

      await batch.commit();

      setToast({ title: 'Project Unarchived', message: `${project.name} has been restored to active projects.` });

    } catch (error) {
      console.error("Error unarchiving project:", error);
      setToast({ title: 'Error', message: 'Failed to unarchive project.' });
    }
  };

  const handleAddNote = async (note: Note) => {
    await setDoc(doc(db, 'notes', note.id), note);
    setToast({ title: 'Note Created', message: 'Note added successfully.' });
  };

  const handleUpdateNote = async (note: Note) => {
    await updateDoc(doc(db, 'notes', note.id), note as any);
    setToast({ title: 'Note Updated', message: 'Note updated successfully.' });
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteDoc(doc(db, 'notes', noteId));
    setToast({ title: 'Note Deleted', message: 'Note deleted successfully.' });
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            tasks={getVisibleTasks()}
            projects={getVisibleProjects()}
            users={activeUsers}
            clients={clients}
            socialPosts={socialPosts}
            timeLogs={taskTimeLogs}
            currentUser={user}
            meetings={clientMeetings}
            notes={notes}
            milestones={projectMilestones}
            approvalSteps={approvalSteps}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onNavigateToTask={handleNavigateToTask}
            onNavigateToMeeting={() => setActiveView('clients')}
            onNavigateToPost={() => setActiveView('posting')}
            onViewAllTasks={() => setActiveView('tasks')}
            onViewAllApprovals={() => setActiveView('tasks')}
            onNavigateToUserTasks={() => setActiveView('tasks')}
            onNavigateToClient={() => setActiveView('clients')}
            onScheduleMeeting={() => setActiveView('clients')}
            onNavigateToCalendar={() => setActiveView('calendar')}
          />
        );
      case 'clients':
        return (
          <ClientsHub
            clients={clients}
            projects={getVisibleProjects()}
            tasks={activeTasks}
            milestones={projectMilestones}
            invoices={invoices}
            socialLinks={clientSocialLinks}
            notes={clientNotes}
            meetings={clientMeetings}
            brandAssets={clientBrandAssets}
            monthlyReports={clientMonthlyReports}
            files={getVisibleFiles()}
            folders={folders}
            users={activeUsers}
            accountManagers={activeUsers.filter(u => u.department === 'Accounts' || u.department === 'Management')}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onArchiveProject={handleArchiveProject}
            onUnarchiveProject={handleUnarchiveProject}
            onOpenProject={handleOpenProject}
            onAddSocialLink={handleAddSocialLink}
            onUpdateSocialLink={handleUpdateSocialLink}
            onDeleteSocialLink={handleDeleteSocialLink}
            onAddNote={handleAddClientNote}
            onUpdateNote={handleUpdateClientNote}
            onDeleteNote={handleDeleteClientNote}
            onAddMeeting={handleAddClientMeeting}
            onUpdateMeeting={handleUpdateClientMeeting}
            onDeleteMeeting={handleDeleteClientMeeting}
            onAddBrandAsset={handleAddBrandAsset}
            onUpdateBrandAsset={handleUpdateBrandAsset}
            onDeleteBrandAsset={handleDeleteBrandAsset}
            onAddMonthlyReport={handleAddMonthlyReport}
            onUpdateMonthlyReport={handleUpdateMonthlyReport}
            onDeleteMonthlyReport={handleDeleteMonthlyReport}
            onUploadFile={handleUploadFile}
            checkPermission={checkPermission}
            currentUser={user}
          />
        );
      case 'projects':
        return (
          <ProjectsHub
            projects={getVisibleProjects()}
            clients={clients}
            users={activeUsers}
            members={projectMembers}
            milestones={projectMilestones}
            activityLogs={projectLogs}
            marketingAssets={projectMarketingAssets}
            files={getVisibleFiles()}
            folders={folders}
            freelancers={freelancers}
            assignments={assignments}
            tasks={activeTasks}
            approvalSteps={approvalSteps}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onAddMember={handleAddProjectMember}
            onAddFreelancerAssignment={handleAddFreelancerAssignment}
            onRemoveMember={handleRemoveProjectMember}
            onRemoveFreelancerAssignment={handleRemoveFreelancerAssignment}
            onAddMilestone={handleAddProjectMilestone}
            onUpdateMilestone={handleUpdateProjectMilestone}
            onAddMarketingAsset={handleAddProjectMarketingAsset}
            onUpdateMarketingAsset={handleUpdateProjectMarketingAsset}
            onDeleteMarketingAsset={handleDeleteProjectMarketingAsset}
            onUploadFile={handleUploadFile}
            onCreateFolder={handleCreateFolder}
            initialSelectedProjectId={targetProjectId}
            checkPermission={checkPermission}
            onNavigateToTask={handleNavigateToTask}
          />
        );
      case 'tasks':
        return (
          <TasksHub
            tasks={getVisibleTasks()}
            projects={getVisibleProjects()}
            users={activeUsers}
            comments={taskComments}
            timeLogs={taskTimeLogs}
            dependencies={taskDependencies}
            activityLogs={taskLogs}
            approvalSteps={approvalSteps}
            clientApprovals={clientApprovals}
            files={getVisibleFiles()}
            milestones={projectMilestones}
            currentUser={user}
            // Dynamic Workflows Props
            workflowTemplates={workflowTemplates}
            projectMembers={projectMembers}
            roles={systemRoles}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onAddComment={handleAddTaskComment}
            onAddTimeLog={handleAddTaskTimeLog}
            onAddDependency={handleAddTaskDependency}
            onUpdateApprovalStep={handleUpdateApprovalStep}
            onAddApprovalSteps={handleAddApprovalSteps}
            onUpdateClientApproval={handleUpdateClientApproval}
            onAddClientApproval={handleAddClientApproval}
            onUploadFile={handleUploadFile}
            onNotify={handleNotify}
            checkPermission={checkPermission}
            onDeleteTask={handleDeleteTask}
            initialSelectedTaskId={targetTaskId}
            onAddSocialPost={handleAddSocialPost}
            leaveRequests={leaveRequests}
          />
        );
      case 'posting':
        if (!checkPermission(PERMISSIONS.POSTING.VIEW_DEPT) && !checkPermission(PERMISSIONS.POSTING.VIEW_ALL)) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
        return (
          <PostingHub
            socialPosts={socialPosts}
            tasks={activeTasks}
            projects={projects}
            clients={clients}
            users={activeUsers}
            currentUser={user}
            checkPermission={checkPermission}
            onUpdatePost={handleUpdateSocialPost}
            onArchiveTask={handleArchiveTask}
            onNotify={handleNotify}
            files={files}
            comments={taskComments}
          />
        );
      case 'assets':
        return (
          <FilesHub
            files={getVisibleFiles()}
            folders={folders}
            projects={getVisibleProjects()}
            clients={clients}
            users={activeUsers}
            onUpload={handleUploadFile}
            onDelete={handleDeleteFile}
            onMove={() => { }}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        );
      case 'production':
        if (!checkPermission(PERMISSIONS.PRODUCTION.VIEW)) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
        return (
          <ProductionHub
            assets={productionAssets} // Passing legacy just in case, though component uses specific props
            shotLists={shotLists}
            callSheets={callSheets}
            locations={locations}
            equipment={equipment}
            projects={getVisibleProjects()}
            users={activeUsers}
            leaveRequests={leaveRequests}
            onAddShotList={handleAddShotList}
            onAddCallSheet={handleAddCallSheet}
            onAddLocation={handleAddLocation}
            onAddEquipment={handleAddEquipment}
            onUpdateEquipment={handleUpdateEquipment}
            projectMembers={projectMembers}
          />
        );
      case 'network':
        return (
          <VendorsHub
            vendors={vendors}
            freelancers={freelancers}
            assignments={assignments}
            serviceOrders={serviceOrders}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onAddFreelancer={handleAddFreelancer}
            onUpdateFreelancer={handleUpdateFreelancer}
          />
        );
      case 'finance':
        if (!checkPermission(PERMISSIONS.FINANCE.VIEW_OWN) && !checkPermission(PERMISSIONS.FINANCE.VIEW_PROJECT) && !checkPermission(PERMISSIONS.FINANCE.VIEW_ALL)) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
        return (
          <FinanceHub
            invoices={invoices}
            quotations={quotations}
            payments={payments}
            expenses={expenses}
            projects={projects}
            clients={clients}
            onAddInvoice={handleAddInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onAddQuotation={handleAddQuotation}
            onUpdateQuotation={handleUpdateQuotation}
            onAddPayment={handleAddPayment}
            onAddExpense={handleAddExpense}
          />
        );
      case 'hr':
        return (
          <TeamHub
            users={activeUsers}
            tasks={tasks}
            leaveRequests={leaveRequests}
            attendanceRecords={attendanceRecords}
            roles={systemRoles}
            departments={departments}
            projects={projects}
            checkPermission={checkPermission}
            currentUser={user}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onAddLeaveRequest={handleAddLeaveRequest}
            onUpdateLeaveRequest={handleUpdateLeaveRequest}
            onDeleteLeaveRequest={() => { }} // Placeholder if not defined
            onClockIn={() => { }} // Placeholder
            onClockOut={() => { }} // Placeholder
            onAddDepartment={handleAddDepartment}
            onUpdateDepartment={handleUpdateDepartment}
            onDeleteDepartment={handleDeleteDepartment}
          />
        );
      case 'calendar':
        return (
          <UnifiedCalendar
            tasks={activeTasks}
            callSheets={callSheets}
            socialPosts={socialPosts}
            milestones={projectMilestones}
            leaveRequests={leaveRequests}
            users={safeUsers}
            checkPermission={checkPermission}
          />
        );
      case 'analytics':
        return (
          <AnalyticsHub
            tasks={activeTasks}
            projects={projects}
            invoices={invoices}
            users={activeUsers}
            payments={payments}
            expenses={expenses}
            clients={clients}
          />
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            {canSendNotifications && user && (
              <NotificationConsole
                currentUserId={user.id}
                users={activeUsers}
                projects={projects}
                roles={Array.isArray(systemRoles) ? systemRoles : []}
                onSend={handleManualNotificationSend}
                onEnablePush={requestPermissionAndRegister}
                permissionState={permissionState}
                currentToken={messagingToken}
              />
            )}
            <NotificationsHub
              notifications={notifications}
              preferences={notificationPreferences}
              onMarkAsRead={handleMarkNotificationRead}
              onMarkAllAsRead={handleMarkAllNotificationsRead}
              onDelete={handleDeleteNotification}
              onUpdatePreferences={handleUpdatePreferences}
            />
          </div>
        );
      case 'admin':
        // Only GM can access
        if (!checkPermission(PERMISSIONS.ROLES.VIEW) && !checkPermission(PERMISSIONS.ADMIN_SETTINGS.VIEW)) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
        return (
          <AdminHub
            settings={appSettings}
            users={users}
            roles={systemRoles}
            auditLogs={auditLogs}
            workflowTemplates={workflowTemplates}
            departments={departments}
            onUpdateUser={handleUpdateUser}
            onAddUser={handleAddUser}
            onUpdateRole={handleUpdateRole}
            onAddRole={handleAddRole}
            onDeleteRole={handleDeleteRole}
            onUpdateWorkflow={handleUpdateWorkflow}
            onAddWorkflow={handleAddWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onSyncRoles={handleSyncRoles}
            onAddDepartment={handleAddDepartment}
            onUpdateDepartment={handleUpdateDepartment}
            onDeleteDepartment={handleDeleteDepartment}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">?</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-600">Module Under Construction</h2>
            <p className="mt-2">The {activeView} module is coming soon to IRIS OS.</p>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setIsSidebarOpen(false);
        }}
        currentUserRole={user.role}
        isSidebarOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <Header
        currentUser={user}
        notifications={notifications}
        toggleAI={() => setIsAIOpen(true)}
        onLogout={handleLogout}
        onMarkAsRead={handleMarkNotificationRead}
        onViewAllNotifications={() => setActiveView('notifications')}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="main">
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
                onClick={handleDismissPushPrompt}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {renderContent()}

        {/* Toast Notification */}
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
              <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      {/* <ReloadPrompt /> - Disabled to avoid conflict with Firebase messaging SW */}
      <PWAInstallPrompt />
    </div>
  );
};

export default App;
