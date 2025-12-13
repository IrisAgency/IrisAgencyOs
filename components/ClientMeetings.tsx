import React, { useState, useMemo } from 'react';
import { ClientMeeting, User, AgencyFile, FileFolder } from '../types';
import { Calendar, Clock, MapPin, Video, Users, FileText, Plus, MoreHorizontal, Edit2, Trash2, CheckCircle, XCircle, Upload, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

interface ClientMeetingsProps {
  clientId: string;
  meetings: ClientMeeting[];
  users: User[];
  files: AgencyFile[];
  folders: FileFolder[];
  onAddMeeting: (meeting: ClientMeeting) => void;
  onUpdateMeeting: (meeting: ClientMeeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
  onUploadFile: (file: AgencyFile) => void;
  checkPermission: (permission: string) => boolean;
  currentUser: User | null;
}

const ClientMeetings: React.FC<ClientMeetingsProps> = ({ 
  clientId, meetings, users, files, folders, 
  onAddMeeting, onUpdateMeeting, onDeleteMeeting, onUploadFile, 
  checkPermission, currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<ClientMeeting | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ClientMeeting>>({
    title: '',
    date: '',
    durationMinutes: 60,
    locationType: 'online',
    locationDetails: '',
    participantIds: [],
    clientParticipants: [],
    description: ''
  });
  const [clientParticipantInput, setClientParticipantInput] = useState('');

  const clientMeetings = useMemo(() => 
    meetings.filter(m => m.clientId === clientId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
  [meetings, clientId]);

  const upcomingMeetings = useMemo(() => 
    clientMeetings.filter(m => m.status === 'scheduled' && new Date(m.date) >= new Date()), 
  [clientMeetings]);

  const pastMeetings = useMemo(() => 
    clientMeetings.filter(m => m.status !== 'scheduled' || new Date(m.date) < new Date()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
  [clientMeetings]);

  const handleOpenModal = (meeting?: ClientMeeting) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setFormData({
        title: meeting.title,
        date: meeting.date.slice(0, 16), // Format for datetime-local
        durationMinutes: meeting.durationMinutes,
        locationType: meeting.locationType,
        locationDetails: meeting.locationDetails,
        participantIds: meeting.participantIds,
        clientParticipants: meeting.clientParticipants,
        description: meeting.description
      });
    } else {
      setEditingMeeting(null);
      setFormData({
        title: '',
        date: new Date().toISOString().slice(0, 16),
        durationMinutes: 60,
        locationType: 'online',
        locationDetails: '',
        participantIds: [currentUser?.id || ''],
        clientParticipants: [],
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !currentUser) return;

    const meetingData: ClientMeeting = {
      id: editingMeeting ? editingMeeting.id : `cm${Date.now()}`,
      clientId,
      title: formData.title,
      description: formData.description || null,
      date: new Date(formData.date).toISOString(),
      durationMinutes: formData.durationMinutes || 60,
      status: editingMeeting ? editingMeeting.status : 'scheduled',
      locationType: formData.locationType as any,
      locationDetails: formData.locationDetails || null,
      organizerId: editingMeeting ? editingMeeting.organizerId : currentUser.id,
      participantIds: formData.participantIds || [],
      clientParticipants: formData.clientParticipants || [],
      meetingFolderId: editingMeeting ? editingMeeting.meetingFolderId : null, // Handled by parent on create
      summary: editingMeeting ? editingMeeting.summary : null,
      createdAt: editingMeeting ? editingMeeting.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: editingMeeting ? editingMeeting.completedAt : null
    };

    if (editingMeeting) {
      onUpdateMeeting(meetingData);
    } else {
      onAddMeeting(meetingData);
    }
    setIsModalOpen(false);
  };

  const handleAddClientParticipant = () => {
    if (clientParticipantInput.trim()) {
      setFormData(prev => ({
        ...prev,
        clientParticipants: [...(prev.clientParticipants || []), clientParticipantInput.trim()]
      }));
      setClientParticipantInput('');
    }
  };

  const handleRemoveClientParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      clientParticipants: (prev.clientParticipants || []).filter((_, i) => i !== index)
    }));
  };

  const toggleInternalParticipant = (userId: string) => {
    setFormData(prev => {
      const current = prev.participantIds || [];
      if (current.includes(userId)) {
        return { ...prev, participantIds: current.filter(id => id !== userId) };
      } else {
        return { ...prev, participantIds: [...current, userId] };
      }
    });
  };

  const handleStatusChange = (meeting: ClientMeeting, newStatus: 'completed' | 'cancelled') => {
    const updated: ClientMeeting = {
        ...meeting,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
    };
    onUpdateMeeting(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, meeting: ClientMeeting) => {
      if (e.target.files && e.target.files[0] && meeting.meetingFolderId) {
          const file = e.target.files[0];
          const newFile: AgencyFile = {
              id: `f${Date.now()}`,
              projectId: 'na', // Not tied to project directly, but folder is tied to client
              taskId: null,
              folderId: meeting.meetingFolderId,
              uploaderId: currentUser?.id || 'unknown',
              name: file.name,
              type: file.type,
              size: file.size,
              url: '', // Empty initially, will be filled by App.tsx
              version: 1,
              isDeliverable: false,
              isArchived: false,
              tags: ['minutes'],
              createdAt: new Date().toISOString()
          };
          
          // Attach the raw file for the uploader to use
          (newFile as any).file = file;

          onUploadFile(newFile);
      }
  };

  const renderMeetingRow = (meeting: ClientMeeting) => {
    const organizer = users.find(u => u.id === meeting.organizerId);
    const isExpanded = expandedMeetingId === meeting.id;
    const meetingFiles = files.filter(f => f.folderId === meeting.meetingFolderId);

    return (
      <div key={meeting.id} className="border-b border-slate-100 last:border-0">
        <div 
            className={`p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
            onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
        >
           <div className="flex items-center gap-4 flex-1">
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded-lg shadow-sm shrink-0">
                 <span className="text-xs font-bold text-slate-500 uppercase">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                 <span className="text-lg font-bold text-slate-900">{new Date(meeting.date).getDate()}</span>
              </div>
              <div>
                 <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    {meeting.title}
                    {meeting.status === 'cancelled' && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">Cancelled</span>}
                    {meeting.status === 'completed' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">Completed</span>}
                 </h4>
                 <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(meeting.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({meeting.durationMinutes}m)</span>
                    <span className="flex items-center gap-1">
                        {meeting.locationType === 'online' ? <Video className="w-3 h-3"/> : <MapPin className="w-3 h-3"/>}
                        {meeting.locationType === 'online' ? 'Online' : meeting.locationDetails || 'In Person'}
                    </span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {meeting.participantIds.length + meeting.clientParticipants.length} Attendees</span>
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronRight className="w-4 h-4 text-slate-400"/>}
           </div>
        </div>

        {isExpanded && (
            <div className="px-4 pb-4 pl-[4.5rem] bg-slate-50 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Details</h5>
                        <p className="text-sm text-slate-700 mb-2">{meeting.description || 'No description provided.'}</p>
                        
                        <div className="mt-4">
                            <h6 className="text-xs font-semibold text-slate-900 mb-1">Attendees</h6>
                            <div className="flex flex-wrap gap-2">
                                {meeting.participantIds.map(pid => {
                                    const u = users.find(user => user.id === pid);
                                    return u ? (
                                        <div key={pid} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-full text-xs">
                                            <img src={u.avatar} className="w-4 h-4 rounded-full"/>
                                            <span>{u.name}</span>
                                        </div>
                                    ) : null;
                                })}
                                {meeting.clientParticipants.map((name, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs">
                                        <span>{name} (Client)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {meeting.summary && (
                            <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                <h6 className="text-xs font-bold text-yellow-800 mb-1">Meeting Summary</h6>
                                <p className="text-sm text-yellow-900">{meeting.summary}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs font-bold text-slate-500 uppercase">Minutes & Files</h5>
                            {meeting.meetingFolderId && (
                                <label className="cursor-pointer text-xs bg-white border border-slate-200 hover:bg-slate-50 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                    <Upload className="w-3 h-3"/> Upload
                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, meeting)} />
                                </label>
                            )}
                        </div>
                        
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            {meetingFiles.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {meetingFiles.map(file => (
                                        <div key={file.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-4 h-4 text-slate-400 shrink-0"/>
                                                <span className="text-sm text-slate-700 truncate">{file.name}</span>
                                            </div>
                                            <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">View</a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    No files uploaded yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
                    {checkPermission('clients.meetings_manage') && (
                        <>
                            {meeting.status === 'scheduled' && (
                                <>
                                    <button 
                                        onClick={() => handleStatusChange(meeting, 'completed')}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5"/> Mark Completed
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(meeting, 'cancelled')}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <XCircle className="w-3.5 h-3.5"/> Cancel
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => handleOpenModal(meeting)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5"/> Edit
                            </button>
                            <button 
                                onClick={() => {
                                    if(confirm('Delete this meeting?')) onDeleteMeeting(meeting.id);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5"/> Delete
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
      </div>
    );
  };

  if (!checkPermission('clients.meetings_view')) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
         <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400"/> Meetings
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Upcoming ({upcomingMeetings.length})
                </button>
                <button 
                  onClick={() => setActiveTab('past')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'past' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Past ({pastMeetings.length})
                </button>
            </div>
         </div>
         
         {checkPermission('clients.meetings_create') && (
             <button 
                onClick={() => handleOpenModal()}
                className="flex items-center space-x-2 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
             >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Meeting</span>
             </button>
         )}
      </div>

      <div className="divide-y divide-slate-100">
         {activeTab === 'upcoming' ? (
             upcomingMeetings.length > 0 ? upcomingMeetings.map(renderMeetingRow) : (
                 <div className="p-8 text-center text-slate-400">No upcoming meetings scheduled.</div>
             )
         ) : (
             pastMeetings.length > 0 ? pastMeetings.map(renderMeetingRow) : (
                 <div className="p-8 text-center text-slate-400">No past meetings found.</div>
             )
         )}
      </div>

      {/* Schedule/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">{editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Monthly Review" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time *</label>
                    <input required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} type="datetime-local" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                    <select value={formData.durationMinutes || 60} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="15">15 min</option>
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location Type</label>
                    <select value={formData.locationType} onChange={e => setFormData({...formData, locationType: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="online">Online (Zoom/Meet)</option>
                        <option value="office">Our Office</option>
                        <option value="client_office">Client Office</option>
                        <option value="other">Other</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Details / Link</label>
                    <input value={formData.locationDetails || ''} onChange={e => setFormData({...formData, locationDetails: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Zoom Link or Room 1" />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description / Agenda</label>
                <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[80px]" placeholder="What is this meeting about?" />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Internal Participants</label>
                 <div className="flex flex-wrap gap-2 mb-2">
                    {users.filter(u => u.status === 'active').map(u => (
                        <button 
                            key={u.id}
                            type="button"
                            onClick={() => toggleInternalParticipant(u.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                                formData.participantIds?.includes(u.id) 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <img src={u.avatar} className="w-4 h-4 rounded-full"/>
                            {u.name}
                        </button>
                    ))}
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Client Participants</label>
                 <div className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        value={clientParticipantInput} 
                        onChange={e => setClientParticipantInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        placeholder="Name or Email"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddClientParticipant())}
                    />
                    <button type="button" onClick={handleAddClientParticipant} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium">Add</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {formData.clientParticipants?.map((name, idx) => (
                        <span key={idx} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                            {name}
                            <button type="button" onClick={() => handleRemoveClientParticipant(idx)} className="hover:text-rose-600"><Plus className="w-3 h-3 rotate-45"/></button>
                        </span>
                    ))}
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                  {editingMeeting ? 'Save Changes' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMeetings;
