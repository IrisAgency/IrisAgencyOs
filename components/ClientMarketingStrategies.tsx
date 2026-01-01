import React, { useState, useEffect, useRef } from 'react';
import { ClientMarketingStrategy, AgencyFile, FileFolder, User } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Plus, Search, FileText, Link as LinkIcon, ExternalLink, Eye, Trash2, Edit2, MoreHorizontal, Calendar, Upload, X } from 'lucide-react';

interface ClientMarketingStrategiesProps {
  clientId: string;
  files?: AgencyFile[];
  folders?: FileFolder[];
  onUploadFile?: (file: AgencyFile) => Promise<void>;
  checkPermission: (permission: string) => boolean;
  currentUser?: User | null;
}

const ClientMarketingStrategies: React.FC<ClientMarketingStrategiesProps> = ({ 
  clientId,
  files = [],
  folders = [],
  onUploadFile,
  checkPermission,
  currentUser
}) => {
  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const pill = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide';

  const [strategies, setStrategies] = useState<ClientMarketingStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<ClientMarketingStrategy | null>(null);
  
  // Form State
  const [formState, setFormState] = useState<Partial<ClientMarketingStrategy>>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    type: 'file',
    title: '',
    notes: '',
    url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = checkPermission('client.marketing_strategies.manage');
  const canView = checkPermission('client.marketing_strategies.view');

  if (!canView) {
    return (
      <div className={`${surface} p-8 text-center text-slate-400 rounded-xl`}>
        <p>You do not have permission to view marketing strategies.</p>
      </div>
    );
  }

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [
    new Date().getFullYear() - 2,
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
    new Date().getFullYear() + 2
  ];

  useEffect(() => {
    fetchStrategies();
  }, [clientId, filterYear]);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'client_strategies'),
        where('clientId', '==', clientId),
        where('year', '==', filterYear)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientMarketingStrategy));
      
      // Sort by month
      data.sort((a, b) => a.month - b.month);
      
      setStrategies(data);
    } catch (error) {
      console.error("Error fetching strategies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      let fileId = editingStrategy?.fileId || null;

      // Handle File Upload
      if (formState.type === 'file' && selectedFile && onUploadFile) {
        const newFileId = `f${Date.now()}`;
        const newFile: AgencyFile = {
          id: newFileId,
          projectId: clientId, // Use clientId as projectId for strategies
          taskId: null,
          folderId: null,
          uploaderId: currentUser.id,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: '', // Will be filled by upload handler
          version: 1,
          isDeliverable: false,
          isArchived: false,
          tags: ['strategy', clientId],
          createdAt: new Date().toISOString()
        };
        
        // Attach raw file for uploader
        (newFile as any).file = selectedFile;
        
        await onUploadFile(newFile);
        fileId = newFileId;
      } else if (formState.type === 'file' && selectedFile && !onUploadFile) {
        console.error("onUploadFile prop is missing");
        alert("File upload is not available at the moment.");
        return;
      }

      const monthLabel = months.find(m => m.value === formState.month)?.label + ' ' + formState.year;

      const strategyData: Partial<ClientMarketingStrategy> = {
        clientId,
        year: formState.year,
        month: formState.month,
        monthLabel,
        title: formState.title,
        type: formState.type as 'file' | 'link',
        fileId: formState.type === 'file' ? fileId : null,
        url: formState.type === 'link' ? formState.url : null,
        notes: formState.notes,
        updatedAt: new Date().toISOString()
      };

      if (editingStrategy) {
        await updateDoc(doc(db, 'client_strategies', editingStrategy.id), strategyData);
      } else {
        await addDoc(collection(db, 'client_strategies'), {
          ...strategyData,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      setEditingStrategy(null);
      setFormState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        type: 'file',
        title: '',
        notes: '',
        url: ''
      });
      setSelectedFile(null);
      fetchStrategies();

    } catch (error) {
      console.error("Error saving strategy:", error);
      alert("Failed to save strategy.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await deleteDoc(doc(db, 'client_strategies', id));
      fetchStrategies();
    } catch (error) {
      console.error("Error deleting strategy:", error);
      alert("Failed to delete strategy.");
    }
  };

  const openModal = (strategy?: ClientMarketingStrategy) => {
    if (strategy) {
      setEditingStrategy(strategy);
      setFormState({
        year: strategy.year,
        month: strategy.month,
        type: strategy.type,
        title: strategy.title,
        notes: strategy.notes || '',
        url: strategy.url || ''
      });
    } else {
      setEditingStrategy(null);
      setFormState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        type: 'file',
        title: '',
        notes: '',
        url: ''
      });
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const filteredStrategies = strategies.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${elevated} rounded-xl shadow-[0_20px_60px_-28px_rgba(0,0,0,0.8)] overflow-hidden`}>
      <div className="p-5 border-b border-[color:var(--dash-glass-border)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[color:var(--dash-surface)]">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[color:var(--dash-primary)]" />
          <h3 className="font-bold text-slate-50">Marketing Strategies</h3>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Year Filter */}
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className={`${inputClass} w-[120px] md:w-[140px]`}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClass} pl-9 w-32 md:w-48`}
            />
          </div>

          {canManage && (
            <button 
              onClick={() => openModal()}
              className="flex items-center space-x-2 bg-[color:var(--dash-primary)] text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.7)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Strategy</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[color:var(--dash-surface)] text-slate-400 font-medium">
            <tr className="border-b border-[color:var(--dash-glass-border)]">
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--dash-glass-border)]">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading strategies...</td></tr>
            ) : filteredStrategies.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No strategies found for {filterYear}.</td></tr>
            ) : (
              filteredStrategies.map(strategy => (
                <tr key={strategy.id} className="hover:bg-[color:var(--dash-surface-elevated)]/60 group">
                  <td className="px-6 py-4 font-medium text-slate-100">{strategy.monthLabel}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-50">{strategy.title}</div>
                    {strategy.notes && <div className="text-xs text-slate-400 mt-0.5">{strategy.notes}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {strategy.type === 'file' ? (
                      <span className={`${pill} bg-[color:var(--dash-primary)]/15 text-[color:var(--dash-primary)] border border-[color:var(--dash-primary)]/40`}>
                        <FileText className="w-3 h-3" /> File
                      </span>
                    ) : (
                      <span className={`${pill} bg-indigo-500/15 text-indigo-200 border border-indigo-400/40`}>
                        <LinkIcon className="w-3 h-3" /> Link
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {strategy.type === 'link' && strategy.url && (
                        <a 
                          href={strategy.url.startsWith('http') ? strategy.url : `https://${strategy.url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-surface)] rounded transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {strategy.type === 'file' && (
                        <button 
                          className="p-1.5 text-slate-400 hover:text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-surface)] rounded transition-colors"
                          title="View File"
                          onClick={() => {
                              const file = files.find(f => f.id === strategy.fileId);
                              if (file && file.url) {
                                  window.open(file.url, '_blank');
                              } else {
                                  alert('File not found or URL missing.');
                              }
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      {canManage && (
                        <>
                          <button 
                            onClick={() => openModal(strategy)}
                            className="p-1.5 text-slate-400 hover:text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-surface)] rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(strategy.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[color:var(--dash-surface)] rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className={`${elevated} rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
            <div className="p-6 border-b border-[color:var(--dash-glass-border)] flex justify-between items-center bg-[color:var(--dash-surface)]">
              <h2 className="text-lg font-bold text-slate-50">{editingStrategy ? 'Edit Strategy' : 'Add Strategy'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1">Month</label>
                  <select 
                    required
                    value={formState.month}
                    onChange={e => setFormState({...formState, month: Number(e.target.value)})}
                    className={inputClass}
                  >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1">Year</label>
                  <select 
                    required
                    value={formState.year}
                    onChange={e => setFormState({...formState, year: Number(e.target.value)})}
                    className={inputClass}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1">Title</label>
                <input 
                  required 
                  type="text" 
                  value={formState.title}
                  onChange={e => setFormState({...formState, title: e.target.value})}
                  placeholder="e.g. Q1 Content Strategy"
                  className={inputClass} 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="file" 
                      checked={formState.type === 'file'} 
                      onChange={() => setFormState({...formState, type: 'file'})}
                      className="text-[color:var(--dash-primary)] focus:ring-[color:var(--dash-primary)] bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]" 
                    />
                    <span className="text-sm text-slate-200">File Upload</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="link" 
                      checked={formState.type === 'link'} 
                      onChange={() => setFormState({...formState, type: 'link'})}
                      className="text-[color:var(--dash-primary)] focus:ring-[color:var(--dash-primary)] bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]" 
                    />
                    <span className="text-sm text-slate-200">External Link</span>
                  </label>
                </div>
              </div>

              {formState.type === 'file' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1">File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[color:var(--dash-glass-border)] rounded-lg p-4 text-center cursor-pointer hover:bg-[color:var(--dash-surface)] transition-colors bg-[color:var(--dash-surface-elevated)]"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center space-x-2 text-[color:var(--dash-primary)]">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                      </div>
                    ) : editingStrategy?.fileId && !selectedFile ? (
                       <div className="flex items-center justify-center space-x-2 text-slate-300">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">Current File (Click to replace)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-sm">Click to upload file</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={e => e.target.files && setSelectedFile(e.target.files[0])} 
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-1">URL</label>
                  <input 
                    required 
                    type="url" 
                    value={formState.url || ''}
                    onChange={e => setFormState({...formState, url: e.target.value})}
                    placeholder="https://"
                    className={inputClass} 
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1">Notes (Optional)</label>
                <textarea 
                  rows={3}
                  value={formState.notes || ''}
                  onChange={e => setFormState({...formState, notes: e.target.value})}
                  className={`${inputClass} min-h-[80px]`} 
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[color:var(--dash-glass-border)] text-slate-200 bg-[color:var(--dash-surface)] rounded-lg font-medium hover:bg-[color:var(--dash-surface-elevated)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[color:var(--dash-primary)] text-white px-4 py-2 rounded-lg font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.7)] transition-colors"
                >
                  Save Strategy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMarketingStrategies;
