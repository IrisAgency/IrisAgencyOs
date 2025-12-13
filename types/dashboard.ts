// Dashboard-specific TypeScript interfaces

export interface DashboardMember {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface DashboardTimelineItem {
  id: string;
  type: 'task' | 'meeting' | 'social';
  title: string;
  startTime: Date;
  endTime: Date;
  projectName?: string;
  clientName?: string;
  department: string;
  status: string;
  members: DashboardMember[];
  taskType?: string;
  data?: any;
}

export interface DashboardTaskItem {
  id: string;
  type: 'task' | 'meeting' | 'social';
  title: string;
  dueDate: Date;
  startDate?: Date;
  projectName?: string;
  clientName?: string;
  department: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  members: DashboardMember[];
  taskType?: string;
  isOverdue?: boolean;
}

export interface DashboardMeetingItem {
  id: string;
  title: string;
  date: Date;
  durationMinutes: number;
  type: 'client' | 'internal' | 'team';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  participants: DashboardMember[];
  location?: string;
  meetingUrl?: string;
}

export interface DashboardStats {
  completionRate: number;
  unfinishedRate: number;
  typeDistribution: Record<string, number>;
  weeklyActivity: Array<{
    week: string;
    count: number;
  }>;
}

export interface DashboardData {
  timelineItems: DashboardTimelineItem[];
  focusTasks: DashboardTaskItem[];
  urgentTasks: DashboardTaskItem[];
  upcomingMeetings: DashboardMeetingItem[];
  stats: DashboardStats;
}
