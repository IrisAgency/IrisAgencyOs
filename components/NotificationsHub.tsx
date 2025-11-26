import React, { useState } from 'react';
import { Notification, NotificationPreference, NotificationType } from '../types';
import { 
  Bell, CheckCircle, Clock, Filter, Trash2, Settings, 
  MessageSquare, FileText, Briefcase, DollarSign, Clapperboard, X, Check
} from 'lucide-react';

interface NotificationsHubProps {
  notifications: Notification[];
  preferences: NotificationPreference;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onUpdatePreferences: (prefs: NotificationPreference) => void;
}

const NotificationsHub: React.FC<NotificationsHubProps> = ({
  notifications, preferences, onMarkAsRead, onMarkAllAsRead, onDelete, onUpdatePreferences
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Settings'>('All');

  // Helpers
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
      case 'task_status_changed': return <Briefcase className="w-5 h-5 text-indigo-500" />;
      case 'approval_request': return <CheckCircle className="w-5 h-5 text-amber-500" />;
      case 'comment_mention': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'invoice_overdue': return <DollarSign className="w-5 h-5 text-rose-500" />;
      case 'production_update': return <Clapperboard className="w-5 h-5 text-slate-700" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'Unread') return !n.isRead;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let key = date.toLocaleDateString();
    if (date.toDateString() === today.toDateString()) key = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';

    if (!groups[key]) groups[key] = [];
    groups[key].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const SettingsView = () => {
    const toggles = [
      { label: 'Tasks Assigned to Me', key: 'taskAssigned' },
      { label: 'Task Status Changes', key: 'taskStatusChanged' },
      { label: 'Approval Requests', key: 'approvalRequests' },
      { label: 'Comments & Mentions', key: 'commentsMentions' },
      { label: 'Finance Updates', key: 'financeUpdates' },
      { label: 'Production Updates', key: 'productionUpdates' },
    ];

    return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6">
       <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Notification Preferences
       </h3>
       
       <div className="space-y-6">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                  <h4 className="font-medium text-slate-900">Email Notifications</h4>
                  <p className="text-sm text-slate-500">Receive updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" checked={preferences.emailEnabled} 
                    onChange={e => onUpdatePreferences({...preferences, emailEnabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
          </div>

          <div className="space-y-4">
              <h4 className="font-medium text-slate-900 text-sm uppercase tracking-wide text-slate-500">Activity Toggles</h4>
              {toggles.map(item => (
                <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={(preferences as any)[item.key]} 
                            onChange={e => onUpdatePreferences({...preferences, [item.key]: e.target.checked})}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                </div>
              ))}
          </div>
       </div>
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
          <p className="text-slate-500 mt-1">Stay updated on your work and team activity.</p>
        </div>
        <div className="flex space-x-2">
           {activeTab !== 'Settings' && (
               <button 
                onClick={onMarkAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
               >
                  <Check className="w-4 h-4" />
                  <span>Mark All Read</span>
               </button>
           )}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['All', 'Unread', 'Settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Settings' && <Settings className="w-4 h-4"/>}
              {tab}
            </button>
          ))}
        </nav>
      </div>

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
             Object.entries(groupedNotifications).map(([dateGroup, items]: [string, Notification[]]) => (
                <div key={dateGroup}>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">{dateGroup}</h3>
                   <div className="space-y-2">
                      {items.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`flex items-start p-4 rounded-xl border transition-all ${
                             notification.isRead 
                             ? 'bg-white border-slate-200' 
                             : 'bg-indigo-50/50 border-indigo-100 shadow-sm'
                          }`}
                        >
                           <div className={`p-2 rounded-full shrink-0 mr-4 ${notification.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                              {getIcon(notification.type)}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-start">
                                  <h4 className={`text-sm font-bold truncate ${notification.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                     {notification.title}
                                  </h4>
                                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                     {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                               </div>
                               <p className={`text-sm mt-1 line-clamp-2 ${notification.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                                  {notification.message}
                               </p>
                               <div className="flex items-center gap-4 mt-3">
                                  {!notification.isRead && (
                                     <button 
                                        onClick={() => onMarkAsRead(notification.id)}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                     >
                                        Mark as read
                                     </button>
                                  )}
                                  <button onClick={() => onDelete(notification.id)} className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1">
                                      <Trash2 className="w-3 h-3"/> Remove
                                  </button>
                               </div>
                           </div>
                           {!notification.isRead && (
                               <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 ml-2"></div>
                           )}
                        </div>
                      ))}
                   </div>
                </div>
             ))
           )}
        </div>
      )}
    </div>
  );
};

export default NotificationsHub;