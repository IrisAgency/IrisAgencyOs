
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sparkles, LogOut, X, Check, Menu } from 'lucide-react';
import { User, Notification } from '../types';
import { useBranding } from '../contexts/BrandingContext';

interface HeaderProps {
  currentUser: User;
  notifications: Notification[];
  toggleAI: () => void;
  onLogout?: () => void;
  onMarkAsRead: (id: string) => void;
  onViewAllNotifications: () => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentUser, notifications, toggleAI, onLogout, onMarkAsRead, onViewAllNotifications, onToggleSidebar
}) => {
  const { branding } = useBranding();
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
    <header className="header bg-white border-b border-slate-200 shadow-sm">
      <div className="h-full flex items-center justify-between px-4 lg:px-6 max-w-[1280px] mx-auto gap-4">

        {/* Left Section: Menu + Logo + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>

          {/* Logo removed - redundant with sidebar */}

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-iris-red focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleAI}
            className="flex items-center gap-2 bg-gradient-to-r from-iris-red to-rose-600 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium hover:shadow-lg hover:shadow-iris-red/30 transition-all whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
            <span className="sm:hidden">AI</span>
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative text-slate-500 hover:text-slate-700 transition-colors p-1.5 rounded-full ${showNotifications ? 'bg-slate-100 text-iris-red' : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-iris-red rounded-full border-2 border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right z-50">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs font-bold text-white bg-iris-red px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-iris-red/5' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold ${!n.isRead ? 'text-iris-red' : 'text-slate-700'}`}>{n.title}</span>
                          <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                        {!n.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkAsRead(n.id); }}
                            className="mt-2 text-[10px] text-iris-red font-medium hover:underline flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Mark read
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
                  className="w-full p-3 text-center text-sm font-medium text-iris-red hover:bg-slate-50 border-t border-slate-100"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.role || 'No Role'}</p>
            </div>
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 ring-2 ring-transparent hover:ring-iris-red/20 transition-all shrink-0"
            />
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:block p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
