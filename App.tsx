import React, { useState, useEffect } from 'react';
import { USERS, TASKS, PROJECTS, INVOICES, PRODUCTION_ASSETS, CLIENTS, PROJECT_MEMBERS, PROJECT_MILESTONES, PROJECT_ACTIVITY_LOGS, TASK_COMMENTS, TASK_TIME_LOGS, TASK_DEPENDENCIES, TASK_ACTIVITY_LOGS, APPROVAL_STEPS, CLIENT_APPROVALS, FILES, FOLDERS, AGENCY_LOCATIONS, AGENCY_EQUIPMENT, SHOT_LISTS, CALL_SHEETS, QUOTATIONS, PAYMENTS, EXPENSES, VENDORS, FREELANCERS, FREELANCER_ASSIGNMENTS, VENDOR_SERVICE_ORDERS, LEAVE_REQUESTS, ATTENDANCE_RECORDS, NOTIFICATIONS, DEFAULT_PREFERENCES, DEFAULT_BRANDING, DEFAULT_SETTINGS, DEFAULT_ROLES, AUDIT_LOGS, WORKFLOW_TEMPLATES } from './constants';
import { Task, Project, Invoice, ProductionAsset, TaskStatus, User, Client, ProjectMember, ProjectMilestone, ProjectActivityLog, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval, AgencyFile, FileFolder, ShotList, CallSheet, AgencyLocation, AgencyEquipment, Quotation, Payment, Expense, Vendor, Freelancer, FreelancerAssignment, VendorServiceOrder, LeaveRequest, AttendanceRecord, Notification, NotificationPreference, NotificationType, AppBranding, AppSettings, RoleDefinition, AuditLog, WorkflowTemplate } from './types';
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
import AdminHub from './components/AdminHub';
import Login from './components/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import { useAuth } from './contexts/AuthContext';
import { X, Bell } from 'lucide-react';
import { useFirestoreCollection } from './hooks/useFirestore';
import { doc, setDoc, updateDoc, addDoc, collection, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

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
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  
  // -- Application State (Persisted) --
  const { currentUser: user, loading, logout, checkPermission } = useAuth();
  const [tasks] = useFirestoreCollection<Task>('tasks', TASKS); 
  const [projects] = useFirestoreCollection<Project>('projects', PROJECTS);
  const [users] = useFirestoreCollection<User>('users', USERS);
  const [clients] = useFirestoreCollection<Client>('clients', CLIENTS);
  
  // Finance State
  const [invoices] = useFirestoreCollection<Invoice>('invoices', INVOICES);
  const [quotations] = useFirestoreCollection<Quotation>('quotations', QUOTATIONS);
  const [payments] = useFirestoreCollection<Payment>('payments', PAYMENTS);
  const [expenses] = useFirestoreCollection<Expense>('expenses', EXPENSES);

  // Project Related State
  const [projectMembers] = useFirestoreCollection<ProjectMember>('project_members', PROJECT_MEMBERS);
  const [projectMilestones] = useFirestoreCollection<ProjectMilestone>('project_milestones', PROJECT_MILESTONES);
  const [projectLogs] = useFirestoreCollection<ProjectActivityLog>('project_activity_logs', PROJECT_ACTIVITY_LOGS);

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
  const [notifications] = useFirestoreCollection<Notification>('notifications', NOTIFICATIONS);
  const [notificationPreferences] = useState<NotificationPreference>(DEFAULT_PREFERENCES);

  // Admin & Settings State
  // const [appBranding, setAppBranding] = useStickyState<AppBranding>(DEFAULT_BRANDING, 'iris_branding');
  // const [appSettings, setAppSettings] = useStickyState<AppSettings>(DEFAULT_SETTINGS, 'iris_settings');
  const [systemRoles] = useFirestoreCollection<RoleDefinition>('roles', DEFAULT_ROLES);
  const [auditLogs] = useFirestoreCollection<AuditLog>('audit_logs', AUDIT_LOGS);
  const [workflowTemplates] = useFirestoreCollection<WorkflowTemplate>('workflow_templates', WORKFLOW_TEMPLATES);
  
  const [appBranding] = useState<AppBranding>(DEFAULT_BRANDING);
  const [appSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Defensive check for users array
  const safeUsers = Array.isArray(users) ? users : [];
  const activeUsers = safeUsers.filter(u => u && u.status !== 'inactive');

  // --- Effect: Dynamic Branding ---
  useEffect(() => {
    // Inject CSS variables for theming
    const root = document.documentElement;
    root.style.setProperty('--primary', appBranding.primaryColor);
    root.style.setProperty('--sidebar-bg', appBranding.sidebarColor);
    root.style.setProperty('--sidebar-border', appBranding.sidebarColor === '#0f172a' ? '#1e293b' : 'rgba(255,255,255,0.1)');
    document.title = appBranding.appName;
  }, [appBranding]);

  if (!user) {
    return <Login />;
  }

  // Debugging Force Password Change
  console.log('Current User:', user.name, 'Force Change:', user.forcePasswordChange);

  if (user.forcePasswordChange) {
    return <ForcePasswordChange />;
  }

  // --- Handlers ---

  const handleLogout = async () => {
    await logout();
  };

  // Notification Logic
  const handleNotify = async (type: string, title: string, message: string) => {
      // 1. Create notification
      const newNotification: Notification = {
          id: `notif${Date.now()}`,
          userId: user!.id,
          type: type as NotificationType,
          title,
          message,
          isRead: false,
          createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', newNotification.id), newNotification);

      // 2. Show toast if enabled (basic implementation)
      setToast({ title, message });
      setTimeout(() => setToast(null), 4000);
  };

  const handleMarkNotificationRead = async (id: string) => {
      await updateDoc(doc(db, 'notifications', id), { isRead: true, readAt: new Date().toISOString() });
  };

  const handleMarkAllNotificationsRead = async () => {
      notifications.forEach(async (n) => {
        if (!n.isRead) {
           await updateDoc(doc(db, 'notifications', n.id), { isRead: true, readAt: new Date().toISOString() });
        }
      });
  };
  
  const handleDeleteNotification = async (id: string) => {
      await deleteDoc(doc(db, 'notifications', id));
  };

  const handleUpdatePreferences = (prefs: NotificationPreference) => {
      // setNotificationPreferences(prefs);
  };


  // -- Task Handlers --
  const handleAddTask = async (newTask: Task) => {
    await setDoc(doc(db, 'tasks', newTask.id), newTask);
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
      if (!checkPermission('tasks.delete')) {
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
      // Mock upload for now since Storage is disabled
      let fileUrl = file.url || 'https://picsum.photos/800/600';
      
      const fileToSave = { ...file, url: fileUrl };
      delete (fileToSave as any).file;

      await setDoc(doc(db, 'files', file.id), fileToSave);
      handleNotify('system', 'File Uploaded', `${file.name} was uploaded successfully (Mock).`);
  };
  
  const handleCreateFolder = async (folder: FileFolder) => {
      await setDoc(doc(db, 'folders', folder.id), folder);
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
    if(user) {
        const log: ProjectActivityLog = {
            id: `log${Date.now()}`,
            projectId: newProject.id,
            userId: user.id,
            type: 'status_change',
            message: 'Project created',
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'project_activity_logs', log.id), log);
        handleNotify('system', 'Project Created', `Project "${newProject.name}" is now active.`);
    }
  };
  
  const handleUpdateProject = async (updatedProject: Project) => {
      await updateDoc(doc(db, 'projects', updatedProject.id), updatedProject as any);
       if(user) {
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
       if(user && milestone.status === 'completed') {
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

  const handleAddClient = async (newClient: Client) => {
    await setDoc(doc(db, 'clients', newClient.id), newClient);
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    await updateDoc(doc(db, 'clients', updatedClient.id), updatedClient as any);
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

      await batch.commit();
      
      addAuditLog('delete', 'Client', clientId, `Deleted client and all associated data`);
      setToast({ title: 'Success', message: 'Client and all associated data deleted successfully.' });

    } catch (error) {
      console.error("Error deleting client:", error);
      setToast({ title: 'Error', message: 'Failed to delete client data completely.' });
    }
  };

  // -- Admin Handlers --
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

  const handleUpdateBranding = async (newBranding: AppBranding) => {
      // setAppBranding(newBranding);
      await addAuditLog('update_branding', 'AppBranding', newBranding.id, 'Updated app branding colors/theme');
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
      // setAppSettings(newSettings);
      await addAuditLog('update_settings', 'AppSettings', newSettings.id, 'Updated global settings');
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
      await updateDoc(doc(db, 'workflow_templates', wf.id), wf as any);
      await addAuditLog('update_workflow', 'WorkflowTemplate', wf.id, `Updated workflow ${wf.name}`);
  };

  const handleAddWorkflow = async (wf: WorkflowTemplate) => {
      await setDoc(doc(db, 'workflow_templates', wf.id), wf);
      await addAuditLog('create_workflow', 'WorkflowTemplate', wf.id, `Created workflow ${wf.name}`);
  };

  const handleDeleteWorkflow = async (wfId: string) => {
      await deleteDoc(doc(db, 'workflow_templates', wfId));
      await addAuditLog('delete_workflow', 'WorkflowTemplate', wfId, `Deleted workflow ${wfId}`);
  };

  // -- Permission-Based Data Scoping --
  const getVisibleTasks = () => {
      if (!user) return [];
      // Filter out soft-deleted tasks
      const activeTasks = tasks.filter(t => !t.isDeleted);
      
      if (checkPermission('tasks.view_all')) return activeTasks;
      if (checkPermission('tasks.view_own')) {
          return activeTasks.filter(t => t.assigneeIds.includes(user.id) || t.createdBy === user.id);
      }
      return [];
  };

  const getVisibleProjects = () => {
      if (!user) return [];
      if (checkPermission('projects.view_all')) return projects;
      if (checkPermission('projects.view_own')) {
          return projects.filter(p => 
              p.accountManagerId === user.id || 
              projectMembers.some(pm => pm.projectId === p.id && pm.userId === user.id)
          );
      }
      return [];
  };

  const getVisibleFiles = () => {
      if (!user) return [];
      if (checkPermission('files.view_all')) return files;
      if (checkPermission('files.view_own')) {
          return files.filter(f => f.uploaderId === user.id);
      }
      return [];
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard tasks={getVisibleTasks()} projects={getVisibleProjects()} />;
      case 'clients':
        return (
          <ClientsHub 
            clients={clients} 
            projects={getVisibleProjects()} 
            invoices={invoices}
            accountManagers={activeUsers.filter(u => u.department === 'Accounts' || u.department === 'Management')}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
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
            files={getVisibleFiles()}
            folders={folders}
            freelancers={freelancers}
            assignments={assignments}
            tasks={tasks}
            approvalSteps={approvalSteps}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onAddMember={handleAddProjectMember}
            onAddFreelancerAssignment={handleAddFreelancerAssignment}
            onRemoveMember={handleRemoveProjectMember}
            onRemoveFreelancerAssignment={handleRemoveFreelancerAssignment}
            onAddMilestone={handleAddProjectMilestone}
            onUpdateMilestone={handleUpdateProjectMilestone}
            onUploadFile={handleUploadFile}
            onCreateFolder={handleCreateFolder}
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
          />
        );
      case 'assets':
        return (
          <FilesHub 
            files={getVisibleFiles()}
            folders={folders}
            projects={getVisibleProjects()}
            users={activeUsers}
            onUpload={handleUploadFile}
            onDelete={() => {}}
            onMove={() => {}}
            onCreateFolder={handleCreateFolder}
          />
        );
      case 'production':
        if (!checkPermission('production.view')) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
        return (
          <ProductionHub 
            assets={productionAssets} // Passing legacy just in case, though component uses specific props
            shotLists={shotLists}
            callSheets={callSheets}
            locations={locations}
            equipment={equipment}
            projects={projects}
            users={activeUsers}
            onAddShotList={handleAddShotList}
            onAddCallSheet={handleAddCallSheet}
            onAddLocation={handleAddLocation}
            onAddEquipment={handleAddEquipment}
            onUpdateEquipment={handleUpdateEquipment}
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
        if (!checkPermission('finance.view')) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
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
            users={users}
            tasks={tasks}
            leaveRequests={leaveRequests}
            attendanceRecords={attendanceRecords}
            roles={systemRoles}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onAddLeaveRequest={handleAddLeaveRequest}
            onUpdateLeaveRequest={handleUpdateLeaveRequest}
          />
        );
      case 'analytics':
        return (
          <AnalyticsHub 
            tasks={tasks}
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
          <NotificationsHub 
             notifications={notifications}
             preferences={notificationPreferences}
             onMarkAsRead={handleMarkNotificationRead}
             onMarkAllAsRead={handleMarkAllNotificationsRead}
             onDelete={handleDeleteNotification}
             onUpdatePreferences={handleUpdatePreferences}
          />
        );
      case 'admin':
         // Only GM can access
         if (!checkPermission('admin.view_console')) return <div className="p-8 text-center text-slate-400">Access Denied.</div>;
         return (
            <AdminHub 
               branding={appBranding}
               settings={appSettings}
               users={users}
               roles={systemRoles}
               auditLogs={auditLogs}
               workflowTemplates={workflowTemplates}
               onUpdateBranding={handleUpdateBranding}
               onUpdateSettings={handleUpdateSettings}
               onUpdateUser={handleUpdateUser}
               onAddUser={handleAddUser}
               onUpdateRole={handleUpdateRole}
               onAddRole={handleAddRole}
               onDeleteRole={handleDeleteRole}
               onUpdateWorkflow={handleUpdateWorkflow}
               onAddWorkflow={handleAddWorkflow}
               onDeleteWorkflow={handleDeleteWorkflow}
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
    <div className="min-h-screen flex font-sans" style={{ backgroundColor: appBranding.backgroundColor, color: appBranding.textColor }}>
      <Sidebar activeView={activeView} setActiveView={setActiveView} currentUserRole={user.role} />
      
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header 
          currentUser={user} 
          notifications={notifications}
          toggleAI={() => setIsAIOpen(true)} 
          onLogout={handleLogout} 
          onMarkAsRead={handleMarkNotificationRead}
          onViewAllNotifications={() => setActiveView('notifications')}
        />
        
        <main className="flex-1 mt-16 p-8 overflow-y-auto relative">
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
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

export default App;
