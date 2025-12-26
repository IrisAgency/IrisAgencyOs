/**
 * Permission Gate Components - UI-level permission enforcement
 * 
 * These components hide/show UI elements based on permissions.
 * IMPORTANT: These are NOT a security measure - they only control visibility.
 * All actual security must be enforced server-side.
 */

import React, { ReactNode } from 'react';
import { usePermission, useAnyPermission } from '../hooks/usePermissions';
import { ScopeContext } from '../lib/permissions';

interface PermissionGateProps {
  children: ReactNode;
  permission: string;
  context?: ScopeContext;
  fallback?: ReactNode;
}

/**
 * Render children only if user has permission
 * 
 * Usage:
 * ```tsx
 * <PermissionGate permission="tasks.create">
 *   <button>Create Task</button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ children, permission, context, fallback = null }: PermissionGateProps) {
  const hasPermission = usePermission(permission, context);
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

interface AnyPermissionGateProps {
  children: ReactNode;
  permissions: string[];
  context?: ScopeContext;
  fallback?: ReactNode;
}

/**
 * Render children if user has ANY of the permissions
 * 
 * Usage:
 * ```tsx
 * <AnyPermissionGate permissions={['tasks.view.own', 'tasks.view.dept', 'tasks.view.all']}>
 *   <TaskList />
 * </AnyPermissionGate>
 * ```
 */
export function AnyPermissionGate({ children, permissions, context, fallback = null }: AnyPermissionGateProps) {
  const hasAnyPermission = useAnyPermission(permissions, context);
  
  return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
}

interface RequirePermissionProps {
  children: ReactNode;
  permission: string;
  context?: ScopeContext;
  onDenied?: () => void;
}

/**
 * Higher-order wrapper that enforces permission
 * Shows nothing if permission denied (stricter than PermissionGate)
 * 
 * Usage:
 * ```tsx
 * <RequirePermission 
 *   permission="admin.settings.edit"
 *   onDenied={() => navigate('/dashboard')}
 * >
 *   <AdminSettings />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({ children, permission, context, onDenied }: RequirePermissionProps) {
  const hasPermission = usePermission(permission, context);
  
  React.useEffect(() => {
    if (!hasPermission && onDenied) {
      onDenied();
    }
  }, [hasPermission, onDenied]);
  
  if (!hasPermission) {
    return null;
  }
  
  return <>{children}</>;
}

interface ConditionalRenderProps {
  when: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Generic conditional renderer (not permission-specific but useful)
 * 
 * Usage:
 * ```tsx
 * <ConditionalRender when={isOwner || canEditAll}>
 *   <EditButton />
 * </ConditionalRender>
 * ```
 */
export function ConditionalRender({ when, children, fallback = null }: ConditionalRenderProps) {
  return when ? <>{children}</> : <>{fallback}</>;
}
