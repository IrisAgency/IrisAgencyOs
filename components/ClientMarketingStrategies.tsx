import React, { useState, useEffect, useRef } from 'react';
import { ClientMarketingStrategy, AgencyFile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Plus, Search, FileText, Link as LinkIcon, ExternalLink, Eye, Trash2, Edit2, MoreHorizontal, Calendar, Upload, X } from 'lucide-react';

interface ClientMarketingStrategiesProps {
  clientId: string;
}

const ClientMarketingStrategies: React.FC<ClientMarketingStrategiesProps> = ({ clientId }) => {
  const { currentUser, checkPermission } = useAuth();
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

  const canManage = checkPermission('clients.manage') || checkPermission('clients.manage_strategies');

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

      // Handle File Upload (Mock)
      if (formState.type === 'file' && selectedFile) {
        const newFileId = `file${Date.now()}`;
        const newFile: AgencyFile = {
          id: newFileId,
          projectId: 'general', // or specific project if available
          uploaderId: currentUser.id,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: 'https://picsum.photos/800/600', // Mock URL
          version: 1,
          isDeliverable: false,
          isArchived: false,
          tags: ['strategy'],
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'files', newFileId), newFile);
        fileId = newFileId;
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Marketing Strategies</h3>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Year Filter */}
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 md:w-48"
            />
          </div>

          {canManage && (
            <button 
              onClick={() => openModal()}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Strategy</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading strategies...</td></tr>
            ) : filteredStrategies.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No strategies found for {filterYear}.</td></tr>
            ) : (
              filteredStrategies.map(strategy => (
                <tr key={strategy.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4 font-medium text-slate-700">{strategy.monthLabel}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{strategy.title}</div>
                    {strategy.notes && <div className="text-xs text-slate-500 mt-0.5">{strategy.notes}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {strategy.type === 'file' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        <FileText className="w-3 h-3" /> File
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
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
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {strategy.type === 'file' && (
                        <button 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="View File"
                          onClick={() => alert(`Opening file ${strategy.fileId} (Mock)`)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      {canManage && (
                        <>
                          <button 
                            onClick={() => openModal(strategy)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(strategy.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">{editingStrategy ? 'Edit Strategy' : 'Add Strategy'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select 
                    required
                    value={formState.month}
                    onChange={e => setFormState({...formState, month: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <select 
                    required
                    value={formState.year}
                    onChange={e => setFormState({...formState, year: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  required 
                  type="text" 
                  value={formState.title}
                  onChange={e => setFormState({...formState, title: e.target.value})}
                  placeholder="e.g. Q1 Content Strategy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="file" 
                      checked={formState.type === 'file'} 
                      onChange={() => setFormState({...formState, type: 'file'})}
                      className="text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span className="text-sm text-slate-700">File Upload</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="link" 
                      checked={formState.type === 'link'} 
                      onChange={() => setFormState({...formState, type: 'link'})}
                      className="text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span className="text-sm text-slate-700">External Link</span>
                  </label>
                </div>
              </div>

              {formState.type === 'file' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center space-x-2 text-indigo-600">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                      </div>
                    ) : editingStrategy?.fileId && !selectedFile ? (
                       <div className="flex items-center justify-center space-x-2 text-slate-600">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                  <input 
                    required 
                    type="url" 
                    value={formState.url || ''}
                    onChange={e => setFormState({...formState, url: e.target.value})}
                    placeholder="https://"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea 
                  rows={3}
                  value={formState.notes || ''}
                  onChange={e => setFormState({...formState, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
