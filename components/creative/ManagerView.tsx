import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { notifyUsers } from '../../services/notificationService';
import type { CreativeProject, CreativeCalendar, CreativeCalendarItem, CalendarItemRevision, Client, User, CalendarMonth, CalendarItem, AgencyFile, ClientMarketingStrategy, NotificationType, CreativeRejectionReference } from '../../types';
import { PERMISSIONS } from '../../lib/permissions';
import SwipeReviewCard from './SwipeReviewCard';
import { activateCreativeCalendar } from './CalendarActivation';
import {
  Plus, Upload, FileText, Link as LinkIcon, ExternalLink, Eye, Search, 
  ChevronDown, ChevronRight, Users, Calendar, Check, AlertTriangle, 
  Archive, ArchiveRestore, X, Sparkles, Clock, RotateCcw, CheckCircle2,
  MessageSquare, Send
} from 'lucide-react';

interface ManagerViewProps {
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];
  calendarItemRevisions?: CalendarItemRevision[];
  clients: Client[];
  users: User[];
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  files: AgencyFile[];
  currentUser: User | null;
  checkPermission: (permission: string) => boolean;
  onNotify: (type: NotificationType, title: string, message: string, recipientIds: string[], entityId?: string, actionUrl?: string) => void;
  onUploadFile?: (file: AgencyFile) => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  UNDER_REVIEW: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  NEEDS_REVISION: 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  UPDATED: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
  APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  ARCHIVED: 'bg-iris-white/10 text-iris-white/50 border-iris-white/20',
};

const ManagerView: React.FC<ManagerViewProps> = ({
  creativeProjects,
  creativeCalendars,
  creativeCalendarItems,
  calendarItemRevisions = [],
  clients,
  users,
  calendarMonths,
  calendarItems,
  files,
  currentUser,
  checkPermission,
  onNotify,
  onUploadFile,
}) => {
  const surface = 'bg-[#0a0a0a] backdrop-blur-sm border border-white/10 text-white';
  const elevated = 'bg-[#0f0f0f] backdrop-blur-sm border border-white/10 text-white';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50';
  const pill = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border';

  // State
  const [activeTab, setActiveTab] = useState<'projects' | 'review' | 'cal-revisions'>('projects');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [reviewingCalendar, setReviewingCalendar] = useState<CreativeCalendar | null>(null);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState(false);

  // Create Project Form
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [selectedCopywriterId, setSelectedCopywriterId] = useState('');
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [monthKey, setMonthKey] = useState(new Date().toISOString().slice(0, 7));
  const briefInputRef = useRef<HTMLInputElement>(null);

  // Strategy creation (inline)
  const [strategies, setStrategies] = useState<ClientMarketingStrategy[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [strategyForm, setStrategyForm] = useState({
    title: '',
    type: 'file' as 'file' | 'link',
    url: '',
    notes: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [strategyFile, setStrategyFile] = useState<File | null>(null);
  const strategyFileRef = useRef<HTMLInputElement>(null);

  // Review results tracking
  const [reviewResults, setReviewResults] = useState<Record<string, { status: 'APPROVED' | 'REJECTED'; note?: string; references?: CreativeRejectionReference[] }>>({});

  // Copywriter users (Copywriter role first, then other active users as fallback)
  const copywriters = users
    .filter(u => u.status === 'active')
    .sort((a, b) => {
      const aIsCW = a.role === 'Copywriter' ? 0 : 1;
      const bIsCW = b.role === 'Copywriter' ? 0 : 1;
      return aIsCW - bIsCW;
    });

  // Load strategies when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setStrategies([]);
      return;
    }
    fetchStrategies(selectedClientId);
  }, [selectedClientId]);

  const fetchStrategies = async (clientId: string) => {
    setLoadingStrategies(true);
    try {
      const q = query(
        collection(db, 'client_strategies'),
        where('clientId', '==', clientId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClientMarketingStrategy));
      data.sort((a, b) => b.year - a.year || b.month - a.month);
      setStrategies(data);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoadingStrategies(false);
    }
  };

  // Active vs archived projects
  const activeProjects = creativeProjects.filter(p => !p.isArchived);
  const archivedProjects = creativeProjects.filter(p => p.isArchived);

  // Projects needing review
  const projectsWithPendingReview = activeProjects.filter(p => {
    const cals = creativeCalendars.filter(c => c.creativeProjectId === p.id);
    return cals.some(c => c.status === 'UNDER_REVIEW' || c.status === 'UPDATED');
  });

  const filteredProjects = activeProjects.filter(p => {
    if (!searchTerm) return true;
    const client = clients.find(c => c.id === p.clientId);
    const copywriter = users.find(u => u.id === p.assignedCopywriterId);
    const search = searchTerm.toLowerCase();
    return (
      client?.name?.toLowerCase().includes(search) ||
      copywriter?.name?.toLowerCase().includes(search) ||
      p.status.toLowerCase().includes(search)
    );
  });

  // ============================================
  // CREATE PROJECT
  // ============================================
  const handleCreateProject = async () => {
    if (!currentUser || !selectedClientId || !selectedCopywriterId) return;
    setSaving(true);

    try {
      const now = new Date().toISOString();
      let briefFileData: CreativeProject['briefFile'] = null;

      // Upload brief file if selected
      if (briefFile) {
        const timestamp = Date.now();
        const projTempId = `temp_${timestamp}`;
        const storagePath = `clients/${selectedClientId}/creative/${projTempId}/brief/${timestamp}_${briefFile.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, briefFile);
        const downloadURL = await getDownloadURL(storageRef);
        briefFileData = {
          name: briefFile.name,
          url: downloadURL,
          uploadedBy: currentUser.id,
          createdAt: now,
        };
      }

      const projectData: Omit<CreativeProject, 'id'> = {
        clientId: selectedClientId,
        strategyId: selectedStrategyId || null,
        briefFile: briefFileData,
        status: 'IN_PROGRESS',
        assignedCopywriterId: selectedCopywriterId,
        isArchived: false,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, 'creative_projects'), projectData);

      // Create initial calendar
      await addDoc(collection(db, 'creative_calendars'), {
        creativeProjectId: docRef.id,
        clientId: selectedClientId,
        monthKey,
        status: 'DRAFT',
        revisionCount: 0,
        lastSubmittedAt: null,
        lastReviewedAt: null,
        lastUpdatedAt: null,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
      });

      // Notify copywriter (non-blocking — don't let notification failures block project creation)
      const client = clients.find(c => c.id === selectedClientId);
      notifyUsers({
        type: 'CREATIVE_ASSIGNED',
        title: 'New Creative Assignment',
        message: `You've been assigned a creative project for ${client?.name || 'a client'}. Check Creative Direction for details.`,
        recipientIds: [selectedCopywriterId],
        entityId: docRef.id,
        sendPush: true,
        createdBy: currentUser.id,
      }).catch(err => console.warn('Notification failed (non-critical):', err));
      onNotify('CREATIVE_ASSIGNED', 'Creative Project Created', `Assigned to copywriter for ${client?.name || 'client'}`, [selectedCopywriterId], docRef.id);

      // Reset form
      setShowCreateModal(false);
      setSelectedClientId('');
      setSelectedStrategyId('');
      setSelectedCopywriterId('');
      setBriefFile(null);
      setMonthKey(new Date().toISOString().slice(0, 7));
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project. Please try again. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // INLINE STRATEGY CREATION
  // ============================================
  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedClientId) return;
    setSavingStrategy(true);
    console.log('[Creative] Starting strategy creation...');

    try {
      const now = new Date().toISOString();
      let fileUrl: string | null = null;

      // Upload strategy file directly to Firebase Storage
      if (strategyForm.type === 'file' && strategyFile) {
        console.log('[Creative] Uploading strategy file to Storage...');
        const timestamp = Date.now();
        const storagePath = `clients/${selectedClientId}/strategies/${timestamp}_${strategyFile.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, strategyFile);
        fileUrl = await getDownloadURL(storageRef);
        console.log('[Creative] File uploaded:', fileUrl);
      }

      console.log('[Creative] Writing to client_strategies collection...');
      const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthLabel = months[strategyForm.month] + ' ' + strategyForm.year;

      await addDoc(collection(db, 'client_strategies'), {
        clientId: selectedClientId,
        year: strategyForm.year,
        month: strategyForm.month,
        monthLabel,
        title: strategyForm.title,
        type: strategyForm.type,
        fileId: null,
        fileUrl: strategyForm.type === 'file' ? fileUrl : null,
        url: strategyForm.type === 'link' ? strategyForm.url : null,
        notes: strategyForm.notes,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
      });
      console.log('[Creative] Strategy saved to Firestore!');

      // Refresh strategies
      await fetchStrategies(selectedClientId);
      setShowStrategyModal(false);
      setStrategyForm({ title: '', type: 'file', url: '', notes: '', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
      setStrategyFile(null);
    } catch (error) {
      console.error('[Creative] Error creating strategy:', error);
      alert('Error saving strategy: ' + (error as Error).message);
    } finally {
      setSavingStrategy(false);
    }
  };

  // ============================================
  // REVIEW LOGIC
  // ============================================
  const handleItemApprove = (itemId: string) => {
    setReviewResults(prev => ({ ...prev, [itemId]: { status: 'APPROVED' } }));
  };

  const handleItemReject = (itemId: string, note: string, references: CreativeRejectionReference[]) => {
    setReviewResults(prev => ({ ...prev, [itemId]: { status: 'REJECTED', note, references } }));
  };

  const handleReviewComplete = () => {
    setReviewComplete(true);
  };

  const handleFinalizeReview = async () => {
    if (!reviewingCalendar || !currentUser) return;
    setSaving(true);

    try {
      const now = new Date().toISOString();
      const calendarItemsForReview = creativeCalendarItems.filter(
        i => i.creativeCalendarId === reviewingCalendar.id
      );

      // Update each item's reviewStatus
      for (const item of calendarItemsForReview) {
        const result = reviewResults[item.id];
        if (!result) continue;

        const updateData: any = {
          reviewStatus: result.status,
          updatedAt: now,
        };

        if (result.status === 'REJECTED') {
          updateData.rejectionNote = result.note || '';
          updateData.rejectionReferences = result.references || [];
        } else {
          updateData.rejectionNote = null;
          updateData.rejectionReferences = [];
        }

        await updateDoc(doc(db, 'creative_calendar_items', item.id), updateData);
      }

      const hasRejected = Object.values(reviewResults).some((r: { status: string }) => r.status === 'REJECTED');
      const project = creativeProjects.find(p => p.id === reviewingCalendar.creativeProjectId);

      if (hasRejected) {
        // Needs revision
        await updateDoc(doc(db, 'creative_calendars', reviewingCalendar.id), {
          status: 'NEEDS_REVISION',
          lastReviewedAt: now,
          updatedAt: now,
          updatedBy: currentUser.id,
        });

        await updateDoc(doc(db, 'creative_projects', reviewingCalendar.creativeProjectId), {
          status: 'NEEDS_REVISION',
          updatedAt: now,
        });

        // Notify copywriter (non-blocking)
        if (project?.assignedCopywriterId) {
          notifyUsers({
            type: 'CREATIVE_REVISION_REQUESTED',
            title: 'Revision Requested',
            message: 'Your creative calendar needs revision. Check the rejected items for feedback.',
            recipientIds: [project.assignedCopywriterId],
            entityId: reviewingCalendar.creativeProjectId,
            sendPush: true,
            createdBy: currentUser.id,
          }).catch(err => console.warn('Notification failed (non-critical):', err));
          onNotify('CREATIVE_REVISION_REQUESTED', 'Revision Requested', 'Creative calendar needs revision', [project.assignedCopywriterId], reviewingCalendar.creativeProjectId);
        }
      }

      setReviewingCalendar(null);
      setReviewComplete(false);
      setReviewResults({});
    } catch (error) {
      console.error('Error finalizing review:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateCalendar = async () => {
    if (!reviewingCalendar || !currentUser) return;
    setSaving(true);

    try {
      const client = clients.find(c => c.id === reviewingCalendar.clientId);
      if (!client) throw new Error('Client not found');

      const approvedItems = creativeCalendarItems.filter(
        i => i.creativeCalendarId === reviewingCalendar.id
      );

      await activateCreativeCalendar({
        creativeCalendar: reviewingCalendar,
        approvedItems,
        client,
        creativeProjectId: reviewingCalendar.creativeProjectId,
        userId: currentUser.id,
      });

      // Notify copywriter (non-blocking)
      const project = creativeProjects.find(p => p.id === reviewingCalendar.creativeProjectId);
      if (project?.assignedCopywriterId) {
        notifyUsers({
          type: 'CREATIVE_APPROVED',
          title: 'Calendar Approved & Activated',
          message: `Your creative calendar for ${client.name} has been approved and activated in the Calendar Department!`,
          recipientIds: [project.assignedCopywriterId],
          entityId: reviewingCalendar.creativeProjectId,
          sendPush: true,
          createdBy: currentUser.id,
        }).catch(err => console.warn('Notification failed (non-critical):', err));
        onNotify('CREATIVE_APPROVED', 'Calendar Approved', `Creative calendar for ${client.name} activated`, [project.assignedCopywriterId], reviewingCalendar.creativeProjectId);
      }

      setReviewingCalendar(null);
      setReviewComplete(false);
      setReviewResults({});
    } catch (error) {
      console.error('Error activating calendar:', error);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // ARCHIVE
  // ============================================
  const handleArchive = async (projectId: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'creative_projects', projectId), {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser.id,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error archiving:', error);
    }
  };

  const handleUnarchive = async (projectId: string) => {
    try {
      await updateDoc(doc(db, 'creative_projects', projectId), {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error unarchiving:', error);
    }
  };

  // ============================================
  // RENDER: REVIEW MODE
  // ============================================
  if (reviewingCalendar) {
    const allCalendarItems = creativeCalendarItems.filter(
      i => i.creativeCalendarId === reviewingCalendar.id
    );
    const isRevisionReview = reviewingCalendar.status === 'UPDATED';

    // For revision reviews: only show items that need re-review (not already approved)
    // For first reviews: show everything
    const calendarItemsForReview = isRevisionReview
      ? allCalendarItems.filter(i => i.reviewStatus !== 'APPROVED')
      : allCalendarItems;

    const alreadyApprovedCount = isRevisionReview
      ? allCalendarItems.filter(i => i.reviewStatus === 'APPROVED').length
      : 0;

    const client = clients.find(c => c.id === reviewingCalendar.clientId);
    const hasRejected = Object.values(reviewResults).some((r: { status: string }) => r.status === 'REJECTED');
    const allReviewed = calendarItemsForReview.length > 0 && 
      calendarItemsForReview.every(item => reviewResults[item.id]);

    return (
      <div className="space-y-4">
        {/* Review Header */}
        <div className={`${surface} rounded-xl p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-iris-white">
                {isRevisionReview ? 'Revision Review' : 'Calendar Review'}
              </h2>
              <p className="text-sm text-iris-white/60">
                {client?.name} — {reviewingCalendar.monthKey}
                {isRevisionReview && alreadyApprovedCount > 0 && (
                  <span className="ml-2 text-emerald-400/70">
                    • {alreadyApprovedCount} item{alreadyApprovedCount !== 1 ? 's' : ''} already approved
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => { setReviewingCalendar(null); setReviewComplete(false); setReviewResults({}); }}
              className="p-2 text-iris-white/60 hover:text-iris-white rounded-lg hover:bg-iris-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Swipe Cards or Completion */}
        {!reviewComplete && calendarItemsForReview.length > 0 ? (
          <SwipeReviewCard
            items={calendarItemsForReview}
            clientId={reviewingCalendar.clientId}
            projectId={reviewingCalendar.creativeProjectId}
            onApprove={handleItemApprove}
            onReject={handleItemReject}
            onComplete={handleReviewComplete}
          />
        ) : reviewComplete || allReviewed ? (
          <div className={`${surface} rounded-xl p-6 text-center space-y-4`}>
            {hasRejected ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>
                <h3 className="text-lg font-bold text-iris-white">Revision Required</h3>
                <p className="text-sm text-iris-white/60 max-w-md mx-auto">
                  Some items were rejected. The copywriter will be notified to make revisions.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleFinalizeReview}
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-br from-rose-600 to-rose-700 text-white rounded-lg font-medium hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Sending...' : 'Send Back for Revision'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-iris-white">All Items Approved!</h3>
                <p className="text-sm text-iris-white/60 max-w-md mx-auto">
                  All calendar items passed review. Activate to push them into the official Calendar Department.
                </p>
                <button
                  onClick={handleActivateCalendar}
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all text-lg"
                >
                  {saving ? 'Activating...' : '✨ Confirm & Activate Calendar'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`${surface} rounded-xl p-8 text-center text-iris-white/60`}>
            No items to review in this calendar yet.
          </div>
        )}

        {/* Review Summary */}
        {Object.keys(reviewResults).length > 0 && (
          <div className={`${surface} rounded-xl p-4`}>
            <h4 className="text-sm font-semibold text-iris-white/70 mb-3">Review Summary</h4>
            <div className="space-y-2">
              {calendarItemsForReview.map(item => {
                const result = reviewResults[item.id];
                return (
                  <div key={item.id} className="flex items-center gap-3 py-1.5">
                    {result ? (
                      result.status === 'APPROVED' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400" />
                      )
                    ) : (
                      <Clock className="w-4 h-4 text-iris-white/30" />
                    )}
                    <span className={`text-sm ${result ? 'text-iris-white/80' : 'text-iris-white/40'}`}>
                      {item.title}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.type === 'VIDEO' ? 'bg-purple-500/20 text-purple-400' :
                      item.type === 'PHOTO' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{item.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: MAIN VIEW
  // ============================================
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={`${surface} rounded-xl p-1 flex gap-1`}>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'projects' ? 'bg-iris-red text-white' : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
          }`}
        >
          Projects ({activeProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === 'review' ? 'bg-iris-red text-white' : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
          }`}
        >
          Pending Review ({projectsWithPendingReview.length})
          {projectsWithPendingReview.length > 0 && activeTab !== 'review' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('cal-revisions')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === 'cal-revisions' ? 'bg-iris-red text-white' : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
          }`}
        >
          Cal Revisions ({calendarItemRevisions.filter(r => r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE').length})
          {calendarItemRevisions.filter(r => r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE').length > 0 && activeTab !== 'cal-revisions' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-full" />
          )}
        </button>
      </div>

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/40" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
            {checkPermission(PERMISSIONS.CREATIVE.MANAGE) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:brightness-110 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Creative Project
              </button>
            )}
          </div>

          {/* Projects List */}
          {filteredProjects.length === 0 ? (
            <div className={`${surface} rounded-xl p-8 text-center text-iris-white/60`}>
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-iris-white/20" />
              <p>No active creative projects.</p>
              <p className="text-sm mt-1">Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map(project => {
                const client = clients.find(c => c.id === project.clientId);
                const copywriter = users.find(u => u.id === project.assignedCopywriterId);
                const calendars = creativeCalendars.filter(c => c.creativeProjectId === project.id);
                const latestCalendar = calendars[calendars.length - 1];
                const totalItems = creativeCalendarItems.filter(i => 
                  calendars.some(c => c.id === i.creativeCalendarId)
                ).length;

                return (
                  <div key={project.id} className={`${surface} rounded-xl p-5 space-y-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-iris-white">{client?.name || 'Unknown Client'}</h3>
                          <span className={`${pill} ${STATUS_COLORS[project.status] || ''}`}>
                            {project.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-iris-white/50">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {copywriter?.name || 'Unassigned'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {latestCalendar?.monthKey || 'No calendar'}
                          </span>
                          <span>{totalItems} items</span>
                          {latestCalendar && (
                            <span className={`${pill} text-[10px] ${STATUS_COLORS[latestCalendar.status] || ''}`}>
                              Cal: {latestCalendar.status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* View strategy/brief */}
                        {project.briefFile?.url && (
                          <a
                            href={project.briefFile.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-iris-white/50 hover:text-iris-red rounded-lg hover:bg-iris-white/5 transition-colors"
                            title="View Brief"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {/* Review button */}
                        {latestCalendar && (latestCalendar.status === 'UNDER_REVIEW' || latestCalendar.status === 'UPDATED') && (
                          <button
                            onClick={() => setReviewingCalendar(latestCalendar)}
                            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {/* Archive */}
                        {project.status === 'APPROVED' && (
                          <button
                            onClick={() => handleArchive(project.id)}
                            className="p-2 text-iris-white/40 hover:text-iris-white/70 rounded-lg hover:bg-iris-white/5 transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Archived Section */}
          {archivedProjects.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-sm text-iris-white/50 hover:text-iris-white/70 transition-colors"
              >
                {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Archive className="w-4 h-4" />
                Archived ({archivedProjects.length})
              </button>
              {showArchived && (
                <div className="grid gap-3 mt-3">
                  {archivedProjects.map(project => {
                    const client = clients.find(c => c.id === project.clientId);
                    return (
                      <div key={project.id} className={`${surface} rounded-xl p-4 opacity-60`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-iris-white/70">{client?.name || 'Unknown'}</span>
                            <span className="text-xs text-iris-white/40 ml-2">Archived {project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ''}</span>
                          </div>
                          <button
                            onClick={() => handleUnarchive(project.id)}
                            className="p-1.5 text-iris-white/40 hover:text-iris-white/70 transition-colors"
                            title="Unarchive"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* REVIEW TAB */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {projectsWithPendingReview.length === 0 ? (
            <div className={`${surface} rounded-xl p-8 text-center text-iris-white/60`}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400/30" />
              <p>No calendars pending review.</p>
            </div>
          ) : (
            projectsWithPendingReview.map(project => {
              const client = clients.find(c => c.id === project.clientId);
              const copywriter = users.find(u => u.id === project.assignedCopywriterId);
              const pendingCalendars = creativeCalendars.filter(
                c => c.creativeProjectId === project.id && (c.status === 'UNDER_REVIEW' || c.status === 'UPDATED')
              );

              return pendingCalendars.map(cal => {
                const itemCount = creativeCalendarItems.filter(i => i.creativeCalendarId === cal.id).length;
                return (
                  <div key={cal.id} className={`${surface} rounded-xl p-5`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-iris-white">{client?.name}</h3>
                          <span className={`${pill} ${STATUS_COLORS[cal.status]}`}>
                            {cal.status === 'UPDATED' ? 'Updated' : 'Under Review'}
                          </span>
                          {cal.revisionCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-iris-white/40">
                              <RotateCcw className="w-3 h-3" /> Rev {cal.revisionCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-iris-white/50 mt-1">
                          {cal.monthKey} • {copywriter?.name} • {itemCount} items
                        </p>
                      </div>
                      <button
                        onClick={() => setReviewingCalendar(cal)}
                        className="px-4 py-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                      >
                        Start Review
                      </button>
                    </div>
                  </div>
                );
              });
            })
          )}
        </div>
      )}

      {/* CALENDAR REVISIONS TAB */}
      {activeTab === 'cal-revisions' && (
        <div className="space-y-4">
          {(() => {
            const activeRevisions = calendarItemRevisions.filter(r => r.status !== 'SYNCED_TO_CALENDAR');
            if (activeRevisions.length === 0) {
              return (
                <div className={`${surface} rounded-xl p-8 text-center text-iris-white/60`}>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400/30" />
                  <p>No active calendar revisions.</p>
                </div>
              );
            }

            // Status display helper
            const getStatusBadge = (status: string) => {
              switch (status) {
                case 'REVISION_REQUESTED': return { label: 'Requested', color: 'bg-amber-500/20 text-amber-400 border-amber-400/30' };
                case 'IN_CREATIVE_REVISION': return { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-400/30' };
                case 'AWAITING_CREATIVE_APPROVAL': return { label: 'Awaiting Approval', color: 'bg-purple-500/20 text-purple-400 border-purple-400/30' };
                case 'APPROVED_BY_CREATIVE': return { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30' };
                default: return { label: status, color: 'bg-white/10 text-white/60 border-white/10' };
              }
            };

            return activeRevisions.sort((a, b) => {
              const order: Record<string, number> = { 'AWAITING_CREATIVE_APPROVAL': 0, 'REVISION_REQUESTED': 1, 'IN_CREATIVE_REVISION': 2, 'APPROVED_BY_CREATIVE': 3 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            }).map(rev => {
              const calItem = calendarItems.find(ci => ci.id === rev.calendarItemId);
              const client = clients.find(c => c.id === rev.clientId);
              const copywriter = rev.revisedBy ? users.find(u => u.id === rev.revisedBy) : null;
              const requester = users.find(u => u.id === rev.requestedBy);

              return (
                <div key={rev.id} className={`${surface} rounded-xl p-5 space-y-4`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-iris-white">{calItem?.autoName || 'Calendar Item'}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(rev.status).color}`}>
                        {getStatusBadge(rev.status).label}
                      </span>
                    </div>
                    <span className="text-xs text-iris-white/50">{client?.name}</span>
                  </div>

                  {/* Original revision request */}
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                    <div className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Revision Request by {requester?.name || 'Calendar Dept'}
                    </div>
                    <p className="text-sm text-iris-white/70 whitespace-pre-wrap" dir="auto">{rev.revisionNote}</p>
                  </div>

                  {/* Revised content */}
                  {rev.revisedBrief && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                      <div className="text-xs font-semibold text-emerald-400 mb-1">
                        Revised by {copywriter?.name || 'Copywriter'} on {rev.revisedAt ? new Date(rev.revisedAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <p className="text-sm text-iris-white/80 whitespace-pre-wrap" dir="auto">{rev.revisedBrief}</p>
                      {rev.revisedNotes && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/10">
                          <div className="text-xs font-semibold text-emerald-400/60 mb-1">Notes:</div>
                          <p className="text-sm text-iris-white/60 whitespace-pre-wrap" dir="auto">{rev.revisedNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Original content for comparison */}
                  {calItem && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                      <div className="text-xs font-semibold text-iris-white/40 mb-1">Original Calendar Brief:</div>
                      <p className="text-sm text-iris-white/50 whitespace-pre-wrap line-clamp-4" dir="auto">{calItem.primaryBrief}</p>
                    </div>
                  )}

                  {/* Approve / Reject - only for AWAITING_CREATIVE_APPROVAL */}
                  {rev.status === 'AWAITING_CREATIVE_APPROVAL' && (
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (!confirm('Reject this revision? The copywriter will need to revise again.')) return;
                        const rejectNote = prompt('Rejection reason (optional):') || '';
                        try {
                          const now = new Date().toISOString();
                          await updateDoc(doc(db, 'calendar_item_revisions', rev.id), {
                            status: 'REVISION_REQUESTED',
                            reviewedBy: currentUser?.id,
                            reviewedAt: now,
                            reviewNote: rejectNote,
                            revisedBrief: null,
                            revisedNotes: null,
                            revisedBy: null,
                            revisedAt: null,
                            updatedAt: now,
                          });
                          if (calItem) {
                            await updateDoc(doc(db, 'calendar_items', calItem.id), {
                              revisionStatus: 'REVISION_REQUESTED',
                              updatedAt: now,
                            });
                          }
                          // Notify copywriter
                          const creativeCalendar = creativeCalendars.find(cc => cc.id === rev.creativeCalendarId);
                          const project = creativeCalendar ? creativeProjects.find(p => p.id === creativeCalendar.creativeProjectId) : null;
                          if (project?.assignedCopywriterId) {
                            await notifyUsers({
                              type: 'CALENDAR_REVISION_REJECTED',
                              title: 'Calendar Revision Rejected',
                              message: `${currentUser?.name} rejected the revision for "${calItem?.autoName}". ${rejectNote ? `Reason: ${rejectNote}` : 'Please revise again.'}`,
                              recipientIds: [project.assignedCopywriterId],
                              entityId: rev.id,
                              actionUrl: '/creative',
                              sendPush: true,
                              createdBy: currentUser?.id || 'system',
                            });
                          }
                        } catch (error) {
                          console.error('Error rejecting revision:', error);
                          alert('Failed to reject revision');
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-rose-500/20 text-rose-400 border border-rose-400/30 rounded-lg text-sm font-medium hover:bg-rose-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const now = new Date().toISOString();
                          await updateDoc(doc(db, 'calendar_item_revisions', rev.id), {
                            status: 'APPROVED_BY_CREATIVE',
                            reviewedBy: currentUser?.id,
                            reviewedAt: now,
                            updatedAt: now,
                          });
                          if (calItem) {
                            await updateDoc(doc(db, 'calendar_items', calItem.id), {
                              revisionStatus: 'APPROVED_BY_CREATIVE',
                              updatedAt: now,
                            });
                          }
                          // Notify calendar department (the original requester)
                          await notifyUsers({
                            type: 'CALENDAR_REVISION_APPROVED',
                            title: 'Calendar Revision Approved',
                            message: `${currentUser?.name} approved the revision for "${calItem?.autoName}". Ready to sync.`,
                            recipientIds: [rev.requestedBy],
                            entityId: rev.id,
                            actionUrl: '/calendar',
                            sendPush: true,
                            createdBy: currentUser?.id || 'system',
                          });
                        } catch (error) {
                          console.error('Error approving revision:', error);
                          alert('Failed to approve revision');
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                  )}

                  {/* Status info for non-actionable states */}
                  {rev.status === 'REVISION_REQUESTED' && (
                    <div className="text-xs text-amber-400/70 italic flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Waiting for copywriter to start working on this revision
                    </div>
                  )}
                  {rev.status === 'IN_CREATIVE_REVISION' && (
                    <div className="text-xs text-blue-400/70 italic flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Copywriter is currently working on this revision
                    </div>
                  )}
                  {rev.status === 'APPROVED_BY_CREATIVE' && (
                    <div className="text-xs text-emerald-400/70 italic flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Approved — waiting for Calendar Dept to sync
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
          <div className={`${elevated} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200`}>
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">New Creative Project</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-iris-white/70 hover:text-iris-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Client Select */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Client *</label>
                <select
                  value={selectedClientId}
                  onChange={e => { setSelectedClientId(e.target.value); setSelectedStrategyId(''); }}
                  className={inputClass}
                  required
                >
                  <option value="">Select Client</option>
                  {clients.filter(c => !c.isArchived).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Month Key */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Calendar Month *</label>
                <input
                  type="month"
                  value={monthKey}
                  onChange={e => setMonthKey(e.target.value)}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Strategy Selection */}
              {selectedClientId && (
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">Marketing Strategy</label>
                  {loadingStrategies ? (
                    <p className="text-sm text-iris-white/50">Loading strategies...</p>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={selectedStrategyId}
                        onChange={e => setSelectedStrategyId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">No strategy linked</option>
                        {strategies.map(s => (
                          <option key={s.id} value={s.id}>{s.monthLabel} — {s.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowStrategyModal(true)}
                        className="flex items-center gap-1.5 text-xs text-iris-red hover:text-iris-red/80 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Strategy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Brief Upload */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Creative Brief</label>
                <div
                  onClick={() => briefInputRef.current?.click()}
                  className="border-2 border-dashed border-iris-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-iris-white/5 transition-colors"
                >
                  {briefFile ? (
                    <div className="flex items-center justify-center gap-2 text-iris-red">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-medium">{briefFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-iris-white/50">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-sm">Upload creative brief</span>
                    </div>
                  )}
                  <input ref={briefInputRef} type="file" className="hidden" onChange={e => e.target.files && setBriefFile(e.target.files[0])} />
                </div>
              </div>

              {/* Assign Copywriter */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Assign Copywriter *</label>
                <select
                  value={selectedCopywriterId}
                  onChange={e => setSelectedCopywriterId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select Copywriter</option>
                  {copywriters.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.role}{u.role !== 'Copywriter' ? ' ⚠️' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-iris-white/10 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={saving || !selectedClientId || !selectedCopywriterId}
                className="flex-1 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2.5 rounded-lg font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE STRATEGY CREATION MODAL */}
      {showStrategyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
          <div className={`${elevated} rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">Add Strategy</h2>
              <button onClick={() => setShowStrategyModal(false)} className="text-iris-white/70 hover:text-iris-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateStrategy} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">Month</label>
                  <select value={strategyForm.month} onChange={e => setStrategyForm({ ...strategyForm, month: Number(e.target.value) })} className={inputClass}>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">Year</label>
                  <select value={strategyForm.year} onChange={e => setStrategyForm({ ...strategyForm, year: Number(e.target.value) })} className={inputClass}>
                    {[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1, new Date().getFullYear()+2].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Title *</label>
                <input
                  required
                  type="text"
                  value={strategyForm.title}
                  onChange={e => setStrategyForm({ ...strategyForm, title: e.target.value })}
                  placeholder="e.g. Q1 Content Strategy"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-2">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="file" checked={strategyForm.type === 'file'} onChange={() => setStrategyForm({ ...strategyForm, type: 'file' })} className="text-iris-red" />
                    <span className="text-sm text-iris-white">File Upload</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="link" checked={strategyForm.type === 'link'} onChange={() => setStrategyForm({ ...strategyForm, type: 'link' })} className="text-iris-red" />
                    <span className="text-sm text-iris-white">External Link</span>
                  </label>
                </div>
              </div>

              {strategyForm.type === 'file' ? (
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">File</label>
                  <div
                    onClick={() => strategyFileRef.current?.click()}
                    className="border-2 border-dashed border-iris-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-iris-white/5 transition-colors"
                  >
                    {strategyFile ? (
                      <div className="flex items-center justify-center gap-2 text-iris-red">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">{strategyFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-iris-white/50">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-sm">Click to upload file</span>
                      </div>
                    )}
                    <input ref={strategyFileRef} type="file" className="hidden" onChange={e => e.target.files && setStrategyFile(e.target.files[0])} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">URL *</label>
                  <input
                    required
                    type="url"
                    value={strategyForm.url}
                    onChange={e => setStrategyForm({ ...strategyForm, url: e.target.value })}
                    placeholder="https://"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={strategyForm.notes}
                  onChange={e => setStrategyForm({ ...strategyForm, notes: e.target.value })}
                  className={`${inputClass} min-h-[80px]`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStrategyModal(false)} className="flex-1 px-4 py-2 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingStrategy} className="flex-1 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg font-medium hover:brightness-110 disabled:opacity-50 transition-all">
                  {savingStrategy ? 'Saving...' : 'Save Strategy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerView;
