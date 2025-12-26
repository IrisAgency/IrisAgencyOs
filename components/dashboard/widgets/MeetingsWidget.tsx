import React from 'react';
import { ClientMeeting, Client } from '../../../types';
import { Calendar, Video, MapPin, Plus } from 'lucide-react';

interface MeetingsWidgetProps {
  meetings: ClientMeeting[];
  clients: Client[];
  onNavigateToMeeting: (meetingId: string) => void;
  onScheduleMeeting: () => void;
}

const MeetingsWidget: React.FC<MeetingsWidgetProps> = ({ meetings = [], clients = [], onNavigateToMeeting, onScheduleMeeting }) => {
  const upcomingMeetings = meetings
    .filter(m => {
      const meetingDate = new Date(m.date);
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      return meetingDate >= now && meetingDate <= nextWeek && m.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Upcoming Meetings
        </h3>
        <button 
          onClick={onScheduleMeeting}
          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
          title="Schedule Meeting"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar max-h-[300px]">
        {upcomingMeetings.length > 0 ? (
          upcomingMeetings.map(meeting => {
            const client = clients.find(c => c.id === meeting.clientId);
            const meetingDate = new Date(meeting.date);
            
            return (
              <div 
                key={meeting.id}
                onClick={() => onNavigateToMeeting(meeting.id)}
                className="p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-w-[50px]">
                    <span className="text-xs font-bold text-slate-500 uppercase">{meetingDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="text-lg font-bold text-slate-800">{meetingDate.getDate()}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 truncate">{meeting.title}</h4>
                    <div className="text-xs text-slate-500 mb-1">{client?.name || 'Unknown Client'}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meeting.locationType === 'online' ? (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          <Video className="w-3 h-3" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded">
                          <MapPin className="w-3 h-3" /> {meeting.locationType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
            <p className="text-sm">No upcoming meetings</p>
            <button onClick={onScheduleMeeting} className="mt-2 text-xs text-indigo-600 hover:underline">Schedule one now</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingsWidget;
