
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sparkles, LogOut, X, Check } from 'lucide-react';
import { User, Notification } from '../types';

interface HeaderProps {
  currentUser: User;
  notifications: Notification[];
  toggleAI: () => void;
  onLogout?: () => void;
  onMarkAsRead: (id: string) => void;
  onViewAllNotifications: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, notifications, toggleAI, onLogout, onMarkAsRead, onViewAllNotifications 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 5);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationRef]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 left-64 right-0 flex items-center justify-between px-8 z-10 shadow-sm">
      <div className="flex items-center w-1/3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects, tasks, or assets..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6">
         <button 
          onClick={toggleAI}
          className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask IRIS AI</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-full ${showNotifications ? 'bg-slate-100 text-indigo-600' : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
               <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
               </div>
               <div className="max-h-80 overflow-y-auto">
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}>
                         <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold ${!n.isRead ? 'text-indigo-600' : 'text-slate-700'}`}>{n.title}</span>
                            <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                         </div>
                         <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                         {!n.isRead && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onMarkAsRead(n.id); }}
                              className="mt-2 text-[10px] text-indigo-600 font-medium hover:underline flex items-center gap-1"
                            >
                              <Check className="w-3 h-3"/> Mark read
                            </button>
                         )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">No notifications.</div>
                  )}
               </div>
               <button 
                 onClick={() => { setShowNotifications(false); onViewAllNotifications(); }}
                 className="w-full p-3 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50 border-t border-slate-100"
               >
                 View All Notifications
               </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
            <p className="text-xs text-slate-500">{currentUser.role || 'No Role'}</p>
          </div>
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-9 h-9 rounded-full object-cover border border-slate-200 ring-2 ring-transparent hover:ring-indigo-100 transition-all" 
          />
          {onLogout && (
            <button 
              onClick={onLogout}
              className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
