import React, { useState, useMemo, useRef } from 'react';
import { Client, ClientContact, Project, Invoice, User, Task, ProjectMilestone, ClientSocialLink, SocialPlatform, ClientNote, ClientMeeting, FileFolder, ClientBrandAsset, AgencyFile } from '../types';
import { Plus, Search, MapPin, Globe, Phone, Mail, FileText, ArrowLeft, MoreHorizontal, Building2, User as UserIcon, Archive, Edit2, Folder, DollarSign, Trash2, RotateCcw, BarChart3, Instagram, Facebook, Linkedin, Youtube, Link as LinkIcon, Video, StickyNote, Palette, Upload, X, ExternalLink, Download, ChevronDown } from 'lucide-react';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageControls from './layout/PageControls';
import PageContent from './layout/PageContent';
import ClientMarketingStrategies from './ClientMarketingStrategies';
import ClientMeetings from './ClientMeetings';
import ClientBrandAssets from './ClientBrandAssets';
import DropdownMenu from './common/DropdownMenu';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'meetings' | 'brand' | 'strategies' | 'notes'>('overview');
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'ltv' | 'projects'>('newest');

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes State
  const [newNoteText, setNewNoteText] = useState('');

  // Theming helpers to align with dashboard surfaces and tokens
  const inputClass = 'w-full px-4 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)] focus:border-[color:var(--dash-primary)]';
  const mutedLabel = 'block text-sm font-medium text-slate-200 mb-2';
  const cardSurface = 'bg-[color:var(--dash-surface)] border border-transparent shadow-[0_18px_50px_rgba(0,0,0,0.45)]';
  const elevatedSurface = 'bg-[color:var(--dash-surface-elevated)] border border-transparent shadow-[0_14px_40px_rgba(0,0,0,0.38)]';
  const softDivider = 'border-[color:var(--dash-glass-border)]';
  const backgroundGlow = (
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 25%, rgba(223, 30, 60, 0.16) 0%, transparent 40%), ' +
          'radial-gradient(circle at 80% 65%, rgba(239, 184, 200, 0.08) 0%, transparent 45%)',
        backgroundColor: 'var(--dash-bg)'
      }}
    />
  );

  // Helper Functions
  const getActiveProjectsCount = (client: Client) => {
    return projects.filter(p => p.clientId === client.id && !p.archived).length;
  };

  const getLifetimeValue = (client: Client) => {
    return invoices
      .filter(inv => inv.clientId === client.id && inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getAccountManager = (client: Client) => {
    return accountManagers.find(u => u.id === client.accountManagerId);
  };

  // Filtered and Sorted Clients
  const filteredClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'ltv':
          return getLifetimeValue(b) - getLifetimeValue(a);
        case 'projects':
          return getActiveProjectsCount(b) - getActiveProjectsCount(a);
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return filtered;
  }, [clients, searchTerm, statusFilter, sortBy, projects, invoices]);

  // Client CRUD Handlers
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
    setIsClientModalOpen(false);
    setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: '' });
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !clientForm.name || !clientForm.email) return;

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
    setIsClientModalOpen(false);
    setIsEditing(false);
    setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: '' });
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      onDeleteClient(clientId);
      setViewMode('list');
      setSelectedClient(null);
    }
  };

  const handleArchiveClient = () => {
    if (!selectedClient) return;
    const updated = { ...selectedClient, status: 'inactive' as any, updatedAt: new Date().toISOString() };
    onUpdateClient(updated);
    setSelectedClient(updated);
  };

  const handleAddNote = (e: React.FormEvent) => {
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

  // Render Client Modal
  const renderClientModal = () => {
    if (!isClientModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsClientModalOpen(false)}>
        <div className={`${cardSurface} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-slate-100`} onClick={(e) => e.stopPropagation()}>
          <div className={`p-6 border-b ${softDivider}`}>
            <h2 className="text-xl font-bold text-white">{isEditing ? 'Edit Client' : 'New Client'}</h2>
          </div>
          
          <form onSubmit={isEditing ? handleUpdateClient : handleCreateClient} className="p-6 space-y-4">
            {/* Logo Upload */}
            <div>
              <label className={mutedLabel}>Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] flex items-center justify-center overflow-hidden">
                  {clientForm.logo ? (
                    <img src={clientForm.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] text-slate-100 hover:border-[color:var(--dash-outline)] transition-colors"
                >
                  Upload Logo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name & Industry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={mutedLabel}>Client Name *</label>
                <input
                  type="text"
                  value={clientForm.name || ''}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={mutedLabel}>Industry</label>
                <input
                  type="text"
                  value={clientForm.industry || ''}
                  onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={mutedLabel}>Email *</label>
                <input
                  type="email"
                  value={clientForm.email || ''}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={mutedLabel}>Phone</label>
                <input
                  type="tel"
                  value={clientForm.phone || ''}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Website & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={mutedLabel}>Website</label>
                <input
                  type="text"
                  value={clientForm.website || ''}
                  onChange={(e) => setClientForm({ ...clientForm, website: e.target.value })}
                  placeholder="example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={mutedLabel}>Address</label>
                <input
                  type="text"
                  value={clientForm.address || ''}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Account Manager & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={mutedLabel}>Account Manager</label>
                <select
                  value={clientForm.accountManagerId || ''}
                  onChange={(e) => setClientForm({ ...clientForm, accountManagerId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Manager</option>
                  {accountManagers.map(am => (
                    <option key={am.id} value={am.id}>{am.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={mutedLabel}>Status</label>
                <select
                  value={clientForm.status || 'active'}
                  onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as any })}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="lead">Lead</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={mutedLabel}>Notes</label>
              <textarea
                value={clientForm.notes || ''}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[color:var(--dash-glass-border)] text-slate-200 bg-[color:var(--dash-surface)] hover:border-[color:var(--dash-outline)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[color:var(--dash-primary)] text-white hover:brightness-110 transition-colors"
              >
                {isEditing ? 'Update Client' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // === LIST VIEW ===
  if (viewMode === 'list') {
    return (
      <PageContainer className="relative isolate">
        {backgroundGlow}
        {/* Page Header */}
        <PageHeader
          title="Clients"
          subtitle="Manage relationships and company profiles."
          actions={
            checkPermission('clients.create') && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '', logo: '' });
                  setIsClientModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[color:var(--dash-primary)] text-white border border-transparent hover:brightness-110 transition-all shadow-[0_10px_40px_rgba(223,30,60,0.35)]"
              >
                <Plus className="w-4 h-4" />
                <span>New Client</span>
              </button>
            )
          }
        />

        <PageControls>
          {/* Search Field */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, industry, city..."
              className={`w-full h-11 pl-10 pr-4 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]`}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 h-11 rounded-lg text-sm text-slate-100 border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]`}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="lead">Lead</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-4 h-11 rounded-lg text-sm text-slate-100 border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]`}
          >
            <option value="newest">Newest</option>
            <option value="name">Name A-Z</option>
            <option value="ltv">LTV High</option>
            <option value="projects">Projects</option>
          </select>
        </PageControls>

        <PageContent>
          {/* Client Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const am = getAccountManager(client);
              const activeProjectsCount = getActiveProjectsCount(client);
              const ltv = getLifetimeValue(client);

              return (
                <div
                  key={client.id}
                  className={`${cardSurface} rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all text-slate-100`}
                >
                  {/* Card Content with consistent 16px padding and 12px gaps */}
                  <div className="p-4 flex flex-col gap-3 overflow-hidden">
                    {/* Header Row: Logo + Name/Industry + Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-[color:var(--dash-surface-elevated)] flex items-center justify-center overflow-hidden border border-[color:var(--dash-glass-border)] flex-shrink-0">
                          {client.logo ? (
                            <img src={client.logo} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <Building2 className="w-6 h-6 text-[color:var(--dash-primary)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg leading-tight text-white truncate">{client.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{client.industry}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize flex-shrink-0 leading-none ${
                        client.status === 'active' ? 'bg-[rgba(16,185,129,0.12)] text-emerald-200 border-[color:rgba(16,185,129,0.35)]' :
                        client.status === 'lead' ? 'bg-[rgba(245,158,11,0.12)] text-amber-200 border-[color:rgba(245,158,11,0.35)]' :
                        'bg-[rgba(148,163,184,0.12)] text-slate-300 border-[color:rgba(148,163,184,0.35)]'
                      }`}>
                        {client.status}
                      </span>
                    </div>

                    {/* Stats Row: 2-column grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[color:var(--dash-glass-border)]">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">LTV</p>
                        <p className="font-semibold text-white ltr-text">${ltv.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Projects</p>
                        <p className="font-semibold text-white ltr-text">{activeProjectsCount}</p>
                      </div>
                    </div>

                    {/* Account Manager */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[color:var(--dash-glass-border)]">
                      {am ? (
                        <>
                          <img src={am.avatar} alt={am.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                          <span className="text-xs text-slate-300 truncate">{am.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">No manager</span>
                      )}
                    </div>
                  </div>

                  {/* Footer Row: Open + Projects + Menu (consistent heights) */}
                  <div className={`border-t ${softDivider} p-3 bg-[color:var(--dash-surface-elevated)]`}>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-center">
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setViewMode('detail');
                        }}
                        className="h-11 rounded-lg text-sm font-medium text-slate-100 border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] hover:border-[color:var(--dash-outline)] transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setViewMode('detail');
                          setActiveTab('projects');
                        }}
                        className="h-11 rounded-lg text-sm font-medium text-slate-100 border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] hover:border-[color:var(--dash-outline)] transition-colors"
                      >
                        Projects
                      </button>
                      <DropdownMenu
                        trigger={
                          <button className="w-11 h-11 flex items-center justify-center rounded-lg border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)] hover:border-[color:var(--dash-outline)] transition-colors">
                            <MoreHorizontal className="w-5 h-5 text-slate-400" />
                          </button>
                        }
                        items={[
                          ...(checkPermission('clients.edit') ? [{
                            label: 'Edit',
                            icon: <Edit2 className="w-4 h-4" />,
                            onClick: () => {
                              setSelectedClient(client);
                              setClientForm({
                                name: client.name,
                                industry: client.industry,
                                email: client.email,
                                phone: client.phone,
                                address: client.address,
                                website: client.website,
                                notes: client.notes,
                                status: client.status,
                                accountManagerId: client.accountManagerId,
                                logo: client.logo
                              });
                              setIsEditing(true);
                              setIsClientModalOpen(true);
                            }
                          }] : []),
                          ...(checkPermission('clients.archive') ? [{
                            label: 'Archive',
                            icon: <Archive className="w-4 h-4" />,
                            onClick: () => {
                              const updated = { ...client, status: 'archived' as any, updatedAt: new Date().toISOString() };
                              onUpdateClient(updated);
                            }
                          }] : []),
                          ...(checkPermission('clients.delete') ? [{
                            label: 'Delete',
                            icon: <Trash2 className="w-4 h-4" />,
                            onClick: () => handleDeleteClient(client.id),
                            danger: true
                          }] : [])
                        ]}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className={`${cardSurface} text-center py-12 rounded-xl text-slate-200`}>
              <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No clients found matching your filters.</p>
            </div>
          )}
        </PageContent>

        {renderClientModal()}
      </PageContainer>
    );
  }

  // === DETAIL VIEW ===
  if (!selectedClient) return null;

  const clientProjects = projects.filter(p => p.clientId === selectedClient.id);
  const activeProjects = clientProjects.filter(p => !p.archived);
  const archivedProjects = clientProjects.filter(p => p.archived);
  const clientNotes = notes.filter(n => n.clientId === selectedClient.id);
  const clientSocialLinks = socialLinks.filter(sl => sl.clientId === selectedClient.id);
  const clientMeetings = meetings.filter(m => m.clientId === selectedClient.id);
  const clientBrandAssets = brandAssets.filter(ba => ba.clientId === selectedClient.id);

  return (
    <PageContainer className="relative isolate">
      {backgroundGlow}
      {/* Back Button */}
      <button
        onClick={() => setViewMode('list')}
        className="flex items-center gap-2 text-slate-300 hover:text-[color:var(--dash-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Clients</span>
      </button>

      {/* Client Header */}
      <div className={`${cardSurface} rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-6 text-slate-100`}>
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[color:var(--dash-surface-elevated)] flex items-center justify-center border border-[color:var(--dash-glass-border)] flex-shrink-0">
              {selectedClient.logo ? (
                <img src={selectedClient.logo} alt={selectedClient.name} className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 className="w-8 h-8 text-[color:var(--dash-primary)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-white">{selectedClient.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border uppercase ${
                  selectedClient.status === 'active' ? 'bg-[rgba(16,185,129,0.14)] text-emerald-200 border-[color:rgba(16,185,129,0.35)]' :
                  selectedClient.status === 'inactive' ? 'bg-[rgba(148,163,184,0.12)] text-slate-300 border-[color:rgba(148,163,184,0.35)]' :
                  'bg-[rgba(245,158,11,0.14)] text-amber-200 border-[color:rgba(245,158,11,0.35)]'
                }`}>
                  {selectedClient.status}
                </span>
              </div>
              <p className="text-slate-300 mb-3">{selectedClient.industry}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
                {selectedClient.website && (
                  <a
                    href={selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-[color:var(--dash-primary)]"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="truncate ltr-text">{selectedClient.website}</span>
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span className="truncate ltr-text">{selectedClient.email}</span>
                </span>
                {selectedClient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span className="ltr-text">{selectedClient.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {checkPermission('clients.edit') && (
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
                    accountManagerId: selectedClient.accountManagerId,
                    logo: selectedClient.logo
                  });
                  setIsEditing(true);
                  setIsClientModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] text-slate-100 hover:border-[color:var(--dash-outline)]"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            {checkPermission('clients.archive') && (
              <button
                onClick={handleArchiveClient}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] text-slate-100 hover:border-[color:var(--dash-outline)]"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            {checkPermission('clients.delete') && (
              <button
                onClick={() => handleDeleteClient(selectedClient.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[color:var(--dash-glass-border)] text-red-300 hover:border-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`client-tabs ${cardSurface} rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden`}>
        <div className={`border-b ${softDivider} overflow-x-auto`}>
          <div className="flex min-w-max">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'projects', label: 'Projects' },
              { id: 'meetings', label: 'Meetings' },
              { id: 'brand', label: 'Brand Assets' },
              { id: 'strategies', label: 'Marketing' },
              { id: 'notes', label: 'Notes' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[color:var(--dash-primary)] text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="client-tab-content p-6 w-full min-w-0">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${elevatedSurface} rounded-lg p-4`}>
                  <p className="text-sm text-slate-400 mb-1">Active Projects</p>
                  <p className="text-2xl font-bold text-white ltr-text">{activeProjects.length}</p>
                </div>
                <div className={`${elevatedSurface} rounded-lg p-4`}>
                  <p className="text-sm text-slate-400 mb-1">Lifetime Value</p>
                  <p className="text-2xl font-bold text-white ltr-text">${getLifetimeValue(selectedClient).toLocaleString()}</p>
                </div>
                <div className={`${elevatedSurface} rounded-lg p-4`}>
                  <p className="text-sm text-slate-400 mb-1">Account Manager</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getAccountManager(selectedClient) ? (
                      <>
                        <img
                          src={getAccountManager(selectedClient)!.avatar}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm font-medium text-white truncate">
                          {getAccountManager(selectedClient)!.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-500">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div>
                <h3 className="font-semibold text-white mb-3">Client Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Address</p>
                    <p className="text-slate-100 wrap-anywhere">{selectedClient.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Created</p>
                    <p className="text-slate-100">{new Date(selectedClient.createdAt || '').toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedClient.notes && (
                  <div className="mt-4">
                    <p className="text-slate-400 mb-1">Notes</p>
                    <p className="text-slate-100 wrap-anywhere">{selectedClient.notes}</p>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {clientSocialLinks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-white mb-3">Social Media</h3>
                  <div className="flex flex-wrap gap-2">
                    {clientSocialLinks.map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-100 border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)] hover:border-[color:var(--dash-outline)] transition-colors"
                      >
                        {link.platform === 'instagram' && <Instagram className="w-4 h-4 text-pink-600" />}
                        {link.platform === 'facebook' && <Facebook className="w-4 h-4 text-blue-600" />}
                        {link.platform === 'linkedin' && <Linkedin className="w-4 h-4 text-blue-700" />}
                        {link.platform === 'youtube' && <Youtube className="w-4 h-4 text-red-600" />}
                        {link.platform === 'tiktok' && <Video className="w-4 h-4" />}
                        {link.platform === 'other' && <LinkIcon className="w-4 h-4" />}
                        <span className="truncate">{link.username || link.label || link.platform}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">Projects</h3>
              </div>
              
              {/* Projects List as Cards */}
              <div className="space-y-3">
                {activeProjects.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No active projects</p>
                ) : (
                  activeProjects.map(project => (
                    <div key={project.id} className={`${elevatedSurface} rounded-lg p-4 text-slate-100`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{project.name}</h4>
                          <p className="text-sm text-slate-300 mt-1 truncate">{project.description}</p>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                            {project.endDate && <span>End: {new Date(project.endDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => onOpenProject?.(project.id)}
                          className="px-3 py-1.5 rounded text-sm flex-shrink-0 border border-[color:var(--dash-outline)] text-slate-100 hover:border-[color:var(--dash-primary)]"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'meetings' && (
            <ClientMeetings
              clientId={selectedClient.id}
              meetings={clientMeetings}
              users={users}
              files={files}
              folders={folders}
              onAddMeeting={onAddMeeting || (() => {})}
              onUpdateMeeting={onUpdateMeeting || (() => {})}
              onDeleteMeeting={onDeleteMeeting || (() => {})}
              onUploadFile={onUploadFile || (async () => {})}
              checkPermission={checkPermission}
              currentUser={currentUser || null}
            />
          )}

          {activeTab === 'brand' && (
            <ClientBrandAssets
              clientId={selectedClient.id}
              assets={clientBrandAssets}
              onAddAsset={onAddBrandAsset}
              onUpdateAsset={onUpdateBrandAsset}
              onDeleteAsset={onDeleteBrandAsset}
              onUploadFile={onUploadFile}
              files={files}
              currentUser={currentUser}
              checkPermission={checkPermission || (() => false)}
            />
          )}

          {activeTab === 'strategies' && (
            <ClientMarketingStrategies
              clientId={selectedClient.id}
              files={files}
              folders={folders}
              onUploadFile={onUploadFile}
              checkPermission={checkPermission}
            />
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {checkPermission('client.notes.create') && (
                <form onSubmit={handleAddNote} className={`${elevatedSurface} rounded-lg p-4`}>
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-4 py-2 rounded-lg bg-[color:var(--dash-primary)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Add Note
                    </button>
                  </div>
                </form>
              )}

              {/* Notes List */}
              <div className="space-y-3">
                {clientNotes.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No notes yet</p>
                ) : (
                  clientNotes.map(note => (
                    <div key={note.id} className={`${cardSurface} rounded-lg p-4`}>
                      <p className="text-slate-100 wrap-anywhere">{note.text}</p>
                      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>{note.createdByName} • {new Date(note.createdAt).toLocaleDateString()}</span>
                        {checkPermission('client.notes.delete') && (
                          <button
                            onClick={() => onDeleteNote?.(note.id)}
                            className="text-red-300 hover:text-red-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {renderClientModal()}
    </PageContainer>
  );
};

export default ClientsHub;
