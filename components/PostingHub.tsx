import React, { useState } from 'react';
import { SocialPost, Project, Client, User, SocialPlatform, Task, AgencyFile, TaskComment } from '../types';
import { 
  Search, Filter, Calendar, Clock, CheckCircle, 
  MessageSquare, MoreVertical, Plus, Share2, 
  Layout, List, Edit2, Send, User as UserIcon, ChevronLeft, ChevronRight,
  Instagram, Facebook, Linkedin, Youtube, Twitter, Globe, Video,
  Paperclip, FileText, Image as ImageIcon, ExternalLink
} from 'lucide-react';

interface PostingHubProps {
  socialPosts: SocialPost[];
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  users: User[];
  currentUser: User;
  onUpdatePost: (post: SocialPost) => void;
  onArchiveTask: (task: Task) => void; // Callback to archive original task
  checkPermission: (code: string) => boolean;
  onNotify: (type: string, title: string, message: string) => void;
  files?: AgencyFile[];
  comments?: TaskComment[];
}

const PostingHub: React.FC<PostingHubProps> = ({ 
  socialPosts = [], tasks = [], projects = [], clients = [], users = [], currentUser, 
  onUpdatePost, onArchiveTask, checkPermission, onNotify,
  files = [], comments = []
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SocialPost['status'] | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const selectedPost = socialPosts.find(p => p.id === selectedPostId);

  // Debug permissions
  const canManage = checkPermission('social_posts.manage');
  const canView = checkPermission('social_posts.view');
  console.log('PostingHub Permissions:', { canManage, canView, currentUser: currentUser?.name, role: currentUser?.role });

  // Enhanced Filter Logic
  const filteredPosts = socialPosts.filter(p => {
    // Search filter
    const searchMatch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clients.find(c => c.id === p.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.caption || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Client filter
    const clientMatch = filterClient === 'all' || p.clientId === filterClient;
    
    // Platform filter
    const platformMatch = filterPlatform === 'all' || p.platforms.includes(filterPlatform);
    
    // Status filter
    const statusMatch = filterStatus === 'all' || p.status === filterStatus;
    
    // Project filter
    const projectMatch = filterProject === 'all' || p.projectId === filterProject;
    
    // Owner filter
    const ownerMatch = filterOwner === 'all' || p.socialManagerId === filterOwner || p.createdBy === filterOwner;
    
    return searchMatch && clientMatch && platformMatch && statusMatch && projectMatch && ownerMatch;
  });

  // Columns for Kanban
  const columns: { id: SocialPost['status'], label: string, color: string }[] = [
    { id: 'pending', label: 'Pending', color: 'bg-slate-100 border-slate-200' },
    { id: 'writing', label: 'Writing', color: 'bg-blue-50 border-blue-200' },
    { id: 'review', label: 'In Review', color: 'bg-amber-50 border-amber-200' },
    { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-50 border-purple-200' },
    { id: 'published', label: 'Published', color: 'bg-emerald-50 border-emerald-200' }
  ];

  const getPlatformIcon = (platform: SocialPlatform) => {
      switch(platform) {
          case 'instagram': return <Instagram className="w-3 h-3" />;
          case 'facebook': return <Facebook className="w-3 h-3" />;
          case 'linkedin': return <Linkedin className="w-3 h-3" />;
          case 'youtube': return <Youtube className="w-3 h-3" />;
          case 'twitter': return <Twitter className="w-3 h-3" />;
          case 'tiktok': return <Video className="w-3 h-3" />;
          case 'website': return <Globe className="w-3 h-3" />;
          default: return <Share2 className="w-3 h-3" />;
      }
  };

  const handleStatusChange = (post: SocialPost, newStatus: SocialPost['status']) => {
      const updatedPost = { ...post, status: newStatus, updatedAt: new Date().toISOString() };
      onUpdatePost(updatedPost);

      // Trigger Archive if moved to Scheduled or Published
      if ((newStatus === 'scheduled' || newStatus === 'published') && post.status !== 'scheduled' && post.status !== 'published') {
          const originalTask = tasks.find(t => t.id === post.sourceTaskId);
          if (originalTask) {
              onArchiveTask(originalTask);
              onNotify('system', 'Task Archived', `Original task "${originalTask.title}" has been archived.`);
          }
      }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-6 h-6 text-indigo-600" /> Posting & Captions
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage social media content pipeline</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Layout className="w-4 h-4" />
                <span>Board</span>
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search posts by title, client, or caption..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                showFilters 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterClient !== 'all' || filterPlatform !== 'all' || filterStatus !== 'all' || filterProject !== 'all' || filterOwner !== 'all') && (
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                <span className="text-slate-600">{filteredPosts.filter(p => p.status === 'pending').length} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-600">{filteredPosts.filter(p => p.status === 'writing').length} Writing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-slate-600">{filteredPosts.filter(p => p.status === 'scheduled').length} Scheduled</span>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-in slide-in-from-top duration-200">
              <div className="grid grid-cols-5 gap-3">
                {/* Client Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Client</label>
                  <select
                    value={filterClient}
                    onChange={e => setFilterClient(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Clients</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                {/* Project Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Project</label>
                  <select
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Projects</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                {/* Platform Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Platform</label>
                  <select
                    value={filterPlatform}
                    onChange={e => setFilterPlatform(e.target.value as SocialPlatform | 'all')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as SocialPost['status'] | 'all')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="writing">Writing</option>
                    <option value="review">In Review</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                {/* Owner Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Assigned To</label>
                  <select
                    value={filterOwner}
                    onChange={e => setFilterOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="all">All Team Members</option>
                    <option value={currentUser.id}>My Posts</option>
                    {users.filter(u => u.role === 'Social Manager' || u.role === 'Copywriter').map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(filterClient !== 'all' || filterPlatform !== 'all' || filterStatus !== 'all' || filterProject !== 'all' || filterOwner !== 'all') && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setFilterClient('all');
                      setFilterPlatform('all');
                      setFilterStatus('all');
                      setFilterProject('all');
                      setFilterOwner('all');
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Board/Calendar View */}
        <div className={`${selectedPost ? 'w-2/3' : 'w-full'} bg-slate-50 transition-all duration-300 overflow-hidden`}>
            {viewMode === 'kanban' ? (
                <div className="h-full p-4 overflow-x-auto">
                  <div className="flex gap-4 h-full min-w-max pb-4">
                    {columns.map(col => {
                      const colPosts = filteredPosts.filter(p => p.status === col.id);
                      const isEmpty = colPosts.length === 0;
                      
                      return (
                        <div key={col.id} className="w-80 flex flex-col bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                          <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${col.color.replace('bg-', 'border-').replace('50', '300')}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${col.color.replace('50', '500').replace('bg-', 'bg-')}`}></div>
                              <span className="font-bold text-slate-800 text-sm">{col.label}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${col.color.replace('50', '100')} ${col.color.replace('bg-', 'text-').replace('50', '700')}`}>
                              {colPosts.length}
                            </span>
                          </div>
                          
                          <div className={`flex-1 p-3 space-y-3 overflow-y-auto ${col.color}`}>
                            {isEmpty ? (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center py-8">
                                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-200 flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-slate-400" />
                                  </div>
                                  <p className="text-sm text-slate-400 font-medium">No posts here yet</p>
                                </div>
                              </div>
                            ) : (
                              colPosts.map(post => {
                                const client = clients.find(c => c.id === post.clientId);
                                const manager = users.find(u => u.id === post.socialManagerId);
                                
                                return (
                                  <div 
                                    key={post.id}
                                    onClick={() => setSelectedPostId(post.id)}
                                    className={`group bg-white p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all ${
                                      selectedPostId === post.id 
                                        ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' 
                                        : 'border-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-3">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-slate-100 rounded">
                                        {client?.name || 'Unknown'}
                                      </span>
                                      {post.platforms && post.platforms.length > 0 && (
                                        <div className="flex gap-1">
                                          {post.platforms.slice(0, 3).map(p => (
                                            <div key={p} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center border border-slate-200 text-indigo-600" title={p}>
                                              {getPlatformIcon(p)}
                                            </div>
                                          ))}
                                          {post.platforms.length > 3 && (
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                              <span className="text-[10px] font-bold text-slate-600">+{post.platforms.length - 3}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <h3 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                                      {post.title || <span className="italic text-slate-400 font-normal">Untitled Post</span>}
                                    </h3>
                                    
                                    {post.caption && (
                                      <p className="text-xs text-slate-600 mb-3 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                                        {post.caption}
                                      </p>
                                    )}
                                    
                                    {post.publishAt && (
                                      <div className="flex items-center text-xs text-slate-600 bg-amber-50 px-2 py-1.5 rounded mb-3 border border-amber-100">
                                        <Clock className="w-3 h-3 mr-1.5 text-amber-600" />
                                        <span className="font-medium">{new Date(post.publishAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                      <div className="flex items-center gap-2">
                                        {manager ? (
                                          <>
                                            <img src={manager.avatar} className="w-6 h-6 rounded-full border border-white shadow-sm" title={manager.name} alt={manager.name} />
                                            <span className="text-xs text-slate-600 font-medium">{manager.name.split(' ')[0]}</span>
                                          </>
                                        ) : (
                                          <>
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                              <UserIcon className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-xs text-slate-400">Unassigned</span>
                                          </>
                                        )}
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPostId(post.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 hover:bg-indigo-50 p-1 rounded"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Calendar View</h3>
                        <div className="flex gap-2 items-center">
                            <button className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
                            <span className="font-bold text-slate-700">May 2024</span>
                            <button className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-5 h-5 text-slate-500"/></button>
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-slate-200 overflow-hidden">
                        {/* Days Header */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                        ))}
                        
                        {/* Calendar Cells (Mocked for May 2024 - Starts on Wed) */}
                        {Array.from({ length: 35 }).map((_, i) => {
                            const day = i - 2; // Start from negative to offset (mock)
                            const date = day > 0 && day <= 31 ? day : null;
                            const postsForDay = date ? filteredPosts.filter(p => p.publishAt && new Date(p.publishAt).getDate() === date) : [];
                            
                            return (
                                <div key={i} className={`bg-white p-2 min-h-[80px] ${!date ? 'bg-slate-50' : ''}`}>
                                    {date && (
                                        <>
                                            <span className={`text-xs font-bold ${postsForDay.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{date}</span>
                                            <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                                {postsForDay.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => setSelectedPostId(p.id)}
                                                        className={`text-[10px] p-1 rounded truncate cursor-pointer border ${
                                                            p.status === 'published' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
                                                            p.status === 'scheduled' ? 'bg-purple-50 text-purple-800 border-purple-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}
                                                        title={p.title}
                                                    >
                                                        {p.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- RIGHT PANEL: DETAIL VIEW --- */}
      {selectedPost && (
          <div className="w-1/3 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto shadow-xl z-10 animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-200 flex justify-between items-start">
                  <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-bold uppercase">{clients.find(c => c.id === selectedPost.clientId)?.name || 'Unknown Client'}</span>
                          <span>/</span>
                          <span>{projects.find(p => p.id === selectedPost.projectId)?.name || 'Unknown Project'}</span>
                      </div>
                      <input 
                          type="text" 
                          value={selectedPost.title || ''} 
                          onChange={e => onUpdatePost({ ...selectedPost, title: e.target.value })}
                          className="text-xl font-bold text-slate-900 border-none focus:ring-0 p-0 w-full bg-transparent placeholder:text-slate-300 focus:outline-none disabled:text-slate-500"
                          placeholder="Enter Post Title"
                          disabled={!checkPermission('social_posts.manage')}
                      />
                  </div>
                  <button onClick={() => setSelectedPostId(null)} className="text-slate-400 hover:text-slate-600">
                      <span className="sr-only">Close</span>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>

              <div className="p-6 space-y-6 flex-1">
                  {/* Debug Permission Indicator */}
                  {!checkPermission('social_posts.manage') && (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
                          <p className="text-xs text-rose-700 font-medium">
                              ⚠️ You don't have permission to manage social posts. Contact your administrator.
                          </p>
                      </div>
                  )}

                  {/* Original Task Preview */}
                  {(() => {
                      const originalTask = tasks.find(t => t.id === selectedPost.sourceTaskId);
                      if (!originalTask) return null;
                      
                      const taskProject = projects.find(p => p.id === originalTask.projectId);
                      const assignees = users.filter(u => originalTask.assigneeIds.includes(u.id));
                      const taskFiles = files.filter(f => f.taskId === originalTask.id);
                      const taskComments = comments.filter(c => c.taskId === originalTask.id);
                      
                      return (
                          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4">
                              <div className="flex items-start gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                                      <MessageSquare className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-bold text-indigo-600 uppercase">Original Task</span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                              originalTask.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                                              originalTask.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                              originalTask.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                              'bg-slate-100 text-slate-600'
                                          }`}>
                                              {originalTask.priority}
                                          </span>
                                      </div>
                                      <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                                          {originalTask.title}
                                      </h4>
                                      {taskProject && (
                                          <p className="text-xs text-slate-600 mb-2">
                                              📁 {taskProject.name}
                                          </p>
                                      )}
                                  </div>
                              </div>
                              
                              {originalTask.description && (
                                  <div className="bg-white rounded-lg p-3 mb-3 border border-indigo-100">
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Task Description</label>
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                          {originalTask.description}
                                      </p>
                                  </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                  {originalTask.dueDate && (
                                      <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                                              <Clock className="w-3 h-3" />
                                              <span className="font-medium">Due Date</span>
                                          </div>
                                          <p className="text-sm font-bold text-slate-900">
                                              {new Date(originalTask.dueDate).toLocaleDateString(undefined, { 
                                                  month: 'short', 
                                                  day: 'numeric',
                                                  year: 'numeric'
                                              })}
                                          </p>
                                      </div>
                                  )}
                                  
                                  {assignees.length > 0 && (
                                      <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                                              <UserIcon className="w-3 h-3" />
                                              <span className="font-medium">Assigned To</span>
                                          </div>
                                          <div className="flex -space-x-2">
                                              {assignees.slice(0, 3).map(u => (
                                                  <img 
                                                      key={u.id} 
                                                      src={u.avatar} 
                                                      alt={u.name}
                                                      title={u.name}
                                                      className="w-6 h-6 rounded-full border-2 border-white"
                                                  />
                                              ))}
                                              {assignees.length > 3 && (
                                                  <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                                                      <span className="text-[10px] font-bold text-indigo-700">+{assignees.length - 3}</span>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  )}
                              </div>

                              {/* Task Files */}
                              {taskFiles.length > 0 && (
                                  <div className="bg-white rounded-lg p-3 mb-3 border border-indigo-100">
                                      <div className="flex items-center gap-1 text-xs text-slate-500 uppercase font-bold mb-2">
                                          <Paperclip className="w-3 h-3" />
                                          <span>Attached Files ({taskFiles.length})</span>
                                      </div>
                                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                          {taskFiles.map(file => (
                                              <a 
                                                  key={file.id}
                                                  href={file.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 p-2 rounded hover:bg-indigo-50 transition-colors group"
                                              >
                                                  <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                                                      {file.type.includes('image') ? (
                                                          <ImageIcon className="w-4 h-4 text-white" />
                                                      ) : file.type.includes('video') ? (
                                                          <Video className="w-4 h-4 text-white" />
                                                      ) : (
                                                          <FileText className="w-4 h-4 text-white" />
                                                      )}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600">
                                                          {file.name}
                                                      </p>
                                                      <p className="text-xs text-slate-500">
                                                          {(file.size / 1024).toFixed(0)} KB
                                                      </p>
                                                  </div>
                                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                                              </a>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* Task Comments & Notes */}
                              {taskComments.length > 0 && (
                                  <div className="bg-white rounded-lg p-3 mb-3 border border-indigo-100">
                                      <div className="flex items-center gap-1 text-xs text-slate-500 uppercase font-bold mb-2">
                                          <MessageSquare className="w-3 h-3" />
                                          <span>Comments & Notes ({taskComments.length})</span>
                                      </div>
                                      <div className="space-y-2 max-h-40 overflow-y-auto">
                                          {taskComments.map(comment => {
                                              const commenter = users.find(u => u.id === comment.userId);
                                              return (
                                                  <div key={comment.id} className="flex gap-2 p-2 rounded bg-slate-50">
                                                      <img 
                                                          src={commenter?.avatar || '/default-avatar.png'} 
                                                          alt={commenter?.name || 'User'}
                                                          className="w-6 h-6 rounded-full shrink-0"
                                                      />
                                                      <div className="flex-1 min-w-0">
                                                          <div className="flex items-baseline gap-2 mb-1">
                                                              <span className="text-xs font-bold text-slate-900">
                                                                  {commenter?.name || 'Unknown'}
                                                              </span>
                                                              <span className="text-[10px] text-slate-500">
                                                                  {new Date(comment.createdAt).toLocaleDateString()}
                                                              </span>
                                                          </div>
                                                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                              {comment.message}
                                                          </p>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                              
                              {selectedPost.notesFromTask && (
                                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                      <div className="flex items-center gap-1 text-xs text-amber-800 font-bold uppercase mb-1">
                                          <MessageSquare className="w-3 h-3" />
                                          <span>Special Instructions</span>
                                      </div>
                                      <p className="text-sm text-amber-900 font-medium">
                                          {selectedPost.notesFromTask}
                                      </p>
                                  </div>
                              )}
                          </div>
                      );
                  })()}

                  {/* Status & Actions */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Status</label>
                      <div className="flex items-center justify-between mb-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${
                              selectedPost.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                              selectedPost.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-200 text-slate-700'
                          }`}>
                              {selectedPost.status}
                          </span>
                      </div>
                      
                      <div className="space-y-2">
                          {selectedPost.status === 'pending' && (
                              <button 
                                  disabled={!checkPermission('social_posts.manage')} 
                                  onClick={() => handleStatusChange(selectedPost, 'writing')} 
                                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  Start Writing
                              </button>
                          )}
                          {selectedPost.status === 'writing' && (
                              <button 
                                  disabled={!checkPermission('social_posts.manage')} 
                                  onClick={() => handleStatusChange(selectedPost, 'review')} 
                                  className="w-full bg-amber-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  Send for Review
                              </button>
                          )}
                          {selectedPost.status === 'review' && (
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                    disabled={!checkPermission('social_posts.manage')} 
                                    onClick={() => handleStatusChange(selectedPost, 'writing')} 
                                    className="bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Needs Changes
                                </button>
                                <button 
                                    disabled={!checkPermission('social_posts.manage')} 
                                    onClick={() => handleStatusChange(selectedPost, 'scheduled')} 
                                    className="bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Approve & Schedule
                                </button>
                              </div>
                          )}
                          {selectedPost.status === 'scheduled' && (
                              <button 
                                  disabled={!checkPermission('social_posts.manage')} 
                                  onClick={() => handleStatusChange(selectedPost, 'published')} 
                                  className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  Mark as Published
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Notes from Task */}
                  {selectedPost.notesFromTask && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                          <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Notes from Task</label>
                          <p className="text-sm text-amber-900">{selectedPost.notesFromTask}</p>
                      </div>
                  )}

                  {/* Platforms */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Platforms</label>
                      <div className="flex flex-wrap gap-2">
                          {['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'twitter'].map((p) => (
                              <button 
                                  key={p}
                                  disabled={!checkPermission('social_posts.manage')}
                                  onClick={() => {
                                      const newPlatforms = selectedPost.platforms.includes(p as SocialPlatform)
                                          ? selectedPost.platforms.filter(pl => pl !== p)
                                          : [...selectedPost.platforms, p as SocialPlatform];
                                      onUpdatePost({ ...selectedPost, platforms: newPlatforms });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-colors ${
                                      selectedPost.platforms.includes(p as SocialPlatform)
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                  } ${!checkPermission('social_posts.manage') ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  {getPlatformIcon(p as SocialPlatform)}
                                  <span className="capitalize">{p}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Caption */}
                  <div>
                      <textarea 
                          className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[150px] disabled:bg-slate-50 disabled:text-slate-500"
                          placeholder="Write your caption here..."
                          value={selectedPost.caption || ''}
                          onChange={e => onUpdatePost({ ...selectedPost, caption: e.target.value })}
                          disabled={!checkPermission('social_posts.manage')}
                      />
                  </div>

                  {/* Scheduling */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Publish Date & Time</label>
                      <input 
                          type="datetime-local"
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-500"
                          value={selectedPost.publishAt ? new Date(selectedPost.publishAt).toISOString().slice(0, 16) : ''}
                          onChange={e => onUpdatePost({ ...selectedPost, publishAt: new Date(e.target.value).toISOString() })}
                          disabled={!checkPermission('social_posts.manage')}
                      />
                  </div>

                  {/* Owner */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assigned To</label>
                      <select 
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-500"
                          value={selectedPost.socialManagerId || ''}
                          onChange={e => onUpdatePost({ ...selectedPost, socialManagerId: e.target.value || null })}
                          disabled={!checkPermission('social_posts.manage')}
                      >
                          <option value="">Unassigned (Queue)</option>
                          {users.filter(u => u.role === 'Social Manager' || u.department === 'Marketing').map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                      </select>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PostingHub;
