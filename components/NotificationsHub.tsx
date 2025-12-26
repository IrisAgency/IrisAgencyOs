import React, { useState, useMemo } from 'react';
import { Notification, NotificationPreference, NotificationType, NotificationCategory } from '../types';
import {
  Bell, CheckCircle, Clock, Filter, Trash2, Settings,
  MessageSquare, FileText, Briefcase, DollarSign, Clapperboard, X, Check,
  Users, CalendarClock, AlertCircle, Info, AlertTriangle, ExternalLink, ThumbsUp
} from 'lucide-react';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

interface NotificationsHubProps {
  notifications: Notification[];
  preferences: NotificationPreference;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onUpdatePreferences: (prefs: NotificationPreference) => void;
  onApprove?: (notificationId: string) => void;
  onNavigate?: (url: string) => void;
}

const NotificationsHub: React.FC<NotificationsHubProps> = ({
  notifications, preferences, onMarkAsRead, onMarkAllAsRead, onDelete, onUpdatePreferences, onApprove, onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Tasks' | 'Approvals' | 'Posting' | 'Settings'>('All');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Helpers
  const getIcon = (type: NotificationType) => {
    const iconMap: Record<string, JSX.Element> = {
      // Tasks
      'TASK_ASSIGNED': <Briefcase className="w-5 h-5 text-blue-500" />,
      'TASK_UNASSIGNED': <Briefcase className="w-5 h-5 text-slate-400" />,
      'TASK_STATUS_CHANGED': <Briefcase className="w-5 h-5 text-indigo-500" />,
      'TASK_SUBMITTED_FOR_REVIEW': <CheckCircle className="w-5 h-5 text-amber-500" />,
      'TASK_REVISION_REQUESTED': <AlertCircle className="w-5 h-5 text-orange-500" />,
      'TASK_APPROVED_STEP': <ThumbsUp className="w-5 h-5 text-emerald-500" />,
      'TASK_REJECTED_STEP': <X className="w-5 h-5 text-rose-500" />,
      'TASK_APPROVED_FINAL': <CheckCircle className="w-5 h-5 text-green-600" />,
      'TASK_DUE_SOON': <Clock className="w-5 h-5 text-amber-500" />,
      'TASK_OVERDUE': <AlertTriangle className="w-5 h-5 text-rose-600" />,
      'TASK_COMMENT_MENTION': <MessageSquare className="w-5 h-5 text-blue-500" />,
      'TASK_COMMENT_REPLY': <MessageSquare className="w-5 h-5 text-slate-500" />,
      'TASK_ARCHIVED': <FileText className="w-5 h-5 text-slate-400" />,
      
      // Approvals
      'APPROVAL_REQUESTED': <CheckCircle className="w-5 h-5 text-amber-500" />,
      'APPROVAL_REMINDER': <Clock className="w-5 h-5 text-orange-500" />,
      'APPROVAL_ESCALATION': <AlertTriangle className="w-5 h-5 text-rose-600" />,
      
      // Posting
      'POST_CREATED_FROM_TASK': <Clapperboard className="w-5 h-5 text-purple-500" />,
      'POST_ASSIGNED': <Clapperboard className="w-5 h-5 text-blue-500" />,
      'POST_CAPTION_SUBMITTED': <FileText className="w-5 h-5 text-indigo-500" />,
      'POST_REVISION_REQUESTED': <AlertCircle className="w-5 h-5 text-orange-500" />,
      'POST_APPROVED': <CheckCircle className="w-5 h-5 text-emerald-500" />,
      'POST_SCHEDULED': <CalendarClock className="w-5 h-5 text-blue-500" />,
      'POST_PUBLISHING_TODAY': <Clock className="w-5 h-5 text-amber-500" />,
      'POST_PUBLISHED': <Clapperboard className="w-5 h-5 text-green-600" />,
      
      // Meetings
      'MEETING_SCHEDULED': <CalendarClock className="w-5 h-5 text-blue-500" />,
      'MEETING_REMINDER_24H': <Clock className="w-5 h-5 text-blue-400" />,
      'MEETING_REMINDER_1H': <AlertCircle className="w-5 h-5 text-orange-500" />,
      'MINUTES_UPLOADED': <FileText className="w-5 h-5 text-slate-600" />,
      
      // Finance
      'INVOICE_CREATED': <DollarSign className="w-5 h-5 text-emerald-500" />,
      'INVOICE_DUE_SOON': <Clock className="w-5 h-5 text-amber-500" />,
      'PAYMENT_RECORDED': <DollarSign className="w-5 h-5 text-green-600" />,
      'BUDGET_EXCEEDED': <AlertTriangle className="w-5 h-5 text-rose-600" />,
    };
    return iconMap[type] || <Bell className="w-5 h-5 text-slate-400" />;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'urgent': return <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium">Urgent</span>;
      case 'warning': return <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Warning</span>;
      default: return null;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      if (activeTab === 'Tasks' && n.category !== 'tasks') return false;
      if (activeTab === 'Approvals' && n.category !== 'approvals') return false;
      if (activeTab === 'Posting' && n.category !== 'posting') return false;
      
      // Additional filters
      if (filterUnread && n.isRead) return false;
      if (filterUrgent && n.severity !== 'urgent') return false;
      
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, activeTab, filterUnread, filterUrgent]);

  // Group by groupKey if exists, otherwise by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    
    filteredNotifications.forEach(notification => {
      // Use groupKey for related notifications
      if (notification.groupKey) {
        if (!groups[notification.groupKey]) groups[notification.groupKey] = [];
        groups[notification.groupKey].push(notification);
      } else {
        // Otherwise group by date
        const date = new Date(notification.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let key = date.toLocaleDateString();
        if (date.toDateString() === today.toDateString()) key = 'Today';
        else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';

        if (!groups[key]) groups[key] = [];
        groups[key].push(notification);
      }
    });
    
    return groups;
  }, [filteredNotifications]);

  const SettingsView = () => {
    const categories = [
      { label: 'Tasks', key: 'tasks' },
      { label: 'Approvals', key: 'approvals' },
      { label: 'Posting', key: 'posting' },
      { label: 'Meetings', key: 'meetings' },
      { label: 'Finance', key: 'finance' },
    ];

    const severities = [
      { label: 'Info', value: 'info' },
      { label: 'Warning', value: 'warning' },
      { label: 'Urgent', value: 'urgent' },
    ];

    const deliveryChannels = [
      { label: 'In-App', key: 'inApp' },
      { label: 'Email', key: 'email' },
      { label: 'Push', key: 'push' },
    ];

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Notification Preferences
        </h3>

        <div className="space-y-6">
          {/* Delivery Channels */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Delivery Channels</h4>
            {deliveryChannels.map(channel => (
              <div key={channel.key} className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-sm text-slate-700">{channel.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.delivery?.[channel.key as 'inApp' | 'email' | 'push']}
                    onChange={e => onUpdatePreferences({ 
                      ...preferences, 
                      delivery: { ...preferences.delivery, [channel.key]: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-iris-red"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Muted Categories */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Muted Categories</h4>
            <p className="text-sm text-slate-500">You won't receive notifications from muted categories</p>
            {categories.map(cat => (
              <div key={cat.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{cat.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.mutedCategories?.includes(cat.key as NotificationCategory)}
                    onChange={e => {
                      const current = preferences.mutedCategories || [];
                      const updated = e.target.checked 
                        ? [...current, cat.key as NotificationCategory]
                        : current.filter(c => c !== cat.key);
                      onUpdatePreferences({ ...preferences, mutedCategories: updated });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>
            ))}
          </div>

          {/* Severity Threshold */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Severity Threshold</h4>
            <p className="text-sm text-slate-500">Only show notifications at or above this severity level</p>
            <div className="flex gap-2">
              {severities.map(sev => (
                <button
                  key={sev.value}
                  onClick={() => onUpdatePreferences({ ...preferences, severityThreshold: sev.value as any })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    preferences.severityThreshold === sev.value
                      ? 'bg-iris-red text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PageContainer>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            Notification Center
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 bg-rose-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        }
        subtitle="Stay updated on your work and team activity."
        actions={
          activeTab !== 'Settings' ? (
            <div className="flex items-center gap-3">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterUnread(!filterUnread)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    filterUnread 
                      ? 'bg-iris-red text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Unread Only
                </button>
                <button
                  onClick={() => setFilterUrgent(!filterUrgent)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    filterUrgent 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Urgent Only
                </button>
              </div>
              
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            </div>
          ) : null
        }
      />

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['All', 'Tasks', 'Approvals', 'Posting', 'Settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab 
                  ? 'border-iris-red text-iris-red' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Settings' && <Settings className="w-4 h-4" />}
              {tab === 'Tasks' && <Briefcase className="w-4 h-4" />}
              {tab === 'Approvals' && <CheckCircle className="w-4 h-4" />}
              {tab === 'Posting' && <Clapperboard className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <PageContent>
        {activeTab === 'Settings' ? (
          <SettingsView />
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
          {Object.keys(groupedNotifications).length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No notifications to show.</p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([groupKey, items]: [string, Notification[]]) => {
              const isGroupedByEntity = items[0]?.groupKey === groupKey;
              const latestNotification = items[0];
              
              return (
                <div key={groupKey}>
                  {!isGroupedByEntity && (
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">
                      {groupKey}
                    </h3>
                  )}
                  <div className="space-y-2">
                    {isGroupedByEntity ? (
                      // Grouped notification card
                      <div className={`p-4 rounded-xl border transition-all ${
                        items.some(n => !n.isRead)
                          ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-start">
                          <div className={`p-2 rounded-full shrink-0 mr-4 ${
                            items.some(n => !n.isRead) ? 'bg-white shadow-sm' : 'bg-slate-100'
                          }`}>
                            {getIcon(latestNotification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {latestNotification.title}
                                </h4>
                                {latestNotification.severity && getSeverityBadge(latestNotification.severity)}
                                {items.length > 1 && (
                                  <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                                    {items.length} updates
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                {new Date(latestNotification.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-sm mt-1 text-slate-700">{latestNotification.message}</p>
                            
                            {/* Actions */}
                            {latestNotification.actions && latestNotification.actions.length > 0 && (
                              <div className="flex items-center gap-2 mt-3">
                                {latestNotification.actions.map((action, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (action.action === 'open' && latestNotification.actionUrl) {
                                        onNavigate?.(latestNotification.actionUrl);
                                      } else if (action.action === 'approve' && onApprove) {
                                        onApprove(latestNotification.id);
                                      } else if (action.action === 'read') {
                                        onMarkAsRead(latestNotification.id);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                      action.variant === 'primary' 
                                        ? 'bg-iris-red text-white hover:bg-rose-700'
                                        : action.variant === 'danger'
                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {action.action === 'open' && <ExternalLink className="w-3 h-3" />}
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-3">
                              {items.some(n => !n.isRead) && (
                                <button
                                  onClick={() => items.forEach(n => !n.isRead && onMarkAsRead(n.id))}
                                  className="text-xs font-medium text-iris-red hover:text-rose-700"
                                >
                                  Mark as read
                                </button>
                              )}
                              <button 
                                onClick={() => items.forEach(n => onDelete(n.id))} 
                                className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          </div>
                          {items.some(n => !n.isRead) && (
                            <div className="w-2 h-2 rounded-full bg-iris-red mt-2 ml-2"></div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Regular notification cards
                      items.map(notification => (
                        <div
                          key={notification.id}
                          className={`flex items-start p-4 rounded-xl border transition-all ${
                            notification.isRead
                              ? 'bg-white border-slate-200'
                              : 'bg-blue-50/50 border-blue-200 shadow-sm'
                          }`}
                        >
                          <div className={`p-2 rounded-full shrink-0 mr-4 ${
                            notification.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'
                          }`}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-bold truncate ${
                                  notification.isRead ? 'text-slate-700' : 'text-slate-900'
                                }`}>
                                  {notification.title}
                                </h4>
                                {notification.severity && getSeverityBadge(notification.severity)}
                              </div>
                              <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                {new Date(notification.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className={`text-sm mt-1 line-clamp-2 ${
                              notification.isRead ? 'text-slate-500' : 'text-slate-700'
                            }`}>
                              {notification.message}
                            </p>
                            
                            {/* Actions */}
                            {notification.actions && notification.actions.length > 0 && (
                              <div className="flex items-center gap-2 mt-3">
                                {notification.actions.map((action, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (action.action === 'open' && notification.actionUrl) {
                                        onNavigate?.(notification.actionUrl);
                                      } else if (action.action === 'approve' && onApprove) {
                                        onApprove(notification.id);
                                      } else if (action.action === 'read') {
                                        onMarkAsRead(notification.id);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                      action.variant === 'primary' 
                                        ? 'bg-iris-red text-white hover:bg-rose-700'
                                        : action.variant === 'danger'
                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {action.action === 'open' && <ExternalLink className="w-3 h-3" />}
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-3">
                              {!notification.isRead && (
                                <button
                                  onClick={() => onMarkAsRead(notification.id)}
                                  className="text-xs font-medium text-iris-red hover:text-rose-700"
                                >
                                  Mark as read
                                </button>
                              )}
                              <button 
                                onClick={() => onDelete(notification.id)} 
                                className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-iris-red mt-2 ml-2"></div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default NotificationsHub;