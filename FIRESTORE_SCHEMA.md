# IRIS Agency OS — Firestore Database Schema

> **Single Source of Truth for Database Architecture**
> Last updated: June 2025 · Auto-generated from codebase analysis

---

## Table of Contents

1. [Firestore Overview](#1-firestore-overview)
2. [Database Structure](#2-database-structure)
3. [Core Collections](#3-core-collections)
4. [Role & Permission Collections](#4-role--permission-collections)
5. [Client Data Model](#5-client-data-model)
6. [Project Data Model](#6-project-data-model)
7. [Task Data Model](#7-task-data-model)
8. [Creative Direction Data](#8-creative-direction-data)
9. [Social Posting Data](#9-social-posting-data)
10. [Production Data](#10-production-data)
11. [Finance Data](#11-finance-data)
12. [Notification System Data](#12-notification-system-data)
13. [Asset Management](#13-asset-management)
14. [Data Relationships](#14-data-relationships)
15. [Indexing Strategy](#15-indexing-strategy)
16. [Data Consistency](#16-data-consistency)
17. [Data Growth Considerations](#17-data-growth-considerations)
18. [Backup & Recovery](#18-backup--recovery)

---

## 1. Firestore Overview

### Why Firestore?

IRIS Agency OS uses **Cloud Firestore** (Firebase) as its primary database for several strategic reasons:

| Concern | Firestore Advantage |
|---------|-------------------|
| **Real-time sync** | Native `onSnapshot` listeners push changes to all connected clients instantly — critical for a multi-user agency dashboard |
| **Serverless** | No backend infrastructure to maintain; reads/writes go directly from the browser SDK |
| **Offline support** | Built-in offline persistence lets field teams (production, creative) work without connectivity |
| **Security** | Firestore Security Rules enforce access control at the database level |
| **Scaling** | Automatic horizontal scaling handles agency growth without re-architecture |
| **Ecosystem** | Tight integration with Firebase Auth, Cloud Functions, Cloud Storage, and FCM |

### How Firestore Is Used

- **53 real-time `onSnapshot` listeners** are established in `App.tsx` via the `useFirestoreCollection<T>()` hook
- Every listener subscribes to an entire top-level collection and deserializes documents into typed TypeScript interfaces
- State flows through React props (no global store) — `App.tsx` acts as a centralized data layer
- Writes use `setDoc`, `updateDoc`, `addDoc`, and `deleteDoc` directly from component event handlers
- **Cloud Functions** (`processOutbox`) handles background work: fan-out notifications and FCM delivery
- **Firebase Storage** stores binary files (images, videos, documents) referenced by Firestore document URLs

### Listener Architecture

```
App.tsx
  └── useFirestoreCollection<User>('users')              → users[]
  └── useFirestoreCollection<Client>('clients')           → clients[]
  └── useFirestoreCollection<Project>('projects')         → projects[]
  └── useFirestoreCollection<Task>('tasks')               → tasks[]
  └── ... (53 total real-time subscriptions)
  │
  └── Props cascade to child components
       ├── Dashboard, ClientsHub, ProjectsHub, TasksHub ...
       └── Each component receives typed arrays + setter callbacks
```

---

## 2. Database Structure

### High-Level Collection Map

```
firestore/
├── ─── IDENTITY & ACCESS ───────────────────────
│   ├── users                    User profiles & authentication state
│   ├── roles                    Role definitions & permission matrices
│   └── departments              Department configuration
│
├── ─── CLIENT MANAGEMENT ───────────────────────
│   ├── clients                  Client master records
│   ├── client_notes             Per-client notes
│   ├── client_meetings          Meeting records
│   ├── client_brand_assets      Brand guidelines & assets
│   ├── client_monthly_reports   Monthly performance reports
│   ├── client_social_links      Social media account links
│   ├── client_strategies        Marketing strategy documents
│   └── client_approvals         Client approval workflows
│
├── ─── PROJECT MANAGEMENT ──────────────────────
│   ├── projects                 Project master records
│   ├── project_members          Project team assignments
│   ├── project_milestones       Milestone tracking
│   ├── project_activity_logs    Project-level activity audit
│   ├── project_marketing_assets Marketing deliverable tracking
│   └── milestones               Global milestones (standalone)
│
├── ─── TASK MANAGEMENT ─────────────────────────
│   ├── tasks                    Task master records
│   ├── task_comments            Discussion threads on tasks
│   ├── task_time_logs           Time tracking entries
│   ├── task_dependencies        Task dependency graph
│   ├── task_activity_logs       Task-level activity audit
│   ├── task_qc_reviews          Quality control review records
│   ├── approval_steps           Multi-step approval workflows
│   └── notes                    General sticky notes
│
├── ─── CREATIVE & CONTENT ──────────────────────
│   ├── creative_projects        Creative project briefs
│   ├── creative_calendars       Content calendar definitions
│   ├── creative_calendar_items  Individual calendar entries
│   ├── presentation_shares      Shared presentation links
│   └── social_posts             Social media post lifecycle
│
├── ─── PRODUCTION ──────────────────────────────
│   ├── production_plans         Production schedule plans
│   ├── production_assignments   Team member day assignments
│   ├── production_assets        Production media assets
│   ├── shot_lists               Photography/video shot lists
│   ├── call_sheets              Daily call sheets
│   ├── agency_locations         Location database
│   └── agency_equipment         Equipment inventory
│
├── ─── FINANCE ─────────────────────────────────
│   ├── invoices                 Client invoices
│   ├── payments                 Payment records
│   ├── quotations               Price quotations
│   └── expenses                 Expense tracking
│
├── ─── NOTIFICATIONS ───────────────────────────
│   ├── notifications            Per-user notification inbox
│   ├── notification_preferences User notification settings
│   ├── notification_tokens      FCM device tokens
│   └── notifications_outbox     Pending notification queue (Cloud Function)
│
├── ─── CALENDAR ────────────────────────────────
│   ├── calendar_months          Monthly calendar containers
│   └── calendar_items           Individual calendar entries
│
├── ─── HR & TEAM ───────────────────────────────
│   ├── vendors                  Vendor companies
│   ├── freelancers              Freelancer profiles
│   ├── freelancer_assignments   Freelancer task assignments
│   ├── vendor_service_orders    Service order tracking
│   ├── leave_requests           PTO / leave management
│   └── attendance_records       Attendance tracking
│
├── ─── ADMIN & SYSTEM ─────────────────────────
│   ├── settings                 App-wide configuration (singleton)
│   ├── dashboard_banners        Announcement banners
│   ├── workflow_templates        Reusable workflow definitions
│   └── audit_logs               System-wide audit trail
│
└── ─── STORAGE (Firebase Storage, not Firestore) ──
    ├── files/                   User-uploaded files
    └── branding/                App branding assets
```

### Collection Count Summary

| Category | Collections | Documents (est.) |
|----------|:-----------:|:----------------:|
| Identity & Access | 3 | Low (10s) |
| Client Management | 8 | Medium (100s) |
| Project Management | 6 | Medium (100s) |
| Task Management | 8 | High (1,000s) |
| Creative & Content | 5 | Medium (100s) |
| Production | 7 | Medium–High |
| Finance | 4 | Medium (100s) |
| Notifications | 4 | High (10,000s) |
| Calendar | 2 | Medium (100s) |
| HR & Team | 6 | Low–Medium |
| Admin & System | 4 | Low (10s) |
| **Total** | **57** | — |

---

## 3. Core Collections

### `users`

The central identity collection. Each document represents an authenticated team member.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID (matches Firebase Auth UID) |
| `name` | `string` | ✅ | Display name |
| `email` | `string` | ✅ | Email address (unique) |
| `role` | `string` | ✅ | Role slug (references `roles` collection) |
| `department` | `string` | ❌ | Department slug |
| `avatar` | `string` | ❌ | Avatar image URL |
| `phone` | `string` | ❌ | Phone number |
| `specialty` | `string` | ❌ | Professional specialty |
| `status` | `'active' \| 'inactive'` | ✅ | Account status |
| `isOnline` | `boolean` | ❌ | Real-time online presence |
| `lastSeen` | `string` | ❌ | ISO 8601 timestamp of last activity |
| `joinDate` | `string` | ❌ | Date the user joined |
| `bio` | `string` | ❌ | Short biography |
| `location` | `string` | ❌ | Office / city |
| `emergencyContact` | `object` | ❌ | `{ name, phone, relationship }` |
| `requirePasswordChange` | `boolean` | ❌ | Force password reset on next login |
| `createdAt` | `string` | ❌ | ISO 8601 creation timestamp |
| `createdBy` | `string` | ❌ | UID of the creator |

**Document ID strategy**: Firebase Auth UID (`user.uid`)

**Read by**: Every component (user lookups, avatars, team lists)
**Written by**: `AdminHub` → `UsersManager`, `Login`, `ForcePasswordChange`

---

### `departments`

Agency department definitions.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Display name |
| `slug` | `string` | ✅ | URL-safe identifier |
| `description` | `string` | ❌ | Department purpose |
| `color` | `string` | ❌ | Hex color for UI badges |
| `icon` | `string` | ❌ | Icon identifier |
| `headOfDepartment` | `string` | ❌ | User ID of department head |
| `isActive` | `boolean` | ✅ | Whether department is active |
| `order` | `number` | ❌ | Display sort order |
| `createdAt` | `string` | ❌ | ISO 8601 |

**Document ID strategy**: Auto-generated or slug-based

---

### `notes`

General-purpose sticky notes used across the application.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `title` | `string` | ❌ | Note title |
| `content` | `string` | ✅ | Note body (supports rich text) |
| `color` | `string` | ❌ | Background color |
| `isPinned` | `boolean` | ❌ | Pin to top |
| `tags` | `string[]` | ❌ | Categorization tags |
| `createdBy` | `string` | ✅ | User ID of author |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `audit_logs`

System-wide immutable audit trail for compliance and debugging.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `action` | `string` | ✅ | Action type (e.g., `'create'`, `'update'`, `'delete'`) |
| `entityType` | `string` | ✅ | Collection/entity affected |
| `entityId` | `string` | ✅ | Document ID affected |
| `entityName` | `string` | ❌ | Human-readable name |
| `userId` | `string` | ✅ | Actor's user ID |
| `userName` | `string` | ❌ | Actor's display name |
| `details` | `string` | ❌ | Description of the change |
| `changes` | `object` | ❌ | `{ field: { from, to } }` diff |
| `metadata` | `object` | ❌ | Additional context |
| `timestamp` | `string` | ✅ | ISO 8601 |
| `ip` | `string` | ❌ | Client IP (if available) |

**Write pattern**: Append-only — documents are never updated or deleted
**Retention**: Indefinite (consider TTL policy for cost management)

---

## 4. Role & Permission Collections

### `roles`

Defines role-based access control (RBAC) with granular permission matrices.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Display name (e.g., "Creative Director") |
| `slug` | `string` | ✅ | Machine identifier (e.g., `creative_director`) |
| `description` | `string` | ❌ | Role purpose |
| `color` | `string` | ❌ | Badge color |
| `level` | `number` | ✅ | Hierarchy level (lower = more authority) |
| `isSystem` | `boolean` | ❌ | Protected from deletion |
| `isActive` | `boolean` | ✅ | Whether role is assignable |
| `permissions` | `Record<string, boolean>` | ✅ | Permission key → granted |
| `createdAt` | `string` | ❌ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

### Permission Keys

Permissions follow the pattern `module.action`:

```
clients.view          clients.create        clients.edit          clients.delete
projects.view         projects.create       projects.edit         projects.delete
tasks.view            tasks.create          tasks.edit            tasks.delete
tasks.assign          tasks.approve
finance.view          finance.create        finance.edit          finance.delete
team.view             team.create           team.edit             team.delete
production.view       production.create     production.edit       production.delete
creative.view         creative.create       creative.edit         creative.delete
calendar.view         calendar.create       calendar.edit         calendar.delete
files.view            files.create          files.edit            files.delete
analytics.view
notifications.manage
admin.access          admin.roles           admin.departments     admin.workflows
admin.branding        admin.settings        admin.banners
qc.view               qc.create            qc.review
vendors.view          vendors.create        vendors.edit          vendors.delete
```

### Permission Resolution Flow

```
1. User logs in → Firebase Auth provides UID
2. App.tsx loads `users` collection → finds user document → reads `role` field
3. App.tsx loads `roles` collection → finds matching role → reads `permissions` map
4. usePermissions() hook checks:
   hasPermission(permissionKey) → roles.find(r => r.slug === user.role)?.permissions[key] === true
5. <PermissionGate> component conditionally renders UI sections
```

### Security Rules Integration

```javascript
// firestore.rules
function hasPermission(permission) {
  let userRole = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
  let roleDoc = get(/databases/$(database)/documents/roles/$(userRole));
  return roleDoc != null && roleDoc.data.permissions[permission] == true;
}

// Example: notifications — only owner can read/write
match /notifications/{docId} {
  allow read, write: if request.auth != null &&
    resource.data.userId == request.auth.uid;
}
```

> ⚠️ **Current state**: Most collections use a permissive catch-all rule (`allow read, write: if true`). The `hasPermission()` function is defined but only enforced on `notifications`, `notification_preferences`, `notification_tokens`, `task_qc_reviews`, and `creative_*` collections. Tightening rules is a high-priority security improvement.

---

## 5. Client Data Model

### `clients`

Master client records — the top-level entity for all client-related data.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Company / client name |
| `industry` | `string` | ❌ | Industry vertical |
| `contactPerson` | `string` | ❌ | Primary contact name |
| `email` | `string` | ❌ | Contact email |
| `phone` | `string` | ❌ | Contact phone |
| `website` | `string` | ❌ | Client website URL |
| `address` | `string` | ❌ | Physical address |
| `logo` | `string` | ❌ | Logo image URL |
| `status` | `'active' \| 'inactive' \| 'prospect' \| 'archived'` | ✅ | Client lifecycle stage |
| `accountManager` | `string` | ❌ | Assigned user ID |
| `tags` | `string[]` | ❌ | Categorization tags |
| `notes` | `string` | ❌ | General notes |
| `contractStartDate` | `string` | ❌ | Contract start (ISO date) |
| `contractEndDate` | `string` | ❌ | Contract end (ISO date) |
| `monthlyRetainer` | `number` | ❌ | Monthly retainer amount |
| `currency` | `string` | ❌ | Currency code (e.g., `USD`) |
| `socialMedia` | `object` | ❌ | `{ instagram, facebook, twitter, linkedin, tiktok, youtube }` |
| `brandGuidelines` | `object` | ❌ | `{ primaryColor, secondaryColor, fonts, tone }` |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |
| `createdBy` | `string` | ❌ | Creator user ID |

**Side effects on creation**: `createClientFolders()` in `folderUtils.ts` creates a deterministic folder structure:

```
folders/
  └── client_{clientId}           → Root folder: "{clientName}"
      ├── client_{clientId}_brand  → "Brand Assets"
      ├── client_{clientId}_social → "Social Media"
      ├── client_{clientId}_prod   → "Production"
      ├── client_{clientId}_docs   → "Documents"
      ├── client_{clientId}_design → "Designs"
      ├── client_{clientId}_photo  → "Photography"
      ├── client_{clientId}_video  → "Video"
      └── client_{clientId}_other  → "Other"
```

---

### `client_notes`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `content` | `string` | ✅ | Note body |
| `type` | `'general' \| 'meeting' \| 'followup' \| 'important'` | ❌ | Note category |
| `createdBy` | `string` | ✅ | Author user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `client_meetings`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `title` | `string` | ✅ | Meeting title |
| `date` | `string` | ✅ | Meeting date |
| `time` | `string` | ❌ | Meeting time |
| `duration` | `number` | ❌ | Duration in minutes |
| `location` | `string` | ❌ | Physical / virtual location |
| `type` | `'in-person' \| 'video' \| 'phone'` | ❌ | Meeting format |
| `attendees` | `string[]` | ❌ | User IDs of attendees |
| `agenda` | `string` | ❌ | Pre-meeting agenda |
| `notes` | `string` | ❌ | Post-meeting notes |
| `actionItems` | `ActionItem[]` | ❌ | `{ description, assignee, dueDate, completed }` |
| `status` | `'scheduled' \| 'completed' \| 'cancelled'` | ✅ | Meeting status |
| `createdBy` | `string` | ✅ | Organizer user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

### `client_brand_assets`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `name` | `string` | ✅ | Asset name |
| `type` | `'logo' \| 'color' \| 'font' \| 'image' \| 'document' \| 'other'` | ✅ | Asset category |
| `url` | `string` | ❌ | Download/preview URL |
| `fileSize` | `number` | ❌ | Size in bytes |
| `mimeType` | `string` | ❌ | MIME type |
| `metadata` | `object` | ❌ | Type-specific metadata |
| `version` | `number` | ❌ | Version number |
| `isActive` | `boolean` | ❌ | Current version flag |
| `createdBy` | `string` | ✅ | Uploader user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `client_monthly_reports`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `month` | `string` | ✅ | `YYYY-MM` format |
| `metrics` | `object` | ❌ | Performance metrics |
| `highlights` | `string[]` | ❌ | Key achievements |
| `challenges` | `string[]` | ❌ | Issues encountered |
| `nextSteps` | `string[]` | ❌ | Planned actions |
| `status` | `'draft' \| 'review' \| 'approved' \| 'sent'` | ✅ | Report lifecycle |
| `createdBy` | `string` | ✅ | Author user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

### `client_social_links`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `platform` | `string` | ✅ | Social platform name |
| `url` | `string` | ✅ | Profile URL |
| `handle` | `string` | ❌ | @handle |
| `followers` | `number` | ❌ | Follower count |
| `isActive` | `boolean` | ❌ | Active account flag |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `client_strategies`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `title` | `string` | ✅ | Strategy name |
| `description` | `string` | ❌ | Strategy overview |
| `type` | `string` | ❌ | Strategy type |
| `status` | `string` | ❌ | Current status |
| `goals` | `string[]` | ❌ | Strategic goals |
| `tactics` | `object[]` | ❌ | Tactical plan items |
| `createdBy` | `string` | ✅ | Author user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `client_approvals`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `type` | `string` | ✅ | Approval type (content, design, etc.) |
| `title` | `string` | ✅ | Item being approved |
| `description` | `string` | ❌ | Details |
| `status` | `'pending' \| 'approved' \| 'rejected' \| 'revision'` | ✅ | Approval state |
| `attachments` | `string[]` | ❌ | File URLs |
| `feedback` | `string` | ❌ | Client feedback |
| `submittedBy` | `string` | ✅ | Submitter user ID |
| `approvedBy` | `string` | ❌ | Approver identifier |
| `submittedAt` | `string` | ✅ | ISO 8601 |
| `decidedAt` | `string` | ❌ | Decision timestamp |

---

## 6. Project Data Model

### `projects`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Project name |
| `description` | `string` | ❌ | Project brief |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `status` | `'planning' \| 'active' \| 'on-hold' \| 'completed' \| 'cancelled' \| 'archived'` | ✅ | Lifecycle stage |
| `priority` | `'low' \| 'medium' \| 'high' \| 'urgent'` | ❌ | Priority level |
| `type` | `string` | ❌ | Project type / category |
| `startDate` | `string` | ❌ | Planned start (ISO date) |
| `endDate` | `string` | ❌ | Planned end (ISO date) |
| `deadline` | `string` | ❌ | Hard deadline |
| `budget` | `number` | ❌ | Budget amount |
| `currency` | `string` | ❌ | Currency code |
| `progress` | `number` | ❌ | 0–100 percentage |
| `managerId` | `string` | ❌ | Project manager user ID |
| `teamMembers` | `string[]` | ❌ | Array of user IDs |
| `tags` | `string[]` | ❌ | Categorization tags |
| `color` | `string` | ❌ | UI accent color |
| `driveLink` | `string` | ❌ | Google Drive folder URL |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |
| `createdBy` | `string` | ❌ | Creator user ID |

**Side effects on creation**: `createProjectFolders()` creates:

```
folders/
  └── proj_{projectId}             → Root: "{projectName}"
      ├── proj_{projectId}_docs     → "Documents"
      ├── proj_{projectId}_design   → "Designs"
      ├── proj_{projectId}_media    → "Media"
      ├── proj_{projectId}_deliver  → "Deliverables"
      └── proj_{projectId}_other    → "Other"
```

---

### `project_members`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `projectId` | `string` | ✅ | FK → `projects.id` |
| `userId` | `string` | ✅ | FK → `users.id` |
| `role` | `string` | ❌ | Project-specific role |
| `joinedAt` | `string` | ❌ | When member was added |
| `addedBy` | `string` | ❌ | Who added them |

---

### `project_milestones`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `projectId` | `string` | ✅ | FK → `projects.id` |
| `title` | `string` | ✅ | Milestone name |
| `description` | `string` | ❌ | Details |
| `dueDate` | `string` | ❌ | Target date |
| `status` | `'pending' \| 'in-progress' \| 'completed' \| 'overdue'` | ✅ | Progress state |
| `completedAt` | `string` | ❌ | Actual completion date |
| `order` | `number` | ❌ | Sort order |
| `createdBy` | `string` | ❌ | Creator user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `project_activity_logs`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `projectId` | `string` | ✅ | FK → `projects.id` |
| `action` | `string` | ✅ | Action performed |
| `description` | `string` | ❌ | Human-readable description |
| `userId` | `string` | ✅ | Actor user ID |
| `userName` | `string` | ❌ | Actor name (denormalized) |
| `timestamp` | `string` | ✅ | ISO 8601 |
| `metadata` | `object` | ❌ | Additional context |

---

### `project_marketing_assets`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `projectId` | `string` | ✅ | FK → `projects.id` |
| `name` | `string` | ✅ | Asset name |
| `type` | `string` | ✅ | Asset type |
| `url` | `string` | ❌ | File URL |
| `status` | `string` | ❌ | Asset status |
| `createdBy` | `string` | ❌ | Uploader user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `milestones`

A standalone global milestones collection (separate from project-scoped `project_milestones`).

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `title` | `string` | ✅ | Milestone name |
| `description` | `string` | ❌ | Details |
| `projectId` | `string` | ❌ | Optional FK → `projects.id` |
| `clientId` | `string` | ❌ | Optional FK → `clients.id` |
| `dueDate` | `string` | ❌ | Target date |
| `status` | `string` | ✅ | Current status |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

## 7. Task Data Model

### `tasks`

The most heavily used collection — central to all operational work.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `title` | `string` | ✅ | Task title |
| `description` | `string` | ❌ | Detailed description |
| `projectId` | `string` | ✅ | FK → `projects.id` |
| `clientId` | `string` | ❌ | FK → `clients.id` (denormalized) |
| `status` | `TaskStatus` | ✅ | See status enum below |
| `priority` | `'low' \| 'medium' \| 'high' \| 'urgent'` | ❌ | Priority level |
| `type` | `string` | ❌ | Task type / category |
| `assignee` | `string` | ❌ | Primary assignee user ID |
| `assignees` | `string[]` | ❌ | Multiple assignee user IDs |
| `reviewer` | `string` | ❌ | QC reviewer user ID |
| `department` | `string` | ❌ | Owning department |
| `startDate` | `string` | ❌ | Planned start |
| `dueDate` | `string` | ❌ | Due date |
| `completedAt` | `string` | ❌ | Actual completion timestamp |
| `estimatedHours` | `number` | ❌ | Time estimate |
| `actualHours` | `number` | ❌ | Logged hours (aggregated) |
| `tags` | `string[]` | ❌ | Labels / tags |
| `attachments` | `Attachment[]` | ❌ | `{ name, url, type, size, uploadedBy, uploadedAt }` |
| `checklist` | `ChecklistItem[]` | ❌ | `{ id, text, completed, completedBy, completedAt }` |
| `subtasks` | `Subtask[]` | ❌ | `{ id, title, completed, assignee }` |
| `customFields` | `CustomField[]` | ❌ | `{ name, type, value }` |
| `watchers` | `string[]` | ❌ | User IDs receiving notifications |
| `isArchived` | `boolean` | ❌ | Soft-delete / archive flag |
| `archivedAt` | `string` | ❌ | Archive timestamp |
| `archivedBy` | `string` | ❌ | Archiver user ID |
| `workflowStatus` | `object` | ❌ | Workflow engine state |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |
| `createdBy` | `string` | ❌ | Creator user ID |

#### Task Status Enum

```typescript
type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in-progress'
  | 'in-review'
  | 'qc-review'
  | 'client-review'
  | 'revision'
  | 'approved'
  | 'completed'
  | 'on-hold'
  | 'cancelled';
```

**Side effects on creation**: `createTaskFolder()` creates:

```
folders/
  └── task_{taskId}              → Root: "{taskTitle}"
      ├── task_{taskId}_working   → "Working Files"
      ├── task_{taskId}_final     → "Final Files"
      └── task_{taskId}_ref       → "References"
```

---

### `task_comments`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `taskId` | `string` | ✅ | FK → `tasks.id` |
| `content` | `string` | ✅ | Comment body |
| `userId` | `string` | ✅ | Author user ID |
| `userName` | `string` | ❌ | Author name (denormalized) |
| `userAvatar` | `string` | ❌ | Author avatar URL (denormalized) |
| `attachments` | `Attachment[]` | ❌ | Attached files |
| `mentions` | `string[]` | ❌ | @mentioned user IDs |
| `isEdited` | `boolean` | ❌ | Whether comment was edited |
| `parentId` | `string` | ❌ | Parent comment ID (for threading) |
| `reactions` | `Record<string, string[]>` | ❌ | `{ emoji: [userId, ...] }` |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `task_time_logs`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `taskId` | `string` | ✅ | FK → `tasks.id` |
| `userId` | `string` | ✅ | Worker user ID |
| `description` | `string` | ❌ | Work description |
| `hours` | `number` | ✅ | Hours logged |
| `date` | `string` | ✅ | Work date |
| `startTime` | `string` | ❌ | Start time |
| `endTime` | `string` | ❌ | End time |
| `isBillable` | `boolean` | ❌ | Billable flag |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

### `task_dependencies`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `taskId` | `string` | ✅ | Dependent task ID |
| `dependsOnTaskId` | `string` | ✅ | Prerequisite task ID |
| `type` | `'blocks' \| 'blocked-by' \| 'relates-to'` | ✅ | Dependency type |
| `createdBy` | `string` | ❌ | Creator user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `task_activity_logs`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `taskId` | `string` | ✅ | FK → `tasks.id` |
| `action` | `string` | ✅ | Action type |
| `description` | `string` | ❌ | Human-readable description |
| `userId` | `string` | ✅ | Actor user ID |
| `userName` | `string` | ❌ | Actor name (denormalized) |
| `changes` | `object` | ❌ | Field change diff |
| `timestamp` | `string` | ✅ | ISO 8601 |

---

### `task_qc_reviews`

Quality control reviews attached to tasks.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `taskId` | `string` | ✅ | FK → `tasks.id` |
| `reviewerId` | `string` | ✅ | Reviewer user ID |
| `reviewerName` | `string` | ❌ | Reviewer name (denormalized) |
| `status` | `'pending' \| 'approved' \| 'needs-revision' \| 'rejected'` | ✅ | Review outcome |
| `rating` | `number` | ❌ | Quality rating (1–5) |
| `feedback` | `string` | ❌ | Reviewer feedback |
| `categories` | `QCCategory[]` | ❌ | Scored categories `{ name, score, maxScore, notes }` |
| `attachments` | `Attachment[]` | ❌ | Supporting files |
| `revisionNotes` | `string` | ❌ | Required revisions |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

**Composite indexes** (from `firestore.indexes.json`):
- `taskId` ASC + `createdAt` DESC
- `reviewerId` ASC + `createdAt` DESC

---

### `approval_steps`

Multi-step approval workflows for tasks.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `taskId` | `string` | ✅ | FK → `tasks.id` |
| `stepNumber` | `number` | ✅ | Sequence order |
| `approverId` | `string` | ✅ | Required approver user ID |
| `approverName` | `string` | ❌ | Approver name (denormalized) |
| `status` | `'pending' \| 'approved' \| 'rejected'` | ✅ | Step status |
| `feedback` | `string` | ❌ | Approval feedback |
| `decidedAt` | `string` | ❌ | Decision timestamp |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

## 8. Creative Direction Data

### `creative_projects`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Creative project name |
| `description` | `string` | ❌ | Brief / description |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `type` | `string` | ❌ | Project type (campaign, branding, etc.) |
| `status` | `'draft' \| 'active' \| 'completed' \| 'archived'` | ✅ | Lifecycle state |
| `moodboard` | `string[]` | ❌ | Moodboard image URLs |
| `colorPalette` | `string[]` | ❌ | Hex color values |
| `typography` | `object` | ❌ | Font selections |
| `references` | `string[]` | ❌ | Reference URLs |
| `teamMembers` | `string[]` | ❌ | Assigned user IDs |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

**Security rule**: `allow create: if request.auth != null && hasPermission('creative.create')`

---

### `creative_calendars`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Calendar name |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `description` | `string` | ❌ | Calendar description |
| `month` | `string` | ❌ | Target month (`YYYY-MM`) |
| `status` | `string` | ❌ | Calendar status |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

### `creative_calendar_items`

Individual content pieces scheduled on a creative calendar.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `calendarId` | `string` | ✅ | FK → `creative_calendars.id` |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `date` | `string` | ✅ | Scheduled date |
| `title` | `string` | ✅ | Content title |
| `description` | `string` | ❌ | Content description |
| `platform` | `string` | ❌ | Target platform |
| `contentType` | `string` | ❌ | Post type (reel, story, post, etc.) |
| `status` | `string` | ❌ | Production status |
| `assignee` | `string` | ❌ | Assigned user ID |
| `attachments` | `string[]` | ❌ | Visual asset URLs |
| `caption` | `string` | ❌ | Draft caption |
| `hashtags` | `string[]` | ❌ | Hashtag suggestions |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `presentation_shares`

Shareable presentation links for client review.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `calendarId` | `string` | ✅ | FK → `creative_calendars.id` |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `shareToken` | `string` | ✅ | Unique share token (URL slug) |
| `expiresAt` | `string` | ❌ | Expiration timestamp |
| `isActive` | `boolean` | ✅ | Whether link is accessible |
| `password` | `string` | ❌ | Optional access password |
| `viewCount` | `number` | ❌ | Access counter |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

## 9. Social Posting Data

### `social_posts`

Tracks the complete lifecycle of social media content from creation to publishing.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `platform` | `string \| string[]` | ✅ | Target platform(s) |
| `type` | `string` | ❌ | Content type (post, story, reel, etc.) |
| `caption` | `string` | ❌ | Post caption / text |
| `mediaUrls` | `string[]` | ❌ | Media file URLs |
| `hashtags` | `string[]` | ❌ | Hashtags |
| `scheduledDate` | `string` | ❌ | Planned publish date |
| `scheduledTime` | `string` | ❌ | Planned publish time |
| `publishedAt` | `string` | ❌ | Actual publish timestamp |
| `status` | `SocialPostStatus` | ✅ | See enum below |
| `assignee` | `string` | ❌ | Content creator user ID |
| `reviewer` | `string` | ❌ | Content reviewer user ID |
| `feedback` | `string` | ❌ | Review feedback |
| `linkPreview` | `object` | ❌ | OG metadata `{ title, description, image, url }` |
| `engagement` | `object` | ❌ | `{ likes, comments, shares, reach, impressions }` |
| `isArchived` | `boolean` | ❌ | Archive flag |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

#### Social Post Status Enum

```typescript
type SocialPostStatus =
  | 'draft'
  | 'pending-review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'revision';
```

---

## 10. Production Data

### `production_plans`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Plan name |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `date` | `string` | ✅ | Production date |
| `type` | `string` | ❌ | Production type (photo, video, etc.) |
| `status` | `'planning' \| 'confirmed' \| 'in-progress' \| 'completed' \| 'cancelled'` | ✅ | Plan status |
| `location` | `string` | ❌ | Shoot location |
| `locationId` | `string` | ❌ | FK → `agency_locations.id` |
| `teamMembers` | `string[]` | ❌ | Crew user IDs |
| `equipment` | `string[]` | ❌ | Equipment IDs |
| `notes` | `string` | ❌ | Production notes |
| `budget` | `number` | ❌ | Budget amount |
| `callTime` | `string` | ❌ | Call time |
| `wrapTime` | `string` | ❌ | Expected wrap time |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `production_assignments`

Per-person, per-day production scheduling.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `userId` | `string` | ✅ | FK → `users.id` |
| `productionPlanId` | `string` | ❌ | FK → `production_plans.id` |
| `productionDate` | `string` | ✅ | Assignment date |
| `role` | `string` | ❌ | Production role |
| `status` | `'assigned' \| 'confirmed' \| 'completed' \| 'cancelled'` | ✅ | Assignment status |
| `notes` | `string` | ❌ | Notes |
| `callTime` | `string` | ❌ | Individual call time |
| `createdAt` | `string` | ❌ | ISO 8601 |

**Composite index**: `userId` ASC + `productionDate` ASC + `status` ASC

---

### `production_assets`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `productionPlanId` | `string` | ✅ | FK → `production_plans.id` |
| `name` | `string` | ✅ | Asset name |
| `type` | `string` | ✅ | Asset type |
| `url` | `string` | ❌ | File URL |
| `status` | `string` | ❌ | Processing status |
| `uploadedBy` | `string` | ❌ | Uploader user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `shot_lists`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `productionPlanId` | `string` | ✅ | FK → `production_plans.id` |
| `clientId` | `string` | ❌ | FK → `clients.id` |
| `title` | `string` | ✅ | Shot list title |
| `shots` | `Shot[]` | ❌ | Array of `{ number, description, type, angle, notes, completed }` |
| `status` | `string` | ❌ | Completion status |
| `createdBy` | `string` | ❌ | Creator user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `call_sheets`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `productionPlanId` | `string` | ✅ | FK → `production_plans.id` |
| `date` | `string` | ✅ | Shoot date |
| `callTime` | `string` | ✅ | General call time |
| `location` | `string` | ❌ | Shoot location |
| `crew` | `CrewMember[]` | ❌ | `{ userId, role, callTime, notes }` |
| `schedule` | `ScheduleItem[]` | ❌ | `{ time, activity, notes }` |
| `notes` | `string` | ❌ | General notes |
| `weather` | `string` | ❌ | Weather forecast |
| `createdBy` | `string` | ❌ | Creator user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `agency_locations`

Reusable location database for production planning.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Location name |
| `address` | `string` | ❌ | Full address |
| `type` | `string` | ❌ | Location type (studio, outdoor, etc.) |
| `capacity` | `number` | ❌ | Max capacity |
| `amenities` | `string[]` | ❌ | Available amenities |
| `contactPerson` | `string` | ❌ | Contact name |
| `contactPhone` | `string` | ❌ | Contact phone |
| `hourlyRate` | `number` | ❌ | Rental rate |
| `images` | `string[]` | ❌ | Photo URLs |
| `notes` | `string` | ❌ | General notes |
| `isActive` | `boolean` | ❌ | Availability flag |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

### `agency_equipment`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Equipment name |
| `category` | `string` | ❌ | Category (camera, lighting, audio, etc.) |
| `brand` | `string` | ❌ | Brand / manufacturer |
| `model` | `string` | ❌ | Model number |
| `serialNumber` | `string` | ❌ | Serial number |
| `condition` | `string` | ❌ | Current condition |
| `status` | `'available' \| 'in-use' \| 'maintenance' \| 'retired'` | ❌ | Availability |
| `location` | `string` | ❌ | Storage location |
| `purchaseDate` | `string` | ❌ | Purchase date |
| `purchasePrice` | `number` | ❌ | Original cost |
| `notes` | `string` | ❌ | General notes |
| `isActive` | `boolean` | ❌ | Active flag |
| `createdAt` | `string` | ❌ | ISO 8601 |

---

## 11. Finance Data

### `invoices`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `invoiceNumber` | `string` | ✅ | Human-readable invoice number |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `status` | `'draft' \| 'sent' \| 'paid' \| 'overdue' \| 'cancelled' \| 'partial'` | ✅ | Payment status |
| `issueDate` | `string` | ✅ | Invoice issue date |
| `dueDate` | `string` | ✅ | Payment due date |
| `items` | `LineItem[]` | ✅ | `{ description, quantity, unitPrice, total, tax }` |
| `subtotal` | `number` | ✅ | Before tax |
| `taxAmount` | `number` | ❌ | Tax amount |
| `total` | `number` | ✅ | Grand total |
| `currency` | `string` | ❌ | Currency code |
| `paidAmount` | `number` | ❌ | Amount received so far |
| `notes` | `string` | ❌ | Invoice notes |
| `terms` | `string` | ❌ | Payment terms |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `payments`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `invoiceId` | `string` | ✅ | FK → `invoices.id` |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `amount` | `number` | ✅ | Payment amount |
| `currency` | `string` | ❌ | Currency code |
| `method` | `'bank-transfer' \| 'cash' \| 'check' \| 'credit-card' \| 'other'` | ❌ | Payment method |
| `date` | `string` | ✅ | Payment date |
| `reference` | `string` | ❌ | Transaction reference |
| `notes` | `string` | ❌ | Payment notes |
| `status` | `'completed' \| 'pending' \| 'failed' \| 'refunded'` | ✅ | Transaction status |
| `createdBy` | `string` | ✅ | Recorder user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |

---

### `quotations`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `quotationNumber` | `string` | ✅ | Human-readable number |
| `clientId` | `string` | ✅ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `status` | `'draft' \| 'sent' \| 'accepted' \| 'rejected' \| 'expired'` | ✅ | Quotation lifecycle |
| `issueDate` | `string` | ✅ | Issue date |
| `validUntil` | `string` | ✅ | Expiration date |
| `items` | `LineItem[]` | ✅ | Line items |
| `subtotal` | `number` | ✅ | Before tax |
| `taxAmount` | `number` | ❌ | Tax |
| `total` | `number` | ✅ | Grand total |
| `currency` | `string` | ❌ | Currency code |
| `notes` | `string` | ❌ | Notes |
| `terms` | `string` | ❌ | Terms & conditions |
| `createdBy` | `string` | ✅ | Creator user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

### `expenses`

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `description` | `string` | ✅ | Expense description |
| `amount` | `number` | ✅ | Amount |
| `currency` | `string` | ❌ | Currency code |
| `category` | `string` | ✅ | Expense category |
| `date` | `string` | ✅ | Expense date |
| `clientId` | `string` | ❌ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `vendorId` | `string` | ❌ | FK → `vendors.id` |
| `receipt` | `string` | ❌ | Receipt file URL |
| `status` | `'pending' \| 'approved' \| 'rejected' \| 'reimbursed'` | ✅ | Approval status |
| `approvedBy` | `string` | ❌ | Approver user ID |
| `submittedBy` | `string` | ✅ | Submitter user ID |
| `notes` | `string` | ❌ | Notes |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

---

## 12. Notification System Data

The notification system uses a **fan-out pattern** powered by Cloud Functions.

### Architecture Flow

```
1. Client writes to → notifications_outbox (single document)
2. Cloud Function "processOutbox" triggers on create
3. Function fans out:
   ├── Creates individual docs in → notifications/{userId}_{timestamp}
   ├── Queries → notification_tokens for FCM tokens
   └── Sends push notifications via FCM
4. If FCM token is invalid → auto-deletes from notification_tokens
5. Client reads from → notifications (filtered by userId via onSnapshot)
```

### `notifications`

Per-user notification inbox.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `userId` | `string` | ✅ | Recipient user ID |
| `type` | `NotificationType` | ✅ | One of 50+ types (see below) |
| `title` | `string` | ✅ | Notification title |
| `message` | `string` | ✅ | Notification body |
| `data` | `object` | ❌ | Context payload `{ entityId, entityType, ... }` |
| `isRead` | `boolean` | ✅ | Read state (default: `false`) |
| `readAt` | `string` | ❌ | When marked as read |
| `priority` | `'low' \| 'medium' \| 'high' \| 'urgent'` | ❌ | Priority level |
| `actionUrl` | `string` | ❌ | Deep link URL |
| `senderId` | `string` | ❌ | User who triggered the notification |
| `senderName` | `string` | ❌ | Sender name (denormalized) |
| `createdAt` | `string` | ✅ | ISO 8601 |

**Security rule**: Only the owner can read/write their own notifications:
```javascript
allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
```

#### Notification Types (50+)

```
task_assigned, task_completed, task_status_changed, task_comment,
task_due_soon, task_overdue, task_mentioned,
project_created, project_completed, project_status_changed,
qc_review_submitted, qc_review_approved, qc_review_rejected,
approval_requested, approval_approved, approval_rejected,
client_created, client_updated,
invoice_created, invoice_sent, invoice_paid, invoice_overdue,
payment_received, expense_submitted, expense_approved,
production_assigned, production_reminder,
social_post_approved, social_post_published, social_post_rejected,
creative_review_requested, creative_feedback,
leave_requested, leave_approved, leave_rejected,
team_member_joined, role_changed,
system_announcement, maintenance_notice,
... (and more)
```

---

### `notifications_outbox`

Transient queue processed by Cloud Functions. Documents are consumed and can be deleted after processing.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `type` | `string` | ✅ | Notification type |
| `title` | `string` | ✅ | Title |
| `message` | `string` | ✅ | Body |
| `recipientIds` | `string[]` | ✅ | Target user IDs |
| `data` | `object` | ❌ | Context payload |
| `priority` | `string` | ❌ | Priority level |
| `senderId` | `string` | ❌ | Triggering user |
| `senderName` | `string` | ❌ | Sender name |
| `createdAt` | `FieldValue` | ✅ | Server timestamp |

**Cloud Function processing** (`functions/index.js`):
```javascript
exports.processOutbox = onDocumentCreated('notifications_outbox/{docId}', async (event) => {
  // 1. Read outbox document
  // 2. For each recipientId:
  //    a. Create notification doc in 'notifications' collection
  //    b. Fetch FCM tokens from 'notification_tokens'
  //    c. Send push notification via messaging.send()
  //    d. Auto-delete invalid tokens
});
```

---

### `notification_preferences`

Per-user notification delivery preferences.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID (= user ID) |
| `userId` | `string` | ✅ | FK → `users.id` |
| `emailEnabled` | `boolean` | ❌ | Enable email notifications |
| `pushEnabled` | `boolean` | ❌ | Enable push notifications |
| `inAppEnabled` | `boolean` | ❌ | Enable in-app notifications |
| `categories` | `Record<string, boolean>` | ❌ | `{ tasks: true, projects: false, ... }` |
| `quietHours` | `object` | ❌ | `{ enabled, start, end }` |
| `updatedAt` | `string` | ❌ | ISO 8601 |

**Security rule**: Only owner can read/write their preferences.

---

### `notification_tokens`

FCM device registration tokens.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| *(doc ID)* | — | — | The FCM token string itself is the document ID |
| `token` | `string` | ✅ | FCM token (redundant with doc ID) |
| `userId` | `string` | ✅ | FK → `users.id` |
| `uid` | `string` | ✅ | Firebase Auth UID (same as userId) |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `lastSeenAt` | `string` | ❌ | Last token refresh |
| `userAgent` | `string` | ❌ | Browser user agent |
| `platform` | `string` | ✅ | Always `'web'` |
| `updatedAt` | `string` | ❌ | ISO 8601 |

**Document ID strategy**: The FCM token string itself (ensures uniqueness per device)
**Auto-cleanup**: Cloud Functions delete tokens that return `messaging/registration-token-not-registered` errors

---

## 13. Asset Management

### `files`

File metadata for uploaded assets.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Document ID |
| `name` | `string` | ✅ | Original file name |
| `type` | `string` | ✅ | File category (auto-detected) |
| `mimeType` | `string` | ❌ | MIME type |
| `size` | `number` | ❌ | File size in bytes |
| `url` | `string` | ✅ | Firebase Storage download URL |
| `storagePath` | `string` | ❌ | Firebase Storage path |
| `folderId` | `string` | ❌ | FK → `folders.id` |
| `clientId` | `string` | ❌ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `taskId` | `string` | ❌ | FK → `tasks.id` |
| `tags` | `string[]` | ❌ | Categorization tags |
| `description` | `string` | ❌ | File description |
| `uploadedBy` | `string` | ✅ | Uploader user ID |
| `createdAt` | `string` | ✅ | ISO 8601 |
| `updatedAt` | `string` | ❌ | ISO 8601 |

#### File Type Auto-Detection

From `folderUtils.ts > categorizeFileType()`:

| Input MIME Pattern | Categorized As |
|-------------------|----------------|
| `image/*` | `'image'` |
| `video/*` | `'video'` |
| `audio/*` | `'audio'` |
| `application/pdf` | `'document'` |
| `application/msword`, `spreadsheet`, `presentation` | `'document'` |
| `text/*` | `'document'` |
| `application/zip`, `rar`, `7z` | `'archive'` |
| Everything else | `'other'` |

---

### `folders`

Virtual folder hierarchy for organizing files.

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | ✅ | Deterministic ID (see patterns below) |
| `name` | `string` | ✅ | Folder display name |
| `parentId` | `string \| null` | ✅ | Parent folder ID (`null` = root) |
| `clientId` | `string` | ❌ | FK → `clients.id` |
| `projectId` | `string` | ❌ | FK → `projects.id` |
| `taskId` | `string` | ❌ | FK → `tasks.id` |
| `color` | `string` | ❌ | Folder color |
| `icon` | `string` | ❌ | Folder icon |
| `isSystem` | `boolean` | ❌ | System-generated (not user-deletable) |
| `createdBy` | `string` | ❌ | Creator user ID |
| `createdAt` | `string` | ❌ | ISO 8601 |

#### Deterministic Folder ID Patterns

```
Client folders:
  client_{clientId}                → Root
  client_{clientId}_brand          → Brand Assets
  client_{clientId}_social         → Social Media
  client_{clientId}_prod           → Production
  client_{clientId}_docs           → Documents
  client_{clientId}_design         → Designs
  client_{clientId}_photo          → Photography
  client_{clientId}_video          → Video
  client_{clientId}_other          → Other

Project folders:
  proj_{projectId}                 → Root
  proj_{projectId}_docs            → Documents
  proj_{projectId}_design          → Designs
  proj_{projectId}_media           → Media
  proj_{projectId}_deliver         → Deliverables
  proj_{projectId}_other           → Other

Task folders:
  task_{taskId}                    → Root
  task_{taskId}_working            → Working Files
  task_{taskId}_final              → Final Files
  task_{taskId}_ref                → References
```

---

### Firebase Storage Structure

Binary files are stored in **Firebase Storage** (separate from Firestore):

```
storage/
├── files/                      General uploads (referenced by files collection)
│   └── {timestamp}_{filename}
├── branding/                   App branding assets
│   └── {assetType}-{timestamp}-{filename}
└── (user uploads via task attachments, etc.)
```

**Security rules** (`storage.rules`):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ Any authenticated user can read/write any Storage path. Consider path-based restrictions for production.

---

## 14. Data Relationships

### Entity Relationship Diagram

```
                            ┌──────────────┐
                            │   clients    │
                            └──────┬───────┘
                   ┌───────────────┼───────────────┬──────────────────┐
                   │               │               │                  │
            ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐   ┌──────▼──────┐
            │  projects   │ │ client_*   │ │social_posts │   │  invoices   │
            │             │ │ (8 colls)  │ │             │   │  quotations │
            └──────┬──────┘ └────────────┘ └─────────────┘   │  expenses   │
                   │                                          └─────────────┘
         ┌─────────┼──────────┐
         │         │          │
  ┌──────▼──────┐  │   ┌──────▼──────────┐
  │   tasks     │  │   │ project_*       │
  │             │  │   │ (5 colls)       │
  └──────┬──────┘  │   └────────────────-┘
         │         │
   ┌─────┼─────┬───┼──────┐
   │     │     │   │      │
┌──▼──┐ ┌▼──┐ ┌▼─┐ ┌▼──┐ ┌▼────────────┐
│task_│ │t_ │ │t_│ │t_ │ │approval_    │
│comm-│ │ti-│ │de│ │ac-│ │steps        │
│ents │ │me │ │ps│ │ti-│ │task_qc_     │
│     │ │log│ │  │ │vty│ │reviews      │
└─────┘ └───┘ └──┘ └───┘ └─────────────┘

  ┌──────────────┐        ┌────────────────┐
  │   users      │───────▶│    roles       │
  └──────┬───────┘        └────────────────┘
         │
         ├── notification_tokens
         ├── notification_preferences
         ├── notifications
         ├── leave_requests
         ├── attendance_records
         └── production_assignments

  ┌──────────────────┐
  │creative_projects │
  └────────┬─────────┘
           │
    ┌──────▼──────────┐
    │creative_calendars│
    └────────┬─────────┘
             │
    ┌────────▼────────────┐
    │creative_calendar_   │
    │items                │
    └────────┬────────────┘
             │
    ┌────────▼────────────┐
    │presentation_shares  │
    └─────────────────────┘

  ┌──────────────────┐
  │production_plans  │
  └────────┬─────────┘
           │
    ┌──────┼───────┬────────────┐
    │      │       │            │
   ┌▼───┐ ┌▼────┐ ┌▼─────────┐ ┌▼──────────────┐
   │shot│ │call │ │production│ │production_    │
   │list│ │shee-│ │_assets   │ │assignments    │
   │    │ │ts   │ │          │ │               │
   └────┘ └─────┘ └──────────┘ └───────────────┘
```

### Foreign Key Summary

| Collection | FK Field | References |
|-----------|----------|------------|
| `client_*` (8 collections) | `clientId` | `clients.id` |
| `projects` | `clientId` | `clients.id` |
| `project_members` | `projectId` | `projects.id` |
| `project_members` | `userId` | `users.id` |
| `project_milestones` | `projectId` | `projects.id` |
| `project_activity_logs` | `projectId` | `projects.id` |
| `tasks` | `projectId` | `projects.id` |
| `tasks` | `clientId` | `clients.id` |
| `tasks` | `assignee` / `assignees` | `users.id` |
| `task_comments` | `taskId` | `tasks.id` |
| `task_time_logs` | `taskId` | `tasks.id` |
| `task_dependencies` | `taskId` / `dependsOnTaskId` | `tasks.id` |
| `task_activity_logs` | `taskId` | `tasks.id` |
| `task_qc_reviews` | `taskId` | `tasks.id` |
| `approval_steps` | `taskId` | `tasks.id` |
| `creative_calendars` | `clientId` | `clients.id` |
| `creative_calendar_items` | `calendarId` | `creative_calendars.id` |
| `social_posts` | `clientId` | `clients.id` |
| `production_plans` | `clientId` | `clients.id` |
| `production_assignments` | `userId` | `users.id` |
| `invoices` | `clientId` | `clients.id` |
| `payments` | `invoiceId` | `invoices.id` |
| `expenses` | `vendorId` | `vendors.id` |
| `notifications` | `userId` | `users.id` |
| `notification_tokens` | `userId` | `users.id` |
| `files` | `folderId` | `folders.id` |
| `users` | `role` | `roles.slug` |

> **Note**: Firestore has no native foreign key constraints. Referential integrity is enforced at the application layer. Orphaned documents (e.g., tasks referencing a deleted project) are a known risk — see [Data Consistency](#16-data-consistency).

---

## 15. Indexing Strategy

### Existing Composite Indexes

From `firestore.indexes.json`:

| # | Collection | Fields | Query Mode |
|---|-----------|--------|------------|
| 1 | `production_assignments` | `userId` ASC, `productionDate` ASC, `status` ASC | "Show me my assignments for date X" |
| 2 | `task_qc_reviews` | `taskId` ASC, `createdAt` DESC | "Show QC reviews for a task, newest first" |
| 3 | `task_qc_reviews` | `reviewerId` ASC, `createdAt` DESC | "Show a reviewer's reviews, newest first" |

### Auto-Created Single-Field Indexes

Firestore automatically indexes every field in every document. These support:
- Filtering by any single field (`where('clientId', '==', id)`)
- Ordering by any single field (`orderBy('createdAt', 'desc')`)
- Range queries on a single field (`where('dueDate', '<', today)`)

### Recommended Additional Indexes

Based on common query patterns observed in the codebase:

| Collection | Suggested Index | Use Case |
|-----------|----------------|----------|
| `tasks` | `projectId` ASC + `status` ASC + `dueDate` ASC | Task board filtering by project & status |
| `tasks` | `assignee` ASC + `status` ASC + `dueDate` ASC | "My tasks" with status filter |
| `notifications` | `userId` ASC + `isRead` ASC + `createdAt` DESC | Unread notifications, newest first |
| `social_posts` | `clientId` ASC + `scheduledDate` ASC | Client content calendar view |
| `invoices` | `clientId` ASC + `status` ASC + `dueDate` ASC | Client invoice filtering |
| `task_comments` | `taskId` ASC + `createdAt` ASC | Comment threads in order |
| `files` | `folderId` ASC + `createdAt` DESC | Folder contents listing |
| `leave_requests` | `userId` ASC + `status` ASC | Employee leave dashboard |

> ⚠️ **Current pattern**: The app loads entire collections client-side and filters in JavaScript. This works at current scale but will not scale past ~10,000 documents per collection. Adding server-side `where()` clauses with proper indexes is the recommended optimization path.

---

## 16. Data Consistency

### Activity Log Strategy

The application maintains three layers of audit trails:

| Layer | Collection | Scope | Write Pattern |
|-------|-----------|-------|---------------|
| **System-wide** | `audit_logs` | All entities | Append on significant actions |
| **Project-level** | `project_activity_logs` | Per-project | Append on project changes |
| **Task-level** | `task_activity_logs` | Per-task | Append on task changes |

### Denormalization Strategy

Several collections store denormalized copies of data for read performance:

| Collection | Denormalized Field | Source |
|-----------|-------------------|--------|
| `task_comments` | `userName`, `userAvatar` | `users.name`, `users.avatar` |
| `task_activity_logs` | `userName` | `users.name` |
| `project_activity_logs` | `userName` | `users.name` |
| `notifications` | `senderName` | `users.name` |
| `task_qc_reviews` | `reviewerName` | `users.name` |
| `approval_steps` | `approverName` | `users.name` |

> ⚠️ **Stale data risk**: If a user changes their name, denormalized copies in existing documents are NOT updated. This is an acceptable tradeoff for read performance in a small-to-medium agency.

### Soft Delete / Archive Pattern

Tasks and social posts use a soft-delete pattern instead of physical deletion:

```typescript
// Task archival
{
  isArchived: true,
  archivedAt: '2025-06-15T10:30:00Z',
  archivedBy: 'user_abc123'
}

// Social post archival
{
  isArchived: true
}
```

- Archived items are filtered out in UI queries (`items.filter(t => !t.isArchived)`)
- Data remains in Firestore and counts toward storage costs
- No automated cleanup/TTL policy exists currently

### Cascading Deletes

Firestore has **no cascading delete support**. When a parent entity is deleted:

| Parent Deleted | Orphaned Children | Current Handling |
|---------------|-------------------|-----------------|
| `clients` | `client_*` (8 collections), `projects`, `tasks`, `invoices`, etc. | ❌ Not handled — orphans remain |
| `projects` | `project_*`, `tasks` under that project | ❌ Not handled |
| `tasks` | `task_*` (5 collections) | ❌ Not handled |
| `users` | `notifications`, `notification_tokens`, assigned tasks | ⚠️ Partial — user status set to `inactive` |

> **Recommendation**: Implement a Cloud Function triggered on document deletes to clean up child collections, or adopt a strict soft-delete-only policy.

---

## 17. Data Growth Considerations

### Firestore Document Limits

| Limit | Value | Impact |
|-------|-------|--------|
| Max document size | **1 MiB** | Tasks with many attachments/checklists may approach this |
| Max field depth | **20 levels** | Not a concern (max depth is ~3 in current schema) |
| Max fields per document | **20,000** | Not a concern |
| Max write rate per document | **1 write/sec** | High-traffic counters (e.g., `viewCount`) could be affected |
| Max collection size | **Unlimited** | No hard limit, but cost scales linearly |

### Growth Projections

| Collection | Est. Annual Growth | Cost Driver |
|-----------|-------------------|-------------|
| `notifications` | **High** — every action generates N notifications | Reads + Storage |
| `task_activity_logs` | **High** — every task change logged | Storage |
| `task_comments` | **Medium–High** — active discussion threads | Storage |
| `audit_logs` | **High** — every significant action | Storage |
| `files` | **Medium** — metadata only (binaries in Storage) | Storage |
| `tasks` | **Medium** — accumulates over time if not archived | Reads (full collection load) |

### Scaling Concerns

1. **Full-collection subscriptions**: All 53 `onSnapshot` listeners load entire collections. At 10,000+ tasks, this becomes expensive in reads and memory.
   - **Mitigation**: Add `where()` clauses, pagination, or archive old data.

2. **Notification volume**: Each outbox entry fans out to N users × 1 notification doc + 1 FCM send.
   - **Mitigation**: Implement notification batching and TTL-based cleanup.

3. **No data partitioning**: All clients share one flat Firestore database.
   - **Mitigation**: If multi-tenancy is needed, prefix collection names or use separate projects.

4. **Timestamp-based queries**: Without proper composite indexes, Firestore may need to scan entire collections.
   - **Mitigation**: Add the recommended indexes from [Section 15](#15-indexing-strategy).

---

## 18. Backup & Recovery

### Current State

| Feature | Status |
|---------|--------|
| Automatic daily backups | ❌ Not configured |
| Point-in-time recovery | ❌ Not enabled |
| Manual export/import | ✅ Available via `gcloud` CLI |
| Seed data for development | ✅ `constants.ts` has seed data |

### Recommended Backup Strategy

#### 1. Enable Point-in-Time Recovery (PITR)

```bash
gcloud firestore databases update --type=firestore-native \
  --enable-pitr --project=iris-os-43718
```

Provides 7-day recovery window with 1-minute granularity.

#### 2. Scheduled Exports

```bash
# Export all collections to Cloud Storage
gcloud firestore export gs://iris-os-43718-backups/$(date +%Y%m%d) \
  --project=iris-os-43718

# Schedule via Cloud Scheduler + Cloud Function
# Run daily at 2:00 AM UTC
```

#### 3. Development Seed Data

The `constants.ts` file contains seed data structures (`DEFAULT_BRANDING`, `DEFAULT_SETTINGS`, `DEFAULT_ROLES`, etc.) used to initialize new environments. Use `seedData.ts` utilities for populating development databases.

#### 4. Disaster Recovery Procedure

```bash
# 1. List available exports
gsutil ls gs://iris-os-43718-backups/

# 2. Import from backup
gcloud firestore import gs://iris-os-43718-backups/20250615 \
  --project=iris-os-43718

# 3. Verify data integrity
# Check document counts per collection match expected values
```

---

## Appendix: Quick Reference

### All Collection Names (Alphabetical)

```
agency_equipment          agency_locations          approval_steps
attendance_records        audit_logs                calendar_items
calendar_months           call_sheets               client_approvals
client_brand_assets       client_meetings           client_monthly_reports
client_notes              client_social_links       client_strategies
clients                   creative_calendar_items   creative_calendars
creative_projects         dashboard_banners         departments
expenses                  files                     folders
freelancer_assignments    freelancers               invoices
leave_requests            milestones                notes
notification_preferences  notification_tokens       notifications
notifications_outbox      payments                  presentation_shares
production_assets         production_assignments    production_plans
project_activity_logs     project_marketing_assets  project_members
project_milestones        projects                  quotations
roles                     settings                  shot_lists
social_posts              tasks                     task_activity_logs
task_comments             task_dependencies         task_qc_reviews
task_time_logs            users                     vendor_service_orders
vendors                   workflow_templates
```

**Total: 57 collections**

### Document ID Strategies

| Strategy | Used By |
|----------|---------|
| Firebase Auth UID | `users`, `notification_preferences` |
| Auto-generated (`addDoc`) | Most collections |
| Deterministic pattern | `folders` (`client_{id}`, `proj_{id}`, `task_{id}`) |
| FCM token string | `notification_tokens` |

### Timestamp Format

All timestamps use **ISO 8601 strings** (e.g., `2025-06-15T10:30:00.000Z`) stored as Firestore `string` fields — NOT native Firestore `Timestamp` objects. The one exception is `notifications_outbox.createdAt`, which uses `FieldValue.serverTimestamp()` for Cloud Function trigger ordering.

---

*This document was generated from codebase analysis of `types.ts`, `constants.ts`, `App.tsx`, `firestore.rules`, `firestore.indexes.json`, `functions/index.js`, and utility files. Keep it in sync with schema changes.*
