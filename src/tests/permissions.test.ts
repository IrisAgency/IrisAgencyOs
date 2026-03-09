/**
 * Permission System Unit Tests
 *
 * Tests for lib/permissions.ts — the core RBAC engine (744 lines, 160+ keys).
 * Covers: can(), scope hierarchy, admin bypass, dependency validation,
 * getAllPermissions(), getPermissionsByModule(), and dangerous permissions.
 */
import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  PermissionScope,
  can,
  canViewClient,
  canViewProject,
  canViewTask,
  canEditTask,
  canViewFinance,
  validatePermissionSet,
  getAllPermissions,
  getPermissionsByModule,
  DANGEROUS_PERMISSIONS,
} from '../../lib/permissions';
import type { ScopeContext } from '../../lib/permissions';
import type { User } from '../../types';

// ─── Test Helpers ────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@iris.agency',
    role: 'Designer',
    department: 'Design',
    status: 'active',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  } as User;
}

// ─── can() — Core Permission Function ────────

describe('can()', () => {
  it('returns false for null user', () => {
    expect(can(null, PERMISSIONS.TASKS.VIEW_ALL, ['tasks.view.all'])).toBe(false);
  });

  it('returns false for empty permissionKey', () => {
    const user = makeUser();
    expect(can(user, '', ['tasks.view.all'])).toBe(false);
  });

  it('returns true when user has exact permission', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_ALL, ['tasks.view.all'])).toBe(true);
  });

  it('returns false when user lacks the permission', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_ALL, ['tasks.create'])).toBe(false);
  });

  it('returns true for admin bypass (isAdmin = true)', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.DELETE, [], undefined, true)).toBe(true);
  });

  it('admin bypass works even with empty permission array', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.CLIENTS.DELETE, [], undefined, true)).toBe(true);
  });

  it('returns true for no-scope permission without context', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.CREATE, ['tasks.create'])).toBe(true);
  });
});

// ─── Scope Hierarchy ─────────────────────────

describe('scope hierarchy', () => {
  it('tasks.view.all covers tasks.view.own', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_OWN, ['tasks.view.all'])).toBe(true);
  });

  it('tasks.view.all covers tasks.view.dept', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_DEPT, ['tasks.view.all'])).toBe(true);
  });

  it('tasks.view.dept covers tasks.view.own', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_OWN, ['tasks.view.dept'])).toBe(true);
  });

  it('tasks.view.own does NOT cover tasks.view.dept', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_DEPT, ['tasks.view.own'])).toBe(false);
  });

  it('tasks.view.own does NOT cover tasks.view.all', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.VIEW_ALL, ['tasks.view.own'])).toBe(false);
  });

  it('tasks.edit.all covers tasks.edit.own', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.TASKS.EDIT_OWN, ['tasks.edit.all'])).toBe(true);
  });

  it('clients.view.all covers clients.view.own', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.CLIENTS.VIEW_OWN, ['clients.view.all'])).toBe(true);
  });

  it('hr.leave.view.all covers hr.leave.view.own', () => {
    const user = makeUser();
    expect(can(user, PERMISSIONS.HR.LEAVE_VIEW_OWN, ['hr.leave.view.all'])).toBe(true);
  });
});

// ─── Scope Context Checks ────────────────────

describe('scope context — OWN', () => {
  it('OWN scope passes when user is ownerId', () => {
    const user = makeUser({ id: 'user-1' });
    const ctx: ScopeContext = { ownerId: 'user-1' };
    expect(can(user, PERMISSIONS.TASKS.VIEW_OWN, ['tasks.view.own'], ctx)).toBe(true);
  });

  it('OWN scope passes when user is assigneeId', () => {
    const user = makeUser({ id: 'user-1' });
    const ctx: ScopeContext = { assigneeId: 'user-1' };
    expect(can(user, PERMISSIONS.TASKS.VIEW_OWN, ['tasks.view.own'], ctx)).toBe(true);
  });

  it('OWN scope passes when user is in assigneeIds', () => {
    const user = makeUser({ id: 'user-1' });
    const ctx: ScopeContext = { assigneeIds: ['user-2', 'user-1'] };
    expect(can(user, PERMISSIONS.TASKS.VIEW_OWN, ['tasks.view.own'], ctx)).toBe(true);
  });

  it('OWN scope fails when user is not owner/assignee', () => {
    const user = makeUser({ id: 'user-1' });
    const ctx: ScopeContext = { ownerId: 'user-2', assigneeIds: ['user-3'] };
    expect(can(user, PERMISSIONS.TASKS.VIEW_OWN, ['tasks.view.own'], ctx)).toBe(false);
  });
});

describe('scope context — DEPT', () => {
  it('DEPT scope passes when departments match', () => {
    const user = makeUser({ id: 'user-1', department: 'Design' });
    const ctx: ScopeContext = { department: 'Design' };
    expect(can(user, PERMISSIONS.TASKS.VIEW_DEPT, ['tasks.view.dept'], ctx)).toBe(true);
  });

  it('DEPT scope passes when user is also owner (falls through to own check)', () => {
    const user = makeUser({ id: 'user-1', department: 'Design' });
    const ctx: ScopeContext = { ownerId: 'user-1', department: 'Marketing' };
    expect(can(user, PERMISSIONS.TASKS.VIEW_DEPT, ['tasks.view.dept'], ctx)).toBe(true);
  });

  it('DEPT scope fails when departments differ and user is not owner', () => {
    const user = makeUser({ id: 'user-1', department: 'Design' });
    const ctx: ScopeContext = { ownerId: 'user-2', department: 'Marketing' };
    expect(can(user, PERMISSIONS.TASKS.VIEW_DEPT, ['tasks.view.dept'], ctx)).toBe(false);
  });
});

describe('scope context — PROJECT', () => {
  it('PROJECT scope passes when user is a project member', () => {
    const user = makeUser({ id: 'user-1' });
    const ctx: ScopeContext = { projectMembers: ['user-1', 'user-3'] };
    expect(can(user, PERMISSIONS.TASKS.VIEW_PROJECT, ['tasks.view.project'], ctx)).toBe(true);
  });

  it('PROJECT scope fails when user is not a project member and not owner', () => {
    const user = makeUser({ id: 'user-1' });
    const ctx: ScopeContext = { projectMembers: ['user-2'], ownerId: 'user-2' };
    expect(can(user, PERMISSIONS.TASKS.VIEW_PROJECT, ['tasks.view.project'], ctx)).toBe(false);
  });
});

describe('scope context — ALL', () => {
  it('ALL scope always passes regardless of context', () => {
    const user = makeUser({ id: 'user-1', department: 'Design' });
    const ctx: ScopeContext = { ownerId: 'user-2', department: 'Marketing', projectMembers: ['user-3'] };
    expect(can(user, PERMISSIONS.TASKS.VIEW_ALL, ['tasks.view.all'], ctx)).toBe(true);
  });
});

// ─── Helper Functions ────────────────────────

describe('canViewTask()', () => {
  it('returns true for admin', () => {
    const user = makeUser();
    expect(canViewTask(user, ['tasks.view.all'], true, {} as any)).toBe(true);
  });

  it('returns true when user has VIEW_ALL', () => {
    const user = makeUser();
    expect(canViewTask(user, ['tasks.view.all'], false, {} as any)).toBe(true);
  });
});

describe('canViewClient()', () => {
  it('returns true when user has clients.view.all', () => {
    const user = makeUser();
    expect(canViewClient(user, ['clients.view.all'], false, {} as any)).toBe(true);
  });
});

describe('canViewProject()', () => {
  it('returns true when user has projects.view.all', () => {
    const user = makeUser();
    expect(canViewProject(user, ['projects.view.all'], false, {} as any)).toBe(true);
  });
});

describe('canViewFinance()', () => {
  it('returns true when user has finance.view.all', () => {
    const user = makeUser();
    expect(canViewFinance(user, ['finance.view.all'], false, {} as any)).toBe(true);
  });
});

// ─── Permission Catalog ──────────────────────

describe('getAllPermissions()', () => {
  it('returns a non-empty array of strings', () => {
    const perms = getAllPermissions();
    expect(Array.isArray(perms)).toBe(true);
    expect(perms.length).toBeGreaterThan(100); // 160+ keys expected
    expect(perms.every(p => typeof p === 'string')).toBe(true);
  });

  it('contains no duplicates', () => {
    const perms = getAllPermissions();
    const unique = new Set(perms);
    expect(unique.size).toBe(perms.length);
  });

  it('includes expected permissions', () => {
    const perms = new Set(getAllPermissions());
    expect(perms.has('tasks.view.own')).toBe(true);
    expect(perms.has('tasks.create')).toBe(true);
    expect(perms.has('clients.view.all')).toBe(true);
    expect(perms.has('finance.create_invoice')).toBe(true);
    expect(perms.has('hr.leave.create')).toBe(true);
  });
});

describe('getPermissionsByModule()', () => {
  it('returns a non-empty object with array values', () => {
    const groups = getPermissionsByModule();
    expect(typeof groups).toBe('object');
    expect(Object.keys(groups).length).toBeGreaterThan(10);
    for (const [, perms] of Object.entries(groups)) {
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
    }
  });

  it('covers all major modules', () => {
    const groups = getPermissionsByModule();
    const keys = Object.keys(groups);
    expect(keys).toContain('Tasks');
    expect(keys).toContain('Clients');
    expect(keys).toContain('Projects');
    expect(keys).toContain('Finance');
    expect(keys).toContain('HR & Team');
  });
});

// ─── Dangerous Permissions ───────────────────

describe('DANGEROUS_PERMISSIONS', () => {
  it('is a non-empty Set', () => {
    expect(DANGEROUS_PERMISSIONS).toBeInstanceOf(Set);
    expect(DANGEROUS_PERMISSIONS.size).toBeGreaterThan(5);
  });

  it('contains expected high-risk permissions', () => {
    expect(DANGEROUS_PERMISSIONS.has(PERMISSIONS.ROLES.DELETE)).toBe(true);
    expect(DANGEROUS_PERMISSIONS.has(PERMISSIONS.CLIENTS.DELETE)).toBe(true);
    expect(DANGEROUS_PERMISSIONS.has(PERMISSIONS.TASKS.DELETE)).toBe(true);
    expect(DANGEROUS_PERMISSIONS.has(PERMISSIONS.HR.CONFIDENTIAL_VIEW)).toBe(true);
  });

  it('does not contain safe permissions', () => {
    expect(DANGEROUS_PERMISSIONS.has(PERMISSIONS.TASKS.VIEW_ALL)).toBe(false);
    expect(DANGEROUS_PERMISSIONS.has(PERMISSIONS.TASKS.CREATE)).toBe(false);
  });
});

// ─── Dependency Validation ───────────────────

describe('validatePermissionSet()', () => {
  it('returns valid for an empty set', () => {
    const result = validatePermissionSet([]);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('returns valid for a well-formed set with dependencies met', () => {
    const result = validatePermissionSet([
      'tasks.view.all',
      'tasks.approve',
    ]);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it('warns when approve is present without view', () => {
    const result = validatePermissionSet([
      'tasks.approve',
    ]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.permission === 'tasks.approve')).toBe(true);
  });

  it('warns when delete is present without edit', () => {
    const result = validatePermissionSet([
      'tasks.delete',
    ]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.permission === 'tasks.delete')).toBe(true);
  });

  it('errors on unknown permission keys', () => {
    const result = validatePermissionSet(['fake.permission.key']);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].permission).toBe('fake.permission.key');
  });

  it('validates HR dependency: leave.approve requires leave.view', () => {
    const result = validatePermissionSet([
      'hr.leave.approve',
    ]);
    expect(result.warnings.some(w => w.permission === 'hr.leave.approve')).toBe(true);
  });

  it('no warning when HR dependency is met', () => {
    const result = validatePermissionSet([
      'hr.leave.approve',
      'hr.leave.view.all',
    ]);
    expect(result.warnings.some(w => w.permission === 'hr.leave.approve')).toBe(false);
  });
});
