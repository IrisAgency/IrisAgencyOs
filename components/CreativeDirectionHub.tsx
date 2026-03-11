import React, { useState, useMemo, useCallback } from 'react';
import type { CreativeProject, CreativeCalendar, CreativeCalendarItem, CalendarItemRevision, Client, User, CalendarMonth, CalendarItem, AgencyFile, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../lib/permissions';
import ManagerView from './creative/ManagerView';
import CopywriterView from './creative/CopywriterView';
import CalendarPresentationView from './creative/CalendarPresentationView';
import { Sparkles, Presentation } from 'lucide-react';
import { useCreativeStore } from '../stores/useCreativeStore';
import { useCalendarStore } from '../stores/useCalendarStore';
import { useClientStore } from '../stores/useClientStore';
import { useHRStore } from '../stores/useHRStore';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useTaskStore } from '../stores/useTaskStore';
import { notifyUsers } from '../services/notificationService';

export interface CreativeDirectionHubProps {}

type HubView = 'review' | 'presentation';

const CreativeDirectionHub: React.FC<CreativeDirectionHubProps> = () => {
  const { currentUser, checkPermission } = useAuth();
  const creativeStore = useCreativeStore();
  const calendarStore = useCalendarStore();
  const clientStore = useClientStore();
  const hrStore = useHRStore();
  const fileStoreData = useFileStore();
  const { showToast, clearToast } = useUIStore();
  const projectStore = useProjectStore();
  const taskStore = useTaskStore();

  const creativeProjects = creativeStore.creativeProjects;
  const creativeCalendars = creativeStore.creativeCalendars;
  const creativeCalendarItems = creativeStore.creativeCalendarItems;
  const clients = clientStore.clients;
  const calendarMonths = calendarStore.calendarMonths;
  const calendarItems = calendarStore.calendarItems;
  const calendarItemRevisions = calendarStore.calendarItemRevisions;
  const files = fileStoreData.files;
  const users = useMemo(() => {
    const safe = Array.isArray(hrStore.users) ? hrStore.users : [];
    return safe.filter(u => u && u.status !== 'inactive');
  }, [hrStore.users]);

  const onNotify = useCallback(async (
    type: NotificationType, title: string, message: string,
    recipientIds: string[] = [], entityId?: string, actionUrl?: string
  ) => {
    showToast({ title, message });
    setTimeout(() => clearToast(), 4000);
    if (recipientIds.length > 0) {
      try {
        await notifyUsers({ type, title, message, recipientIds, entityId, actionUrl, sendPush: false, createdBy: currentUser?.id || 'system' });
      } catch (error) { console.error('Failed to create notification:', error); }
    }
  }, [showToast, clearToast, currentUser?.id]);

  const onUploadFile = useCallback(async (file: AgencyFile) => {
    const projects = projectStore.projects;
    const activeTasks = taskStore.tasks.filter(t => !t.isDeleted);
    const folders = fileStoreData.folders;
    showToast({ title: 'Uploading...', message: `Uploading ${file.name}...` });
    try {
      const savedFile = await fileStoreData.uploadFile(file, { projects, clients, activeTasks, folders });
      showToast({ title: 'Success', message: `${file.name} uploaded successfully!` });
      return savedFile;
    } catch (error: any) {
      showToast({ title: 'Upload Failed', message: error.message || 'Failed to upload file.' });
      throw error;
    }
  }, [fileStoreData, projectStore.projects, taskStore.tasks, clients, showToast]);

  // Build props object to pass through to sub-views
  const props = {
    creativeProjects, creativeCalendars, creativeCalendarItems, clients, users,
    calendarMonths, calendarItems, calendarItemRevisions, files,
    currentUser: currentUser as User | null, checkPermission, onNotify,
    onUploadFile: onUploadFile as any,
  };

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
