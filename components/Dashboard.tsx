import React, { useState, useMemo } from 'react';
import {
  Task,
  Project,
  User,
  Client,
  SocialPost,
  TaskTimeLog,
  Department,
  Priority,
  TaskStatus,
  ClientMeeting,
} from '../types';
import {
  Video,
  Image,
  MessageSquare,
  Briefcase,
  DollarSign,
  Users,
} from 'lucide-react';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardTimeline from './dashboard/DashboardTimeline';
import DashboardRightPanel from './dashboard/DashboardRightPanel';
import TaskStatsCard from './dashboard/TaskStatsCard';
import TaskTypeCard from './dashboard/TaskTypeCard';
import ActivityCard from './dashboard/ActivityCard';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardTimelineItem } from '../types/dashboard';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  clients: Client[];
  socialPosts: SocialPost[];
  timeLogs: TaskTimeLog[];
  currentUser: User;
  meetings?: ClientMeeting[];
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
  onNavigateToPost?: (postId: string) => void;
}

// Department color mapping (IRIS OS theme)
const DEPARTMENT_COLORS = {
  [Department.CREATIVE]: {
    bg: 'bg-purple-500',
    light: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  [Department.PRODUCTION]: {
    bg: 'bg-blue-500',
    light: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  [Department.ACCOUNTS]: {
    bg: 'bg-yellow-500',
    light: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  [Department.MANAGEMENT]: {
    bg: 'bg-amber-500',
    light: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  [Department.MARKETING]: {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
};

const TASK_TYPE_COLORS: Record<string, any> = {
  design: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  video: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
  social: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
  copywriting: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700' },
  meeting: { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700' },
  other: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-700' },
};

type ViewMode = 'today' | 'week';

const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  projects,
  users,
  clients,
  socialPosts,
  timeLogs,
  currentUser,
  meetings = [],
  onNavigateToTask,
  onNavigateToMeeting,
  onNavigateToPost,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use the dashboard data hook
  const dashboardData = useDashboardData({
    tasks,
    users,
    meetings,
    socialPosts,
    currentUser,
  });

  // Get current week dates
  const getWeekDates = (date: Date): Date[] => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr);
      day.setDate(first + i);
      dates.push(day);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Filter timeline items
  const filteredTimelineItems = useMemo(() => {
    let filtered = dashboardData.timelineItems;

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((item) => item.department === selectedDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(
        (item) => item.startTime >= today && item.startTime < tomorrow
      );
    } else if (viewMode === 'week') {
      const weekStart = weekDates[0];
      const weekEnd = new Date(weekDates[6]);
      weekEnd.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (item) => item.startTime >= weekStart && item.startTime <= weekEnd
      );
    }

    return filtered;
  }, [dashboardData.timelineItems, selectedDepartment, searchTerm, viewMode, weekDates]);

  const getDepartmentIcon = (dept: Department) => {
    switch (dept) {
      case Department.CREATIVE:
        return Image;
      case Department.PRODUCTION:
        return Video;
      case Department.ACCOUNTS:
        return Briefcase;
      case Department.MANAGEMENT:
        return Users;
      case Department.MARKETING:
        return MessageSquare;
      default:
        return Briefcase;
    }
  };

  const handleDateNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const handleItemClick = (item: DashboardTimelineItem) => {
    if (item.type === 'task' && onNavigateToTask) onNavigateToTask(item.id);
    if (item.type === 'meeting' && onNavigateToMeeting) onNavigateToMeeting(item.id);
    if (item.type === 'social' && onNavigateToPost) onNavigateToPost(item.id);
  };

  const handleTaskClick = (taskId: string) => {
    if (onNavigateToTask) onNavigateToTask(taskId);
  };

  return (
    <div className="h-full grid grid-cols-3 grid-rows-3 gap-4 overflow-auto bg-iris-white p-4">
      {/* Header - Spans full width, 1 row */}
      <div className="col-span-3 row-span-1">
        <DashboardHeader
          selectedDate={selectedDate}
          viewMode={viewMode}
          searchTerm={searchTerm}
          selectedDepartment={selectedDepartment}
          departmentColors={DEPARTMENT_COLORS}
          onSearchChange={setSearchTerm}
          onViewModeChange={setViewMode}
          onDepartmentChange={setSelectedDepartment}
          onDateNavigate={handleDateNavigate}
          getDepartmentIcon={getDepartmentIcon}
          currentUser={currentUser}
        />
      </div>

      {/* Timeline - 2 columns, 2 rows */}
      <div className="col-span-2 row-span-2">
        <DashboardTimeline
          viewMode={viewMode}
          weekDates={weekDates}
          filteredItems={filteredTimelineItems}
          users={users}
          taskTypeColors={TASK_TYPE_COLORS}
          onItemClick={handleItemClick}
        />
      </div>

      {/* Right Panel - 1 column, 2 rows */}
      <div className="col-span-1 row-span-2">
        <DashboardRightPanel
          urgentTasks={dashboardData.urgentTasks}
          upcomingMeetings={dashboardData.upcomingMeetings}
          users={users}
          taskTypeColors={TASK_TYPE_COLORS}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Bottom Stats Row - Spans full width, 1 row, divided into 3 columns */}
      <div className="col-span-3 row-span-1 grid grid-cols-3 gap-4">
        <TaskStatsCard
          completionRate={dashboardData.stats.completionRate}
          unfinishedRate={dashboardData.stats.unfinishedRate}
        />
        <TaskTypeCard
          typeDistribution={dashboardData.stats.typeDistribution}
          taskTypeColors={TASK_TYPE_COLORS}
        />
        <ActivityCard weeklyActivity={dashboardData.stats.weeklyActivity} />
      </div>
    </div>
  );
};

export default Dashboard;
