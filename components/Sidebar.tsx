
import React from 'react';
import { LayoutDashboard, FolderKanban, CheckSquare, Clapperboard, DollarSign, Users, PieChart, Settings, Hexagon, Building2, Layers, Network, ShieldAlert, Share2, X } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  currentUserRole?: UserRole;
  isSidebarOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, currentUserRole, isSidebarOpen = false, onClose }) => {
  const { checkPermission } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    { id: 'clients', label: 'Clients', icon: Building2, visible: checkPermission('projects.view_own') || checkPermission('projects.view_all') },
    { id: 'projects', label: 'Projects', icon: FolderKanban, visible: checkPermission('projects.view_own') || checkPermission('projects.view_all') },
    { id: 'tasks', label: 'Tasks & Workflow', icon: CheckSquare, visible: checkPermission('tasks.view_own') || checkPermission('tasks.view_all') },
    { id: 'posting', label: 'Posting & Captions', icon: Share2, visible: checkPermission('social.view') || currentUserRole === UserRole.SOCIAL_MANAGER || currentUserRole === UserRole.GENERAL_MANAGER },
    { id: 'assets', label: 'Assets', icon: Layers, visible: checkPermission('files.view_own') || checkPermission('files.view_all') }, 
    { id: 'production', label: 'Production Hub', icon: Clapperboard, visible: checkPermission('production.view') },
    { id: 'network', label: 'Network', icon: Network, visible: checkPermission('production.view') },
    { id: 'finance', label: 'Finance', icon: DollarSign, visible: checkPermission('finance.view') },
    { id: 'hr', label: 'Team & HR', icon: Users, visible: checkPermission('admin.manage_users') },
    { id: 'analytics', label: 'Reports', icon: PieChart, visible: checkPermission('analytics.view') },
  ];

  const showAdmin = checkPermission('admin.view_console');

  return (
    // We use style attribute to leverage CSS variables set in App.tsx for dynamic theming
    <aside 
      className={`
        w-64 flex flex-col h-screen fixed left-0 top-0 border-r border-white/10 z-40 
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      style={{ backgroundColor: 'var(--sidebar-bg, #0f172a)', borderColor: 'var(--sidebar-border, #1e293b)' }}
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

      <div className="p-6 flex items-center space-x-3 border-b border-white/10">
        <Hexagon className="w-8 h-8 fill-current text-[var(--primary)]" style={{ color: 'var(--primary, #4f46e5)' }} />
        <span className="text-xl font-bold text-white tracking-tight">IRIS <span style={{ color: 'var(--primary, #4f46e5)' }}>OS</span></span>
      </div>

      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1 px-3">
          {menuItems.filter(item => item.visible).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={isActive ? { backgroundColor: 'var(--primary, #4f46e5)' } : {}}
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeView === 'admin'
                      ? 'text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={activeView === 'admin' ? { backgroundColor: 'var(--primary, #4f46e5)' } : {}}
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