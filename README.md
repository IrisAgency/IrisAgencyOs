# IRIS Agency OS

> A comprehensive, real-time operating system for creative agencies — covering clients, projects, production, posting, finance, HR, quality control, creative direction, analytics, and AI-assisted workflows. Built as an installable PWA on Firebase with role-based access control.

**Production** — https://iris-os-43718.web.app
**Development** — https://iris-agency-os-dev.web.app

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [System Architecture Diagram](#system-architecture-diagram)
  - [Request Lifecycle](#request-lifecycle)
  - [State Management Strategy](#state-management-strategy)
- [Core System Modules](#core-system-modules)
  - [Module Interaction Map](#module-interaction-map)
- [Permissions System (RBAC)](#permissions-system-rbac)
- [Security Model](#security-model)
- [File Management](#file-management)
- [Notification System](#notification-system)
- [AI Assistant](#ai-assistant)
- [Theming & Branding](#theming--branding)
- [PWA Support](#pwa-support)
- [Performance Characteristics](#performance-characteristics)
- [Developer Onboarding](#developer-onboarding)
- [Development Setup](#development-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Operational Documentation](#operational-documentation)
- [Folder Structure](#folder-structure)
- [Data Models](#data-models)
- [System Limitations](#system-limitations)
- [System Scaling Strategy](#system-scaling-strategy)
- [Known Issues & Technical Debt](#known-issues--technical-debt)
- [Contribution Guidelines](#contribution-guidelines)
- [Documentation Roadmap](#documentation-roadmap)
- [Vision](#vision)

---

## System Overview

**IRIS Agency OS** is a full-stack, real-time operating system purpose-built for creative and advertising agencies. It replaces fragmented tool stacks (Asana + Slack + Google Drive + spreadsheets + invoicing software) with a single, unified platform that mirrors actual agency workflows.

### What It Does

| Workflow | Platform Capability |
|---|---|
| Client onboarding | CRM with brand assets, strategies, social links, meetings, monthly reports |
| Project management | Projects with milestones, member management, approval workflows, activity logs |
| Creative production | Task boards with Kanban workflow, QC swipe reviews, creative direction pipeline |
| Content calendars | Per-client calendar months with items, presentation views, share links |
| Social media posting | Post lifecycle from draft → review → approval → schedule → publish |
| Video production | Shot lists, call sheets, equipment, locations, production plans with auto-task generation |
| Finance | Invoices, quotations, payments, expenses, budgets |
| HR & Team management | Employee profiles, org structure, leave management, attendance, onboarding/offboarding, assets, performance reviews, capacity planning |
| Analytics | Executive dashboards, departmental KPIs, financial reporting |
| AI assistance | Gemini-powered creative briefs, captions, logistics planning |

### Who Uses It

| User | System Role | Primary Modules |
|---|---|---|
| Agency owner / GM | General Manager | All modules, admin, analytics |
| Client services | Account Manager | Clients, projects, tasks, posting, finance |
| Creative team | Creative Director, Art Director, Designer, Copywriter | Tasks, creative direction, QC, calendars |
| Social team | Social Manager | Posting, calendars, analytics |
| Production team | Producer, Videographer | Production, tasks, vendors |
| Finance team | Finance Manager | Finance, vendors, reports |
| External contractors | Freelancer | Own tasks only |
| Agency clients | Client | View projects, approve deliverables |

### Platform Characteristics

- **Real-time**: Every data change propagates to all connected clients instantly via Firestore `onSnapshot` listeners distributed across 16 domain stores.
- **Installable PWA**: Works as a native-like app on desktop and mobile with offline caching.
- **Role-aware**: Every UI element respects the logged-in user's RBAC permissions (33 categories, 200+ keys).
- **Multi-tenant ready**: Architecture supports multiple agency instances via Firebase project separation.
- **Arabic-aware**: Bidirectional text support for Arabic/English mixed content.

---

## Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **UI Framework** | React | 19.2.0 | Latest concurrent features, component model |
| **State Management** | Zustand | ^5.0.5 | 16 domain stores, lightweight, no boilerplate |
| **Routing** | react-router-dom | ^7.6.2 | URL-based navigation, lazy route loading |
| **Language** | TypeScript | ~5.8.2 | Strict type safety across the entire codebase |
| **Build Tool** | Vite | ^6.2.0 | Sub-second HMR, native ESM, fast builds |
| **Styling** | Tailwind CSS | ^3.4.17 | Utility-first, rapid UI iteration, dark theme |
| **Icons** | lucide-react | ^0.554.0 | Consistent, tree-shakeable icon set |
| **Charts** | Recharts | ^3.5.0 | Composable React chart library for analytics |
| **Backend** | Firebase | ^12.6.0 | Auth, Firestore, Storage, Hosting, Cloud Functions, FCM |
| **AI** | @google/generative-ai | ^0.24.1 | Gemini 2.5 Flash for content generation |
| **PWA** | vite-plugin-pwa | ^1.2.0 | Workbox service worker, offline caching, installability |
| **Date Handling** | date-fns | ^4.1.0 | Lightweight, tree-shakeable date utilities |
| **Testing** | Vitest + Testing Library | ^4.0.15 / ^6.9.1 | 82 unit tests (permissions, ID generation, Zod schemas, workflows), CI pipeline |
| **Linting** | ESLint 9 + Prettier | ^9.39 / ^3.5 | Flat config, react-hooks/react-refresh plugins |
| **Git Hooks** | Husky + lint-staged | ^9.1.7 / ^16.3.2 | Pre-commit: ESLint fix + Prettier on staged files |
| **Validation** | Zod | ^4.3.6 | Runtime schema validation for Client, Project, Task, Finance entities |
| **CI/CD** | GitHub Actions | — | Lint → typecheck → test → build on every push |

---

## Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        index.tsx                             │
│   BrowserRouter → AuthProvider → BrandingProvider → App      │
│   (Catches /presentation/share/:token before auth)           │
├──────────────────────────────────────────────────────────────┤
│                    App.tsx (~1,600 lines)                     │
│   Layout shell • Store orchestrator • React Router <Routes>  │
│   Subscribes 16 Zustand stores • Bridge props to children    │
├──────────────┬────────────────┬───────────────────────────────┤
│  Stores      │    Hooks       │   Services                    │
│ 16 Zustand   │ useFirestore   │ geminiService                 │
│ domain stores│ usePermissions │ notificationService            │
│ (stores/)    │ useDashboard   │                               │
│              │ useMessaging   │                               │
│              │ useAppNav      │                               │
├──────────────┴────────────────┴───────────────────────────────┤
│                      Components                              │
│   ~110 component files across 11 subdirectories              │
│   18 lazy-loaded routes with Suspense fallback               │
│   Organized by domain: admin/ analytics/ calendar/ common/   │
│   creative/ dashboard/ hr/ layout/ production/ public/       │
│   tasks/ workflows/                                          │
├──────────────────────────────────────────────────────────────┤
│                      Firebase                                │
│   Auth • Firestore (63 collections) • Storage • FCM          │
│   Cloud Functions (notification outbox + OG metadata proxy)  │
│   Hosting (SPA rewrite, cache headers)                       │
└──────────────────────────────────────────────────────────────┘
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BROWSER / PWA SHELL                           │
│  Service Worker (Workbox)  •  FCM Push  •  Offline Cache           │
├─────────────────────────────────────────────────────────────────────┤
│                      REACT APPLICATION (SPA)                       │
│  index.tsx → AuthProvider → BrandingProvider → App.tsx             │
├───────────┬───────────┬───────────┬───────────┬─────────────────────┤
│  CONTEXT  │   HOOKS   │ SERVICES  │   UTILS   │      THEME         │
│ AuthCtx   │ useFire-  │ gemini-   │ approval- │  branding.config   │
│ BrandCtx  │  store    │  Service  │  Utils    │  appTheme          │
│           │ usePerm-  │ notif-    │ qcUtils   │  CSS Variables     │
│           │  issions  │  Service  │ fileUpload│                    │
│           │ useDash-  │           │ folder-   │                    │
│           │  board    │           │  Utils    │                    │
│           │ useMsg-   │           │ production│                    │
│           │  Token    │           │  Utils    │                    │
├───────────┴───────────┴───────────┴───────────┴─────────────────────┤
│              ZUSTAND DOMAIN STORES (16 stores)                     │
│  63 Firestore subscriptions distributed across domain stores       │
│  Each store owns its onSnapshot listeners + CRUD handlers          │
├───────────┬───────────┬───────────┬───────────┬─────────────────────┤
│              APPLICATION SHELL (App.tsx — bridge layer)             │
│  Store orchestration • React Router <Routes> • Prop bridge         │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┤
│Dash- │Cli-  │Proj- │Tasks │Post- │Prod- │Fin-  │Admin │  + 10 more  │
│board │ents  │ects  │ Hub  │ ing  │uction│ance  │ Hub  │   modules   │
│ Hub  │ Hub  │ Hub  │      │ Hub  │ Hub  │ Hub  │      │             │
├──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴─────────────┤
│                      FIREBASE SERVICES                             │
│  Auth  •  Firestore (63 collections)  •  Storage  •  FCM           │
│  Cloud Functions  •  Hosting (SPA)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **URL-based routing** — `react-router-dom` with `BrowserRouter`. 18 routes (17 navigable views + catch-all) via `React.lazy()` + `Suspense`. Navigation updates the URL path; Sidebar derives active state from `useLocation()`. Presentation share routes intercepted before auth in `index.tsx`.
- **Zustand domain stores** — 16 stores own all Firestore subscriptions and CRUD handlers. `App.tsx` subscribes stores on user authentication and bridges data as props to child components.
- **Path alias** — `@/*` maps to the project root (configured in `vite.config.ts` and `tsconfig.json`).
- **No `.env.local`** — Environment separation uses `.env.development` and `.env.production` only. Creating `.env.local` would leak credentials across modes. See [Environment Variables](#environment-variables).

### Data Flow

```
Firestore ──onSnapshot──→ Zustand store (subscribeCollection)
                                   │
                          store state updates
                                   │
                       App.tsx reads store → props to Hub components
                                   │
                          User actions call handlers
                                   │
                        Store CRUD methods → Firestore writes
                                   │
                          onSnapshot fires again ──→ UI updates
```

**Key properties:**
- **Optimistic by default** — Firestore writes are fast; the listener fires within milliseconds.
- **Consistent** — All connected clients see the same update simultaneously.
- **No cache invalidation** — The listener pattern eliminates stale data problems.
- **Side effects** — Notification creation happens in the CRUD handler *after* the Firestore write succeeds.

### Contexts

| Context | File | Purpose |
|---------|------|---------|
| `AuthContext` | `contexts/AuthContext.tsx` | Authentication, user profile, role loading, permission checking, invite flow, force-password-change |
| `BrandingContext` | `contexts/BrandingContext.tsx` | Injects CSS custom properties from `config/branding.config.ts` and admin overrides |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useFirestoreCollection` | `hooks/useFirestore.ts` | Generic real-time Firestore `onSnapshot` listener — returns `{ data, loading }` |
| `usePermissions` / `useHasPermission` / `useCanPerform` | `hooks/usePermissions.ts` | React wrappers around the `can()` permission function |
| `useDashboardData` | `hooks/useDashboardData.ts` | Aggregates tasks, meetings, social posts into dashboard stats |
| `useMessagingToken` | `hooks/useMessagingToken.ts` | FCM token lifecycle — registers service worker, requests permission, saves token |
| `useAppNavigation` | `hooks/useAppNavigation.ts` | Navigation helpers for routing |

### Request Lifecycle

Every user action follows this deterministic cycle:

```
  ┌──────────────┐
  │  User Action  │  (click button, submit form, drag card)
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Component   │  (e.g., TasksHub, ClientsHub)
  │  Event       │  Calls a handler function received via props
  │  Handler     │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  App.tsx     │  Bridge handler delegates to Zustand store
  │  Bridge      │  method, which performs validation,
  │  Handler     │  permission checks, and notification triggers
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Firestore   │  setDoc() / updateDoc() / deleteDoc()
  │  Write       │  Writes to the appropriate collection
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  onSnapshot  │  Real-time listener fires automatically
  │  Listener    │  subscribeCollection in store receives update
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  Store State │  Zustand store state updates
  │  Update      │  React re-renders the component tree
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  UI Update   │  Component reflects the new data
  │  (reactive)  │  No manual refetch needed
  └──────────────┘
```

### State Management Strategy

**Architecture: Zustand Domain Stores + React Router**

IRIS Agency OS uses **16 domain-specific Zustand stores** for state management. Each store owns its Firestore `onSnapshot` subscriptions and CRUD handlers via `subscribeCollection()` from `stores/firestoreSubscription.ts`.

| Store | Collections | Responsibility |
|---|---|---|
| `useClientStore` | clients, client_social_links, client_notes, client_meetings, client_brand_assets, client_monthly_reports | Client CRM + cascade delete |
| `useProjectStore` | projects, project_members, project_milestones, project_activity_logs, project_marketing_assets, milestones | Project lifecycle + archive/unarchive |
| `useTaskStore` | tasks, task_comments, task_time_logs, task_dependencies, task_activity_logs, approval_steps, client_approvals | Task workflow + QC triggers + notifications |
| `useFileStore` | files, folders | File upload with smart pathing + recursive folder delete |
| `useFinanceStore` | invoices, quotations, payments, expenses | Invoice auto-status on payment |
| `useHRStore` | users, employee_profiles, leave_requests, leave_policies, leave_balances, attendance_records, attendance_corrections, onboarding_checklists, offboarding_checklists, employee_assets, performance_reviews, employee_status_changes, teams | Full HR lifecycle |
| `useProductionStore` | production_assets, shot_lists, call_sheets, agency_locations, agency_equipment, production_plans | Production workflow |
| `usePostingStore` | social_posts | Social media CRUD |
| `useCreativeStore` | creative_projects, creative_calendars, creative_calendar_items | Creative direction |
| `useCalendarStore` | calendar_months, calendar_items, calendar_item_revisions | Calendar management |
| `useAdminStore` | roles, audit_logs, workflow_templates, departments, dashboard_banners | Admin + audit trail |
| `useNetworkStore` | vendors, freelancers, freelancer_assignments, vendor_service_orders | Vendor/freelancer network |
| `useNotificationStore` | notifications, notification_preferences | Notification delivery + preferences |
| `useNotesStore` | notes | Quick notes CRUD |
| `useQCStore` | task_qc_reviews | Quality control reviews |
| `useUIStore` | (local state) | Navigation, modals, toast, sidebar, splash screen |

**Routing**: React Router with 18 routes (17 navigable + catch-all), all lazy-loaded via `React.lazy()` + `Suspense`.

**Bridge Pattern**: `App.tsx` (~1,600 lines) subscribes all stores on user authentication and passes data as props to child components. Future phases will migrate children to read from stores directly, eliminating the bridge.

---

## Core System Modules

The app is organized into **17 navigable views** (plus a catch-all 404 page). Each module is a self-contained hub component rendered via React Router.

### Dashboard
- **File**: `components/Dashboard.tsx` + `components/DynamicDashboard.tsx`
- **Sub-components**: 8 dashboard cards + 8 widgets in `components/dashboard/`
- **Features**: Timeline/week/today views, urgent tasks, focus list, completion stats, type distribution, weekly activity, upcoming meetings, milestone tracking
- **Data**: `useDashboardData` hook aggregates from tasks, users, meetings, social posts
- **Widgets**: `CalendarWidget`, `ClientStatusWidget`, `GmUrgentTasksWidget`, `MeetingsWidget`, `MilestonesWidget`, `MyTasksWidget`, `NotesWidget`, `TeamProgressWidget`

### Clients Hub
- **File**: `components/ClientsHub.tsx`
- **Features**: Full CRM — client profiles, notes, meetings, brand assets, marketing strategies, social links, monthly reports
- **Sub-modules**: `ClientBrandAssets.tsx`, `ClientMarketingStrategies.tsx`, `ClientMeetings.tsx`
- **Data objects**: `Client`, `ClientNote`, `ClientMeeting`, `ClientBrandAsset`, `ClientMonthlyReport`, `ClientSocialLink`
- **Interactions**: Cascades to Projects → Tasks → Files

### Projects Hub
- **File**: `components/ProjectsHub.tsx`
- **Features**: Project lifecycle management, milestones, member management (staff + freelancers), approval workflows, activity logs, file attachments, archive/restore
- **Data objects**: `Project`, `ProjectMember`, `Milestone`, `ProjectActivityLog`, `ProjectMarketingAsset`

### Tasks Hub
- **File**: `components/TasksHub.tsx` + `components/TaskBoard.tsx`
- **Sub-components**: 5 files in `components/tasks/` — `CreateTaskModal`, `TaskBoardDark`, `TaskDetailDrawer`, `TaskListDark`, `TaskStatsRow`
- **Features**: Kanban board, workflow-driven status progression, approvals, dependencies, time logs, comments, file attachments, task planning modal, archive/restore
- **Data objects**: `Task`, `TaskComment`, `TaskTimeLog`, `TaskDependency`, `TaskActivityLog`, `ApprovalStep`

### Quality Control Hub
- **File**: `components/QualityControlHub.tsx` + `components/QCReviewDrawer.tsx`
- **Features**: Tinder-style swipe review deck, rejection modal with notes/references, Google Drive in-app preview (thumbnail + iframe), deliverable switcher, type badges, role-based override rules (GM/CD), linked approval pipeline
- **Logic**: `utils/qcUtils.ts` — `computeQCStatus()`, `submitQCReview()`, `approveFromQCHub()`, `rejectFromQCHub()`, `syncApprovalToQCReview()`

### Creative Direction Hub
- **File**: `components/CreativeDirectionHub.tsx`
- **Sub-components**: 7 files in `components/creative/` — `CalendarActivation`, `CalendarPresentationView`, `CopywriterView`, `ManagerView`, `RejectionModal`, `ShareLinkManager`, `SwipeReviewCard`
- **Features**: Role-based views (Manager vs Copywriter), creative project lifecycle (assign → draft → review → approve → activate), swipe card review UX, strategy upload, calendar activation to Calendar Department, **Calendar → Creative revision workflow** (Calendar dept requests revision → Copywriter revises → Manager approves → syncs back to calendar)
- **Presentation View**: Polished editorial layout for client presentation — 3-column grid, Google Drive thumbnail extraction, type/search filtering, print CSS, bidi Arabic/English text support, slide mode with keyboard navigation
- **Share Link System**: `ShareLinkManager.tsx` generates cryptographically random tokens, stores in `presentation_shares` collection, tracks access count and last opened time. `PublicPresentationPage.tsx` renders the shared view externally without authentication
- **Data objects**: `CreativeProject`, `CreativeCalendar`, `CreativeCalendarItem`, `CalendarItemRevision`

### Calendar Hub
- **File**: `components/CalendarHub.tsx`
- **Sub-components**: `components/calendar/CalendarDeptPresentationView.tsx`
- **Features**: Calendar month management, calendar item CRUD per client, unified calendar view, presentation view for Calendar Department, **revision request workflow** (request revision on synced creative items, view revision history, sync approved revisions)
- **Data objects**: `CalendarMonth`, `CalendarItem`, `CalendarItemRevision`

### Posting Hub
- **File**: `components/PostingHub.tsx`
- **Features**: Responsive board (Kanban desktop / tabbed mobile), drawer/modal details, permission-aware read-only UX, social post lifecycle, archive
- **Data objects**: `SocialPost`

### Finance Hub
- **File**: `components/FinanceHub.tsx`
- **Features**: Invoices, quotations, payments, expenses, budget tracking, financial reporting
- **Data objects**: `Invoice`, `Payment`, `Quotation`, `Expense`

### Production Hub
- **File**: `components/ProductionHub.tsx`
- **Sub-components**: `components/production/MyProductionWidget.tsx`, `ProductionPlanningModal.tsx`
- **Features**: Shot lists, call sheets, locations, equipment inventory, production plans, auto-task generation
- **Logic**: `utils/productionUtils.ts` — `generateProductionTasks()`, `archiveProductionPlan()`, `restoreProductionPlan()`, `getProductionCountdown()`
- **Data objects**: `ProductionPlan`, `ShotList`, `CallSheet`, `AgencyLocation`, `AgencyEquipment`, `ProductionAsset`

### Vendors Hub
- **File**: `components/VendorsHub.tsx`
- **Features**: Vendor registry, service orders, project assignment
- **Data objects**: `Vendor`, `VendorServiceOrder`, `FreelancerAssignment`

### Team Hub (HR Module)
- **File**: `components/TeamHub.tsx` — 8-tab HR management interface
- **Sub-components**: 16 files in `components/hr/`
  - `EmployeeDirectory.tsx` — Filterable employee grid with search, department/status filters
  - `EmployeeProfileDrawer.tsx` — Full employee detail view/edit form (personal info, employment, emergency contact)
  - `OrgStructureView.tsx` — Department → Team → Member hierarchy with tree/flat view toggle
  - `LeaveBoard.tsx` — Manager leave approval queue with stats, approve/reject, rejection reason modal
  - `LeaveCalendar.tsx` — Monthly calendar grid showing approved leaves with user avatars
  - `LeaveRequestForm.tsx` — Self-service leave request with balance preview, working-day calculation
  - `LeaveBalanceSummary.tsx` — Per-employee leave balance cards with progress bars
  - `AttendanceDashboard.tsx` — Clock in/out, today's team board, monthly summary, corrections view
  - `AttendanceCorrectionForm.tsx` — Correction request form with original record display
  - `OnboardingWorkflow.tsx` — 10 default onboarding steps, progress tracking, step completion
  - `OffboardingWorkflow.tsx` — 10 default offboarding steps, HR-sensitive audit trail
  - `AssetAssignment.tsx` — Asset CRUD with assign/return, overdue detection, search/filter
  - `PerformanceReviewForm.tsx` — Self-assessment + manager assessment, 8 score categories (1-5)
  - `PerformanceReviewList.tsx` — Review cycle dashboard with stats, status filter, average scores
  - `CapacityDashboard.tsx` — Team stats, department capacity bars, 7-day leave forecast, task distribution
  - `HRStatusBadge.tsx` — Reusable status badge with type-aware color mapping
- **Tabs**: Employees, Org Structure, Leave (Board/Request/Calendar/Balance), Attendance, On/Offboarding, Assets, Performance, Capacity
- **Firestore Collections**: `employee_profiles`, `teams`, `leave_policies`, `leave_balances`, `attendance_corrections`, `onboarding_checklists`, `offboarding_checklists`, `employee_assets`, `performance_reviews`, `employee_status_changes`
- **Data objects**: `EmployeeProfile`, `Team`, `LeavePolicy`, `LeaveBalance`, `AttendanceCorrection`, `OnboardingChecklist`, `OffboardingChecklist`, `EmployeeAsset`, `PerformanceReview`, `EmployeeStatusChange`, `ChecklistStep`, `PerformanceScore`
- **RBAC**: 26 HR permission keys under `hr.*` (employees, leave, attendance, performance, assets, onboarding, offboarding, org, confidential) with own/dept/all scopes
- **Notifications**: 11 HR notification types (leave lifecycle, onboarding/offboarding, attendance corrections, performance reviews, asset management)

### Analytics Hub
- **File**: `components/AnalyticsHub.tsx`
- **Sub-components**: 5 files in `components/analytics/` — `ExecutiveView`, `DepartmentsView`, `FinancialView`, `ProjectsView`, `KPICard`
- **Features**: Executive dashboard, departmental performance, financial analytics, project analytics, KPI tracking
- **Charts**: Recharts-powered visualizations

### Notifications Hub
- **File**: `components/NotificationsHub.tsx` + `components/NotificationConsole.tsx`
- **Features**: In-app notification feed, preference management, manual notification sending (admin), severity-based filtering
- **Details**: See [Notification System](#notification-system)

### Admin Hub
- **File**: `components/AdminHub.tsx`
- **Sub-components**: 6 files in `components/admin/` — `AdminOverview`, `BannerManager`, `BrandingEditor`, `DepartmentsManager`, `UsersManager`, `WorkflowsManager`
- **Features**: User management, role/permission management, department management, branding editor, banner management, workflow template management
- **Related**: `components/RolesManager.tsx`, `components/PermissionMatrix.tsx`

### AI Assistant
- **File**: `components/AIAssistant.tsx`
- **Details**: See [AI Assistant](#ai-assistant)

### Module Interaction Map

Modules are not isolated — they form a **directed graph of dependencies** that mirrors agency workflows:

```
                              ┌─────────────────┐
                              │     CLIENTS      │
                              │  (CRM, brand     │
                              │   assets, notes)  │
                              └───────┬─────────┘
                                      │ owns
                              ┌───────▼─────────┐
                              │    PROJECTS      │
                              │  (milestones,    │
                              │   members, files) │
                              └───┬─────────┬───┘
                                  │         │
                    contains      │         │  contains
              ┌───────────────────┘         └─────────────────┐
              ▼                                               ▼
    ┌─────────────────┐                             ┌─────────────────┐
    │     TASKS        │                             │   PRODUCTION     │
    │  (Kanban board,  │                             │  (shot lists,    │
    │   workflow,      │◄──── auto-generates ────────│   call sheets,   │
    │   approvals)     │                             │   equipment)     │
    └───────┬─────────┘                             └─────────────────┘
            │ feeds into                                     │
            ▼                                                │ uses
    ┌─────────────────┐                             ┌────────▼────────┐
    │  QUALITY CONTROL │                             │    VENDORS      │
    │  (swipe review,  │                             │  (freelancers,  │
    │   approve/reject)│                             │   service orders)│
    └───────┬─────────┘                             └─────────────────┘
            │ approved content
            ▼
    ┌─────────────────┐         ┌─────────────────┐
    │   CREATIVE       │────────▶│    CALENDAR     │
    │   DIRECTION      │activates│  (per-client    │
    │  (calendar items,│         │   content plan)  │
    │   presentations) │         └─────────────────┘
    └───────┬─────────┘
            │ content ready
            ▼
    ┌─────────────────┐
    │    POSTING       │
    │  (schedule,      │
    │   publish,       │
    │   archive)       │
    └───────┬─────────┘
            │ generates
            ▼
    ┌─────────────────┐         ┌─────────────────┐
    │    FINANCE       │◄────────│   ANALYTICS     │
    │  (invoices,      │ reports │  (executive,    │
    │   payments,      │         │   departmental, │
    │   budgets)       │         │   financial)    │
    └─────────────────┘         └─────────────────┘
```

**Cross-cutting modules:** Dashboard, Notifications, Team (HR), Admin, AI Assistant — these interact with all of the above.

---

## Permissions System (RBAC)

### Overview

IRIS OS implements a comprehensive Role-Based Access Control system with **33 permission categories** containing **200+ individual permission keys**, supporting **scope-based access** (SELF → DEPARTMENT → PROJECT → ALL).

### Architecture

| Component | File | Purpose |
|-----------|------|---------|
| Permission catalog | `lib/permissions.ts` (~744 lines) | `PERMISSIONS` object, `can()` function, scope helpers |
| Permission hooks | `hooks/usePermissions.ts` | `usePermissions()`, `useHasPermission()`, `useCanPerform()` |
| Permission gate | `components/PermissionGate.tsx` | Declarative component to conditionally render UI based on permissions |
| Role definitions | `constants.ts` | 12 built-in roles with default permission sets |
| Auth integration | `contexts/AuthContext.tsx` | Loads role permissions, provides `checkPermission()` |

### Built-in Roles (12)

| ID | Role | Department | Admin | Access Level |
|---|------|-----------|-------|---|
| r1 | General Manager | Management | ✅ Yes | Full system access |
| r2 | Account Manager | Accounts | ❌ No | Clients, projects, tasks, posting, finance |
| r3 | Creative Director | Creative | ❌ No | Creative oversight, QC, approvals, tasks (dept) |
| r4 | Art Director | Creative | ❌ No | Department tasks, approvals, calendar |
| r5 | Designer | Creative | ❌ No | Own tasks only, department assets |
| r6 | Copywriter | Creative | ❌ No | Own tasks, calendar management, QC review |
| r7 | Social Manager | Marketing | ❌ No | Full posting access, department tasks |
| r8 | Producer | Production | ❌ No | Production full access, vendors, calendar |
| r9 | Videographer | Production | ❌ No | Own tasks, production view/edit |
| r10 | Finance Manager | Finance | ❌ No | Full finance, vendors, reports |
| r11 | Freelancer | External | ❌ No | Own tasks only, minimal access |
| r12 | Client | External | ❌ No | View own projects, approve deliverables |

> **Note:** Admins can create custom roles via the Admin Hub. See [`PERMISSIONS_GUIDE.md`](PERMISSIONS_GUIDE.md) for the complete RBAC reference.

### Permission Categories (33)

```
AUTH, USERS, ROLES, PERMISSIONS_ADMIN, DEPARTMENTS,
CLIENTS, CLIENT_NOTES, CLIENT_MEETINGS, CLIENT_BRAND_ASSETS, CLIENT_MARKETING,
PROJECTS, MILESTONES, TASKS, TASK_FILES, APPROVALS,
POSTING, ASSETS, PRODUCTION, VENDORS, FINANCE,
REPORTS, ANALYTICS, ADMIN_BRANDING, ADMIN_SETTINGS, DASHBOARD,
NOTES, CALENDAR, CALENDAR_MONTHS, CALENDAR_ITEMS, CREATIVE,
QC, HR, WORKFLOWS
```

### Scope System

Permissions support hierarchical scopes for data filtering:

| Scope | Meaning |
|-------|---------|
| `SELF` | User's own records only |
| `DEPARTMENT` | Records within user's department |
| `PROJECT` | Records within user's assigned projects |
| `ALL` | Full access across the system |

The `can()` function checks exact permission match first, then checks higher-scope permissions (e.g., `VIEW_ALL` covers `VIEW_OWN`).

### Permission Sync

When the app loads, `AuthContext` performs smart permission sync:
1. Loads roles from Firestore `roles` collection
2. Compares with code-defined defaults in `constants.ts`
3. Additively merges new permissions from code → Firestore (never removes admin customizations)
4. Admin panel changes take effect immediately via real-time listeners

---

## Security Model

### Authentication Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Login Page     │────▶│  Firebase Auth    │────▶│  Firestore       │
│                  │     │  signInWith       │     │  users/{uid}     │
│  email/password  │     │  EmailAndPassword │     │  (profile doc)   │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │  AuthContext      │
                                                  │  loadUser         │
                                                  │  Permissions()    │
                                                  │  roles collection │
                                                  │  → permission[]   │
                                                  └──────────────────┘
```

1. User enters email/password on the Login page.
2. Firebase Auth validates credentials.
3. `onAuthStateChanged` fires → `AuthContext` fetches the user profile from `users/{uid}`.
4. If `forcePasswordChange` is true → redirects to password change screen.
5. If `status === 'inactive'` → signs out immediately.
6. User's role name is resolved against the `roles` Firestore collection → permissions array loaded.

### User Invitation Flow

1. Admin uses the invite form → a **secondary Firebase app instance** is created to avoid logging out the admin.
2. `createUserWithEmailAndPassword` on the secondary app creates the account.
3. A temporary password is generated and stored in the user doc with `forcePasswordChange: true`.
4. The secondary Firebase app is properly cleaned up via `deleteApp()` in a finally block.
5. The temporary password is shown to the admin (for manual delivery — no email integration yet).

### Three-Layer Enforcement

| Layer | Mechanism | Strength |
|---|---|---|
| **UI Layer** | `PermissionGate`, `usePermission()` hooks hide/show elements | Advisory only — can be bypassed with devtools |
| **Application Logic** | `AuthContext.checkPermission()` guards CRUD handlers | Enforced in client code — protects against accidental misuse |
| **Firestore Rules** | `hasPermission()` function reads user role doc and checks permission array | Server-side — **enforced on 30+ business collections with granular permission checks** |

### Presentation Share Security

The Creative Direction module allows sharing presentation views with external clients without authentication:

1. `ShareLinkManager.tsx` generates a **cryptographically random token** (URL-safe).
2. Token is stored in `presentation_shares` Firestore collection with metadata (calendar ID, creator, access count).
3. `index.tsx` intercepts `/presentation/share/:token` URLs *before* `AuthProvider` mounts.
4. `PublicPresentationPage.tsx` fetches the share doc, validates the token, loads the calendar data, and renders a read-only view.
5. No authentication required — security is through token obscurity.

### Remaining Security Gaps

| Gap | Risk | Mitigation |
|---|---|---|
| No server-side scope validation | 🟠 High — a user with `tasks.edit.own` could edit any task via direct Firestore writes | Add ownership/department checks in Firestore rules |
| Presentation share tokens don't expire | 🟡 Medium — shared links are permanent | Add TTL and max-access-count enforcement |
| No rate limiting on login | 🟡 Medium — brute force possible | Firebase Auth has built-in rate limiting, but no custom lockout |
| `firebase-messaging-sw.js` has hardcoded production config | 🟢 Low — acceptable tradeoff (cannot use env vars in service workers) | Document as known limitation |

---

## File Management

### Architecture
- **Client-centric hierarchy**: Client → Project → Task folder structure
- **Auto-creation**: `utils/folderUtils.ts` automatically creates folders when clients, projects, or tasks are created
- **File naming**: `[ClientCode]-[TaskName]-v[Version]-[Timestamp].[ext]`

### Category Detection
Files are automatically categorized based on extension:
- **Video**: mp4, mov, avi, mkv, webm
- **Image**: jpg, jpeg, png, gif, svg, webp
- **Document**: pdf, doc, docx, txt
- **Design**: psd, ai, fig, sketch, xd
- **Presentation**: ppt, pptx, key
- **Spreadsheet**: xls, xlsx, csv
- **Archive**: zip, rar, 7z
- **Strategy**: strategy-tagged uploads

### FilesHub UI
- Breadcrumb navigation, type filters (videos/photos/documents/strategies), list/grid views
- Client-first navigation with project/task drill-down
- Upload with `utils/fileUpload.ts` to Firebase Storage

---

## Notification System

### Architecture

Hybrid system combining **in-app notifications** (Firestore) with **Firebase Cloud Messaging** (FCM) for push notifications.

```
Event occurs → notificationService.sendNotification()
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
  In-app notifications    notifications_outbox
  (Firestore per-user)         │
                          Cloud Function
                          (processNotificationOutbox)
                               │
                          FCM push delivery
                          + per-user doc creation
```

### Notification Types (50+)

| Category | Types |
|----------|-------|
| **Tasks** (14) | TASK_ASSIGNED, TASK_UNASSIGNED, TASK_STATUS_CHANGED, TASK_COMPLETED, TASK_OVERDUE, TASK_COMMENT, TASK_DEPENDENCY_RESOLVED, TASK_FILE_UPLOADED, TASK_PRIORITY_CHANGED, TASK_DEADLINE_APPROACHING, TASK_REOPENED, TASK_WORKFLOW_PROGRESSED, TASK_NEEDS_REVIEW, TASK_REVISION_REQUESTED |
| **Approvals** (3) | APPROVAL_REQUESTED, APPROVAL_GRANTED, APPROVAL_REJECTED |
| **Posting** (8) | POST_ASSIGNED, POST_SUBMITTED, POST_APPROVED, POST_REJECTED, POST_SCHEDULED, POST_PUBLISHED, POST_REVISION_REQUESTED, POST_COMMENT |
| **Clients & Projects** (5) | CLIENT_CREATED, PROJECT_CREATED, PROJECT_STATUS_CHANGED, PROJECT_MEMBER_ADDED, PROJECT_MILESTONE_REACHED |
| **Meetings** (4) | MEETING_SCHEDULED, MEETING_UPDATED, MEETING_CANCELLED, MEETING_REMINDER |
| **Finance** (4) | INVOICE_CREATED, PAYMENT_RECEIVED, EXPENSE_SUBMITTED, BUDGET_ALERT |
| **Creative** (4) | CREATIVE_ASSIGNED, CREATIVE_SUBMITTED, CREATIVE_APPROVED, CREATIVE_REJECTED |
| **Quality Control** (4) | QC_REVIEW_REQUESTED, QC_APPROVED, QC_REJECTED, QC_COMMENT |

### Key Service Functions (`services/notificationService.ts`)

| Function | Purpose |
|----------|---------|
| `sendNotification()` | Main entry — in-app + optional push delivery |
| `createBatchNotifications()` | Batch-create for multiple recipients |
| `sendPersonalizedNotifications()` | Per-user customized notifications |
| `resolveRecipients()` | Resolve user/role/project/all → user IDs |
| `getUserNotificationPreferences()` | Fetch user prefs from Firestore |
| `shouldSendNotification()` | Check prefs before sending |

### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `notifications` | Per-user notification documents (userId, type, title, message, severity, isRead, entityType, entityId) |
| `notification_preferences` | User preferences (muted categories, severity threshold, channel toggles) |
| `notification_tokens` | FCM device tokens per user |
| `notifications_outbox` | Queue for Cloud Function to process push delivery |

### Cloud Functions

**`processNotificationOutbox`** — triggered on Firestore create in `notifications_outbox`:
1. Reads payload
2. Fetches FCM tokens from `notification_tokens`
3. Sends via `admin.messaging().sendEachForMulticast()` in batches of 500
4. Auto-deletes invalid tokens
5. Creates per-user in-app notification docs
6. Deletes outbox entry

**`fetchUrlMetadata`** — callable function for Open Graph metadata proxy:
- Used by `LinkPreviewThumbnail` component for URL previews
- Server-side fetch to avoid CORS issues

---

## AI Assistant

- **Service**: `services/geminiService.ts` — wraps Google Generative AI SDK
- **Model**: `gemini-2.5-flash` (fast, cost-effective)
- **UI**: `components/AIAssistant.tsx` — chat interface for creative briefs, caption generation, logistics planning
- **API Key**: `VITE_GEMINI_API_KEY` environment variable

---

## Theming & Branding

### Configuration Source

Single source of truth: `config/branding.config.ts` → overrideable via Admin → Branding Editor → persisted to Firestore.

### CSS Custom Properties

| Variable | Default | Purpose |
|----------|---------|---------|
| `--dash-bg` | `#050505` | App background |
| `--dash-surface` | `#0a0a0a` | Card/panel surfaces |
| `--dash-surface-elevated` | `#121212` | Elevated surfaces |
| `--dash-primary` | `#DF1E3C` | Primary brand color (IRIS red) |
| `--dash-on-primary` | `#FFFFFF` | Text on primary |
| `--dash-secondary` | `#CCC2DC` | Secondary color |
| `--dash-tertiary` | `#EFB8C8` | Tertiary color |
| `--dash-error` | `#F2B8B5` | Error states |
| `--dash-outline` | `#49454F` | Borders/outlines |
| `--dash-glass-border` | `rgba(255, 255, 255, 0.08)` | Glass morphism borders |
| `--dash-ink-gradient` | Radial gradient | Subtle background glow |
| `--dash-transition` | `cubic-bezier(0.2, 0, 0, 1)` | Animation easing |
| `--primary` | `#DF1E3C` | Dynamic brand primary |
| `--sidebar-bg` | `#0a0a0a` | Sidebar background |
| `--sidebar-border` | `rgba(255,255,255,0.1)` | Sidebar border |
| `--brand-font` | `'Outfit'` | Primary font family |
| `--text-color` | `#E6E1E5` | Default text color |

### Typography
- **Primary font**: Outfit (sans-serif)
- **Monospace**: JetBrains Mono

### Theme Modes
- **Main app**: Dark theme (#050505 background)
- **Presentation views**: White theme for client-facing presentation

---

## PWA Support

### Installability
- Installable on Android, desktop (Chrome/Edge), and iOS (manual Add to Home Screen)
- Manifest configured in `vite.config.ts` with proper icons (192×192, 512×512 — both `any` and `maskable`)
- Standalone display mode, portrait orientation

### Service Worker & Caching

| Strategy | Target | Cache Name | Max Entries | Max Age |
|----------|--------|------------|-------------|---------|
| NetworkFirst | HTML pages | `html-cache` | 10 | 1 day |
| CacheFirst | Google Fonts | `google-fonts-cache` | 10 | 365 days |
| StaleWhileRevalidate | CDN assets | `cdn-cache` | 50 | 7 days |

- **Pre-cache**: All `*.{js,css,html,ico,png,svg,mp4,gif,woff,woff2}` up to 6 MB
- **Register type**: `autoUpdate` — updates silently
- **FCM Service Worker**: `public/firebase-messaging-sw.js` (hardcoded production config — cannot use env vars)

### Manifest

```json
{
  "name": "IRIS Agency OS",
  "short_name": "IRIS OS",
  "theme_color": "#050505",
  "background_color": "#050505",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/"
}
```

---

## Performance Characteristics

### Application Metrics

| Metric | Value | Notes |
|---|---|---|
| **Component files** | ~110 `.tsx` files | Across 11 directories |
| **App.tsx (bridge layer)** | ~780 lines | Reduced from ~1,600 after Phase 3 migration |
| **Type definitions** | ~1,821 lines (`types.ts`) | 130+ interfaces and types |
| **Constants** | ~1,507 lines (`constants.ts`) | Roles, departments, collection names |
| **Zustand stores** | 16 domain stores | Each owns its Firestore subscriptions + CRUD |
| **Firestore subscriptions** | 63 real-time listeners | Distributed across stores; 8 core stores load globally, 7 lazy-loaded per route |
| **Firestore collections** | 63 | See [Data Models](#data-models) |
| **Permission categories** | 33 | See [Permissions System](#permissions-system-rbac) |
| **Permission keys** | 200+ | Across all categories |
| **Notification types** | 50+ | See [Notification System](#notification-system) |
| **Unit tests** | 82 | Permissions, ID generation, Zod schemas, workflows |

### Performance Optimisations (Phase 4)

#### Lazy Firestore Subscription Lifecycle
All 15 data stores implement ref-counted subscribe/unsubscribe. Eight **core stores** (HR, Admin, Notifications, Tasks, Projects, Clients, Files, QC) are subscribed globally at auth time. Seven **route-local stores** (Finance, Production, Creative, Calendar, Network, Notes, Posting) subscribe on route mount and unsubscribe when the component unmounts, reducing idle reads by ~50%.

The `useStoreSubscription(…stores)` hook in `hooks/useStoreSubscription.ts` manages the lifecycle automatically with ref counting to prevent double-subscribe when multiple components on the same route need the same store.

#### Firestore Query Filtering
High-volume collections use server-side `orderBy` + `limit` via the existing `queryFn` parameter in `subscribeCollection`:

| Collection | Query | Limit |
|---|---|---|
| `audit_logs` | `orderBy('createdAt', 'desc')` | 500 |
| `task_activity_logs` | `orderBy('createdAt', 'desc')` | 500 |
| `project_activity_logs` | `orderBy('createdAt', 'desc')` | 500 |
| `notifications` | `orderBy('createdAt', 'desc')` | 200 |

#### React.memo & useMemo Optimisation
22 frequently re-rendered sub-components are wrapped with `React.memo`:
- **Layout**: Sidebar, Header
- **Common**: Modal, Drawer, NotificationConsole, PermissionMatrix
- **Analytics**: KPICard, ExecutiveView, FinancialView, ProjectsView, DepartmentsView
- **Dashboard**: All 8 widget components, TaskStatsCard, ActivityCard, NeedsMyApprovalCard, DashboardRightPanel
- **Tasks**: TaskBoard

Hub components use Zustand selector-style reads (`useStore(s => s.field)`) where possible to minimize re-renders.

#### Skeleton Loading Screens
All hub components display animated skeleton screens during initial data load. Skeletons are defined in `components/common/Skeletons.tsx`:
- `ClientsHubSkeleton`, `ProjectsHubSkeleton`, `TasksHubSkeleton`, `FinanceHubSkeleton`, `TeamHubSkeleton` — layout-specific
- `GenericHubSkeleton` — fallback for hubs without custom skeletons

### Real-Time Subscription Impact

Core listeners (8 stores) fire on auth; route-local listeners (7 stores) fire per route visit with ref-counted lifecycle:

- **Reads**: Each listener fires on initial load (1 read per document in the collection) and on every change (1 read per changed document).
- **Billing**: Firestore bills per document read. Route-local stores only incur reads when their route is active.
- **Memory**: Each listener holds a local cache of its collection data in the Zustand store. Route-local stores release data on unsubscribe.
- **Network**: Firestore multiplexes all listeners over a single WebSocket connection.

### Optimization Opportunities

| Optimization | Impact | Difficulty | Status |
|---|---|---|---|
| Lazy-load subscriptions per active view | Reduces idle reads by ~50% | Medium | ✅ Done (Phase 4) |
| Server-side query filtering on high-volume collections | Reduces initial load payload | Low | ✅ Done (Phase 4) |
| React.memo on sub-components | Prevents unnecessary re-renders | Low | ✅ Done (Phase 4) |
| Skeleton loading screens | Better perceived performance | Low | ✅ Done (Phase 4) |
| Paginate large collections (tasks, notifications) | Reduces initial load time | Low — add `startAfter()` | Future |
| Virtual scroll for large lists | Reduces DOM nodes | Medium | Future |

### Bundle Size

Vite's tree-shaking, code-splitting, and manual chunk configuration produce an optimized production bundle:

| Dependency | Impact |
|---|---|
| `firebase` (v12.6) | Largest dependency — Auth, Firestore, Storage, FCM modules |
| `recharts` | Charts for analytics — tree-shakeable but significant |
| `lucide-react` | Icon library — tree-shakeable, minimal per-icon cost |

All 18 routes are lazy-loaded via `React.lazy()`. Vendor chunks are split via `manualChunks` configuration in `vite.config.ts`. Production builds strip console logs via esbuild pure config.

---

## Developer Onboarding

A structured path for new developers to understand the IRIS Agency OS codebase.

### Step 1: Understand the Architecture (30 min)

Read these sections in order:
1. [System Overview](#system-overview) — What the platform does
2. [System Architecture Diagram](#system-architecture-diagram) — How layers connect
3. [Request Lifecycle](#request-lifecycle) — How data flows
4. [State Management Strategy](#state-management-strategy) — Zustand stores + React Router

### Step 2: Understand Firestore Collections (30 min)

Open `constants.ts` and `types.ts` side by side:
- `constants.ts` — Collection names, default roles, departments
- `types.ts` — All TypeScript interfaces (130+)
- Skim the [Data Models](#data-models) section for entity relationships

### Step 3: Understand the Permission System (20 min)

Read in order:
1. `lib/permissions.ts` — The `PERMISSIONS` catalog and `can()` function
2. `hooks/usePermissions.ts` — React hooks for UI permission checks
3. `components/PermissionGate.tsx` — Declarative UI gates
4. `contexts/AuthContext.tsx` — How roles are loaded and synced
5. [`PERMISSIONS_GUIDE.md`](PERMISSIONS_GUIDE.md) — Complete RBAC reference

### Step 4: Understand a Store (20 min)

Pick any Zustand store (e.g., `stores/useTaskStore.ts`) and trace:
1. What **collections** it subscribes to via `subscribeCollection()`
2. What **CRUD methods** it exposes
3. How `App.tsx` imports the store and bridges its data as props to hub components

### Step 5: Understand a Hub Component (20 min)

Pick any hub component (e.g., `components/TasksHub.tsx`) and trace:
1. What **props** it receives from `App.tsx`
2. What **handler functions** it calls (e.g., `onUpdateTask`, `onDeleteTask`)
3. What **permissions** gate the UI elements

### Step 6: Make Your First Change (15 min)

1. Run `npm run dev` to start the dev server
2. Pick a small task (e.g., add a tooltip, fix a label)
3. Find the relevant component file
4. Make the change and verify in the browser
5. Commit with a descriptive message

### Key Files Cheat Sheet

| Need to… | Open… |
|---|---|
| Add a new Firestore collection | `stores/useXStore.ts` (subscribeCollection) + `types.ts` (interface) + `App.tsx` (bridge if needed) |
| Add a new permission | `lib/permissions.ts` + `constants.ts` (DEFAULT_ROLES) |
| Add a new route/view | `components/NewHub.tsx` + `App.tsx` (lazy import + Route) + `Sidebar.tsx` (nav item) |
| Add a new notification type | `services/notificationService.ts` (type enum) + handler in store |
| Modify Firestore rules | `firestore.rules` → deploy with `firebase deploy --only firestore:rules` |
| Add a new Cloud Function | `functions/index.js` → deploy with `firebase deploy --only functions` |

---

## Development Setup

### Prerequisites
- **Node.js** 18+ and **npm**
- **Firebase CLI**: `npm install -g firebase-tools`

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd iris-agency-os

# Install dependencies
npm install

# Set up environment files (see Environment Variables section)
# Create .env.development and .env.production

# Start development server
npm run dev
# → Serves on http://localhost:3000 (bound to 0.0.0.0)
```

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run Vitest unit tests |

### Testing

82 unit tests across 4 test files:

| Test File | Coverage |
|-----------|----------|
| `src/tests/permissions.test.ts` | Permission resolution, scope hierarchy, role defaults |
| `src/tests/id.test.ts` | `crypto.randomUUID()` ID generation utilities |
| `src/tests/schemas.test.ts` | Zod schema validation for Client, Project, Task, Finance entities |
| `src/tests/WorkflowSystem.test.tsx` | Workflow template and approval step logic |

```bash
npm run test           # Run all tests
npx vitest --ui        # Visual test runner
```

### CI/CD Pipeline

GitHub Actions runs on every push to `development` and every PR to `main`:

1. **Lint** — ESLint with flat config
2. **Type-check** — TypeScript strict mode
3. **Unit tests** — Vitest
4. **Production build** — Vite build verification

---

## Environment Variables

### File Structure

| File | Loaded When | Purpose |
|------|-------------|---------|
| `.env` | Always | Shared non-secret defaults only |
| `.env.development` | `npm run dev` | Dev Firebase config + API keys |
| `.env.production` | `npm run build` | Prod Firebase config + API keys |
| `.env.local` | **DO NOT CREATE** | Would override both dev and prod — causes credential leaks |

### Vite Loading Order
- `npm run dev` loads: `.env` → `.env.development` → `.env.development.local`
- `npm run build` loads: `.env` → `.env.production` → `.env.production.local`

### Required Variables

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Firebase Cloud Messaging
VITE_FIREBASE_VAPID_KEY=

# Google Gemini AI
VITE_GEMINI_API_KEY=

# Environment indicator (optional)
VITE_ENVIRONMENT=development|production
```

### Firebase Project Mapping

| Environment | Project ID | Hosting URL |
|-------------|-----------|-------------|
| Production | `iris-os-43718` | https://iris-os-43718.web.app |
| Development | `iris-agency-os-dev` | https://iris-agency-os-dev.web.app |

---

## Deployment

### Deploy to Development

```bash
# Build (uses .env.production by default since vite build = production mode)
npm run build

# Deploy to dev hosting
firebase use dev
firebase deploy --only hosting
```

### Deploy to Production

```bash
# 1. Ensure on development branch, commit all changes
git add -A && git commit -m "description"
git push origin development

# 2. Merge to main
git checkout main
git pull origin main
git merge development
git push origin main

# 3. Build
npm run build

# 4. Verify correct credentials in build
grep -o 'iris-agency-os-dev\|iris-os-43718' dist/assets/index-*.js
# Should ONLY show: iris-os-43718

# 5. Deploy
firebase use prod
firebase deploy --only hosting

# 6. Switch back
firebase use dev
git checkout development
```

### Deploy Cloud Functions

```bash
firebase deploy --only functions --project=<project-id>
```

### Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules --project=<project-id>
firebase deploy --only firestore:indexes --project=<project-id>
```

### Quick Hotfix Deploy

```bash
git add -A && git commit -m "hotfix: description"
npm run build
firebase use prod && firebase deploy --only hosting
firebase use dev
# Remember to sync main later!
```

---

## Operational Documentation

### System Monitoring

| What to Monitor | How | Where |
|---|---|---|
| **Firestore reads/writes** | Firebase Console → Usage tab | Billing alerts for read spikes |
| **Authentication events** | Firebase Console → Authentication → Logs | Failed login attempts, account lockouts |
| **Cloud Function invocations** | Firebase Console → Functions → Logs | `processNotificationOutbox` errors, cold starts |
| **Hosting bandwidth** | Firebase Console → Hosting → Usage | CDN cache hit rates, bandwidth consumption |
| **Storage usage** | Firebase Console → Storage → Usage | File upload sizes, storage growth rate |
| **FCM delivery** | Firebase Console → Cloud Messaging → Reports | Push notification delivery rates, failures |

### Error Handling Strategy

| Layer | Strategy |
|---|---|
| **React components** | `ErrorBoundary` wraps app root with graceful recovery UI. `try/catch` in event handlers; errors logged to console. |
| **Firestore operations** | `try/catch` around all `setDoc`/`updateDoc`/`deleteDoc` calls in store handlers. Failures show toast notifications. |
| **Authentication** | `AuthContext` catches auth errors and surfaces them to the login form. |
| **Cloud Functions** | `functions/index.js` catches FCM failures, auto-cleans invalid tokens, logs errors. |
| **Permission sync** | Additive merge errors are caught and logged as non-fatal (`console.error`). |

### Logging

Currently, the system uses **console logging** only (stripped from production builds):

| Log Level | Pattern | Example |
|---|---|---|
| Info | `console.log('✅ ...')` | Role loading, permission sync |
| Warning | `console.warn('⚠️ ...')` | Missing role definitions, fallback behavior |
| Error | `console.error('❌ ...')` | Firestore errors, auth failures |
| Debug | `console.log('🔐 ...')` / `console.log('📋 ...')` | Permission resolution details |

> **Recommendation:** Integrate a structured logging service (e.g., Sentry, LogRocket) for production error tracking.

### Backup Strategy

| Data | Backup Method | Frequency |
|---|---|---|
| **Firestore data** | Firebase automated daily backups with 7-day retention | Daily |
| **Firebase Storage files** | Google Cloud Storage — lifecycle rules available | Manual / GCS lifecycle rules |
| **Authentication data** | Firebase manages — export via Admin SDK if needed | On-demand |
| **Source code** | Git (GitHub) with `development` and `main` branches | Every commit |
| **Environment secrets** | `.env.*` files — not in git; stored locally per developer | Manual documentation |

### Incident Response

1. **Production is down** → Check Firebase Console → Hosting. Redeploy last known good build.
2. **Push notifications failing** → Check Cloud Function logs. Verify FCM tokens are valid.
3. **Permissions broken** → Check `roles` collection in Firestore. Compare with `DEFAULT_ROLES` in `constants.ts`.
4. **Data corruption** → Restore from Firestore backup. Check audit logs collection.

---

## Folder Structure

```
iris-agency-os/
├── index.html              # HTML entry point
├── index.tsx               # React entry point + public URL interceptor
├── App.tsx                 # Store orchestrator + bridge layer (~1,600 lines)
├── types.ts                # All TypeScript interfaces (~1,821 lines, 130+ types)
├── constants.ts            # Roles, departments, collection names (~1,507 lines)
├── index.css               # Global styles + Tailwind directives
├── vite.config.ts          # Vite + PWA + Workbox + manual chunks
├── firebase.json           # Firebase hosting config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
├── storage.rules           # Firebase Storage security rules
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint 9 flat config
├── postcss.config.js       # PostCSS configuration
├── package.json            # Dependencies and scripts
│
├── stores/                 # 16 Zustand domain stores + subscription utility
│   ├── firestoreSubscription.ts  # subscribeCollection() utility
│   ├── index.ts            # Store exports
│   ├── useAdminStore.ts    # roles, audit_logs, workflows, departments, banners
│   ├── useCalendarStore.ts # calendar_months, calendar_items, revisions
│   ├── useClientStore.ts   # clients, social_links, notes, meetings, brand_assets
│   ├── useCreativeStore.ts # creative_projects, calendars, items
│   ├── useFileStore.ts     # files, folders
│   ├── useFinanceStore.ts  # invoices, quotations, payments, expenses
│   ├── useHRStore.ts       # users, employee_profiles, leave, attendance, etc.
│   ├── useNetworkStore.ts  # vendors, freelancers, assignments
│   ├── useNotesStore.ts    # notes
│   ├── useNotificationStore.ts  # notifications, preferences
│   ├── usePostingStore.ts  # social_posts
│   ├── useProductionStore.ts    # production_assets, shot_lists, etc.
│   ├── useProjectStore.ts  # projects, members, milestones, activity_logs
│   ├── useQCStore.ts       # task_qc_reviews
│   ├── useTaskStore.ts     # tasks, comments, time_logs, dependencies, approvals
│   └── useUIStore.ts       # UI state (local only)
│
├── components/             # ~110 component files
│   ├── *.tsx               # Root-level hub & shared components
│   ├── admin/              # Admin hub sub-components (6 files)
│   ├── analytics/          # Analytics views & KPI cards (5 files)
│   ├── calendar/           # Calendar department presentation (1 file)
│   ├── common/             # Shared UI: Modal, Drawer, DataTable, DrivePreview,
│   │                         LinkPreviewThumbnail, DropdownMenu (6 files)
│   ├── creative/           # Creative direction: manager/copywriter views,
│   │                         presentation, share links, swipe review (7 files)
│   ├── dashboard/          # Dashboard cards (8 files) + widgets/ (8 files)
│   ├── hr/                 # HR module sub-components (16 files)
│   ├── layout/             # Page layout primitives (4 files)
│   ├── production/         # Production widgets & planning (2 files)
│   ├── public/             # Public-facing pages — PublicPresentationPage (1 file)
│   ├── tasks/              # Task board, list, detail, creation (5 files)
│   └── workflows/          # Workflow hub (1 file)
│
├── schemas/                # Zod runtime validation schemas
│   ├── client.ts           # Client entity schema
│   ├── finance.ts          # Invoice, Payment, Quotation, Expense schemas
│   ├── index.ts            # Schema exports
│   ├── project.ts          # Project entity schema
│   └── task.ts             # Task entity schema
│
├── config/
│   └── branding.config.ts  # CSS variables, fonts, identity defaults
│
├── contexts/
│   ├── AuthContext.tsx      # Auth + user profile + role/permission loading
│   └── BrandingContext.tsx  # CSS variable injection
│
├── hooks/
│   ├── useAppNavigation.ts # Navigation helpers
│   ├── useDashboardData.ts # Dashboard stats aggregation
│   ├── useFirestore.ts     # Generic Firestore realtime hook
│   ├── useMessagingToken.ts # FCM token management
│   └── usePermissions.ts   # Permission checking hooks
│
├── lib/
│   ├── firebase.ts         # Firebase app init + exports (auth, db, storage, etc.)
│   ├── permissions.ts      # PERMISSIONS catalog + can() function (~744 lines)
│   └── specialty.ts        # Specialty/skill definitions
│
├── services/
│   ├── geminiService.ts    # Google Gemini AI integration
│   └── notificationService.ts # Notification creation + delivery
│
├── utils/
│   ├── approvalUtils.ts    # Task approval step checking
│   ├── archiveUtils.ts     # Task archiving logic
│   ├── driveUtils.ts       # Google Drive URL detection & preview utilities
│   ├── fileUpload.ts       # Firebase Storage upload + branding asset validation
│   ├── folderUtils.ts      # Auto-folder creation for clients/projects/tasks
│   ├── id.ts               # crypto.randomUUID() ID generation
│   ├── overflowDetector.ts # Dev-mode CSS overflow debugging
│   ├── presentationHelpers.tsx # Presentation view helpers
│   ├── productionUtils.ts  # Production plan task generation & lifecycle
│   ├── qcUtils.ts          # QC status computation & review submission
│   ├── seedData.ts         # Mock data seeder for Firestore
│   ├── socialArchiveUtils.ts # Social post archiving
│   ├── textDirection.ts    # Arabic/RTL text detection & bidi support
│   └── timestamps.ts       # Firestore timestamp normalization utilities
│
├── theme/
│   └── appTheme.ts         # Theme configuration
│
├── types/
│   └── dashboard.ts        # Dashboard-specific type definitions
│
├── functions/
│   ├── index.js            # Cloud Functions: notification outbox + OG proxy
│   └── package.json        # Functions dependencies
│
├── public/
│   ├── firebase-messaging-sw.js # FCM service worker (hardcoded prod config)
│   └── manifest.json       # PWA manifest (generated by vite-plugin-pwa)
│
├── docs/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DEVELOPMENT_SETUP.md
│   ├── GIT_WORKFLOW.md
│   ├── MERGE_PROCEDURE.md
│   └── legacy/             # Archived documentation
│
└── src/
    └── tests/              # Test files (Vitest + Testing Library)
        ├── permissions.test.ts
        ├── id.test.ts
        ├── schemas.test.ts
        ├── WorkflowSystem.test.tsx
        └── setup.ts
```

---

## Data Models

All types are defined in `types.ts` (~1,821 lines, 130+ exported interfaces/types). Key entities and their relationships:

### Core Entity Relationships

```
User ──────────────┐
  │                │
  ├─ role ─→ Role  │
  │                │
Client ────────────┤
  │                │
  ├─ ClientNote    │
  ├─ ClientMeeting │
  ├─ ClientBrandAsset
  ├─ ClientSocialLink
  ├─ ClientMonthlyReport
  │                │
Project ──── Client│
  │                │
  ├─ ProjectMember ├─→ User
  ├─ Milestone     │
  ├─ ProjectActivityLog
  │                │
Task ─────── Project
  │
  ├─ TaskComment ──→ User
  ├─ TaskTimeLog ──→ User
  ├─ TaskDependency → Task
  ├─ ApprovalStep ─→ User
  ├─ TaskFile
  │
SocialPost ─── Client, Project
  │
CalendarMonth ── Client
  │
  └─ CalendarItem
  │
CreativeProject ── Client
  │
  ├─ CreativeCalendar ── Client
  │   └─ CreativeCalendarItem
  │
  └─ PresentationShare ── CreativeCalendar
```

### Firestore Collections (63)

| Domain | Collections |
|--------|------------|
| **Users & Auth** | `users`, `roles`, `departments` |
| **Clients** | `clients`, `client_notes`, `client_meetings`, `client_brand_assets`, `client_social_links`, `client_monthly_reports` |
| **Projects** | `projects`, `project_members`, `project_milestones`, `project_activity_logs`, `project_marketing_assets`, `milestones` |
| **Tasks** | `tasks`, `task_comments`, `task_time_logs`, `task_dependencies`, `task_activity_logs`, `approval_steps`, `client_approvals` |
| **Social & Posting** | `social_posts` |
| **Calendar** | `calendar_months`, `calendar_items`, `calendar_item_revisions` |
| **Creative** | `creative_projects`, `creative_calendars`, `creative_calendar_items` |
| **QC** | `task_qc_reviews` |
| **Production** | `production_assets`, `shot_lists`, `call_sheets`, `agency_locations`, `agency_equipment`, `production_plans` |
| **Finance** | `invoices`, `payments`, `quotations`, `expenses` |
| **Vendors** | `vendors`, `freelancers`, `freelancer_assignments`, `vendor_service_orders` |
| **HR** | `leave_requests`, `attendance_records`, `employee_profiles`, `teams`, `leave_policies`, `leave_balances`, `attendance_corrections`, `onboarding_checklists`, `offboarding_checklists`, `employee_assets`, `performance_reviews`, `employee_status_changes` |
| **Notifications** | `notifications`, `notification_preferences` |
| **Admin** | `audit_logs`, `workflow_templates`, `dashboard_banners` |
| **Files** | `files`, `folders` |
| **Notes** | `notes` |

---

## System Limitations

### Architectural Constraints

| Limitation | Impact | Cause |
|---|---|---|
| **Bridge layer prop drilling** | Hub components receive many props from App.tsx. Adding a new data dependency requires threading it through. | Phase 3 migration (children reading stores directly) not yet complete. |
| **All subscriptions active simultaneously** | All 63 Firestore listeners are active regardless of which view the user is on. Wastes reads and memory for idle collections. | Phase 5 (lazy subscription lifecycle) not yet implemented. |
| **Client-side only rendering** | No SSR/SSG — initial load requires downloading the JS bundle before rendering. SEO is not applicable (internal tool), but first-paint is slower. | SPA architecture on Firebase Hosting. |
| **Single-region Firestore** | Firestore is provisioned in one region. Multi-region requires a new project. | Firebase project configuration. |
| **No email notifications** | Notifications are push (FCM) and in-app only. No email delivery channel. | Not yet implemented. |

### Firestore-Specific Limits

| Limit | Firebase Constraint | System Impact |
|---|---|---|
| Max document size | 1 MB | Large task descriptions or comment threads could hit this. |
| Max writes/sec per doc | 1 write/sec sustained | Rapidly edited documents (e.g., live collaboration) may fail. |
| Max `onSnapshot` listeners | ~100 per client (practical) | Currently at 63 — within comfortable range. |
| Composite index limits | 200 per database | Complex queries need composite indexes defined in `firestore.indexes.json`. |

---

## System Scaling Strategy

### Current Scale (Small Agency: 5-30 users)

The current architecture is well-suited for a small-to-medium agency:
- 63 Firestore listeners × 30 concurrent users = manageable read volume.
- Single Firestore project with all collections co-located.
- No caching layer needed — Firestore's built-in caching handles offline.

### Medium Scale (30-100 users)

| Change | Purpose |
|---|---|
| **Lazy-load subscriptions** | Only subscribe to collections relevant to the active view. |
| **Paginate large collections** | Tasks and notifications can grow to thousands; add cursor-based pagination. |
| **Add Cloud Functions for writes** | Move sensitive operations (finance, user management) server-side. |
| **Add scope validation in Firestore rules** | Validate ownership/department in security rules. |

### Large Scale (100-500 users)

| Change | Purpose |
|---|---|
| **Complete store migration** | Children read from Zustand stores directly, eliminating the bridge layer. |
| **Firestore data sharding** | Separate high-write collections (notifications, activity logs) into sub-collections. |
| **CDN-cached static assets** | Move file previews and thumbnails to a CDN with aggressive caching. |
| **Read replicas / caching** | Use Firestore bundles or a Redis cache for frequently-read data. |

### Enterprise Scale (500+ users)

At this scale, the architecture would need fundamental changes:
- **Backend API layer** — Cloud Functions or a dedicated Node.js/Go backend for business logic.
- **Multi-tenant isolation** — Separate Firestore databases or projects per agency.
- **Message queue** — Replace direct Firestore writes with a queue (Pub/Sub) for write-heavy operations.
- **Search service** — Algolia or Typesense for full-text search across tasks, clients, projects.

---

## Known Issues & Technical Debt

### Remaining Work

| Area | Issue | Priority |
|---|---|---|
| **Bridge layer** | App.tsx still bridges store data as props to hub components. Phase 3 (children reading stores directly) is next. | 🟡 Medium |
| **Scope validation** | No server-side scope validation in Firestore rules — users could edit resources beyond their scope via direct writes. | 🟠 High |
| **Presentation share tokens** | Tokens don't expire — shared links are permanent. | 🟡 Medium |
| **TypeScript errors** | ~175 pre-existing TypeScript errors remain across the codebase (enum mismatches, missing optional properties). None introduced by recent changes. | 🟡 Medium |
| **Strict null checks** | `strictNullChecks` and full `strict` mode deferred — would introduce ~46+ new errors. | 🟡 Medium |

### Theming
- Some UI elements still use hardcoded `slate-*` Tailwind classes instead of CSS variables.
- Full theming requires extending branding variables to cover all surface types.

### PostingHub
- Missing: drag/drop post moves, calendar view responsiveness, keyboard/swipe navigation.

### File Management
- Missing: drag-and-drop upload, move/copy between folders, bulk operations, storage quotas, version history, file approval workflow.

### HR Module
- **Firestore collections need initial data** — `employee_profiles`, `teams`, `leave_policies`, `leave_balances`, and other HR collections need seed scripts or initial data entry.
- **Cross-module integration pending** — Leave balances not auto-deducted on leave approval; attendance not synced with task time logs; performance reviews not linked to project metrics.
- **Data migration needed** — Existing `users` collection data should be merged into `employee_profiles` for complete employee records.

---

## Contribution Guidelines

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — only receives merges from `development` |
| `development` | Active work — all commits go here first |

### Workflow

1. **Always commit before starting new work** — checkpoint for rollback
2. **Use strict TypeScript types** — avoid `any` unless absolutely necessary
3. **Clean up unused imports and code** — keep the codebase lean
4. **Test locally with `npm run dev`** — never test with `firebase deploy`
5. **Never create `.env.local`** — it loads for all modes and causes credential leaks
6. **Never run a server and another command in the same terminal** — use separate terminals

### Code Standards
- TypeScript strict mode (partial — `strictFunctionTypes`, `strictBindCallApply`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames` enabled)
- Tailwind CSS for styling (no external CSS files unless necessary)
- Lucide React for all icons
- Firebase SDK for all backend operations
- Zod schemas for runtime validation of core entities (`schemas/`)
- `crypto.randomUUID()` for all ID generation (`utils/id.ts`)
- `utils/timestamps.ts` for Firestore timestamp normalization
- All new types go in `types.ts`
- All new collection names referenced in store `subscribeCollection()` calls
- All new permissions go in `lib/permissions.ts`

### Pre-commit Hooks
Husky + lint-staged runs on every commit:
- ESLint `--fix` on staged `.ts/.tsx/.json/.md/.css` files
- Prettier formatting on staged files

---

## Documentation Roadmap

| File | Location | Status | Purpose |
|---|---|---|---|
| **SYSTEM_ARCHITECTURE.md** | `/SYSTEM_ARCHITECTURE.md` | ✅ Exists | Deep-dive into system layers, design decisions, and component relationships |
| **PERMISSIONS_GUIDE.md** | `/PERMISSIONS_GUIDE.md` | ✅ Exists | Complete RBAC reference — roles, scopes, `can()` function, hooks, gates, sync strategy |
| **DEPLOYMENT_GUIDE.md** | `/docs/DEPLOYMENT_GUIDE.md` | ✅ Exists | Step-by-step deployment for dev and production environments |
| **DEVELOPMENT_SETUP.md** | `/docs/DEVELOPMENT_SETUP.md` | ✅ Exists | Development environment setup instructions |
| **GIT_WORKFLOW.md** | `/docs/GIT_WORKFLOW.md` | ✅ Exists | Git branching strategy and commit conventions |
| **MERGE_PROCEDURE.md** | `/docs/MERGE_PROCEDURE.md` | ✅ Exists | How to merge development branch to production |
| **DATA_MODEL.md** | `/docs/DATA_MODEL.md` | ❌ Needed | Field-level Firestore schema for all 63 collections |
| **SECURITY_MODEL.md** | `/docs/SECURITY_MODEL.md` | ❌ Needed | Auth flow, RBAC enforcement, Firestore rules, share links, API key management |
| **NOTIFICATION_SYSTEM.md** | `/docs/NOTIFICATION_SYSTEM.md` | ❌ Needed | Notification architecture deep-dive — types, delivery, Cloud Functions, FCM, preferences |
| **AI_ASSISTANT_GUIDE.md** | `/docs/AI_ASSISTANT_GUIDE.md` | ❌ Needed | Gemini AI integration guide — prompts, context injection, model configuration |
| **CHANGELOG.md** | `/CHANGELOG.md` | ❌ Needed | Running log of notable changes, features, and fixes per release |
| **API_REFERENCE.md** | `/docs/API_REFERENCE.md` | ❌ Needed | Cloud Functions API documentation — endpoints, payloads, responses |

---

## Vision

IRIS Agency OS aims to be the **single operating system** a creative agency needs — replacing fragmented tool stacks (Asana + Slack + Drive + spreadsheets) with one unified, real-time platform that understands agency workflows: from client onboarding through creative direction, production, quality control, posting, and financial tracking.

**Roadmap priorities:**
- Complete store migration (children read stores directly, eliminate bridge layer)
- Scope validation in Firestore security rules
- Email notification delivery channel
- Advanced file management (drag/drop, version history, approvals)
- Complete theming system (all surfaces variable-driven)
- Client portal for external access
- Mobile-native companion app

---

## Documentation Policy

This `README.md` is the **single source of truth** for the project overview. Detailed technical references live as companion documents:

### Root-Level Documents
- [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) — Deep system architecture reference
- [`PERMISSIONS_GUIDE.md`](PERMISSIONS_GUIDE.md) — Complete RBAC technical guide

### /docs/ Folder
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) — Step-by-step deployment instructions
- [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) — Full development environment setup
- [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) — Git branching strategy
- [`docs/MERGE_PROCEDURE.md`](docs/MERGE_PROCEDURE.md) — How to merge development to production

See [Documentation Roadmap](#documentation-roadmap) for planned additional documentation.
