import React, { useState, useMemo, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Filter, Users2, Clock,
  Link as LinkIcon, Paperclip, Plus, X, MessageSquare,
  Eye, ArrowRight, User as UserIcon, Loader2,
  FileText, Calendar, Layers, Search, GitMerge, ThumbsUp,
  CornerUpLeft, ChevronDown, ExternalLink
} from 'lucide-react';
import { DriveThumbnail, DriveTypeBadge } from './common/DrivePreview';
import QCReviewDrawer from './QCReviewDrawer';
import { extractDriveDeliverables, DriveDeliverable } from '../utils/driveUtils';
import {
  Task, User, Project, Client, ProjectMember, WorkflowTemplate,
  ApprovalStep, TaskComment, AgencyFile, QCReview, QCReviewAttachment,
  NotificationType, TaskStatus, ApprovalStatus
} from '../types';
import { PERMISSIONS } from '../lib/permissions';
import { approveFromQCHub, rejectFromQCHub } from '../utils/qcUtils';

import { useTaskStore } from '../stores/useTaskStore';
import { useQCStore } from '../stores/useQCStore';
import { useHRStore } from '../stores/useHRStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useClientStore } from '../stores/useClientStore';
import { useAdminStore } from '../stores/useAdminStore';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { useAuth } from '../contexts/AuthContext';
import { notifyUsers } from '../services/notificationService';

// ─── Helpers ──────────────────────────────────────────────────────────
const stepStatusConfig: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400', label: 'Pending' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Approved' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-400', label: 'Rejected' },
  revision_requested: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400', label: 'Revisions' },
  revision_submitted: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400', label: 'Resubmitted' },
  waiting: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500', label: 'Waiting' },
};

type TaskApprovalState = 'pending_my_review' | 'pending_others' | 'all_approved' | 'revision_requested' | 'revisions_required';

function getTaskApprovalState(task: Task, steps: ApprovalStep[], currentUserId: string): TaskApprovalState {
  if (task.status === 'revisions_required') return 'revisions_required';
  const myPendingStep = steps.find(s => s.approverId === currentUserId && s.status === 'pending');
  if (myPendingStep) return 'pending_my_review';
  const hasRevisionRequested = steps.some(s => s.status === 'revision_requested');
  if (hasRevisionRequested) return 'revision_requested';
  const allApproved = steps.every(s => s.status === 'approved' || s.status === 'revision_submitted');
  if (allApproved && steps.length > 0) return 'all_approved';
  return 'pending_others';
}

const SWIPE_THRESHOLD = 120;

// ─── Component ────────────────────────────────────────────────────────
const QualityControlHub: React.FC = () => {
  // ─── Store reads ──────────────────────────────────────────────────
  const { currentUser: authUser, checkPermission } = useAuth();
  const taskStore = useTaskStore();
  const qcStore = useQCStore();
  const hrStore = useHRStore();
  const projectStore = useProjectStore();
  const clientStore = useClientStore();
  const adminStoreData = useAdminStore();
  const fileStoreData = useFileStore();
  const { showToast, clearToast } = useUIStore();

  const tasks = useMemo(() => taskStore.tasks.filter(t => !t.isDeleted), [taskStore.tasks]);
  const qcReviews = qcStore.qcReviews;
  const users = useMemo(() => {
    const safe = Array.isArray(hrStore.users) ? hrStore.users : [];
    return safe.filter(u => u && u.status !== 'inactive');
  }, [hrStore.users]);
  const projects = projectStore.projects;
  const clients = clientStore.clients;
  const projectMembers = projectStore.projectMembers;
  const workflowTemplates = adminStoreData.workflowTemplates;
  const approvalSteps = taskStore.approvalSteps;
  const taskComments = taskStore.comments;
  const files = fileStoreData.files;
  const currentUser = useMemo(() => authUser ? {
    ...authUser,
    email: authUser.email || null,
    displayName: authUser.name,
  } as { id: string; email: string | null; displayName: string | null; name?: string; role?: string } : { id: '', email: null, displayName: null }, [authUser]);

  // ─── Wrapped actions ──────────────────────────────────────────────
  const onUpdateTask = useCallback(async (updatedTask: Task) => {
    const systemRoles = adminStoreData.systemRoles;
    await taskStore.updateTask(updatedTask, {
      tasks,
      userId: authUser!.id,
      workflowTemplates,
      qcReviews,
      projectMembers,
      activeUsers: users,
      systemRoles,
    });
  }, [taskStore, tasks, authUser, workflowTemplates, qcReviews, projectMembers, users, adminStoreData.systemRoles]);

  const onNotify = useCallback(async (
    type: NotificationType, title: string, message: string,
    recipientIds: string[] = [], entityId?: string, actionUrl?: string
  ) => {
    showToast({ title, message });
    setTimeout(() => clearToast(), 4000);
    if (recipientIds.length > 0) {
      try {
        await notifyUsers({ type, title, message, recipientIds, entityId, actionUrl, sendPush: false, createdBy: authUser?.id || 'system' });
      } catch (error) { console.error('Failed to create notification:', error); }
    }
  }, [showToast, clearToast, authUser?.id]);

  const onUploadFile = useCallback(async (file: AgencyFile) => {
    showToast({ title: 'Uploading...', message: `Uploading ${file.name}...` });
    try {
      const savedFile = await fileStoreData.uploadFile(file, { projects, clients, activeTasks: tasks, folders: fileStoreData.folders });
      showToast({ title: 'Success', message: `${file.name} uploaded successfully!` });
      return savedFile;
    } catch (error: any) {
      showToast({ title: 'Upload Failed', message: error.message || 'Failed to upload file.' });
      throw error;
    }
  }, [fileStoreData, projects, clients, tasks, showToast]);
  // ─── Tabs ─────────────────────────────────────────────────────────
  type TabId = 'review' | 'all' | 'history';
  const [activeTab, setActiveTab] = useState<TabId>('review');

  // ─── Filters ──────────────────────────────────────────────────────
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Rejection modal ─────────────────────────────────────────────
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectLinks, setRejectLinks] = useState<{ title: string; url: string }[]>([]);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);

  // ─── Submission state ─────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState<{ taskId: string; type: 'approve' | 'reject' } | null>(null);

  // ─── Card index for deck ──────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);

  // ─── Expanded card detail ─────────────────────────────────────────
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // ─── QC Review Drawer ─────────────────────────────────────────────
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const drawerTask = useMemo(() => tasks.find(t => t.id === drawerTaskId) || null, [tasks, drawerTaskId]);

  // ─── Derived data ─────────────────────────────────────────────────
  const currentUserObj = useMemo(() => users.find(u => u.id === currentUser.id), [users, currentUser.id]);
  const canManage = checkPermission(PERMISSIONS.QC.MANAGE);
  const canReview = checkPermission(PERMISSIONS.QC.REVIEW_APPROVE) || checkPermission(PERMISSIONS.QC.REVIEW_REJECT);

  // Tasks that are in the approval pipeline (awaiting_review with approval steps)
  const reviewableTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.isDeleted) return false;
      const steps = approvalSteps.filter(s => s.taskId === t.id);
      if (steps.length === 0) return false;
      // Include tasks that are in review, or have pending steps, or have revision_requested steps
      return t.status === 'awaiting_review' ||
        t.status === 'revisions_required' ||
        steps.some(s => s.status === 'pending' || s.status === 'revision_requested');
    });
  }, [tasks, approvalSteps]);

  // Tasks where I have a pending approval step
  const myPendingTasks = useMemo(() => {
    return reviewableTasks.filter(t => {
      const steps = approvalSteps.filter(s => s.taskId === t.id);
      const myPendingStep = steps.find(s => s.approverId === currentUser.id && s.status === 'pending');
      if (myPendingStep) return true;
      // Managers can see all pending tasks (but skip ones they already approved)
      if (canManage) {
        const hasActivePendingStep = steps.some(s => s.status === 'pending');
        const iAlreadyApproved = steps.some(s => s.approverId === currentUser.id && s.status === 'approved');
        return hasActivePendingStep && !iAlreadyApproved;
      }
      return false;
    });
  }, [reviewableTasks, approvalSteps, currentUser.id, canManage]);

  // Completed/history tasks (all steps approved or rejected/archived)
  const historyTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.isDeleted) return false;
      const steps = approvalSteps.filter(s => s.taskId === t.id);
      if (steps.length === 0) return false;
      return t.status === 'approved' || t.status === 'completed' || t.status === 'client_review' || t.status === 'client_approved';
    });
  }, [tasks, approvalSteps]);

  // Filtered tasks for the all/history tabs
  const filteredTasks = useMemo(() => {
    let result = activeTab === 'history' ? historyTasks : reviewableTasks;

    if (filterClient) {
      result = result.filter(t => {
        const proj = projects.find(p => p.id === t.projectId);
        return proj?.clientId === filterClient || t.client === filterClient;
      });
    }
    if (filterProject) {
      result = result.filter(t => t.projectId === filterProject);
    }
    if (filterStatus) {
      result = result.filter(t => t.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.client?.toLowerCase().includes(q) ||
        projects.find(p => p.id === t.projectId)?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [reviewableTasks, historyTasks, activeTab, filterClient, filterProject, filterStatus, searchQuery, projects]);

  // Counter chips
  const pendingMyCount = myPendingTasks.length;
  const totalInReview = reviewableTasks.length;
  const revisionCount = tasks.filter(t => {
    const steps = approvalSteps.filter(s => s.taskId === t.id);
    return steps.some(s => s.status === 'revision_requested') || t.status === 'revisions_required';
  }).length;
  const approvedCount = historyTasks.length;

  // Unique clients and projects for filters
  const clientOptions = useMemo(() => {
    const all = [...reviewableTasks, ...historyTasks];
    const ids = new Set(all.map(t => {
      const proj = projects.find(p => p.id === t.projectId);
      return proj?.clientId || '';
    }).filter(Boolean));
    return clients.filter(c => ids.has(c.id));
  }, [reviewableTasks, historyTasks, projects, clients]);

  const projectOptions = useMemo(() => {
    const all = [...reviewableTasks, ...historyTasks];
    const ids = new Set(all.map(t => t.projectId));
    return projects.filter(p => ids.has(p.id));
  }, [reviewableTasks, historyTasks, projects]);

  // ─── Review submission handlers (linked to approval steps) ────────
  const handleApprove = useCallback(async (taskId: string) => {
    if (isSubmitting) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsSubmitting(true);
    setSwipeFeedback({ taskId, type: 'approve' });

    try {
      const result = await approveFromQCHub({
        task,
        reviewerId: currentUser.id,
        reviewerRole: currentUserObj?.role || 'Unknown',
        approvalSteps,
        allQCReviews: qcReviews,
        users,
        workflowTemplates: workflowTemplates as any,
        createdBy: currentUser.id,
      });

      if (!result.success) {
        console.warn('QC approve failed:', result.message);
      }
    } catch (err) {
      console.error('QC approve error:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSwipeFeedback(null);
        setCurrentIndex(prev => Math.min(prev + 1, myPendingTasks.length - 1));
      }, 500);
    }
  }, [isSubmitting, tasks, currentUser.id, currentUserObj, approvalSteps, qcReviews, users, workflowTemplates, myPendingTasks.length]);

  const openRejectModal = useCallback((taskId: string) => {
    setRejectingTaskId(taskId);
    setRejectNote('');
    setRejectLinks([]);
    setRejectModalOpen(true);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectingTaskId || !rejectNote.trim() || isSubmitting) return;
    const task = tasks.find(t => t.id === rejectingTaskId);
    if (!task) return;

    setIsSubmitting(true);

    try {
      const attachments: QCReviewAttachment[] = rejectLinks
        .filter(l => l.url.trim())
        .map(l => ({ type: 'link' as const, title: l.title || l.url, url: l.url }));

      const result = await rejectFromQCHub({
        task,
        reviewerId: currentUser.id,
        reviewerRole: currentUserObj?.role || 'Unknown',
        note: rejectNote,
        attachments,
        approvalSteps,
        allQCReviews: qcReviews,
        users,
        createdBy: currentUser.id,
      });

      if (!result.success) {
        console.warn('QC reject failed:', result.message);
      }

      setRejectModalOpen(false);
      setRejectingTaskId(null);
      setSwipeFeedback({ taskId: rejectingTaskId, type: 'reject' });
      setTimeout(() => {
        setSwipeFeedback(null);
        setCurrentIndex(prev => Math.min(prev + 1, myPendingTasks.length - 1));
      }, 500);
    } catch (err) {
      console.error('QC reject error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [rejectingTaskId, rejectNote, rejectLinks, isSubmitting, tasks, currentUser.id, currentUserObj, approvalSteps, qcReviews, users, myPendingTasks.length]);

  // ─── Lookup helpers ───────────────────────────────────────────────
  const getUser = (uid: string) => users.find(u => u.id === uid);
  const getProject = (pid: string) => projects.find(p => p.id === pid);
  const getClient = (task: Task) => {
    if (task.client) return task.client;
    const proj = getProject(task.projectId);
    const cl = clients.find(c => c.id === proj?.clientId);
    return cl?.name || 'Unknown';
  };
  const getTaskSteps = (taskId: string) => approvalSteps.filter(s => s.taskId === taskId).sort((a, b) => a.level - b.level);
  const getTaskReviews = (taskId: string) => qcReviews.filter(r => r.taskId === taskId);
  const getTaskComments = (taskId: string) => taskComments.filter(c => c.taskId === taskId);
  const getTaskFiles = (taskId: string) => files.filter(f => f.taskId === taskId);

  // ─── Drive deliverables extraction ────────────────────────────────
  const getTaskDeliverables = useCallback((task: Task): DriveDeliverable[] => {
    const refs = (task.referenceLinks || []).map(l => ({ id: l.id, title: l.title, url: l.url }));
    const atts = (task.attachments || []).map(a => ({ id: a.id, name: a.name, url: a.url }));
    const dls = (task.deliveryLinks || []).map(d => ({ id: d.id, label: d.label, url: d.url, driveFileId: d.driveFileId }));
    return extractDriveDeliverables(refs, atts, dls);
  }, []);

  // ─── Approval Progress Bar Component ──────────────────────────────
  const ApprovalProgress: React.FC<{ steps: ApprovalStep[]; compact?: boolean }> = ({ steps, compact }) => {
    if (steps.length === 0) return null;
    return (
      <div className="space-y-2">
        {!compact && (
          <div className="flex items-center gap-2">
            <GitMerge className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Approval Chain</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const approver = getUser(step.approverId);
            const isMe = step.approverId === currentUser.id;
            return (
              <React.Fragment key={step.id}>
                <div className="relative group">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    step.status === 'approved' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' :
                    step.status === 'pending' ? `border-amber-400 bg-amber-500/20 text-amber-300 ${isMe ? 'ring-2 ring-amber-400/40 animate-pulse' : ''}` :
                    step.status === 'revision_requested' ? 'border-orange-400 bg-orange-500/20 text-orange-300' :
                    step.status === 'revision_submitted' ? 'border-blue-400 bg-blue-500/20 text-blue-300' :
                    'border-slate-600 bg-slate-500/10 text-slate-500'
                  }`}>
                    {step.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                     step.status === 'revision_requested' ? <CornerUpLeft className="w-4 h-4" /> :
                     <span>{step.level + 1}</span>
                    }
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                    <div className="font-medium">{approver?.name || 'Unassigned'}</div>
                    <div className="text-slate-400">{approver?.role} · {(stepStatusConfig[step.status] || stepStatusConfig.waiting).label}</div>
                    {isMe && step.status === 'pending' && <div className="text-amber-300 font-medium">Your turn!</div>}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full max-w-[24px] min-w-[8px] transition-all ${
                    step.status === 'approved' ? 'bg-emerald-500/50' : 'bg-slate-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Detailed Step List Component ─────────────────────────────────
  const ApprovalStepList: React.FC<{ steps: ApprovalStep[] }> = ({ steps }) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <GitMerge className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-300">Approval Steps</span>
        </div>
        <div className="relative pl-5">
          {/* Connecting line */}
          <div className="absolute left-[0.6rem] top-2 bottom-2 w-0.5 bg-slate-700/50" />
          
          {steps.map((step, i) => {
            const approver = getUser(step.approverId);
            const config = stepStatusConfig[step.status] || stepStatusConfig.waiting;
            const isMe = step.approverId === currentUser.id;

            return (
              <div key={step.id} className="relative flex items-start gap-3 py-2">
                {/* Step indicator */}
                <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 -ml-5 ${
                  step.status === 'approved' ? 'border-emerald-400 bg-emerald-500/20' :
                  step.status === 'pending' ? `border-amber-400 bg-amber-500/20 ${isMe ? 'ring-2 ring-amber-400/30' : ''}` :
                  step.status === 'revision_requested' ? 'border-orange-400 bg-orange-500/20' :
                  step.status === 'revision_submitted' ? 'border-blue-400 bg-blue-500/20' :
                  'border-slate-600 bg-slate-800'
                }`}>
                  {step.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {step.status === 'revision_requested' && <CornerUpLeft className="w-3 h-3 text-orange-400" />}
                  {(step.status === 'pending' || step.status === 'waiting' || step.status === 'revision_submitted') && (
                    <span className="text-[8px] font-bold text-slate-400">{step.level + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isMe ? 'text-amber-300' : 'text-white'}`}>
                      {approver?.name || 'Unassigned'}
                      {isMe && ' (You)'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.bg} ${config.text} ${config.border} border`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{approver?.role || 'Unknown role'}</div>
                  {step.comment && (
                    <div className={`mt-1 text-[11px] px-2 py-1 rounded ${
                      step.status === 'revision_requested' ? 'bg-orange-500/10 text-orange-200 border border-orange-500/20' :
                      'bg-white/5 text-slate-300'
                    }`}>
                      &ldquo;{step.comment}&rdquo;
                    </div>
                  )}
                  {step.reviewedAt && (
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(step.reviewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Swipe Card ───────────────────────────────────────────────────
  const SwipeCard: React.FC<{ task: Task; isTop: boolean }> = ({ task, isTop }) => {
    const [{ x, rot, scale }, api] = useSpring(() => ({
      x: 0,
      rot: 0,
      scale: isTop ? 1 : 0.95,
      config: { friction: 50, tension: 500 },
    }));

    const bind = useDrag(
      ({ active, movement: [mx] }) => {
        if (!isTop || isSubmitting) return;

        if (!active && Math.abs(mx) > SWIPE_THRESHOLD) {
          const dir = mx > 0 ? 1 : -1;
          api.start({
            x: dir * (window.innerWidth + 200),
            rot: dir * 30,
            config: { friction: 50, tension: 200 },
          });

          if (dir === 1) {
            handleApprove(task.id);
          } else {
            setTimeout(() => {
              api.start({ x: 0, rot: 0 });
              openRejectModal(task.id);
            }, 200);
          }
          return;
        }

        api.start({
          x: active ? mx : 0,
          rot: active ? mx / 15 : 0,
          scale: active ? 1.02 : 1,
          immediate: (name: string) => active && name === 'x',
        });
      },
      { axis: 'x', filterTaps: true }
    );

    const project = getProject(task.projectId);
    const clientName = getClient(task);
    const steps = getTaskSteps(task.id);
    const comments = getTaskComments(task.id);
    const taskFiles = getTaskFiles(task.id);
    const assignees = (task.assigneeIds || []).map(id => getUser(id)).filter(Boolean);
    const feedback = swipeFeedback?.taskId === task.id ? swipeFeedback.type : null;
    const deliverables = getTaskDeliverables(task);

    // Find my pending step
    const myStep = steps.find(s => s.approverId === currentUser.id && s.status === 'pending');
    const approvedSteps = steps.filter(s => s.status === 'approved').length;

    const approveOpacity = x.to(v => Math.max(0, Math.min(1, v / SWIPE_THRESHOLD)));
    const rejectOpacity = x.to(v => Math.max(0, Math.min(1, -v / SWIPE_THRESHOLD)));

    // Workflow template name
    const template = workflowTemplates.find(w => w.id === task.workflowTemplateId);

    return (
      <animated.div
        {...(isTop ? bind() : {})}
        style={{
          x,
          rotateZ: rot.to(r => `${r}deg`),
          scale,
          touchAction: 'pan-y',
        }}
        className={`absolute inset-0 rounded-2xl border bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing ${
          feedback === 'approve' ? 'ring-2 ring-emerald-500' : feedback === 'reject' ? 'ring-2 ring-red-500' : ''
        }`}
      >
        {/* Swipe indicators */}
        {isTop && (
          <>
            <animated.div
              style={{ opacity: approveOpacity }}
              className="absolute inset-0 bg-emerald-500/10 z-10 pointer-events-none flex items-center justify-center"
            >
              <div className="bg-emerald-500/20 backdrop-blur-sm rounded-full p-6 border-2 border-emerald-400">
                <ThumbsUp className="w-16 h-16 text-emerald-400" />
              </div>
            </animated.div>
            <animated.div
              style={{ opacity: rejectOpacity }}
              className="absolute inset-0 bg-red-500/10 z-10 pointer-events-none flex items-center justify-center"
            >
              <div className="bg-red-500/20 backdrop-blur-sm rounded-full p-6 border-2 border-red-400">
                <CornerUpLeft className="w-16 h-16 text-red-400" />
              </div>
            </animated.div>
          </>
        )}

        {/* Card content */}
        <div className="p-5 h-full overflow-y-auto custom-scrollbar space-y-4 pb-28">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{clientName}</div>
              <h3 className="text-lg font-bold text-white leading-tight truncate">{task.title}</h3>
              {project && (
                <div className="text-xs text-slate-400 mt-0.5 truncate">{project.name}</div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                task.type === 'design' ? 'border-blue-500/30 text-blue-300 bg-blue-500/10' :
                task.type === 'video' ? 'border-purple-500/30 text-purple-300 bg-purple-500/10' :
                task.type === 'content' ? 'border-teal-500/30 text-teal-300 bg-teal-500/10' :
                'border-slate-500/30 text-slate-300 bg-slate-500/10'
              }`}>
                {task.type}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                task.priority === 'urgent' ? 'border-red-500/30 text-red-300 bg-red-500/10' :
                task.priority === 'high' ? 'border-orange-500/30 text-orange-300 bg-orange-500/10' :
                task.priority === 'medium' ? 'border-yellow-500/30 text-yellow-300 bg-yellow-500/10' :
                'border-slate-500/30 text-slate-300 bg-slate-500/10'
              }`}>
                {task.priority}
              </span>
            </div>
          </div>

          {/* Your turn indicator */}
          {myStep && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-300">Your approval is needed (Step {myStep.level + 1} of {steps.length})</span>
            </div>
          )}

          {/* Drive deliverable thumbnails */}
          {deliverables.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Deliverables ({deliverables.length})
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setDrawerTaskId(task.id); }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Open Preview
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {deliverables.slice(0, 4).map((d, i) => (
                  <DriveThumbnail
                    key={d.id}
                    fileId={d.fileId}
                    typeHint={d.typeHint}
                    size={240}
                    className="w-24 h-16 shrink-0"
                    onClick={() => setDrawerTaskId(task.id)}
                  />
                ))}
                {deliverables.length > 4 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDrawerTaskId(task.id); }}
                    className="w-24 h-16 shrink-0 rounded-lg bg-white/5 border border-[color:var(--dash-glass-border)] flex items-center justify-center text-xs text-slate-400 hover:bg-white/10 transition-all"
                  >
                    +{deliverables.length - 4} more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Workflow & progress */}
          {template && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Layers className="w-3.5 h-3.5" />
              <span>{template.name}</span>
              <span className="text-slate-600">&middot;</span>
              <span className="text-emerald-400 font-medium">{approvedSteps}/{steps.length} approved</span>
            </div>
          )}

          {/* Approval chain visualization */}
          <ApprovalProgress steps={steps} />

          {/* Description */}
          {task.description && (
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{task.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.publishDate && (
              <span className="flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                Pub: {new Date(task.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {comments.length}
            </span>
            <span className="flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              {taskFiles.length}
            </span>
          </div>

          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Assignees:</span>
              {assignees.map(u => u && (
                <span key={u.id} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-300">
                  {u.name}
                </span>
              ))}
            </div>
          )}

          {/* Revision notes (if task was previously rejected) */}
          {task.revisionContext?.active && task.revisionContext.message && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold mb-1">Revision Requested</div>
              <p className="text-xs text-slate-300">{task.revisionContext.message}</p>
            </div>
          )}

          {/* Previous rejection notes from QC reviews */}
          {(() => {
            const taskReviews = getTaskReviews(task.id);
            const rejections = taskReviews.filter(r => r.decision === 'REJECTED' && r.note);
            if (rejections.length === 0) return null;
            return (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Previous Feedback</div>
                {rejections.map(r => (
                  <div key={r.id} className="text-xs text-slate-300">
                    <span className="font-medium text-red-300">{getUser(r.reviewerId)?.name}:</span> {r.note}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Reference links (non-Drive only — Drive links shown as thumbnails above) */}
          {(() => {
            const driveIds = new Set(deliverables.map(d => d.id));
            const nonDriveLinks = (task.referenceLinks || []).filter(l => !driveIds.has(l.id));
            if (nonDriveLinks.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2">
                {nonDriveLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {link.title || 'Reference'}
                  </a>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Bottom action bar */}
        {isTop && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[color:var(--dash-surface-elevated)] via-[color:var(--dash-surface-elevated)]/90 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => openRejectModal(task.id)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                <CornerUpLeft className="w-4 h-4" />
                Request Revisions
              </button>

              <button
                onClick={() => handleApprove(task.id)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                <ThumbsUp className="w-4 h-4" />
                Approve
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-600 mt-2">
              Swipe right to approve &middot; Swipe left to request revisions
            </p>
          </div>
        )}
      </animated.div>
    );
  };

  // ─── Task list card (for All / History tabs) ──────────────────────
  const TaskListCard: React.FC<{ task: Task }> = ({ task }) => {
    const project = getProject(task.projectId);
    const clientName = getClient(task);
    const steps = getTaskSteps(task.id);
    const approvedSteps = steps.filter(s => s.status === 'approved').length;
    const totalSteps = steps.length;
    const myPendingStep = steps.find(s => s.approverId === currentUser.id && s.status === 'pending');
    const state = getTaskApprovalState(task, steps, currentUser.id);
    const isExpanded = expandedTaskId === task.id;
    const deliverables = getTaskDeliverables(task);

    const statusColor = state === 'pending_my_review' ? 'border-amber-500/30 bg-amber-500/5' :
                         state === 'all_approved' ? 'border-emerald-500/30 bg-emerald-500/5' :
                         state === 'revision_requested' || state === 'revisions_required' ? 'border-orange-500/30 bg-orange-500/5' :
                         'border-[color:var(--dash-glass-border)]';

    return (
      <div className={`rounded-xl border bg-[color:var(--dash-surface-elevated)]/80 transition-all hover:shadow-lg ${statusColor}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{clientName}</div>
                {myPendingStep && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-medium flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Your turn
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-white mt-0.5 truncate">{task.title}</h4>
              {project && <div className="text-xs text-slate-400 truncate">{project.name}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                state === 'all_approved' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' :
                state === 'pending_my_review' ? 'border-amber-500/30 text-amber-300 bg-amber-500/10' :
                state === 'revision_requested' || state === 'revisions_required' ? 'border-orange-500/30 text-orange-300 bg-orange-500/10' :
                'border-slate-500/30 text-slate-400 bg-slate-500/10'
              }`}>
                {state === 'all_approved' ? '✓ Approved' :
                 state === 'pending_my_review' ? 'Needs Your Review' :
                 state === 'revision_requested' || state === 'revisions_required' ? 'Revisions' :
                 'In Review'}
              </span>
            </div>
          </div>

          {/* Progress and meta */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {approvedSteps}/{totalSteps}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                task.type === 'design' ? 'border-blue-500/30 text-blue-300' :
                task.type === 'video' ? 'border-purple-500/30 text-purple-300' :
                task.type === 'content' ? 'border-teal-500/30 text-teal-300' :
                'border-slate-500/30 text-slate-300'
              }`}>
                {task.type}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Drive preview button */}
              {deliverables.length > 0 && (
                <button
                  onClick={() => setDrawerTaskId(task.id)}
                  className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1"
                  title={`Preview ${deliverables.length} deliverable${deliverables.length > 1 ? 's' : ''}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{deliverables.length}</span>
                </button>
              )}
              {/* Approve/reject buttons */}
              {myPendingStep && canReview && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleApprove(task.id)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    title="Approve"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openRejectModal(task.id)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    title="Request Revisions"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* Expand */}
              <button
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                className="p-1.5 rounded-lg bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Approval chain progress */}
          <div className="mt-3">
            <ApprovalProgress steps={steps} compact />
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-[color:var(--dash-glass-border)] mt-0 animate-in fade-in slide-in-from-top-2">
            <div className="mt-3">
              <ApprovalStepList steps={steps} />
            </div>

            {/* Drive deliverable thumbnails */}
            {deliverables.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Drive Deliverables ({deliverables.length})
                  </span>
                  <button
                    onClick={() => setDrawerTaskId(task.id)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Full Preview
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {deliverables.map((d) => (
                    <DriveThumbnail
                      key={d.id}
                      fileId={d.fileId}
                      typeHint={d.typeHint}
                      size={200}
                      className="w-28 h-20 shrink-0"
                      onClick={() => setDrawerTaskId(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Description</div>
                <p className="text-xs text-slate-300 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Revision context */}
            {task.revisionContext?.active && task.revisionContext.message && (
              <div className="mt-3 bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold mb-1">Revision Notes</div>
                <p className="text-xs text-slate-300">{task.revisionContext.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Quality Control</h1>
            <p className="text-sm text-slate-400">Review and approve tasks through the approval pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingMyCount > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" /> {pendingMyCount} Awaiting You
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-medium flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> {totalInReview} In Review
          </span>
          {revisionCount > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 font-medium flex items-center gap-1.5">
              <CornerUpLeft className="w-3.5 h-3.5" /> {revisionCount} Revisions
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {approvedCount} Completed
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[color:var(--dash-surface-elevated)]/50 backdrop-blur-sm border border-[color:var(--dash-glass-border)] rounded-xl p-1">
        {([
          { id: 'review' as TabId, label: 'My Reviews', count: myPendingTasks.length },
          { id: 'all' as TabId, label: 'All Tasks', count: totalInReview },
          { id: 'history' as TabId, label: 'History', count: approvedCount },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCurrentIndex(0); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 justify-center ${
              activeTab === tab.id
                ? 'bg-[color:var(--dash-primary)] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'
            }`}>{tab.count}</span>
          </button>
        ))}

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`ml-auto p-2 rounded-lg transition-all ${
            showFilters ? 'bg-[color:var(--dash-primary)]/20 text-[color:var(--dash-primary)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[color:var(--dash-surface-elevated)]/50 border border-[color:var(--dash-glass-border)] animate-in fade-in slide-in-from-top-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-[color:var(--dash-primary)] focus:border-[color:var(--dash-primary)]"
            />
          </div>
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white focus:ring-1 focus:ring-[color:var(--dash-primary)]"
          >
            <option value="">All Clients</option>
            {clientOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white focus:ring-1 focus:ring-[color:var(--dash-primary)]"
          >
            <option value="">All Projects</option>
            {projectOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white focus:ring-1 focus:ring-[color:var(--dash-primary)]"
          >
            <option value="">All Statuses</option>
            <option value="awaiting_review">Awaiting Review</option>
            <option value="revisions_required">Revisions Required</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'review' ? (
        // ─── Swipe Deck ──────────────────────────────────────────
        <div className="flex flex-col items-center">
          {myPendingTasks.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 inline-flex">
                <CheckCircle2 className="w-10 h-10 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">All caught up!</h3>
                <p className="text-sm text-slate-400 mt-1">No tasks pending your approval.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Navigation */}
              <div className="flex items-center gap-3 mb-6 text-sm text-slate-400">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-all disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium">
                  {Math.min(currentIndex + 1, myPendingTasks.length)} of {myPendingTasks.length}
                </span>
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(myPendingTasks.length - 1, prev + 1))}
                  disabled={currentIndex >= myPendingTasks.length - 1}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-all disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Card deck */}
              <div className="relative w-full max-w-lg" style={{ height: '620px' }}>
                {myPendingTasks.slice(currentIndex, currentIndex + 3).reverse().map((task, i, arr) => (
                  <SwipeCard
                    key={task.id}
                    task={task}
                    isTop={i === arr.length - 1}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        // ─── List View ───────────────────────────────────────────
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="p-3 rounded-full bg-white/5 border border-[color:var(--dash-glass-border)] inline-flex">
                <FileText className="w-8 h-8 text-slate-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">No tasks found</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {activeTab === 'history' ? 'No completed approval reviews yet.' : 'No tasks in the approval pipeline.'}
                </p>
              </div>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskListCard key={task.id} task={task} />
            ))
          )}
        </div>
      )}

      {/* ─── QC Review Drawer ──────────────────────────────────────── */}
      {drawerTask && (
        <QCReviewDrawer
          isOpen={!!drawerTask}
          onClose={() => setDrawerTaskId(null)}
          task={drawerTask}
          users={users}
          projects={projects}
          clients={clients}
          workflowTemplates={workflowTemplates}
          approvalSteps={approvalSteps}
          qcReviews={qcReviews}
          currentUserId={currentUser.id}
          canReview={canReview}
          isSubmitting={isSubmitting}
          onApprove={handleApprove}
          onReject={(taskId) => {
            setDrawerTaskId(null);
            openRejectModal(taskId);
          }}
        />
      )}

      {/* ─── Rejection Modal ──────────────────────────────────────── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[color:var(--dash-glass-border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-300">
                <CornerUpLeft className="w-5 h-5" />
                <h3 className="text-base font-semibold">Request Revisions</h3>
              </div>
              <button
                onClick={() => { setRejectModalOpen(false); setRejectingTaskId(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Note (required) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  What needs to change? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Explain what needs to be revised..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {/* Reference links */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Reference Links</label>
                  <button
                    onClick={() => setRejectLinks([...rejectLinks, { title: '', url: '' }])}
                    className="text-[10px] px-2 py-0.5 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Link
                  </button>
                </div>
                {rejectLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={link.title}
                      onChange={e => {
                        const updated = [...rejectLinks];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setRejectLinks(updated);
                      }}
                      placeholder="Title"
                      className="flex-1 px-2 py-1.5 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-xs text-white placeholder-slate-500"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={e => {
                        const updated = [...rejectLinks];
                        updated[i] = { ...updated[i], url: e.target.value };
                        setRejectLinks(updated);
                      }}
                      placeholder="https://..."
                      className="flex-[2] px-2 py-1.5 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-xs text-white placeholder-slate-500"
                    />
                    <button
                      onClick={() => setRejectLinks(rejectLinks.filter((_, idx) => idx !== i))}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[color:var(--dash-glass-border)] flex items-center justify-end gap-3">
              <button
                onClick={() => { setRejectModalOpen(false); setRejectingTaskId(null); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectNote.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Request Revisions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
          <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[color:var(--dash-primary)] animate-spin" />
            <span className="text-sm text-white font-medium">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControlHub;
