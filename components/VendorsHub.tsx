import React, { useState } from 'react';
import { Vendor, Freelancer, VendorServiceOrder, FreelancerAssignment, VendorType, RateType } from '../types';
import {
  Users, Building2, Search, Plus, MapPin, Mail, Phone, Globe,
  FileText, Briefcase, DollarSign, Star, MoreHorizontal, Filter, X
} from 'lucide-react';
import Modal from './common/Modal';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageControls from './layout/PageControls';
import PageContent from './layout/PageContent';

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



  // Vendor Form State
  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState<VendorType>('equipment');
  const [vendorContactName, setVendorContactName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVendor({
      id: `ven-${Date.now()}`,
      name: vendorName,
      type: vendorType,
      contactName: vendorContactName,
      email: vendorEmail,
      phone: vendorPhone,
      address: vendorAddress,
      rating: 0,
      notes: '',
      active: true
    });
    setIsModalOpen(false);
    // Reset
    setVendorName('');
    setVendorType('equipment');
    setVendorContactName('');
    setVendorEmail('');
    setVendorPhone('');
    setVendorAddress('');
  };

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {filteredFreelancers.map(f => (
        <div key={f.id} className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 p-4 md:p-6 shadow-lg hover:shadow-xl transition-all flex flex-col group relative">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setSelectedEntity(f)} className="text-iris-white/70 hover:text-iris-red"><MoreHorizontal className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-iris-red to-iris-red/80 flex items-center justify-center text-white text-xl font-bold border border-iris-red/20">
              {f.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-iris-white">{f.name}</h3>
              <p className="text-sm text-iris-red font-medium">{f.specialization}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-iris-white/70 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-iris-white/40" /> {f.location}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-iris-white/40" /> {f.defaultRate} / {f.rateType}
            </div>
            {f.portfolioUrl && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-iris-white/40" />
                <a href={`https://${f.portfolioUrl}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-iris-red truncate max-w-[150px]">{f.portfolioUrl}</a>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-iris-white/10 flex justify-between items-center">
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${f.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-iris-white/5 text-iris-white/50'}`}>
              {f.active ? 'Active' : 'Inactive'}
            </span>
            <button className="text-xs font-medium text-iris-white/70 hover:text-iris-red flex items-center gap-1 transition-colors">
              View History
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const VendorsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vendors.length === 0 ? (
        <div className="col-span-full p-8 text-center text-iris-white/70 border-2 border-dashed border-iris-white/10 rounded-xl bg-iris-black/80 backdrop-blur-sm">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No vendors in the database.</p>
        </div>
      ) : (
        vendors.map(v => (
          <div key={v.id} className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-iris-white truncate">{v.name}</h3>
                <span className="inline-block mt-1 bg-iris-red/10 text-iris-red px-2 py-1 rounded text-xs capitalize border border-iris-red/20">{v.type}</span>
              </div>
              <button className="text-iris-white/70 hover:text-iris-red p-1 flex-shrink-0 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-iris-white/70">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{v.contactName}</span>
              </div>
              <div className="flex items-center gap-2 text-iris-white/70">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{v.email}</span>
              </div>
              <div className="flex items-center gap-2 text-iris-white/70">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{v.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-iris-white/70">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{v.address}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Network"
        subtitle="Manage external partners, vendors, and freelance talent."
      />

      <PageControls>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-iris-black/80 backdrop-blur-sm border border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50"
          />
        </div>
        <button
          onClick={() => { setModalType('Freelancer'); setIsModalOpen(true); }}
          className="bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 flex items-center gap-2 whitespace-nowrap transition-all"
        >
          <Plus className="w-4 h-4" /> Add Freelancer
        </button>
        <button
          onClick={() => { setModalType('Vendor'); setIsModalOpen(true); }}
          className="bg-iris-black border border-iris-white/10 text-iris-white/70 px-4 py-2 rounded-lg text-sm font-medium hover:bg-iris-white/5 flex items-center gap-2 whitespace-nowrap transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </PageControls>

      <div className="border-b border-iris-white/10">
        <nav className="flex space-x-6">
          {['Freelancers', 'Vendors'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-iris-red text-iris-red' : 'border-transparent text-iris-white/70 hover:text-iris-white'
                }`}
            >
              {tab === 'Freelancers' ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <PageContent>
        {activeTab === 'Freelancers' ? <FreelancersView /> : <VendorsView />}
      </PageContent>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={`Add New ${modalType}`}
          size={modalType === 'Freelancer' ? '2xl' : 'lg'}
        >
          {modalType === 'Freelancer' && (
            <form onSubmit={handleAddFreelancerSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Full Name</label>
                  <input type="text" value={freelancerName} onChange={e => setFreelancerName(e.target.value)} required className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Specialization</label>
                  <input type="text" value={freelancerSpecialization} onChange={e => setFreelancerSpecialization(e.target.value)} required placeholder="e.g., Videographer, Copywriter" className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Email</label>
                  <input type="email" value={freelancerEmail} onChange={e => setFreelancerEmail(e.target.value)} required className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Phone</label>
                  <input type="tel" value={freelancerPhone} onChange={e => setFreelancerPhone(e.target.value)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Default Rate</label>
                  <input type="number" value={freelancerRate} onChange={e => setFreelancerRate(parseFloat(e.target.value))} required className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Rate Type</label>
                  <select value={freelancerRateType} onChange={e => setFreelancerRateType(e.target.value as RateType)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50 [&>option]:bg-iris-black [&>option]:text-iris-white">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="project">Project-based</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white/70 mb-1">Portfolio URL</label>
                <input type="text" value={freelancerPortfolio} onChange={e => setFreelancerPortfolio(e.target.value)} placeholder="e.g., behance.net/johndoe" className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white/70 mb-1">Location</label>
                <input type="text" value={freelancerLocation} onChange={e => setFreelancerLocation(e.target.value)} placeholder="e.g., Dubai, UAE" className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white/70 mb-1">Skills (comma-separated)</label>
                <input type="text" value={freelancerSkills} onChange={e => setFreelancerSkills(e.target.value)} placeholder="e.g., DaVinci Resolve, ARRI Alexa" className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white/70 mb-1">Notes</label>
                <textarea value={freelancerNotes} onChange={e => setFreelancerNotes(e.target.value)} rows={3} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50"></textarea>
              </div>
              <div className="pt-4 border-t border-iris-white/10 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-iris-black border border-iris-white/10 text-iris-white/70 px-4 py-2 rounded-lg text-sm font-medium hover:bg-iris-white/5 transition-colors">Cancel</button>
                <button type="submit" className="bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all">Save Freelancer</button>
              </div>
            </form>
          )}

          {modalType === 'Vendor' && (
            <form onSubmit={handleAddVendorSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Company Name</label>
                  <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} required className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Type</label>
                  <select value={vendorType} onChange={e => setVendorType(e.target.value as any)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50 [&>option]:bg-iris-black [&>option]:text-iris-white">
                    <option value="equipment">Equipment</option>
                    <option value="location">Location</option>
                    <option value="catering">Catering</option>
                    <option value="transport">Transport</option>
                    <option value="talent_agency">Talent Agency</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white/70 mb-1">Contact Person</label>
                <input type="text" value={vendorContactName} onChange={e => setVendorContactName(e.target.value)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Email</label>
                  <input type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-iris-white/70 mb-1">Phone</label>
                  <input type="tel" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white/70 mb-1">Address/Location</label>
                <input type="text" value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} className="w-full bg-iris-black/80 border-iris-white/10 text-iris-white placeholder:text-iris-white/40 rounded-md shadow-sm text-sm focus:ring-iris-red focus:border-iris-red/50" />
              </div>
              <div className="pt-4 border-t border-iris-white/10 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-iris-black border border-iris-white/10 text-iris-white/70 px-4 py-2 rounded-lg text-sm font-medium hover:bg-iris-white/5 transition-colors">Cancel</button>
                <button type="submit" className="bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all">Save Vendor</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </PageContainer>
  );
};

export default VendorsHub;
