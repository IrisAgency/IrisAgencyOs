import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useSpring, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Filter, Users2, Clock,
  Link as LinkIcon, Paperclip, Plus, X, MessageSquare,
  Eye, ArrowRight, User as UserIcon, RefreshCcw, Loader2,
  FileText, Calendar, Layers, Search
} from 'lucide-react';
import {
  Task, User, Project, Client, ProjectMember, WorkflowTemplate,
  ApprovalStep, TaskComment, AgencyFile, QCReview, QCReviewAttachment,
  NotificationType, QCStatus, TaskStatus
} from '../types';
import { PERMISSIONS } from '../lib/permissions';
import { submitQCReview } from '../utils/qcUtils';

// ─── Props ────────────────────────────────────────────────────────────
interface QualityControlHubProps {
  tasks: Task[];
  qcReviews: QCReview[];
  users: User[];
  projects: Project[];
  clients: Client[];
  projectMembers: ProjectMember[];
  workflowTemplates: WorkflowTemplate[];
  approvalSteps: ApprovalStep[];
  taskComments: TaskComment[];
  files: AgencyFile[];
  currentUser: { id: string; email: string | null; displayName: string | null; name?: string; role?: string };
  checkPermission: (code: string) => boolean;
  onUpdateTask: (taskId: string, data: Partial<Task>) => void;
  onNotify: (type: NotificationType, title: string, message: string, recipientIds?: string[], entityId?: string, actionUrl?: string) => void;
  onUploadFile: (file: AgencyFile) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const statusColors: Record<QCStatus, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', icon: <Clock className="w-4 h-4" /> },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', icon: <CheckCircle2 className="w-4 h-4" /> },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30', icon: <XCircle className="w-4 h-4" /> },
  NEEDS_INTERVENTION: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', icon: <AlertTriangle className="w-4 h-4" /> },
};

const SWIPE_THRESHOLD = 120;

// ─── Component ────────────────────────────────────────────────────────
const QualityControlHub: React.FC<QualityControlHubProps> = ({
  tasks,
  qcReviews,
  users,
  projects,
  clients,
  projectMembers,
  workflowTemplates,
  approvalSteps,
  taskComments,
  files,
  currentUser,
  checkPermission,
  onUpdateTask,
  onNotify,
  onUploadFile,
}) => {
  // ─── Tabs ─────────────────────────────────────────────────────────
  type TabId = 'review' | 'all' | 'history';
  const [activeTab, setActiveTab] = useState<TabId>('review');

  // ─── Filters ──────────────────────────────────────────────────────
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<QCStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Rejection modal ─────────────────────────────────────────────
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectLinks, setRejectLinks] = useState<{ title: string; url: string }[]>([]);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);

  // ─── Reviewer assignment ──────────────────────────────────────────
  const [reviewerPanelTaskId, setReviewerPanelTaskId] = useState<string | null>(null);
  const [reviewerSearch, setReviewerSearch] = useState('');

  // ─── Submission state ─────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState<{ taskId: string; type: 'approve' | 'reject' } | null>(null);

  // ─── Card index for deck ──────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);

  // ─── Derived data ─────────────────────────────────────────────────
  const currentUserObj = useMemo(() => users.find(u => u.id === currentUser.id), [users, currentUser.id]);
  const canManage = checkPermission(PERMISSIONS.QC.MANAGE);
  const canReview = checkPermission(PERMISSIONS.QC.REVIEW_APPROVE) || checkPermission(PERMISSIONS.QC.REVIEW_REJECT);

  // Tasks that have QC enabled
  const qcTasks = useMemo(() => {
    return tasks.filter(t => t.qc?.enabled && !t.isDeleted);
  }, [tasks]);

  // Tasks pending MY review (for the review tab)
  const myPendingTasks = useMemo(() => {
    return qcTasks.filter(t => {
      if (t.qc?.status !== 'PENDING' && t.qc?.status !== 'NEEDS_INTERVENTION') return false;
      // Managers (GM/CD with qc.manage) can see ALL pending QC tasks
      if (canManage) {
        // Still skip tasks the manager already reviewed
        const myReview = qcReviews.find(r => r.taskId === t.id && r.reviewerId === currentUser.id);
        if (myReview && myReview.decision !== 'PENDING') return false;
        return true;
      }
      // Regular reviewers only see tasks they're assigned to
      if (!t.qc?.reviewers?.includes(currentUser.id)) return false;
      // Check if user hasn't already reviewed
      const myReview = qcReviews.find(r => r.taskId === t.id && r.reviewerId === currentUser.id);
      if (myReview && myReview.decision !== 'PENDING') return false;
      return true;
    });
  }, [qcTasks, qcReviews, currentUser.id, canManage]);

  // Filtered tasks for the all/history tabs
  const filteredTasks = useMemo(() => {
    let result = activeTab === 'history'
      ? qcTasks.filter(t => t.qc?.status === 'APPROVED' || t.qc?.status === 'REJECTED')
      : qcTasks;

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
      result = result.filter(t => t.qc?.status === filterStatus);
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
  }, [qcTasks, activeTab, filterClient, filterProject, filterStatus, searchQuery, projects]);

  // Counter chips
  const pendingCount = qcTasks.filter(t => t.qc?.status === 'PENDING').length;
  const interventionCount = qcTasks.filter(t => t.qc?.status === 'NEEDS_INTERVENTION').length;
  const approvedCount = qcTasks.filter(t => t.qc?.status === 'APPROVED').length;
  const rejectedCount = qcTasks.filter(t => t.qc?.status === 'REJECTED').length;

  // Unique clients and projects for filters
  const clientOptions = useMemo(() => {
    const ids = new Set(qcTasks.map(t => {
      const proj = projects.find(p => p.id === t.projectId);
      return proj?.clientId || '';
    }).filter(Boolean));
    return clients.filter(c => ids.has(c.id));
  }, [qcTasks, projects, clients]);

  const projectOptions = useMemo(() => {
    const ids = new Set(qcTasks.map(t => t.projectId));
    return projects.filter(p => ids.has(p.id));
  }, [qcTasks, projects]);

  // ─── Review submission handlers ───────────────────────────────────
  const handleApprove = useCallback(async (taskId: string) => {
    if (isSubmitting) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.qc) return;

    setIsSubmitting(true);
    setSwipeFeedback({ taskId, type: 'approve' });

    try {
      await submitQCReview({
        task,
        reviewerId: currentUser.id,
        reviewerRole: currentUserObj?.role || 'Unknown',
        decision: 'APPROVED',
        note: null,
        attachments: [],
        allQCReviews: qcReviews,
        users,
        createdBy: currentUser.id,
      });
    } catch (err) {
      console.error('QC approve error:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSwipeFeedback(null);
        // Move to next card
        setCurrentIndex(prev => Math.min(prev + 1, myPendingTasks.length - 1));
      }, 500);
    }
  }, [isSubmitting, tasks, currentUser.id, currentUserObj, qcReviews, users, myPendingTasks.length]);

  const openRejectModal = useCallback((taskId: string) => {
    setRejectingTaskId(taskId);
    setRejectNote('');
    setRejectLinks([]);
    setRejectModalOpen(true);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectingTaskId || !rejectNote.trim() || isSubmitting) return;
    const task = tasks.find(t => t.id === rejectingTaskId);
    if (!task || !task.qc) return;

    setIsSubmitting(true);

    try {
      const attachments: QCReviewAttachment[] = rejectLinks
        .filter(l => l.url.trim())
        .map(l => ({ type: 'link' as const, title: l.title || l.url, url: l.url }));

      await submitQCReview({
        task,
        reviewerId: currentUser.id,
        reviewerRole: currentUserObj?.role || 'Unknown',
        decision: 'REJECTED',
        note: rejectNote,
        attachments,
        allQCReviews: qcReviews,
        users,
        createdBy: currentUser.id,
      });

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
  }, [rejectingTaskId, rejectNote, rejectLinks, isSubmitting, tasks, currentUser.id, currentUserObj, qcReviews, users, myPendingTasks.length]);

  // ─── Reviewer management ──────────────────────────────────────────
  const handleToggleReviewer = useCallback(async (taskId: string, userId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task?.qc) return;
    const isReviewer = task.qc.reviewers.includes(userId);
    const newReviewers = isReviewer
      ? task.qc.reviewers.filter(id => id !== userId)
      : [...task.qc.reviewers, userId];

    onUpdateTask(taskId, {
      qc: { ...task.qc, reviewers: newReviewers },
    });
  }, [tasks, onUpdateTask]);

  // ─── Lookup helpers ───────────────────────────────────────────────
  const getUser = (uid: string) => users.find(u => u.id === uid);
  const getProject = (pid: string) => projects.find(p => p.id === pid);
  const getClient = (task: Task) => {
    if (task.client) return task.client;
    const proj = getProject(task.projectId);
    const cl = clients.find(c => c.id === proj?.clientId);
    return cl?.name || 'Unknown';
  };
  const getTaskReviews = (taskId: string) => qcReviews.filter(r => r.taskId === taskId);
  const getTaskComments = (taskId: string) => taskComments.filter(c => c.taskId === taskId);
  const getTaskFiles = (taskId: string) => files.filter(f => f.taskId === taskId);

  // ─── Swipe Card ───────────────────────────────────────────────────
  const SwipeCard: React.FC<{ task: Task; isTop: boolean }> = ({ task, isTop }) => {
    const [{ x, rot, scale }, api] = useSpring(() => ({
      x: 0,
      rot: 0,
      scale: isTop ? 1 : 0.95,
      config: { friction: 50, tension: 500 },
    }));

    const bind = useDrag(
      ({ active, movement: [mx], direction: [xDir], velocity: [vx], cancel }) => {
        if (!isTop || isSubmitting) return;

        // If released past threshold
        if (!active && Math.abs(mx) > SWIPE_THRESHOLD) {
          const dir = mx > 0 ? 1 : -1;
          api.start({
            x: dir * (window.innerWidth + 200),
            rot: dir * 30,
            config: { friction: 50, tension: 200 },
          });

          if (dir === 1) {
            // Swipe right → approve
            handleApprove(task.id);
          } else {
            // Swipe left → open reject modal
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
    const taskReviews = getTaskReviews(task.id);
    const comments = getTaskComments(task.id);
    const taskFiles = getTaskFiles(task.id);
    const assignees = (task.assigneeIds || []).map(id => getUser(id)).filter(Boolean);
    const feedback = swipeFeedback?.taskId === task.id ? swipeFeedback.type : null;

    // Visual indicators for swipe direction
    const approveOpacity = x.to(v => Math.max(0, Math.min(1, v / SWIPE_THRESHOLD)));
    const rejectOpacity = x.to(v => Math.max(0, Math.min(1, -v / SWIPE_THRESHOLD)));

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
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              </div>
            </animated.div>
            <animated.div
              style={{ opacity: rejectOpacity }}
              className="absolute inset-0 bg-red-500/10 z-10 pointer-events-none flex items-center justify-center"
            >
              <div className="bg-red-500/20 backdrop-blur-sm rounded-full p-6 border-2 border-red-400">
                <XCircle className="w-16 h-16 text-red-400" />
              </div>
            </animated.div>
          </>
        )}

        {/* Card content */}
        <div className="p-5 h-full overflow-y-auto custom-scrollbar space-y-4">
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

          {/* Reviewer status */}
          {task.qc && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Review Status:</span>
                {task.qc.status && (() => {
                  const s = statusColors[task.qc!.status];
                  return (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${s.bg} ${s.text} ${s.border} flex items-center gap-1`}>
                      {s.icon}
                      {task.qc!.status.replace(/_/g, ' ')}
                    </span>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {task.qc.reviewers.map(rid => {
                  const reviewer = getUser(rid);
                  const review = taskReviews.find(r => r.reviewerId === rid);
                  const decision = review?.decision || 'PENDING';
                  return (
                    <div key={rid} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        decision === 'APPROVED' ? 'bg-emerald-400' :
                        decision === 'REJECTED' ? 'bg-red-400' :
                        'bg-slate-600'
                      }`} />
                      <span className="text-slate-300 truncate">{reviewer?.name || rid}</span>
                      <span className="text-slate-500 text-[10px]">{reviewer?.role || ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reject note from previous reviews */}
          {taskReviews.filter(r => r.decision === 'REJECTED' && r.note).length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Previous Rejection Notes</div>
              {taskReviews.filter(r => r.decision === 'REJECTED' && r.note).map(r => (
                <div key={r.id} className="text-xs text-slate-300">
                  <span className="font-medium text-red-300">{getUser(r.reviewerId)?.name}:</span> {r.note}
                </div>
              ))}
            </div>
          )}

          {/* Reference links & files quick peek */}
          {(task.referenceLinks?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.referenceLinks?.map((link, i) => (
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
          )}
        </div>

        {/* Bottom action bar (fallback buttons) */}
        {isTop && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[color:var(--dash-surface-elevated)] via-[color:var(--dash-surface-elevated)]/90 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => openRejectModal(task.id)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>

              {canManage && (
                <button
                  onClick={() => setReviewerPanelTaskId(task.id)}
                  className="p-2.5 rounded-full bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-300 hover:bg-white/10 transition-all"
                  title="Manage Reviewers"
                >
                  <Users2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => handleApprove(task.id)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-600 mt-2">
              Swipe right to approve · Swipe left to reject
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
    const taskReviews = getTaskReviews(task.id);
    const qcStatus = task.qc?.status || 'PENDING';
    const s = statusColors[qcStatus];
    const reviewedCount = taskReviews.filter(r => r.decision !== 'PENDING').length;
    const totalReviewers = task.qc?.reviewers?.length || 0;

    return (
      <div className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/80 p-4 hover:border-[color:var(--dash-primary)]/30 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{clientName}</div>
            <h4 className="text-sm font-semibold text-white mt-0.5 truncate">{task.title}</h4>
            {project && <div className="text-xs text-slate-400 truncate">{project.name}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${s.bg} ${s.text} ${s.border}`}>
              {s.icon}
              {qcStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Users2 className="w-3.5 h-3.5" />
              {reviewedCount}/{totalReviewers} reviewed
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
              'border-slate-500/30 text-slate-300'
            }`}>
              {task.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canManage && qcStatus !== 'APPROVED' && qcStatus !== 'REJECTED' && (
              <button
                onClick={() => setReviewerPanelTaskId(task.id)}
                className="p-1.5 rounded-lg bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Manage Reviewers"
              >
                <Users2 className="w-3.5 h-3.5" />
              </button>
            )}
            {canReview && (qcStatus === 'PENDING' || qcStatus === 'NEEDS_INTERVENTION') && (canManage || task.qc?.reviewers?.includes(currentUser.id)) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleApprove(task.id)}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  title="Approve"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openRejectModal(task.id)}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  title="Reject"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reviewer chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {task.qc?.reviewers?.map(rid => {
            const reviewer = getUser(rid);
            const review = taskReviews.find(r => r.reviewerId === rid);
            const decision = review?.decision || 'PENDING';
            return (
              <span key={rid} className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                decision === 'APPROVED' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' :
                decision === 'REJECTED' ? 'border-red-500/30 text-red-300 bg-red-500/10' :
                'border-slate-500/30 text-slate-400 bg-white/5'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  decision === 'APPROVED' ? 'bg-emerald-400' :
                  decision === 'REJECTED' ? 'bg-red-400' :
                  'bg-slate-500'
                }`} />
                {reviewer?.name || rid}
              </span>
            );
          })}
        </div>
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
            <p className="text-sm text-slate-400">Review and approve deliverables before client handoff</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending {pendingCount}
          </span>
          {interventionCount > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Intervention {interventionCount}
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved {approvedCount}
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-medium flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Rejected {rejectedCount}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[color:var(--dash-surface-elevated)]/50 backdrop-blur-sm border border-[color:var(--dash-glass-border)] rounded-xl p-1">
        {([
          { id: 'review' as TabId, label: 'My Reviews', count: myPendingTasks.length },
          { id: 'all' as TabId, label: 'All QC Tasks', count: qcTasks.length },
          { id: 'history' as TabId, label: 'History', count: approvedCount + rejectedCount },
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
            onChange={e => setFilterStatus(e.target.value as QCStatus | '')}
            className="px-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white focus:ring-1 focus:ring-[color:var(--dash-primary)]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="NEEDS_INTERVENTION">Needs Intervention</option>
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
                <p className="text-sm text-slate-400 mt-1">No tasks pending your QC review.</p>
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
              <div className="relative w-full max-w-lg" style={{ height: '580px' }}>
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
                <h3 className="text-base font-semibold text-white">No QC tasks found</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {activeTab === 'history' ? 'No completed QC reviews yet.' : 'No tasks with QC enabled.'}
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

      {/* ─── Rejection Modal ──────────────────────────────────────── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[color:var(--dash-glass-border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-300">
                <XCircle className="w-5 h-5" />
                <h3 className="text-base font-semibold">Reject Task</h3>
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
                  Rejection Note <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Explain what needs to change..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reject Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reviewer Assignment Panel ─────────────────────────────── */}
      {reviewerPanelTaskId && canManage && (() => {
        const task = tasks.find(t => t.id === reviewerPanelTaskId);
        if (!task?.qc) return null;
        const eligibleUsers = users.filter(u =>
          u.status !== 'inactive' &&
          (reviewerSearch ? u.name.toLowerCase().includes(reviewerSearch.toLowerCase()) || u.role.toLowerCase().includes(reviewerSearch.toLowerCase()) : true)
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-5 py-4 border-b border-[color:var(--dash-glass-border)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300">
                  <Users2 className="w-5 h-5" />
                  <h3 className="text-base font-semibold">Manage Reviewers</h3>
                </div>
                <button
                  onClick={() => { setReviewerPanelTaskId(null); setReviewerSearch(''); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={reviewerSearch}
                    onChange={e => setReviewerSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-sm text-white placeholder-slate-500"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
                  {eligibleUsers.map(u => {
                    const isReviewer = task.qc!.reviewers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleToggleReviewer(reviewerPanelTaskId, u.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-left ${
                          isReviewer
                            ? 'bg-purple-500/10 border border-purple-500/30'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isReviewer ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-400'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-white font-medium truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-500">{u.role} · {u.department}</div>
                          </div>
                        </div>
                        {isReviewer && (
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-[color:var(--dash-glass-border)]">
                <p className="text-[10px] text-slate-500">
                  {task.qc!.reviewers.length} reviewer(s) assigned · Changes are saved automatically
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
          <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[color:var(--dash-primary)] animate-spin" />
            <span className="text-sm text-white font-medium">Submitting review...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControlHub;
