/**
 * Navigation hook — bridges legacy setActiveView() calls with React Router.
 *
 * During the migration, components that still call setActiveView('tasks') will
 * work seamlessly because this hook maps viewKeys to URL paths.
 *
 * Usage:
 *   const { navigateTo, activeView } = useAppNavigation();
 *   navigateTo('tasks');           // navigates to /tasks
 *   navigateTo('projects', 'p1'); // navigates to /projects and sets target
 */
import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { viewKeyToPath, pathToViewKey } from '../routes';
import { useUIStore } from '../stores/useUIStore';

export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const setTargetProjectId = useUIStore(s => s.setActiveView); // will use proper setter
  const uiStore = useUIStore();

  /** Derive activeView from current URL path */
  const activeView = useMemo(() => {
    const path = location.pathname;
    return pathToViewKey[path] || 'dashboard';
  }, [location.pathname]);

  /** Navigate by viewKey (backwards-compatible with old setActiveView calls) */
  const navigateTo = useCallback(
    (viewKey: string, targetId?: string) => {
      const path = viewKeyToPath[viewKey] || '/';
      navigate(path);

      // Handle target IDs for deep-linking
      if (viewKey === 'projects' && targetId) {
        uiStore.setActiveView(viewKey);
        useUIStore.setState({ targetProjectId: targetId });
      }
      if (viewKey === 'tasks' && targetId) {
        useUIStore.setState({ targetTaskId: targetId });
      }
    },
    [navigate, uiStore],
  );

  /** Navigate to a specific task (opens overlay) */
  const navigateToTask = useCallback(
    (taskId: string) => {
      useUIStore.setState({ targetTaskId: taskId });
    },
    [],
  );

  /** Navigate to a project */
  const openProject = useCallback(
    (projectId: string) => {
      useUIStore.setState({ targetProjectId: projectId });
      navigate('/projects');
    },
    [navigate],
  );

  return {
    activeView,
    navigateTo,
    navigateToTask,
    openProject,
    currentPath: location.pathname,
  };
}
