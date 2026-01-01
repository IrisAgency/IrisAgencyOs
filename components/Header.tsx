
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sparkles, LogOut, X, Check, Menu } from 'lucide-react';
import { User, Notification } from '../types';
import { useBranding } from '../contexts/BrandingContext';
import './dashboard/DashboardTheme.css';

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
    <header className="header bg-[var(--dash-bg)] border-b border-[var(--dash-glass-border)] shadow-sm relative z-20" dir="ltr">
      <div className="h-full flex items-center justify-between px-4 lg:px-6 max-w-[1280px] mx-auto gap-4">

        {/* Left Section: Menu + Logo + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--dash-surface-elevated)] text-[var(--dash-secondary)] transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo removed - redundant with sidebar */}

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dash-secondary)] opacity-50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--dash-surface-elevated)] border border-[var(--dash-glass-border)] rounded-full text-sm text-[var(--dash-secondary)] placeholder-[var(--dash-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--dash-primary)] focus:bg-[var(--dash-surface)] transition-all"
            />
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleAI}
            className="flex items-center gap-2 bg-gradient-to-r from-[var(--dash-primary)] to-[var(--dash-secondary)] text-[var(--dash-on-primary)] px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium hover:shadow-lg hover:shadow-[var(--dash-primary)]/30 transition-all whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
            <span className="sm:hidden">AI</span>
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative text-[var(--dash-secondary)] hover:text-[var(--dash-primary)] transition-colors p-1.5 rounded-full ${showNotifications ? 'bg-[var(--dash-surface-elevated)] text-[var(--dash-primary)]' : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--dash-error)] rounded-full border-2 border-[var(--dash-bg)]"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-[var(--dash-surface)] rounded-xl shadow-xl border border-[var(--dash-glass-border)] overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right z-50">
                <div className="p-3 border-b border-[var(--dash-glass-border)] flex justify-between items-center bg-[var(--dash-surface-elevated)]">
                  <h3 className="font-bold text-sm text-[var(--dash-secondary)]">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs font-bold text-[var(--dash-on-primary)] bg-[var(--dash-primary)] px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentNotifications.length > 0 ? (
                    recentNotifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-[var(--dash-glass-border)] hover:bg-[var(--dash-surface-elevated)] transition-colors ${!n.isRead ? 'bg-[var(--dash-primary)]/5' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold ${!n.isRead ? 'text-[var(--dash-primary)]' : 'text-[var(--dash-secondary)]'}`}>{n.title}</span>
                          <span className="text-[10px] text-[var(--dash-secondary)] opacity-70">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-[var(--dash-secondary)] opacity-80 line-clamp-2">{n.message}</p>
                        {!n.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkAsRead(n.id); }}
                            className="mt-2 text-[10px] text-[var(--dash-primary)] font-medium hover:underline flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-[var(--dash-secondary)] opacity-50 text-xs">No notifications.</div>
                  )}
                </div>
                <button
                  onClick={() => { setShowNotifications(false); onViewAllNotifications(); }}
                  className="w-full p-3 text-center text-sm font-medium text-[var(--dash-primary)] hover:bg-[var(--dash-surface-elevated)] border-t border-[var(--dash-glass-border)]"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-[var(--dash-glass-border)] pl-3">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-[var(--dash-secondary)]">{currentUser.name}</p>
              <p className="text-xs text-[var(--dash-secondary)] opacity-70">{currentUser.role || 'No Role'}</p>
            </div>
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-[var(--dash-glass-border)] ring-2 ring-transparent hover:ring-[var(--dash-primary)]/20 transition-all shrink-0"
            />
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:block p-1.5 text-[var(--dash-secondary)] hover:text-[var(--dash-error)] hover:bg-[var(--dash-error)]/10 rounded-full transition-all"
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
