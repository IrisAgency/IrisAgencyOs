import React, { useState } from 'react';
import { Client, ClientContact, Project, Invoice, User } from '../types';
import { Plus, Search, MapPin, Globe, Phone, Mail, FileText, ArrowLeft, MoreHorizontal, Building2, User as UserIcon, Archive, Edit2, Folder, DollarSign, Trash2 } from 'lucide-react';

interface ClientsHubProps {
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  accountManagers: User[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

const ClientsHub: React.FC<ClientsHubProps> = ({ clients, projects, invoices, accountManagers, onAddClient, onUpdateClient, onDeleteClient }) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form State (Client)
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: ''
  });

  // Form State (Contact)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<ClientContact>>({
    name: '', role: '', email: '', phone: '', isPrimary: false
  });

  // --- Handlers ---

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
      status: (clientForm.status as any) || 'active',
      accountManagerId: clientForm.accountManagerId || accountManagers[0]?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contacts: []
    };

    onAddClient(newClient);
    setIsModalOpen(false);
    setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '' });
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
      status: (clientForm.status as any) || 'active',
      accountManagerId: clientForm.accountManagerId || '',
      updatedAt: new Date().toISOString()
    };

    onUpdateClient(updatedClient);
    setSelectedClient(updatedClient);
    setIsModalOpen(false);
    setIsEditing(false);
    setClientForm({ name: '', industry: '', email: '', phone: '', address: '', website: '', notes: '', status: 'active', accountManagerId: '' });
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
                      <div className="font-semibold text-slate-900">{client.name}</div>
                      <div className="text-xs text-slate-500">{client.address.split(',')[0]}</div>
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

  const clientProjects = projects.filter(p => p.clientId === selectedClient.id || p.client === selectedClient.name);
  const clientInvoices = invoices.filter(i => i.clientId === selectedClient.id || i.client === selectedClient.name);
  const activeProjects = clientProjects.filter(p => p.status === 'Active' || p.status === 'active');
  const completedProjects = clientProjects.filter(p => p.status === 'Completed' || p.status === 'completed');
  const am = accountManagers.find(u => u.id === selectedClient.accountManagerId);

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
             <div className="p-4 bg-indigo-50 rounded-lg">
                <Building2 className="w-8 h-8 text-indigo-600" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Content Tabs */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Overview / Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-semibold">Active Projects</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">{activeProjects.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-semibold">Completed</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">{completedProjects.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-semibold">Total Revenue</p>
                 <p className="text-2xl font-bold text-slate-900 mt-1">${clientInvoices.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Projects Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><Folder className="w-4 h-4 text-slate-400"/> Projects</h3>
               </div>
               {clientProjects.length > 0 ? (
                 <div className="divide-y divide-slate-100">
                    {clientProjects.map(project => (
                      <div key={project.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                         <div>
                            <p className="font-semibold text-slate-900">{project.name}</p>
                            <p className="text-xs text-slate-500">Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
                         </div>
                         <div className="flex items-center space-x-4">
                            <span className={`text-xs px-2 py-1 rounded ${
                                project.status === 'Active' || project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {project.status}
                            </span>
                            <span className="text-sm font-medium text-slate-700">${(project.budget || 0).toLocaleString()}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-8 text-center text-slate-400">
                    <p>No active projects yet.</p>
                 </div>
               )}
            </div>

            {/* Financials Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400"/> Financial History</h3>
               </div>
               {clientInvoices.length > 0 ? (
                 <div className="divide-y divide-slate-100">
                    {clientInvoices.map(inv => (
                      <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                         <div>
                            <p className="font-medium text-slate-900 font-mono text-xs uppercase text-slate-500">#{inv.invoiceNumber || inv.id}</p>
                            <p className="text-xs text-slate-500">{new Date(inv.date).toLocaleDateString()}</p>
                         </div>
                         <div className="flex items-center space-x-4">
                            <span className="font-bold text-slate-900">${(inv.total || 0).toLocaleString()}</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                                inv.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {inv.status}
                            </span>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-8 text-center text-slate-400">
                    <p>No invoices generated.</p>
                 </div>
               )}
            </div>
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

            {/* Notes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Internal Notes</h3>
               <p className="text-sm text-slate-600 leading-relaxed">{selectedClient.notes || 'No notes available.'}</p>
            </div>
         </div>
      </div>

      {/* Edit Client Modal */}
      {renderClientModal()}

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