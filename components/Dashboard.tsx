import React from 'react';
import {
  Task,
  Project,
  User,
  Client,
  SocialPost,
  TaskTimeLog,
  ClientMeeting,
  Note,
  ProjectMilestone,
} from '../types';
import PageContainer from './layout/PageContainer';
import MyTasksWidget from './dashboard/widgets/MyTasksWidget';
import GmUrgentTasksWidget from './dashboard/widgets/GmUrgentTasksWidget';
import TeamProgressWidget from './dashboard/widgets/TeamProgressWidget';
import ClientStatusWidget from './dashboard/widgets/ClientStatusWidget';
import MeetingsWidget from './dashboard/widgets/MeetingsWidget';
import NotesWidget from './dashboard/widgets/NotesWidget';
import CalendarWidget from './dashboard/widgets/CalendarWidget';
import MilestonesWidget from './dashboard/widgets/MilestonesWidget';
import { PERMISSIONS } from '../lib/permissions';
import { usePermission } from '../hooks/usePermissions';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  clients: Client[];
  socialPosts: SocialPost[];
  timeLogs: TaskTimeLog[];
  currentUser: User;
  meetings?: ClientMeeting[];
  notes: Note[];
  milestones?: ProjectMilestone[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToPost?: (postId: string) => void;
  onViewAllTasks?: () => void;
  onNavigateToUserTasks?: (userId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
  onScheduleMeeting?: () => void;
  onNavigateToCalendar?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  tasks = [],
  projects = [],
  users = [],
  clients = [],
  socialPosts = [],
  timeLogs = [],
  currentUser,
  meetings = [],
  notes = [],
  milestones = [],
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onNavigateToTask,
  onNavigateToMeeting,
  onNavigateToPost,
  onViewAllTasks,
  onNavigateToUserTasks,
  onNavigateToClient,
  onScheduleMeeting,
  onNavigateToCalendar,
}) => {
  
  const canViewGmUrgent = usePermission(PERMISSIONS.DASHBOARD.VIEW_GM_URGENT);
  const canCreateNote = usePermission(PERMISSIONS.NOTES.CREATE);
  const canEditOwnNote = usePermission(PERMISSIONS.NOTES.EDIT_OWN);
  const canDeleteOwnNote = usePermission(PERMISSIONS.NOTES.DELETE_OWN);
  const canManageAllNotes = usePermission(PERMISSIONS.NOTES.MANAGE_ALL);

  return (
    <PageContainer title={`Welcome back, ${currentUser.name.split(' ')[0]}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 1. My Tasks Widget */}
        <div className="col-span-1">
          <MyTasksWidget 
            tasks={tasks.filter(t => t.assigneeIds?.includes(currentUser.id)).map(t => {
              const project = projects.find(p => p.id === t.projectId);
              const client = clients.find(c => c.id === project?.clientId);
              return { ...t, client: t.client || client?.name || 'Unknown' };
            })} 
            clients={clients}
            onNavigateToTask={onNavigateToTask} 
          />
        </div>

        {/* 2. GM Urgent Tasks Widget (Conditional) */}
        {canViewGmUrgent && (
          <div className="col-span-1">
            <GmUrgentTasksWidget 
              tasks={tasks} 
              onNavigateToTask={onNavigateToTask} 
              onViewAllUrgent={onViewAllTasks}
            />
          </div>
        )}

        {/* 3. Team Progress Widget */}
        <div className="col-span-1">
          <TeamProgressWidget 
            tasks={tasks} 
            users={users} 
            onNavigateToUserTasks={onNavigateToUserTasks}
          />
        </div>

        {/* 4. Client Status Widget */}
        <div className="col-span-1">
          <ClientStatusWidget 
            clients={clients} 
            projects={projects} 
            tasks={tasks} 
            onNavigateToClient={onNavigateToClient}
          />
        </div>

        {/* 5. Meetings Widget */}
        <div className="col-span-1">
          <MeetingsWidget 
            meetings={meetings} 
            onNavigateToMeeting={onNavigateToMeeting} 
            onScheduleMeeting={onScheduleMeeting}
          />
        </div>

        {/* 6. Notes Widget */}
        <div className="col-span-1">
          <NotesWidget 
            notes={notes}
            currentUser={currentUser}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            canCreate={canCreateNote}
            canEditOwn={canEditOwnNote}
            canDeleteOwn={canDeleteOwnNote}
            canManageAll={canManageAllNotes}
          />
        </div>

        {/* 7. Calendar Widget */}
        <div className="col-span-1 md:col-span-2 xl:col-span-1">
           <CalendarWidget 
             tasks={tasks}
             clients={clients}
             onNavigateToTask={onNavigateToTask || (() => {})}
             onNavigateToCalendar={onNavigateToCalendar || (() => {})}
           />
        </div>

        {/* 8. Milestones Widget */}
        <div className="col-span-1 md:col-span-2 xl:col-span-2">
          <MilestonesWidget 
            milestones={milestones}
            tasks={tasks}
            clients={clients}
            projects={projects}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
