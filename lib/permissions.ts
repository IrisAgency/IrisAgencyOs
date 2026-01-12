/**
 * IRIS Agency OS - Permission System
 * 
 * This is the single source of truth for all permissions in the system.
 * Every action in every module must map to a permission key.
 * 
 * Format: module.action.scope
 * - module: the feature area (tasks, clients, projects, etc.)
 * - action: what you're doing (view, create, edit, delete, etc.)
 * - scope: who/what you can affect (own, dept, project, all)
 */

import { User, Department, UserRole } from '../types';

// ============================================================================
// PERMISSION CATALOG - Single Source of Truth
// ============================================================================

export const PERMISSIONS = {
  // ========== Auth & Users ==========
  AUTH: {
    LOGIN: 'auth.login',
  },
  USERS: {
    VIEW_ALL: 'users.view.all',
    CREATE: 'users.create',
    EDIT: 'users.edit',
    DISABLE: 'users.disable',
    FORCE_PASSWORD_RESET: 'users.force_password_reset',
  },

  // ========== Roles & Permissions (Admin) ==========
  ROLES: {
    VIEW: 'roles.view',
    CREATE: 'roles.create',
    EDIT: 'roles.edit',
    DELETE: 'roles.delete',
    ASSIGN: 'roles.assign',
  },
  PERMISSIONS_ADMIN: {
    VIEW: 'permissions.view',
    MANAGE: 'permissions.manage',
  },

  // ========== Departments ==========
  DEPARTMENTS: {
    VIEW: 'departments.view',
    CREATE: 'departments.create',
    EDIT: 'departments.edit',
    DELETE: 'departments.delete',
    ASSIGN_MEMBERS: 'departments.assign_members',
  },

  // ========== Clients ==========
  CLIENTS: {
    VIEW_OWN: 'clients.view.own',
    VIEW_DEPT: 'clients.view.dept',
    VIEW_ALL: 'clients.view.all',
    CREATE: 'clients.create',
    EDIT: 'clients.edit',
    ARCHIVE: 'clients.archive',
    DELETE: 'clients.delete',
  },
  CLIENT_NOTES: {
    VIEW: 'client.notes.view',
    CREATE: 'client.notes.create',
    EDIT: 'client.notes.edit',
    DELETE: 'client.notes.delete',
  },
  CLIENT_MEETINGS: {
    VIEW: 'client.meetings.view',
    CREATE: 'client.meetings.create',
    EDIT: 'client.meetings.edit',
    DELETE: 'client.meetings.delete',
  },
  CLIENT_BRAND_ASSETS: {
    VIEW: 'client.brand_assets.view',
    MANAGE: 'client.brand_assets.manage',
  },
  CLIENT_MARKETING: {
    VIEW: 'client.marketing_strategies.view',
    MANAGE: 'client.marketing_strategies.manage',
  },

  // ========== Projects & Milestones ==========
  PROJECTS: {
    VIEW_OWN: 'projects.view.own',
    VIEW_DEPT: 'projects.view.dept',
    VIEW_ALL: 'projects.view.all',
    CREATE: 'projects.create',
    EDIT_OWN: 'projects.edit.own',
    EDIT_DEPT: 'projects.edit.dept',
    EDIT_ALL: 'projects.edit.all',
    EDIT: 'projects.edit', // Kept for backward compatibility
    ARCHIVE: 'projects.archive',
    DELETE: 'projects.delete',
  },
  MILESTONES: {
    VIEW: 'milestones.view',
    CREATE: 'milestones.create',
    EDIT: 'milestones.edit',
    DELETE: 'milestones.delete',
  },

  // ========== Tasks & Workflow ==========
  TASKS: {
    VIEW_ALL: 'tasks.view.all',
    VIEW_DEPT: 'tasks.view.dept',
    VIEW_PROJECT: 'tasks.view.project',
    VIEW_OWN: 'tasks.view.own',
    CREATE: 'tasks.create',
    EDIT_ALL: 'tasks.edit.all',
    EDIT_DEPT: 'tasks.edit.dept',
    EDIT_OWN: 'tasks.edit.own',
    DELETE: 'tasks.delete',
    ASSIGN_ALL: 'tasks.assign.all',
    ASSIGN_DEPT: 'tasks.assign.dept',
    MANAGE_ASSIGNEES: 'tasks.manage_assignees',
    MANAGE_PUBLISHING: 'tasks.manage_publishing',
    REOPEN: 'tasks.reopen',
    EDIT_COMPLETED: 'tasks.edit_completed',
    
    // References
    REFERENCES_VIEW: 'tasks.references.view',
    REFERENCES_ADD: 'tasks.references.add',
    REFERENCES_DELETE: 'tasks.references.delete',
  },
  TASK_FILES: {
    UPLOAD: 'task_files.upload',
    DELETE: 'task_files.delete',
    VIEW: 'task_files.view',
  },

  // ========== Approvals ==========
  APPROVALS: {
    VIEW_OWN: 'approvals.view.own',
    VIEW_DEPT: 'approvals.view.dept',
    VIEW_ALL: 'approvals.view.all',
    ACT: 'approvals.act', // approve/reject/revision
    CONFIGURE: 'approvals.configure', // workflow builder
  },

  // ========== Posting & Captions ==========
  POSTING: {
    VIEW_DEPT: 'posting.view.dept',
    VIEW_ALL: 'posting.view.all',
    CREATE: 'posting.create',
    EDIT: 'posting.edit',
    ASSIGN: 'posting.assign',
    SUBMIT_FOR_REVIEW: 'posting.submit_for_review',
    REQUEST_REVISION: 'posting.request_revision',
    APPROVE: 'posting.approve',
    SCHEDULE: 'posting.schedule',
    MARK_PUBLISHED: 'posting.mark_published',
    ARCHIVE: 'posting.archive',
    DELETE: 'posting.delete',
  },

  // ========== Files & Assets ==========
  ASSETS: {
    VIEW_DEPT: 'assets.view.dept',
    VIEW_ALL: 'assets.view.all',
    UPLOAD: 'assets.upload',
    EDIT_METADATA: 'assets.edit_metadata',
    DELETE: 'assets.delete',
    LINK_TO_TASK: 'assets.link_to_task',
    ARCHIVE: 'assets.archive',
  },

  // ========== Production Hub ==========
  PRODUCTION: {
    VIEW: 'production.view',
    CREATE: 'production.create',
    EDIT: 'production.edit',
    ASSIGN_CREW: 'production.assign_crew',
    SCHEDULE: 'production.schedule',
    CLOSE_JOB: 'production.close_job',
    DELETE: 'production.delete',
  },

  // ========== Vendors & Freelancers ==========
  VENDORS: {
    VIEW: 'vendors.view',
    CREATE: 'vendors.create',
    EDIT: 'vendors.edit',
    DELETE: 'vendors.delete',
    ASSIGN_TO_PROJECT: 'vendors.assign_to_project',
  },

  // ========== Finance ==========
  FINANCE: {
    VIEW_OWN: 'finance.view.own',
    VIEW_PROJECT: 'finance.view.project',
    VIEW_ALL: 'finance.view.all',
    CREATE_INVOICE: 'finance.create_invoice',
    EDIT_INVOICE: 'finance.edit_invoice',
    DELETE_INVOICE: 'finance.delete_invoice',
    RECORD_PAYMENT: 'finance.record_payment',
    APPROVE_PAYMENT: 'finance.approve_payment',
    EXPORT: 'finance.export',
    MANAGE_BUDGETS: 'finance.manage_budgets',
  },

  // ========== Analytics & Reports ==========
  REPORTS: {
    VIEW_DEPT: 'reports.view.dept',
    VIEW_ALL: 'reports.view.all',
    EXPORT: 'reports.export',
  },
  ANALYTICS: {
    VIEW_DEPT: 'analytics.view.dept',
    VIEW_ALL: 'analytics.view.all',
  },

  // ========== Admin Branding ==========
  ADMIN_BRANDING: {
    VIEW: 'admin.branding.view',
    EDIT: 'admin.branding.edit',
    UPLOAD_ASSETS: 'admin.branding.upload_assets',
  },

  // ========== System Settings ==========
  ADMIN_SETTINGS: {
    VIEW: 'admin.settings.view',
    EDIT: 'admin.settings.edit',
  },

  // ========== Dashboard ==========
  DASHBOARD: {
    VIEW_GM_URGENT: 'dashboard.view_gm_urgent',
  },

  // ========== Notes ==========
  NOTES: {
    CREATE: 'notes.create',
    EDIT_OWN: 'notes.edit_own',
    DELETE_OWN: 'notes.delete_own',
    MANAGE_ALL: 'notes.manage_all',
  },

  // ========== Calendar ==========
  CALENDAR: {
    VIEW: 'calendar.view',
    MANAGE: 'calendar.manage',
  },
  CALENDAR_MONTHS: {
    CREATE: 'calendar.months.create',
    EDIT: 'calendar.months.edit',
    DELETE: 'calendar.months.delete',
  },
  CALENDAR_ITEMS: {
    CREATE: 'calendar.items.create',
    EDIT: 'calendar.items.edit',
    DELETE: 'calendar.items.delete',
  },
} as const;

// ============================================================================
// PERMISSION SCOPES
// ============================================================================

export enum PermissionScope {
  OWN = 'own',       // Only resources owned/assigned to the user
  DEPT = 'dept',     // Resources within the user's department
  PROJECT = 'project', // Resources within projects user is assigned to
  ALL = 'all',       // All resources (no restrictions)
}

// ============================================================================
// SCOPE CONTEXT - What we need to check scope against
// ============================================================================

export interface ScopeContext {
  ownerId?: string;           // Who owns this resource
  assigneeId?: string;        // Who is assigned to this resource
  assigneeIds?: string[];     // Multiple assignees
  department?: Department;    // Department of the resource
  projectId?: string;         // Project this resource belongs to
  projectMembers?: string[];  // Members of the project
  clientId?: string;          // Client this belongs to
}

// ============================================================================
// CORE PERMISSION CHECKING FUNCTION
// ============================================================================

/**
 * Check if a user has a specific permission with scope validation
 * 
 * This is the SINGLE function used throughout the system for permission checks.
 * 
 * @param user - The user to check permissions for
 * @param permissionKey - The permission to check (e.g., 'tasks.view.own')
 * @param userPermissions - Array of permission keys the user has
 * @param context - Optional scope context for own/dept/project checks
 * @returns true if user has permission and scope matches
 */
export function can(
  user: User | null,
  permissionKey: string,
  userPermissions: string[],
  context?: ScopeContext
): boolean {
  if (!user || !permissionKey) return false;

  // Check if user has the exact permission
  if (userPermissions.includes(permissionKey)) {
    // If no context provided, permission is granted
    if (!context) return true;

    // Parse permission to check scope
    const parts = permissionKey.split('.');
    const scope = parts[parts.length - 1] as PermissionScope;

    // Check scope-based access
    switch (scope) {
      case PermissionScope.OWN:
        return checkOwnScope(user, context);
      
      case PermissionScope.DEPT:
        return checkDeptScope(user, context);
      
      case PermissionScope.PROJECT:
        return checkProjectScope(user, context);
      
      case PermissionScope.ALL:
        return true; // All scope always passes
      
      default:
        // No scope suffix means global permission
        return true;
    }
  }

  // Check for higher-level permissions
  // e.g., if user has tasks.view.all, they can do tasks.view.own and tasks.view.dept
  const higherPermission = checkHigherScopePermission(permissionKey, userPermissions);
  if (higherPermission) {
    return true;
  }

  return false;
}

/**
 * Check if user has a higher-level permission that covers the requested one
 * e.g., tasks.view.all covers tasks.view.own and tasks.view.dept
 */
function checkHigherScopePermission(requestedPermission: string, userPermissions: string[]): boolean {
  if (!requestedPermission) return false;
  const parts = requestedPermission.split('.');
  const scope = parts[parts.length - 1];

  // Define scope hierarchy (higher scopes include lower ones)
  const scopeHierarchy: Record<string, string[]> = {
    'own': ['dept', 'project', 'all'],
    'dept': ['all'],
    'project': ['all'],
    'all': []
  };

  // Check if user has a higher scope permission
  const higherScopes = scopeHierarchy[scope] || [];
  for (const higherScope of higherScopes) {
    const higherPermission = parts.slice(0, -1).join('.') + '.' + higherScope;
    if (userPermissions.includes(higherPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if resource belongs to user (OWN scope)
 */
function checkOwnScope(user: User, context: ScopeContext): boolean {
  if (context.ownerId && context.ownerId === user.id) return true;
  if (context.assigneeId && context.assigneeId === user.id) return true;
  if (context.assigneeIds && context.assigneeIds.includes(user.id)) return true;
  return false;
}

/**
 * Check if resource belongs to user's department (DEPT scope)
 */
function checkDeptScope(user: User, context: ScopeContext): boolean {
  // First check if it's own
  if (checkOwnScope(user, context)) return true;
  
  // Then check department match
  if (context.department && context.department === user.department) return true;
  
  return false;
}

/**
 * Check if user is part of the project (PROJECT scope)
 */
function checkProjectScope(user: User, context: ScopeContext): boolean {
  // First check if it's own
  if (checkOwnScope(user, context)) return true;
  
  // Then check project membership
  if (context.projectMembers && context.projectMembers.includes(user.id)) return true;
  
  return false;
}

// ============================================================================
// HELPER FUNCTIONS - Common Permission Patterns
// ============================================================================

/**
 * Check if user can view a specific client
 */
export function canViewClient(
  user: User | null,
  userPermissions: string[],
  clientDepartment?: Department,
  clientOwnerId?: string
): boolean {
  if (!user) return false;

  return (
    can(user, PERMISSIONS.CLIENTS.VIEW_ALL, userPermissions) ||
    can(user, PERMISSIONS.CLIENTS.VIEW_DEPT, userPermissions, { department: clientDepartment }) ||
    can(user, PERMISSIONS.CLIENTS.VIEW_OWN, userPermissions, { ownerId: clientOwnerId })
  );
}

/**
 * Check if user can view a specific project
 */
export function canViewProject(
  user: User | null,
  userPermissions: string[],
  projectDepartment?: Department,
  projectMembers?: string[]
): boolean {
  if (!user) return false;

  return (
    can(user, PERMISSIONS.PROJECTS.VIEW_ALL, userPermissions) ||
    can(user, PERMISSIONS.PROJECTS.VIEW_DEPT, userPermissions, { department: projectDepartment }) ||
    can(user, PERMISSIONS.PROJECTS.VIEW_OWN, userPermissions, { projectMembers })
  );
}

/**
 * Check if user can view a specific task
 */
export function canViewTask(
  user: User | null,
  userPermissions: string[],
  taskAssigneeId?: string,
  taskDepartment?: Department,
  taskProjectMembers?: string[]
): boolean {
  if (!user) return false;

  return (
    can(user, PERMISSIONS.TASKS.VIEW_ALL, userPermissions) ||
    can(user, PERMISSIONS.TASKS.VIEW_DEPT, userPermissions, { department: taskDepartment }) ||
    can(user, PERMISSIONS.TASKS.VIEW_PROJECT, userPermissions, { projectMembers: taskProjectMembers }) ||
    can(user, PERMISSIONS.TASKS.VIEW_OWN, userPermissions, { assigneeId: taskAssigneeId })
  );
}

/**
 * Check if user can edit a specific task
 */
export function canEditTask(
  user: User | null,
  userPermissions: string[],
  taskAssigneeId?: string,
  taskDepartment?: Department
): boolean {
  if (!user) return false;

  return (
    can(user, PERMISSIONS.TASKS.EDIT_ALL, userPermissions) ||
    can(user, PERMISSIONS.TASKS.EDIT_DEPT, userPermissions, { department: taskDepartment }) ||
    can(user, PERMISSIONS.TASKS.EDIT_OWN, userPermissions, { assigneeId: taskAssigneeId })
  );
}

/**
 * Check if user can view finance data
 */
export function canViewFinance(
  user: User | null,
  userPermissions: string[],
  ownerId?: string,
  projectMembers?: string[]
): boolean {
  if (!user) return false;

  return (
    can(user, PERMISSIONS.FINANCE.VIEW_ALL, userPermissions) ||
    can(user, PERMISSIONS.FINANCE.VIEW_PROJECT, userPermissions, { projectMembers }) ||
    can(user, PERMISSIONS.FINANCE.VIEW_OWN, userPermissions, { ownerId })
  );
}

/**
 * Get all permissions as a flat array (useful for role editor)
 */
export function getAllPermissions(): string[] {
  const allPermissions: string[] = [];
  
  function extractPermissions(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        allPermissions.push(obj[key]);
      } else if (typeof obj[key] === 'object') {
        extractPermissions(obj[key]);
      }
    }
  }
  
  extractPermissions(PERMISSIONS);
  return allPermissions;
}

/**
 * Group permissions by module for UI display
 */
export function getPermissionsByModule(): Record<string, string[]> {
  return {
    'Authentication': [PERMISSIONS.AUTH.LOGIN],
    'Users': Object.values(PERMISSIONS.USERS),
    'Roles': Object.values(PERMISSIONS.ROLES),
    'Permissions': Object.values(PERMISSIONS.PERMISSIONS_ADMIN),
    'Departments': Object.values(PERMISSIONS.DEPARTMENTS),
    'Clients': [...Object.values(PERMISSIONS.CLIENTS), ...Object.values(PERMISSIONS.CLIENT_NOTES), ...Object.values(PERMISSIONS.CLIENT_MEETINGS), ...Object.values(PERMISSIONS.CLIENT_BRAND_ASSETS), ...Object.values(PERMISSIONS.CLIENT_MARKETING)],
    'Projects': [...Object.values(PERMISSIONS.PROJECTS), ...Object.values(PERMISSIONS.MILESTONES)],
    'Tasks': [...Object.values(PERMISSIONS.TASKS), ...Object.values(PERMISSIONS.TASK_FILES)],
    'Approvals': Object.values(PERMISSIONS.APPROVALS),
    'Posting': Object.values(PERMISSIONS.POSTING),
    'Assets': Object.values(PERMISSIONS.ASSETS),
    'Production': Object.values(PERMISSIONS.PRODUCTION),
    'Vendors': Object.values(PERMISSIONS.VENDORS),
    'Finance': Object.values(PERMISSIONS.FINANCE),
    'Reports': Object.values(PERMISSIONS.REPORTS),
    'Analytics': Object.values(PERMISSIONS.ANALYTICS),
    'Admin Branding': Object.values(PERMISSIONS.ADMIN_BRANDING),
    'System Settings': Object.values(PERMISSIONS.ADMIN_SETTINGS),
    'Dashboard': Object.values(PERMISSIONS.DASHBOARD),
    'Notes': Object.values(PERMISSIONS.NOTES),
    'Calendar': [...Object.values(PERMISSIONS.CALENDAR), ...Object.values(PERMISSIONS.CALENDAR_MONTHS), ...Object.values(PERMISSIONS.CALENDAR_ITEMS)],
  };
}
