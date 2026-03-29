import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { notifyUsers } from '../../services/notificationService';
import type {
  CreativeProject,
  CreativeCalendar,
  CreativeCalendarItem,
  CalendarItemRevision,
  Client,
  User,
  CalendarMonth,
  CalendarItem,
  AgencyFile,
  ClientMarketingStrategy,
  NotificationType,
  CreativeRejectionReference,
  CalendarContentType,
  CalendarReferenceLink,
  CalendarReferenceFile,
} from '../../types';
import { PERMISSIONS } from '../../lib/permissions';
import SwipeReviewCard from './SwipeReviewCard';
import { activateCreativeCalendar } from './CalendarActivation';
import {
  DarkMediaThumb,
  DrivePreviewModal,
  collectRevisionRefMedia,
  collectRevisionResponseMedia,
  type MediaEntry,
} from '../../utils/presentationHelpers';
import {
  Plus,
  Upload,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Eye,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Users,
  Calendar,
  Check,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  X,
  Sparkles,
  Clock,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Send,
  Inbox,
  Layers,
  Pencil,
  Trash2,
  Video,
  Image,
  Clapperboard,
  Edit2,
  Save,
  FileSpreadsheet,
} from 'lucide-react';
import CreativeImportModal from './CreativeImportModal';

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
  onNotify: (
    type: NotificationType,
    title: string,
    message: string,
    recipientIds: string[],
    entityId?: string,
    actionUrl?: string,
  ) => void;
  onUploadFile?: (file: AgencyFile) => Promise<void>;
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
  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50';
  const pill =
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border';

  // State — auto-select Cal Revisions tab if there are active revisions
  const hasActiveRevisions = calendarItemRevisions.some(
    (r) => !r.isArchived && r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE',
  );
  const [activeTab, setActiveTab] = useState<'projects' | 'review' | 'cal-revisions'>(
    hasActiveRevisions ? 'cal-revisions' : 'projects',
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [revisionFilter, setRevisionFilter] = useState<'active' | 'completed' | 'archived'>('active');
  const [drivePreview, setDrivePreview] = useState<{ url: string; title: string } | null>(null);
  const [reviewingCalendar, setReviewingCalendar] = useState<CreativeCalendar | null>(null);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [editingProject, setEditingProject] = useState<CreativeProject | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Calendar item CRUD state
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCalendarId, setImportCalendarId] = useState<string | null>(null);
  const [editingCalItem, setEditingCalItem] = useState<CreativeCalendarItem | null>(null);
  const [itemTargetCalendarId, setItemTargetCalendarId] = useState<string | null>(null);
  const [itemTargetProjectId, setItemTargetProjectId] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    type: 'VIDEO' as CalendarContentType,
    title: '',
    mainIdea: '',
    briefDescription: '',
    notes: '',
    publishAt: '',
    isCarousel: false,
    referenceLinks: [] as CalendarReferenceLink[],
    referenceFiles: [] as CalendarReferenceFile[],
  });
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingRef, setUploadingRef] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

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
  const [reviewResults, setReviewResults] = useState<
    Record<string, { status: 'APPROVED' | 'REJECTED'; note?: string; references?: CreativeRejectionReference[] }>
  >({});

  // Copywriter users (Copywriter role first, then other active users as fallback)
  const copywriters = users
    .filter((u) => u.status === 'active')
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
      const q = query(collection(db, 'client_strategies'), where('clientId', '==', clientId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ClientMarketingStrategy);
      data.sort((a, b) => b.year - a.year || b.month - a.month);
      setStrategies(data);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoadingStrategies(false);
    }
  };

  // Active vs archived projects
  const activeProjects = creativeProjects.filter((p) => !p.isArchived);
  const archivedProjects = creativeProjects.filter((p) => p.isArchived);

  // Projects needing review
  const projectsWithPendingReview = activeProjects.filter((p) => {
    const cals = creativeCalendars.filter((c) => c.creativeProjectId === p.id);
    return cals.some((c) => c.status === 'UNDER_REVIEW' || c.status === 'UPDATED');
  });

  const filteredProjects = activeProjects.filter((p) => {
    if (!searchTerm) return true;
    const client = clients.find((c) => c.id === p.clientId);
    const copywriter = users.find((u) => u.id === p.assignedCopywriterId);
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
      const client = clients.find((c) => c.id === selectedClientId);
      notifyUsers({
        type: 'CREATIVE_ASSIGNED',
        title: 'New Creative Assignment',
        message: `You've been assigned a creative project for ${client?.name || 'a client'}. Check Creative Direction for details.`,
        recipientIds: [selectedCopywriterId],
        entityId: docRef.id,
        sendPush: true,
        createdBy: currentUser.id,
      }).catch((err) => console.warn('Notification failed (non-critical):', err));
      onNotify(
        'CREATIVE_ASSIGNED',
        'Creative Project Created',
        `Assigned to copywriter for ${client?.name || 'client'}`,
        [selectedCopywriterId],
        docRef.id,
      );

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
      const months = [
        '',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
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
      setStrategyForm({
        title: '',
        type: 'file',
        url: '',
        notes: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      });
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
  const handleItemApprove = async (itemId: string) => {
    setReviewResults((prev) => ({ ...prev, [itemId]: { status: 'APPROVED' } }));
    // Persist immediately so progress survives exit
    try {
      await updateDoc(doc(db, 'creative_calendar_items', itemId), {
        reviewStatus: 'APPROVED',
        rejectionNote: null,
        rejectionReferences: [],
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error saving approve:', err);
    }
  };

  const handleItemReject = async (itemId: string, note: string, references: CreativeRejectionReference[]) => {
    setReviewResults((prev) => ({ ...prev, [itemId]: { status: 'REJECTED', note, references } }));
    // Persist immediately so progress survives exit
    try {
      await updateDoc(doc(db, 'creative_calendar_items', itemId), {
        reviewStatus: 'REJECTED',
        rejectionNote: note || '',
        rejectionReferences: references || [],
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error saving reject:', err);
    }
  };

  const handleReviewComplete = () => {
    setReviewComplete(true);
  };

  const handleFinalizeReview = async () => {
    if (!reviewingCalendar || !currentUser) return;
    setSaving(true);

    try {
      const now = new Date().toISOString();
      // Items are already saved to Firestore as they were reviewed — no need to batch-update them again

      const hasRejected = Object.values(reviewResults).some((r: { status: string }) => r.status === 'REJECTED');
      const project = creativeProjects.find((p) => p.id === reviewingCalendar.creativeProjectId);

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
          }).catch((err) => console.warn('Notification failed (non-critical):', err));
          onNotify(
            'CREATIVE_REVISION_REQUESTED',
            'Revision Requested',
            'Creative calendar needs revision',
            [project.assignedCopywriterId],
            reviewingCalendar.creativeProjectId,
          );
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
      const client = clients.find((c) => c.id === reviewingCalendar.clientId);
      if (!client) throw new Error('Client not found');

      const approvedItems = creativeCalendarItems.filter((i) => i.creativeCalendarId === reviewingCalendar.id);

      await activateCreativeCalendar({
        creativeCalendar: reviewingCalendar,
        approvedItems,
        client,
        creativeProjectId: reviewingCalendar.creativeProjectId,
        userId: currentUser.id,
      });

      // Notify copywriter (non-blocking)
      const project = creativeProjects.find((p) => p.id === reviewingCalendar.creativeProjectId);
      if (project?.assignedCopywriterId) {
        notifyUsers({
          type: 'CREATIVE_APPROVED',
          title: 'Calendar Approved & Activated',
          message: `Your creative calendar for ${client.name} has been approved and activated in the Calendar Department!`,
          recipientIds: [project.assignedCopywriterId],
          entityId: reviewingCalendar.creativeProjectId,
          sendPush: true,
          createdBy: currentUser.id,
        }).catch((err) => console.warn('Notification failed (non-critical):', err));
        onNotify(
          'CREATIVE_APPROVED',
          'Calendar Approved',
          `Creative calendar for ${client.name} activated`,
          [project.assignedCopywriterId],
          reviewingCalendar.creativeProjectId,
        );
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
  // EDIT PROJECT
  // ============================================
  const openEditModal = (project: CreativeProject) => {
    setSelectedClientId(project.clientId);
    setSelectedCopywriterId(project.assignedCopywriterId);
    setSelectedStrategyId(project.strategyId || '');
    const calendars = creativeCalendars.filter((c) => c.creativeProjectId === project.id);
    const latestCal = calendars[calendars.length - 1];
    setMonthKey(latestCal?.monthKey || new Date().toISOString().slice(0, 7));
    setBriefFile(null);
    setEditingProject(project);
  };

  const handleEditProject = async () => {
    if (!currentUser || !editingProject || !selectedClientId || !selectedCopywriterId) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let briefFileData = editingProject.briefFile;

      // Upload new brief file if selected
      if (briefFile) {
        const timestamp = Date.now();
        const storagePath = `clients/${selectedClientId}/creative/${editingProject.id}/brief/${timestamp}_${briefFile.name}`;
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

      await updateDoc(doc(db, 'creative_projects', editingProject.id), {
        clientId: selectedClientId,
        strategyId: selectedStrategyId || null,
        briefFile: briefFileData,
        assignedCopywriterId: selectedCopywriterId,
        updatedAt: now,
      });

      // Update the associated calendar's clientId and monthKey if changed
      const calendars = creativeCalendars.filter((c) => c.creativeProjectId === editingProject.id);
      const latestCal = calendars[calendars.length - 1];
      if (latestCal && (latestCal.clientId !== selectedClientId || latestCal.monthKey !== monthKey)) {
        await updateDoc(doc(db, 'creative_calendars', latestCal.id), {
          clientId: selectedClientId,
          monthKey,
          updatedAt: now,
          updatedBy: currentUser.id,
        });
      }

      // Notify new copywriter if changed
      if (selectedCopywriterId !== editingProject.assignedCopywriterId) {
        const client = clients.find((c) => c.id === selectedClientId);
        notifyUsers({
          type: 'CREATIVE_ASSIGNED',
          title: 'Creative Assignment Updated',
          message: `You've been assigned a creative project for ${client?.name || 'a client'}.`,
          recipientIds: [selectedCopywriterId],
          entityId: editingProject.id,
          sendPush: true,
          createdBy: currentUser.id,
        }).catch((err) => console.warn('Notification failed (non-critical):', err));
      }

      setEditingProject(null);
      setSelectedClientId('');
      setSelectedStrategyId('');
      setSelectedCopywriterId('');
      setBriefFile(null);
      setMonthKey(new Date().toISOString().slice(0, 7));
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE PROJECT
  // ============================================
  const handleDeleteProject = async (projectId: string) => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this project? This will also delete all associated calendars and calendar items. This action cannot be undone.',
    );
    if (!confirmed) return;
    setDeletingProjectId(projectId);
    try {
      const batch = writeBatch(db);

      // Delete all calendar items for this project
      const calendars = creativeCalendars.filter((c) => c.creativeProjectId === projectId);
      const calendarIds = calendars.map((c) => c.id);
      const items = creativeCalendarItems.filter((i) => calendarIds.includes(i.creativeCalendarId));
      for (const item of items) {
        batch.delete(doc(db, 'creative_calendar_items', item.id));
      }

      // Delete all calendars for this project
      for (const cal of calendars) {
        batch.delete(doc(db, 'creative_calendars', cal.id));
      }

      // Delete the project itself
      batch.delete(doc(db, 'creative_projects', projectId));

      await batch.commit();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  // ============================================
  // CALENDAR ITEM CRUD
  // ============================================
  const openItemModal = (calendarId: string, projectId: string, item?: CreativeCalendarItem) => {
    setItemTargetCalendarId(calendarId);
    setItemTargetProjectId(projectId);
    if (item) {
      setEditingCalItem(item);
      setItemForm({
        type: item.type,
        title: item.title,
        mainIdea: item.mainIdea,
        briefDescription: item.briefDescription,
        notes: item.notes,
        publishAt: item.publishAt || '',
        isCarousel: item.isCarousel || false,
        referenceLinks: item.referenceLinks || [],
        referenceFiles: item.referenceFiles || [],
      });
    } else {
      setEditingCalItem(null);
      setItemForm({
        type: 'VIDEO',
        title: '',
        mainIdea: '',
        briefDescription: '',
        notes: '',
        publishAt: '',
        isCarousel: false,
        referenceLinks: [],
        referenceFiles: [],
      });
    }
    setLinkTitle('');
    setLinkUrl('');
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemTargetCalendarId || !currentUser || !itemForm.title.trim()) return;
    setSavingItem(true);
    try {
      const now = new Date().toISOString();
      if (editingCalItem) {
        await updateDoc(doc(db, 'creative_calendar_items', editingCalItem.id), {
          type: itemForm.type,
          title: itemForm.title.trim(),
          mainIdea: itemForm.mainIdea.trim(),
          briefDescription: itemForm.briefDescription.trim(),
          notes: itemForm.notes.trim(),
          publishAt: itemForm.publishAt,
          isCarousel: itemForm.isCarousel,
          referenceLinks: itemForm.referenceLinks,
          referenceFiles: itemForm.referenceFiles,
          updatedAt: now,
        });
      } else {
        await addDoc(collection(db, 'creative_calendar_items'), {
          creativeCalendarId: itemTargetCalendarId,
          type: itemForm.type,
          title: itemForm.title.trim(),
          mainIdea: itemForm.mainIdea.trim(),
          briefDescription: itemForm.briefDescription.trim(),
          notes: itemForm.notes.trim(),
          publishAt: itemForm.publishAt,
          isCarousel: itemForm.isCarousel,
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
      setEditingCalItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this calendar item?')) return;
    try {
      await deleteDoc(doc(db, 'creative_calendar_items', itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const addReferenceLink = () => {
    if (!linkUrl.trim()) return;
    setItemForm((prev) => ({
      ...prev,
      referenceLinks: [...prev.referenceLinks, { title: linkTitle.trim() || linkUrl.trim(), url: linkUrl.trim() }],
    }));
    setLinkTitle('');
    setLinkUrl('');
  };

  const removeReferenceLink = (index: number) => {
    setItemForm((prev) => ({
      ...prev,
      referenceLinks: prev.referenceLinks.filter((_, i) => i !== index),
    }));
  };

  const handleRefFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !itemTargetProjectId || !currentUser) return;
    setUploadingRef(true);
    try {
      const project = creativeProjects.find((p) => p.id === itemTargetProjectId);
      const timestamp = Date.now();
      const storagePath = `clients/${project?.clientId}/creative/${itemTargetProjectId}/references/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setItemForm((prev) => ({
        ...prev,
        referenceFiles: [
          ...prev.referenceFiles,
          {
            fileName: file.name,
            storagePath,
            downloadURL,
            uploadedBy: currentUser.id,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } catch (error) {
      console.error('Error uploading reference file:', error);
    } finally {
      setUploadingRef(false);
      if (refFileInputRef.current) refFileInputRef.current.value = '';
    }
  };

  const removeReferenceFile = (index: number) => {
    setItemForm((prev) => ({
      ...prev,
      referenceFiles: prev.referenceFiles.filter((_, i) => i !== index),
    }));
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
    const allCalendarItems = creativeCalendarItems.filter((i) => i.creativeCalendarId === reviewingCalendar.id);
    const isRevisionReview = reviewingCalendar.status === 'UPDATED';

    // For revision reviews: only show items that need re-review (not already approved from previous session)
    // For first reviews: show everything
    const calendarItemsForReview = isRevisionReview
      ? allCalendarItems.filter((i) => i.reviewStatus !== 'APPROVED')
      : allCalendarItems;

    const alreadyApprovedCount = isRevisionReview
      ? allCalendarItems.filter((i) => i.reviewStatus === 'APPROVED').length
      : 0;

    // Items still needing review (not yet in reviewResults)
    const unreviewedItems = calendarItemsForReview.filter((item) => !reviewResults[item.id]);

    const client = clients.find((c) => c.id === reviewingCalendar.clientId);
    const hasRejected = Object.values(reviewResults).some((r: { status: string }) => r.status === 'REJECTED');
    const allReviewed =
      calendarItemsForReview.length > 0 && calendarItemsForReview.every((item) => reviewResults[item.id]);

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
              {/* Progress bar */}
              {Object.keys(reviewResults).length > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-iris-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-iris-red transition-all"
                      style={{ width: `${(Object.keys(reviewResults).length / calendarItemsForReview.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-iris-white/50 shrink-0">
                    {Object.keys(reviewResults).length}/{calendarItemsForReview.length} reviewed
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setReviewingCalendar(null);
                setReviewComplete(false);
              }}
              className="p-2 text-iris-white/60 hover:text-iris-white rounded-lg hover:bg-iris-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Swipe Cards or Completion */}
        {!reviewComplete && !allReviewed && unreviewedItems.length > 0 ? (
          <SwipeReviewCard
            items={unreviewedItems}
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
              {calendarItemsForReview.map((item) => {
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
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        item.type === 'VIDEO'
                          ? 'bg-purple-500/20 text-purple-400'
                          : item.type === 'PHOTO'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.isCarousel && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 flex items-center gap-0.5">
                        <Layers className="w-3 h-3" />
                        Carousel
                      </span>
                    )}
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
            activeTab === 'projects'
              ? 'bg-iris-red text-white'
              : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
          }`}
        >
          Projects ({activeProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === 'review'
              ? 'bg-iris-red text-white'
              : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
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
            activeTab === 'cal-revisions'
              ? 'bg-iris-red text-white'
              : 'text-iris-white/60 hover:text-iris-white hover:bg-iris-white/5'
          }`}
        >
          Cal Revisions (
          {
            calendarItemRevisions.filter(
              (r) => !r.isArchived && r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE',
            ).length
          }
          )
          {calendarItemRevisions.filter(
            (r) => !r.isArchived && r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE',
          ).length > 0 &&
            activeTab !== 'cal-revisions' && (
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
              {filteredProjects.map((project) => {
                const client = clients.find((c) => c.id === project.clientId);
                const copywriter = users.find((u) => u.id === project.assignedCopywriterId);
                const calendars = creativeCalendars.filter((c) => c.creativeProjectId === project.id);
                const latestCalendar = calendars[calendars.length - 1];
                const totalItems = creativeCalendarItems.filter((i) =>
                  calendars.some((c) => c.id === i.creativeCalendarId),
                ).length;

                return (
                  <div key={project.id} className={`${surface} rounded-xl p-5 space-y-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
                            className="flex items-center gap-1.5 group"
                          >
                            {expandedProjectId === project.id ? (
                              <ChevronDown className="w-4 h-4 text-iris-white/50" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-iris-white/50" />
                            )}
                            <h3 className="font-bold text-iris-white group-hover:text-iris-red transition-colors">
                              {client?.name || 'Unknown Client'}
                            </h3>
                          </button>
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
                        {latestCalendar &&
                          (latestCalendar.status === 'UNDER_REVIEW' || latestCalendar.status === 'UPDATED') && (
                            <button
                              onClick={() => setReviewingCalendar(latestCalendar)}
                              className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                            >
                              Review
                            </button>
                          )}
                        {/* Edit — only for IN_PROGRESS */}
                        {project.status === 'IN_PROGRESS' && checkPermission(PERMISSIONS.CREATIVE.MANAGE) && (
                          <button
                            onClick={() => openEditModal(project)}
                            className="p-2 text-iris-white/50 hover:text-blue-400 rounded-lg hover:bg-iris-white/5 transition-colors"
                            title="Edit Project"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete — only for IN_PROGRESS */}
                        {project.status === 'IN_PROGRESS' && checkPermission(PERMISSIONS.CREATIVE.MANAGE) && (
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={deletingProjectId === project.id}
                            className="p-2 text-iris-white/50 hover:text-rose-400 rounded-lg hover:bg-iris-white/5 transition-colors disabled:opacity-40"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
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

                    {/* Expanded: Calendar Items */}
                    {expandedProjectId === project.id &&
                      latestCalendar &&
                      (() => {
                        const projectItems = creativeCalendarItems.filter(
                          (i) => i.creativeCalendarId === latestCalendar.id,
                        );
                        const calNotApproved = latestCalendar.status !== 'APPROVED';
                        return (
                          <div className="mt-3 pt-3 border-t border-iris-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-iris-white/70">
                                Calendar Items ({projectItems.length})
                              </span>
                              {calNotApproved && checkPermission(PERMISSIONS.CREATIVE.MANAGE) && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setImportCalendarId(latestCalendar.id);
                                      setShowImportModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-iris-blue/20 text-iris-blue border border-iris-blue/30 rounded-lg text-xs font-medium hover:bg-iris-blue/30 transition-all"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    Import
                                  </button>
                                  <button
                                    onClick={() => openItemModal(latestCalendar.id, project.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-iris-red to-iris-red/80 text-white rounded-lg text-xs font-medium hover:brightness-110 transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Item
                                  </button>
                                </div>
                              )}
                            </div>
                            {projectItems.length === 0 ? (
                              <p className="text-sm text-iris-white/40 text-center py-4">No items yet.</p>
                            ) : (
                              <div className="grid gap-2">
                                {projectItems.map((item) => {
                                  const typeOpt = TYPE_OPTIONS.find((t) => t.value === item.type);
                                  const TypeIcon = typeOpt?.icon || FileText;
                                  return (
                                    <div
                                      key={item.id}
                                      className={`${elevated} rounded-lg p-3 space-y-1.5 ${
                                        item.reviewStatus === 'REJECTED'
                                          ? 'border-rose-500/30 bg-rose-500/5'
                                          : item.reviewStatus === 'APPROVED'
                                            ? 'border-emerald-500/30'
                                            : ''
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm text-iris-white">{item.title}</span>
                                            <span className={`${pill} text-[10px] ${typeOpt?.color || ''}`}>
                                              <TypeIcon className="w-3 h-3" />
                                              {item.type}
                                            </span>
                                            {item.isCarousel && (
                                              <span
                                                className={`${pill} text-[10px] bg-indigo-500/20 text-indigo-400 border-indigo-400/30`}
                                              >
                                                <Layers className="w-3 h-3" />
                                                Carousel
                                              </span>
                                            )}
                                            {item.reviewStatus !== 'PENDING' && (
                                              <span
                                                className={`${pill} text-[10px] ${
                                                  item.reviewStatus === 'APPROVED'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30'
                                                    : item.reviewStatus === 'REJECTED'
                                                      ? 'bg-rose-500/20 text-rose-400 border-rose-400/30'
                                                      : 'bg-slate-500/20 text-slate-400 border-slate-400/30'
                                                }`}
                                              >
                                                {item.reviewStatus}
                                              </span>
                                            )}
                                          </div>
                                          {item.publishAt && (
                                            <span className="text-[11px] text-iris-white/40 flex items-center gap-1 mt-0.5">
                                              <Calendar className="w-3 h-3" />
                                              {new Date(item.publishAt).toLocaleDateString()}
                                            </span>
                                          )}
                                          {item.mainIdea && (
                                            <p className="text-xs text-iris-white/50 mt-1 line-clamp-1">
                                              {item.mainIdea}
                                            </p>
                                          )}
                                        </div>
                                        {calNotApproved && checkPermission(PERMISSIONS.CREATIVE.MANAGE) && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => openItemModal(latestCalendar.id, project.id, item)}
                                              className="p-1.5 text-iris-white/50 hover:text-blue-400 rounded-lg hover:bg-iris-white/5 transition-colors"
                                              title="Edit Item"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteItem(item.id)}
                                              className="p-1.5 text-iris-white/50 hover:text-rose-400 rounded-lg hover:bg-iris-white/5 transition-colors"
                                              title="Delete Item"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                  {archivedProjects.map((project) => {
                    const client = clients.find((c) => c.id === project.clientId);
                    return (
                      <div key={project.id} className={`${surface} rounded-xl p-4 opacity-60`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-iris-white/70">{client?.name || 'Unknown'}</span>
                            <span className="text-xs text-iris-white/40 ml-2">
                              Archived {project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ''}
                            </span>
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
            projectsWithPendingReview.map((project) => {
              const client = clients.find((c) => c.id === project.clientId);
              const copywriter = users.find((u) => u.id === project.assignedCopywriterId);
              const pendingCalendars = creativeCalendars.filter(
                (c) => c.creativeProjectId === project.id && (c.status === 'UNDER_REVIEW' || c.status === 'UPDATED'),
              );

              return pendingCalendars.map((cal) => {
                const itemCount = creativeCalendarItems.filter((i) => i.creativeCalendarId === cal.id).length;
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
                        onClick={() => {
                          // Pre-populate reviewResults from items already reviewed in this session
                          const calItems = creativeCalendarItems.filter((i) => i.creativeCalendarId === cal.id);
                          const existing: Record<
                            string,
                            {
                              status: 'APPROVED' | 'REJECTED';
                              note?: string;
                              references?: CreativeRejectionReference[];
                            }
                          > = {};
                          for (const item of calItems) {
                            if (item.reviewStatus === 'APPROVED') {
                              existing[item.id] = { status: 'APPROVED' };
                            } else if (item.reviewStatus === 'REJECTED') {
                              existing[item.id] = {
                                status: 'REJECTED',
                                note: item.rejectionNote || '',
                                references: item.rejectionReferences || [],
                              };
                            }
                          }
                          setReviewResults(existing);
                          setReviewComplete(false);
                          setReviewingCalendar(cal);
                        }}
                        className="px-4 py-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                      >
                        {creativeCalendarItems
                          .filter((i) => i.creativeCalendarId === cal.id)
                          .some((i) => i.reviewStatus === 'APPROVED' || i.reviewStatus === 'REJECTED')
                          ? 'Continue Review'
                          : 'Start Review'}
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
          {/* Filter tabs */}
          {(() => {
            const activeCount = calendarItemRevisions.filter(
              (r) => !r.isArchived && r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE',
            ).length;
            const completedCount = calendarItemRevisions.filter(
              (r) => !r.isArchived && (r.status === 'APPROVED_BY_CREATIVE' || r.status === 'SYNCED_TO_CALENDAR'),
            ).length;
            const archivedCount = calendarItemRevisions.filter((r) => r.isArchived).length;

            return (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setRevisionFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    revisionFilter === 'active'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                      : 'text-iris-white/50 hover:text-iris-white/70 border border-white/5 hover:border-white/10'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setRevisionFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    revisionFilter === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
                      : 'text-iris-white/50 hover:text-iris-white/70 border border-white/5 hover:border-white/10'
                  }`}
                >
                  Completed ({completedCount})
                </button>
                <button
                  onClick={() => setRevisionFilter('archived')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    revisionFilter === 'archived'
                      ? 'bg-white/10 text-iris-white/70 border border-white/20'
                      : 'text-iris-white/50 hover:text-iris-white/70 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <Archive className="w-3 h-3 inline mr-1" />
                  Archived ({archivedCount})
                </button>
              </div>
            );
          })()}

          {(() => {
            // Status display helper
            const getStatusBadge = (status: string) => {
              switch (status) {
                case 'REVISION_REQUESTED':
                  return {
                    label: 'Requested',
                    color: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
                    icon: <MessageSquare className="w-3 h-3" />,
                  };
                case 'IN_CREATIVE_REVISION':
                  return {
                    label: 'In Progress',
                    color: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
                    icon: <Clock className="w-3 h-3" />,
                  };
                case 'AWAITING_CREATIVE_APPROVAL':
                  return {
                    label: 'Awaiting Approval',
                    color: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
                    icon: <Eye className="w-3 h-3" />,
                  };
                case 'APPROVED_BY_CREATIVE':
                  return {
                    label: 'Approved',
                    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
                    icon: <CheckCircle2 className="w-3 h-3" />,
                  };
                case 'SYNCED_TO_CALENDAR':
                  return {
                    label: 'Synced',
                    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
                    icon: <Check className="w-3 h-3" />,
                  };
                default:
                  return { label: status, color: 'bg-white/10 text-white/60 border-white/10', icon: null };
              }
            };

            // Filter revisions based on selected filter
            let filteredRevisions = calendarItemRevisions;
            if (revisionFilter === 'active') {
              filteredRevisions = calendarItemRevisions.filter(
                (r) => !r.isArchived && r.status !== 'SYNCED_TO_CALENDAR' && r.status !== 'APPROVED_BY_CREATIVE',
              );
            } else if (revisionFilter === 'completed') {
              filteredRevisions = calendarItemRevisions.filter(
                (r) => !r.isArchived && (r.status === 'APPROVED_BY_CREATIVE' || r.status === 'SYNCED_TO_CALENDAR'),
              );
            } else {
              filteredRevisions = calendarItemRevisions.filter((r) => r.isArchived);
            }

            if (filteredRevisions.length === 0) {
              return (
                <div className={`${surface} rounded-xl p-8 text-center text-iris-white/60`}>
                  {revisionFilter === 'active' ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400/30" />
                      <p>No active calendar revisions.</p>
                    </>
                  ) : revisionFilter === 'completed' ? (
                    <>
                      <Inbox className="w-10 h-10 mx-auto mb-3 text-iris-white/20" />
                      <p>No completed revisions yet.</p>
                    </>
                  ) : (
                    <>
                      <Archive className="w-10 h-10 mx-auto mb-3 text-iris-white/20" />
                      <p>No archived revisions.</p>
                    </>
                  )}
                </div>
              );
            }

            // Sort: awaiting approval first, then requested, then in progress, then rest
            const sorted = filteredRevisions.sort((a, b) => {
              const order: Record<string, number> = {
                AWAITING_CREATIVE_APPROVAL: 0,
                REVISION_REQUESTED: 1,
                IN_CREATIVE_REVISION: 2,
                APPROVED_BY_CREATIVE: 3,
                SYNCED_TO_CALENDAR: 4,
              };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            });

            return sorted.map((rev) => {
              const calItem = calendarItems.find((ci) => ci.id === rev.calendarItemId);
              const client = clients.find((c) => c.id === rev.clientId);
              const copywriter = rev.revisedBy ? users.find((u) => u.id === rev.revisedBy) : null;
              const requester = users.find((u) => u.id === rev.requestedBy);
              const reviewer = rev.reviewedBy ? users.find((u) => u.id === rev.reviewedBy) : null;
              const statusBadge = getStatusBadge(rev.status);
              const isCompleted = rev.status === 'APPROVED_BY_CREATIVE' || rev.status === 'SYNCED_TO_CALENDAR';

              return (
                <div
                  key={rev.id}
                  className={`${surface} rounded-xl overflow-hidden ${rev.isArchived ? 'opacity-70' : ''}`}
                >
                  {/* Header */}
                  <div
                    className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${
                      rev.status === 'AWAITING_CREATIVE_APPROVAL'
                        ? 'bg-purple-500/5 border-b border-purple-500/10'
                        : isCompleted
                          ? 'bg-emerald-500/5 border-b border-emerald-500/10'
                          : 'border-b border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-iris-white truncate">{calItem?.autoName || 'Calendar Item'}</h3>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${statusBadge.color}`}
                      >
                        {statusBadge.icon} {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-iris-white/40">{client?.name}</span>
                      <span className="text-[10px] text-iris-white/30">
                        {new Date(rev.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* STEP 1: Revision Request (from Calendar Dept) */}
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Revision Request</span>
                        <span className="text-amber-400/50 font-normal">by {requester?.name || 'Calendar Dept'}</span>
                      </div>
                      <p className="text-sm text-iris-white/70 whitespace-pre-wrap" dir="auto">
                        {rev.revisionNote}
                      </p>

                      {/* Request references — rich media thumbnails */}
                      {rev.revisionReferences &&
                        rev.revisionReferences.length > 0 &&
                        (() => {
                          const media = collectRevisionRefMedia(rev.revisionReferences);
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                              {media.map((m, idx) => (
                                <DarkMediaThumb
                                  key={idx}
                                  media={m}
                                  onDriveClick={(url, title) => setDrivePreview({ url, title })}
                                />
                              ))}
                            </div>
                          );
                        })()}
                    </div>

                    {/* STEP 2: Creative Response (from Copywriter) */}
                    {rev.revisedBrief ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 space-y-2">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5" />
                          <span>Creative Response</span>
                          <span className="text-emerald-400/50 font-normal">
                            by {copywriter?.name || 'Copywriter'} ·{' '}
                            {rev.revisedAt ? new Date(rev.revisedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>

                        {/* Revised Brief */}
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-emerald-400/40 font-bold mb-0.5">
                            Revised Brief
                          </div>
                          <p className="text-sm text-iris-white/80 whitespace-pre-wrap" dir="auto">
                            {rev.revisedBrief}
                          </p>
                        </div>

                        {/* Revised Notes */}
                        {rev.revisedNotes && (
                          <div className="pt-1 border-t border-emerald-500/10">
                            <div className="text-[10px] uppercase tracking-wider text-emerald-400/40 font-bold mb-0.5">
                              Copywriter Notes
                            </div>
                            <p className="text-sm text-iris-white/60 whitespace-pre-wrap" dir="auto">
                              {rev.revisedNotes}
                            </p>
                          </div>
                        )}

                        {/* Revised media — rich thumbnails for links + files combined */}
                        {((rev.revisedReferenceLinks && rev.revisedReferenceLinks.length > 0) ||
                          (rev.revisedReferenceFiles && rev.revisedReferenceFiles.length > 0)) &&
                          (() => {
                            const media = collectRevisionResponseMedia(
                              rev.revisedReferenceLinks || [],
                              rev.revisedReferenceFiles || [],
                            );
                            return (
                              <div className="pt-1 border-t border-emerald-500/10">
                                <div className="text-[10px] uppercase tracking-wider text-emerald-400/40 font-bold mb-1.5">
                                  Updated Media & References
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {media.map((m, idx) => (
                                    <DarkMediaThumb
                                      key={idx}
                                      media={m}
                                      onDriveClick={(url, title) => setDrivePreview({ url, title })}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    ) : // No creative response yet
                    rev.status !== 'REVISION_REQUESTED' ? null : (
                      <div className="border border-dashed border-white/10 rounded-lg p-3 text-center">
                        <p className="text-xs text-iris-white/30 italic">Awaiting creative response…</p>
                      </div>
                    )}

                    {/* STEP 3: Manager Review info (if reviewed) */}
                    {rev.reviewedBy && (
                      <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
                        <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manager Review</span>
                          <span className="text-purple-400/50 font-normal">
                            by {reviewer?.name || 'Manager'} ·{' '}
                            {rev.reviewedAt ? new Date(rev.reviewedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        {rev.reviewNote && (
                          <p className="text-sm text-iris-white/60 whitespace-pre-wrap mt-1" dir="auto">
                            {rev.reviewNote}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Original Calendar Brief (collapsible) */}
                    {calItem && (
                      <details className="group">
                        <summary className="text-xs text-iris-white/30 cursor-pointer hover:text-iris-white/50 transition-colors flex items-center gap-1">
                          <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                          View Original Calendar Brief
                        </summary>
                        <div className="mt-2 bg-white/[0.02] border border-white/5 rounded-lg p-3">
                          <p className="text-sm text-iris-white/50 whitespace-pre-wrap" dir="auto">
                            {calItem.primaryBrief}
                          </p>
                        </div>
                      </details>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Approve / Reject - only for AWAITING_CREATIVE_APPROVAL */}
                      {rev.status === 'AWAITING_CREATIVE_APPROVAL' && (
                        <>
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
                                  revisedReferenceLinks: null,
                                  revisedReferenceFiles: null,
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
                                const creativeCalendar = creativeCalendars.find(
                                  (cc) => cc.id === rev.creativeCalendarId,
                                );
                                const project = creativeCalendar
                                  ? creativeProjects.find((p) => p.id === creativeCalendar.creativeProjectId)
                                  : null;
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
                        </>
                      )}

                      {/* Delete button for REVISION_REQUESTED revisions (not yet worked on) */}
                      {rev.status === 'REVISION_REQUESTED' && (
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this revision request? This cannot be undone.')) return;
                            try {
                              const now = new Date().toISOString();
                              await deleteDoc(doc(db, 'calendar_item_revisions', rev.id));
                              if (calItem) {
                                await updateDoc(doc(db, 'calendar_items', calItem.id), {
                                  revisionStatus: 'NONE',
                                  activeRevisionId: null,
                                  updatedAt: now,
                                });
                              }
                            } catch (error) {
                              console.error('Error deleting revision:', error);
                              alert('Failed to delete revision');
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-400/20 rounded-lg text-xs font-medium hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}

                      {/* Archive button for completed revisions */}
                      {isCompleted && !rev.isArchived && (
                        <button
                          onClick={async () => {
                            try {
                              const now = new Date().toISOString();
                              await updateDoc(doc(db, 'calendar_item_revisions', rev.id), {
                                isArchived: true,
                                archivedAt: now,
                                archivedBy: currentUser?.id,
                                updatedAt: now,
                              });
                            } catch (error) {
                              console.error('Error archiving revision:', error);
                              alert('Failed to archive revision');
                            }
                          }}
                          className="px-3 py-1.5 bg-white/5 text-iris-white/40 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 hover:text-iris-white/60 transition-colors flex items-center gap-1.5"
                        >
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      )}

                      {/* Unarchive button for archived revisions */}
                      {rev.isArchived && (
                        <button
                          onClick={async () => {
                            try {
                              const now = new Date().toISOString();
                              await updateDoc(doc(db, 'calendar_item_revisions', rev.id), {
                                isArchived: false,
                                archivedAt: null,
                                archivedBy: null,
                                updatedAt: now,
                              });
                            } catch (error) {
                              console.error('Error unarchiving revision:', error);
                              alert('Failed to unarchive revision');
                            }
                          }}
                          className="px-3 py-1.5 bg-white/5 text-iris-white/40 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 hover:text-iris-white/60 transition-colors flex items-center gap-1.5"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
                        </button>
                      )}
                    </div>

                    {/* Status info for non-actionable active states */}
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
                    {rev.status === 'APPROVED_BY_CREATIVE' && !rev.isArchived && (
                      <div className="text-xs text-emerald-400/70 italic flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Approved — waiting for Calendar Dept to sync
                      </div>
                    )}
                    {rev.status === 'SYNCED_TO_CALENDAR' && !rev.isArchived && (
                      <div className="text-xs text-cyan-400/70 italic flex items-center gap-1">
                        <Check className="w-3 h-3" /> Synced to calendar on{' '}
                        {rev.syncedAt ? new Date(rev.syncedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
          <div
            className={`${elevated} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200`}
          >
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">New Creative Project</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-iris-white/70 hover:text-iris-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Client Select */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Client *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setSelectedStrategyId('');
                  }}
                  className={inputClass}
                  required
                >
                  <option value="">Select Client</option>
                  {clients
                    .filter((c) => !c.isArchived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Month Key */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Calendar Month *</label>
                <input
                  type="month"
                  value={monthKey}
                  onChange={(e) => setMonthKey(e.target.value)}
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
                        onChange={(e) => setSelectedStrategyId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">No strategy linked</option>
                        {strategies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.monthLabel} — {s.title}
                          </option>
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
                  <input
                    ref={briefInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && setBriefFile(e.target.files[0])}
                  />
                </div>
              </div>

              {/* Assign Copywriter */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Assign Copywriter *</label>
                <select
                  value={selectedCopywriterId}
                  onChange={(e) => setSelectedCopywriterId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select Copywriter</option>
                  {copywriters.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role}
                      {u.role !== 'Copywriter' ? ' ⚠️' : ''}
                    </option>
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
          <div
            className={`${elevated} rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}
          >
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">Add Strategy</h2>
              <button onClick={() => setShowStrategyModal(false)} className="text-iris-white/70 hover:text-iris-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStrategy} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">Month</label>
                  <select
                    value={strategyForm.month}
                    onChange={(e) => setStrategyForm({ ...strategyForm, month: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {[
                      'January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December',
                    ].map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">Year</label>
                  <select
                    value={strategyForm.year}
                    onChange={(e) => setStrategyForm({ ...strategyForm, year: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {[
                      new Date().getFullYear() - 1,
                      new Date().getFullYear(),
                      new Date().getFullYear() + 1,
                      new Date().getFullYear() + 2,
                    ].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
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
                  onChange={(e) => setStrategyForm({ ...strategyForm, title: e.target.value })}
                  placeholder="e.g. Q1 Content Strategy"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-2">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="file"
                      checked={strategyForm.type === 'file'}
                      onChange={() => setStrategyForm({ ...strategyForm, type: 'file' })}
                      className="text-iris-red"
                    />
                    <span className="text-sm text-iris-white">File Upload</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="link"
                      checked={strategyForm.type === 'link'}
                      onChange={() => setStrategyForm({ ...strategyForm, type: 'link' })}
                      className="text-iris-red"
                    />
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
                    <input
                      ref={strategyFileRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files && setStrategyFile(e.target.files[0])}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-iris-white/70 mb-1">URL *</label>
                  <input
                    required
                    type="url"
                    value={strategyForm.url}
                    onChange={(e) => setStrategyForm({ ...strategyForm, url: e.target.value })}
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
                  onChange={(e) => setStrategyForm({ ...strategyForm, notes: e.target.value })}
                  className={`${inputClass} min-h-[80px]`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStrategyModal(false)}
                  className="flex-1 px-4 py-2 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStrategy}
                  className="flex-1 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg font-medium hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {savingStrategy ? 'Saving...' : 'Save Strategy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
          <div
            className={`${elevated} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200`}
          >
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">Edit Creative Project</h2>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setSelectedClientId('');
                  setSelectedStrategyId('');
                  setSelectedCopywriterId('');
                  setBriefFile(null);
                }}
                className="text-iris-white/70 hover:text-iris-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Client Select */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Client *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setSelectedStrategyId('');
                  }}
                  className={inputClass}
                  required
                >
                  <option value="">Select Client</option>
                  {clients
                    .filter((c) => !c.isArchived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Month Key */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Calendar Month *</label>
                <input
                  type="month"
                  value={monthKey}
                  onChange={(e) => setMonthKey(e.target.value)}
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
                    <select
                      value={selectedStrategyId}
                      onChange={(e) => setSelectedStrategyId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">No strategy linked</option>
                      {strategies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.monthLabel} — {s.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Brief Upload */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Creative Brief</label>
                {editingProject.briefFile && !briefFile && (
                  <p className="text-xs text-iris-white/50 mb-2">Current: {editingProject.briefFile.name}</p>
                )}
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
                      <span className="text-sm">
                        {editingProject.briefFile ? 'Upload new brief (optional)' : 'Upload creative brief'}
                      </span>
                    </div>
                  )}
                  <input
                    ref={briefInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && setBriefFile(e.target.files[0])}
                  />
                </div>
              </div>

              {/* Assign Copywriter */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Assign Copywriter *</label>
                <select
                  value={selectedCopywriterId}
                  onChange={(e) => setSelectedCopywriterId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select Copywriter</option>
                  {copywriters.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role}
                      {u.role !== 'Copywriter' ? ' ⚠️' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-iris-white/10 flex gap-3">
              <button
                onClick={() => {
                  setEditingProject(null);
                  setSelectedClientId('');
                  setSelectedStrategyId('');
                  setSelectedCopywriterId('');
                  setBriefFile(null);
                }}
                className="flex-1 px-4 py-2.5 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditProject}
                disabled={saving || !selectedClientId || !selectedCopywriterId}
                className="flex-1 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2.5 rounded-lg font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
          <div
            className={`${elevated} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200`}
          >
            <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
              <h2 className="text-lg font-bold text-iris-white">
                {editingCalItem ? 'Edit Item' : 'Add Calendar Item'}
              </h2>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingCalItem(null);
                }}
                className="text-iris-white/70 hover:text-iris-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-2">Type *</label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setItemForm((prev) => ({ ...prev, type: t.value }))}
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

              {/* Carousel Toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={itemForm.isCarousel}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, isCarousel: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-iris-white/10 border border-iris-white/10 peer-checked:bg-indigo-500 peer-checked:border-indigo-400 transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-iris-white/50 peer-checked:bg-white peer-checked:translate-x-4 transition-all" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-iris-white/70 group-hover:text-iris-white transition-colors">
                    Carousel Post
                  </span>
                </div>
              </label>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-iris-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, title: e.target.value }))}
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
                  onChange={(e) => setItemForm((prev) => ({ ...prev, publishAt: e.target.value }))}
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
                  onChange={(e) => setItemForm((prev) => ({ ...prev, mainIdea: e.target.value }))}
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
                  onChange={(e) => setItemForm((prev) => ({ ...prev, briefDescription: e.target.value }))}
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
                  onChange={(e) => setItemForm((prev) => ({ ...prev, notes: e.target.value }))}
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
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className={`${inputClass} flex-[0.4]`}
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className={`${inputClass} flex-[0.6]`}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReferenceLink())}
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
                        <button
                          onClick={() => removeReferenceLink(i)}
                          className="text-iris-white/40 hover:text-rose-400"
                        >
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
                        <button
                          onClick={() => removeReferenceFile(i)}
                          className="text-iris-white/40 hover:text-rose-400"
                        >
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
                onClick={() => {
                  setShowItemModal(false);
                  setEditingCalItem(null);
                }}
                className="flex-1 px-4 py-2.5 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={savingItem || !itemForm.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2.5 rounded-lg font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-4 h-4" />
                {savingItem ? 'Saving...' : editingCalItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Preview Modal */}
      {drivePreview && (
        <DrivePreviewModal url={drivePreview.url} title={drivePreview.title} onClose={() => setDrivePreview(null)} />
      )}

      {/* Excel Import Modal */}
      {showImportModal && importCalendarId && (
        <CreativeImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportCalendarId(null);
          }}
          creativeCalendarId={importCalendarId}
          currentUserId={currentUser?.id || ''}
        />
      )}
    </div>
  );
};

export default ManagerView;
