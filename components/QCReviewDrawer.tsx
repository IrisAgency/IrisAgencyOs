import React, { useState, useMemo, useCallback } from 'react';
import {
  X, ExternalLink, ChevronLeft, ChevronRight, ThumbsUp, CornerUpLeft,
  Loader2, Plus, MessageSquare, Calendar, Clock, Layers,
  CheckCircle2, GitMerge, Link as LinkIcon, Paperclip,
  User as UserIcon, AlertTriangle, Eye
} from 'lucide-react';
import {
  Task, User, Project, Client, WorkflowTemplate,
  ApprovalStep, QCReview, QCReviewAttachment, ApprovalStatus
} from '../types';
import DrivePreview, { DriveTypeBadge, DriveThumbnail } from './common/DrivePreview';
import { DriveDeliverable, extractDriveDeliverables } from '../utils/driveUtils';

// ─── Props ───────────────────────────────────────────────────────────

interface QCReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  users: User[];
  projects: Project[];
  clients: Client[];
  workflowTemplates: WorkflowTemplate[];
  approvalSteps: ApprovalStep[];
  qcReviews: QCReview[];
  currentUserId: string;
  canReview: boolean;
  isSubmitting: boolean;
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string) => void; // opens rejection modal
}

// ─── Step Status Config ──────────────────────────────────────────────

const stepStatusCfg: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending:             { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30',  label: 'Pending' },
  approved:            { bg: 'bg-emerald-500/10',  text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Approved' },
  rejected:            { bg: 'bg-red-500/10',      text: 'text-red-300',     border: 'border-red-500/30',     label: 'Rejected' },
  revision_requested:  { bg: 'bg-orange-500/10',   text: 'text-orange-300',  border: 'border-orange-500/30',  label: 'Revisions' },
  revision_submitted:  { bg: 'bg-blue-500/10',     text: 'text-blue-300',    border: 'border-blue-500/30',    label: 'Resubmitted' },
  waiting:             { bg: 'bg-slate-500/10',     text: 'text-slate-400',   border: 'border-slate-500/30',   label: 'Waiting' },
};

// ─── Component ───────────────────────────────────────────────────────

const QCReviewDrawer: React.FC<QCReviewDrawerProps> = ({
  isOpen,
  onClose,
  task,
  users,
  projects,
  clients,
  workflowTemplates,
  approvalSteps,
  qcReviews,
  currentUserId,
  canReview,
  isSubmitting,
  onApprove,
  onReject,
}) => {
  // ─── State ────────────────────────────────────────────────────────
  const [selectedDeliverableIdx, setSelectedDeliverableIdx] = useState(0);

  // ─── Derived data ─────────────────────────────────────────────────
  const getUser = (uid: string) => users.find(u => u.id === uid);
  const project = projects.find(p => p.id === task.projectId);
  const client = (() => {
    if (task.client) return task.client;
    const cl = clients.find(c => c.id === project?.clientId);
    return cl?.name || 'Unknown';
  })();
  const template = workflowTemplates.find(w => w.id === task.workflowTemplateId);
  const steps = approvalSteps.filter(s => s.taskId === task.id).sort((a, b) => a.level - b.level);
  const myPendingStep = steps.find(s => s.approverId === currentUserId && s.status === 'pending');
  const approvedSteps = steps.filter(s => s.status === 'approved').length;
  const taskReviews = qcReviews.filter(r => r.taskId === task.id);
  const rejections = taskReviews.filter(r => r.decision === 'REJECTED' && r.note);
  const assignees = (task.assigneeIds || []).map(id => getUser(id)).filter(Boolean);

  // ─── Extract Drive deliverables ───────────────────────────────────
  const deliverables: DriveDeliverable[] = useMemo(() => {
    const refs = (task.referenceLinks || []).map(l => ({ id: l.id, title: l.title, url: l.url }));
    const atts = (task.attachments || []).map(a => ({ id: a.id, name: a.name, url: a.url }));
    const dls = (task.deliveryLinks || []).map(d => ({ id: d.id, label: d.label, url: d.url, driveFileId: d.driveFileId }));
    return extractDriveDeliverables(refs, atts, dls);
  }, [task.referenceLinks, task.attachments, task.deliveryLinks]);

  const currentDeliverable = deliverables[selectedDeliverableIdx] || null;

  // Non-Drive reference links (for separate display)
  const nonDriveLinks = useMemo(() => {
    const driveIds = new Set(deliverables.map(d => d.id));
    return (task.referenceLinks || []).filter(l => !driveIds.has(l.id));
  }, [task.referenceLinks, deliverables]);

  // ─── Navigation ───────────────────────────────────────────────────
  const prevDeliverable = useCallback(() => {
    setSelectedDeliverableIdx(prev => Math.max(0, prev - 1));
  }, []);

  const nextDeliverable = useCallback(() => {
    setSelectedDeliverableIdx(prev => Math.min(deliverables.length - 1, prev + 1));
  }, [deliverables.length]);

  // ─── Escape key handler ───────────────────────────────────────────
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // ─── Body scroll lock ─────────────────────────────────────────────
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Reset selected deliverable index when the task changes
  React.useEffect(() => {
    setSelectedDeliverableIdx(0);
  }, [task.id]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* ─── Mobile Full Screen ──────────────────────────────────── */}
      <div className="md:hidden fixed inset-0 z-50 bg-[color:var(--dash-surface)] flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-base font-bold text-white truncate">QC Review</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Content (scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Preview Area */}
          {deliverables.length > 0 && currentDeliverable && (
            <div className="p-4 space-y-3 border-b border-[color:var(--dash-glass-border)]">
              <DrivePreview
                fileId={currentDeliverable.fileId}
                typeHint={currentDeliverable.typeHint}
                label={currentDeliverable.label}
              />

              {/* Deliverable switcher */}
              {deliverables.length > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={prevDeliverable} disabled={selectedDeliverableIdx === 0} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-slate-400 font-medium">{selectedDeliverableIdx + 1} / {deliverables.length}</span>
                  <button onClick={nextDeliverable} disabled={selectedDeliverableIdx === deliverables.length - 1} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}

              {/* Thumbnail strip */}
              {deliverables.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {deliverables.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeliverableIdx(i)}
                      className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        i === selectedDeliverableIdx
                          ? 'border-[color:var(--dash-primary)] ring-1 ring-[color:var(--dash-primary)]/30'
                          : 'border-transparent hover:border-white/20'
                      }`}
                    >
                      <DriveThumbnail fileId={d.fileId} typeHint={d.typeHint} size={120} className="w-16 h-12" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Task Info */}
          <div className="p-4 space-y-4">
            {renderTaskInfo()}
          </div>
        </div>

        {/* Mobile Action Bar (sticky bottom) */}
        {myPendingStep && canReview && (
          <div className="shrink-0 p-4 border-t border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onReject(task.id)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                <CornerUpLeft className="w-4 h-4" />
                Revisions
              </button>
              <button
                onClick={() => onApprove(task.id)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Approve
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Desktop Drawer ──────────────────────────────────────── */}
      <div className="hidden md:flex fixed top-0 right-0 h-full w-full max-w-5xl z-50 shadow-2xl flex-col bg-[color:var(--dash-surface)] border-l border-[color:var(--dash-glass-border)] transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">QC Review</h2>
              <p className="text-xs text-slate-400 truncate">{client} · {task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — two columns: preview (left) + info/actions (right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Preview Area */}
          <div className="flex-[3] border-r border-[color:var(--dash-glass-border)] overflow-y-auto custom-scrollbar p-6 space-y-4">
            {deliverables.length > 0 && currentDeliverable ? (
              <>
                <DrivePreview
                  fileId={currentDeliverable.fileId}
                  typeHint={currentDeliverable.typeHint}
                  label={currentDeliverable.label}
                />

                {/* Deliverable switcher */}
                {deliverables.length > 1 && (
                  <div className="flex items-center gap-3">
                    <button onClick={prevDeliverable} disabled={selectedDeliverableIdx === 0} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs text-slate-400 font-medium">{selectedDeliverableIdx + 1} / {deliverables.length} deliverables</span>
                    <button onClick={nextDeliverable} disabled={selectedDeliverableIdx === deliverables.length - 1} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}

                {/* Thumbnail strip */}
                {deliverables.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {deliverables.map((d, i) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDeliverableIdx(i)}
                        className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                          i === selectedDeliverableIdx
                            ? 'border-[color:var(--dash-primary)] ring-1 ring-[color:var(--dash-primary)]/30'
                            : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <DriveThumbnail fileId={d.fileId} typeHint={d.typeHint} size={160} className="w-20 h-14" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* No Drive deliverables */
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                <div className="p-4 rounded-full bg-slate-500/10 border border-slate-500/20">
                  <Paperclip className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">No Drive Previews</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    No Google Drive links found in this task&apos;s references or attachments.
                    Deliverables with Drive links will display an inline preview here.
                  </p>
                </div>
                {/* Show non-drive reference links as fallback */}
                {nonDriveLinks.length > 0 && (
                  <div className="space-y-2 w-full max-w-xs">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Reference Links</div>
                    {nonDriveLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{link.title || link.url}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Task Info + Actions */}
          <div className="flex-[2] flex flex-col overflow-hidden max-w-md">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              {renderTaskInfo()}
            </div>

            {/* Action bar */}
            {myPendingStep && canReview && (
              <div className="shrink-0 p-4 border-t border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onReject(task.id)}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    <CornerUpLeft className="w-4 h-4" />
                    Request Revisions
                  </button>
                  <button
                    onClick={() => onApprove(task.id)}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    Approve
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-600 mt-2">
                  Step {myPendingStep.level + 1} of {steps.length}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // ─── Shared Task Info Renderer ────────────────────────────────────
  function renderTaskInfo() {
    return (
      <>
        {/* Task header */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{client}</div>
          <h3 className="text-base font-bold text-white leading-tight">{task.title}</h3>
          {project && <div className="text-xs text-slate-400 mt-0.5">{project.name}</div>}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            task.taskType === 'design' ? 'border-blue-500/30 text-blue-300 bg-blue-500/10' :
            task.taskType === 'video' ? 'border-purple-500/30 text-purple-300 bg-purple-500/10' :
            task.taskType === 'photo' ? 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10' :
            task.taskType === 'motion' ? 'border-pink-500/30 text-pink-300 bg-pink-500/10' :
            'border-slate-500/30 text-slate-300 bg-slate-500/10'
          }`}>
            {task.taskType}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            task.priority === 'critical' ? 'border-red-500/30 text-red-300 bg-red-500/10' :
            task.priority === 'high' ? 'border-orange-500/30 text-orange-300 bg-orange-500/10' :
            task.priority === 'medium' ? 'border-yellow-500/30 text-yellow-300 bg-yellow-500/10' :
            'border-slate-500/30 text-slate-300 bg-slate-500/10'
          }`}>
            {task.priority}
          </span>
        </div>

        {/* Your turn indicator */}
        {myPendingStep && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-300">
              Your approval needed (Step {myPendingStep.level + 1}/{steps.length})
            </span>
          </div>
        )}

        {/* Workflow & progress */}
        {template && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="w-3.5 h-3.5" />
            <span>{template.name}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400 font-medium">{approvedSteps}/{steps.length} approved</span>
          </div>
        )}

        {/* Approval chain */}
        {steps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GitMerge className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Approval Steps</span>
            </div>
            <div className="space-y-2 pl-2">
              {steps.map((step) => {
                const approver = getUser(step.approverId);
                const cfg = stepStatusCfg[step.status] || stepStatusCfg.waiting;
                const isMe = step.approverId === currentUserId;
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      step.status === 'approved' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' :
                      step.status === 'pending' ? `border-amber-400 bg-amber-500/20 text-amber-300 ${isMe ? 'ring-2 ring-amber-400/30' : ''}` :
                      step.status === 'revision_requested' ? 'border-orange-400 bg-orange-500/20 text-orange-300' :
                      'border-slate-600 bg-slate-500/10 text-slate-500'
                    }`}>
                      {step.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : step.level + 1}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-medium truncate ${isMe ? 'text-amber-300' : 'text-white'}`}>
                        {approver?.name || 'Unassigned'}{isMe && ' (You)'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Description</div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.publishAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Pub: {new Date(task.publishAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Assignees */}
        {assignees.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Assignees</div>
            <div className="flex flex-wrap gap-1.5">
              {assignees.map(u => u && (
                <span key={u.id} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-300">
                  {u.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Revision context */}
        {task.revisionContext?.active && task.revisionContext.message && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold mb-1">Revision Requested</div>
            <p className="text-xs text-slate-300">{task.revisionContext.message}</p>
          </div>
        )}

        {/* Previous rejection feedback */}
        {rejections.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Previous Feedback</div>
            {rejections.map(r => (
              <div key={r.id} className="text-xs text-slate-300">
                <span className="font-medium text-red-300">{getUser(r.reviewerId)?.name}:</span> {r.note}
              </div>
            ))}
          </div>
        )}

        {/* Non-drive reference links */}
        {nonDriveLinks.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Reference Links</div>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {/* Drive deliverables list (when no preview is shown in mobile) */}
        {deliverables.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              Drive Deliverables ({deliverables.length})
            </div>
            <div className="space-y-1.5">
              {deliverables.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2 text-xs">
                  <DriveTypeBadge type={d.typeHint} />
                  <span className="text-slate-300 truncate flex-1">{d.label}</span>
                  <a
                    href={d.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-white transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
};

export default QCReviewDrawer;
