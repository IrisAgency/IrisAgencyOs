import React, { useState } from 'react';
import type { CreativeProject, CreativeCalendar, CreativeCalendarItem, Client, User, CalendarMonth, CalendarItem, AgencyFile, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../lib/permissions';
import ManagerView from './creative/ManagerView';
import CopywriterView from './creative/CopywriterView';
import CalendarPresentationView from './creative/CalendarPresentationView';
import { Sparkles, Presentation } from 'lucide-react';

export interface CreativeDirectionHubProps {
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];
  clients: Client[];
  users: User[];
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  files: AgencyFile[];
  currentUser: User | null;
  checkPermission: (permission: string) => boolean;
  onNotify: (type: NotificationType, title: string, message: string, recipientIds: string[], entityId?: string, actionUrl?: string) => void;
  onUploadFile?: (file: AgencyFile) => Promise<void>;
}

type HubView = 'review' | 'presentation';

const CreativeDirectionHub: React.FC<CreativeDirectionHubProps> = (props) => {
  const { checkPermission } = useAuth();
  const [activeHubView, setActiveHubView] = useState<HubView>('review');
  
  const isManager = checkPermission(PERMISSIONS.CREATIVE.MANAGE);

  // Presentation View (full-screen takeover, has its own back button)
  if (activeHubView === 'presentation') {
    return (
      <CalendarPresentationView
        creativeProjects={props.creativeProjects}
        creativeCalendars={props.creativeCalendars}
        creativeCalendarItems={props.creativeCalendarItems}
        calendarMonths={props.calendarMonths}
        calendarItems={props.calendarItems}
        clients={props.clients}
        users={props.users}
        checkPermission={props.checkPermission}
        onBack={() => setActiveHubView('review')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-iris-red/10 border border-iris-red/20">
            <Sparkles className="w-6 h-6 text-iris-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-iris-white">Creative Direction</h1>
            <p className="text-sm text-iris-white/60">
              {isManager ? 'Manage creative projects, review calendars & approve content' : 'Build creative calendars & submit for review'}
            </p>
          </div>
        </div>

        {/* Presentation View Toggle */}
        <button
          onClick={() => setActiveHubView('presentation')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-iris-red/20 to-purple-500/20 border border-iris-red/30 text-sm font-medium text-white hover:from-iris-red/30 hover:to-purple-500/30 transition-all self-start sm:self-auto"
        >
          <Presentation className="w-4 h-4" />
          Presentation View
        </button>
      </div>

      {/* Role-based view */}
      {isManager ? (
        <ManagerView {...props} />
      ) : (
        <CopywriterView {...props} />
      )}
    </div>
  );
};

export default CreativeDirectionHub;
