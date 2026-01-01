import React, { useState, useMemo } from 'react';
import { AgencyFile, FileFolder, Project, User, Client } from '../types';
import { 
  Folder, File as FileIcon, Upload, Grid, List, Search, 
  MoreVertical, Download, Eye, Trash2, Image, FileText, 
  Video, Music, Archive, Move, Clock, ChevronRight, CornerUpLeft, X,
  FolderOpen, Building2, Briefcase, Film, Camera, FileCode, Presentation
} from 'lucide-react';
import PageContainer from './layout/PageContainer';

interface FilesHubProps {
  files: AgencyFile[];
  folders: FileFolder[];
  projects: Project[];
  clients: Client[];
  users: User[];
  currentProjectId?: string; // Optional: restrict to one project
  onUpload: (file: AgencyFile) => void;
  onDelete: (fileId: string) => void;
  onMove: (fileId: string, folderId: string) => void;
  onCreateFolder: (folder: FileFolder) => void;
  onDeleteFolder: (folderId: string) => void;
}

const FilesHub: React.FC<FilesHubProps> = ({ 
  files, folders, projects, clients, users, currentProjectId,
  onUpload, onDelete, onMove, onCreateFolder, onDeleteFolder 
}) => {
  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';

  // State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || 'all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState<AgencyFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'videos' | 'photos' | 'documents' | 'strategies'>('all');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Build breadcrumb trail
  const breadcrumbs = useMemo(() => {
    const trail: { id: string | null, name: string, type: 'root' | 'client' | 'folder' }[] = [
      { id: null, name: 'All Files', type: 'root' }
    ];
    
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        trail.push({ id: `client_${selectedClientId}`, name: client.name, type: 'client' });
      }
    }
    
    if (currentFolderId) {
      const folder = folders.find(f => f.id === currentFolderId);
      if (folder) {
        // Build parent path
        const parents: FileFolder[] = [];
        let current = folder;
        while (current) {
          parents.unshift(current);
          current = folders.find(f => f.id === current.parentId)!;
        }
        
        parents.forEach(p => {
          trail.push({ id: p.id, name: p.name, type: 'folder' });
        });
      }
    }
    
    return trail;
  }, [selectedClientId, currentFolderId, clients, folders]);

  // Filter Logic - Client-first hierarchy
  const filteredFolders = folders.filter(f => {
    // If viewing a specific client
    if (selectedClientId) {
      const matchClient = f.clientId === selectedClientId;
      const matchParent = f.parentId === currentFolderId;
      return matchClient && matchParent;
    }
    
    // If at root, show client root folders only
    if (!currentFolderId) {
      return f.folderType === 'client_root' && !f.parentId;
    }
    
    const matchParent = f.parentId === currentFolderId;
    return matchParent;
  });

  const filteredFiles = useMemo(() => {
    let result = files.filter(f => {
      // Search filter
      const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         f.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchSearch) return false;
      
      // Type filter
      if (filterType !== 'all') {
        const category = f.category || 'other';
        if (filterType === 'videos' && category !== 'video') return false;
        if (filterType === 'photos' && category !== 'image') return false;
        if (filterType === 'documents' && !['document', 'design'].includes(category)) return false;
        if (filterType === 'strategies' && category !== 'presentation') return false;
      }
      
      // Client filter
      if (selectedClientId && f.clientId !== selectedClientId) return false;
      
      // Folder filter
      if (currentFolderId) {
        return f.folderId === currentFolderId;
      }
      
      // At root with client selected - show unfiled client files
      if (selectedClientId && !currentFolderId) {
        return f.clientId === selectedClientId && !f.folderId;
      }
      
      return true;
    });
    
    return result;
  }, [files, selectedClientId, currentFolderId, searchTerm, filterType]);

  // Memoized file counts per folder for live updates (includes files in subfolders)
  const folderFileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Helper function to get all descendant folder IDs
    const getDescendantFolderIds = (folderId: string): string[] => {
      const descendants = [folderId];
      const children = folders.filter(f => f.parentId === folderId);
      children.forEach(child => {
        descendants.push(...getDescendantFolderIds(child.id));
      });
      return descendants;
    };
    
    // Count files for each folder (including subfolders)
    folders.forEach(folder => {
      const allFolderIds = getDescendantFolderIds(folder.id);
      const fileCount = files.filter(file => 
        file.folderId && allFolderIds.includes(file.folderId)
      ).length;
      counts[folder.id] = fileCount;
    });
    
    return counts;
  }, [files, folders]);

  const currentFolder = folders.find(f => f.id === currentFolderId);
  
  // Check if current view is read-only (Archived)
  const isReadOnly = currentFolder?.isArchiveRoot || currentFolder?.folderType === 'archive';
  
  const getFileIcon = (type: string, category?: string) => {
    const cat = category || type.split('/')[0];
    if (cat === 'image' || type.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
    if (cat === 'video' || type.startsWith('video/')) return <Video className="w-5 h-5 text-rose-500" />;
    if (cat === 'presentation') return <Presentation className="w-5 h-5 text-blue-500" />;
    if (cat === 'design') return <FileCode className="w-5 h-5 text-pink-500" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-orange-500" />;
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  const getFolderIcon = (folder: FileFolder) => {
    const type = folder.folderType;
    if (type === 'archive') return <Archive className="w-8 h-8 text-slate-400" />;
    if (type === 'videos') return <Film className="w-8 h-8 text-rose-400" />;
    if (type === 'photos') return <Camera className="w-8 h-8 text-purple-400" />;
    if (type === 'client_root') return <Building2 className="w-8 h-8 text-indigo-400" />;
    if (type === 'project') return <Briefcase className="w-8 h-8 text-blue-400" />;
    if (type === 'task') return <FileIcon className="w-8 h-8 text-amber-400" />;
    if (type === 'strategy') return <Presentation className="w-8 h-8 text-emerald-400" />;
    return <Folder className="w-8 h-8 text-indigo-300" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handlers
  const handleBreadcrumbClick = (crumb: typeof breadcrumbs[0]) => {
    if (crumb.type === 'root') {
      setSelectedClientId(null);
      setCurrentFolderId(null);
    } else if (crumb.type === 'client') {
      setCurrentFolderId(null);
    } else if (crumb.type === 'folder') {
      setCurrentFolderId(crumb.id);
    }
  };

  const handleFolderClick = (folder: FileFolder) => {
    // If clicking a client root folder, set client and navigate into it
    if (folder.folderType === 'client_root') {
      setSelectedClientId(folder.linkedEntityId || folder.clientId || null);
      setCurrentFolderId(folder.id);
    } else {
      setCurrentFolderId(folder.id);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       
       // Determine context
       let projectId = selectedProjectId;
       let clientId = selectedClientId;
       
       // If in a folder, get its project/client
       if (currentFolderId) {
         const folder = folders.find(f => f.id === currentFolderId);
         if (folder) {
           projectId = folder.projectId || projectId;
           clientId = folder.clientId || clientId || null;
         }
       }
       
       // If no project, try to infer from client
       if (!projectId || projectId === 'all') {
         if (clientId) {
           const clientProjects = projects.filter(p => p.clientId === clientId);
           if (clientProjects.length > 0) {
             projectId = clientProjects[0].id;
           }
         }
       }
       
       if (!projectId || projectId === 'all') {
         return alert("Please navigate to a client or project folder before uploading.");
       }

       const newFile: AgencyFile & { file?: File } = {
          id: `file${Date.now()}`,
          projectId: projectId,
          clientId: clientId,
          folderId: currentFolderId,
          uploaderId: users[0]?.id || 'u1',
          name: file.name,
          type: file.type,
          size: file.size,
          url: '',
          version: 1,
          isDeliverable: false,
          isArchived: false,
          tags: ['upload'],
          createdAt: new Date().toISOString(),
          file: file
       };
       onUpload(newFile);
    }
  };

  const handleCreateNewFolder = () => {
      if (!selectedClientId && !currentFolderId) {
        return alert("Please select a client first to create folders.");
      }
      
      const name = prompt("Folder Name:");
      if (name) {
          const folder = folders.find(f => f.id === currentFolderId);
          onCreateFolder({
              id: `f${Date.now()}`,
              projectId: folder?.projectId || null,
              clientId: selectedClientId,
              parentId: currentFolderId,
              name,
              isArchiveRoot: false,
              isTaskArchiveFolder: false
          });
      }
  };

  const handleDeleteFile = (file: AgencyFile) => {
    if (isReadOnly) {
      alert('Cannot delete files from archived folders.');
      return;
    }
    
    const confirmMessage = file.isDeliverable 
      ? `⚠️ Warning: "${file.name}" is marked as a FINAL deliverable.\n\nAre you sure you want to delete it? This action cannot be undone.`
      : `Are you sure you want to delete "${file.name}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      onDelete(file.id);
    }
  };

  const handleDeleteFolder = (folder: FileFolder, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder from opening
    
    if (isReadOnly || folder.folderType === 'archive' || folder.isArchiveRoot) {
      alert('Cannot delete archived folders or root folders.');
      return;
    }
    
    onDeleteFolder(folder.id);
  };

  return (
    <PageContainer>
      <div className={`h-full flex flex-col ${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] overflow-hidden`}>
        {/* Toolbar */}
        <div className="p-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 mb-3 text-sm text-slate-200">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || 'root'}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-500" />}
              <button
                onClick={() => handleBreadcrumbClick(crumb)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? 'font-bold text-slate-50 bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[color:var(--dash-surface)] border border-transparent'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify_between text-slate-100">
          {/* File Type Filter */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterType === 'all'
                  ? 'bg-[color:var(--dash-primary)] text-white border-[color:var(--dash-primary)]/60 shadow-[0_12px_30px_-16px_rgba(230,60,60,0.6)]'
                  : 'bg-[color:var(--dash-surface)] text-slate-200 hover:bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)]'
              }`}
            >
              All Files
            </button>
            <button
              onClick={() => setFilterType('videos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
                filterType === 'videos'
                  ? 'bg-rose-500/20 text-rose-100 border-rose-400/40'
                  : 'bg-[color:var(--dash-surface)] text-slate-200 hover:bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Videos
            </button>
            <button
              onClick={() => setFilterType('photos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
                filterType === 'photos'
                  ? 'bg-purple-500/20 text-purple-100 border-purple-400/40'
                  : 'bg-[color:var(--dash-surface)] text-slate-200 hover:bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Photos
            </button>
            <button
              onClick={() => setFilterType('documents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
                filterType === 'documents'
                  ? 'bg-orange-500/20 text-orange-100 border-orange-400/40'
                  : 'bg-[color:var(--dash-surface)] text-slate-200 hover:bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Documents
            </button>
            <button
              onClick={() => setFilterType('strategies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
                filterType === 'strategies'
                  ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
                  : 'bg-[color:var(--dash-surface)] text-slate-200 hover:bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)]'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              Strategies
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`${inputClass} pl-9 pr-4 py-2 w-48`}
              />
            </div>
            <div className="h-8 w-px bg-[color:var(--dash-glass-border)] mx-2"></div>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded border border-[color:var(--dash-glass-border)] ${viewMode === 'grid' ? 'bg-[color:var(--dash-surface-elevated)] text-[color:var(--dash-primary)]' : 'text-slate-300 hover:bg-[color:var(--dash-surface)]'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded border border-[color:var(--dash-glass-border)] ${viewMode === 'list' ? 'bg-[color:var(--dash-surface-elevated)] text-[color:var(--dash-primary)]' : 'text-slate-300 hover:bg-[color:var(--dash-surface)]'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={handleUploadClick}
              disabled={isReadOnly}
              className={`ml-2 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  isReadOnly 
                  ? 'bg-[color:var(--dash-surface)] text-slate-500 cursor-not-allowed border-[color:var(--dash-glass-border)]' 
                  : 'bg-[color:var(--dash-primary)] text-white hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] border-[color:var(--dash-primary)]/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelected} 
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`flex-1 overflow-y-auto p-6 ${isDragOver ? 'bg-[color:var(--dash-primary)]/5 border-2 border-dashed border-[color:var(--dash-primary)]/40' : 'bg-[color:var(--dash-surface-elevated)]'}`}
         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={(e) => { 
           e.preventDefault(); 
           setIsDragOver(false); 
           alert("Drag and drop not implemented yet. Please use the Upload button.");
         }}
      >
        {/* Folders Section */}
        {filteredFolders.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Folders</h3>
              {!isReadOnly && (
                <button onClick={handleCreateNewFolder} className="text-xs text-[color:var(--dash-primary)] hover:underline">+ New Folder</button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className={`relative p-4 border rounded-xl cursor-pointer transition-all group ${
                    folder.folderType === 'archive' || folder.isArchiveRoot
                      ? 'bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)] hover:bg-[color:var(--dash-surface-elevated)]'
                      : 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] hover:border-[color:var(--dash-primary)]/40 hover:shadow-[0_10px_32px_-20px_rgba(0,0,0,0.9)]'
                  }`}
                >
                  {/* Delete Button (only for non-archive folders) */}
                  {!isReadOnly && folder.folderType !== 'archive' && !folder.isArchiveRoot && (
                    <button
                      onClick={(e) => handleDeleteFolder(folder, e)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-sm"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <div className="mb-2">
                    {getFolderIcon(folder)}
                  </div>
                  <p className="text-sm font-medium text-slate-100 truncate">{folder.name}</p>
                  <p className="text-xs text-slate-400">{folderFileCounts[folder.id] || 0} files</p>
                  {folder.folderType && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-[color:var(--dash-surface)] text-slate-300 border border-[color:var(--dash-glass-border)] rounded">
                      {folder.folderType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Files</h3>
              <span className="text-xs text-slate-400">{filteredFiles.length} items</span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredFiles.map(file => (
                  <div key={file.id} className="group relative bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] rounded-xl overflow-hidden hover:shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] transition-all">
                    <div className="aspect-square bg-[color:var(--dash-surface-elevated)] relative overflow-hidden flex items-center justify-center">
                          {file.type.startsWith('image/') || file.category === 'image' ? (
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                              getFileIcon(file.type, file.category)
                          )}
                          
                          {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                             <button onClick={() => setPreviewFile(file)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm"><Eye className="w-4 h-4" /></button>
                             <button className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm"><Download className="w-4 h-4" /></button>
                             {!isReadOnly && (
                               <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }} className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 backdrop-blur-sm"><Trash2 className="w-4 h-4" /></button>
                             )}
                          </div>
                          
                          {/* Badges */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            {file.isDeliverable && (
                              <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-100 text-[10px] font-bold rounded-full shadow-sm border border-emerald-400/40">
                                  FINAL
                              </div>
                            )}
                            {file.category && (
                              <div className="px-2 py-0.5 bg-indigo-500/20 text-indigo-100 text-[10px] font-bold rounded-full shadow-sm uppercase border border-indigo-400/40">
                                  {file.category}
                              </div>
                            )}
                          </div>
                          {file.isArchived && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                                  <Archive className="w-3 h-3" /> ARCHIVED
                              </div>
                          )}
                       </div>
                        <div className="p-3">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-100 truncate flex-1" title={file.name}>{file.name}</p>
                            {!isReadOnly && (
                              <button className="text-slate-400 hover:text-[color:var(--dash-primary)]"><MoreVertical className="w-4 h-4" /></button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-400 ltr-text">{formatSize(file.size)}</span>
                            <span className="text-[10px] bg-[color:var(--dash-surface)] text-slate-300 px-1.5 py-0.5 rounded ltr-text border border-[color:var(--dash-glass-border)]">v{file.version}</span>
                          </div>
                        </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div className="space-y-2">
                 {filteredFiles.map(file => {
                    const uploader = users.find(u => u.id === file.uploaderId);
                    return (
                       <div key={file.id} className="bg-[color:var(--dash-surface)] rounded-lg border border-[color:var(--dash-glass-border)] p-4 hover:shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] group transition-colors">
                          <div className="flex items-start justify-between gap-4">
                             <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="flex-shrink-0 mt-1">
                                   {getFileIcon(file.type, file.category)}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="font-semibold text-slate-100 truncate">{file.name}</span>
                                      {file.isDeliverable && (
                                         <span className="text-[10px] bg-emerald-500/15 text-emerald-100 px-1.5 py-0.5 rounded border border-emerald-400/40 flex-shrink-0">Final</span>
                                      )}
                                      {file.category && (
                                         <span className="text-[10px] bg-indigo-500/15 text-indigo-100 px-1.5 py-0.5 rounded border border-indigo-400/40 uppercase flex-shrink-0">{file.category}</span>
                                      )}
                                   </div>
                                   {file.originalName && file.originalName !== file.name && (
                                      <p className="text-xs text-slate-400 truncate mb-2">Original: <span className="ltr-text">{file.originalName}</span></p>
                                   )}
                                   <div className="flex items-center gap-4 text-xs text-slate-400">
                                      <span className="ltr-text">{formatSize(file.size)}</span>
                                      <span className="capitalize">{file.type.split('/')[1] || file.category || 'unknown'}</span>
                                      <span className="hidden sm:inline ltr-text">{new Date(file.createdAt).toLocaleDateString()}</span>
                                   </div>
                                   {uploader && (
                                      <div className="flex items-center gap-2 mt-2">
                                         <img src={uploader.avatar} className="w-5 h-5 rounded-full" alt="" />
                                         <span className="text-xs text-slate-300">{uploader.name}</span>
                                      </div>
                                   )}
                                </div>
                             </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={() => setPreviewFile(file)} className="text-slate-400 hover:text-[color:var(--dash-primary)] p-2">
                                   <Eye className="w-4 h-4"/>
                                </button>
                                <button className="text-slate-400 hover:text-[color:var(--dash-primary)] p-2">
                                   <Download className="w-4 h-4"/>
                                </button>
                                {!isReadOnly && (
                                  <button onClick={() => handleDeleteFile(file)} className="text-slate-400 hover:text-rose-200 p-2">
                                      <Trash2 className="w-4 h-4"/>
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
                    );
                 })}
              </div>
           )}

            {filteredFiles.length === 0 && (
              <div className={`${surface} p-12 text-center text-slate-400 border-2 border-dashed border-[color:var(--dash-glass-border)] rounded-xl mt-4`}>
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-slate-100">No files found</p>
                <p className="text-sm text-slate-400">Upload a file or drag and drop here</p>
              </div>
            )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Preview Content */}
            <div className="flex-1 bg-[color:var(--dash-surface)] flex items-center justify-center relative">
                 {previewFile.type.startsWith('image/') ? (
                    <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                 ) : (
                      <div className="text-center text-slate-300">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Preview not available for this file type.</p>
                        <button className="mt-4 px-4 py-2 bg-[color:var(--dash-surface-elevated)] rounded-lg hover:bg-[color:var(--dash-surface)] text-white text-sm border border-[color:var(--dash-glass-border)]">Download to View</button>
                    </div>
                 )}
                 <button onClick={() => setPreviewFile(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-5 h-5"/></button>
              </div>

              {/* Sidebar Info */}
                  <div className="w-80 bg-[color:var(--dash-surface)] border-l border-[color:var(--dash-glass-border)] flex flex-col">
                    <div className="p-6 border-b border-[color:var(--dash-glass-border)]">
                      <h2 className="font-bold text-slate-50 break-words">{previewFile.name}</h2>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs bg-[color:var(--dash-surface-elevated)] px-2 py-0.5 rounded text-slate-200 uppercase font-bold border border-[color:var(--dash-glass-border)]">{previewFile.type.split('/')[1]}</span>
                        <span className="text-xs text-slate-400">{formatSize(previewFile.size)}</span>
                      </div>
                    </div>

                 <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
                    <div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase mb-2">Details</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Uploaded</span>
                            <span className="text-slate-100">{new Date(previewFile.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-slate-500">By</span>
                             <span className="text-slate-100">{users.find(u => u.id === previewFile.uploaderId)?.name}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-slate-500">Version</span>
                             <span className="text-slate-100">v{previewFile.version}</span>
                          </div>
                       </div>
                    </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-300 uppercase mb-2">Version History</h3>
                        <div className="space-y-2">
                          {[...Array(previewFile.version)].map((_, i) => {
                            const v = previewFile.version - i;
                            return (
                              <div key={v} className={`flex items-center justify-between p-2 rounded border ${v === previewFile.version ? 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-primary)]/40' : 'hover:bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)]'}`}>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-100">v{v}</span>
                                  <span className="text-xs text-slate-400">{v === previewFile.version ? '(Current)' : new Date().toLocaleDateString()}</span>
                                </div>
                                {v !== previewFile.version && <button className="text-xs text-[color:var(--dash-primary)] hover:underline">Revert</button>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                 </div>

                    <div className="p-4 border-t border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]">
                      <button className="w-full bg-[color:var(--dash-primary)] text-white py-2 rounded-lg font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] flex items-center justify-center space-x-2">
                       <Download className="w-4 h-4" />
                       <span>Download File</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      </div>
    </PageContainer>
  );
};

export default FilesHub;