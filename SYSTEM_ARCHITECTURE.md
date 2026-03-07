# IRIS Agency OS — System Architecture

> **Version:** 1.0  
> **Last Updated:** March 2026  
> **Status:** Production

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Application Modules](#4-application-modules)
5. [State Management](#5-state-management)
6. [Data Flow](#6-data-flow)
7. [Backend Architecture](#7-backend-architecture)
8. [Firestore Data Model](#8-firestore-data-model)
9. [Permissions System](#9-permissions-system)
10. [File Management Architecture](#10-file-management-architecture)
11. [Notification Architecture](#11-notification-architecture)
12. [AI Architecture](#12-ai-architecture)
13. [PWA Architecture](#13-pwa-architecture)
14. [Security Model](#14-security-model)
15. [Performance Characteristics](#15-performance-characteristics)
16. [Current Architectural Limitations](#16-current-architectural-limitations)
17. [Future Architecture Evolution](#17-future-architecture-evolution)
18. [Summary](#18-summary)

---

## 1. System Overview

IRIS Agency OS is a unified operating system for creative agencies. It consolidates the fragmented toolchain that agencies typically rely on — project management platforms, CRM systems, file storage services, production tracking spreadsheets, financial accounting tools, and social media planning calendars — into a single real-time web application.

The platform replaces:

| Traditional Tool | IRIS OS Equivalent |
|---|---|
| Trello / Asana / Monday | Tasks Hub, Projects Hub, Task Board |
| Google Drive / Dropbox | Files Hub with hierarchical folder management |
| HubSpot / Salesforce | Clients Hub with CRM capabilities |
| Spreadsheet-based production tracking | Production Hub with shot lists, call sheets, equipment |
| QuickBooks / Xero | Finance Hub with invoices, quotations, payments, expenses |
| Later / Hootsuite / Buffer | Posting Hub with caption workflows and scheduling |
| Slack / Email chains | Notification system with in-app, push, and real-time updates |
| Separate analytics dashboards | Analytics Hub with executive, departmental, and financial views |

The system is built as an installable Progressive Web App (PWA) with real-time data synchronization. All connected users see changes instantly without manual refresh. The target users are agency team members across roles: General Managers, Creative Directors, Art Directors, Account Managers, Production Managers, Designers, Copywriters, and Social Managers.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                  │
│     GM · Creative Director · Account Manager · Designer · ...   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER / PWA SHELL                           │
│   Service Worker · Manifest · Offline Cache · Push Receiver     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT APPLICATION                            │
│   React 19 · TypeScript · Vite · TailwindCSS                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  APP.TSX ORCHESTRATOR                            │
│   Auth Guard · View Router · State Manager · CRUD Handlers      │
│   Notification Dispatcher · Permission Enforcer                 │
└───────────┬──────────┬──────────┬──────────┬────────────────────┘
            │          │          │          │
            ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN MODULES (HUBS)                       │
│                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ Dashboard │ │  Clients  │ │ Projects  │ │   Tasks   │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │Production │ │ Creative  │ │    QC     │ │  Posting  │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │  Finance  │ │  Vendors  │ │   Team    │ │ Analytics │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                     │
│  │  Calendar │ │  Notifs   │ │   Admin   │                     │
│  └───────────┘ └───────────┘ └───────────┘                     │
│                                                                 │
│  AI Assistant (Gemini-powered overlay)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FIREBASE INFRASTRUCTURE                       │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Firestore  │ │  Storage   │ │    Auth    │ │  Functions │   │
│  │  (NoSQL)   │ │  (Files)   │ │  (Users)   │ │  (Backend) │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌────────────┐                                  │
│  │    FCM     │ │  Hosting   │                                  │
│  │   (Push)   │ │  (Deploy)  │                                  │
│  └────────────┘ └────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Descriptions

| Layer | Responsibility |
|---|---|
| **Users** | Agency team members interacting through browsers on desktop and mobile devices. |
| **Browser / PWA Shell** | The installable PWA container. Manages service workers for push notifications and asset caching. Provides offline shell support. |
| **React Application** | The single-page application built with React 19, TypeScript, and Vite. TailwindCSS handles all styling. |
| **App.tsx Orchestrator** | The central coordination layer. Manages authentication guards, view routing, Firestore real-time subscriptions, CRUD handler functions, and data distribution to child modules. |
| **Domain Modules (Hubs)** | Independent feature modules, each encapsulating a business domain. Receive data and handler functions as props from the orchestrator. |
| **Firebase Infrastructure** | The serverless backend. Firestore for real-time data, Storage for file uploads, Auth for identity, Cloud Functions for server-side processing, FCM for push notifications, and Hosting for deployment. |

---

## 3. Frontend Architecture

### Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | UI rendering and component model |
| TypeScript | 5.8 | Type safety across the entire codebase |
| Vite | 6.2 | Build tooling, HMR, and development server |
| TailwindCSS | 3.4 | Utility-first CSS framework |
| Firebase SDK | 12.6 | Client-side Firebase integration |
| Recharts | 3.5 | Analytics and data visualization |
| Lucide React | 0.554 | Icon library |
| Google Generative AI | 0.24 | Gemini API integration for AI Assistant |
| vite-plugin-pwa | 1.2 | PWA manifest generation and service worker management |

### Architectural Pattern: Centralized Orchestrator

The application follows a **centralized orchestrator pattern** where `App.tsx` (2,508 lines) serves as the single coordination point for the entire application. This is a deliberate design choice, not an accident of growth.

**How App.tsx works:**

1. **Authentication Guard** — Checks if a user is logged in. If not, renders `<Login />`. If the user requires a password change, renders `<ForcePasswordChange />`.

2. **Real-Time Data Subscriptions** — Establishes 53 Firestore real-time listeners via the `useFirestoreCollection` hook. Each listener maintains a live connection to a Firestore collection and automatically updates local state when data changes on the server.

3. **View Routing** — Uses a simple `activeView` state string (e.g., `'dashboard'`, `'tasks'`, `'clients'`) and a `renderContent()` switch statement to render the correct module.

4. **CRUD Handlers** — Defines all Create, Read, Update, Delete handler functions for every entity type. These handlers write to Firestore, trigger notifications, create audit logs, and manage side effects (e.g., auto-creating folder structures when a client is added).

5. **Data Distribution** — Passes the relevant slices of state and handler functions as props to each domain module. Modules are pure consumers — they receive data and callbacks, never access Firestore directly.

**Why this architecture was chosen:**

- **Single source of truth** — All data flows through one component, eliminating data synchronization bugs between modules.
- **Simplified real-time management** — All 53 Firestore listeners are managed in one place, making it easy to track subscriptions and prevent memory leaks.
- **Cross-module side effects** — When a task status changes, the system may need to update milestones, trigger notifications, initialize QC blocks, and create audit logs. Centralizing handlers makes this orchestration straightforward.
- **No state library overhead** — Eliminates the need for Redux, Zustand, or MobX. The tradeoff is file size, but the benefit is zero abstraction layers between the user action and the Firestore write.

### Component Hierarchy

```
index.tsx
  └─ AuthProvider (contexts/AuthContext.tsx)
     └─ BrandingProvider (contexts/BrandingContext.tsx)
        └─ App.tsx (Orchestrator)
           ├─ SplashScreen
           ├─ Login
           ├─ ForcePasswordChange
           ├─ Sidebar
           ├─ Header
           ├─ [Active Hub Module]
           ├─ AIAssistant (overlay)
           ├─ TaskDetailView (global overlay)
           ├─ PWAInstallPrompt
           └─ Toast Notification
```

---

## 4. Application Modules

Each module in IRIS OS is referred to as a **Hub**. Hubs are self-contained React components that receive all required data and handler functions as props from the orchestrator.

### 4.1 Dashboard

| Attribute | Detail |
|---|---|
| **Component** | `Dashboard.tsx` |
| **Purpose** | Personalized landing page showing the current user's most relevant information at a glance. |
| **Key Responsibilities** | Display task statistics, pending approvals, upcoming meetings, team progress, active milestones, personal notes, calendar overview. |
| **Data Objects** | `Task`, `Project`, `User`, `Client`, `SocialPost`, `TaskTimeLog`, `ClientMeeting`, `Note`, `ProjectMilestone`, `Milestone`, `ApprovalStep` |
| **Interactions** | Navigates to Tasks, Clients, Posting, Calendar. Opens task detail overlay. |

The dashboard uses a widget-based layout with specialized sub-components:
- `MyTasksWidget` — Tasks assigned to the current user
- `NeedsMyApprovalCard` — Pending approval actions
- `MeetingsWidget` — Upcoming client meetings
- `MilestonesWidget` — Active project milestones
- `NotesWidget` — Personal notes
- `CalendarWidget` — Calendar overview
- `GmUrgentTasksWidget` — GM-specific urgent tasks view
- `TeamProgressWidget` — Department-wide progress

### 4.2 Clients Hub

| Attribute | Detail |
|---|---|
| **Component** | `ClientsHub.tsx` |
| **Purpose** | Full CRM for managing client relationships, contacts, meetings, brand assets, monthly reports, social links, and notes. |
| **Key Responsibilities** | Client CRUD, contact management, meeting scheduling with auto-folder creation, brand asset management, monthly report uploads, social link tracking. |
| **Data Objects** | `Client`, `ClientContact`, `ClientSocialLink`, `ClientNote`, `ClientMeeting`, `ClientBrandAsset`, `ClientMonthlyReport`, `Project`, `Invoice`, `AgencyFile`, `FileFolder` |
| **Interactions** | Links to Projects (via client's projects), Files (via client folders), Finance (via client invoices). |

### 4.3 Projects Hub

| Attribute | Detail |
|---|---|
| **Component** | `ProjectsHub.tsx` |
| **Purpose** | Project lifecycle management from planning through completion and archival. |
| **Key Responsibilities** | Project CRUD, member assignment, milestone tracking, marketing asset management, smart project creation from calendar data, file management within projects. |
| **Data Objects** | `Project`, `ProjectMember`, `ProjectMilestone`, `ProjectActivityLog`, `ProjectMarketingAsset`, `Milestone`, `CalendarMonth`, `CalendarItem`, `WorkflowTemplate` |
| **Interactions** | Creates Tasks with workflow templates, links to Calendar items, manages Freelancer assignments. |

**Smart Project Creation:** Projects can be created from Calendar month data, automatically generating tasks, milestones, and linking calendar items to delivery tasks.

### 4.4 Tasks Hub

| Attribute | Detail |
|---|---|
| **Component** | `TasksHub.tsx` |
| **Purpose** | Task management with board view, list view, and detailed task workflow management. |
| **Key Responsibilities** | Task CRUD, status transitions through the workflow pipeline, multi-level approval workflows, revision cycles, time logging, commenting, file attachments, dependency tracking, social media handover. |
| **Data Objects** | `Task`, `TaskComment`, `TaskTimeLog`, `TaskDependency`, `TaskActivityLog`, `ApprovalStep`, `ClientApproval`, `AgencyFile`, `WorkflowTemplate`, `SocialPost` |
| **Interactions** | Triggers QC reviews, creates Social Posts on handover, updates milestones on completion. |

**Task Status Pipeline:**
```
NEW → ASSIGNED → IN_PROGRESS → AWAITING_REVIEW → APPROVED → CLIENT_REVIEW → CLIENT_APPROVED → COMPLETED → ARCHIVED
                                    │                                                              ▲
                                    └─── REVISIONS_REQUIRED ───────────────────────────────────────┘
```

### 4.5 Quality Control Hub

| Attribute | Detail |
|---|---|
| **Component** | `QualityControlHub.tsx` |
| **Purpose** | Centralized quality gate for reviewing tasks before they proceed through the approval workflow. |
| **Key Responsibilities** | QC review queue, multi-reviewer approval, delivery link review (Google Drive), QC status management (PENDING / APPROVED / REJECTED / NEEDS_INTERVENTION). |
| **Data Objects** | `Task` (with `TaskQCBlock`), `QCReview`, `WorkflowTemplate`, `ApprovalStep` |
| **Interactions** | Blocks task progression until QC passes, notifies reviewers, triggers workflow continuation on approval. |

QC is automatically enabled based on the task's workflow template `requiresQC` flag or a per-task `qcOverride`.

### 4.6 Creative Direction Hub

| Attribute | Detail |
|---|---|
| **Component** | `CreativeDirectionHub.tsx` |
| **Purpose** | Manages the creative pipeline from strategy to content calendar approval. |
| **Key Responsibilities** | Creative project management, copywriter assignment, creative calendar creation with items, review and approval workflow, revision cycles with reference attachments, presentation sharing via public links. |
| **Data Objects** | `CreativeProject`, `CreativeCalendar`, `CreativeCalendarItem`, `PresentationShare` |
| **Interactions** | Links to Clients (via strategy), generates Calendar items, produces shareable presentation links for client review. |

**Sub-components:**
- `CopywriterView` — Content creation interface for copywriters
- `ManagerView` — Review and approval interface for Creative Directors
- `SwipeReviewCard` — Mobile-friendly swipe review interface
- `ShareLinkManager` — Public presentation link generation with token-based security
- `CalendarPresentationView` — Read-only presentation view for clients

### 4.7 Calendar Hub

| Attribute | Detail |
|---|---|
| **Component** | `CalendarHub.tsx` |
| **Purpose** | Content calendar management. Defines what content will be produced for each client each month. |
| **Key Responsibilities** | Calendar month creation, content item scheduling (VIDEO / PHOTO / MOTION), reference material attachment, publish date assignment. |
| **Data Objects** | `CalendarMonth`, `CalendarItem`, `CalendarReferenceLink`, `CalendarReferenceFile` |
| **Interactions** | Feeds into Projects (smart project creation), links to Tasks (delivery tasks), feeds Creative Direction. |

### 4.8 Posting Hub

| Attribute | Detail |
|---|---|
| **Component** | `PostingHub.tsx` |
| **Purpose** | Social media post management from caption writing through scheduling and publishing. |
| **Key Responsibilities** | Social post management, caption writing and revision, platform assignment, scheduling, publish tracking, archival. |
| **Data Objects** | `SocialPost`, `Task`, `Project`, `Client` |
| **Interactions** | Receives handover from Tasks (via social handover), archives tasks upon publishing. |

**Post Status Pipeline:**
```
PENDING → READY → SCHEDULED → PUBLISHED
            │
            └─── REVISION_REQUESTED
```

### 4.9 Finance Hub

| Attribute | Detail |
|---|---|
| **Component** | `FinanceHub.tsx` |
| **Purpose** | Financial management including quotations, invoices, payments, and expense tracking. |
| **Key Responsibilities** | Quotation creation, invoice generation with line items, payment recording with automatic invoice status updates, expense tracking linked to projects, budget monitoring. |
| **Data Objects** | `Quotation`, `Invoice`, `Payment`, `Expense`, `Project`, `Client` |
| **Interactions** | Links to Projects (budget tracking), links to Clients (client billing). |

Payments automatically recalculate invoice balances and transition invoice status (`draft` → `sent` → `partially_paid` → `paid`).

### 4.10 Production Hub

| Attribute | Detail |
|---|---|
| **Component** | `ProductionHub.tsx` |
| **Purpose** | Physical production management for shoots and content creation sessions. |
| **Key Responsibilities** | Production planning, shot list creation, call sheet generation, location management, equipment inventory tracking, team scheduling with conflict detection, production task generation. |
| **Data Objects** | `ProductionPlan`, `ShotList`, `CallSheet`, `AgencyLocation`, `AgencyEquipment`, `Shot`, `CallSheetCrewMember`, `LeaveRequest` |
| **Interactions** | Creates Tasks from production plans, checks Team availability (leave requests), links to Calendar items. |

**Production Planning Flow:**
```
Select Client → Choose Content from Calendar → Set Production Date → Assign Team (with conflict detection) → Generate Production Tasks
```

### 4.11 Vendors Hub

| Attribute | Detail |
|---|---|
| **Component** | `VendorsHub.tsx` |
| **Purpose** | External vendor and freelancer relationship management. |
| **Key Responsibilities** | Vendor CRUD (rental, location, printing, catering), freelancer management with rates, freelancer assignment to projects, vendor service order tracking. |
| **Data Objects** | `Vendor`, `Freelancer`, `FreelancerAssignment`, `VendorServiceOrder` |
| **Interactions** | Links to Projects (vendor assignments), links to Finance (service orders). |

### 4.12 Team Hub

| Attribute | Detail |
|---|---|
| **Component** | `TeamHub.tsx` |
| **Purpose** | Human resource management for agency team members. |
| **Key Responsibilities** | User management, department assignment, leave request workflow, attendance tracking, role assignment. |
| **Data Objects** | `User`, `LeaveRequest`, `AttendanceRecord`, `DepartmentDefinition`, `RoleDefinition` |
| **Interactions** | Links to Tasks (user assignment), links to Production (availability checks). |

### 4.13 Analytics Hub

| Attribute | Detail |
|---|---|
| **Component** | `AnalyticsHub.tsx` |
| **Purpose** | Data visualization and reporting across all agency operations. |
| **Key Responsibilities** | Executive overview, department performance metrics, project analytics, financial reporting. |
| **Data Objects** | `Task`, `Project`, `Invoice`, `User`, `Payment`, `Expense`, `Client` |
| **Interactions** | Read-only module — consumes data from all other domains. |

**Views:** `ExecutiveView`, `DepartmentsView`, `ProjectsView`, `FinancialView`

### 4.14 Notifications Hub

| Attribute | Detail |
|---|---|
| **Component** | `NotificationsHub.tsx` + `NotificationConsole.tsx` |
| **Purpose** | Centralized notification management with preference controls. |
| **Key Responsibilities** | Notification list with read/unread management, preference configuration (mute categories, severity threshold, delivery channel selection), manual notification broadcasting (admin only). |
| **Data Objects** | `Notification`, `NotificationPreference` |
| **Interactions** | Receives events from all modules. Links to source entities via `actionUrl`. |

### 4.15 Admin Hub

| Attribute | Detail |
|---|---|
| **Component** | `AdminHub.tsx` |
| **Purpose** | System administration and configuration. |
| **Key Responsibilities** | User management, role and permission configuration, workflow template management, department management, dashboard banner management, audit log viewing, branding customization. |
| **Data Objects** | `User`, `RoleDefinition`, `WorkflowTemplate`, `DepartmentDefinition`, `DashboardBanner`, `AuditLog`, `AppBranding`, `AppSettings` |
| **Interactions** | Configures system-wide settings consumed by all other modules. |

**Sub-components:** `AdminOverview`, `UsersManager`, `WorkflowsManager`, `DepartmentsManager`, `BannerManager`, `BrandingEditor`

### 4.16 AI Assistant

| Attribute | Detail |
|---|---|
| **Component** | `AIAssistant.tsx` |
| **Purpose** | AI-powered creative assistant accessible from any view. |
| **Key Responsibilities** | Creative brief drafting, social caption generation, production logistics suggestions, general creative ideation. |
| **Data Objects** | Conversational messages (local state) |
| **Interactions** | Standalone overlay, does not directly modify application data. |

---

## 5. State Management

### Strategy: Props-Down, Events-Up with Real-Time Sync

IRIS OS deliberately avoids external state management libraries (Redux, Zustand, Jotai, MobX). The state management strategy has three pillars:

#### 5.1 App.tsx Global State

`App.tsx` holds all application state as React `useState` hooks (for UI state) and `useFirestoreCollection` hook returns (for persistent data). This creates approximately 53 live data arrays, each mapped to a Firestore collection.

```
App.tsx State
├── UI State (useState)
│   ├── activeView: string
│   ├── targetProjectId: string | null
│   ├── targetTaskId: string | null
│   ├── isAIOpen: boolean
│   ├── isSidebarOpen: boolean
│   ├── toast: { title, message } | null
│   └── splashFinished: boolean
│
├── Persistent State (useFirestoreCollection → Firestore onSnapshot)
│   ├── users, tasks, projects, clients
│   ├── clientSocialLinks, clientNotes, clientMeetings, clientBrandAssets
│   ├── invoices, quotations, payments, expenses
│   ├── projectMembers, projectMilestones, projectLogs
│   ├── socialPosts, taskComments, taskTimeLogs
│   ├── approvalSteps, clientApprovals, files, folders
│   ├── shotLists, callSheets, locations, equipment
│   ├── vendors, freelancers, assignments, serviceOrders
│   ├── leaveRequests, attendanceRecords, notifications
│   ├── calendarMonths, calendarItems
│   ├── creativeProjects, creativeCalendars, creativeCalendarItems
│   ├── qcReviews, milestones, productionPlans
│   ├── systemRoles, auditLogs, workflowTemplates
│   ├── departments, dashboardBanners, notes
│   └── notificationPreferences (per-user, useState + Firestore)
│
└── Derived State (useMemo / computed)
    ├── activeTasks (filtered: !isDeleted)
    ├── activeUsers (filtered: status !== 'inactive')
    ├── dashboardBanner (first active banner)
    └── notifications (filtered by userId, sorted by date)
```

#### 5.2 Real-Time Firestore Subscriptions

The `useFirestoreCollection` hook wraps Firestore's `onSnapshot` listener:

```
useFirestoreCollection<T>(collectionName, defaultValue)
  │
  ├── Creates: query(collection(db, collectionName))
  ├── Subscribes: onSnapshot(query, callback)
  ├── Returns: [data: T[], loading: boolean, error: Error | null]
  └── Cleanup: Unsubscribes on unmount or collection name change
```

Every subscription is a live WebSocket connection to Firestore. When any client writes data, all connected clients receive the update within milliseconds.

#### 5.3 Props Passing

Hub modules receive data and callbacks as React props. This is a unidirectional data flow:

```
App.tsx (data + handlers)
    │
    ├──props──▶ ClientsHub (clients, projects, onAddClient, onUpdateClient, ...)
    ├──props──▶ TasksHub (tasks, projects, users, onAddTask, onUpdateTask, ...)
    └──props──▶ FinanceHub (invoices, payments, onAddInvoice, onAddPayment, ...)
```

### Advantages

- **Guaranteed consistency** — All modules see the same data at the same time.
- **Simplified debugging** — All state mutations go through handler functions in one file.
- **No stale state** — Firestore listeners ensure data is always current.
- **Zero boilerplate** — No actions, reducers, selectors, or middleware.

### Limitations

- **Prop drilling depth** — Some deeply nested components receive many props.
- **App.tsx file size** — The orchestrator file is 2,508 lines, making it harder to navigate.
- **Re-render scope** — State changes in App.tsx can trigger re-renders across all mounted children (mitigated by React's diffing and `useMemo`).
- **All collections loaded** — Every collection is subscribed to on app load, regardless of which module is active.

---

## 6. Data Flow

### Lifecycle of a User Action

The following diagram traces a typical user action — updating a task status — through the system:

```
┌──────────────┐
│  User clicks  │
│"Submit for    │
│  Review"      │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  TaskDetailView   │
│  Component        │
│  calls            │
│  onUpdateTask()   │
└──────┬───────────┘
       │ (prop callback)
       ▼
┌──────────────────────────────────────────────────────────┐
│  App.tsx → handleUpdateTask(updatedTask)                  │
│                                                          │
│  1. Write updated task to Firestore                      │
│  2. Create TaskActivityLog entry                         │
│  3. Check if QC should be triggered                      │
│     └─ If yes: Initialize QC block, notify reviewers     │
│  4. Notify assignees of status change                    │
│  5. Check for new/removed assignees → notify             │
│  6. Check for due date changes → notify                  │
│  7. Recalculate milestone progress if linked             │
└──────┬───────────────────────────────────────────────────┘
       │ (Firestore write)
       ▼
┌──────────────────────────────────────────────────────────┐
│  Firestore                                               │
│  Document updated in 'tasks' collection                  │
│  Notification documents written to 'notifications'       │
│  Outbox entry created in 'notifications_outbox'          │
└──────┬───────────────────────────────────────────────────┘
       │ (onSnapshot triggers)
       ▼
┌──────────────────────────────────────────────────────────┐
│  Real-time Listener (useFirestoreCollection)             │
│  All connected clients receive updated data              │
└──────┬───────────────────────────────────────────────────┘
       │ (state update → re-render)
       ▼
┌──────────────────────────────────────────────────────────┐
│  React Re-render                                         │
│  UI updates across all connected browsers automatically  │
│  Task board reflects new status                          │
│  Notification badges update                              │
│  Dashboard widgets refresh                               │
└──────────────────────────────────────────────────────────┘
```

### Push Notification Flow (Parallel)

```
Outbox document created
       │
       ▼ (Firestore onCreate trigger)
┌──────────────────────────────┐
│  Cloud Function: processOutbox│
│  1. Fetch FCM tokens         │
│  2. Send multicast push      │
│  3. Clean up invalid tokens  │
│  4. Delete outbox entry      │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  FCM Push Notification       │
│  delivered to user's device  │
└──────────────────────────────┘
```

---

## 7. Backend Architecture

IRIS OS uses Firebase as a fully serverless backend. There is no custom server, no API layer, and no database server to maintain.

### 7.1 Firebase Authentication

| Aspect | Detail |
|---|---|
| **Provider** | Email/Password authentication |
| **User Profiles** | Stored in `users` collection (Firestore), linked by `auth.uid` |
| **Session Management** | Firebase SDK handles session persistence automatically |
| **First-User Bootstrap** | If no users exist in the `users` collection, signup is enabled. After the first user is created, signup is disabled and new users must be invited by an admin. |
| **Password Management** | Passwords are hashed with bcrypt. Admins can force password change on login via `forcePasswordChange` flag. |

### 7.2 Cloud Firestore

| Aspect | Detail |
|---|---|
| **Type** | NoSQL document database |
| **Connection** | Long polling (`experimentalForceLongPolling: true`) for broad browser compatibility |
| **Real-time** | `onSnapshot` listeners for all collections |
| **Indexing** | Defined in `firestore.indexes.json` |
| **Security** | Rules defined in `firestore.rules` |

### 7.3 Cloud Functions

Two deployed functions:

| Function | Trigger | Purpose |
|---|---|---|
| `processOutbox` | `firestore.document.onCreate` on `notifications_outbox/{docId}` | Processes notification queue: fetches FCM tokens, sends multicast push notifications, creates per-user notification documents, cleans up invalid tokens, deletes outbox entry. |
| `fetchLinkPreview` | `https.onCall` | Fetches Open Graph metadata for URLs (title, description, image). Used for link previews in the UI. |

### 7.4 Firebase Storage

| Aspect | Detail |
|---|---|
| **Purpose** | File storage for uploads (images, videos, documents, brand assets) |
| **Organization** | `clients/{clientId}/projects/{projectId}/assets/{fileId}_{fileName}` |
| **Security** | Authenticated users can read and write |
| **Integration** | Files uploaded via `uploadBytes`, URLs retrieved via `getDownloadURL`, metadata stored in Firestore `files` collection |

### 7.5 Firebase Hosting

| Aspect | Detail |
|---|---|
| **Environments** | Production (`iris-os-43718`) and Development (`iris-agency-os-dev`) |
| **Deploy** | Static SPA hosting with `index.html` fallback |
| **CDN** | Firebase global CDN for asset delivery |

### 7.6 Firebase Cloud Messaging (FCM)

| Aspect | Detail |
|---|---|
| **Purpose** | Push notifications to user devices |
| **Service Worker** | `firebase-messaging-sw.js` handles background messages |
| **Token Management** | Tokens stored in `notification_tokens` collection, linked to user IDs |
| **VAPID Key** | Configured via environment variable `VITE_FIREBASE_VAPID_KEY` |

---

## 8. Firestore Data Model

### Collection Map

The system uses a flat collection structure (no subcollections) for simplicity and query flexibility.

```
firestore/
├── users                      User profiles and HR data
├── roles                      Role definitions with permission arrays
├── departments                Department definitions
│
├── clients                    Client records with contacts
├── client_social_links        Client social media profiles
├── client_notes               Internal notes about clients
├── client_meetings            Client meeting records
├── client_brand_assets        Client brand assets (logos, guidelines)
├── client_monthly_reports     Monthly reports uploaded for clients
├── client_strategies          Marketing strategy documents
│
├── projects                   Project records
├── project_members            User-to-project assignments
├── project_milestones         Project milestone tracking
├── project_activity_logs      Project activity audit trail
├── project_marketing_assets   Strategy documents linked to projects
│
├── tasks                      Task records (central entity)
├── task_comments              Task comments and discussions
├── task_time_logs             Time tracking entries
├── task_dependencies          Task-to-task dependencies
├── task_activity_logs         Task audit trail
├── task_qc_reviews            Quality control review entries
│
├── approval_steps             Multi-level approval workflow entries
├── client_approvals           Client-side approval records
│
├── social_posts               Social media post records
│
├── calendar_months            Content calendar month containers
├── calendar_items             Individual content calendar items
│
├── creative_projects          Creative direction project records
├── creative_calendars         Creative calendar containers
├── creative_calendar_items    Creative calendar content items
│
├── files                      File metadata (URLs, categories, versions)
├── folders                    Virtual folder hierarchy
│
├── invoices                   Invoice records with line items
├── quotations                 Quotation records with line items
├── payments                   Payment records
├── expenses                   Expense records
│
├── shot_lists                 Production shot lists
├── call_sheets                Production call sheets
├── agency_locations           Location records for production
├── agency_equipment           Equipment inventory
├── production_plans           Production planning records
│
├── vendors                    External vendor records
├── freelancers                Freelancer profiles
├── freelancer_assignments     Freelancer-to-project assignments
├── vendor_service_orders      Vendor service orders
│
├── leave_requests             Employee leave requests
├── attendance_records         Employee attendance
│
├── notifications              In-app notification records
├── notification_preferences   Per-user notification settings
├── notification_tokens        FCM push notification tokens
├── notifications_outbox       Push notification queue (processed by Cloud Function)
│
├── workflow_templates         Approval workflow definitions
├── milestones                 Dynamic milestone tracking
├── notes                      Personal and linked notes
├── audit_logs                 System audit trail
├── dashboard_banners          Dashboard banner configuration
│
└── presentation_shares        Public presentation share links
```

### Relationship Model

Firestore is a document database — relationships are modeled through **reference fields** (IDs stored as strings) rather than foreign keys or JOINs.

```
Client ──1:N──▶ Project ──1:N──▶ Task
   │                │                │
   │                │                ├──1:N──▶ TaskComment
   │                │                ├──1:N──▶ TaskTimeLog
   │                │                ├──1:N──▶ TaskActivityLog
   │                │                ├──1:N──▶ ApprovalStep
   │                │                ├──0:1──▶ ClientApproval
   │                │                ├──0:1──▶ SocialPost
   │                │                └──0:N──▶ QCReview
   │                │
   │                ├──1:N──▶ ProjectMember
   │                ├──1:N──▶ ProjectMilestone
   │                ├──1:N──▶ ProjectActivityLog
   │                └──1:N──▶ ProjectMarketingAsset
   │
   ├──1:N──▶ ClientSocialLink
   ├──1:N──▶ ClientNote
   ├──1:N──▶ ClientMeeting
   ├──1:N──▶ ClientBrandAsset
   ├──1:N──▶ ClientMonthlyReport
   ├──1:N──▶ CalendarMonth ──1:N──▶ CalendarItem
   ├──1:N──▶ Invoice ──1:N──▶ Payment
   └──1:N──▶ Quotation

User ──M:N──▶ Project (via ProjectMember)
User ──1:N──▶ Task (via assigneeIds[])
User ──1:1──▶ Role (via RoleDefinition)
```

### Key Design Decisions

- **Flat collections** — All entities are top-level collections. This avoids Firestore's subcollection query limitations and allows cross-entity queries.
- **Denormalized names** — Entity names (e.g., `client` on `Project`, `clientName` on `ProductionPlan`) are duplicated for display purposes, avoiding extra reads.
- **Array-based relations** — Many-to-many relationships use array fields (e.g., `Task.assigneeIds: string[]`, `ProductionPlan.teamMemberIds: string[]`).
- **Soft deletes** — Tasks use `isDeleted`, `deletedAt`, `deletedBy` fields rather than hard deletes. Projects and calendar months use `isArchived` patterns.

---

## 9. Permissions System

### Architecture

The permissions system is a **Role-Based Access Control (RBAC)** implementation with scope-aware permission checking. It consists of three layers:

```
┌─────────────────────────────────────────┐
│  UI Layer                               │
│  PermissionGate / usePermission hooks   │
│  Conditionally renders UI elements      │
├─────────────────────────────────────────┤
│  Application Layer                      │
│  checkPermission() in App.tsx           │
│  Guards CRUD handler execution          │
├─────────────────────────────────────────┤
│  Core Layer                             │
│  can() function in permissions.ts       │
│  Permission catalog + scope checking    │
└─────────────────────────────────────────┘
```

### Permission Catalog

All permissions are defined in `lib/permissions.ts` as a single `PERMISSIONS` constant object. The format is `module.action.scope`:

| Module | Example Permissions |
|---|---|
| **Clients** | `clients.view.own`, `clients.view.dept`, `clients.view.all`, `clients.create`, `clients.edit`, `clients.delete` |
| **Projects** | `projects.view.own`, `projects.view.dept`, `projects.view.all`, `projects.create`, `projects.edit.own`, `projects.archive` |
| **Tasks** | `tasks.view.all`, `tasks.view.dept`, `tasks.view.own`, `tasks.create`, `tasks.edit.all`, `tasks.assign.dept`, `tasks.delete` |
| **Finance** | `finance.view.own`, `finance.view.project`, `finance.view.all`, `finance.create_invoice`, `finance.approve_payment` |
| **Production** | `production.view`, `production.create`, `production.assign_crew`, `production.plans.create` |
| **Posting** | `posting.view.all`, `posting.create`, `posting.approve`, `posting.schedule`, `posting.mark_published` |
| **Creative** | `creative.view`, `creative.manage`, `creative.review`, `creative.approve`, `creative.reject` |
| **QC** | `qc.view`, `qc.manage`, `qc.review.approve`, `qc.review.reject`, `qc.review.comment` |
| **Admin** | `admin.settings.view`, `admin.settings.edit`, `admin.branding.edit`, `roles.create`, `roles.edit` |

Total: **100+ permission keys** across 20+ modules.

### Scope Model

Permissions with scope suffixes are validated against context:

| Scope | Meaning | Validation |
|---|---|---|
| `own` | Only resources owned by or assigned to the user | Checks `ownerId`, `assigneeId`, or `assigneeIds` contains user ID |
| `dept` | Resources within the user's department | Checks department match + own scope |
| `project` | Resources within projects the user is a member of | Checks project membership + own scope |
| `all` | All resources with no restriction | Always passes |

**Scope hierarchy** — A higher scope automatically grants lower scopes. A user with `tasks.view.all` implicitly has `tasks.view.dept` and `tasks.view.own`.

### Core Permission Function

```typescript
can(user, permissionKey, userPermissions, context?) → boolean
```

1. Checks if `userPermissions` array contains the exact `permissionKey`.
2. If a `ScopeContext` is provided, validates the scope suffix against the context.
3. If exact match fails, checks for higher-scope permissions that cover the requested one.

### Role Definitions

Roles are stored in the `roles` Firestore collection. Each role contains:

```typescript
{
  id: string;
  name: string;           // Matches UserRole enum (e.g., "General Manager")
  description: string;
  permissions: string[];   // Array of permission keys
  isAdmin: boolean;
}
```

Roles are seeded from `DEFAULT_ROLES` in `constants.ts` on first load. A smart sync mechanism ensures new permissions added in code updates are automatically merged into existing Firestore role documents without overwriting admin customizations.

### UI Integration

| Component | Purpose |
|---|---|
| `PermissionGate` | Declarative component that conditionally renders children based on a permission check. |
| `AnyPermissionGate` | Renders children if user has any one of the provided permissions (OR logic). |
| `usePermission(key, context?)` | React hook returning `boolean`. |
| `useAnyPermission(keys[], context?)` | React hook returning `boolean` (OR logic). |
| `useAllPermissions(keys[], context?)` | React hook returning `boolean` (AND logic). |
| `usePermissionCheck()` | Returns a callable permission checker function. |

---

## 10. File Management Architecture

### Hierarchy

Files are organized in a **Client → Project → Task** hierarchy with virtual folders stored in Firestore:

```
Client Root (auto-created on client creation)
├── Projects/
│   └── [Project Name]/
│       └── [Task Name]/
│           ├── uploaded files...
│           └── deliverables...
├── Strategies/
├── Videos/
├── Photos/
├── Documents/
├── Deliverables/
├── Meetings/
│   └── [Date – Meeting Title]/
│       └── meeting files...
└── Archive/
    └── [Archived] [Project Name]/
        └── archived files...
```

### Automated Folder Creation

Folders are created automatically at key lifecycle events:

| Event | Folders Created |
|---|---|
| Client created | Full client folder structure (8 subfolders) |
| Project created | Project folder under client's Projects/ |
| Task created | Task folder under project folder |
| Meeting scheduled | Meeting folder under client's Meetings/ |
| Project archived | Archive folder created, files moved |

### File Upload Pipeline

```
1. User selects file in UI
2. handleUploadFile() called
3. File uploaded to Firebase Storage
   Path: clients/{clientId}/projects/{projectId}/assets/{fileId}_{fileName}
4. Download URL retrieved
5. File metadata written to Firestore 'files' collection
6. File categorized automatically (video/image/document/design/presentation/etc.)
7. Destination folder determined automatically based on context
8. Standardized filename generated: {ClientCode}_{TaskTitle}_{Version}.{ext}
```

### File Categorization

Files are automatically categorized based on MIME type:

| Category | MIME Types |
|---|---|
| `video` | video/* |
| `image` | image/* |
| `document` | application/pdf, text/* |
| `design` | .psd, .ai, .sketch, .fig |
| `presentation` | .pptx, .key |
| `spreadsheet` | .xlsx, .csv |
| `archive` | .zip, .rar |

---

## 11. Notification Architecture

### Overview

The notification system has three layers: in-app notifications, push notifications via FCM, and a manual broadcast console.

### Event Flow

```
┌──────────────────┐
│  Application      │
│  Event Occurs     │
│  (task assigned,  │
│   status changed, │
│   approval needed)│
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  notifyUsers() — notificationService.ts              │
│                                                      │
│  1. Map NotificationType to metadata                 │
│     (category, severity, entityType)                 │
│  2. Check recipient preferences                      │
│     (muted categories, severity threshold)           │
│  3. Write Notification documents to Firestore        │
│     (one per recipient)                              │
│  4. If sendPush: write to notifications_outbox       │
└──────┬──────────────────┬────────────────────────────┘
       │                  │
       ▼                  ▼
┌──────────────┐  ┌──────────────────────────────────┐
│  In-App       │  │  notifications_outbox             │
│  Notification │  │  (Firestore document)             │
│  (immediate   │  └──────────┬───────────────────────┘
│   via         │             │ onCreate trigger
│   onSnapshot) │             ▼
└──────────────┘  ┌──────────────────────────────────┐
                  │  Cloud Function: processOutbox    │
                  │                                    │
                  │  1. Fetch FCM tokens for targets   │
                  │  2. Send multicast push (batches   │
                  │     of 500)                        │
                  │  3. Handle failures:               │
                  │     - Delete invalid tokens        │
                  │     - Log errors                   │
                  │  4. Delete outbox entry             │
                  └──────────┬───────────────────────┘
                             │
                             ▼
                  ┌──────────────────────────────────┐
                  │  FCM Push Notification            │
                  │  → Service Worker                 │
                  │  → OS-level notification          │
                  └──────────────────────────────────┘
```

### Notification Types

The system defines 40+ notification types across categories:

| Category | Example Types |
|---|---|
| **Tasks** | `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_REVISION_REQUESTED`, `TASK_APPROVED_FINAL` |
| **Approvals** | `APPROVAL_REQUESTED`, `APPROVAL_REMINDER`, `APPROVAL_ESCALATION` |
| **Posting** | `POST_ASSIGNED`, `POST_CAPTION_SUBMITTED`, `POST_PUBLISHED` |
| **Projects** | `PROJECT_CREATED`, `PROJECT_MEMBER_ADDED`, `MILESTONE_AT_RISK` |
| **Meetings** | `MEETING_SCHEDULED`, `MEETING_REMINDER_24H`, `MEETING_REMINDER_1H` |
| **Finance** | `INVOICE_CREATED`, `PAYMENT_RECORDED`, `BUDGET_EXCEEDED` |
| **Creative** | `CREATIVE_ASSIGNED`, `CREATIVE_SUBMITTED_FOR_REVIEW`, `CREATIVE_APPROVED` |
| **QC** | `QC_REVIEW_REQUESTED`, `QC_APPROVED`, `QC_REJECTED` |

### User Preferences

Each user can configure:
- **Muted categories** — Suppress notifications from specific categories
- **Severity threshold** — Only receive notifications at or above a severity level (`info`, `warning`, `urgent`)
- **Delivery channels** — Toggle in-app, email, and push independently

---

## 12. AI Architecture

### Integration

The AI Assistant uses Google's Gemini API (model: `gemini-2.5-flash`) through the `@google/generative-ai` SDK.

```
┌─────────────────────┐
│  AIAssistant.tsx     │
│  (Chat UI)           │
│  Local message state │
└─────────┬───────────┘
          │ user message
          ▼
┌─────────────────────┐
│  geminiService.ts    │
│  generateCreativeContent(prompt, context)
│                      │
│  1. Build system prompt (agency context)
│  2. Combine with user message
│  3. Call Gemini API
│  4. Return text response
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Gemini 2.5 Flash   │
│  (Google Cloud)      │
└─────────────────────┘
```

### System Prompt

The AI is contextualized as an expert Creative Assistant for a marketing and production agency. It is configured with a professional, creative, and insightful tone.

### Current Scope

The AI Assistant is currently a **standalone conversational tool**. It does not have direct access to application data (tasks, projects, client details). Users provide context through natural language, and the AI responds with creative suggestions, draft copy, and ideation.

---

## 13. PWA Architecture

### Configuration

The PWA is configured through `vite-plugin-pwa` with the following settings:

| Setting | Value |
|---|---|
| **Registration** | `autoUpdate` — Service worker updates automatically |
| **Display Mode** | `standalone` — Runs without browser chrome |
| **Orientation** | `portrait` |
| **Theme Color** | `#050505` (dark) |
| **Background Color** | `#050505` |

### Service Workers

The application uses two service workers:

| Service Worker | Purpose |
|---|---|
| **Workbox SW** (generated by vite-plugin-pwa) | Asset caching, offline shell, runtime caching strategies |
| **firebase-messaging-sw.js** (manual) | FCM background push notification handling |

### Caching Strategies

| Resource | Strategy | Max Age |
|---|---|---|
| HTML pages | `NetworkFirst` (3s timeout) | 1 day |
| Google Fonts | `CacheFirst` | 365 days |
| CDN assets | `StaleWhileRevalidate` | 7 days |
| Static assets (JS, CSS, images) | Precache (Workbox) | Until new build |

### Precached Assets

All build output files are precached, plus:
- `icon-192x192.png`, `icon-512x512.png`
- `apple-touch-icon.png`
- `splash.gif`, `splash.mp4`

Maximum file size for precaching: 6 MB (raised for splash animation).

### Install Prompt

The `PWAInstallPrompt` component captures the `beforeinstallprompt` browser event and displays a custom install prompt to users.

---

## 14. Security Model

### Layer 1: Firebase Authentication

All access requires Firebase Authentication. The application checks `onAuthStateChanged` before rendering any content. Unauthenticated users see only the login screen.

Inactive users (`status: 'inactive'`) are immediately signed out even if they have a valid Firebase Auth session.

### Layer 2: Application-Level RBAC

The permissions system (Section 9) enforces role-based access at the application layer:

- **View routing** — Hub modules check permissions before rendering. Unauthorized users see "Access Denied."
- **CRUD handlers** — Critical operations (e.g., `handleDeleteTask`) verify permissions before executing.
- **UI elements** — `PermissionGate` components hide buttons, forms, and actions the user cannot perform.

### Layer 3: Firestore Security Rules

Firestore rules provide server-side enforcement:

| Collection | Rule |
|---|---|
| `notifications` | Users can only read/update/delete their own notifications (`request.auth.uid == resource.data.userId`) |
| `notification_preferences` | Users can only read/write their own preferences |
| `notifications_outbox` | Authenticated users can create; Cloud Functions can read/delete |
| `notification_tokens` | Users can manage their own tokens |
| `task_qc_reviews` | Authenticated users can read/write |
| `creative_*` collections | Authenticated users can read/write |
| General catch-all | Currently permissive (`allow read, write: if true`) — see Limitations |

### Layer 4: Presentation Share Token Security

Public presentation links use token-based security:

```typescript
PresentationShare {
  token: string;           // Unique share token
  isActive: boolean;       // Can be deactivated
  expiresAt: string | null; // Optional expiration
  accessCount: number;     // Track views
}
```

Public pages validate the token, check `isActive`, and verify expiration before rendering content.

### Layer 5: Storage Rules

Firebase Storage requires authentication for all reads and writes:
```
allow read, write: if request.auth != null;
```

---

## 15. Performance Characteristics

### Key Metrics

| Metric | Value | Notes |
|---|---|---|
| **Firestore listeners** | ~53 | Active `onSnapshot` subscriptions in App.tsx |
| **Firestore collections** | ~40 | Distinct top-level collections |
| **React components** | ~90 | `.tsx` files in `components/` directory |
| **App.tsx size** | 2,508 lines | Central orchestrator |
| **types.ts size** | 1,459 lines | Type definitions |
| **permissions.ts size** | 587 lines | Permission catalog and checking logic |

### Real-Time Update Behavior

- **Latency:** Firestore `onSnapshot` delivers updates within 100–500ms across connected clients.
- **Connection:** Uses `experimentalForceLongPolling` for maximum browser compatibility (avoids WebSocket issues in some corporate networks).
- **Reconnection:** Firebase SDK automatically reconnects after network interruptions and replays missed changes.

### Potential Performance Considerations

| Concern | Impact | Mitigation |
|---|---|---|
| **53 active listeners** | Each listener maintains a persistent connection to Firestore. At scale, this consumes bandwidth and Firestore read quotas. | Listeners could be scoped to the active module. Currently all listeners are always active. |
| **Full collection reads** | All documents in each collection are fetched. No filtering at the query level for most collections. | Could add `where` clauses to reduce payload (e.g., only active tasks, only current month's calendar items). |
| **App.tsx re-renders** | Any state change in App.tsx triggers evaluation of all child components. | React's virtual DOM diffing prevents unnecessary DOM mutations. `useMemo` is used for expensive computations. |
| **Large document arrays** | Collections with thousands of documents are held in memory as arrays. | For the target audience (agencies with 5–50 users), typical collection sizes remain manageable (hundreds, not millions). |
| **File uploads** | Large files (video assets) upload through the browser to Firebase Storage. | No server-side processing. Upload progress and error handling are managed client-side. |

---

## 16. Current Architectural Limitations

### 16.1 Monolithic Orchestrator

`App.tsx` at 2,508 lines is the single largest file in the system. It contains all Firestore subscriptions, all CRUD handlers, all navigation logic, and all data distribution. While this provides architectural simplicity, it creates:

- **Cognitive overhead** — New developers must understand the entire file to make changes.
- **Merge conflicts** — Multiple developers editing App.tsx simultaneously creates frequent Git conflicts.
- **Testing difficulty** — The orchestrator cannot be easily unit tested in isolation.

### 16.2 Global Listener Loading

All 53 Firestore listeners are established on application load, regardless of which module the user navigates to. A user viewing only the Dashboard still subscribes to shot lists, call sheets, equipment, vendor data, etc. This means:

- Unnecessary Firestore reads for inactive modules.
- Higher baseline bandwidth consumption.
- Longer initial load times as all subscriptions resolve.

### 16.3 Firestore Security Rules

The current Firestore rules include a catch-all:
```
match /{document=**} {
  allow read, write: if true;
}
```

This is a development convenience that bypasses all security at the database layer. The application layer enforces permissions, but a direct API call to Firestore would bypass those checks. This must be addressed before the system handles sensitive financial or personal data at scale.

### 16.4 No Server-Side Permission Enforcement

Permission checks occur exclusively in the browser. The `can()` function and `checkPermission()` operate on client-side data. There is no server-side middleware validating that a Firestore write is authorized beyond basic authentication.

### 16.5 No Pagination

Collections are loaded entirely into memory. There is no pagination, cursor-based loading, or virtualized lists for large datasets. This works well for the current scale but will become a bottleneck with thousands of tasks or files.

### 16.6 Denormalization Drift

Denormalized fields (e.g., client name on project, client name on production plan) can become stale if the source entity is updated. There is no automated mechanism to propagate name changes across all referencing documents.

---

## 17. Future Architecture Evolution

### Proposed: Domain Module Architecture

The current monolithic pattern could evolve toward a **domain module architecture** where each hub is a self-contained module with its own state management, Firestore subscriptions, and handler functions.

```
modules/
├── clients/
│   ├── ClientsHub.tsx          (UI)
│   ├── clientsState.ts         (Firestore subscriptions)
│   ├── clientsHandlers.ts      (CRUD operations)
│   └── clientsTypes.ts         (Type definitions)
│
├── projects/
│   ├── ProjectsHub.tsx
│   ├── projectsState.ts
│   ├── projectsHandlers.ts
│   └── projectsTypes.ts
│
├── tasks/
│   ├── TasksHub.tsx
│   ├── tasksState.ts
│   ├── tasksHandlers.ts
│   └── tasksTypes.ts
│
├── production/
│   ├── ProductionHub.tsx
│   ├── productionState.ts
│   ├── productionHandlers.ts
│   └── productionTypes.ts
│
├── posting/
│   ├── PostingHub.tsx
│   ├── postingState.ts
│   ├── postingHandlers.ts
│   └── postingTypes.ts
│
├── finance/
│   ├── FinanceHub.tsx
│   ├── financeState.ts
│   ├── financeHandlers.ts
│   └── financeTypes.ts
│
└── shared/
    ├── sharedState.ts          (users, auth, roles - always loaded)
    ├── notificationBus.ts      (cross-module notification dispatch)
    └── types.ts                (shared type definitions)
```

### Benefits of Module Architecture

| Benefit | Description |
|---|---|
| **Lazy loading** | Firestore subscriptions start only when a module is mounted. |
| **Code splitting** | Vite can split each module into separate chunks for faster initial load. |
| **Parallel development** | Teams can work on modules independently with minimal merge conflicts. |
| **Testability** | Each module can be unit tested with mocked Firestore interactions. |
| **Reduced memory footprint** | Only active module data is held in memory. |

### Additional Evolution Paths

| Enhancement | Description |
|---|---|
| **Server-side permission enforcement** | Migrate permission checks to Firestore rules using custom claims or Cloud Functions middleware. |
| **Pagination** | Implement cursor-based pagination for tasks, files, and audit logs. |
| **Firestore composite indexes** | Add indexes for complex multi-field queries to improve read performance. |
| **Offline support** | Enable Firestore persistence for true offline-first capability. |
| **Background sync** | Queue writes during offline periods and sync when connectivity returns. |
| **API gateway** | Introduce Cloud Functions as an API layer for complex operations, data validation, and server-side business logic. |
| **Multi-tenancy** | Support multiple agencies on a single deployment through tenant-scoped data isolation. |

---

## 18. Summary

IRIS Agency OS is a **real-time, serverless, monolithic single-page application** purpose-built for creative agency operations. Its architecture reflects a deliberate set of tradeoffs:

| Design Choice | Tradeoff |
|---|---|
| Centralized App.tsx orchestrator | Simplicity and consistency at the cost of file size and modularity. |
| 53 global Firestore listeners | Instant real-time updates across all data at the cost of bandwidth and Firestore reads. |
| No external state library | Zero abstraction overhead at the cost of prop drilling depth. |
| Flat Firestore collections | Flexible querying at the cost of denormalization management. |
| Client-side RBAC | Rich permission logic at the cost of server-side enforcement gaps. |
| Firebase-only backend | Zero server maintenance at the cost of limited backend customization. |

The system currently supports the full lifecycle of agency work: **client onboarding → content calendar → creative direction → task execution → quality control → approval workflows → social publishing → financial tracking → analytics**.

The architecture is designed for the scale of a single agency (5–50 team members, dozens of clients, hundreds of active tasks). The evolution path toward domain modules, server-side enforcement, and pagination is documented and ready to implement when scale demands it.

The long-term vision for IRIS OS is to become a **scalable, multi-tenant agency operating system** — a complete replacement for the fragmented tools that creative agencies rely on today.
