import React from 'react';
import { CheckCircle, AlertCircle, Calendar, Video } from 'lucide-react';
import { User } from '../../types';
import { DashboardTaskItem, DashboardMeetingItem } from '../../types/dashboard';

interface DashboardRightPanelProps {
  urgentTasks: DashboardTaskItem[];
  users: User[];
  taskTypeColors: Record<string, { bg: string; light: string; text: string; border?: string }>;
  onTaskClick: (taskId: string) => void;
  upcomingMeetings?: DashboardMeetingItem[];
}

const DashboardRightPanel: React.FC<DashboardRightPanelProps> = ({
  urgentTasks,
  users,
  taskTypeColors,
  onTaskClick,
  upcomingMeetings = [],
}) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleTaskClick = (taskId: string) => {
    onTaskClick(taskId);
  };

  // Get focus tasks (top 3 urgent)
  const focusTasks = urgentTasks.slice(0, 3);

  return (
    <div className="bg-iris-red rounded-2xl p-6 flex flex-col h-full overflow-hidden">
      <h2 className="text-xl font-bold text-iris-white mb-4">My Focus & Urgent</h2>

      <div className="flex-1 space-y-4 overflow-auto">
        {/* My Focus Today Section */}
        <section className="bg-iris-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
          <h3 className="font-semibold text-iris-white mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-iris-white"></div>
            My Focus Today
          </h3>
          <ul className="space-y-2 text-sm text-iris-white">
            {focusTasks.map((task) => {
              const startTime = new Date(task.startDate);
              return (
                <li
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="cursor-pointer hover:bg-iris-black/20 p-2 rounded-lg transition-all"
                >
                  <span className="font-medium text-iris-white/90">
                    {formatTime(startTime)}
                  </span>{' '}
                  <span className="text-iris-white">- {task.title}</span>
                </li>
              );
            })}
            {focusTasks.length === 0 && (
              <li className="text-iris-white/70 italic p-2">No focus tasks for today</li>
            )}
          </ul>
        </section>

        {/* Urgent Tasks Section */}
        <section className="bg-iris-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
          <h3 className="font-semibold text-iris-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Urgent Tasks ({urgentTasks.length})
          </h3>
          <ul className="space-y-3 text-sm text-iris-white">
            {urgentTasks.map((task) => {
              const isOverdue = new Date(task.dueDate) < new Date();
              const dueTime = new Date(task.dueDate);

              return (
                <li
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="flex justify-between items-start gap-2 cursor-pointer hover:bg-iris-black/10 p-3 rounded-lg transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-iris-white truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-iris-white/70 mt-1">
                      {formatTime(dueTime)} {isOverdue && '• Overdue'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task.id);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex-shrink-0 ${
                      isOverdue
                        ? 'bg-iris-black text-iris-white hover:bg-iris-black/80'
                        : 'bg-iris-white text-iris-red hover:bg-iris-white/90'
                    }`}
                  >
                    {isOverdue ? 'Resolve' : 'Open'}
                  </button>
                </li>
              );
            })}
            {urgentTasks.length === 0 && (
              <li className="text-center py-8 text-iris-white/60">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">All caught up!</p>
              </li>
            )}
          </ul>
        </section>

        {/* Next Meetings Section */}
        {upcomingMeetings.length > 0 && (
          <section className="bg-iris-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
            <h3 className="font-semibold text-iris-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Meetings
            </h3>
            <div className="space-y-3">
              {upcomingMeetings.slice(0, 3).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between bg-iris-white/10 p-3 rounded-lg hover:bg-iris-white/20 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-iris-white truncate">
                      {formatTime(meeting.date)} - {meeting.title}
                    </p>
                    <p className="text-xs text-iris-white/70 mt-1">
                      {meeting.type === 'client' ? 'Client Meeting' : 'Team Sync'}
                    </p>
                  </div>
                  <button className="bg-iris-red text-iris-white font-semibold px-4 py-2 rounded-full text-xs hover:bg-iris-red/80 transition-all flex-shrink-0">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default DashboardRightPanel;
