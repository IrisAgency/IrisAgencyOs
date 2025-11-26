
import React, { useState } from 'react';
import { Vendor, Freelancer, VendorServiceOrder, FreelancerAssignment, VendorType, RateType } from '../types';
import { 
  Users, Building2, Search, Plus, MapPin, Mail, Phone, Globe, 
  FileText, Briefcase, DollarSign, Star, MoreHorizontal, Filter, X
} from 'lucide-react';

interface VendorsHubProps {
  vendors: Vendor[];
  freelancers: Freelancer[];
  assignments: FreelancerAssignment[];
  serviceOrders: VendorServiceOrder[];
  onAddVendor: (v: Vendor) => void;
  onUpdateVendor: (v: Vendor) => void;
  onAddFreelancer: (f: Freelancer) => void;
  onUpdateFreelancer: (f: Freelancer) => void;
}

const VendorsHub: React.FC<VendorsHubProps> = ({ 
  vendors, freelancers, assignments, serviceOrders, 
  onAddVendor, onUpdateVendor, onAddFreelancer, onUpdateFreelancer 
}) => {
  const [activeTab, setActiveTab] = useState<'Freelancers' | 'Vendors'>('Freelancers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Vendor' | 'Freelancer'>('Freelancer');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null); // To view details

  // --- Form State ---
  // Freelancer
  const [freelancerName, setFreelancerName] = useState('');
  const [freelancerEmail, setFreelancerEmail] = useState('');
  const [freelancerPhone, setFreelancerPhone] = useState('');
  const [freelancerSpecialization, setFreelancerSpecialization] = useState('');
  const [freelancerRate, setFreelancerRate] = useState(0);
  const [freelancerRateType, setFreelancerRateType] = useState<RateType>('hourly');
  const [freelancerPortfolio, setFreelancerPortfolio] = useState('');
  const [freelancerLocation, setFreelancerLocation] = useState('');
  const [freelancerSkills, setFreelancerSkills] = useState('');
  const [freelancerNotes, setFreelancerNotes] = useState('');

  const handleAddFreelancerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddFreelancer({
      id: `fl-${Date.now()}`,
      name: freelancerName,
      email: freelancerEmail,
      phone: freelancerPhone,
      specialization: freelancerSpecialization,
      defaultRate: freelancerRate,
      rateType: freelancerRateType,
      portfolioUrl: freelancerPortfolio,
      location: freelancerLocation,
      skills: freelancerSkills.split(',').map(s => s.trim()).filter(Boolean),
      notes: freelancerNotes,
      active: true,
    });
    setIsModalOpen(false);
    // Reset form
    setFreelancerName('');
    setFreelancerEmail('');
    setFreelancerPhone('');
    setFreelancerSpecialization('');
    setFreelancerRate(0);
    setFreelancerRateType('hourly');
    setFreelancerPortfolio('');
    setFreelancerLocation('');
    setFreelancerSkills('');
    setFreelancerNotes('');
  };

  // Filter Data
  const filteredFreelancers = freelancers.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Sub-Components ---

  const FreelancersView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredFreelancers.map(f => (
        <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col group relative">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => setSelectedEntity(f)} className="text-slate-400 hover:text-indigo-600"><MoreHorizontal className="w-5 h-5"/></button>
          </div>
          <div className="flex items-center space-x-4 mb-4">
             <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold border border-indigo-100">
                {f.name.charAt(0)}
             </div>
             <div>
                <h3 className="font-bold text-slate-900">{f.name}</h3>
                <p className="text-sm text-indigo-600 font-medium">{f.specialization}</p>
             </div>
          </div>
          
          <div className="space-y-2 text-sm text-slate-600 mb-4">
             <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {f.location}
             </div>
             <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" /> {f.defaultRate} / {f.rateType}
             </div>
             {f.portfolioUrl && (
                 <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" /> 
                    <a href={`https://${f.portfolioUrl}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-indigo-600 truncate max-w-[150px]">{f.portfolioUrl}</a>
                 </div>
             )}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
             <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${f.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {f.active ? 'Active' : 'Inactive'}
             </span>
             <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                View History
             </button>
          </div>
        </div>
      ))}
    </div>
  );

  const VendorsView = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="px-6 py-4">Company Name</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Contact Person</th>
            <th className="px-6 py-4">Contact Info</th>
            <th className="px-6 py-4">Location</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredVendors.map(v => (
            <tr key={v.id} className="hover:bg-slate-50 group">
              <td className="px-6 py-4 font-medium text-slate-900">
                 {v.name}
              </td>
              <td className="px-6 py-4">
                 <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs capitalize">{v.type}</span>
              </td>
              <td className="px-6 py-4 text-slate-600">{v.contactName}</td>
              <td className="px-6 py-4 space-y-1">
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3 h-3"/> {v.email}
                 </div>
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3 h-3"/> {v.phone}
                 </div>
              </td>
              <td className="px-6 py-4 text-slate-600">{v.address}</td>
              <td className="px-6 py-4 text-right">
                 <button className="text-slate-400 hover:text-indigo-600"><MoreHorizontal className="w-5 h-5"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network</h1>
          <p className="text-slate-500 mt-1">Manage external partners, vendors, and freelance talent.</p>
        </div>
        <div className="flex space-x-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..." 
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
            </div>
            <button 
              onClick={() => { setModalType('Freelancer'); setIsModalOpen(true); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Freelancer
            </button>
            <button 
              onClick={() => { setModalType('Vendor'); setIsModalOpen(true); }}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Vendor
            </button>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['Freelancers', 'Vendors'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Freelancers' ? <Users className="w-4 h-4"/> : <Building2 className="w-4 h-4"/>}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">
         {activeTab === 'Freelancers' ? <FreelancersView /> : <VendorsView />}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Add New {modalType}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {modalType === 'Freelancer' && (
              <form onSubmit={handleAddFreelancerSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={freelancerName} onChange={e => setFreelancerName(e.target.value)} required className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                    <input type="text" value={freelancerSpecialization} onChange={e => setFreelancerSpecialization(e.target.value)} required placeholder="e.g., Videographer, Copywriter" className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={freelancerEmail} onChange={e => setFreelancerEmail(e.target.value)} required className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="tel" value={freelancerPhone} onChange={e => setFreelancerPhone(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Rate</label>
                    <input type="number" value={freelancerRate} onChange={e => setFreelancerRate(parseFloat(e.target.value))} required className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate Type</label>
                    <select value={freelancerRateType} onChange={e => setFreelancerRateType(e.target.value as RateType)} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="project">Project-based</option>
                      <option value="retainer">Retainer</option>
                    </select>
                  </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio URL</label>
                    <input type="text" value={freelancerPortfolio} onChange={e => setFreelancerPortfolio(e.target.value)} placeholder="e.g., behance.net/johndoe" className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                  </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input type="text" value={freelancerLocation} onChange={e => setFreelancerLocation(e.target.value)} placeholder="e.g., Dubai, UAE" className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Skills (comma-separated)</label>
                  <input type="text" value={freelancerSkills} onChange={e => setFreelancerSkills(e.target.value)} placeholder="e.g., DaVinci Resolve, ARRI Alexa" className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea value={freelancerNotes} onChange={e => setFreelancerNotes(e.target.value)} rows={3} className="w-full border-slate-300 rounded-md shadow-sm text-sm"></textarea>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Save Freelancer</button>
                </div>
              </form>
            )}

            {/* Vendor form can be added here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsHub;
