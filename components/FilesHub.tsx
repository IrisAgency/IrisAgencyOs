import React, { useState } from 'react';
import { AgencyFile, FileFolder, Project, User } from '../types';
import { 
  Folder, File as FileIcon, Upload, Grid, List, Search, 
  MoreVertical, Download, Eye, Trash2, Image, FileText, 
  Video, Music, Archive, Move, Clock, ChevronRight, CornerUpLeft, X 
} from 'lucide-react';

interface FilesHubProps {
  files: AgencyFile[];
  folders: FileFolder[];
  projects: Project[];
  users: User[];
  currentProjectId?: string; // Optional: restrict to one project
  onUpload: (file: AgencyFile) => void;
  onDelete: (fileId: string) => void;
  onMove: (fileId: string, folderId: string) => void;
  onCreateFolder: (folder: FileFolder) => void;
}

const FilesHub: React.FC<FilesHubProps> = ({ 
  files, folders, projects, users, currentProjectId,
  onUpload, onDelete, onMove, onCreateFolder 
}) => {
  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || 'all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState<AgencyFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter Logic
  const filteredFolders = folders.filter(f => {
    const matchProject = selectedProjectId === 'all' || f.projectId === selectedProjectId;
    const matchParent = f.parentId === currentFolderId;
    return matchProject && matchParent;
  });

  const filteredFiles = files.filter(f => {
    const matchProject = selectedProjectId === 'all' || f.projectId === selectedProjectId;
    const matchFolder = f.folderId === (currentFolderId || null) || (!currentFolderId && !f.folderId && selectedProjectId !== 'all');
    // If viewing 'All' projects and at root, showing all root files might be messy, but acceptable for now.
    // Better logic: If 'all' projects selected, maybe show recent files or require project selection.
    // For simplicity: Show files matching search
    const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchProject && (currentFolderId ? f.folderId === currentFolderId : true) && matchSearch;
  });

  const currentFolder = folders.find(f => f.id === currentFolderId);
  const parentFolder = folders.find(f => f.id === currentFolder?.parentId);
  
  // Check if current view is read-only (Archived)
  const isReadOnly = currentFolder?.isArchiveRoot || currentFolder?.name === 'Archive'; // Simple check for now
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-rose-500" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-orange-500" />;
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       const project = projects.find(p => p.id === selectedProjectId) || projects[0];
       if (!project) return alert("Select a project first");

       const newFile: AgencyFile & { file?: File } = {
          id: `file${Date.now()}`,
          projectId: project.id,
          folderId: currentFolderId,
          uploaderId: 'u1', // This will be overwritten by App.tsx likely or should be passed
          name: file.name,
          type: file.type,
          size: file.size,
          url: '', // Placeholder
          version: 1,
          isDeliverable: false,
          tags: ['upload'],
          createdAt: new Date().toISOString(),
          file: file
       };
       onUpload(newFile);
    }
  };

  const handleCreateNewFolder = () => {
      const project = projects.find(p => p.id === selectedProjectId);
      if (!project && selectedProjectId === 'all') return alert("Please select a project to create a folder.");
      
      const name = prompt("Folder Name:");
      if (name) {
          onCreateFolder({
              id: `f${Date.now()}`,
              projectId: project!.id,
              parentId: currentFolderId,
              name
          });
      }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-4">
          {!currentProjectId && (
            <select 
              value={selectedProjectId} 
              onChange={e => { setSelectedProjectId(e.target.value); setCurrentFolderId(null); }}
              className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          
          <div className="flex items-center text-sm text-slate-500">
             <button 
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-indigo-600 ${!currentFolderId ? 'font-bold text-slate-800' : ''}`}
             >
                 Root
             </button>
             {currentFolder && (
                 <>
                    <ChevronRight className="w-4 h-4 mx-1" />
                    {parentFolder && (
                        <>
                           <span className="truncate max-w-[100px]">{parentFolder.name}</span>
                           <ChevronRight className="w-4 h-4 mx-1" />
                        </>
                    )}
                    <span className="font-bold text-slate-800">{currentFolder.name}</span>
                 </>
             )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search files..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-48"
             />
           </div>
           <div className="h-8 w-px bg-slate-300 mx-2"></div>
           <button 
             onClick={() => setViewMode('grid')}
             className={`p-2 rounded hover:bg-slate-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
           >
             <Grid className="w-4 h-4" />
           </button>
           <button 
             onClick={() => setViewMode('list')}
             className={`p-2 rounded hover:bg-slate-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
           >
             <List className="w-4 h-4" />
           </button>
           <button 
             onClick={handleUploadClick}
             disabled={isReadOnly}
             className={`ml-2 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                 isReadOnly 
                 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                 : 'bg-indigo-600 text-white hover:bg-indigo-700'
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

      {/* Main Content */}
      <div 
         className={`flex-1 overflow-y-auto p-6 ${isDragOver ? 'bg-indigo-50 border-2 border-dashed border-indigo-300' : 'bg-white'}`}
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
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folders</h3>
                 {!isReadOnly && (
                     <button onClick={handleCreateNewFolder} className="text-xs text-indigo-600 hover:underline">+ New Folder</button>
                 )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {filteredFolders.map(folder => (
                    <div 
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all group ${
                          folder.isArchiveRoot 
                          ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 hover:border-slate-300' 
                          : 'bg-slate-50 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200'
                      }`}
                    >
                       {folder.isArchiveRoot ? (
                           <Archive className="w-8 h-8 text-slate-400 group-hover:text-slate-600 mb-2" />
                       ) : (
                           <Folder className="w-8 h-8 text-indigo-300 group-hover:text-indigo-500 mb-2" />
                       )}
                       <p className="text-sm font-medium text-slate-700 truncate">{folder.name}</p>
                       <p className="text-xs text-slate-400">{files.filter(f => f.folderId === folder.id).length} files</p>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* Files Section */}
        <div>
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Files</h3>
              <span className="text-xs text-slate-400">{filteredFiles.length} items</span>
           </div>

           {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {filteredFiles.map(file => (
                    <div key={file.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
                       <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          {file.type.startsWith('image/') ? (
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                              getFileIcon(file.type)
                          )}
                          
                          {/* Overlay Actions */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                             <button onClick={() => setPreviewFile(file)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm"><Eye className="w-4 h-4" /></button>
                             <button className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm"><Download className="w-4 h-4" /></button>
                          </div>
                          
                          {file.isDeliverable && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                                  FINAL
                              </div>
                          )}
                          {file.isArchived && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                                  <Archive className="w-3 h-3" /> ARCHIVED
                              </div>
                          )}
                       </div>
                       <div className="p-3">
                          <div className="flex justify-between items-start">
                             <p className="text-sm font-medium text-slate-700 truncate flex-1" title={file.name}>{file.name}</p>
                             {!isReadOnly && (
                                <button className="text-slate-400 hover:text-indigo-600"><MoreVertical className="w-4 h-4" /></button>
                             )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                             <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                             <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">v{file.version}</span>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                       <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Uploaded By</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredFiles.map(file => {
                          const uploader = users.find(u => u.id === file.uploaderId);
                          return (
                             <tr key={file.id} className="hover:bg-slate-50 group">
                                <td className="px-4 py-3 flex items-center space-x-3">
                                   {getFileIcon(file.type)}
                                   <span className="font-medium text-slate-700">{file.name}</span>
                                   {file.isDeliverable && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">Final</span>}
                                </td>
                                <td className="px-4 py-3 text-slate-500">{formatSize(file.size)}</td>
                                <td className="px-4 py-3 text-slate-500 capitalize">{file.type.split('/')[1]}</td>
                                <td className="px-4 py-3">
                                   <div className="flex items-center space-x-2">
                                      {uploader && <img src={uploader.avatar} className="w-5 h-5 rounded-full" />}
                                      <span className="text-slate-600">{uploader?.name}</span>
                                   </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                   <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => setPreviewFile(file)} className="text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4"/></button>
                                      <button className="text-slate-400 hover:text-indigo-600"><Download className="w-4 h-4"/></button>
                                      <button onClick={() => onDelete(file.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           )}

           {filteredFiles.length === 0 && (
              <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl mt-4">
                 <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                 <p className="font-medium">No files found</p>
                 <p className="text-sm">Upload a file or drag and drop here</p>
              </div>
           )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Preview Content */}
              <div className="flex-1 bg-slate-900 flex items-center justify-center relative">
                 {previewFile.type.startsWith('image/') ? (
                    <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                 ) : (
                    <div className="text-center text-slate-400">
                       <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                       <p>Preview not available for this file type.</p>
                       <button className="mt-4 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white text-sm">Download to View</button>
                    </div>
                 )}
                 <button onClick={() => setPreviewFile(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-5 h-5"/></button>
              </div>

              {/* Sidebar Info */}
              <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
                 <div className="p-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 break-words">{previewFile.name}</h2>
                    <div className="flex items-center space-x-2 mt-2">
                       <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase font-bold">{previewFile.type.split('/')[1]}</span>
                       <span className="text-xs text-slate-500">{formatSize(previewFile.size)}</span>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                       <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Details</h3>
                       <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                             <span className="text-slate-500">Uploaded</span>
                             <span className="text-slate-800">{new Date(previewFile.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-slate-500">By</span>
                             <span className="text-slate-800">{users.find(u => u.id === previewFile.uploaderId)?.name}</span>
                          </div>
                          <div className="flex justify-between">
                             <span className="text-slate-500">Version</span>
                             <span className="text-slate-800">v{previewFile.version}</span>
                          </div>
                       </div>
                    </div>

                    <div>
                       <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Version History</h3>
                       <div className="space-y-2">
                          {[...Array(previewFile.version)].map((_, i) => {
                             const v = previewFile.version - i;
                             return (
                                <div key={v} className={`flex items-center justify-between p-2 rounded ${v === previewFile.version ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
                                   <div className="flex items-center space-x-2">
                                      <span className="text-xs font-bold text-slate-600">v{v}</span>
                                      <span className="text-xs text-slate-400">{v === previewFile.version ? '(Current)' : new Date().toLocaleDateString()}</span>
                                   </div>
                                   {v !== previewFile.version && <button className="text-xs text-indigo-600 hover:underline">Revert</button>}
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>

                 <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center space-x-2">
                       <Download className="w-4 h-4" />
                       <span>Download File</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FilesHub;