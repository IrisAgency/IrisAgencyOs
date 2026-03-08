# IRIS Agency OS — Permissions & RBAC Technical Guide

> **Single source of truth** for the IRIS Agency OS role-based access control system.
> Last updated: <!-- auto-update on generation -->

---

## Table of Contents

1. [Overview of Permission System](#1-overview-of-permission-system)
2. [Permission Architecture (File Map)](#2-permission-architecture-file-map)
3. [Built-in Roles](#3-built-in-roles)
4. [Permission Key Format](#4-permission-key-format)
5. [Permission Categories (Full Catalog)](#5-permission-categories-full-catalog)
6. [Scope Model](#6-scope-model)
7. [Core Permission Checking — `can()`](#7-core-permission-checking--can)
8. [React Permission Hooks](#8-react-permission-hooks)
9. [UI Permission Gates](#9-ui-permission-gates)
10. [Permission Enforcement Strategy](#10-permission-enforcement-strategy)
11. [Admin Permission Management](#11-admin-permission-management)
12. [Permission Synchronization](#12-permission-synchronization)
13. [Security Considerations](#13-security-considerations)
14. [Developer Guidelines](#14-developer-guidelines)
15. [Future Improvements](#15-future-improvements)
16. [Summary](#16-summary)

---

## 1. Overview of Permission System

IRIS Agency OS uses a **scope-aware, role-based access control (RBAC)** system. Every user is assigned a **role**, and each role is a named collection of **permission keys**. Permission keys follow the format `module.action.scope` and are checked at runtime through a single, deterministic function (`can()`).

### Design Principles

| Principle | Implementation |
|---|---|
| **Single source of truth** | `PERMISSIONS` constant in `lib/permissions.ts` defines every key. |
| **Scope hierarchy** | `OWN → DEPT → PROJECT → ALL` — higher scopes implicitly include lower ones. |
| **Additive-only sync** | When `DEFAULT_ROLES` in code gain new permissions, they are merged into Firestore roles without removing admin customizations. |
| **UI is advisory, not authoritative** | UI gates (`PermissionGate`, hooks) control *visibility*; Firestore rules and server logic control *access*. |
| **Admin autonomy** | The admin panel can create, edit, and delete roles in real-time via Firestore. |

---

## 2. Permission Architecture (File Map)

| File | Layer | Responsibility |
|---|---|---|
| `lib/permissions.ts` | **Core** | `PERMISSIONS` catalog, `PermissionScope` enum, `ScopeContext` interface, `can()` function (with `isAdmin` bypass), scope helpers, convenience checkers (`canViewClient`, `canViewTask`, etc.), `getAllPermissions()`, `getPermissionsByModule()`, `DANGEROUS_PERMISSIONS` set, `PERMISSION_DEPENDENCIES` map, `validatePermissionSet()`. |
| `constants.ts` (`DEFAULT_ROLES`) | **Seed data** | Array of `RoleDefinition` objects with `isSystem`, `riskLevel` flags, used to seed the Firestore `roles` collection on first run and to sync new permissions additively. |
| `contexts/AuthContext.tsx` | **State** | Loads roles from Firestore (`onSnapshot`), resolves user role → permission array, tracks `isAdmin` state, exposes `checkPermission()`, `hasAnyPermission()`, `hasAllPermissions()`, `isAdmin` via React context. Handles role seeding, permission sync, `roleId` storage. |
| `hooks/usePermissions.ts` | **Hooks** | `usePermission`, `useAnyPermission`, `useAllPermissions`, `usePermissionCheck` — thin wrappers around `can()` using context state. |
| `components/PermissionGate.tsx` | **UI Gates** | `PermissionGate`, `AnyPermissionGate`, `RequirePermission`, `ConditionalRender` — declarative JSX wrappers that show/hide children. |
| `components/RolesManager.tsx` | **Admin UI** | CRUD interface for roles — create, rename, delete roles and toggle individual permissions. |
| `components/PermissionMatrix.tsx` | **Admin UI** | Grid view of roles × permissions with search, filter, expand/collapse by module, bulk toggle, copy role, and JSON export. |
| `firestore.rules` | **Server** | `getUserData()`, `getRoleData()`, `isAdmin()`, `hasPermission()`, `isAuthenticated()` helpers. Uses `user.roleId` to resolve the role document. Admin-only write for sensitive collections, immutability for audit/activity logs. |
| `types.ts` | **Types** | `RoleDefinition` (with `isSystem`, `riskLevel`, `slug`, `createdAt`, `updatedAt`, `updatedBy`), `Permission`, `UserRole` enum (legacy — `User.role` is now `string`), `Department` enum, `RiskLevel` type, `AuditLog` (with `userName`, `metadata`). |

### Data Flow

```
┌────────────────┐     onSnapshot      ┌──────────────┐
│  Firestore     │ ──────────────────▶ │ AuthContext   │
│  roles/{id}    │                     │ (roles state) │
└────────────────┘                     └──────┬───────┘
                                              │
                                   loadUserPermissions()
                                              │
                                   ┌──────────▼───────────┐
                                   │  userPermissions[]    │
                                   │  (flat string array)  │
                                   └──────────┬───────────┘
                                              │
                         ┌────────────────────┼──────────────────┐
                         ▼                    ▼                  ▼
                   usePermission()    PermissionGate     checkPermission()
                   useAnyPermission() AnyPermissionGate  hasAnyPermission()
                   useAllPermissions() RequirePermission  hasAllPermissions()
                   usePermissionCheck()
                         │                    │                  │
                         └────────────────────┼──────────────────┘
                                              ▼
                                          can()
                                   lib/permissions.ts
```

---

## 3. Built-in Roles

The system ships with 12 default roles defined in `DEFAULT_ROLES` (constants.ts). They are seeded into Firestore on first launch.

| ID | Role Name | `isAdmin` | Description | Approx. Permissions |
|---|---|---|---|---|
| `r1` | **General Manager** | ✅ | Full system access — every permission in the catalog. | ~100+ |
| `r2` | **Account Manager** | ❌ | Client & project management, task assignment across all scopes, posting, finance viewing, reporting. | ~60 |
| `r3` | **Creative Director** | ❌ | Creative oversight & approvals, QC full access, task management (dept), project editing. | ~55 |
| `r4` | **Art Director** | ❌ | Department-level task & approval management, calendar management, QC reviewing. | ~40 |
| `r5` | **Designer** | ❌ | Own tasks only, department asset viewing, calendar view-only, creative view-only. | ~20 |
| `r6` | **Copywriter** | ❌ | Own tasks, full calendar management, creative upload, QC reviewing. | ~30 |
| `r7` | **Social Manager** | ❌ | Social posting full access, department tasks & clients, reporting. | ~30 |
| `r8` | **Producer** | ❌ | Production full access, vendor assignment, department tasks, calendar management. | ~35 |
| `r9` | **Videographer** | ❌ | Own tasks, production view/edit, department assets. | ~15 |
| `r10` | **Finance Manager** | ❌ | Full finance access, all clients/projects (view), vendor management, reporting. | ~25 |
| `r11` | **Freelancer** | ❌ | External contractor — own tasks only, minimal access. | ~12 |
| `r12` | **Client** | ❌ | Client portal — view own projects/tasks, approve deliverables. | ~10 |

> **Note:** Admins can create custom roles or modify any of the above via the Admin Hub.

---

## 4. Permission Key Format

```
module.action[.scope]
```

### Components

| Part | Description | Examples |
|---|---|---|
| **module** | Feature area / resource type | `tasks`, `clients`, `projects`, `finance`, `posting`, `qc` |
| **action** | What the user can do | `view`, `create`, `edit`, `delete`, `assign`, `archive`, `approve` |
| **scope** *(optional)* | Visibility/reach restriction | `own`, `dept`, `project`, `all` |

### Examples

| Key | Meaning |
|---|---|
| `tasks.view.own` | View only tasks assigned to the user. |
| `tasks.view.dept` | View tasks within the user's department. |
| `tasks.view.all` | View all tasks across the system. |
| `tasks.create` | Create a task (no scope — global action). |
| `clients.edit` | Edit any client (no scope suffix = unrestricted). |
| `qc.review.approve` | Approve a QC review item. |
| `production.plans.create` | Create a production plan. |

### Naming Conventions

- Modules are **lowercase singular nouns** or **compound nouns** separated by underscores: `task_files`, `client.notes`, `admin.branding`.
- Actions are **lowercase verbs**: `view`, `create`, `edit`, `delete`, `assign`, `archive`, `approve`, `reject`, `export`, `manage`.
- Scope values are one of the 4 enum values when applicable.
- Permissions without a scope suffix are considered **global** — if the user has the key, access is granted regardless of context.

---

## 5. Permission Categories (Full Catalog)

The `PERMISSIONS` constant in `lib/permissions.ts` is organized into **23 modules**. Below is the complete catalog.

### 5.1 Authentication

| Constant | Key | Description |
|---|---|---|
| `AUTH.LOGIN` | `auth.login` | Ability to log in to the system. |

### 5.2 Users

| Constant | Key | Description |
|---|---|---|
| `USERS.VIEW_ALL` | `users.view.all` | View all user profiles. |
| `USERS.CREATE` | `users.create` | Create / invite new users. |
| `USERS.EDIT` | `users.edit` | Edit user profiles. |
| `USERS.DISABLE` | `users.disable` | Disable user accounts. |
| `USERS.FORCE_PASSWORD_RESET` | `users.force_password_reset` | Force a user to change their password. |

### 5.3 Roles

| Constant | Key | Description |
|---|---|---|
| `ROLES.VIEW` | `roles.view` | View role definitions. |
| `ROLES.CREATE` | `roles.create` | Create new roles. |
| `ROLES.EDIT` | `roles.edit` | Edit existing role permissions. |
| `ROLES.DELETE` | `roles.delete` | Delete a role. |
| `ROLES.ASSIGN` | `roles.assign` | Assign a role to a user. |

### 5.4 Permissions (Admin)

| Constant | Key | Description |
|---|---|---|
| `PERMISSIONS_ADMIN.VIEW` | `permissions.view` | View the permission matrix. |
| `PERMISSIONS_ADMIN.MANAGE` | `permissions.manage` | Manage/edit permissions. |

### 5.5 Departments

| Constant | Key | Description |
|---|---|---|
| `DEPARTMENTS.VIEW` | `departments.view` | View departments. |
| `DEPARTMENTS.CREATE` | `departments.create` | Create departments. |
| `DEPARTMENTS.EDIT` | `departments.edit` | Edit departments. |
| `DEPARTMENTS.DELETE` | `departments.delete` | Delete departments. |
| `DEPARTMENTS.ASSIGN_MEMBERS` | `departments.assign_members` | Assign users to departments. |

### 5.6 Clients

| Constant | Key | Description |
|---|---|---|
| `CLIENTS.VIEW_OWN` | `clients.view.own` | View own assigned clients. |
| `CLIENTS.VIEW_DEPT` | `clients.view.dept` | View department's clients. |
| `CLIENTS.VIEW_ALL` | `clients.view.all` | View all clients. |
| `CLIENTS.CREATE` | `clients.create` | Create new clients. |
| `CLIENTS.EDIT` | `clients.edit` | Edit client details. |
| `CLIENTS.ARCHIVE` | `clients.archive` | Archive clients. |
| `CLIENTS.DELETE` | `clients.delete` | Delete clients. |

### 5.7 Client Sub-modules

| Constant | Key | Description |
|---|---|---|
| `CLIENT_NOTES.VIEW` | `client.notes.view` | View client notes. |
| `CLIENT_NOTES.CREATE` | `client.notes.create` | Create client notes. |
| `CLIENT_NOTES.EDIT` | `client.notes.edit` | Edit client notes. |
| `CLIENT_NOTES.DELETE` | `client.notes.delete` | Delete client notes. |
| `CLIENT_MEETINGS.VIEW` | `client.meetings.view` | View client meetings. |
| `CLIENT_MEETINGS.CREATE` | `client.meetings.create` | Create client meetings. |
| `CLIENT_MEETINGS.EDIT` | `client.meetings.edit` | Edit client meetings. |
| `CLIENT_MEETINGS.DELETE` | `client.meetings.delete` | Delete client meetings. |
| `CLIENT_BRAND_ASSETS.VIEW` | `client.brand_assets.view` | View brand assets. |
| `CLIENT_BRAND_ASSETS.MANAGE` | `client.brand_assets.manage` | Manage brand assets. |
| `CLIENT_MARKETING.VIEW` | `client.marketing_strategies.view` | View marketing strategies. |
| `CLIENT_MARKETING.MANAGE` | `client.marketing_strategies.manage` | Manage marketing strategies. |

### 5.8 Projects & Milestones

| Constant | Key | Description |
|---|---|---|
| `PROJECTS.VIEW_OWN` | `projects.view.own` | View own projects. |
| `PROJECTS.VIEW_DEPT` | `projects.view.dept` | View department projects. |
| `PROJECTS.VIEW_ALL` | `projects.view.all` | View all projects. |
| `PROJECTS.CREATE` | `projects.create` | Create projects. |
| `PROJECTS.EDIT_OWN` | `projects.edit.own` | Edit own projects. |
| `PROJECTS.EDIT_DEPT` | `projects.edit.dept` | Edit department projects. |
| `PROJECTS.EDIT_ALL` | `projects.edit.all` | Edit all projects. |
| `PROJECTS.EDIT` | `projects.edit` | Edit projects (legacy, no scope). |
| `PROJECTS.ARCHIVE` | `projects.archive` | Archive projects. |
| `PROJECTS.DELETE` | `projects.delete` | Delete projects. |
| `MILESTONES.VIEW` | `milestones.view` | View milestones. |
| `MILESTONES.CREATE` | `milestones.create` | Create milestones. |
| `MILESTONES.EDIT` | `milestones.edit` | Edit milestones. |
| `MILESTONES.DELETE` | `milestones.delete` | Delete milestones. |

### 5.9 Tasks & Workflow

| Constant | Key | Description |
|---|---|---|
| `TASKS.VIEW_ALL` | `tasks.view.all` | View all tasks. |
| `TASKS.VIEW_DEPT` | `tasks.view.dept` | View department tasks. |
| `TASKS.VIEW_PROJECT` | `tasks.view.project` | View tasks within assigned projects. |
| `TASKS.VIEW_OWN` | `tasks.view.own` | View own tasks. |
| `TASKS.CREATE` | `tasks.create` | Create tasks. |
| `TASKS.EDIT_ALL` | `tasks.edit.all` | Edit all tasks. |
| `TASKS.EDIT_DEPT` | `tasks.edit.dept` | Edit department tasks. |
| `TASKS.EDIT_OWN` | `tasks.edit.own` | Edit own tasks. |
| `TASKS.DELETE` | `tasks.delete` | Delete tasks. |
| `TASKS.ASSIGN_ALL` | `tasks.assign.all` | Assign tasks to anyone. |
| `TASKS.ASSIGN_DEPT` | `tasks.assign.dept` | Assign tasks within department. |
| `TASKS.MANAGE_ASSIGNEES` | `tasks.manage_assignees` | Add/remove assignees from tasks. |
| `TASKS.MANAGE_PUBLISHING` | `tasks.manage_publishing` | Control task publishing workflow. |
| `TASKS.REOPEN` | `tasks.reopen` | Reopen completed tasks. |
| `TASKS.EDIT_COMPLETED` | `tasks.edit_completed` | Edit tasks after completion. |
| `TASKS.ARCHIVE` | `tasks.archive` | Archive tasks. |
| `TASKS.ARCHIVE_VIEW` | `tasks.archive.view` | View archived tasks. |
| `TASKS.MANUAL_CLOSE_APPROVE` | `tasks.manual_close.approve` | Approve manual task closure. |
| `TASKS.MANUAL_CLOSE_REJECT` | `tasks.manual_close.reject` | Reject manual task closure. |
| `TASKS.REFERENCES_VIEW` | `tasks.references.view` | View task references. |
| `TASKS.REFERENCES_ADD` | `tasks.references.add` | Add task references. |
| `TASKS.REFERENCES_DELETE` | `tasks.references.delete` | Delete task references. |

### 5.10 Task Files

| Constant | Key | Description |
|---|---|---|
| `TASK_FILES.UPLOAD` | `task_files.upload` | Upload files to tasks. |
| `TASK_FILES.DELETE` | `task_files.delete` | Delete task files. |
| `TASK_FILES.VIEW` | `task_files.view` | View task files. |

### 5.11 Approvals

| Constant | Key | Description |
|---|---|---|
| `APPROVALS.VIEW_OWN` | `approvals.view.own` | View own approvals. |
| `APPROVALS.VIEW_DEPT` | `approvals.view.dept` | View department approvals. |
| `APPROVALS.VIEW_ALL` | `approvals.view.all` | View all approvals. |
| `APPROVALS.ACT` | `approvals.act` | Act on approvals (approve/reject/revision). |
| `APPROVALS.CONFIGURE` | `approvals.configure` | Configure approval workflows. |

### 5.12 Posting & Captions

| Constant | Key | Description |
|---|---|---|
| `POSTING.VIEW_DEPT` | `posting.view.dept` | View department posts. |
| `POSTING.VIEW_ALL` | `posting.view.all` | View all posts. |
| `POSTING.CREATE` | `posting.create` | Create posts. |
| `POSTING.EDIT` | `posting.edit` | Edit posts. |
| `POSTING.ASSIGN` | `posting.assign` | Assign posts to users. |
| `POSTING.SUBMIT_FOR_REVIEW` | `posting.submit_for_review` | Submit posts for review. |
| `POSTING.REQUEST_REVISION` | `posting.request_revision` | Request post revisions. |
| `POSTING.APPROVE` | `posting.approve` | Approve posts. |
| `POSTING.SCHEDULE` | `posting.schedule` | Schedule post publication. |
| `POSTING.MARK_PUBLISHED` | `posting.mark_published` | Mark posts as published. |
| `POSTING.ARCHIVE` | `posting.archive` | Archive posts. |
| `POSTING.DELETE` | `posting.delete` | Delete posts. |

### 5.13 Files & Assets

| Constant | Key | Description |
|---|---|---|
| `ASSETS.VIEW_DEPT` | `assets.view.dept` | View department assets. |
| `ASSETS.VIEW_ALL` | `assets.view.all` | View all assets. |
| `ASSETS.UPLOAD` | `assets.upload` | Upload assets. |
| `ASSETS.EDIT_METADATA` | `assets.edit_metadata` | Edit asset metadata. |
| `ASSETS.DELETE` | `assets.delete` | Delete assets. |
| `ASSETS.LINK_TO_TASK` | `assets.link_to_task` | Link assets to tasks. |
| `ASSETS.ARCHIVE` | `assets.archive` | Archive assets. |

### 5.14 Production Hub

| Constant | Key | Description |
|---|---|---|
| `PRODUCTION.VIEW` | `production.view` | View production jobs. |
| `PRODUCTION.CREATE` | `production.create` | Create production jobs. |
| `PRODUCTION.EDIT` | `production.edit` | Edit production jobs. |
| `PRODUCTION.ASSIGN_CREW` | `production.assign_crew` | Assign crew to production. |
| `PRODUCTION.SCHEDULE` | `production.schedule` | Schedule production. |
| `PRODUCTION.CLOSE_JOB` | `production.close_job` | Close/complete production jobs. |
| `PRODUCTION.DELETE` | `production.delete` | Delete production jobs. |
| `PRODUCTION.PLANS_CREATE` | `production.plans.create` | Create production plans. |
| `PRODUCTION.PLANS_EDIT` | `production.plans.edit` | Edit production plans. |
| `PRODUCTION.PLANS_DELETE` | `production.plans.delete` | Delete production plans. |
| `PRODUCTION.PLANS_VIEW` | `production.plans.view` | View production plans. |
| `PRODUCTION.OVERRIDE_CONFLICTS` | `production.override_conflicts` | Override scheduling conflicts. |
| `PRODUCTION.RESTORE_ARCHIVED` | `production.restore_archived` | Restore archived production items. |

### 5.15 Vendors

| Constant | Key | Description |
|---|---|---|
| `VENDORS.VIEW` | `vendors.view` | View vendors. |
| `VENDORS.CREATE` | `vendors.create` | Create vendors. |
| `VENDORS.EDIT` | `vendors.edit` | Edit vendors. |
| `VENDORS.DELETE` | `vendors.delete` | Delete vendors. |
| `VENDORS.ASSIGN_TO_PROJECT` | `vendors.assign_to_project` | Assign vendors to projects. |

### 5.16 Finance

| Constant | Key | Description |
|---|---|---|
| `FINANCE.VIEW_OWN` | `finance.view.own` | View own finance data. |
| `FINANCE.VIEW_PROJECT` | `finance.view.project` | View project finance data. |
| `FINANCE.VIEW_ALL` | `finance.view.all` | View all finance data. |
| `FINANCE.CREATE_INVOICE` | `finance.create_invoice` | Create invoices. |
| `FINANCE.EDIT_INVOICE` | `finance.edit_invoice` | Edit invoices. |
| `FINANCE.DELETE_INVOICE` | `finance.delete_invoice` | Delete invoices. |
| `FINANCE.RECORD_PAYMENT` | `finance.record_payment` | Record payments. |
| `FINANCE.APPROVE_PAYMENT` | `finance.approve_payment` | Approve payments. |
| `FINANCE.EXPORT` | `finance.export` | Export finance data. |
| `FINANCE.MANAGE_BUDGETS` | `finance.manage_budgets` | Manage budgets. |

### 5.17 Analytics & Reports

| Constant | Key | Description |
|---|---|---|
| `REPORTS.VIEW_DEPT` | `reports.view.dept` | View department reports. |
| `REPORTS.VIEW_ALL` | `reports.view.all` | View all reports. |
| `REPORTS.EXPORT` | `reports.export` | Export reports. |
| `ANALYTICS.VIEW_DEPT` | `analytics.view.dept` | View department analytics. |
| `ANALYTICS.VIEW_ALL` | `analytics.view.all` | View all analytics. |

### 5.18 Admin Branding

| Constant | Key | Description |
|---|---|---|
| `ADMIN_BRANDING.VIEW` | `admin.branding.view` | View branding settings. |
| `ADMIN_BRANDING.EDIT` | `admin.branding.edit` | Edit branding settings. |
| `ADMIN_BRANDING.UPLOAD_ASSETS` | `admin.branding.upload_assets` | Upload branding assets. |

### 5.19 System Settings

| Constant | Key | Description |
|---|---|---|
| `ADMIN_SETTINGS.VIEW` | `admin.settings.view` | View system settings. |
| `ADMIN_SETTINGS.EDIT` | `admin.settings.edit` | Edit system settings. |

### 5.20 Dashboard

| Constant | Key | Description |
|---|---|---|
| `DASHBOARD.VIEW_GM_URGENT` | `dashboard.view_gm_urgent` | View GM urgent items on dashboard. |

### 5.21 Notes

| Constant | Key | Description |
|---|---|---|
| `NOTES.CREATE` | `notes.create` | Create notes. |
| `NOTES.EDIT_OWN` | `notes.edit_own` | Edit own notes. |
| `NOTES.DELETE_OWN` | `notes.delete_own` | Delete own notes. |
| `NOTES.MANAGE_ALL` | `notes.manage_all` | Manage all notes (admin). |

### 5.22 Calendar

| Constant | Key | Description |
|---|---|---|
| `CALENDAR.VIEW` | `calendar.view` | View calendars. |
| `CALENDAR.MANAGE` | `calendar.manage` | Manage calendar settings. |
| `CALENDAR_MONTHS.CREATE` | `calendar.months.create` | Create calendar months. |
| `CALENDAR_MONTHS.EDIT` | `calendar.months.edit` | Edit calendar months. |
| `CALENDAR_MONTHS.DELETE` | `calendar.months.delete` | Delete calendar months. |
| `CALENDAR_ITEMS.CREATE` | `calendar.items.create` | Create calendar items. |
| `CALENDAR_ITEMS.EDIT` | `calendar.items.edit` | Edit calendar items. |
| `CALENDAR_ITEMS.DELETE` | `calendar.items.delete` | Delete calendar items. |
| `CALENDAR.REQUEST_REVISION` | `calendar.request_revision` | Request creative revision on calendar items synced from Creative dept. |

### 5.23 Creative Direction

| Constant | Key | Description |
|---|---|---|
| `CREATIVE.VIEW` | `creative.view` | View creative projects. |
| `CREATIVE.MANAGE` | `creative.manage` | Manage creative projects. |
| `CREATIVE.REVIEW` | `creative.review` | Review creative work. |
| `CREATIVE.UPLOAD` | `creative.upload` | Upload creative assets. |
| `CREATIVE.APPROVE` | `creative.approve` | Approve creative work. |
| `CREATIVE.REJECT` | `creative.reject` | Reject creative work. |
| `CREATIVE.REVISION_SUBMIT` | `creative.revision.submit` | Submit revised content for calendar revision requests. |
| `CREATIVE.REVISION_APPROVE` | `creative.revision.approve` | Approve calendar revision submissions. |
| `CREATIVE.REVISION_REJECT` | `creative.revision.reject` | Reject calendar revision submissions and send back for re-revision. |

### 5.24 Quality Control

| Constant | Key | Description |
|---|---|---|
| `QC.VIEW` | `qc.view` | View QC items. |
| `QC.MANAGE` | `qc.manage` | Manage QC workflows. |
| `QC.REVIEW_APPROVE` | `qc.review.approve` | Approve QC reviews. |
| `QC.REVIEW_REJECT` | `qc.review.reject` | Reject QC reviews. |
| `QC.REVIEW_COMMENT` | `qc.review.comment` | Comment on QC reviews. |
| `QC.ASSIGN_REVIEWERS` | `qc.review.assign_reviewers` | Assign QC reviewers. |

---

## 6. Scope Model

### 6.1 The Four Scopes

```typescript
export enum PermissionScope {
  OWN     = 'own',      // Resources owned/assigned to the user
  DEPT    = 'dept',     // Resources within the user's department
  PROJECT = 'project',  // Resources within projects user belongs to
  ALL     = 'all',      // All resources — no restrictions
}
```

### 6.2 Scope Hierarchy

Higher scopes **implicitly include** lower scopes:

```
ALL  (highest — includes everything below)
 └── PROJECT  (includes OWN)
 └── DEPT     (includes OWN)
      └── OWN (lowest — only user's own resources)
```

This means:

| If user has… | They can also satisfy… |
|---|---|
| `tasks.view.all` | `tasks.view.project`, `tasks.view.dept`, `tasks.view.own` |
| `tasks.view.dept` | `tasks.view.own` |
| `tasks.view.project` | `tasks.view.own` |
| `tasks.view.own` | Only `tasks.view.own` |

The hierarchy is implemented in `checkHigherScopePermission()`:

```typescript
const scopeHierarchy: Record<string, string[]> = {
  'own':     ['dept', 'project', 'all'],
  'dept':    ['all'],
  'project': ['all'],
  'all':     []
};
```

### 6.3 Scope Context

When a scope needs validation (e.g., does this task belong to the user?), a `ScopeContext` object is passed:

```typescript
export interface ScopeContext {
  ownerId?: string;          // Who owns this resource
  assigneeId?: string;       // Who is assigned to this resource
  assigneeIds?: string[];    // Multiple assignees
  department?: Department;   // Department of the resource
  projectId?: string;        // Project this resource belongs to
  projectMembers?: string[]; // Members of the project
  clientId?: string;         // Client this belongs to
}
```

### 6.4 Scope Resolution Rules

| Scope | Passes when… |
|---|---|
| `OWN` | `context.ownerId === user.id` OR `context.assigneeId === user.id` OR `user.id` is in `context.assigneeIds` |
| `DEPT` | OWN check passes OR `context.department === user.department` |
| `PROJECT` | OWN check passes OR `user.id` is in `context.projectMembers` |
| `ALL` | Always passes (no restriction). |
| *(no scope)* | Always passes — the permission is a global action. |

---

## 7. Core Permission Checking — `can()`

### 7.1 Function Signature

```typescript
export function can(
  user: User | null,
  permissionKey: string,
  userPermissions: string[],
  context?: ScopeContext,
  isAdmin?: boolean        // ← NEW: admin bypass (added in RBAC hardening)
): boolean
```

### 7.2 Algorithm

```
1. Return false if user or permissionKey is null/undefined.
2. **Admin bypass** — if isAdmin is true, return true immediately.
   Admin users always pass every permission check.
3. Check if userPermissions[] includes the exact permissionKey.
   a. If YES and no context is provided → return true.
   b. If YES and context is provided:
      - Parse the scope suffix from the key.
      - Validate scope against context (OWN/DEPT/PROJECT/ALL).
      - Return result of scope check.
4. If exact key NOT found, check for higher-scope permissions:
   - For 'own' → check if user has 'dept', 'project', or 'all' variant.
   - For 'dept' → check if user has 'all' variant.
   - For 'project' → check if user has 'all' variant.
   - If higher scope found → return true (no context check needed — higher scope is less restrictive).
5. Return false.
```

### 7.3 Important Behavior Notes

- **No context = automatic grant.** If you call `can(user, 'tasks.view.own', perms)` without a `ScopeContext`, it returns `true` simply because the user has the permission key. Scope validation only occurs when context is provided.
- **Higher scope bypass.** If a user has `tasks.view.all`, they pass any `tasks.view.*` check regardless of context. This is intentional — `ALL` means unrestricted.
- **Global permissions** (no scope suffix like `tasks.create`) always pass if the key is in the user's permission array.

### 7.4 Convenience Helpers

| Function | Purpose | Checks (in order) |
|---|---|---|
| `canViewClient(user, perms, dept?, ownerId?)` | Can user see a specific client? | `VIEW_ALL` → `VIEW_DEPT` (dept) → `VIEW_OWN` (ownerId) |
| `canViewProject(user, perms, dept?, members?)` | Can user see a specific project? | `VIEW_ALL` → `VIEW_DEPT` (dept) → `VIEW_OWN` (members) |
| `canViewTask(user, perms, assignee?, dept?, members?)` | Can user see a specific task? | `VIEW_ALL` → `VIEW_DEPT` → `VIEW_PROJECT` → `VIEW_OWN` |
| `canEditTask(user, perms, assignee?, dept?)` | Can user edit a specific task? | `EDIT_ALL` → `EDIT_DEPT` → `EDIT_OWN` |
| `canViewFinance(user, perms, owner?, members?)` | Can user see finance data? | `VIEW_ALL` → `VIEW_PROJECT` → `VIEW_OWN` |

### 7.5 Utility Functions

| Function | Returns | Purpose |
|---|---|---|
| `getAllPermissions()` | `string[]` | Flat array of every permission key from the `PERMISSIONS` constant. Useful for the role editor UI. |
| `getPermissionsByModule()` | `Record<string, string[]>` | Permissions grouped by human-readable module name (24 groups). Used by `PermissionMatrix`. |
| `DANGEROUS_PERMISSIONS` | `Set<string>` | Set of 12 high-risk permission keys (user management, role management, finance write, admin access). Used by `RolesManager` and `PermissionMatrix` to warn admins. |
| `PERMISSION_DEPENDENCIES` | `Map<string, string[]>` | Map of permission keys to their dependencies (e.g., `roles.edit` requires `roles.view`). |
| `validatePermissionSet(perms)` | `string[]` | Returns an array of warning messages for missing dependencies in a permission set. Used in `RolesManager` to surface validation issues. |

---

## 8. React Permission Hooks

All hooks are in `hooks/usePermissions.ts` and internally call `can()` from `lib/permissions.ts` with the current user and permissions from `AuthContext`.

### 8.1 `usePermission(key, context?)`

Single permission check. Returns `boolean`.

```tsx
import { usePermission } from '../hooks/usePermissions';

const TaskEditButton = ({ task }) => {
  const canEdit = usePermission('tasks.edit.own', { assigneeId: task.assignedTo });
  
  if (!canEdit) return null;
  return <button>Edit Task</button>;
};
```

### 8.2 `useAnyPermission(keys[], context?)`

OR logic — returns `true` if user has **any** of the permissions.

```tsx
const canViewTasks = useAnyPermission([
  'tasks.view.own',
  'tasks.view.dept',
  'tasks.view.all'
]);
```

### 8.3 `useAllPermissions(keys[], context?)`

AND logic — returns `true` only if user has **all** of the permissions.

```tsx
const canManageTeam = useAllPermissions([
  'tasks.edit.dept',
  'tasks.assign.dept'
]);
```

### 8.4 `usePermissionCheck()`

Returns a callable function for dynamic / deferred checks (e.g., inside loops or event handlers).

```tsx
const checkPermission = usePermissionCheck();

const handleAction = (task: Task) => {
  if (checkPermission('tasks.edit.own', { assigneeId: task.assignedTo })) {
    // proceed
  }
};
```

---

## 9. UI Permission Gates

All gate components are in `components/PermissionGate.tsx`. They control **visibility only** — they are not a security boundary.

### 9.1 `<PermissionGate>`

Renders children if user has the specified permission.

```tsx
<PermissionGate permission="tasks.create">
  <button>Create Task</button>
</PermissionGate>

{/* With fallback */}
<PermissionGate permission="finance.view.all" fallback={<p>Access denied</p>}>
  <FinanceDashboard />
</PermissionGate>
```

**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| `permission` | `string` | ✅ | Permission key to check. |
| `context` | `ScopeContext` | ❌ | Scope context for validation. |
| `fallback` | `ReactNode` | ❌ | Rendered when permission denied. Default: `null`. |
| `children` | `ReactNode` | ✅ | Rendered when permission granted. |

### 9.2 `<AnyPermissionGate>`

Renders children if user has **any** of the listed permissions (OR logic).

```tsx
<AnyPermissionGate permissions={['tasks.view.own', 'tasks.view.dept', 'tasks.view.all']}>
  <TaskList />
</AnyPermissionGate>
```

### 9.3 `<RequirePermission>`

Strict enforcement — renders nothing if denied and optionally calls an `onDenied` callback (e.g., for navigation).

```tsx
<RequirePermission 
  permission="admin.settings.edit"
  onDenied={() => navigate('/dashboard')}
>
  <AdminSettings />
</RequirePermission>
```

**Behavior:** Uses `useEffect` to call `onDenied` when permission is not met. Returns `null` on denial.

### 9.4 `<ConditionalRender>`

Generic boolean-based conditional renderer (not permission-specific, but useful alongside permission logic).

```tsx
<ConditionalRender when={isOwner || canEditAll}>
  <EditButton />
</ConditionalRender>
```

---

## 10. Permission Enforcement Strategy

IRIS Agency OS enforces permissions at **three layers**:

### Layer 1: UI Layer (Client-Side)

| Mechanism | What it does |
|---|---|
| Permission hooks | Conditionally render components based on permission checks. |
| Permission gates | Declarative JSX wrappers that hide UI elements. |
| Route guarding | `RequirePermission` with `onDenied` for navigation. |
| Sidebar filtering | Menu items shown/hidden based on user permissions. |

**⚠️ This layer is advisory.** A technically savvy user could bypass client-side checks via browser devtools.

### Layer 2: Application Logic (Client-Side)

| Mechanism | What it does |
|---|---|
| `AuthContext.checkPermission()` | Called before Firestore writes in component event handlers. |
| `can()` in service functions | Guards business logic (e.g., approval flows, task state transitions). |
| Data filtering | Query results filtered by scope before display (e.g., `canViewTask()` per item). |

### Layer 3: Firestore Security Rules (Server-Side)

The `firestore.rules` file includes helper functions for permission checking:

```javascript
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

function getRoleData() {
  let user = getUserData();
  return get(/databases/$(database)/documents/roles/$(user.roleId)).data;
}

function isAdmin() {
  return request.auth != null && getRoleData().isAdmin == true;
}

function hasPermission(permission) {
  let roleData = getRoleData();
  return roleData.isAdmin == true || permission in roleData.permissions;
}
```

**Current state (post-hardening):**

| Category | Rule | Collections |
|---|---|---|
| **Admin-only write** | `isAdmin()` for create/update/delete | `roles`, `settings`, `departments`, `dashboard_banners` |
| **Immutable (append-only)** | Create allowed, update/delete denied | `audit_logs`, `project_activity_logs`, `task_activity_logs`, `calendar_item_revisions` |
| **User-scoped** | `request.auth.uid == resource.data.userId` | `notifications`, `notification_preferences`, `notification_tokens` |
| **Permission-gated write** | `hasPermission('workflows.manage')` | `workflow_templates` |
| **Authenticated read/write** | `isAuthenticated()` | All other business data collections |
| **Default catch-all** | `isAuthenticated()` | Any unmatched collection |

> **Key takeaway:** The catch-all `if true` rule has been **removed**. All access now requires authentication at minimum, and sensitive collections have additional restrictions. See [Section 13: Security Considerations](#13-security-considerations) for remaining gaps.

---

## 11. Admin Permission Management

### 11.1 Roles Manager (`components/RolesManager.tsx`)

A CRUD interface embedded in the Admin Hub for managing roles.

**Features:**
- **Create roles** — Name + description, starts with empty permission set.
- **Clone roles** — Clone permissions from an existing role into a new role via a dropdown selector.
- **Delete roles** — With confirmation dialog; **system roles cannot be deleted** (enforced by `isSystem` flag). Roles with active users show a user count warning.
- **Select a role** — Left panel shows all roles; selected role is highlighted. System roles display a Lock icon. User count badges show how many users hold each role.
- **Toggle permissions** — Right panel lists all permissions; click to toggle on/off for the selected role.
- **Permission search** — Filter the permission list by keyword to quickly find specific permissions.
- **Dangerous permission warnings** — Permissions in the `DANGEROUS_PERMISSIONS` set are highlighted in amber with an AlertTriangle icon.
- **Validation feedback** — After toggling permissions, `validatePermissionSet()` checks for missing dependencies and displays warnings.
- **Role metadata display** — Shows `isSystem` badge, `riskLevel` badge, and `updatedAt` / `updatedBy` timestamps.
- **Real-time persistence** — Changes are written to Firestore immediately via `onUpdateRole` callback.

**Data flow:**
```
RolesManager → onUpdateRole(role) → AdminHub → Firestore doc update → 
  onSnapshot fires → AuthContext updates roles state → 
  loadUserPermissions() re-runs → UI re-renders
```

### 11.2 Permission Matrix (`components/PermissionMatrix.tsx`)

A comprehensive grid view showing **roles vs. permissions**.

**Features:**
- **Grouped by module** — Permissions are organized into expandable module sections (24 modules).
- **Search & filter** — Search by permission name, code, or description.
- **Toggle individual permissions** — Click a cell to toggle a permission for a role.
- **Bulk toggle** — Toggle all permissions in a module for a role at once.
- **Copy role permissions** — Copy all permissions from a source role to a **target role** via dropdown selector.
- **Dangerous permission highlighting** — Cells for dangerous permissions use an amber background (`bg-amber-50`) and amber check icons. Permission rows show an AlertTriangle icon for dangerous keys.
- **Legend** — Includes a "Dangerous" entry with amber indicator alongside Granted/Not Granted.
- **JSON export** — Export the entire matrix as a JSON file for backup or documentation.
- **Sync button** — Trigger manual permission sync from `DEFAULT_ROLES`.

---

## 12. Permission Synchronization

### The Problem

When developers add new permissions to `DEFAULT_ROLES` in code, existing Firestore role documents (which may have been customized by admins) need to receive those new permissions without losing admin-made changes.

### The Solution: Additive Merge

`AuthContext.tsx` implements a **smart sync** strategy inside the `onSnapshot` listener for the `roles` collection:

```
For each DEFAULT_ROLE:
  1. Find the matching Firestore role by ID.
  2. Compute the set difference: newPerms = DEFAULT_ROLE.permissions - firestoreRole.permissions
  3. If newPerms is non-empty:
     a. Merge: mergedPermissions = [...firestoreRole.permissions, ...newPerms]
     b. Write merged permissions to Firestore (batch update).
     c. Update local state immediately.
```

### Key Properties

| Property | Detail |
|---|---|
| **Additive only** | Only adds missing permissions. Never removes permissions that an admin added or that were previously synced. |
| **Non-destructive** | Admin customizations (added or removed permissions) are preserved. If an admin removed a permission that is also in `DEFAULT_ROLES`, it will NOT be re-added (because it was already in the Firestore set at some point). However, if a developer adds a *brand new* permission key to `DEFAULT_ROLES`, it will be added. |
| **Batch write** | All updates are batched into a single Firestore `writeBatch()` for efficiency. |
| **Non-fatal** | Sync errors are caught and logged but do not break app initialization. |
| **Triggered on load** | Runs every time the `roles` `onSnapshot` fires (app start, role changes). |

### Edge Case: Empty Roles Collection

If the `roles` collection is completely empty (fresh deployment), the entire `DEFAULT_ROLES` array is seeded via a batch `set()`.

### Edge Case: Role Not in Firestore

If a `DEFAULT_ROLE` ID doesn't match any Firestore document (e.g., the admin deleted a built-in role), the sync skips that role silently.

### Permission Resolution for Users

```typescript
const loadUserPermissions = (userRole: UserRole) => {
  // 1. Look up role in Firestore-loaded roles (primary source)
  const userRoleDef = roles.find(r => r.name === userRole);
  
  if (!userRoleDef) {
    // 2. Fallback to DEFAULT_ROLES if Firestore role not found
    const defaultRoleDef = DEFAULT_ROLES.find(r => r.name === userRole);
    if (defaultRoleDef) {
      setUserPermissions(defaultRoleDef.permissions || []);
      return;
    }
    setUserPermissions([]);
    return;
  }
  
  // 3. Use Firestore role as single source of truth
  setUserPermissions(userRoleDef.permissions || []);
};
```

**Reactivity:** The `useEffect` that calls `loadUserPermissions()` depends on both `roles` and `currentUser?.role`. This means:
- If an admin changes a role's permissions in the Admin Hub → `onSnapshot` fires → `roles` state updates → `loadUserPermissions()` re-runs → all users with that role see updated permissions **in real-time** (no page refresh needed).

---

## 13. Security Considerations

### Resolved Vulnerabilities (RBAC Hardening)

| Issue | Status | Resolution |
|---|---|---|
| **Catch-all `if true` rule** | ✅ **Fixed** | Replaced with `if isAuthenticated()`. All access now requires Firebase Auth. |
| **World-writable sensitive collections** | ✅ **Fixed** | `roles`, `settings`, `departments`, `dashboard_banners` are now admin-write only. `audit_logs`, activity logs, and revisions are append-only (immutable). |
| **Broken `hasPermission()` in rules** | ✅ **Fixed** | Now uses `user.roleId` (e.g. "r1") instead of `user.role` (display name). Added `getUserData()`, `getRoleData()`, `isAdmin()`, and `isAuthenticated()` helpers. |
| **`can()` didn't check `isAdmin`** | ✅ **Fixed** | 5th parameter `isAdmin?: boolean` added. Admin users bypass all permission checks. `AuthContext` passes `userIsAdmin` to every call. |
| **Raw permission strings in components** | ✅ **Fixed** | All 52 raw strings replaced with `PERMISSIONS.*` constants across 9 files. Verified by grep: zero raw strings remain. |
| **System roles unprotected** | ✅ **Fixed** | `isSystem` flag on all 12 default roles. `RolesManager` prevents deletion/renaming of system roles. |

### Remaining Vulnerabilities

| Issue | Severity | Detail |
|---|---|---|
| **Most business collections use `auth != null` only** | 🟠 High | Being authenticated is not the same as being authorized. Any logged-in user can read/write clients, projects, tasks, etc. |
| **UI-only enforcement for business logic** | 🟡 Medium | Permission checks happen in React components. A user with devtools or API access can bypass them for non-sensitive collections. |
| **No server-side scope validation** | 🟡 Medium | The `hasPermission()` Firestore function checks if a key is in the role but does not validate scope (OWN/DEPT/ALL). |
| **Existing users may lack `roleId`** | 🟡 Medium | Users created before RBAC hardening don't have `roleId` on their document. The `getRoleData()` Firestore helper will fail for these users until their profile is updated. |

### Mitigations in Place

- All Firestore access requires authentication (no anonymous access).
- Sensitive collections have admin-only write rules.
- Audit logs, activity logs, and revisions are immutable (no update/delete).
- Notifications enforce user-scoped access.
- `hasPermission()` is used for `workflow_templates` writes.
- `DANGEROUS_PERMISSIONS` set warns admins when granting high-risk permissions.
- `validatePermissionSet()` checks for missing permission dependencies.
- `isSystem` flag prevents accidental deletion/modification of built-in roles.

### Recommendations

1. **Apply `hasPermission()`** to more collection rules (clients, projects, tasks, etc.) for server-side permission enforcement.
2. **Add scope validation to Firestore rules** — check department membership, project membership, or ownership in addition to permission keys.
3. **Use Cloud Functions** for sensitive operations (finance, user management) to add a server-side authorization layer.
4. **Backfill `roleId`** on existing user documents via a migration script or Cloud Function.
5. **Permission audit logging** — Extend `audit_logs` to capture who accessed/modified what, when, and with which permissions.

---

## 14. Developer Guidelines

### Adding a New Permission

1. **Add the key** to the `PERMISSIONS` constant in `lib/permissions.ts`:
   ```typescript
   INVOICES: {
     VOID: 'invoices.void',
   },
   ```

2. **Add it to `getPermissionsByModule()`** in the same file to ensure it shows up in the admin UI.

3. **Add it to the relevant `DEFAULT_ROLES`** in `constants.ts`:
   ```typescript
   // In the General Manager role:
   'invoices.void',
   ```

4. **Use it in your component** via a hook or gate:
   ```tsx
   const canVoid = usePermission(PERMISSIONS.INVOICES.VOID);
   ```

5. **Deploy** — The additive sync will automatically merge the new permission into Firestore roles on next app load.

### Adding a New Role

1. Add a new entry to `DEFAULT_ROLES` in `constants.ts` with a unique `id` (e.g., `r13`).
2. Include `isSystem: true` and a `riskLevel` (`'critical' | 'high' | 'medium' | 'low'`) in the definition.
3. The `UserRole` enum in `types.ts` is no longer the single source of truth for role names — `User.role` is now typed as `string` to support custom admin-created roles.
4. The role will be seeded on fresh deployments. For existing deployments, use the Admin Hub to create it manually, or clear the `roles` collection to trigger re-seeding.
5. System roles (`isSystem: true`) are protected from deletion and renaming in the Admin UI.

### Best Practices

| Do | Don't |
|---|---|
| ✅ Always use `PERMISSIONS.MODULE.KEY` constants, never raw strings. | ❌ Don't hardcode `'tasks.view.all'` — use `PERMISSIONS.TASKS.VIEW_ALL`. |
| ✅ Provide `ScopeContext` when checking scoped permissions. | ❌ Don't skip context — it disables scope validation and over-grants access. |
| ✅ Use `useAnyPermission` for "can the user see this at all" checks. | ❌ Don't check only the highest scope (e.g., `VIEW_ALL`) — you'll deny access to users with lower scopes. |
| ✅ Use `PermissionGate` for show/hide UI. | ❌ Don't use `PermissionGate` as a security boundary — it's UI-only. |
| ✅ Group related permissions under the same module prefix. | ❌ Don't create one-off permission keys with inconsistent naming. |
| ✅ Add new permissions to `DEFAULT_ROLES` for automatic sync. | ❌ Don't manually edit Firestore role documents in production unless necessary. |
| ✅ Test with low-privilege roles (Freelancer, Client). | ❌ Don't test only with General Manager — you'll miss visibility issues. |

### Checking Permissions in Code

```typescript
// In a React component (preferred)
const canCreate = usePermission(PERMISSIONS.TASKS.CREATE);

// In an event handler
const { checkPermission } = useAuth();
if (checkPermission(PERMISSIONS.TASKS.DELETE)) { ... }

// With scope context
const canEdit = usePermission(PERMISSIONS.TASKS.EDIT_OWN, {
  assigneeId: task.assigneeId
});

// Using a convenience helper (for complex multi-scope checks)
import { canViewTask } from '../lib/permissions';
const visible = canViewTask(currentUser, userPermissions, task.assigneeId, task.department, projectMembers);
```

---

## 15. Future Improvements

| Improvement | Priority | Status | Description |
|---|---|---|---|
| ~~Enforce Firestore rules per collection~~ | ~~🔴 High~~ | ✅ Done | Catch-all removed, all collections have explicit rules, sensitive collections locked to admin. |
| ~~Fix `hasPermission()` in rules~~ | ~~🔴 High~~ | ✅ Done | Uses `roleId` field, added `isAdmin()`, `isAuthenticated()`, `getUserData()`, `getRoleData()` helpers. |
| ~~Admin bypass in `can()`~~ | ~~🔴 High~~ | ✅ Done | `isAdmin` parameter added; `AuthContext` passes it to every `can()` call. |
| ~~System role protection~~ | ~~🟠 Medium~~ | ✅ Done | `isSystem` flag, deletion protection, dangerous permission warnings, validation feedback. |
| ~~Eliminate raw permission strings~~ | ~~🟠 Medium~~ | ✅ Done | All 52 raw strings replaced with `PERMISSIONS.*` constants. |
| **Apply `hasPermission()` to business collections** | 🔴 High | ⬜ Todo | Currently business data (clients, projects, tasks) only requires authentication. Add permission-level checks for write operations. |
| **Server-side scope validation** | 🔴 High | ⬜ Todo | Extend `hasPermission()` in Firestore rules to also validate scope (check department, project membership). |
| **Backfill `roleId` on existing users** | 🟠 Medium | ⬜ Todo | Users created before RBAC hardening lack `roleId`. A Cloud Function or migration script should backfill this field. |
| **Cloud Functions for sensitive writes** | 🟠 Medium | ⬜ Todo | Finance operations, user creation, and role changes should go through Cloud Functions with server-side auth. |
| **Permission audit logging** | 🟠 Medium | ⬜ Todo | Log who accessed/modified what, when, and with which permissions. |
| **Role inheritance** | 🟡 Low | ⬜ Todo | Allow roles to inherit from a parent role (e.g., Art Director inherits from Designer + extra). |
| **Time-based permissions** | 🟡 Low | ⬜ Todo | Temporary permission grants (e.g., freelancer access expires after project ends). |
| **Permission caching** | 🟡 Low | ⬜ Todo | Cache `can()` results for the same key+context to avoid redundant checks in hot render paths. |
| **Multi-role support** | 🟡 Low | ⬜ Todo | Allow users to hold multiple roles simultaneously with merged permissions. |
| **Attribute-based access control (ABAC)** | ⚪ Future | ⬜ Todo | Extend beyond RBAC to include resource attributes (e.g., "can edit tasks where priority > high"). |

---

## 16. Summary

| Aspect | Implementation |
|---|---|
| **Model** | Role-based access control (RBAC) with scope-aware permissions + admin bypass. |
| **Permission format** | `module.action[.scope]` — ~130+ keys across 24 modules. |
| **Scope hierarchy** | `OWN → DEPT / PROJECT → ALL` — higher includes lower. |
| **Core function** | `can(user, key, perms, context?, isAdmin?)` in `lib/permissions.ts`. |
| **React integration** | 4 hooks (`usePermission`, `useAnyPermission`, `useAllPermissions`, `usePermissionCheck`) + 4 gate components. |
| **State management** | `AuthContext` loads roles via Firestore `onSnapshot`, resolves user role → permissions array, tracks `isAdmin` state. |
| **Admin UI** | `RolesManager` for CRUD (system role protection, permission search, danger warnings, clone, validation), `PermissionMatrix` for grid view + bulk operations + danger highlighting. |
| **Sync strategy** | Additive merge — new code permissions are synced into Firestore roles without overwriting admin changes. Syncs `isSystem` and `riskLevel` fields. |
| **Storage** | Firestore `roles` collection (source of truth), `DEFAULT_ROLES` in code (seed + sync source). User docs store `roleId` for rule resolution. |
| **12 built-in roles** | GM (full access) → Client (minimal portal access), covering all agency positions. All marked `isSystem: true` with risk levels. |
| **Firestore rules** | Catch-all removed. All access requires auth. Sensitive collections (roles, settings, departments, audit_logs) have admin-only write or immutability rules. |
| **Remaining gap** | Business data collections (clients, projects, tasks) still use auth-only rules. Adding per-collection `hasPermission()` checks is the next priority. |
