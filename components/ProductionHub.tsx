
import React, { useState } from 'react';
import { ProductionAsset, ShotList, CallSheet, AgencyEquipment, AgencyLocation, Project, User } from '../types';
import {
    MapPin, Camera, ClipboardList, FileText, ChevronRight, X, Plus,
    Calendar, Clock, User as UserIcon, CheckCircle, AlertCircle, Video,
    Search, Film, MoreHorizontal, Settings, CheckCircle as CheckCircleIcon
} from 'lucide-react';
import Modal from './common/Modal';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

interface ProductionHubProps {
    // Legacy
    assets: ProductionAsset[];
    // New specific entities
    shotLists: ShotList[];
    callSheets: CallSheet[];
    locations: AgencyLocation[];
    equipment: AgencyEquipment[];
    projects: Project[];
    users: User[];
    // Handlers
    onAddShotList: (sl: ShotList) => void;
    onAddCallSheet: (cs: CallSheet) => void;
    onAddLocation: (loc: AgencyLocation) => void;
    onAddEquipment: (eq: AgencyEquipment) => void;
    onUpdateEquipment: (eq: AgencyEquipment) => void;
    leaveRequests?: any[]; // Keep as any[] or Import type if strict
    projectMembers?: any[]; // Allow loose typing to avoid import circulars if any, but ideally import ProjectMember
}

const ProductionHub: React.FC<ProductionHubProps> = ({
    assets, shotLists, callSheets, locations, equipment, projects, users, leaveRequests = [],
    onAddShotList, onAddCallSheet, onAddLocation, onAddEquipment, onUpdateEquipment, projectMembers = []
}) => {
    const [activeTab, setActiveTab] = useState<'Overview' | 'Shot Lists' | 'Call Sheets' | 'Equipment' | 'Locations'>('Overview');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<string>('');

    // Call Sheet Form State
    const [csDate, setCsDate] = useState('');
    const [csTime, setCsTime] = useState('');
    const [csLocation, setCsLocation] = useState('');
    const [csProject, setCsProject] = useState('');
    const [selectedCrew, setSelectedCrew] = useState<string[]>([]);

    const checkAvailability = (userId: string, dateStr: string) => {
        if (!dateStr || !leaveRequests) return true;
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        const conflict = leaveRequests.find((req: any) => { // Type as any for now or import LeaveRequest
            if (req.userId !== userId || req.status !== 'approved') return false;
            const start = new Date(req.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(req.endDate);
            end.setHours(0, 0, 0, 0);
            return targetDate >= start && targetDate <= end;
        });
        return !conflict;
    };

    const handleCreateCallSheet = (e: React.FormEvent) => {
        e.preventDefault();
        const newSheet: CallSheet = {
            id: `cs${Date.now()}`,
            projectId: csProject,
            locationId: csLocation,
            date: csDate,
            callTime: csTime,
            status: 'Draft',
            crew: selectedCrew.map(uid => {
                const u = users.find(user => user.id === uid);
                return { id: uid, role: u?.role || 'Crew', name: u?.name || 'Unknown', callTime: csTime };
            }),
            productionNotes: '',
            equipmentList: [],
            createdBy: 'current_user', // Mock ID
            createdAt: new Date().toISOString()
        };
        onAddCallSheet(newSheet);
        setIsModalOpen(false);
        // Reset form
        setCsDate(''); setCsTime(''); setCsLocation(''); setCsProject(''); setSelectedCrew([]);
    };

    const toggleCrewSelection = (userId: string) => {
        if (selectedCrew.includes(userId)) {
            setSelectedCrew(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedCrew(prev => [...prev, userId]);
        }
    };

    // --- Sub-Components (Views) ---

    const OverviewView = () => {
        const upcomingShoots = callSheets
            .filter(cs => new Date(cs.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const equipmentIssues = equipment.filter(e => e.status === 'maintenance' || e.status === 'lost');

        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ClipboardList className="w-5 h-5" /></div>
                            <h3 className="font-semibold text-slate-900">Upcoming Shoots</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{upcomingShoots.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Scheduled next 30 days</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Camera className="w-5 h-5" /></div>
                            <h3 className="font-semibold text-slate-900">Active Gear</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{equipment.filter(e => e.status === 'checked_out').length}</p>
                        <p className="text-xs text-slate-500 mt-1">Items currently on set</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><MapPin className="w-5 h-5" /></div>
                            <h3 className="font-semibold text-slate-900">Locations</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{locations.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Approved for filming</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900">Production Schedule</h3>
                            <button onClick={() => setActiveTab('Call Sheets')} className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {upcomingShoots.length > 0 ? upcomingShoots.slice(0, 3).map(cs => {
                                const project = projects.find(p => p.id === cs.projectId);
                                const location = locations.find(l => l.id === cs.locationId);
                                return (
                                    <div key={cs.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{project?.name || 'Unknown Project'}</span>
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{cs.status}</span>
                                            </div>
                                            <p className="font-medium text-slate-900 text-sm mt-1">{new Date(cs.date).toLocaleDateString()} @ {cs.callTime}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {location?.name || 'TBD'}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                )
                            }) : <div className="p-8 text-center text-slate-400 text-sm">No upcoming shoots scheduled.</div>}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900">Equipment Alerts</h3>
                            <button onClick={() => setActiveTab('Equipment')} className="text-xs text-indigo-600 font-medium hover:underline">Manage Inventory</button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {equipmentIssues.length > 0 ? equipmentIssues.slice(0, 3).map(eq => (
                                <div key={eq.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900 text-sm">{eq.name}</p>
                                        <p className="text-xs text-slate-500">{eq.serialNumber} • {eq.category}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${eq.status === 'lost' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {eq.status}
                                    </span>
                                </div>
                            )) : <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center"><CheckCircle className="w-6 h-6 mb-2 text-emerald-400" />All equipment operational.</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ShotListsView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Shot Lists</h3>
                <button
                    onClick={() => { setModalType('ShotList'); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Shot List
                </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {shotLists.map(sl => {
                    const project = projects.find(p => p.id === sl.projectId);
                    return (
                        <div key={sl.id} className="border-b border-slate-100 last:border-0">
                            <div className="p-4 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-900">{sl.name}</h4>
                                    <p className="text-xs text-slate-500">{project?.name} • {sl.shots.length} Shots</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                            {/* Expanded detail - Shot cards */}
                            <div className="p-4 space-y-2">
                                {sl.shots.map(shot => (
                                    <div key={shot.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50/30 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <span className="font-mono text-slate-400 text-sm flex-shrink-0">{shot.shotNumber}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 mb-1">{shot.description}</p>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                    <span className="bg-white px-2 py-1 rounded border border-slate-200">{shot.cameraMovement}</span>
                                                    <span className="bg-white px-2 py-1 rounded border border-slate-200">{shot.framing}</span>
                                                    <span className="text-slate-500">{shot.equipment.length} items</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
                {shotLists.length === 0 && <div className="p-8 text-center text-slate-400">No shot lists created.</div>}
            </div>
        </div>
    );

    const CallSheetsView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Call Sheets</h3>
                <button
                    onClick={() => { setModalType('CallSheet'); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Create Call Sheet
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {callSheets.map(cs => {
                    const project = projects.find(p => p.id === cs.projectId);
                    const location = locations.find(l => l.id === cs.locationId);
                    return (
                        <div key={cs.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 hover:border-indigo-300 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{cs.status}</span>
                                    <h4 className="font-bold text-slate-900 text-lg mt-2">{new Date(cs.date).toLocaleDateString()}</h4>
                                    <p className="text-sm text-slate-500">{project?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-800">{cs.callTime}</p>
                                    <p className="text-xs text-slate-400 uppercase">Call Time</p>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="font-medium text-slate-900">{location?.name}</p>
                                        <p className="text-xs text-slate-500">{location?.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <UserIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                    <div className="w-full">
                                        <p className="font-medium text-slate-900 mb-1">Crew ({cs.crew.length})</p>
                                        <div className="flex flex-wrap gap-1">
                                            {cs.crew.map(c => (
                                                <span key={c.id} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{c.role}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                    View Full Sheet <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const EquipmentView = () => {
        const handleStatusChange = (eqId: string, newStatus: 'available' | 'checked_out') => {
            const item = equipment.find(e => e.id === eqId);
            if (item) {
                onUpdateEquipment({
                    ...item,
                    status: newStatus,
                    checkedOutBy: newStatus === 'checked_out' ? 'u1' : undefined, // mock current user
                    checkedOutAt: newStatus === 'checked_out' ? new Date().toISOString() : undefined
                });
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Equipment Inventory</h3>
                    <button
                        onClick={() => { setModalType('Equipment'); setIsModalOpen(true); }}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Gear
                    </button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {equipment.map(eq => (
                            <div key={eq.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate">{eq.name}</h4>
                                        <p className="text-xs font-mono text-slate-500 mt-1">{eq.serialNumber}</p>
                                    </div>
                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2">{eq.category}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${eq.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                                        eq.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                                            'bg-amber-100 text-amber-800'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${eq.status === 'available' ? 'bg-emerald-500' :
                                            eq.status === 'checked_out' ? 'bg-blue-500' :
                                                'bg-amber-500'
                                            }`}></span>
                                        {eq.status.replace('_', ' ')}
                                    </span>
                                    
                                    {eq.status === 'available' && (
                                        <button
                                            onClick={() => handleStatusChange(eq.id, 'checked_out')}
                                            className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100"
                                        >
                                            Check Out
                                        </button>
                                    )}
                                    {eq.status === 'checked_out' && (
                                        <button
                                            onClick={() => handleStatusChange(eq.id, 'available')}
                                            className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-medium hover:bg-slate-200"
                                        >
                                            Return
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const LocationsView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Location Library</h3>
                <button
                    onClick={() => { setModalType('Location'); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Location
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {locations.map(loc => (
                    <div key={loc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-slate-200 relative">
                            <img src={loc.mapUrl || 'https://picsum.photos/400/200'} alt="Map" className="w-full h-full object-cover" />
                            {loc.permitsRequired && (
                                <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">Permit Required</span>
                            )}
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-slate-900 mb-1">{loc.name}</h4>
                            <p className="text-xs text-slate-500 mb-3 flex items-start gap-1">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {loc.address}
                            </p>
                            <div className="border-t border-slate-100 pt-3 mt-2 text-sm space-y-2">
                                <p className="text-slate-600"><span className="font-semibold text-xs text-slate-400 uppercase">Contact:</span> {loc.contactPerson}</p>
                                <p className="text-slate-600"><span className="font-semibold text-xs text-slate-400 uppercase">Phone:</span> {loc.phone}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <PageContainer>
            <PageHeader
                title="Production Hub"
                subtitle="Manage shoots, crew, gear, and logistics."
            />

            <div className="border-b border-slate-200">
                <nav className="flex space-x-6">
                    {['Overview', 'Shot Lists', 'Call Sheets', 'Equipment', 'Locations'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <PageContent>
                {activeTab === 'Overview' && <OverviewView />}
                {activeTab === 'Shot Lists' && <ShotListsView />}
                {activeTab === 'Call Sheets' && <CallSheetsView />}
                {activeTab === 'Equipment' && <EquipmentView />}
                {activeTab === 'Locations' && <LocationsView />}
            </PageContent>

            {/* Generic Modal Shell - In a real app, this would switch on modalType to render specific forms */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Add ${modalType}`}
                size="md"
            >
                {modalType === 'CallSheet' ? (
                    <form onSubmit={handleCreateCallSheet} className="space-y-4 p-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                                <select required value={csProject} onChange={e => setCsProject(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    <option value="">Select Project...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <select required value={csLocation} onChange={e => setCsLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    <option value="">Select Location...</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <input required type="date" value={csDate} onChange={e => setCsDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Call Time</label>
                                <input required type="time" value={csTime} onChange={e => setCsTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Crew</label>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 h-48 overflow-y-auto p-2 space-y-1">
                                {users.filter(u => {
                                    if (csProject) {
                                        return projectMembers.some(pm => pm.projectId === csProject && pm.userId === u.id);
                                    }
                                    return true;
                                }).map(u => {
                                    const available = checkAvailability(u.id, csDate);
                                    return (
                                        <div key={u.id}
                                            onClick={() => available && toggleCrewSelection(u.id)}
                                            className={`p-2 rounded flex items-center justify-between cursor-pointer ${!available ? 'opacity-50 cursor-not-allowed bg-rose-50' :
                                                selectedCrew.includes(u.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                                <span className="text-sm font-medium">{u.name}</span>
                                            </div>
                                            {!available ? (
                                                <span className="text-xs text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> On Leave</span>
                                            ) : selectedCrew.includes(u.id) && <CheckCircleIcon className="w-4 h-4 text-indigo-600" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">Create Call Sheet</button>
                    </form>
                ) : (
                    <div className="py-2">
                        <p className="text-slate-500 text-sm mb-4">Form implementation placeholder for {modalType}.</p>
                        <button onClick={() => setIsModalOpen(false)} className="w-full bg-indigo-600 text-white py-2 rounded-lg">Close</button>
                    </div>
                )}
            </Modal>
        </PageContainer>
    );
};

export default ProductionHub;
