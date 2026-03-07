import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { notifyUsers } from '../../services/notificationService';
import type {
  CreativeProject, CreativeCalendar, CreativeCalendarItem,
  CalendarItem, CalendarItemRevision, CalendarRevisionStatus,
  Client, User, AgencyFile, ClientMarketingStrategy,
  CalendarContentType, CalendarReferenceLink, CalendarReferenceFile,
  NotificationType, CreativeRejectionReference,
} from '../../types';
import {
  FileText, Upload, Plus, Trash2, Edit2, Save, Send, ExternalLink,
  Link as LinkIcon, Video, Image, Clapperboard, Calendar, Eye,
  AlertTriangle, CheckCircle2, Clock, RotateCcw, X, ChevronDown, ChevronRight,
  Info, MessageSquare
} from 'lucide-react';

interface CopywriterViewProps {
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];
  calendarItems?: CalendarItem[];
  calendarItemRevisions?: CalendarItemRevision[];
  clients: Client[];
  users: User[];
  files: AgencyFile[];
  currentUser: User | null;
  checkPermission: (permission: string) => boolean;
  onNotify: (type: NotificationType, title: string, message: string, recipientIds: string[], entityId?: string, actionUrl?: string) => void;
}

const TYPE_OPTIONS: { value: CalendarContentType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'VIDEO', label: 'Video', icon: Video, color: 'bg-purple-500/20 text-purple-400 border-purple-400/30' },
  { value: 'PHOTO', label: 'Photo', icon: Image, color: 'bg-blue-500/20 text-blue-400 border-blue-400/30' },
  { value: 'MOTION', label: 'Motion', icon: Clapperboard, color: 'bg-amber-500/20 text-amber-400 border-amber-400/30' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  UNDER_REVIEW: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  NEEDS_REVISION: 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  UPDATED: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
  APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  PENDING: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  REJECTED: 'bg-rose-500/20 text-rose-400 border-rose-400/30',
};

const CopywriterView: React.FC<CopywriterViewProps> = ({
  creativeProjects,
  creativeCalendars,
  creativeCalendarItems,
  calendarItems: deptCalendarItems = [],
  calendarItemRevisions = [],
  clients,
  users,
  files,
  currentUser,
  checkPermission,
  onNotify,
}) => {
  const surface = 'bg-[#0a0a0a] backdrop-blur-sm border border-white/10 text-white';
  const elevated = 'bg-[#0f0f0f] backdrop-blur-sm border border-white/10 text-white';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50';
  const pill = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border';

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CreativeCalendarItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Strategy data (loaded on demand)
  const [strategy, setStrategy] = useState<ClientMarketingStrategy | null>(null);

  // Item form state
  const [itemForm, setItemForm] = useState({
    type: 'VIDEO' as CalendarContentType,
    title: '',
    mainIdea: '',
    briefDescription: '',
    notes: '',
    publishAt: '',
    referenceLinks: [] as CalendarReferenceLink[],
    referenceFiles: [] as CalendarReferenceFile[],
  });
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingRef, setUploadingRef] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Filter to assigned projects
  const myProjects = creativeProjects.filter(
    p => p.assignedCopywriterId === currentUser?.id && !p.isArchived
  );

  const selectedProject = myProjects.find(p => p.id === selectedProjectId);
  const selectedCalendar = selectedProject
    ? creativeCalendars.find(c => c.creativeProjectId === selectedProject.id)
    : null;
  const calendarItems = selectedCalendar
    ? creativeCalendarItems.filter(i => i.creativeCalendarId === selectedCalendar.id)
    : [];

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && myProjects.length > 0) {
      setSelectedProjectId(myProjects[0].id);
    }
  }, [myProjects, selectedProjectId]);

  // Load strategy when project changes
  useEffect(() => {
    if (!selectedProject?.strategyId) {
      setStrategy(null);
      return;
    }
    loadStrategy(selectedProject.strategyId);
  }, [selectedProject?.strategyId]);

  const loadStrategy = async (strategyId: string) => {
    try {
      const q = query(collection(db, 'client_strategies'), where('__name__', '==', strategyId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setStrategy({ id: snap.docs[0].id, ...snap.docs[0].data() } as ClientMarketingStrategy);
      }
    } catch (error) {
      console.error('Error loading strategy:', error);
    }
  };

  const isReadOnly = selectedProject?.status === 'APPROVED' || selectedCalendar?.status === 'APPROVED';
  const isUnderReview = selectedCalendar?.status === 'UNDER_REVIEW';
  const needsRevision = selectedCalendar?.status === 'NEEDS_REVISION';
  const isUpdated = selectedCalendar?.status === 'UPDATED';
  const isDraft = selectedCalendar?.status === 'DRAFT';

  // ============================================
  // ITEM CRUD
  // ============================================
  const openItemModal = (item?: CreativeCalendarItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        type: item.type,
        title: item.title,
        mainIdea: item.mainIdea,
        briefDescription: item.briefDescription,
        notes: item.notes,
        publishAt: item.publishAt || '',
        referenceLinks: item.referenceLinks || [],
        referenceFiles: item.referenceFiles || [],
      });
    } else {
      setEditingItem(null);
      setItemForm({
        type: 'VIDEO',
        title: '',
        mainIdea: '',
        briefDescription: '',
        notes: '',
        publishAt: '',
        referenceLinks: [],
        referenceFiles: [],
      });
    }
    setLinkTitle('');
    setLinkUrl('');
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!selectedCalendar || !currentUser || !itemForm.title.trim()) return;
    setSaving(true);

    try {
      const now = new Date().toISOString();

      if (editingItem) {
        await updateDoc(doc(db, 'creative_calendar_items', editingItem.id), {
          type: itemForm.type,
          title: itemForm.title.trim(),
          mainIdea: itemForm.mainIdea.trim(),
          briefDescription: itemForm.briefDescription.trim(),
          notes: itemForm.notes.trim(),
          publishAt: itemForm.publishAt,
          referenceLinks: itemForm.referenceLinks,
          referenceFiles: itemForm.referenceFiles,
          // If this was a rejected item being edited, reset to PENDING
          reviewStatus: editingItem.reviewStatus === 'REJECTED' ? 'PENDING' : editingItem.reviewStatus,
          rejectionNote: editingItem.reviewStatus === 'REJECTED' ? null : editingItem.rejectionNote,
          rejectionReferences: editingItem.reviewStatus === 'REJECTED' ? [] : editingItem.rejectionReferences,
          updatedAt: now,
        });
      } else {
        await addDoc(collection(db, 'creative_calendar_items'), {
          creativeCalendarId: selectedCalendar.id,
          type: itemForm.type,
          title: itemForm.title.trim(),
          mainIdea: itemForm.mainIdea.trim(),
          briefDescription: itemForm.briefDescription.trim(),
          notes: itemForm.notes.trim(),
          publishAt: itemForm.publishAt,
          referenceLinks: itemForm.referenceLinks,
          referenceFiles: itemForm.referenceFiles,
          reviewStatus: 'PENDING',
          rejectionNote: null,
          rejectionReferences: [],
          createdAt: now,
          updatedAt: now,
        });
      }

      setShowItemModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'creative_calendar_items', itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // ============================================
  // REFERENCE LINKS/FILES
  // ============================================
  const addReferenceLink = () => {
    if (!linkUrl.trim()) return;
    setItemForm(prev => ({
      ...prev,
      referenceLinks: [...prev.referenceLinks, { title: linkTitle.trim() || linkUrl.trim(), url: linkUrl.trim() }],
    }));
    setLinkTitle('');
    setLinkUrl('');
  };

  const removeReferenceLink = (index: number) => {
    setItemForm(prev => ({
      ...prev,
      referenceLinks: prev.referenceLinks.filter((_, i) => i !== index),
    }));
  };

  const handleRefFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject || !currentUser) return;
    setUploadingRef(true);

    try {
      const timestamp = Date.now();
      const storagePath = `clients/${selectedProject.clientId}/creative/${selectedProject.id}/references/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setItemForm(prev => ({
        ...prev,
        referenceFiles: [...prev.referenceFiles, {
          fileName: file.name,
          storagePath,
          downloadURL,
          uploadedBy: currentUser.id,
          createdAt: new Date().toISOString(),
        }],
      }));
    } catch (error) {
      console.error('Error uploading reference file:', error);
    } finally {
      setUploadingRef(false);
      if (refFileInputRef.current) refFileInputRef.current.value = '';
    }
  };

  const removeReferenceFile = (index: number) => {
    setItemForm(prev => ({
      ...prev,
      referenceFiles: prev.referenceFiles.filter((_, i) => i !== index),
    }));
  };

  // ============================================
  // SUBMIT / RESUBMIT
  // ============================================
  const handleSubmitForReview = async () => {
    if (!selectedCalendar || !selectedProject || !currentUser) return;
    if (calendarItems.length === 0) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      await updateDoc(doc(db, 'creative_calendars', selectedCalendar.id), {
        status: 'UNDER_REVIEW',
        lastSubmittedAt: now,
        updatedAt: now,
        updatedBy: currentUser.id,
      });

      await updateDoc(doc(db, 'creative_projects', selectedProject.id), {
        status: 'UNDER_REVIEW',
        updatedAt: now,
      });

      // Notify project creator (manager) — non-blocking
      notifyUsers({
        type: 'CREATIVE_SUBMITTED_FOR_REVIEW',
        title: 'Calendar Submitted for Review',
        message: `${currentUser.name} submitted a creative calendar for review.`,
        recipientIds: [selectedProject.createdBy],
        entityId: selectedProject.id,
        sendPush: true,
        createdBy: currentUser.id,
      }).catch(err => console.warn('Notification failed (non-critical):', err));
      onNotify('CREATIVE_SUBMITTED_FOR_REVIEW', 'Calendar Submitted', 'A creative calendar was submitted for review', [selectedProject.createdBy], selectedProject.id);
    } catch (error) {
      console.error('Error submitting for review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!selectedCalendar || !selectedProject || !currentUser) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      await updateDoc(doc(db, 'creative_calendars', selectedCalendar.id), {
        status: 'UPDATED',
        revisionCount: (selectedCalendar.revisionCount || 0) + 1,
        lastUpdatedAt: now,
        updatedAt: now,
        updatedBy: currentUser.id,
      });

      // Notify manager — non-blocking
      notifyUsers({
        type: 'CREATIVE_SUBMITTED_FOR_REVIEW',
        title: 'Calendar Updated & Resubmitted',
        message: `${currentUser.name} resubmitted a revised creative calendar for review.`,
        recipientIds: [selectedProject.createdBy],
        entityId: selectedProject.id,
        sendPush: true,
        createdBy: currentUser.id,
      }).catch(err => console.warn('Notification failed (non-critical):', err));
      onNotify('CREATIVE_SUBMITTED_FOR_REVIEW', 'Calendar Resubmitted', 'A revised creative calendar was resubmitted', [selectedProject.createdBy], selectedProject.id);
    } catch (error) {
      console.error('Error resubmitting:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (myProjects.length === 0) {
    return (
      <div className={`${surface} rounded-xl p-8 text-center`}>
        <Clock className="w-10 h-10 mx-auto mb-3 text-iris-white/20" />
        <p className="text-iris-white/60">No creative projects assigned to you yet.</p>
        <p className="text-sm text-iris-white/40 mt-1">Your manager will assign projects when ready.</p>
        {creativeProjects.length > 0 && (
          <p className="text-xs text-iris-white/30 mt-3">
            {creativeProjects.length} project(s) exist but are assigned to other copywriters.
          </p>
        )}
      </div>
    );
  }

  const client = selectedProject ? clients.find(c => c.id === selectedProject.clientId) : null;

  return (
    <div className="space-y-4">
      {/* Project Selector (if multiple) */}
      {myProjects.length > 1 && (
        <div className={`${surface} rounded-xl p-3`}>
          <div className="flex gap-2 overflow-x-auto">
            {myProjects.map(p => {
              const cl = clients.find(c => c.id === p.clientId);
              const isActive = p.id === selectedProjectId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive ? 'bg-iris-red text-white' : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
                  }`}
                >
                  {cl?.name || 'Client'}
                  <span className={`ml-2 ${pill} text-[10px] ${STATUS_COLORS[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedProject && selectedCalendar && (
        <>
          {/* Status Banners */}
          {isUpdated && (
            <div className="flex items-center gap-2 px-4 py-3 bg-cyan-500/10 border border-cyan-400/20 rounded-xl text-sm text-cyan-400">
              <Info className="w-4 h-4 shrink-0" />
              Updated. Pending Review. (Revision #{selectedCalendar.revisionCount})
            </div>
          )}
          {isUnderReview && (
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-400/20 rounded-xl text-sm text-amber-400">
              <Clock className="w-4 h-4 shrink-0" />
              Calendar is under review by your manager.
            </div>
          )}
          {isReadOnly && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-400/20 rounded-xl text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Calendar approved & activated! This project is now read-only.
            </div>
          )}
          {needsRevision && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-400/20 rounded-xl text-sm text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Revision required — check rejected items below for feedback.
            </div>
          )}

          {/* Strategy & Brief Reference */}
          <div className={`${surface} rounded-xl p-4`}>
            <h3 className="text-sm font-semibold text-iris-white/70 mb-3">Project Resources</h3>
            <div className="flex flex-wrap gap-3">
              {strategy && (
                <a
                  href={strategy.type === 'link' ? (strategy.url || '#') : '#'}
                  target={strategy.type === 'link' ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-iris-white/5 rounded-lg text-sm text-iris-white/80 hover:bg-iris-white/10 transition-colors"
                >
                  <FileText className="w-4 h-4 text-iris-red" />
                  Strategy: {strategy.title}
                  {strategy.type === 'link' && <ExternalLink className="w-3 h-3" />}
                </a>
              )}
              {selectedProject.briefFile?.url && (
                <a
                  href={selectedProject.briefFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-iris-white/5 rounded-lg text-sm text-iris-white/80 hover:bg-iris-white/10 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  Creative Brief
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {!strategy && !selectedProject.briefFile && (
                <span className="text-sm text-iris-white/40">No resources attached.</span>
              )}
            </div>
          </div>

          {/* Calendar Items Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-iris-white">Calendar Items</h3>
              <span className="text-sm text-iris-white/50">({calendarItems.length} items) • {selectedCalendar.monthKey}</span>
            </div>
            {!isReadOnly && !isUnderReview && (
              <button
                onClick={() => openItemModal()}
                className="flex items-center gap-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-3 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            )}
          </div>

          {/* Calendar Items List */}
          {calendarItems.length === 0 ? (
            <div className={`${surface} rounded-xl p-8 text-center`}>
              <Calendar className="w-10 h-10 mx-auto mb-3 text-iris-white/20" />
              <p className="text-iris-white/60">No items yet. Start building your creative calendar.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {calendarItems.map(item => {
                const typeOpt = TYPE_OPTIONS.find(t => t.value === item.type);
                const TypeIcon = typeOpt?.icon || FileText;
                const isRejected = item.reviewStatus === 'REJECTED';
                const isItemApproved = item.reviewStatus === 'APPROVED';

                return (
                  <div
                    key={item.id}
                    className={`${surface} rounded-xl p-4 space-y-2 ${
                      isRejected ? 'border-rose-500/30 bg-rose-500/5' : ''
                    } ${isItemApproved ? 'border-emerald-500/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-iris-white">{item.title}</h4>
                          <span className={`${pill} text-[10px] ${typeOpt?.color || ''}`}>
                            <TypeIcon className="w-3 h-3" />
                            {item.type}
                          </span>
                          {item.reviewStatus !== 'PENDING' && (
                            <span className={`${pill} text-[10px] ${STATUS_COLORS[item.reviewStatus]}`}>
                              {item.reviewStatus}
                            </span>
                          )}
                        </div>
                        {item.publishAt && (
                          <span className="text-xs text-iris-white/50 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Publish: {new Date(item.publishAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {!isReadOnly && !isUnderReview && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openItemModal(item)}
                            className="p-1.5 text-iris-white/50 hover:text-iris-red rounded-lg hover:bg-iris-white/5 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-iris-white/50 hover:text-rose-400 rounded-lg hover:bg-iris-white/5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content preview */}
                    {item.mainIdea && (
                      <p className="text-sm text-iris-white/70"><span className="text-iris-white/50 font-medium">Idea:</span> {item.mainIdea}</p>
                    )}
                    {item.briefDescription && (
                      <p className="text-sm text-iris-white/60 line-clamp-2">{item.briefDescription}</p>
                    )}

                    {/* Rejection Feedback */}
                    {isRejected && item.rejectionNote && (
                      <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 mb-1">
                          <AlertTriangle className="w-3 h-3" />
                          Rejection Feedback
                        </div>
                        <p className="text-sm text-iris-white/70">{item.rejectionNote}</p>
                        {item.rejectionReferences?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.rejectionReferences.map((r: CreativeRejectionReference, i: number) => (
                              <a
                                key={i}
                                href={r.value}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                              >
                                {r.type === 'link' ? <LinkIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                <span className="truncate">{r.fileName || r.value}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reference links/files */}
                    {(item.referenceLinks?.length > 0 || item.referenceFiles?.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.referenceLinks?.map((link, i) => (
                          <a key={`l${i}`} href={link.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                            <ExternalLink className="w-3 h-3" />{link.title || 'Link'}
                          </a>
                        ))}
                        {item.referenceFiles?.map((f, i) => (
                          <a key={`f${i}`} href={f.downloadURL} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-iris-red hover:text-iris-red/80">
                            <FileText className="w-3 h-3" />{f.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit / Resubmit Actions */}
          {!isReadOnly && !isUnderReview && !isUpdated && (
            <div className="flex justify-end gap-3 pt-2">
              {isDraft && calendarItems.length > 0 && (
                <button
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-iris-red to-iris-red/80 text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              )}
              {needsRevision && (
                <button
                  onClick={handleResubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  {submitting ? 'Resubmitting...' : 'Resubmit for Review'}
                </button>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* CALENDAR REVISION REQUESTS SECTION */}
          {/* ============================================ */}
          {(() => {
            // Find revision requests that belong to this copywriter's creative projects
            const myProjectIds = myProjects.map(p => p.id);
            const myCalendarIds = creativeCalendars
              .filter(cc => myProjectIds.includes(cc.creativeProjectId))
              .map(cc => cc.id);
            const pendingRevisions = calendarItemRevisions.filter(
              r => myCalendarIds.includes(r.creativeCalendarId || '') && 
                   (r.status === 'REVISION_REQUESTED' || r.status === 'IN_CREATIVE_REVISION')
            );

            if (pendingRevisions.length === 0) return null;

            return (
              <div className={`${surface} rounded-xl p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-iris-white">Calendar Revision Requests</h3>
                    <p className="text-xs text-iris-white/50">{pendingRevisions.length} item{pendingRevisions.length !== 1 ? 's' : ''} need{pendingRevisions.length === 1 ? 's' : ''} revision from Calendar Department</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {pendingRevisions.map(rev => {
                    const calItem = deptCalendarItems.find(ci => ci.id === rev.calendarItemId);
                    const client = clients.find(c => c.id === rev.clientId);
                    const requester = users.find(u => u.id === rev.requestedBy);
                    
                    return (
                      <div key={rev.id} className={`${elevated} rounded-xl p-4 space-y-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-iris-white text-sm">{calItem?.autoName || 'Calendar Item'}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              rev.status === 'REVISION_REQUESTED' ? 'bg-amber-500/20 text-amber-400 border-amber-400/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-400/30'
                            }`}>
                              {rev.status === 'REVISION_REQUESTED' ? 'Needs Revision' : 'In Progress'}
                            </span>
                          </div>
                          <span className="text-xs text-iris-white/40">{client?.name}</span>
                        </div>

                        {/* Revision note */}
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                          <div className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {requester?.name || 'Calendar Dept'} requested:
                          </div>
                          <p className="text-sm text-iris-white/80 whitespace-pre-wrap" dir="auto">{rev.revisionNote}</p>
                          {rev.revisionReferences && rev.revisionReferences.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {rev.revisionReferences.map((refItem, idx) => (
                                <a key={idx} href={refItem.value} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> {refItem.fileName || refItem.value}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Current content for reference */}
                        {calItem && (
                          <div className="bg-white/[0.02] rounded-lg p-3 text-xs space-y-1">
                            <div className="font-semibold text-iris-white/50">Current Brief:</div>
                            <p className="text-iris-white/60 line-clamp-3" dir="auto">{calItem.primaryBrief}</p>
                          </div>
                        )}

                        {/* Action: Start Revision / Submit Revision */}
                        {rev.status === 'REVISION_REQUESTED' && (
                          <button
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'calendar_item_revisions', rev.id), {
                                  status: 'IN_CREATIVE_REVISION',
                                  updatedAt: new Date().toISOString(),
                                });
                                if (calItem) {
                                  await updateDoc(doc(db, 'calendar_items', calItem.id), {
                                    revisionStatus: 'IN_CREATIVE_REVISION',
                                    updatedAt: new Date().toISOString(),
                                  });
                                }
                              } catch (error) {
                                console.error('Error starting revision:', error);
                              }
                            }}
                            className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Start Working on Revision
                          </button>
                        )}

                        {rev.status === 'IN_CREATIVE_REVISION' && (
                          <CalendarRevisionEditor
                            revision={rev}
                            calendarItem={calItem}
                            currentUser={currentUser}
                            users={users}
                            onSubmit={async (revisedBrief, revisedNotes) => {
                              try {
                                const now = new Date().toISOString();
                                await updateDoc(doc(db, 'calendar_item_revisions', rev.id), {
                                  revisedBrief,
                                  revisedNotes,
                                  revisedBy: currentUser?.id,
                                  revisedAt: now,
                                  status: 'AWAITING_CREATIVE_APPROVAL',
                                  updatedAt: now,
                                });
                                if (calItem) {
                                  await updateDoc(doc(db, 'calendar_items', calItem.id), {
                                    revisionStatus: 'AWAITING_CREATIVE_APPROVAL',
                                    updatedAt: now,
                                  });
                                }
                                // Notify creative manager
                                const creativeCalendar = creativeCalendars.find(cc => cc.id === rev.creativeCalendarId);
                                const project = creativeCalendar ? creativeProjects.find(p => p.id === creativeCalendar.creativeProjectId) : null;
                                const managerIds = users
                                  .filter(u => u.department === 'Creative' && u.role !== 'Copywriter' && u.id !== currentUser?.id)
                                  .map(u => u.id);
                                if (managerIds.length > 0) {
                                  await notifyUsers({
                                    type: 'CALENDAR_REVISION_SUBMITTED',
                                    title: 'Calendar Revision Submitted',
                                    message: `${currentUser?.name} submitted a revised brief for "${calItem?.autoName}"`,
                                    recipientIds: managerIds,
                                    entityId: rev.id,
                                    actionUrl: '/creative',
                                    sendPush: true,
                                    createdBy: currentUser?.id || 'system',
                                  });
                                }
                              } catch (error) {
                                console.error('Error submitting revision:', error);
                                alert('Failed to submit revision');
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ADD / EDIT ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
          <div className={`${elevated} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200`}>
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">{editingItem ? 'Edit Item' : 'Add Calendar Item'}</h2>
              <button onClick={() => { setShowItemModal(false); setEditingItem(null); }} className="text-iris-white/70 hover:text-iris-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-2">Type *</label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setItemForm(prev => ({ ...prev, type: t.value }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        itemForm.type === t.value
                          ? t.color + ' ring-1'
                          : 'border-iris-white/10 text-iris-white/50 hover:bg-iris-white/5'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={e => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Content title"
                  className={inputClass}
                />
              </div>

              {/* Publish Date */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Publish Date *</label>
                <input
                  type="date"
                  value={itemForm.publishAt}
                  onChange={e => setItemForm(prev => ({ ...prev, publishAt: e.target.value }))}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Main Idea */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Main Idea</label>
                <textarea
                  rows={2}
                  value={itemForm.mainIdea}
                  onChange={e => setItemForm(prev => ({ ...prev, mainIdea: e.target.value }))}
                  placeholder="The core idea behind this content..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Brief Description */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Brief Description</label>
                <textarea
                  rows={3}
                  value={itemForm.briefDescription}
                  onChange={e => setItemForm(prev => ({ ...prev, briefDescription: e.target.value }))}
                  placeholder="Detailed description..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={itemForm.notes}
                  onChange={e => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Reference Links */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Reference Links</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={e => setLinkTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className={`${inputClass} flex-[0.4]`}
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className={`${inputClass} flex-[0.6]`}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addReferenceLink())}
                  />
                  <button
                    type="button"
                    onClick={addReferenceLink}
                    disabled={!linkUrl.trim()}
                    className="px-3 py-2 bg-iris-white/10 rounded-lg hover:bg-iris-white/20 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-iris-white" />
                  </button>
                </div>
                {itemForm.referenceLinks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {itemForm.referenceLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 bg-iris-black/60 rounded-lg px-3 py-1.5 text-sm">
                        <LinkIcon className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="flex-1 truncate text-iris-white/70">{link.title || link.url}</span>
                        <button onClick={() => removeReferenceLink(i)} className="text-iris-white/40 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference Files */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Reference Files</label>
                <button
                  type="button"
                  onClick={() => refFileInputRef.current?.click()}
                  disabled={uploadingRef}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-iris-white/20 rounded-lg text-sm text-iris-white/50 hover:bg-iris-white/5 transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingRef ? 'Uploading...' : 'Upload reference'}
                </button>
                <input ref={refFileInputRef} type="file" className="hidden" onChange={handleRefFileUpload} />
                {itemForm.referenceFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {itemForm.referenceFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-iris-black/60 rounded-lg px-3 py-1.5 text-sm">
                        <FileText className="w-3 h-3 text-iris-red shrink-0" />
                        <span className="flex-1 truncate text-iris-white/70">{f.fileName}</span>
                        <button onClick={() => removeReferenceFile(i)} className="text-iris-white/40 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-iris-white/10 flex gap-3">
              <button
                onClick={() => { setShowItemModal(false); setEditingItem(null); }}
                className="flex-1 px-4 py-2.5 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saving || !itemForm.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2.5 rounded-lg font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline sub-component for editing a calendar revision
const CalendarRevisionEditor: React.FC<{
  revision: CalendarItemRevision;
  calendarItem: CalendarItem | undefined;
  currentUser: User | null;
  users: User[];
  onSubmit: (revisedBrief: string, revisedNotes: string) => Promise<void>;
}> = ({ revision, calendarItem, currentUser, users, onSubmit }) => {
  const [brief, setBrief] = useState(calendarItem?.primaryBrief || '');
  const [notes, setNotes] = useState(calendarItem?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!brief.trim()) {
      alert('Brief cannot be empty');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(brief, notes);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-iris-white/10 pt-3">
      <div>
        <label className="block text-xs font-semibold text-iris-white/60 mb-1">Revised Brief *</label>
        <textarea
          value={brief}
          onChange={e => setBrief(e.target.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-400/50 resize-none"
          dir="auto"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-iris-white/60 mb-1">Revised Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-400/50 resize-none"
          dir="auto"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !brief.trim()}
        className="w-full px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Revised Content for Approval'}
      </button>
    </div>
  );
};

export default CopywriterView;
