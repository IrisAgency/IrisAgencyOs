import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Video, Image, Film, Clock, FileText, Link as LinkIcon, X, Download, Trash2, Edit2, Archive, MoreVertical, Eye, ExternalLink, Presentation, RotateCcw, AlertTriangle, Send, CheckCircle2, History, MessageSquare } from 'lucide-react';
import CalendarDeptPresentationView from './calendar/CalendarDeptPresentationView';
import { Client, CalendarMonth, CalendarItem, CalendarItemRevision, CalendarContentType, CalendarRevisionReference, CalendarRevisionStatus, User, CalendarReferenceLink, CreativeProject, CreativeCalendar, CreativeCalendarItem, NotificationType } from '../types';
import { PERMISSIONS } from '../lib/permissions';
import { PermissionGate } from './PermissionGate';
import { useAuth } from '../contexts/AuthContext';
import Modal from './common/Modal';
import LinkPreviewThumbnail from './common/LinkPreviewThumbnail';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, runTransaction, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { notifyUsers } from '../services/notificationService';

interface CalendarHubProps {
  clients: Client[];
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  calendarItemRevisions: CalendarItemRevision[];
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];
  users: User[];
  currentUser: User;
  checkPermission: (permission: string) => boolean;
  onNotify: (type: string, title: string, message: string) => void;
  onRefresh?: () => void;
}

const CalendarHub: React.FC<CalendarHubProps> = ({
  clients,
  calendarMonths,
  calendarItems,
  calendarItemRevisions,
  creativeProjects,
  creativeCalendars,
  creativeCalendarItems,
  users,
  currentUser,
  checkPermission,
  onNotify,
  onRefresh
}) => {
  // checkPermission comes from props now
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<CalendarContentType | 'ALL'>('ALL');
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingMonth, setEditingMonth] = useState<CalendarMonth | null>(null);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);

  const [monthForm, setMonthForm] = useState({
    monthKey: '',
    title: ''
  });

  const [itemForm, setItemForm] = useState<{
    type: CalendarContentType;
    primaryBrief: string;
    notes: string;
    referenceLinks: CalendarReferenceLink[];
    publishAt: string;
  }>({
    type: 'VIDEO',
    primaryBrief: '',
    notes: '',
    referenceLinks: [],
    publishAt: ''
  });

  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  // Revision workflow state
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionTargetItem, setRevisionTargetItem] = useState<CalendarItem | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionRefLinks, setRevisionRefLinks] = useState<{ title: string; url: string }[]>([]);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [revisionHistoryItem, setRevisionHistoryItem] = useState<CalendarItem | null>(null);

  const canManage = checkPermission(PERMISSIONS.CALENDAR.MANAGE);

  const getClientCode = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client?.code || client?.name?.substring(0, 3).toUpperCase() || 'UNK';
  };

  const filteredMonths = useMemo(() => {
    if (!selectedClientId) return [];
    return calendarMonths
      .filter(m => m.clientId === selectedClientId && !m.isArchived)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [calendarMonths, selectedClientId]);

  const archivedMonths = useMemo(() => {
    if (!selectedClientId) return [];
    return calendarMonths
      .filter(m => m.clientId === selectedClientId && m.isArchived)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [calendarMonths, selectedClientId]);

  const filteredItems = useMemo(() => {
    if (!selectedMonthId) return [];
    let items = calendarItems.filter(i => i.calendarMonthId === selectedMonthId);
    
    if (typeFilter !== 'ALL') {
      items = items.filter(i => i.type === typeFilter);
    }
    
    if (searchTerm) {
      items = items.filter(i => 
        i.autoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.primaryBrief.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return items.sort((a, b) => {
      const dateA = new Date(a.publishAt).getTime();
      const dateB = new Date(b.publishAt).getTime();
      return dateA - dateB;
    });
  }, [calendarItems, selectedMonthId, typeFilter, searchTerm]);

  const getCounts = () => {
    const items = calendarItems.filter(i => i.calendarMonthId === selectedMonthId);
    return {
      videos: items.filter(i => i.type === 'VIDEO').length,
      photos: items.filter(i => i.type === 'PHOTO').length,
      motion: items.filter(i => i.type === 'MOTION').length,
      total: items.length
    };
  };

  const counts = getCounts();

  const handleCreateMonth = async () => {
    if (!selectedClientId || !monthForm.monthKey || !monthForm.title) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const monthData: Omit<CalendarMonth, 'id'> = {
        clientId: selectedClientId,
        monthKey: monthForm.monthKey,
        title: monthForm.title,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'calendar_months'), monthData);
      
      setShowMonthModal(false);
      setMonthForm({ monthKey: '', title: '' });
      onRefresh?.();
    } catch (error) {
      console.error('Error creating month:', error);
      alert('Failed to create month');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!selectedMonthId || !itemForm.primaryBrief || !itemForm.publishAt) {
      alert('Please fill in required fields');
      return;
    }
    
    // Validate publishAt date
    const publishDate = new Date(itemForm.publishAt);
    const currentYear = new Date().getFullYear();
    if (publishDate.getFullYear() < currentYear - 1 || publishDate.getFullYear() > currentYear + 10) {
      alert(`Invalid publish date year (${publishDate.getFullYear()}). Please check the date and try again.`);
      return;
    }

    const selectedMonth = filteredMonths.find(m => m.id === selectedMonthId);
    if (!selectedMonth) return;

    setIsLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const itemsRef = collection(db, 'calendar_items');
        const q = query(
          itemsRef,
          where('clientId', '==', selectedMonth.clientId),
          where('monthKey', '==', selectedMonth.monthKey),
          where('type', '==', itemForm.type)
        );
        
        const snapshot = await getDocs(q);
        let maxSeq = 0;
        snapshot.forEach(docSnap => {
          const item = docSnap.data() as CalendarItem;
          if (item.seqNumber > maxSeq) {
            maxSeq = item.seqNumber;
          }
        });

        const newSeqNumber = maxSeq + 1;
        const clientCode = getClientCode(selectedMonth.clientId);
        const autoName = `${clientCode} - ${selectedMonth.monthKey} - ${itemForm.type} - ${String(newSeqNumber).padStart(2, '0')}`;

        const referenceFiles = await Promise.all(
          uploadingFiles.map(async (file) => {
            const fileName = `${Date.now()}_${file.name}`;
            const storagePath = `clients/${selectedMonth.clientId}/calendar/${selectedMonth.monthKey}/${fileName}`;
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            return {
              fileName: file.name,
              storagePath,
              downloadURL,
              uploadedBy: currentUser.id,
              createdAt: new Date().toISOString()
            };
          })
        );

        const itemData: Omit<CalendarItem, 'id'> = {
          calendarMonthId: selectedMonthId,
          clientId: selectedMonth.clientId,
          monthKey: selectedMonth.monthKey,
          type: itemForm.type,
          seqNumber: newSeqNumber,
          autoName,
          primaryBrief: itemForm.primaryBrief,
          notes: itemForm.notes,
          referenceLinks: itemForm.referenceLinks,
          referenceFiles,
          publishAt: itemForm.publishAt,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const newDocRef = doc(collection(db, 'calendar_items'));
        transaction.set(newDocRef, itemData);
      });

      setShowItemModal(false);
      resetItemForm();
      onRefresh?.();
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Failed to create item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !itemForm.primaryBrief || !itemForm.publishAt) {
      alert('Please fill in required fields');
      return;
    }
    
    // Validate publishAt date
    const publishDate = new Date(itemForm.publishAt);
    const currentYear = new Date().getFullYear();
    if (publishDate.getFullYear() < currentYear - 1 || publishDate.getFullYear() > currentYear + 10) {
      alert(`Invalid publish date year (${publishDate.getFullYear()}). Please check the date and try again.`);
      return;
    }

    setIsLoading(true);
    try {
      const newFiles = await Promise.all(
        uploadingFiles.map(async (file) => {
          const fileName = `${Date.now()}_${file.name}`;
          const storagePath = `clients/${editingItem.clientId}/calendar/${editingItem.monthKey}/${fileName}`;
          const storageRef = ref(storage, storagePath);
          
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          
          return {
            fileName: file.name,
            storagePath,
            downloadURL,
            uploadedBy: currentUser.id,
            createdAt: new Date().toISOString()
          };
        })
      );

      const updatedData = {
        primaryBrief: itemForm.primaryBrief,
        notes: itemForm.notes,
        referenceLinks: itemForm.referenceLinks,
        referenceFiles: [...editingItem.referenceFiles, ...newFiles],
        publishAt: itemForm.publishAt,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'calendar_items', editingItem.id), updatedData);
      
      setShowItemModal(false);
      setEditingItem(null);
      resetItemForm();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (item: CalendarItem, fileIndex: number) => {
    if (!confirm('Delete this file?')) return;

    setIsLoading(true);
    try {
      const file = item.referenceFiles[fileIndex];
      const storageRef = ref(storage, file.storagePath);
      await deleteObject(storageRef);

      const updatedFiles = item.referenceFiles.filter((_, i) => i !== fileIndex);
      await updateDoc(doc(db, 'calendar_items', item.id), {
        referenceFiles: updatedFiles,
        updatedAt: new Date().toISOString()
      });

      onRefresh?.();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this calendar item? This cannot be undone.')) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'calendar_items', itemId));
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMonth = async (monthId: string) => {
    const month = calendarMonths.find(m => m.id === monthId);
    if (!month) return;

    const itemsCount = calendarItems.filter(i => i.calendarMonthId === monthId).length;
    const confirmMessage = `Are you sure you want to delete "${month.title}"?\n\n` +
      `⚠️ Warning: This will permanently delete:\n` +
      `• The calendar month\n` +
      `• All ${itemsCount} content items in this month\n` +
      `• All associated files\n\n` +
      `This action CANNOT be undone!`;

    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      // Delete all items in this month
      const itemsQuery = query(collection(db, 'calendar_items'), where('calendarMonthId', '==', monthId));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const batch = writeBatch(db);
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the month itself
      batch.delete(doc(db, 'calendar_months', monthId));
      
      await batch.commit();
      
      setSelectedMonthId('');
      onRefresh?.();
      alert(`Month "${month.title}" and all ${itemsCount} items deleted successfully`);
    } catch (error) {
      console.error('Error deleting month:', error);
      alert('Failed to delete month');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveMonth = async (monthId: string) => {
    const month = calendarMonths.find(m => m.id === monthId);
    if (!month) return;

    const isArchived = month.isArchived || false;
    const action = isArchived ? 'unarchive' : 'archive';
    
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${month.title}"?`)) return;

    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'calendar_months', monthId), {
        isArchived: !isArchived,
        archivedAt: isArchived ? null : new Date().toISOString(),
        archivedBy: isArchived ? null : currentUser.id,
        updatedAt: new Date().toISOString()
      });
      
      onRefresh?.();
      alert(`Month ${action}d successfully`);
    } catch (error) {
      console.error('Error archiving month:', error);
      alert('Failed to ' + action + ' month');
    } finally {
      setIsLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      type: 'VIDEO',
      primaryBrief: '',
      notes: '',
      referenceLinks: [],
      publishAt: ''
    });
    setUploadingFiles([]);
  };

  const openCreateItem = () => {
    resetItemForm();
    setEditingItem(null);
    setShowItemModal(true);
  };

  const openEditItem = (item: CalendarItem) => {
    setEditingItem(item);
    setItemForm({
      type: item.type,
      primaryBrief: item.primaryBrief,
      notes: item.notes,
      referenceLinks: item.referenceLinks,
      publishAt: item.publishAt
    });
    setUploadingFiles([]);
    setShowItemModal(true);
  };

  const addReferenceLink = () => {
    setItemForm(prev => ({
      ...prev,
      referenceLinks: [...prev.referenceLinks, { title: '', url: '' }]
    }));
  };

  const updateReferenceLink = (index: number, field: 'title' | 'url', value: string) => {
    setItemForm(prev => ({
      ...prev,
      referenceLinks: prev.referenceLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeReferenceLink = (index: number) => {
    setItemForm(prev => ({
      ...prev,
      referenceLinks: prev.referenceLinks.filter((_, i) => i !== index)
    }));
  };

  const getTypeIcon = (type: CalendarContentType) => {
    switch (type) {
      case 'VIDEO': return <Video className="w-4 h-4" />;
      case 'PHOTO': return <Image className="w-4 h-4" />;
      case 'MOTION': return <Film className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: CalendarContentType) => {
    switch (type) {
      case 'VIDEO': return 'bg-blue-500/20 text-blue-200 border-blue-400/30';
      case 'PHOTO': return 'bg-green-500/20 text-green-200 border-green-400/30';
      case 'MOTION': return 'bg-purple-500/20 text-purple-200 border-purple-400/30';
    }
  };

  // ============================================
  // REVISION WORKFLOW HELPERS
  // ============================================

  const getRevisionStatusColor = (status?: CalendarRevisionStatus) => {
    switch (status) {
      case 'REVISION_REQUESTED': return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
      case 'IN_CREATIVE_REVISION': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'AWAITING_CREATIVE_APPROVAL': return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'APPROVED_BY_CREATIVE': return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
      case 'SYNCED_TO_CALENDAR': return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30';
      default: return '';
    }
  };

  const getRevisionStatusLabel = (status?: CalendarRevisionStatus) => {
    switch (status) {
      case 'REVISION_REQUESTED': return 'Revision Requested';
      case 'IN_CREATIVE_REVISION': return 'In Creative Revision';
      case 'AWAITING_CREATIVE_APPROVAL': return 'Awaiting Approval';
      case 'APPROVED_BY_CREATIVE': return 'Approved (Ready to Sync)';
      case 'SYNCED_TO_CALENDAR': return 'Synced';
      default: return '';
    }
  };

  const getRevisionsForItem = (itemId: string) => {
    return calendarItemRevisions
      .filter(r => r.calendarItemId === itemId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Auto-resolve creative linkage for items created before linking fields were added
  const resolveCreativeLink = (item: CalendarItem): { calendarId: string; itemId: string } | null => {
    // If already linked, use existing link
    if (item.linkedCreativeCalendarId && item.linkedCreativeItemId) {
      return { calendarId: item.linkedCreativeCalendarId, itemId: item.linkedCreativeItemId };
    }
    // Try to find matching creative calendar by clientId + monthKey
    const matchingCalendar = creativeCalendars.find(
      c => c.clientId === item.clientId && c.monthKey === item.monthKey
    );
    if (!matchingCalendar) return null;
    // Try to find matching creative item by type + seqNumber
    const matchingItem = creativeCalendarItems.find(
      ci => ci.creativeCalendarId === matchingCalendar.id && ci.type === item.type && item.seqNumber !== undefined
    );
    // Even if we can't match a specific item, having a matching calendar is enough
    return { calendarId: matchingCalendar.id, itemId: matchingItem?.id || '' };
  };

  const canRequestRevision = (item: CalendarItem): boolean => {
    // Can request revision if linked (or auto-linkable) to creative and not already in active revision workflow
    const link = resolveCreativeLink(item);
    if (!link) return false;
    const status = item.revisionStatus || 'NONE';
    return status === 'NONE' || status === 'SYNCED_TO_CALENDAR';
  };

  const openRevisionRequest = (item: CalendarItem) => {
    setRevisionTargetItem(item);
    setRevisionNote('');
    setRevisionRefLinks([]);
    setShowRevisionModal(true);
  };

  const handleRequestRevision = async () => {
    if (!revisionTargetItem || !revisionNote.trim()) {
      alert('Please provide a revision note describing what needs to change.');
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      // Auto-resolve creative linkage
      const resolvedLink = resolveCreativeLink(revisionTargetItem);
      const resolvedCalendarId = resolvedLink?.calendarId || null;
      const resolvedItemId = resolvedLink?.itemId || null;
      const resolvedCal = creativeCalendars.find(c => c.id === resolvedCalendarId);
      const resolvedProjectId = resolvedCal?.creativeProjectId || null;

      // Create revision document
      const revisionRef = doc(collection(db, 'calendar_item_revisions'));
      const revisionData: Omit<CalendarItemRevision, 'id'> = {
        calendarItemId: revisionTargetItem.id,
        calendarMonthId: revisionTargetItem.calendarMonthId,
        clientId: revisionTargetItem.clientId,
        creativeCalendarId: resolvedCalendarId,
        creativeItemId: resolvedItemId,
        creativeProjectId: resolvedProjectId,
        revisionNote: revisionNote.trim(),
        revisionReferences: revisionRefLinks
          .filter(l => l.url.trim())
          .map(l => ({ type: 'link' as const, value: l.url, fileName: l.title })),
        requestedBy: currentUser.id,
        requestedAt: now,
        status: 'REVISION_REQUESTED',
        createdAt: now,
        updatedAt: now,
      };
      batch.set(revisionRef, revisionData);

      // Update calendar item with revision status + backfill linking fields if missing
      const calItemRef = doc(db, 'calendar_items', revisionTargetItem.id);
      const calItemUpdate: Record<string, any> = {
        revisionStatus: 'REVISION_REQUESTED',
        activeRevisionId: revisionRef.id,
        revisionCount: (revisionTargetItem.revisionCount || 0) + 1,
        updatedAt: now,
      };
      // Backfill linking fields for items created before this feature
      if (!revisionTargetItem.linkedCreativeCalendarId && resolvedCalendarId) {
        calItemUpdate.linkedCreativeCalendarId = resolvedCalendarId;
      }
      if (!revisionTargetItem.linkedCreativeItemId && resolvedItemId) {
        calItemUpdate.linkedCreativeItemId = resolvedItemId;
      }
      batch.update(calItemRef, calItemUpdate);

      await batch.commit();

      // Notify the assigned copywriter
      const creativeCalendar = resolvedCal;
      const creativeProject = creativeCalendar ? creativeProjects.find(p => p.id === creativeCalendar.creativeProjectId) : null;
      if (creativeProject?.assignedCopywriterId) {
        const client = clients.find(c => c.id === revisionTargetItem.clientId);
        await notifyUsers({
          type: 'CALENDAR_REVISION_REQUESTED',
          title: 'Calendar Revision Requested',
          message: `${currentUser.name} requested a revision on "${revisionTargetItem.autoName}" for ${client?.name || 'Unknown Client'}`,
          recipientIds: [creativeProject.assignedCopywriterId],
          entityId: revisionRef.id,
          actionUrl: '/creative',
          sendPush: true,
          createdBy: currentUser.id,
        });
      }

      // Also notify the creative manager
      const managerIds = users
        .filter(u => u.department === 'Creative' && u.role !== 'Copywriter' && u.id !== currentUser.id)
        .map(u => u.id);
      if (managerIds.length > 0) {
        const client = clients.find(c => c.id === revisionTargetItem.clientId);
        await notifyUsers({
          type: 'CALENDAR_REVISION_REQUESTED',
          title: 'Calendar Revision Requested',
          message: `${currentUser.name} requested a revision on "${revisionTargetItem.autoName}" for ${client?.name || 'Unknown Client'}`,
          recipientIds: managerIds,
          entityId: revisionRef.id,
          actionUrl: '/creative',
          sendPush: true,
          createdBy: currentUser.id,
        });
      }

      setShowRevisionModal(false);
      setRevisionTargetItem(null);
      onNotify('system', 'Revision Requested', `Revision request sent for "${revisionTargetItem.autoName}"`);
    } catch (error) {
      console.error('Error requesting revision:', error);
      alert('Failed to request revision');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncApprovedRevision = async (item: CalendarItem) => {
    if (item.revisionStatus !== 'APPROVED_BY_CREATIVE' || !item.activeRevisionId) return;

    setIsLoading(true);
    try {
      const revision = calendarItemRevisions.find(r => r.id === item.activeRevisionId);
      if (!revision) throw new Error('Revision not found');

      const now = new Date().toISOString();
      const batch = writeBatch(db);

      // Update the calendar item with the revised content
      const calItemRef = doc(db, 'calendar_items', item.id);
      const updateData: Record<string, any> = {
        revisionStatus: 'SYNCED_TO_CALENDAR',
        updatedAt: now,
      };
      if (revision.revisedBrief) updateData.primaryBrief = revision.revisedBrief;
      if (revision.revisedNotes !== undefined) updateData.notes = revision.revisedNotes;
      if (revision.revisedReferenceLinks) updateData.referenceLinks = revision.revisedReferenceLinks;
      if (revision.revisedReferenceFiles) updateData.referenceFiles = revision.revisedReferenceFiles;
      batch.update(calItemRef, updateData);

      // Update revision status
      const revisionRef = doc(db, 'calendar_item_revisions', revision.id);
      batch.update(revisionRef, {
        status: 'SYNCED_TO_CALENDAR',
        syncedAt: now,
        syncedBy: currentUser.id,
        updatedAt: now,
      });

      await batch.commit();

      onNotify('system', 'Revision Synced', `Approved revision synced to "${item.autoName}"`);
    } catch (error) {
      console.error('Error syncing revision:', error);
      alert('Failed to sync revision');
    } finally {
      setIsLoading(false);
    }
  };

  if (showPresentation) {
    return (
      <CalendarDeptPresentationView
        calendarMonths={calendarMonths}
        calendarItems={calendarItems}
        clients={clients}
        onBack={() => setShowPresentation(false)}
      />
    );
  }

  return (
    <div className="p-6 max-w-full min-h-screen" style={{ background: '#050505' }}>
      {/* Header Section */}
      <div className="mb-8 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#DF1E3C]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-4 mb-3 relative z-10">
          <div className="p-3 bg-gradient-to-br from-[#DF1E3C]/20 to-[#DF1E3C]/5 rounded-xl border border-[#DF1E3C]/20 shadow-[0_0_15px_rgba(223,30,60,0.15)]">
            <Calendar className="w-8 h-8 text-[#DF1E3C]" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Calendar Department</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Monthly content planning for structured execution</p>
          </div>
          <button
            onClick={() => setShowPresentation(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.2] rounded-xl text-sm text-slate-300 hover:text-white transition-all duration-200 shadow-lg"
          >
            <Presentation className="w-4 h-4" />
            <span className="hidden sm:inline">Presentation View</span>
          </button>
        </div>
      </div>

      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Select Client</label>
          <div className="relative group">
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedMonthId('');
              }}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#DF1E3C]/50 focus:border-transparent transition-all group-hover:border-white/20"
            >
              <option value="">Choose a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Select Month</label>
          <div className="relative group">
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              disabled={!selectedClientId}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#DF1E3C]/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-white/20"
            >
              <option value="">Choose a month...</option>
              {filteredMonths.length > 0 && (
                <optgroup label="Active Months" className="bg-gray-900">
                  {filteredMonths.map(month => (
                    <option key={month.id} value={month.id}>
                      {month.title} ({month.monthKey})
                    </option>
                  ))}
                </optgroup>
              )}
              {archivedMonths.length > 0 && (
                <optgroup label="Archived Months" className="bg-gray-900">
                  {archivedMonths.map(month => (
                    <option key={month.id} value={month.id}>
                      📦 {month.title} ({month.monthKey})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400 group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="flex items-end">
          <PermissionGate permission={PERMISSIONS.CALENDAR_MONTHS.CREATE}>
            <button
              onClick={() => setShowMonthModal(true)}
              disabled={!selectedClientId}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#DF1E3C] to-[#b0152d] text-white rounded-xl hover:from-[#c01830] hover:to-[#901020] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-[#DF1E3C]/20 hover:shadow-[#DF1E3C]/40 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Create Month
            </button>
          </PermissionGate>
        </div>
      </div>

      {selectedMonthId && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                {calendarMonths.find(m => m.id === selectedMonthId)?.title}
                {calendarMonths.find(m => m.id === selectedMonthId)?.isArchived && (
                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20">Archived</span>
                )}
              </h2>
              <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                <PermissionGate permission={PERMISSIONS.CALENDAR_MONTHS.DELETE}>
                  <button
                    onClick={() => handleArchiveMonth(selectedMonthId)}
                    className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all"
                    title={calendarMonths.find(m => m.id === selectedMonthId)?.isArchived ? 'Unarchive Month' : 'Archive Month'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMonth(selectedMonthId)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Delete Month"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </PermissionGate>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
                <div className="flex flex-col justify-center px-5 py-3 bg-white/5 border border-white/10 rounded-xl min-w-[100px]">
                  <div className="text-3xl font-bold text-white tracking-tight">{counts.total}</div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Total</div>
                </div>
                <div className="flex flex-col justify-center px-5 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl min-w-[100px]">
                  <div className="text-3xl font-bold text-blue-400 tracking-tight">{counts.videos}</div>
                  <div className="text-xs font-medium text-blue-400/70 uppercase tracking-wider mt-1">Videos</div>
                </div>
                <div className="flex flex-col justify-center px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-xl min-w-[100px]">
                  <div className="text-3xl font-bold text-green-400 tracking-tight">{counts.photos}</div>
                  <div className="text-xs font-medium text-green-400/70 uppercase tracking-wider mt-1">Photos</div>
                </div>
                <div className="flex flex-col justify-center px-5 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl min-w-[100px]">
                  <div className="text-3xl font-bold text-purple-400 tracking-tight">{counts.motion}</div>
                  <div className="text-xs font-medium text-purple-400/70 uppercase tracking-wider mt-1">Motion</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setTypeFilter('ALL')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === 'ALL' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTypeFilter('VIDEO')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === 'VIDEO' ? 'bg-blue-500/20 text-blue-300 shadow-sm' : 'text-slate-400 hover:text-blue-300 hover:bg-blue-500/10'}`}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setTypeFilter('PHOTO')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === 'PHOTO' ? 'bg-green-500/20 text-green-300 shadow-sm' : 'text-slate-400 hover:text-green-300 hover:bg-green-500/10'}`}
                  >
                    Photo
                  </button>
                  <button
                    onClick={() => setTypeFilter('MOTION')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === 'MOTION' ? 'bg-purple-500/20 text-purple-300 shadow-sm' : 'text-slate-400 hover:text-purple-300 hover:bg-purple-500/10'}`}
                  >
                    Motion
                  </button>
                </div>

                <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.CREATE}>
                  <button
                    onClick={openCreateItem}
                    className="px-5 py-2.5 bg-white text-black rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 font-semibold shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    Add Content
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => {
              const imgExts = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp','.avif'];
              const thumbFile = item.referenceFiles.find(f => imgExts.some(ext => f.fileName.toLowerCase().endsWith(ext)));
              const thumbUrl = thumbFile?.downloadURL || (item.referenceFiles.length > 0 ? item.referenceFiles[0].downloadURL : null);
              const linkPreviewUrl = !thumbUrl && item.referenceLinks.length > 0 ? item.referenceLinks[0].url : null;
              return (
              <div
                key={item.id}
                className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 group cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:-translate-y-1 flex flex-col h-full"
                onClick={() => setDetailItem(item)}
              >
                {/* Thumbnail Header: 1) image from referenceFiles, 2) OG image from referenceLink, 3) gradient placeholder */}
                {thumbUrl ? (
                  <div className="relative w-full h-48 bg-black/50 overflow-hidden">
                    <img
                      src={thumbUrl}
                      alt={item.autoName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/20 to-transparent opacity-80" />
                    <div className={`absolute top-3 left-3 px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 backdrop-blur-md shadow-lg ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)} {item.type}
                    </div>
                  </div>
                ) : linkPreviewUrl ? (
                  <div className="relative w-full h-48 bg-black/50 overflow-hidden">
                    <LinkPreviewThumbnail url={linkPreviewUrl} alt={item.autoName} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/20 to-transparent opacity-80 pointer-events-none" />
                    <div className={`absolute top-3 left-3 px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 backdrop-blur-md shadow-lg ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)} {item.type}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-48 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div className="opacity-20 scale-[4] transform group-hover:scale-[4.5] transition-transform duration-700">{getTypeIcon(item.type)}</div>
                    <div className={`absolute top-3 left-3 px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 backdrop-blur-md shadow-lg ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)} {item.type}
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 flex flex-col flex-grow relative">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                  
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-white tracking-tight flex-1 mr-3 group-hover:text-[#DF1E3C] transition-colors line-clamp-2">{item.autoName}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0 bg-black/40 rounded-lg p-1 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDetailItem(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.EDIT}>
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.DELETE}>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4 bg-white/5 w-fit px-2.5 py-1 rounded-md border border-white/5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(item.publishAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Revision Status Badge */}
                  {item.revisionStatus && item.revisionStatus !== 'NONE' && (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold mb-3 px-2.5 py-1 rounded-lg border w-fit ${getRevisionStatusColor(item.revisionStatus)}`}>
                      <RotateCcw className="w-3 h-3" />
                      {getRevisionStatusLabel(item.revisionStatus)}
                      {item.revisionCount && item.revisionCount > 0 && (
                        <span className="text-[10px] opacity-70">#{item.revisionCount}</span>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-slate-300 mb-5 line-clamp-3 flex-grow leading-relaxed" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                    {item.primaryBrief}
                  </p>

                  <div className="flex gap-4 text-xs font-medium text-slate-400 pt-4 border-t border-white/5 mt-auto">
                    {item.referenceLinks.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                        {item.referenceLinks.length} link{item.referenceLinks.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {item.referenceFiles.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        {item.referenceFiles.length} file{item.referenceFiles.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-[#DF1E3C]/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-black/40 border border-white/10 w-full h-full rounded-2xl flex items-center justify-center shadow-xl">
                  <Calendar className="w-10 h-10 text-slate-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No content items yet</h3>
              <p className="text-slate-400 max-w-md mx-auto mb-8">Get started by adding your first piece of content for this month. You can add videos, photos, or motion graphics.</p>
              <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.CREATE}>
                <button
                  onClick={openCreateItem}
                  className="px-6 py-3 bg-gradient-to-r from-[#DF1E3C] to-[#b0152d] text-white rounded-xl hover:from-[#c01830] hover:to-[#901020] transition-all font-semibold shadow-lg shadow-[#DF1E3C]/20 hover:shadow-[#DF1E3C]/40 active:scale-[0.98] inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Item
                </button>
              </PermissionGate>
            </div>
          )}
        </div>
      )}

      {!selectedMonthId && selectedClientId && (
        <div className="text-center py-24 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl shadow-2xl animate-in fade-in duration-500">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-black/40 border border-white/10 w-full h-full rounded-2xl flex items-center justify-center shadow-xl">
              <Calendar className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Select a month</h3>
          <p className="text-slate-400">Choose a month from the dropdown above to view or manage its content.</p>
        </div>
      )}

      {!selectedClientId && (
        <div className="text-center py-24 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl shadow-2xl animate-in fade-in duration-500">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-black/40 border border-white/10 w-full h-full rounded-2xl flex items-center justify-center shadow-xl">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Select a client</h3>
          <p className="text-slate-400">Choose a client from the dropdown above to get started with content planning.</p>
        </div>
      )}

      {showMonthModal && (
        <Modal isOpen={showMonthModal} onClose={() => setShowMonthModal(false)} title="Create Calendar Month">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Month (YYYY-MM)</label>
              <input
                type="month"
                value={monthForm.monthKey}
                onChange={(e) => setMonthForm(prev => ({ ...prev, monthKey: e.target.value }))}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Title</label>
              <input
                type="text"
                value={monthForm.title}
                onChange={(e) => setMonthForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., January 2026 Content Calendar"
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button
                onClick={() => setShowMonthModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMonth}
                disabled={isLoading}
                className="px-4 py-2 bg-[#DF1E3C] text-white rounded-lg hover:bg-[#c01830] disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Month'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showItemModal && (
        <Modal 
          isOpen={showItemModal} 
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
            resetItemForm();
          }} 
          title={editingItem ? 'Edit Content Item' : 'Create Content Item'}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Content Type</label>
              <select
                value={itemForm.type}
                onChange={(e) => setItemForm(prev => ({ ...prev, type: e.target.value as CalendarContentType }))}
                disabled={!!editingItem}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VIDEO">Video</option>
                <option value="PHOTO">Photo</option>
                <option value="MOTION">Motion Design</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Primary Brief *</label>
              <textarea
                value={itemForm.primaryBrief}
                onChange={(e) => setItemForm(prev => ({ ...prev, primaryBrief: e.target.value }))}
                rows={4}
                dir="auto"
                style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Main requirement and description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Notes & Constraints</label>
              <textarea
                value={itemForm.notes}
                onChange={(e) => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                dir="auto"
                style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional notes, constraints, or special instructions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Publish Date & Time *</label>
              <input
                type="datetime-local"
                value={itemForm.publishAt}
                onChange={(e) => setItemForm(prev => ({ ...prev, publishAt: e.target.value }))}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-white/70">Reference Links</label>
                <button
                  onClick={addReferenceLink}
                  className="text-xs text-[#DF1E3C] hover:text-[#c01830] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Link
                </button>
              </div>
              {itemForm.referenceLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateReferenceLink(index, 'title', e.target.value)}
                    placeholder="Title"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateReferenceLink(index, 'url', e.target.value)}
                    placeholder="URL"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => removeReferenceLink(index)}
                    className="p-2 text-slate-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Reference Files</label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadingFiles(Array.from(e.target.files));
                  }
                }}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm"
              />
              {uploadingFiles.length > 0 && (
                <div className="mt-2 text-xs text-slate-400">
                  {uploadingFiles.length} file(s) selected
                </div>
              )}
            </div>

            {editingItem && editingItem.referenceFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Existing Files</label>
                <div className="space-y-2">
                  {editingItem.referenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[#0a0a0a] border border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{file.fileName}</span>
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={file.downloadURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.EDIT}>
                          <button
                            onClick={() => handleDeleteFile(editingItem, index)}
                            className="p-1 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleCreateItem}
                disabled={isLoading}
                className="px-4 py-2 bg-[#DF1E3C] text-white rounded-lg hover:bg-[#c01830] disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Content Detail Preview Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDetailItem(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-5 border-b border-white/10 bg-white/[0.02] gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 sm:gap-1.5 shadow-sm shrink-0 ${getTypeColor(detailItem.type)}`}>
                  {getTypeIcon(detailItem.type)} <span className="hidden sm:inline">{detailItem.type}</span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">{detailItem.autoName}</h2>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 custom-scrollbar">
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full">
                
                {/* Left Column: Media & Meta */}
                <div className="lg:col-span-1 space-y-4 sm:space-y-6 w-full">
                  {/* Thumbnail */}
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-lg">
                    {(() => {
                      const imgExts = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp','.avif'];
                      const thumbFile = detailItem.referenceFiles.find(f => imgExts.some(ext => f.fileName.toLowerCase().endsWith(ext)));
                      const thumbUrl = thumbFile?.downloadURL || (detailItem.referenceFiles.length > 0 ? detailItem.referenceFiles[0].downloadURL : null);
                      const linkPreviewUrl = !thumbUrl && detailItem.referenceLinks.length > 0 ? detailItem.referenceLinks[0].url : null;

                      if (thumbUrl) {
                        return <img src={thumbUrl} alt="Thumbnail" className="w-full h-auto object-cover" />;
                      } else if (linkPreviewUrl) {
                        return <LinkPreviewThumbnail url={linkPreviewUrl} alt="Link Preview" />;
                      } else {
                        return (
                          <div className="w-full aspect-video bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                            <div className="opacity-20 scale-[3]">{getTypeIcon(detailItem.type)}</div>
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Meta Info */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Publish Date</div>
                      <div className="flex items-center gap-2 text-sm font-medium text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                        <Clock className="w-4 h-4 text-blue-400" />
                        {new Date(detailItem.publishAt).toLocaleString(undefined, { 
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Content */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8 w-full min-w-0">
                  
                  {/* Brief */}
                  <div className="w-full min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 shrink-0" /> Primary Brief
                    </h3>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-5 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere shadow-inner w-full" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {detailItem.primaryBrief}
                    </div>
                  </div>

                  {/* Notes */}
                  {detailItem.notes && (
                    <div className="w-full min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0" /> Additional Notes
                      </h3>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-5 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere shadow-inner w-full" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {detailItem.notes}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {detailItem.referenceLinks.length > 0 && (
                    <div className="w-full min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 shrink-0" /> Reference Links
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:gap-3">
                        {detailItem.referenceLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/[0.02] border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all group w-full overflow-hidden"
                          >
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors shrink-0">
                              <ExternalLink className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="text-sm font-medium text-white truncate">{link.title || 'Reference Link'}</div>
                              <div className="text-xs text-slate-500 truncate">{link.url}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {detailItem.referenceFiles.length > 0 && (
                    <div className="w-full min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                        <Download className="w-4 h-4 shrink-0" /> Reference Files
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:gap-3">
                        {detailItem.referenceFiles.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.downloadURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/[0.02] border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all group w-full overflow-hidden"
                          >
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="text-sm font-medium text-white truncate">{file.fileName}</div>
                              <div className="text-xs text-slate-500">Click to download</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-5 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
              <div className="flex gap-2">
                {/* Revision History Button */}
                {getRevisionsForItem(detailItem.id).length > 0 && (
                  <button
                    onClick={() => { setRevisionHistoryItem(detailItem); setShowRevisionHistory(true); }}
                    className="px-4 py-2 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-all font-medium text-sm flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    History ({getRevisionsForItem(detailItem.id).length})
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setDetailItem(null)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium text-sm sm:text-base w-full sm:w-auto"
                >
                  Close
                </button>

                {/* Request Revision Button - only for items synced from creative */}
                {canRequestRevision(detailItem) && (checkPermission(PERMISSIONS.CALENDAR.REQUEST_REVISION) || checkPermission(PERMISSIONS.CALENDAR.MANAGE)) && (
                  <button
                    onClick={() => {
                      setDetailItem(null);
                      openRevisionRequest(detailItem);
                    }}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 font-medium text-sm sm:text-base w-full sm:w-auto"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Request Revision
                  </button>
                )}

                {/* Sync Approved Revision Button */}
                {detailItem.revisionStatus === 'APPROVED_BY_CREATIVE' && checkPermission(PERMISSIONS.CALENDAR.MANAGE) && (
                  <button
                    onClick={() => {
                      handleSyncApprovedRevision(detailItem);
                      setDetailItem(null);
                    }}
                    disabled={isLoading}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-emerald-500/20 text-sm sm:text-base w-full sm:w-auto disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isLoading ? 'Syncing...' : 'Sync Revision'}
                  </button>
                )}

                <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.EDIT}>
                  <button
                    onClick={() => {
                      setDetailItem(null);
                      openEditItem(detailItem);
                    }}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/20 text-sm sm:text-base w-full sm:w-auto"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Content
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* REVISION REQUEST MODAL */}
      {showRevisionModal && revisionTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRevisionModal(false)} />
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <RotateCcw className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Request Revision</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{revisionTargetItem.autoName}</p>
                </div>
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">What needs to change? *</label>
                <textarea
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  placeholder="Describe what needs to be revised..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 resize-none"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Reference Links (optional)</label>
                {revisionRefLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Title"
                      value={link.title}
                      onChange={e => {
                        const updated = [...revisionRefLinks];
                        updated[idx].title = e.target.value;
                        setRevisionRefLinks(updated);
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400/50"
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={e => {
                        const updated = [...revisionRefLinks];
                        updated[idx].url = e.target.value;
                        setRevisionRefLinks(updated);
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400/50"
                    />
                    <button
                      onClick={() => setRevisionRefLinks(revisionRefLinks.filter((_, i) => i !== idx))}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setRevisionRefLinks([...revisionRefLinks, { title: '', url: '' }])}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Add Reference Link
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={isLoading || !revisionNote.trim()}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-medium shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isLoading ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISION HISTORY MODAL */}
      {showRevisionHistory && revisionHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRevisionHistory(false)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <History className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Revision History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{revisionHistoryItem.autoName}</p>
                </div>
              </div>
              <button onClick={() => setShowRevisionHistory(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {getRevisionsForItem(revisionHistoryItem.id).map((rev, idx) => {
                const requester = users.find(u => u.id === rev.requestedBy);
                const reviser = rev.revisedBy ? users.find(u => u.id === rev.revisedBy) : null;
                const reviewer = rev.reviewedBy ? users.find(u => u.id === rev.reviewedBy) : null;
                return (
                  <div key={rev.id} className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getRevisionStatusColor(rev.status)}`}>
                          {getRevisionStatusLabel(rev.status)}
                        </span>
                        <span className="text-xs text-slate-500">#{getRevisionsForItem(revisionHistoryItem.id).length - idx}</span>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Request */}
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Requested by {requester?.name || 'Unknown'}
                      </div>
                      <p className="text-sm text-slate-300 bg-white/[0.03] rounded-lg p-3 whitespace-pre-wrap" dir="auto">{rev.revisionNote}</p>
                    </div>

                    {/* Revised content */}
                    {rev.revisedBy && (
                      <div className="space-y-1 border-t border-white/5 pt-3">
                        <div className="text-xs font-semibold text-slate-400">
                          Revised by {reviser?.name || 'Unknown'} on {rev.revisedAt ? new Date(rev.revisedAt).toLocaleDateString() : 'N/A'}
                        </div>
                        {rev.revisedBrief && (
                          <p className="text-sm text-slate-300 bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10 whitespace-pre-wrap" dir="auto">{rev.revisedBrief}</p>
                        )}
                        {rev.revisedReferenceLinks && rev.revisedReferenceLinks.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <div className="text-xs font-semibold text-slate-500">Reference Links:</div>
                            {rev.revisedReferenceLinks.map((link, idx) => (
                              <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline">
                                <ExternalLink className="w-3 h-3 shrink-0" /> {link.title || link.url}
                              </a>
                            ))}
                          </div>
                        )}
                        {rev.revisedReferenceFiles && rev.revisedReferenceFiles.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <div className="text-xs font-semibold text-slate-500">Reference Files:</div>
                            {rev.revisedReferenceFiles.map((f, idx) => (
                              <a key={idx} href={f.downloadURL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline">
                                <FileText className="w-3 h-3 shrink-0" /> {f.fileName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review */}
                    {rev.reviewedBy && (
                      <div className="space-y-1 border-t border-white/5 pt-3">
                        <div className="text-xs font-semibold text-slate-400">
                          {rev.status === 'APPROVED_BY_CREATIVE' || rev.status === 'SYNCED_TO_CALENDAR' ? '✅ Approved' : '❌ Rejected'} by {reviewer?.name || 'Unknown'}
                        </div>
                        {rev.reviewNote && (
                          <p className="text-sm text-slate-300 bg-white/[0.03] rounded-lg p-3 whitespace-pre-wrap" dir="auto">{rev.reviewNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {getRevisionsForItem(revisionHistoryItem.id).length === 0 && (
                <div className="text-center py-8 text-slate-500">No revision history for this item.</div>
              )}
            </div>

            <div className="p-5 border-t border-white/10">
              <button
                onClick={() => setShowRevisionHistory(false)}
                className="w-full px-4 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarHub;
