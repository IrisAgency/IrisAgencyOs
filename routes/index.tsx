/**
 * Application route definitions.
 * Maps path strings to lazy-loaded view components and metadata.
 */
import React, { lazy, Suspense } from 'react';

// Lazy-load all hub components
const Dashboard = lazy(() => import('../components/Dashboard'));
const ClientsHub = lazy(() => import('../components/ClientsHub'));
const ProjectsHub = lazy(() => import('../components/ProjectsHub'));
const TasksHub = lazy(() => import('../components/TasksHub'));
const PostingHub = lazy(() => import('../components/PostingHub'));
const CalendarHub = lazy(() => import('../components/CalendarHub'));
const CreativeDirectionHub = lazy(() => import('../components/CreativeDirectionHub'));
const QualityControlHub = lazy(() => import('../components/QualityControlHub'));
const FilesHub = lazy(() => import('../components/FilesHub'));
const ProductionHub = lazy(() => import('../components/ProductionHub'));
const VendorsHub = lazy(() => import('../components/VendorsHub'));
const FinanceHub = lazy(() => import('../components/FinanceHub'));
const TeamHub = lazy(() => import('../components/TeamHub'));
const UnifiedCalendar = lazy(() => import('../components/UnifiedCalendar'));
const AnalyticsHub = lazy(() => import('../components/AnalyticsHub'));
const NotificationsHub = lazy(() => import('../components/NotificationsHub'));
const AdminHub = lazy(() => import('../components/AdminHub'));

export interface RouteDefinition {
  /** URL path segment (no leading slash for children) */
  path: string;
  /** The activeView key used by Sidebar (for backwards compat) */
  viewKey: string;
  /** Display label */
  label: string;
  /** Lazy component */
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  /** Permission key required (null = any authenticated user) */
  permission?: string | null;
}

/**
 * All application routes.
 * Order matters for route matching — more specific paths first.
 */
export const routes: RouteDefinition[] = [
  { path: '/', viewKey: 'dashboard', label: 'Dashboard', component: Dashboard },
  { path: '/clients', viewKey: 'clients', label: 'Clients', component: ClientsHub },
  { path: '/projects', viewKey: 'projects', label: 'Projects', component: ProjectsHub },
  { path: '/tasks', viewKey: 'tasks', label: 'Tasks', component: TasksHub },
  { path: '/posting', viewKey: 'posting', label: 'Posting', component: PostingHub, permission: 'posting.view_dept' },
  { path: '/calendar', viewKey: 'calendar', label: 'Calendar', component: CalendarHub, permission: 'calendar.view' },
  { path: '/creative', viewKey: 'creative', label: 'Creative', component: CreativeDirectionHub, permission: 'creative.view' },
  { path: '/quality-control', viewKey: 'quality-control', label: 'Quality Control', component: QualityControlHub, permission: 'qc.view' },
  { path: '/assets', viewKey: 'assets', label: 'Assets', component: FilesHub },
  { path: '/production', viewKey: 'production', label: 'Production', component: ProductionHub, permission: 'production.view' },
  { path: '/network', viewKey: 'network', label: 'Network', component: VendorsHub },
  { path: '/finance', viewKey: 'finance', label: 'Finance', component: FinanceHub, permission: 'finance.view_own' },
  { path: '/hr', viewKey: 'hr', label: 'HR', component: TeamHub },
  { path: '/schedule', viewKey: 'schedule', label: 'Schedule', component: UnifiedCalendar },
  { path: '/analytics', viewKey: 'analytics', label: 'Analytics', component: AnalyticsHub },
  { path: '/notifications', viewKey: 'notifications', label: 'Notifications', component: NotificationsHub },
  { path: '/admin', viewKey: 'admin', label: 'Admin', component: AdminHub, permission: 'roles.view' },
];

/**
 * Map viewKey → path for programmatic navigation.
 */
export const viewKeyToPath: Record<string, string> = Object.fromEntries(
  routes.map(r => [r.viewKey, r.path]),
);

/**
 * Map path → viewKey for sidebar active state.
 */
export const pathToViewKey: Record<string, string> = Object.fromEntries(
  routes.map(r => [r.path, r.viewKey]),
);

/**
 * Fallback loading spinner for Suspense boundaries.
 */
export const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);
