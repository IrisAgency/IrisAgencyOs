/**
 * Permission Hooks - React hooks for permission checking in UI
 */

import { useAuth } from '../contexts/AuthContext';
import { can, ScopeContext } from '../lib/permissions';

/**
 * Hook to check if current user has a permission
 * 
 * Usage:
 * ```tsx
 * const canEdit = usePermission('tasks.edit.own', { assigneeId: task.assignedTo });
 * const canViewAll = usePermission('clients.view.all');
 * ```
 */
export function usePermission(permissionKey: string, context?: ScopeContext): boolean {
  const { currentUser, userPermissions } = useAuth();
  
  if (!currentUser || !userPermissions) return false;
  
  return can(currentUser, permissionKey, userPermissions, context);
}

/**
 * Hook to check multiple permissions (OR logic)
 * Returns true if user has ANY of the permissions
 * 
 * Usage:
 * ```tsx
 * const canView = useAnyPermission([
 *   'tasks.view.own',
 *   'tasks.view.dept',
 *   'tasks.view.all'
 * ]);
 * ```
 */
export function useAnyPermission(permissionKeys: string[], context?: ScopeContext): boolean {
  const { currentUser, userPermissions } = useAuth();
  
  if (!currentUser || !userPermissions) return false;
  
  return permissionKeys.some(key => can(currentUser, key, userPermissions, context));
}

/**
 * Hook to check multiple permissions (AND logic)
 * Returns true only if user has ALL of the permissions
 * 
 * Usage:
 * ```tsx
 * const canManageTask = useAllPermissions([
 *   'tasks.edit.dept',
 *   'tasks.assign.dept'
 * ]);
 * ```
 */
export function useAllPermissions(permissionKeys: string[], context?: ScopeContext): boolean {
  const { currentUser, userPermissions } = useAuth();
  
  if (!currentUser || !userPermissions) return false;
  
  return permissionKeys.every(key => can(currentUser, key, userPermissions, context));
}

/**
 * Hook to get permission checking function
 * Useful when you need to check permissions dynamically
 * 
 * Usage:
 * ```tsx
 * const checkPermission = usePermissionCheck();
 * const canEdit = checkPermission('tasks.edit.own', { assigneeId: userId });
 * ```
 */
export function usePermissionCheck() {
  const { currentUser, userPermissions } = useAuth();
  
  return (permissionKey: string, context?: ScopeContext): boolean => {
    if (!currentUser || !userPermissions) return false;
    return can(currentUser, permissionKey, userPermissions, context);
  };
}
