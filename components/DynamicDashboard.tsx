import React, { useState, useMemo } from 'react';
import { Task, Project, User, Client, SocialPost, TaskTimeLog, Department, Priority, TaskStatus, ClientMeeting } from '../types';
import { 
  Calendar, Search, ChevronDown, Plus, User as UserIcon, Clock,
  Video, Image, MessageSquare, Briefcase, DollarSign, Users,
  ChevronLeft, ChevronRight, BarChart3, TrendingUp, CheckCircle,
  AlertCircle, Play, ExternalLink, ArrowUpRight
} from 'lucide-react';

interface DynamicDashboardProps {
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

// Department color mapping
const DEPARTMENT_COLORS = {
  [Department.CREATIVE]: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  [Department.PRODUCTION]: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  [Department.ACCOUNTS]: { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  [Department.MANAGEMENT]: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  [Department.MARKETING]: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const TASK_TYPE_COLORS: Record<string, any> = {
  design: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  video: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
  social: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
  copywriting: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700' },
  meeting: { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700' },
  other: { bg: 'bg-slate-500', light: 'bg-slate-100', text: 'text-slate-700' },
};

type ViewMode = 'today' | 'week' | 'month';
type TimelineItem = {
  id: string;
  type: 'task' | 'meeting' | 'social';
  title: string;
  startTime: Date;
  endTime: Date;
  department: Department;
  taskType?: string;
  members: string[];
  status: string;
  progress?: number;
  data: any;
};


const DynamicDashboard: React.FC<DynamicDashboardProps> = ({ 
  tasks, projects, users, clients, socialPosts, timeLogs, currentUser, meetings = [],
  onNavigateToTask, onNavigateToMeeting, onNavigateToPost
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get current week dates
  const getWeekDates = (date: Date) => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay(); // First day is Sunday
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i));
      dates.push(day);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Convert tasks, meetings, and social posts to timeline items
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // Add tasks
    tasks
      .filter(t => !t.isArchived && t.status !== TaskStatus.COMPLETED)
      .filter(t => t.assigneeIds?.includes(currentUser.id))
      .forEach(task => {
        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          startTime: new Date(task.startDate),
          endTime: new Date(task.dueDate),
          department: task.department,
          taskType: task.taskType,
          members: task.assigneeIds || [],
          status: task.status,
          progress: 0,
          data: task,
        });
      });

    // Add meetings
    meetings
      .filter(m => m.status === 'scheduled')
      .filter(m => m.participantIds?.includes(currentUser.id))
      .forEach(meeting => {
        items.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          startTime: new Date(meeting.date),
          endTime: new Date(new Date(meeting.date).getTime() + meeting.durationMinutes * 60000),
          department: Department.MANAGEMENT,
          taskType: 'meeting',
          members: meeting.participantIds || [],
          status: 'scheduled',
          data: meeting,
        });
      });

    // Add social posts
    socialPosts
      .filter(sp => sp.socialManagerId === currentUser.id)
      .filter(sp => sp.status !== 'published')
      .forEach(post => {
        const startTime = post.publishAt ? new Date(post.publishAt) : new Date();
        items.push({
          id: post.id,
          type: 'social',
          title: post.title,
          startTime,
          endTime: new Date(startTime.getTime() + 60 * 60000), // 1 hour duration
          department: Department.CREATIVE,
          taskType: 'social',
          members: [post.socialManagerId || ''],
          status: post.status,
          data: post,
        });
      });

    return items;
  }, [tasks, meetings, socialPosts, currentUser, projects]);

  // Filter timeline items by view mode and department
  const filteredTimelineItems = useMemo(() => {
    let filtered = timelineItems;

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.department === selectedDepartment);
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range based on view mode
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(item => 
        item.startTime >= today && item.startTime < tomorrow
      );
    } else if (viewMode === 'week') {
      const weekStart = weekDates[0];
      const weekEnd = new Date(weekDates[6]);
      weekEnd.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => 
        item.startTime >= weekStart && item.startTime <= weekEnd
      );
    }

    return filtered;
  }, [timelineItems, selectedDepartment, searchTerm, viewMode, weekDates]);

  // Get urgent and focus tasks
  const urgentTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isArchived && t.status !== TaskStatus.COMPLETED)
      .filter(t => t.assigneeIds?.includes(currentUser.id))
      .filter(t => {
        const isOverdue = new Date(t.dueDate) < new Date();
        const isHighPriority = t.priority === Priority.HIGH || t.priority === Priority.CRITICAL;
        const isDueSoon = new Date(t.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        return isOverdue || isHighPriority || isDueSoon;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [tasks, currentUser]);

  // Stats calculations
  const stats = useMemo(() => {
    const myTasks = tasks.filter(t => 
      t.assigneeIds?.includes(currentUser.id) && !t.isArchived
    );
    const completed = myTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const total = myTasks.length || 1;

    // Task type distribution
    const typeDistribution: Record<string, number> = {};
    myTasks.forEach(t => {
      const type = t.taskType || 'other';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    // Weekly activity (last 4 weeks)
    const weeklyActivity = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const completedInWeek = myTasks.filter(t => {
        if (t.status !== TaskStatus.COMPLETED) return false;
        const completedDate = new Date(t.updatedAt);
        return completedDate >= weekStart && completedDate < weekEnd;
      }).length;

      weeklyActivity.push({ week: `W${4 - i}`, count: completedInWeek });
    }

    return {
      completionRate: Math.round((completed / total) * 100),
      unfinishedRate: Math.round(((total - completed) / total) * 100),
      typeDistribution,
      weeklyActivity,
    };
  }, [tasks, currentUser]);

  const getDepartmentIcon = (dept: Department) => {
    switch (dept) {
      case Department.CREATIVE: return Image;
      case Department.PRODUCTION: return Video;
      case Department.ACCOUNTS: return Briefcase;
      case Department.MANAGEMENT: return Users;
      case Department.MARKETING: return MessageSquare;
      default: return Briefcase;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
        {/* Center: Timeline */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Timeline Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-slate-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('today')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'today' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search events, tasks, meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {Object.values(Department).map(dept => {
                  const Icon = getDepartmentIcon(dept);
                  const colors = DEPARTMENT_COLORS[dept];
                  const isActive = selectedDepartment === dept;
                  return (
                    <button
                      key={dept}
                      onClick={() => setSelectedDepartment(isActive ? 'all' : dept)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? `${colors.bg} text-white shadow-sm` 
                          : `${colors.light} ${colors.text} hover:shadow-sm`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{dept}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {viewMode === 'week' ? (
              <div className="min-w-[800px]">
                {/* Week header */}
                <div className="grid grid-cols-8 gap-2 mb-4">
                  <div className="text-xs font-medium text-slate-400"></div>
                  {weekDates.map((date, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {date.getDate()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="space-y-12">
                  {Array.from({ length: 10 }, (_, i) => i + 9).map(hour => (
                    <div key={hour} className="grid grid-cols-8 gap-2 items-start">
                      <div className="text-xs font-medium text-slate-400 pt-1">
                        {hour}:00
                      </div>
                      {weekDates.map((date, dayIdx) => {
                        const dayItems = filteredTimelineItems.filter(item => {
                          const itemDate = new Date(item.startTime);
                          return (
                            itemDate.getDate() === date.getDate() &&
                            itemDate.getMonth() === date.getMonth() &&
                            itemDate.getHours() === hour
                          );
                        });

                        return (
                          <div key={dayIdx} className="min-h-[60px]">
                            {dayItems.map(item => {
                              const colors = TASK_TYPE_COLORS[item.taskType || 'other'];
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    if (item.type === 'task' && onNavigateToTask) onNavigateToTask(item.id);
                                    if (item.type === 'meeting' && onNavigateToMeeting) onNavigateToMeeting(item.id);
                                    if (item.type === 'social' && onNavigateToPost) onNavigateToPost(item.id);
                                  }}
                                  className={`${colors.light} ${colors.border} border rounded-lg p-2 mb-2 cursor-pointer hover:shadow-md transition-all`}
                                >
                                  <div className={`text-xs font-bold ${colors.text} mb-1`}>
                                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                  </div>
                                  <div className="text-sm font-medium text-slate-900 line-clamp-2">
                                    {item.title}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    {item.members.slice(0, 3).map((userId, idx) => {
                                      const user = users.find(u => u.id === userId);
                                      return user ? (
                                        <img
                                          key={idx}
                                          src={user.avatar}
                                          alt={user.name}
                                          className="w-4 h-4 rounded-full border border-white"
                                        />
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTimelineItems.map(item => {
                  const colors = TASK_TYPE_COLORS[item.taskType || 'other'];
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'task' && onNavigateToTask) onNavigateToTask(item.id);
                        if (item.type === 'meeting' && onNavigateToMeeting) onNavigateToMeeting(item.id);
                        if (item.type === 'social' && onNavigateToPost) onNavigateToPost(item.id);
                      }}
                      className={`${colors.light} ${colors.border} border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={`text-sm font-bold ${colors.text} mb-1`}>
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                          <div className="flex items-center gap-2">
                            {item.members.slice(0, 5).map((userId, idx) => {
                              const user = users.find(u => u.id === userId);
                              return user ? (
                                <img
                                  key={idx}
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-6 h-6 rounded-full border-2 border-white"
                                />
                              ) : null;
                            })}
                          </div>
                        </div>
                        <div className={`px-3 py-1 ${colors.light} ${colors.text} rounded-full text-xs font-medium`}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredTimelineItems.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No items scheduled for today</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Urgent Tasks & Quick Actions */}
        <div className="w-full lg:w-80 xl:w-96 space-y-4 flex-shrink-0">
          {/* Urgent Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Urgent Tasks ({urgentTasks.length})</h3>
            </div>

            <div className="space-y-3">
              {urgentTasks.map(task => {
                const colors = TASK_TYPE_COLORS[task.taskType || 'other'];
                const isOverdue = new Date(task.dueDate) < new Date();
                
                return (
                  <div
                    key={task.id}
                    onClick={() => onNavigateToTask?.(task.id)}
                    className={`${isOverdue ? 'bg-rose-50 border-rose-200' : colors.light + ' ' + colors.border} border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`text-xs font-bold ${isOverdue ? 'text-rose-700' : colors.text}`}>
                        {formatDate(new Date(task.dueDate))}
                      </div>
                      {isOverdue && (
                        <div className="flex items-center gap-1 text-rose-600 text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2 line-clamp-2">{task.title}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {task.assigneeIds?.slice(0, 3).map((userId, idx) => {
                          const user = users.find(u => u.id === userId);
                          return user ? (
                            <img
                              key={idx}
                              src={user.avatar}
                              alt={user.name}
                              className="w-5 h-5 rounded-full border border-white"
                            />
                          ) : null;
                        })}
                      </div>
                      <div className={`px-2 py-1 ${colors.light} ${colors.text} rounded text-xs font-medium`}>
                        {task.status}
                      </div>
                    </div>
                  </div>
                );
              })}
              {urgentTasks.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">All caught up!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 transition-all">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create Task</span>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 transition-all">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Schedule Meeting</span>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 transition-all">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">New Social Post</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Task Statistics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-4">Task Statistics</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-slate-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${stats.completionRate * 3.51} 351.86`}
                  className="text-emerald-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900">{stats.completionRate}%</div>
                  <div className="text-xs text-slate-500">Complete</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-600">Completed</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.completionRate}%</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                <span className="text-slate-600">Unfinished</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.unfinishedRate}%</div>
            </div>
          </div>
        </div>

        {/* Task Type Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-4">Task Type</h3>
          <div className="space-y-3">
            {Object.entries(stats.typeDistribution).map(([type, count]) => {
              const colors = TASK_TYPE_COLORS[type];
              const total = Object.values(stats.typeDistribution).reduce((a: number, b: number) => a + b, 0) || 1;
              const percentage = Math.round(((count as number) / (total as number)) * 100);
              
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 capitalize">{type}</span>
                    <span className="text-sm text-slate-500">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors.bg}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Your Activity</h3>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +23%
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.weeklyActivity.map((week, idx) => {
              const maxCount = Math.max(...stats.weeklyActivity.map(w => w.count), 1);
              const height = (week.count / maxCount) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg relative" style={{ height: `${height}%`, minHeight: '8px' }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700">
                      {week.count}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{week.week}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-xs text-slate-500">
            Tasks completed per week
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicDashboard;
