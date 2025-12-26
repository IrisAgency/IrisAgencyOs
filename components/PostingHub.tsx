import React, { useState } from 'react';
import { SocialPost, Project, Client, User, SocialPlatform, Task, AgencyFile, TaskComment } from '../types';
import {
  Search, Filter, Calendar, Clock, CheckCircle,
  MessageSquare, MoreVertical, Plus, Share2,
  Layout, List, Edit2, Send, User as UserIcon, ChevronLeft, ChevronRight,
  Instagram, Facebook, Linkedin, Youtube, Twitter, Globe, Video,
  Paperclip, FileText, Image as ImageIcon, ExternalLink, ShieldAlert, RotateCcw
} from 'lucide-react';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageControls from './layout/PageControls';
import PageContent from './layout/PageContent';
import Drawer from './common/Drawer';
import Modal from './common/Modal';
import { archiveSocialPost } from '../utils/socialArchiveUtils';

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

  // Revision State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState('');

  const selectedPost = socialPosts.find(p => p.id === selectedPostId);

  // Helper to handle legacy/lowercase statuses
  const getNormalizedStatus = (status: string): SocialPost['status'] => {
    if (!status) return 'PENDING';
    const s = status.toUpperCase();
    if (s === 'WRITING' || s === 'REVIEW') return 'PENDING'; // Map old micro-states to Pending
    if (['PENDING', 'READY', 'SCHEDULED', 'PUBLISHED', 'REVISION_REQUESTED'].includes(s)) return s as SocialPost['status'];
    return 'PENDING';
  };

  // Auto-archive check
  React.useEffect(() => {
    const checkAutoArchive = async () => {
      if (!socialPosts || socialPosts.length === 0) return;

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      const postsToArchive = socialPosts.filter(post => {
        // Check if PUBLISHED, not already archived, and has publishAt
        if (getNormalizedStatus(post.status) !== 'PUBLISHED' || post.isArchived) return false;
        if (!post.publishAt) return false;
        
        const publishTime = new Date(post.publishAt).getTime();
        return (now - publishTime) > twentyFourHours;
      });

      if (postsToArchive.length > 0) {
        console.log(`Found ${postsToArchive.length} posts to auto-archive`);
        for (const post of postsToArchive) {
          try {
            await archiveSocialPost(post, currentUser.id);
            onNotify('success', 'Post Archived', `Post "${post.title}" has been auto-archived to Client Folder.`);
          } catch (err) {
            console.error(`Failed to auto-archive post ${post.id}`, err);
          }
        }
      }
    };

    checkAutoArchive();
  }, [socialPosts, currentUser.id]);

  // Debug permissions
  const canManage = checkPermission('posting.edit');
  const canView = checkPermission('posting.view.dept');
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
    { id: 'PENDING', label: 'Pending', color: 'bg-slate-100 border-slate-200' },
    { id: 'REVISION_REQUESTED', label: 'Revisions', color: 'bg-rose-50 border-rose-200' },
    { id: 'READY', label: 'Ready', color: 'bg-blue-50 border-blue-200' },
    { id: 'SCHEDULED', label: 'Scheduled', color: 'bg-purple-50 border-purple-200' },
    { id: 'PUBLISHED', label: 'Published', color: 'bg-emerald-50 border-emerald-200' }
  ];

  const getPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
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
    console.log('handleStatusChange called', { postId: post.id, currentStatus: post.status, newStatus, canManage });
    
    // Permission check
    if (!canManage) {
      onNotify('error', 'Permission Denied', 'You do not have permission to manage posts.');
      return;
    }

    // Validation Rules
    if (newStatus === 'READY' && !post.caption) {
      onNotify('error', 'Missing Caption', 'Please add a caption before marking as Ready.');
      return;
    }
    if (newStatus === 'SCHEDULED' && !post.publishAt) {
      onNotify('error', 'Missing Date', 'Please set a publish date before scheduling.');
      return;
    }

    const updatedPost = { ...post, status: newStatus, updatedAt: new Date().toISOString() };
    onUpdatePost(updatedPost);

    // Trigger Archive if moved to Published (and linked task exists)
    if (newStatus === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      const originalTask = tasks.find(t => t.id === post.sourceTaskId);
      if (originalTask) {
        onArchiveTask(originalTask);
        onNotify('system', 'Task Archived', `Original task "${originalTask.title}" has been archived.`);
      }
    }
  };

  const handleRequestRevision = () => {
    if (!selectedPost || !revisionMessage.trim()) return;

    const currentCycle = (selectedPost.revisionHistory?.length || 0) + 1;
    
    const newRevisionContext = {
      active: true,
      requestedByUserId: currentUser.id,
      assignedToUserId: selectedPost.socialManagerId || '',
      requestedAt: new Date().toISOString(),
      message: revisionMessage,
      cycle: currentCycle
    };

    const newHistory = [
      ...(selectedPost.revisionHistory || []),
      {
        cycle: currentCycle,
        requestedBy: currentUser.id,
        assignedTo: selectedPost.socialManagerId || '',
        comment: revisionMessage,
        date: new Date().toISOString()
      }
    ];

    const updatedPost: SocialPost = {
      ...selectedPost,
      status: 'REVISION_REQUESTED',
      revisionContext: newRevisionContext,
      revisionHistory: newHistory,
      updatedAt: new Date().toISOString()
    };

    onUpdatePost(updatedPost);
    onNotify('success', 'Revisions Requested', 'Post has been sent back for revisions.');
    setShowRevisionModal(false);
    setRevisionMessage('');
  };

  const handleSubmitRevision = () => {
    if (!selectedPost || !selectedPost.revisionContext?.active) return;

    const updatedHistory = (selectedPost.revisionHistory || []).map(h => {
      if (h.cycle === selectedPost.revisionContext?.cycle) {
        return { ...h, resolvedAt: new Date().toISOString() };
      }
      return h;
    });

    const updatedPost: SocialPost = {
      ...selectedPost,
      status: 'READY', // Or PENDING, depending on workflow. READY implies it's ready for review again.
      revisionContext: { ...selectedPost.revisionContext, active: false } as any,
      revisionHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    onUpdatePost(updatedPost);
    onNotify('success', 'Revisions Submitted', 'Post revisions have been submitted for review.');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Posting & Captions"
        subtitle="Manage social media content pipeline"
        actions={
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
        }
      />

      <PageControls>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts by title, client, or caption..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shrink-0 ${showFilters
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
        </div>

        {/* Status Counts - Wrap on mobile */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <span className="text-slate-600 text-xs sm:text-sm">{filteredPosts.filter(p => p.status === 'PENDING').length} Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600 text-xs sm:text-sm">{filteredPosts.filter(p => p.status === 'READY').length} Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-slate-600 text-xs sm:text-sm">{filteredPosts.filter(p => p.status === 'SCHEDULED').length} Scheduled</span>
          </div>
        </div>
      </PageControls>

      {/* Filter Panel */}
      {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-in slide-in-from-top duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
                    <option value="PENDING">Pending</option>
                    <option value="READY">Ready</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="PUBLISHED">Published</option>
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

      <PageContent>
        {/* Board/Calendar View */}
        {viewMode === 'kanban' ? (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Desktop/Tablet: Kanban Board with Horizontal Scroll */}
            <div className="hidden md:block h-full overflow-x-auto overflow-y-hidden p-4">
              <div className="flex gap-4 h-full min-w-max">
                {columns.map(col => {
                  const colPosts = filteredPosts.filter(p => getNormalizedStatus(p.status) === col.id);
                  const isEmpty = colPosts.length === 0;

                  return (
                    <div key={col.id} className="flex flex-col bg-white rounded-xl border-2 border-slate-200 overflow-hidden w-80 shrink-0">
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
                                className={`group bg-white p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all ${selectedPostId === post.id
                                    ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200'
                                    : 'border-slate-200 hover:border-indigo-300'
                                  }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-slate-100 rounded truncate max-w-[150px]">
                                    {client?.name || 'Unknown'}
                                  </span>
                                  {post.platforms && post.platforms.length > 0 && (
                                    <div className="flex gap-1 flex-wrap justify-end">
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
                                    <Clock className="w-3 h-3 mr-1.5 text-amber-600 shrink-0" />
                                    <span className="font-medium truncate">{new Date(post.publishAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {manager ? (
                                      <>
                                        <img src={manager.avatar} className="w-6 h-6 rounded-full border border-white shadow-sm shrink-0" title={manager.name} alt={manager.name} />
                                        <span className="text-xs text-slate-600 font-medium truncate">{manager.name.split(' ')[0]}</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                          <UserIcon className="w-3 h-3 text-slate-400" />
                                        </div>
                                        <span className="text-xs text-slate-400">Unassigned</span>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Contextual Action Button */}
                                  {canManage && (
                                    <div onClick={e => e.stopPropagation()}>
                                      {getNormalizedStatus(post.status) === 'PENDING' && (
                                        <button
                                          onClick={() => handleStatusChange(post, 'READY')}
                                          className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                        >
                                          Mark Ready
                                        </button>
                                      )}
                                      {getNormalizedStatus(post.status) === 'READY' && (
                                        <button
                                          onClick={() => handleStatusChange(post, 'SCHEDULED')}
                                          className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                                        >
                                          Schedule
                                        </button>
                                      )}
                                      {getNormalizedStatus(post.status) === 'SCHEDULED' && (
                                        <button
                                          onClick={() => handleStatusChange(post, 'PUBLISHED')}
                                          className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                                        >
                                          Publish
                                        </button>
                                      )}
                                    </div>
                                  )}
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

            {/* Mobile: Tabbed Status View */}
            <div className="md:hidden h-full flex flex-col overflow-hidden">
              {/* Status Tabs */}
              <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 gap-2">
                {columns.map(col => {
                  const colPosts = filteredPosts.filter(p => getNormalizedStatus(p.status) === col.id);
                  return (
                    <button
                      key={col.id}
                      onClick={() => setFilterStatus(filterStatus === col.id ? 'all' : col.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                        filterStatus === col.id || filterStatus === 'all'
                          ? `${col.color} ${col.color.replace('bg-', 'text-').replace('50', '700')} border-2 ${col.color.replace('bg-', 'border-').replace('50', '300')}`
                          : 'bg-slate-100 text-slate-500 border-2 border-transparent'
                      }`}
                    >
                      {col.label} ({colPosts.length})
                    </button>
                  );
                })}
              </div>

              {/* Mobile Cards List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No posts found</p>
                  </div>
                ) : (
                  filteredPosts.map(post => {
                    const client = clients.find(c => c.id === post.clientId);
                    const manager = users.find(u => u.id === post.socialManagerId);
                    const normalizedStatus = getNormalizedStatus(post.status);
                    const statusColor = columns.find(c => c.id === normalizedStatus)?.color || 'bg-slate-100';

                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPostId(post.id)}
                        className="bg-white p-4 rounded-xl border-2 border-slate-200 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-slate-100 rounded">
                              {client?.name || 'Unknown'}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusColor} ${statusColor.replace('bg-', 'text-').replace('50', '700')}`}>
                              {post.status}
                            </span>
                          </div>
                          {post.platforms && post.platforms.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {post.platforms.slice(0, 3).map(p => (
                                <div key={p} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center border border-slate-200 text-indigo-600">
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

                        <h3 className="text-base font-bold text-slate-900 mb-2">
                          {post.title || <span className="italic text-slate-400 font-normal">Untitled Post</span>}
                        </h3>

                        {post.caption && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
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
                          
                          {/* Contextual Action Button */}
                          {canManage && (
                            <div onClick={e => e.stopPropagation()}>
                              {getNormalizedStatus(post.status) === 'PENDING' && (
                                <button
                                  onClick={() => handleStatusChange(post, 'READY')}
                                  className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                >
                                  Mark Ready
                                </button>
                              )}
                              {getNormalizedStatus(post.status) === 'READY' && (
                                <button
                                  onClick={() => handleStatusChange(post, 'SCHEDULED')}
                                  className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                                >
                                  Schedule
                                </button>
                              )}
                              {getNormalizedStatus(post.status) === 'SCHEDULED' && (
                                <button
                                  onClick={() => handleStatusChange(post, 'PUBLISHED')}
                                  className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                                >
                                  Publish
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Calendar View</h3>
              <div className="flex gap-2 items-center">
                <button className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
                <span className="font-bold text-slate-700">May 2024</span>
                <button className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
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
                              className={`text-[10px] p-1 rounded truncate cursor-pointer border ${getNormalizedStatus(p.status) === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                getNormalizedStatus(p.status) === 'SCHEDULED' ? 'bg-purple-50 text-purple-800 border-purple-100' :
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
      </PageContent>

      {/* Post Details Drawer */}
      <Drawer
        isOpen={!!selectedPost}
        onClose={() => setSelectedPostId(null)}
        side="right"
        size="lg"
        title={
          selectedPost && (
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-bold uppercase">{clients.find(c => c.id === selectedPost.clientId)?.name || 'Unknown Client'}</span>
                <span>/</span>
                <span>{projects.find(p => p.id === selectedPost.projectId)?.name || 'Unknown Project'}</span>
              </div>
              <div className="text-lg font-bold text-slate-900">
                {selectedPost.title || 'Untitled Post'}
              </div>
            </div>
          )
        }
      >
        {selectedPost && (
          <div className="p-4 md:p-6 space-y-6">
            {/* Permission Badge - Professional */}
            {!canManage && canView && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-medium text-amber-800">
                  Read-only access – Contact admin for edit permissions
                </span>
              </div>
            )}

            {/* Revision Banner */}
            {selectedPost.status === 'REVISION_REQUESTED' && selectedPost.revisionContext?.active && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-rose-900 mb-1">Revisions Requested</h4>
                    <p className="text-sm text-rose-800 mb-2">{selectedPost.revisionContext.message}</p>
                    <div className="flex items-center gap-2 text-xs text-rose-600">
                      <span className="font-medium">Requested by {users.find(u => u.id === selectedPost.revisionContext?.requestedByUserId)?.name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(selectedPost.revisionContext.requestedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Submit Revision Button (for assignee) */}
                  {(currentUser.id === selectedPost.socialManagerId || canManage) && (
                    <button
                      onClick={handleSubmitRevision}
                      className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm whitespace-nowrap"
                    >
                      Submit Revisions
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Editable Title (Mobile visible) */}
            <div className="md:hidden">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Post Title</label>
              <input
                type="text"
                value={selectedPost.title || ''}
                onChange={e => onUpdatePost({ ...selectedPost, title: e.target.value })}
                className="w-full text-lg font-bold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Enter Post Title"
                disabled={!canManage}
                title={!canManage ? "You don't have permission to edit" : ""}
              />
            </div>

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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${originalTask.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
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
              <div className="flex items-center gap-3">
                <div className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-between ${
                  getNormalizedStatus(selectedPost.status) === 'PUBLISHED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  getNormalizedStatus(selectedPost.status) === 'SCHEDULED' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                  getNormalizedStatus(selectedPost.status) === 'READY' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  getNormalizedStatus(selectedPost.status) === 'REVISION_REQUESTED' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <span className="font-bold capitalize">{getNormalizedStatus(selectedPost.status).replace('_', ' ')}</span>
                  {getNormalizedStatus(selectedPost.status) === 'PUBLISHED' && <CheckCircle className="w-4 h-4" />}
                  {getNormalizedStatus(selectedPost.status) === 'REVISION_REQUESTED' && <RotateCcw className="w-4 h-4" />}
                </div>
                
                {canManage && getNormalizedStatus(selectedPost.status) !== 'PUBLISHED' && (
                  <div className="flex gap-2">
                    {/* Request Revision Button */}
                    {getNormalizedStatus(selectedPost.status) !== 'REVISION_REQUESTED' && (
                      <button
                        onClick={() => setShowRevisionModal(true)}
                        className="px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-50 transition-colors"
                        title="Request Revisions"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="relative">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleStatusChange(selectedPost, e.target.value as SocialPost['status']);
                        }}
                        className="appearance-none bg-indigo-600 text-white pl-4 pr-8 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        <option value="">Change Status...</option>
                        {getNormalizedStatus(selectedPost.status) === 'PENDING' && <option value="READY">Mark as Ready</option>}
                        {getNormalizedStatus(selectedPost.status) === 'REVISION_REQUESTED' && <option value="READY">Mark as Ready (Override)</option>}
                        {getNormalizedStatus(selectedPost.status) === 'READY' && <option value="SCHEDULED">Schedule Post</option>}
                        {getNormalizedStatus(selectedPost.status) === 'SCHEDULED' && (
                          <>
                            <option value="PUBLISHED">Mark Published</option>
                            <option value="READY">Revert to Ready</option>
                          </>
                        )}
                      </select>
                      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none rotate-90" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Helper Text */}
              <p className="text-xs text-slate-500 mt-2">
                {getNormalizedStatus(selectedPost.status) === 'PENDING' && "Draft your post. Mark as Ready when caption is done."}
                {getNormalizedStatus(selectedPost.status) === 'READY' && "Post is ready. Set a date and Schedule it."}
                {getNormalizedStatus(selectedPost.status) === 'SCHEDULED' && "Post is scheduled. Mark Published when live."}
                {getNormalizedStatus(selectedPost.status) === 'PUBLISHED' && "Post is live. No further changes allowed."}
              </p>
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
                    disabled={!canManage}
                    onClick={() => {
                      const newPlatforms = selectedPost.platforms.includes(p as SocialPlatform)
                        ? selectedPost.platforms.filter(pl => pl !== p)
                        : [...selectedPost.platforms, p as SocialPlatform];
                      onUpdatePost({ ...selectedPost, platforms: newPlatforms });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-colors ${selectedPost.platforms.includes(p as SocialPlatform)
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      } ${!canManage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!canManage ? "You don't have permission to edit" : ""}
                  >
                    {getPlatformIcon(p as SocialPlatform)}
                    <span className="capitalize">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Caption</label>
              <textarea
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[150px] disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Write your caption here..."
                value={selectedPost.caption || ''}
                onChange={e => onUpdatePost({ ...selectedPost, caption: e.target.value })}
                disabled={!canManage}
                title={!canManage ? "You don't have permission to edit" : ""}
              />
            </div>

            {/* Scheduling */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Publish Date & Time</label>
              <input
                type="datetime-local"
                className="w-full p-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={selectedPost.publishAt ? new Date(selectedPost.publishAt).toISOString().slice(0, 16) : ''}
                onChange={e => onUpdatePost({ ...selectedPost, publishAt: new Date(e.target.value).toISOString() })}
                disabled={!canManage}
                title={!canManage ? "You don't have permission to edit" : ""}
              />
            </div>

            {/* Owner */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assigned To</label>
              <select
                className="w-full p-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={selectedPost.socialManagerId || ''}
                onChange={e => onUpdatePost({ ...selectedPost, socialManagerId: e.target.value || null })}
                disabled={!canManage}
                title={!canManage ? "You don't have permission to edit" : ""}
              >
                <option value="">Unassigned (Queue)</option>
                {users.filter(u => u.role === 'Social Manager' || u.department === 'Marketing').map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Drawer>

      {/* Revision Modal */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="Request Revisions"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please describe what changes are needed. The post status will be changed to "Revisions Requested".
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Revision Instructions</label>
            <textarea
              className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px]"
              placeholder="e.g. Please shorten the caption and add more hashtags..."
              value={revisionMessage}
              onChange={e => setRevisionMessage(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowRevisionModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestRevision}
              disabled={!revisionMessage.trim()}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Request Revisions
            </button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default PostingHub;
