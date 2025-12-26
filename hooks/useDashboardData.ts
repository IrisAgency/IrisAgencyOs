import { useMemo } from 'react';
import {
  DashboardData,
  DashboardTimelineItem,
  DashboardTaskItem,
  DashboardStats,
  DashboardMeetingItem,
  DashboardMember,
} from '../types/dashboard';
import { Task, User, ClientMeeting, SocialPost, TaskStatus, Priority } from '../types';

interface UseDashboardDataProps {
  tasks: Task[];
  users: User[];
  meetings: ClientMeeting[];
  socialPosts: SocialPost[];
  currentUser: User;
}

/**
 * Custom hook to prepare dashboard data from raw entities
 * Later can be replaced with API call to /api/dashboard/me
 */
export const useDashboardData = ({
  tasks,
  users,
  meetings,
  socialPosts,
  currentUser,
}: UseDashboardDataProps): DashboardData => {
  // Return empty data if any required arrays are undefined (still loading)
  if (!tasks || !users || !meetings || !socialPosts || !currentUser) {
    return {
      timelineItems: [],
      focusTasks: [],
      urgentTasks: [],
      upcomingMeetings: [],
      recentActivities: [],
      stats: {
        completionRate: 0,
        unfinishedRate: 0,
        typeDistribution: {},
        weeklyActivity: [],
      },
    };
  }

  // Convert tasks to timeline items
  const timelineItems = useMemo<DashboardTimelineItem[]>(() => {
    const items: DashboardTimelineItem[] = [];

    tasks
      .filter((t) => !t.isArchived && t.status !== TaskStatus.COMPLETED)
      .filter((t) => t.assigneeIds?.includes(currentUser.id))
      .forEach((task) => {
        const taskMembers = task.assigneeIds
          ?.map((userId) => {
            const user = users.find((u) => u.id === userId);
            return user
              ? { id: user.id, name: user.name, avatarUrl: user.avatar }
              : null;
          })
          .filter(Boolean) as DashboardTimelineItem['members'];

        items.push({
          id: task.id,
          type: 'task',
          title: task.title,
          startTime: new Date(task.startDate),
          endTime: new Date(task.dueDate),
          department: task.department,
          status: task.status,
          members: taskMembers,
          taskType: task.taskType,
          data: task,
        });
      });

    // Add meetings
    meetings
      .filter((m) => m.status === 'scheduled')
      .filter((m) => m.participantIds?.includes(currentUser.id))
      .forEach((meeting) => {
        const meetingMembers = meeting.participantIds
          ?.map((userId) => {
            const user = users.find((u) => u.id === userId);
            return user
              ? { id: user.id, name: user.name, avatarUrl: user.avatar }
              : null;
          })
          .filter(Boolean) as DashboardTimelineItem['members'];

        items.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          startTime: new Date(meeting.date),
          endTime: new Date(
            new Date(meeting.date).getTime() + meeting.durationMinutes * 60000
          ),
          department: 'Management',
          status: 'scheduled',
          members: meetingMembers,
          taskType: 'meeting',
          data: meeting,
        });
      });

    // Add social posts
    socialPosts
      .filter((sp) => sp.socialManagerId === currentUser.id)
      .filter((sp) => sp.status !== 'published')
      .forEach((post) => {
        const startTime = post.publishAt ? new Date(post.publishAt) : new Date();
        const socialManager = users.find((u) => u.id === post.socialManagerId);

        items.push({
          id: post.id,
          type: 'social',
          title: post.title,
          startTime,
          endTime: new Date(startTime.getTime() + 60 * 60000),
          department: 'Creative',
          status: post.status,
          members: socialManager
            ? [{ id: socialManager.id, name: socialManager.name, avatarUrl: socialManager.avatar }]
            : [],
          taskType: 'social',
          data: post,
        });
      });

    return items;
  }, [tasks, meetings, socialPosts, currentUser, users]);

  // Get urgent tasks
  const urgentTasks = useMemo<DashboardTaskItem[]>(() => {
    return tasks
      .filter((t) => !t.isArchived && t.status !== TaskStatus.COMPLETED)
      .filter((t) => t.assigneeIds?.includes(currentUser.id))
      .filter((t) => {
        const isOverdue = new Date(t.dueDate) < new Date();
        const isHighPriority = t.priority === Priority.HIGH || t.priority === Priority.CRITICAL;
        const isDueSoon = new Date(t.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        return isOverdue || isHighPriority || isDueSoon;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
      .map((task) => {
        const taskMembers = task.assigneeIds
          ?.map((userId) => {
            const user = users.find((u) => u.id === userId);
            return user
              ? { id: user.id, name: user.name, avatarUrl: user.avatar }
              : null;
          })
          .filter(Boolean) as DashboardTaskItem['members'];

        return {
          id: task.id,
          type: 'task' as const,
          title: task.title,
          dueDate: new Date(task.dueDate),
          startDate: new Date(task.startDate),
          department: task.department,
          status: task.status,
          priority: task.priority as DashboardTaskItem['priority'],
          members: taskMembers,
          taskType: task.taskType,
          isOverdue: new Date(task.dueDate) < new Date(),
        };
      });
  }, [tasks, currentUser, users]);

  // Calculate stats
  const stats = useMemo<DashboardStats>(() => {
    const myTasks = tasks.filter(
      (t) => t.assigneeIds?.includes(currentUser.id) && !t.isArchived
    );
    const completed = myTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const total = myTasks.length || 1;

    const typeDistribution: Record<string, number> = {};
    myTasks.forEach((t) => {
      const type = t.taskType || 'other';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    const weeklyActivity = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const completedInWeek = myTasks.filter((t) => {
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

  // Get upcoming meetings from real data
  const upcomingMeetings = useMemo<DashboardMeetingItem[]>(() => {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return meetings
      .filter((m) => m.status === 'scheduled')
      .filter((m) => m.participantIds?.includes(currentUser.id))
      .filter((m) => {
        const meetingDate = new Date(m.date);
        return meetingDate >= now && meetingDate <= oneDayFromNow;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3)
      .map((meeting) => {
        const meetingParticipants = meeting.participantIds
          ?.map((userId) => {
            const user = users.find((u) => u.id === userId);
            return user
              ? { id: user.id, name: user.name, avatarUrl: user.avatar }
              : null;
          })
          .filter(Boolean) as DashboardMember[];

        // Determine meeting type
        let meetingType: 'client' | 'internal' | 'team' = 'internal';
        if (meeting.clientParticipants && meeting.clientParticipants.length > 0) {
          meetingType = 'client';
        } else if (meeting.participantIds.length > 3) {
          meetingType = 'team';
        }

        return {
          id: meeting.id,
          title: meeting.title,
          date: new Date(meeting.date),
          durationMinutes: meeting.durationMinutes || 30,
          type: meetingType,
          status: meeting.status,
          participants: meetingParticipants,
          location: meeting.locationType === 'online' ? undefined : meeting.locationDetails || undefined,
          meetingUrl: meeting.locationType === 'online' ? meeting.locationDetails || undefined : undefined,
        };
      });
  }, [meetings, currentUser, users]);

  return {
    timelineItems,
    focusTasks: urgentTasks.slice(0, 3),
    urgentTasks,
    upcomingMeetings,
    recentActivities: [], // TODO: Add activity log data when available
    stats,
  };
};
