import React from 'react';
import type { CreativeProject, CreativeCalendar, CreativeCalendarItem, Client, User, CalendarMonth, CalendarItem, AgencyFile, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../lib/permissions';
import ManagerView from './creative/ManagerView';
import CopywriterView from './creative/CopywriterView';
import { Sparkles } from 'lucide-react';

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

const CreativeDirectionHub: React.FC<CreativeDirectionHubProps> = (props) => {
  const { checkPermission } = useAuth();
  
  const isManager = checkPermission(PERMISSIONS.CREATIVE.MANAGE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
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
