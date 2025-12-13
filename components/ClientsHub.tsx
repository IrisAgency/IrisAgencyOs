import React, { useState, useMemo, useRef } from 'react';
import { Client, ClientContact, Project, Invoice, User, Task, ProjectMilestone, ClientSocialLink, SocialPlatform, ClientNote, ClientMeeting, FileFolder, ClientBrandAsset, AgencyFile } from '../types';
import { Plus, Search, MapPin, Globe, Phone, Mail, FileText, ArrowLeft, MoreHorizontal, Building2, User as UserIcon, Archive, Edit2, Folder, DollarSign, Trash2, RotateCcw, BarChart3, Instagram, Facebook, Linkedin, Youtube, Link as LinkIcon, Video, StickyNote, Palette, Upload, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import ClientMarketingStrategies from './ClientMarketingStrategies';
import ClientMeetings from './ClientMeetings';
import ClientBrandAssets from './ClientBrandAssets';

interface ClientsHubProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  milestones: ProjectMilestone[];
  invoices: Invoice[];
  socialLinks?: ClientSocialLink[];
  notes?: ClientNote[];
  meetings?: ClientMeeting[];
  brandAssets?: ClientBrandAsset[];
  files?: AgencyFile[];
  folders?: FileFolder[];
  users?: User[];
  accountManagers: User[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onArchiveProject?: (projectId: string) => void;
  onUnarchiveProject?: (projectId: string) => void;
  onOpenProject?: (projectId: string) => void;
  onAddSocialLink?: (link: ClientSocialLink) => void;
  onUpdateSocialLink?: (link: ClientSocialLink) => void;
  onDeleteSocialLink?: (linkId: string) => void;
  onAddNote?: (note: ClientNote) => void;
  onUpdateNote?: (note: ClientNote) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddMeeting?: (meeting: ClientMeeting) => void;
  onUpdateMeeting?: (meeting: ClientMeeting) => void;
  onDeleteMeeting?: (meetingId: string) => void;
  onAddBrandAsset?: (asset: ClientBrandAsset) => void;
  onUpdateBrandAsset?: (asset: ClientBrandAsset) => void;
  onDeleteBrandAsset?: (assetId: string) => void;
  onUploadFile?: (file: any) => Promise<void>;
  checkPermission?: (permission: string) => boolean;
  currentUser?: User | null;
}

const ClientsHub: React.FC<ClientsHubProps> = ({ 
  clients = [], 
  projects = [], 
  tasks = [], 
  milestones = [], 
  invoices = [], 
  socialLinks = [], 
  notes = [], 
  meetings = [],
  brandAssets = [],
  files = [],
  folders = [],
  users = [],
  accountManagers = [], 
  onAddClient, 
  onUpdateClient, 
  onDeleteClient, 
  onArchiveProject, 
  onUnarchiveProject, 
  onOpenProject, 
  onAddSocialLink, 
  onUpdateSocialLink, 
  onDeleteSocialLink, 
  onAddNote, 
  onUpdateNote, 
  onDeleteNote, 
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onAddBrandAsset,
  onUpdateBrandAsset,
  onDeleteBrandAsset,
  onUploadFile,
  checkPermission = (p: string) => false, 
  currentUser 
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'meetings' | 'brand' | 'strategies'>('overview');
  const [projectTab, setProjectTab] = useState<'active' | 'archived'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Social Media State
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [editingSocialLink, setEditingSocialLink] = useState<ClientSocialLink | null>(null);
  const [socialForm, setSocialForm] = useState<Partial<ClientSocialLink>>({
    platform: 'instagram', url: '', label: '', username: ''
  });

  // Notes State
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form State (Client)
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State (Contact)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<ClientContact>>({
    name: '', role: '', email: '', phone: '', isPrimary: false
  });

  // --- Handlers ---

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClientForm(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.email) return;

    // Check email uniqueness
    if (clients.some(c => c.email === clientForm.email)) {
      alert("A client with this email already exists.");
      return;
    }

    const newClient: Client = {
      id: `c${Date.now()}`,
      name: clientForm.name!,
      industry: clientForm.industry || '',
      email: clientForm.email!,
      phone: clientForm.phone || '',
      address: clientForm.address || '',
      website: clientForm.website || '',
      notes: clientForm.notes || '',
      logo: clientForm.logo,
      status: (clientForm.status as any) || 'active',
      accountManagerId: clientForm.accountManagerId || accountManagers[0]?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contacts: []
    };

    onAddClient(newClient);
    setIsModalOpen(false);
    setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: '' });
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !clientForm.name || !clientForm.email) return;

    // Check email uniqueness (exclude current client)
    if (clients.some(c => c.email === clientForm.email && c.id !== selectedClient.id)) {
      alert("A client with this email already exists.");
      return;
    }

    const updatedClient: Client = {
      ...selectedClient,
      name: clientForm.name,
      industry: clientForm.industry || '',
      email: clientForm.email,
      phone: clientForm.phone || '',
      address: clientForm.address || '',
      website: clientForm.website || '',
      notes: clientForm.notes || '',
      logo: clientForm.logo,
      status: (clientForm.status as any) || 'active',
      accountManagerId: clientForm.accountManagerId || '',
      updatedAt: new Date().toISOString()
    };

    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);
    setIsModalOpen(false);
    setIsEditing(false);
    setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: '' });
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !contactForm.name) return;

    const newContact: ClientContact = {
      id: `cc${Date.now()}`,
      clientId: selectedClient.id,
      name: contactForm.name!,
      role: contactForm.role || '',
      email: contactForm.email || '',
      phone: contactForm.phone || '',
      isPrimary: contactForm.isPrimary || false
    };

    // If new contact is primary, unmark others
    const updatedContacts = [...selectedClient.contacts];
    if (newContact.isPrimary) {
      updatedContacts.forEach(c => c.isPrimary = false);
    }
    updatedContacts.push(newContact);

    const updatedClient = { ...selectedClient, contacts: updatedContacts, updatedAt: new Date().toISOString() };
    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);
    setIsContactModalOpen(false);
    setContactForm({ name: '', role: '', email: '', phone: '', isPrimary: false });
  };

  const handleSaveSocialLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !socialForm.platform || !socialForm.url) return;
    if (!onAddSocialLink || !onUpdateSocialLink) return;

    // Basic Validation
    if (!socialForm.url.startsWith('http://') && !socialForm.url.startsWith('https://')) {
        alert('URL must start with http:// or https://');
        return;
    }

    // Auto-extract username if empty
    let extractedUsername = socialForm.username;
    if (!extractedUsername && socialForm.url) {
        try {
            const urlObj = new URL(socialForm.url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
                extractedUsername = '@' + pathSegments[pathSegments.length - 1];
            }
        } catch (e) {
            // ignore invalid url for extraction
        }
    }

    if (editingSocialLink) {
        const updated: ClientSocialLink = {
            ...editingSocialLink,
            platform: socialForm.platform as SocialPlatform,
            url: socialForm.url,
            label: socialForm.platform === 'other' ? socialForm.label || 'Link' : null,
            username: extractedUsername || null,
            updatedAt: new Date().toISOString()
        };
        onUpdateSocialLink(updated);
    } else {
        const newLink: ClientSocialLink = {
            id: `csl${Date.now()}`,
            clientId: selectedClient.id,
            platform: socialForm.platform as SocialPlatform,
            url: socialForm.url,
            label: socialForm.platform === 'other' ? socialForm.label || 'Link' : null,
            username: extractedUsername || null,
            createdBy: 'current-user', // In real app, this comes from auth context
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        onAddSocialLink(newLink);
    }

    setIsSocialModalOpen(false);
    setEditingSocialLink(null);
    setSocialForm({ platform: 'instagram', url: '', label: '', username: '' });
  };

  const handleAddNoteHandler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newNoteText.trim() || !onAddNote || !currentUser) return;

    const newNote: ClientNote = {
      id: `cn${Date.now()}`,
      clientId: selectedClient.id,
      text: newNoteText.trim(),
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    onAddNote(newNote);
    setNewNoteText('');
  };

  const handleUpdateNoteHandler = (note: ClientNote) => {
    if (!onUpdateNote || !editingNoteText.trim()) return;
    
    const updatedNote: ClientNote = {
      ...note,
      text: editingNoteText.trim(),
      updatedAt: new Date().toISOString()
    };

    onUpdateNote(updatedNote);
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const handleDeleteNoteHandler = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?') && onDeleteNote) {
      onDeleteNote(noteId);
    }
  };

  const handleDeleteSocialLinkHandler = (linkId: string) => {
      if (confirm('Are you sure you want to delete this link?') && onDeleteSocialLink) {
          onDeleteSocialLink(linkId);
      }
  };

  const getPlatformIcon = (platform: string) => {
      switch (platform) {
          case 'instagram': return <Instagram className="w-4 h-4 text-pink-600" />;
          case 'facebook': return <Facebook className="w-4 h-4 text-blue-600" />;
          case 'linkedin': return <Linkedin className="w-4 h-4 text-blue-700" />;
          case 'tiktok': return <Video className="w-4 h-4 text-black" />; // Lucide doesn't have TikTok, using Video as placeholder or custom svg
          case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
          case 'website': return <Globe className="w-4 h-4 text-slate-600" />;
          default: return <LinkIcon className="w-4 h-4 text-slate-400" />;
      }
  };

  const handleArchiveClient = () => {
    if (selectedClient) {
       // Check for active projects
       const hasActiveProjects = projects.filter(p => 
         (p.clientId === selectedClient.id || p.client === selectedClient.name) && 
         (p.status === 'Active' || p.status === 'active')
       ).length > 0;

       if (hasActiveProjects) {
         alert("Cannot archive a client with active projects. Please close all projects first.");
         return;
       }
       if (confirm(`Are you sure you want to archive ${selectedClient.name}?`)) {
         const updated = { ...selectedClient, status: 'inactive' as const, updatedAt: new Date().toISOString() };
         onUpdateClient(updated);
         setSelectedClient(updated);
       }
    }
  };

  const handleDelete = () => {
    if (selectedClient) {
      if (confirm(`Are you sure you want to DELETE ${selectedClient.name}? This will permanently remove ALL associated data (projects, invoices, etc.) and cannot be undone.`)) {
        onDeleteClient(selectedClient.id);
        setSelectedClient(null);
        setViewMode('list');
      }
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getActiveProjectsCount = (client: Client) => {
    return projects.filter(p => (p.clientId === client.id || p.client === client.name) && (p.status === 'Active' || p.status === 'active')).length;
  };

  const renderClientModal = () => {
    if (!isModalOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Client' : 'Create New Client'}</h2>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); }} className="text-slate-400 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
            <form onSubmit={isEditing ? handleUpdateClient : handleCreateClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Logo Upload */}
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-slate-200 group-hover:border-indigo-500 transition-colors">
                    {clientForm.logo ? (
                      <img src={clientForm.logo} alt="Logo preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-400" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white font-medium">Change</span>
                  </div>
                  {clientForm.logo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientForm(prev => ({ ...prev, logo: '' }));
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                    <input value={clientForm.industry} onChange={e => setClientForm({...clientForm, industry: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                      <option value="active">Active</option>
                      <option value="lead">Lead</option>
                      <option value="inactive">Inactive</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                   <input required value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                   <input value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input value={clientForm.website} onChange={e => setClientForm({...clientForm, website: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="https://" />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Account Manager *</label>
                 <select value={clientForm.accountManagerId} onChange={e => setClientForm({...clientForm, accountManagerId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                   <option value="">Select Manager...</option>
                   {accountManagers.map(am => (
                     <option key={am.id} value={am.id}>{am.name}</option>
                   ))}
                 </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                  {isEditing ? 'Save Changes' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
    );
  };

  // --- Derived State (Moved for Hook Safety) ---
  const clientProjects = useMemo(() => selectedClient ? projects.filter(p => p.clientId === selectedClient.id || p.client === selectedClient.name) : [], [selectedClient, projects]);
  const clientInvoices = useMemo(() => selectedClient ? invoices.filter(i => i.clientId === selectedClient.id || i.client === selectedClient.name) : [], [selectedClient, invoices]);
  const activeProjects = useMemo(() => clientProjects.filter(p => p.status === 'Active' || p.status === 'active'), [clientProjects]);
  const completedProjects = useMemo(() => clientProjects.filter(p => p.status === 'Completed' || p.status === 'completed'), [clientProjects]);
  const am = useMemo(() => selectedClient ? accountManagers.find(u => u.id === selectedClient.accountManagerId) : undefined, [selectedClient, accountManagers]);
  const clientSocialLinks = useMemo(() => selectedClient ? socialLinks.filter(l => l.clientId === selectedClient.id) : [], [selectedClient, socialLinks]);
  const clientNotes = useMemo(() => selectedClient ? notes.filter(n => n.clientId === selectedClient.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [], [selectedClient, notes]);
  const clientMeetings = useMemo(() => selectedClient ? meetings.filter(m => m.clientId === selectedClient.id) : [], [selectedClient, meetings]);

  // Analytics Logic
  const currentMonthMilestones = useMemo(() => {
    if (!selectedClient) return [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter milestones for this client (via projects) and current month
    const clientProjectIds = clientProjects.map(p => p.id);

    const relevantMilestones = milestones.filter(m => {
        if (!clientProjectIds.includes(m.projectId)) return false;
        if (!m.dueDate) return false;
        const d = new Date(m.dueDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return relevantMilestones.map(m => {
        const milestoneTasks = tasks.filter(t => t.milestoneId === m.id && !t.isDeleted);
        const completed = milestoneTasks.filter(t => ['completed', 'approved', 'client_approved'].includes(t.status)).length;
        const total = milestoneTasks.length;
        const remaining = total - completed;
        
        return {
            name: m.name,
            completed,
            remaining,
            total
        };
    });
  }, [selectedClient, clientProjects, milestones, tasks]);

  const totalMonthTasks = currentMonthMilestones.reduce((acc, m) => acc + m.total, 0);
  const totalMonthCompleted = currentMonthMilestones.reduce((acc, m) => acc + m.completed, 0);
  const totalMonthRemaining = currentMonthMilestones.reduce((acc, m) => acc + m.remaining, 0);

  // --- Render Views ---

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-slate-500 mt-1">Manage relationships and company profiles.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Client</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients by name or industry..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="lead">Lead</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Account Manager</th>
                <th className="px-6 py-4">Active Projects</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => {
                const am = accountManagers.find(u => u.id === client.accountManagerId);
                return (
                  <tr 
                    key={client.id} 
                    onClick={() => { setSelectedClient(client); setViewMode('detail'); }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-indigo-100 flex-shrink-0">
                          {client.logo ? (
                            <img src={client.logo} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{client.name}</div>
                          <div className="text-xs text-slate-500">{client.address.split(',')[0]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{client.industry}</td>
                    <td className="px-6 py-4">
                      {am ? (
                        <div className="flex items-center space-x-2">
                           <img src={am.avatar} alt={am.name} className="w-6 h-6 rounded-full" />
                           <span className="text-slate-600">{am.name}</span>
                        </div>
                      ) : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {getActiveProjectsCount(client)} Projects
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        client.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 
                        client.status === 'inactive' ? 'bg-slate-100 text-slate-600' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No clients found matching your search.
            </div>
          )}
        </div>

        {/* Create Client Modal */}
        {renderClientModal()}
      </div>
    );
  }

  // --- Detail View ---
  
  if (!selectedClient) return null;



  return (
    <div className="space-y-6">
      {/* Detail Header */}
      <div className="flex flex-col space-y-4">
        <button onClick={() => setViewMode('list')} className="text-slate-500 hover:text-indigo-600 flex items-center space-x-2 w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients</span>
        </button>
        
        <div className="flex justify-between items-start bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-start space-x-4">
             <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-indigo-100">
                {selectedClient.logo ? (
                  <img src={selectedClient.logo} alt={selectedClient.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Building2 className="w-8 h-8 text-indigo-600" />
                )}
             </div>
             <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  {selectedClient.name}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${
                     selectedClient.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                     selectedClient.status === 'inactive' ? 'bg-slate-50 text-slate-600 border-slate-100' :
                     'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {selectedClient.status}
                  </span>
                </h1>
                <p className="text-slate-500 mt-1">{selectedClient.industry} • {selectedClient.address}</p>
                <div className="flex items-center space-x-4 mt-3 text-sm text-slate-600">
                  {selectedClient.website && (
                    <a href={`https://${selectedClient.website}`} target="_blank" rel="noreferrer" className="flex items-center space-x-1 hover:text-indigo-600 hover:underline">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{selectedClient.website}</span>
                    </a>
                  )}
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{selectedClient.email}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedClient.phone}</span>
                  </span>
                </div>
             </div>
          </div>
          <div className="flex space-x-2">
             <button 
               onClick={() => {
                 setClientForm({
                   name: selectedClient.name,
                   industry: selectedClient.industry,
                   email: selectedClient.email,
                   phone: selectedClient.phone,
                   address: selectedClient.address,
                   website: selectedClient.website,
                   notes: selectedClient.notes,
                   status: selectedClient.status,
                   accountManagerId: selectedClient.accountManagerId
                 });
                 setIsEditing(true);
                 setIsModalOpen(true);
               }}
               className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
             >
               <Edit2 className="w-4 h-4" />
               <span>Edit</span>
             </button>
             <button 
                onClick={handleArchiveClient}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-sm font-medium transition-colors"
                title="Archive Client"
             >
               <Archive className="w-4 h-4" />
             </button>
             <button 
                onClick={handleDelete}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-sm font-medium transition-colors"
                title="Delete Client"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'meetings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Meetings
          </button>
          {checkPermission('clients.brand_view') && (
            <button
              onClick={() => setActiveTab('brand')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'brand'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span>Brand Assets</span>
              {selectedClient && brandAssets.filter(a => a.clientId === selectedClient.id).length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'brand' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {brandAssets.filter(a => a.clientId === selectedClient.id).length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('strategies')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'strategies'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Strategies
          </button>
        </nav>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Content Tabs */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Overview / Stats */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-semibold">Active Projects</p>
                   <p className="text-2xl font-bold text-slate-900 mt-1">{activeProjects.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <p className="text-xs text-slate-500 uppercase font-semibold">Completed</p>
                   <p className="text-2xl font-bold text-slate-900 mt-1">{completedProjects.length}</p>
                </div>
              </div>
            )}

            {/* Monthly Milestones Analytics */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-slate-400"/> 
                      This Month’s Milestones – Task Progress
                    </h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                 </div>
                 
                 <div className="p-6">
                   {currentMonthMilestones.length > 0 ? (
                     <>
                       <div className="h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart
                             layout="vertical"
                             data={currentMonthMilestones}
                             margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                           >
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                             <XAxis type="number" />
                             <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                             <Tooltip />
                             <Legend />
                             <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                             <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                       <div className="mt-4 flex justify-center gap-6 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                              <span>Total: <span className="font-bold text-slate-900">{totalMonthTasks}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                              <span>Completed: <span className="font-bold text-emerald-600">{totalMonthCompleted}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                              <span>Remaining: <span className="font-bold text-slate-600">{totalMonthRemaining}</span></span>
                          </div>
                       </div>
                     </>
                   ) : (
                     <div className="text-center py-8 text-slate-400">
                       <p>No milestones scheduled for this month.</p>
                     </div>
                   )}
                 </div>
              </div>
            )}

            {/* Projects Section */}
            {activeTab === 'projects' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2"><Folder className="w-4 h-4 text-slate-400"/> Projects</h3>
                      <div className="flex bg-slate-100 rounded-lg p-1">
                          <button 
                            onClick={() => setProjectTab('active')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${projectTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Active
                          </button>
                          <button 
                            onClick={() => setProjectTab('archived')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${projectTab === 'archived' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Archived
                          </button>
                      </div>
                    </div>
                 </div>
                 
                 {(() => {
                   const filteredProjects = clientProjects.filter(p => 
                      projectTab === 'active' ? !p.isArchived : p.isArchived
                   );

                   if (filteredProjects.length > 0) {
                     return (
                       <div className="divide-y divide-slate-100">
                          {filteredProjects.map(project => (
                            <div 
                              key={project.id} 
                              className="p-4 flex items-center justify-between hover:bg-slate-50 group cursor-pointer"
                              onClick={() => onOpenProject && onOpenProject(project.id)}
                            >
                               <div>
                                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                                      {project.name}
                                      {project.isArchived && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Archived</span>}
                                  </p>
                                  <p className="text-xs text-slate-500">Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
                               </div>
                               <div className="flex items-center space-x-4">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                      project.status === 'Active' || project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                      {project.status}
                                  </span>
                                  <span className="text-sm font-medium text-slate-700">${(project.budget || 0).toLocaleString()}</span>
                                  
                                  {!project.isArchived && onArchiveProject && (
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              onArchiveProject(project.id);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                          title="Archive Project"
                                      >
                                          <Archive className="w-4 h-4" />
                                      </button>
                                  )}
                                  {project.isArchived && onUnarchiveProject && (
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              onUnarchiveProject(project.id);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                          title="Unarchive Project"
                                      >
                                          <RotateCcw className="w-4 h-4" />
                                      </button>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                     );
                   } else {
                     return (
                       <div className="p-8 text-center text-slate-400">
                          <p>{projectTab === 'active' ? 'No active projects.' : 'No archived projects.'}</p>
                       </div>
                     );
                   }
                 })()}
              </div>
            )}

            {/* Client Meetings Section */}
            {activeTab === 'meetings' && (
              <ClientMeetings
                clientId={selectedClient.id}
                meetings={clientMeetings}
                users={users.length > 0 ? users : accountManagers}
                files={files}
                folders={folders}
                onAddMeeting={onAddMeeting}
                onUpdateMeeting={onUpdateMeeting}
                onDeleteMeeting={onDeleteMeeting}
                onUploadFile={onUploadFile}
                checkPermission={checkPermission}
                currentUser={currentUser}
              />
            )}

            {/* Social Media Profiles Section */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400"/> Social Media Profiles</h3>
                    {checkPermission && (checkPermission('clients.manage') || checkPermission('clients.manage_links')) && (
                        <button 
                          onClick={() => {
                              setEditingSocialLink(null);
                              setSocialForm({ platform: 'instagram', url: '', label: '', username: '' });
                              setIsSocialModalOpen(true);
                          }}
                          className="flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Link</span>
                        </button>
                    )}
                 </div>
                 
                 {clientSocialLinks.length > 0 ? (
                   <div className="divide-y divide-slate-100">
                      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                          <div className="col-span-3">Platform</div>
                          <div className="col-span-5">URL</div>
                          <div className="col-span-2">Username</div>
                          <div className="col-span-2 text-right">Actions</div>
                      </div>
                      {clientSocialLinks.map(link => (
                        <div key={link.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 group">
                           <div className="col-span-3 flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded-lg">
                                  {getPlatformIcon(link.platform)}
                              </div>
                              <div>
                                  <p className="font-medium text-slate-900 capitalize">{link.platform === 'other' ? link.label : link.platform}</p>
                              </div>
                           </div>
                           <div className="col-span-5 truncate">
                              <a href={link.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm truncate block">
                                  {link.url}
                              </a>
                           </div>
                           <div className="col-span-2">
                              <span className="text-slate-600 text-sm">{link.username || '—'}</span>
                           </div>
                           <div className="col-span-2 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {checkPermission && (checkPermission('clients.manage') || checkPermission('clients.manage_links')) && (
                                  <>
                                      <button 
                                          onClick={() => {
                                              setEditingSocialLink(link);
                                              setSocialForm({ platform: link.platform, url: link.url, label: link.label || '', username: link.username || '' });
                                              setIsSocialModalOpen(true);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                      >
                                          <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteSocialLinkHandler(link.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                      >
                                          <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                  </>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="p-8 text-center text-slate-400">
                      <p>No social media profiles linked.</p>
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'brand' && checkPermission('clients.brand_view') && (
              <ClientBrandAssets
                clientId={selectedClient.id}
                assets={brandAssets}
                files={files}
                onAddAsset={onAddBrandAsset || (() => {})}
                onUpdateAsset={onUpdateBrandAsset || (() => {})}
                onDeleteAsset={onDeleteBrandAsset || (() => {})}
                onUploadFile={onUploadFile || (async () => {})}
                currentUser={currentUser}
                checkPermission={checkPermission}
              />
            )}

            {/* Marketing Strategies Section */}
            {activeTab === 'strategies' && <ClientMarketingStrategies clientId={selectedClient.id} />}

         </div>

         {/* Sidebar Content (Contacts, Manager, Notes) */}
         <div className="space-y-6">
            {/* Account Manager */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Account Manager</h3>
               {am ? (
                 <div className="flex items-center space-x-3">
                    <img src={am.avatar} alt={am.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                       <p className="font-semibold text-slate-900">{am.name}</p>
                       <p className="text-xs text-slate-500">{am.role}</p>
                    </div>
                 </div>
               ) : (
                 <p className="text-sm text-slate-500 italic">No manager assigned</p>
               )}
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-900 text-sm">Contacts</h3>
                  <button onClick={() => setIsContactModalOpen(true)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"><Plus className="w-4 h-4"/></button>
               </div>
               <div className="divide-y divide-slate-100">
                  {selectedClient.contacts.map(contact => (
                    <div key={contact.id} className="p-4 hover:bg-slate-50 group relative">
                       <div className="flex justify-between items-start">
                          <div>
                             <p className="font-medium text-slate-900 text-sm flex items-center gap-2">
                               {contact.name}
                               {contact.isPrimary && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Primary</span>}
                             </p>
                             <p className="text-xs text-slate-500">{contact.role}</p>
                          </div>
                       </div>
                       <div className="mt-2 space-y-1">
                          <p className="text-xs text-slate-600 flex items-center gap-2"><Mail className="w-3 h-3 text-slate-400"/> {contact.email}</p>
                          {contact.phone && <p className="text-xs text-slate-600 flex items-center gap-2"><Phone className="w-3 h-3 text-slate-400"/> {contact.phone}</p>}
                       </div>
                    </div>
                  ))}
                  {selectedClient.contacts.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">No contacts added.</div>
                  )}
               </div>
            </div>

            {/* Client Notes Section */}
            {checkPermission('clients.notes_view') && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-slate-400"/> 
                      Team Notes
                    </h3>
                 </div>
                 
                 <div className="p-4 space-y-4">
                    {/* Add Note Form */}
                    {checkPermission('clients.notes_create') && (
                      <form onSubmit={handleAddNoteHandler} className="mb-4">
                        <textarea
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Write an internal note about this client..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm min-h-[80px]"
                        />
                        <div className="flex justify-end mt-2">
                          <button 
                            type="submit" 
                            disabled={!newNoteText.trim()}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Note
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Notes List */}
                    <div className="space-y-4">
                      {clientNotes.length > 0 ? (
                        clientNotes.map(note => (
                          <div key={note.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 group">
                            {editingNoteId === note.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm min-h-[60px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => setEditingNoteId(null)}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateNoteHandler(note)}
                                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.text}</p>
                                <div className="flex justify-between items-center mt-2">
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <span className="font-medium text-slate-500">{note.createdByName}</span>
                                    <span>•</span>
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                    {note.updatedAt && <span className="italic">(edited)</span>}
                                  </div>
                                  
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(checkPermission('clients.notes_manage') || (checkPermission('clients.notes_create') && note.createdBy === currentUser?.id)) && (
                                      <button 
                                        onClick={() => {
                                          setEditingNoteId(note.id);
                                          setEditingNoteText(note.text);
                                        }}
                                        className="text-slate-400 hover:text-indigo-600"
                                        title="Edit Note"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    {checkPermission('clients.notes_manage') && (
                                      <button 
                                        onClick={() => handleDeleteNoteHandler(note.id)}
                                        className="text-slate-400 hover:text-rose-600"
                                        title="Delete Note"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-xs text-slate-400 py-2">No team notes yet.</p>
                      )}
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Edit Client Modal */}
      {renderClientModal()}

      {/* Social Link Modal */}
      {isSocialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">{editingSocialLink ? 'Edit Social Link' : 'Add Social Link'}</h2>
              <button onClick={() => setIsSocialModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
            <form onSubmit={handleSaveSocialLink} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
                <select 
                    value={socialForm.platform} 
                    onChange={e => setSocialForm({...socialForm, platform: e.target.value as any})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="website">Website</option>
                    <option value="other">Other</option>
                </select>
              </div>
              
              {socialForm.platform === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                    <input 
                        required 
                        value={socialForm.label || ''} 
                        onChange={e => setSocialForm({...socialForm, label: e.target.value})} 
                        type="text" 
                        placeholder="e.g. Store Locator"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    />
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                <input 
                    required 
                    value={socialForm.url} 
                    onChange={e => setSocialForm({...socialForm, url: e.target.value})} 
                    type="url" 
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username (Optional)</label>
                <input 
                    value={socialForm.username || ''} 
                    onChange={e => setSocialForm({...socialForm, username: e.target.value})} 
                    type="text" 
                    placeholder="@handle"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                />
                <p className="text-xs text-slate-500 mt-1">Will be auto-extracted from URL if left blank.</p>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                    {editingSocialLink ? 'Save Changes' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Add Contact Modal */}
       {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Add Contact</h2>
              <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <input value={contactForm.role} onChange={e => setContactForm({...contactForm, role: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Marketing Director" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="flex items-center space-x-2">
                 <input 
                   type="checkbox" 
                   id="isPrimary"
                   checked={contactForm.isPrimary} 
                   onChange={e => setContactForm({...contactForm, isPrimary: e.target.checked})} 
                   className="rounded text-indigo-600 focus:ring-indigo-500" 
                 />
                 <label htmlFor="isPrimary" className="text-sm text-slate-700">Set as Primary Contact</label>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsHub;