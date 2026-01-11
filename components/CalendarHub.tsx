import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Video, Image, Film, Clock, FileText, Link as LinkIcon, X, Download, Trash2, Edit2 } from 'lucide-react';
import { Client, CalendarMonth, CalendarItem, CalendarContentType, User, CalendarReferenceLink } from '../types';
import { PERMISSIONS } from '../lib/permissions';
import { PermissionGate } from './PermissionGate';
import { useAuth } from '../contexts/AuthContext';
import Modal from './common/Modal';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

interface CalendarHubProps {
  clients: Client[];
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  currentUser: User;
  onRefresh?: () => void;
}

const CalendarHub: React.FC<CalendarHubProps> = ({
  clients,
  calendarMonths,
  calendarItems,
  currentUser,
  onRefresh
}) => {
  const { checkPermission } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<CalendarContentType | 'ALL'>('ALL');
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingMonth, setEditingMonth] = useState<CalendarMonth | null>(null);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const canManage = checkPermission(PERMISSIONS.CALENDAR.MANAGE);

  const getClientCode = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client?.code || client?.name?.substring(0, 3).toUpperCase() || 'UNK';
  };

  const filteredMonths = useMemo(() => {
    if (!selectedClientId) return [];
    return calendarMonths
      .filter(m => m.clientId === selectedClientId)
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

  return (
    <div className="p-6 max-w-full" style={{ background: '#050505' }}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8" style={{ color: '#DF1E3C' }} />
          <h1 className="text-3xl font-bold text-white">Calendar Department</h1>
        </div>
        <p className="text-slate-400">Monthly content planning for structured execution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setSelectedMonthId('');
            }}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white"
          >
            <option value="">Choose a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Month</label>
          <select
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
            disabled={!selectedClientId}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white disabled:opacity-50"
          >
            <option value="">Choose a month...</option>
            {filteredMonths.map(month => (
              <option key={month.id} value={month.id}>
                {month.title} ({month.monthKey})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <PermissionGate permission={PERMISSIONS.CALENDAR_MONTHS.CREATE}>
            <button
              onClick={() => setShowMonthModal(true)}
              disabled={!selectedClientId}
              className="w-full px-4 py-2 bg-[#DF1E3C] text-white rounded-lg hover:bg-[#c01830] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Month
            </button>
          </PermissionGate>
        </div>
      </div>

      {selectedMonthId && (
        <>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{counts.total}</div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{counts.videos}</div>
                  <div className="text-xs text-slate-400">Videos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{counts.photos}</div>
                  <div className="text-xs text-slate-400">Photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{counts.motion}</div>
                  <div className="text-xs text-slate-400">Motion</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1 rounded-md text-sm ${typeFilter === 'ALL' ? 'bg-[#DF1E3C] text-white' : 'bg-gray-800 text-slate-300'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter('VIDEO')}
                  className={`px-3 py-1 rounded-md text-sm ${typeFilter === 'VIDEO' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-slate-300'}`}
                >
                  Video
                </button>
                <button
                  onClick={() => setTypeFilter('PHOTO')}
                  className={`px-3 py-1 rounded-md text-sm ${typeFilter === 'PHOTO' ? 'bg-green-500 text-white' : 'bg-gray-800 text-slate-300'}`}
                >
                  Photo
                </button>
                <button
                  onClick={() => setTypeFilter('MOTION')}
                  className={`px-3 py-1 rounded-md text-sm ${typeFilter === 'MOTION' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-slate-300'}`}
                >
                  Motion
                </button>
              </div>

              <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.CREATE}>
                <button
                  onClick={openCreateItem}
                  className="px-4 py-2 bg-[#DF1E3C] text-white rounded-lg hover:bg-[#c01830] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Content
                </button>
              </PermissionGate>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                    {item.type}
                  </div>
                  <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.EDIT}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditItem(item)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.DELETE}>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  </PermissionGate>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 font-mono">{item.autoName}</h3>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <Clock className="w-3 h-3" />
                  {new Date(item.publishAt).toLocaleString()}
                </div>

                <p className="text-sm text-slate-300 mb-3 line-clamp-2" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                  {item.primaryBrief}
                </p>

                <div className="flex gap-3 text-xs text-slate-400">
                  {item.referenceLinks.length > 0 && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      {item.referenceLinks.length} links
                    </div>
                  )}
                  {item.referenceFiles.length > 0 && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {item.referenceFiles.length} files
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No content items yet</p>
              <PermissionGate permission={PERMISSIONS.CALENDAR_ITEMS.CREATE}>
                <button
                  onClick={openCreateItem}
                  className="mt-4 px-4 py-2 bg-[#DF1E3C] text-white rounded-lg hover:bg-[#c01830]"
                >
                  Create First Item
                </button>
              </PermissionGate>
            </div>
          )}
        </>
      )}

      {!selectedMonthId && selectedClientId && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">Select a month to view content</p>
        </div>
      )}

      {!selectedClientId && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">Select a client to get started</p>
        </div>
      )}

      {showMonthModal && (
        <Modal isOpen={showMonthModal} onClose={() => setShowMonthModal(false)} title="Create Calendar Month">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Month (YYYY-MM)</label>
              <input
                type="month"
                value={monthForm.monthKey}
                onChange={(e) => setMonthForm(prev => ({ ...prev, monthKey: e.target.value }))}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input
                type="text"
                value={monthForm.title}
                onChange={(e) => setMonthForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., January 2026 Content Calendar"
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white"
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Content Type</label>
              <select
                value={itemForm.type}
                onChange={(e) => setItemForm(prev => ({ ...prev, type: e.target.value as CalendarContentType }))}
                disabled={!!editingItem}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white disabled:opacity-50"
              >
                <option value="VIDEO">Video</option>
                <option value="PHOTO">Photo</option>
                <option value="MOTION">Motion Design</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Primary Brief *</label>
              <textarea
                value={itemForm.primaryBrief}
                onChange={(e) => setItemForm(prev => ({ ...prev, primaryBrief: e.target.value }))}
                rows={4}
                dir="auto"
                style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white resize-none"
                placeholder="Main requirement and description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes & Constraints</label>
              <textarea
                value={itemForm.notes}
                onChange={(e) => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                dir="auto"
                style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white resize-none"
                placeholder="Additional notes, constraints, or special instructions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Publish Date & Time *</label>
              <input
                type="datetime-local"
                value={itemForm.publishAt}
                onChange={(e) => setItemForm(prev => ({ ...prev, publishAt: e.target.value }))}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Reference Links</label>
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
                    className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white text-sm"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateReferenceLink(index, 'url', e.target.value)}
                    placeholder="URL"
                    className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white text-sm"
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Reference Files</label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadingFiles(Array.from(e.target.files));
                  }
                }}
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white text-sm"
              />
              {uploadingFiles.length > 0 && (
                <div className="mt-2 text-xs text-slate-400">
                  {uploadingFiles.length} file(s) selected
                </div>
              )}
            </div>

            {editingItem && editingItem.referenceFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Existing Files</label>
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
    </div>
  );
};

export default CalendarHub;
