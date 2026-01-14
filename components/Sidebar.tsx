
import React from 'react';
import { LayoutDashboard, FolderKanban, CheckSquare, Clapperboard, DollarSign, Users, PieChart, Settings, Building2, Layers, Network, ShieldAlert, Share2, Calendar, X } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { PERMISSIONS } from '../lib/permissions';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentUserRole?: UserRole;
  isSidebarOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, currentUserRole, isSidebarOpen = false, onClose }) => {
  const { checkPermission, hasAnyPermission } = useAuth();
  const { branding } = useBranding();

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      visible: true // Everyone with auth.login can see dashboard
    },
    { 
      id: 'clients', 
      label: 'Clients', 
      icon: Building2, 
      visible: hasAnyPermission([
        PERMISSIONS.CLIENTS.VIEW_OWN,
        PERMISSIONS.CLIENTS.VIEW_DEPT,
        PERMISSIONS.CLIENTS.VIEW_ALL
      ])
    },
    { 
      id: 'projects', 
      label: 'Projects', 
      icon: FolderKanban, 
      visible: hasAnyPermission([
        PERMISSIONS.PROJECTS.VIEW_OWN,
        PERMISSIONS.PROJECTS.VIEW_DEPT,
        PERMISSIONS.PROJECTS.VIEW_ALL
      ])
    },
    { 
      id: 'tasks', 
      label: 'Tasks & Workflow', 
      icon: CheckSquare, 
      visible: hasAnyPermission([
        PERMISSIONS.TASKS.VIEW_OWN,
        PERMISSIONS.TASKS.VIEW_DEPT,
        PERMISSIONS.TASKS.VIEW_PROJECT,
        PERMISSIONS.TASKS.VIEW_ALL
      ])
    },
    { 
      id: 'posting', 
      label: 'Posting & Captions', 
      icon: Share2, 
      visible: hasAnyPermission([
        PERMISSIONS.POSTING.VIEW_DEPT,
        PERMISSIONS.POSTING.VIEW_ALL
      ])
    },
    { 
      id: 'calendar', 
      label: 'Calendar', 
      icon: Calendar, 
      visible: checkPermission(PERMISSIONS.CALENDAR.VIEW)
    },
    { 
      id: 'assets', 
      label: 'Assets', 
      icon: Layers, 
      visible: hasAnyPermission([
        PERMISSIONS.ASSETS.VIEW_DEPT,
        PERMISSIONS.ASSETS.VIEW_ALL
      ])
    },
    { 
      id: 'production', 
      label: 'Production Hub', 
      icon: Clapperboard, 
      visible: checkPermission(PERMISSIONS.PRODUCTION.VIEW)
    },
    { 
      id: 'network', 
      label: 'Network', 
      icon: Network, 
      visible: checkPermission(PERMISSIONS.VENDORS.VIEW)
    },
    { 
      id: 'finance', 
      label: 'Finance', 
      icon: DollarSign, 
      visible: hasAnyPermission([
        PERMISSIONS.FINANCE.VIEW_OWN,
        PERMISSIONS.FINANCE.VIEW_PROJECT,
        PERMISSIONS.FINANCE.VIEW_ALL
      ])
    },
    { 
      id: 'hr', 
      label: 'Team & HR', 
      icon: Users, 
      visible: checkPermission(PERMISSIONS.USERS.VIEW_ALL)
    },
    { 
      id: 'analytics', 
      label: 'Reports', 
      icon: PieChart, 
      visible: hasAnyPermission([
        PERMISSIONS.REPORTS.VIEW_DEPT,
        PERMISSIONS.REPORTS.VIEW_ALL,
        PERMISSIONS.ANALYTICS.VIEW_DEPT,
        PERMISSIONS.ANALYTICS.VIEW_ALL
      ])
    },
  ];

  // Admin panel visible to users who can manage roles or settings
  const showAdmin = hasAnyPermission([
    PERMISSIONS.ROLES.VIEW,
    PERMISSIONS.ADMIN_SETTINGS.VIEW,
    PERMISSIONS.ADMIN_BRANDING.VIEW
  ]);

  return (
    // We use style attribute to leverage CSS variables set in App.tsx for dynamic theming
    <aside
      className={`
        w-64 flex flex-col h-screen fixed left-0 top-0 border-r border-white/10 z-40 
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      style={{ backgroundColor: 'var(--sidebar-bg, #171717)', borderColor: 'var(--sidebar-border, #262626)' }}
    >
      {/* Mobile close button */}
      <div className="lg:hidden absolute top-4 right-4 z-50">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex items-center space-x-3 border-b border-white/10">
        {branding?.sidebarIcon?.url ? (
          <img 
            src={`${branding.sidebarIcon.url}?v=${branding.updatedAt || Date.now()}`}
            alt={branding?.appName || 'Logo'}
            className="w-8 h-8 object-contain"
          />
        ) : branding?.logoLight?.url ? (
          <img 
            src={`${branding.logoLight.url}?v=${branding.updatedAt || Date.now()}`}
            alt={branding?.appName || 'Logo'}
            className="w-8 h-8 object-contain"
          />
        ) : (
          <img 
            src="/logo.png" 
            onError={(e) => {
              e.currentTarget.src = '/icon.svg';
              e.currentTarget.onerror = null; // Prevent infinite loop
            }}
            alt="Logo" 
            className="w-8 h-8 object-contain" 
          />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.filter(item => item.visible).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                      ? 'text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  style={isActive ? { backgroundColor: 'var(--primary, #de1e3b)' } : {}}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {showAdmin && (
          <div className="mt-6 px-3">
            <div className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">System</div>
            <button
              onClick={() => setActiveView('admin')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeView === 'admin'
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              style={activeView === 'admin' ? { backgroundColor: 'var(--primary, #de1e3b)' } : {}}
            >
              <ShieldAlert className={`w-5 h-5 ${activeView === 'admin' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="font-medium">Admin Panel</span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button className="flex items-center space-x-3 px-4 py-3 w-full hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;