# IRIS Agency OS

> A comprehensive, real-time operating system for creative agencies — covering clients, projects, production, posting, finance, HR, quality control, creative direction, analytics, and AI-assisted workflows. Built as an installable PWA on Firebase with role-based access control.

**Production** — https://iris-os-43718.web.app  
**Development** — https://iris-agency-os-dev.web.app

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Core System Modules](#core-system-modules)
- [Permissions System (RBAC)](#permissions-system-rbac)
- [File Management](#file-management)
- [Notification System](#notification-system)
- [AI Assistant](#ai-assistant)
- [Theming & Branding](#theming--branding)
- [PWA Support](#pwa-support)
- [Development Setup](#development-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Folder Structure](#folder-structure)
- [Data Models](#data-models)
- [Known Issues & Technical Debt](#known-issues--technical-debt)
- [Contribution Guidelines](#contribution-guidelines)
- [Vision](#vision)

---

## Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **UI Framework** | React | 19.2.0 | Latest concurrent features, component model |
| **Language** | TypeScript | ~5.8.2 | Strict type safety across the entire codebase |
| **Build Tool** | Vite | ^6.2.0 | Sub-second HMR, native ESM, fast builds |
| **Styling** | Tailwind CSS | ^3.4.17 | Utility-first, rapid UI iteration, dark theme |
| **Icons** | lucide-react | ^0.554.0 | Consistent, tree-shakeable icon set |
| **Charts** | Recharts | ^3.5.0 | Composable React chart library for analytics |
| **Backend** | Firebase | ^12.6.0 | Auth, Firestore, Storage, Hosting, Cloud Functions, FCM |
| **AI** | @google/generative-ai | ^0.24.1 | Gemini 2.5 Flash for content generation |
| **PWA** | vite-plugin-pwa | ^1.2.0 | Workbox service worker, offline caching, installability |
| **Auth Hashing** | bcryptjs | ^3.0.3 | Invite-flow temporary password hashing |
| **Date Handling** | date-fns | ^4.1.0 | Lightweight, tree-shakeable date utilities |
| **Testing** | Vitest + Testing Library | ^4.0.15 / ^6.9.1 | Unit and component testing (framework in place) |
| **Image Processing** | Sharp | ^0.34.5 | Icon/asset generation at build time |

---

## Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        index.tsx                             │
│   Public URL interceptor → AuthProvider → App                │
│   (Catches /presentation/share/:token before auth)           │
├──────────────────────────────────────────────────────────────┤
│                         App.tsx                              │
│   2,509 lines • State hub • 52 Firestore subscriptions      │
│   View router (activeView) • CRUD handlers • Shell layout    │
├──────────────┬────────────────┬───────────────────────────────┤
│  Contexts    │    Hooks       │   Services                    │
│ AuthContext  │ useFirestore   │ geminiService                 │
│ BrandingCtx │ usePermissions │ notificationService            │
│              │ useDashboard   │                               │
│              │ useMessaging   │                               │
├──────────────┴────────────────┴───────────────────────────────┤
│                      Components                              │
│   38 root-level + 10 subdirectories = ~92 component files    │
│   Organized by domain: admin/ analytics/ calendar/ common/   │
│   creative/ dashboard/ layout/ production/ public/ tasks/    │
│   workflows/                                                 │
├──────────────────────────────────────────────────────────────┤
│                      Firebase                                │
│   Auth • Firestore (55+ collections) • Storage • FCM         │
│   Cloud Functions (notification outbox + OG metadata proxy)  │
│   Hosting (SPA rewrite, cache headers)                       │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **State-based routing** — No react-router. `App.tsx` uses an `activeView` state variable and a `renderContent()` switch to render the active module. Navigation is handled by the `Sidebar` component setting this state.
- **Single orchestration layer** — `App.tsx` owns 52 real-time Firestore subscriptions via `useFirestoreCollection`, all CRUD handler functions, and passes data down as props. This keeps modules stateless and predictable.
- **Path alias** — `@/*` maps to the project root (configured in `vite.config.ts` and `tsconfig.json`).
- **No `.env.local`** — Environment separation uses `.env.development` and `.env.production` only. Creating `.env.local` would leak credentials across modes. See [Environment Variables](#environment-variables).

### Data Flow

```
Firestore ──onSnapshot──→ useFirestoreCollection ──→ App.tsx state
                                                         │
                                               props to Hub components
                                                         │
                                              User actions call handlers
                                                         │
                                            Firestore writes (setDoc/updateDoc)
                                                         │
                                               onSnapshot fires again ──→ UI updates
```

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
| `useDashboardData` | `hooks/useDashboardData.ts` | Aggregates tasks, meetings, social posts into dashboard stats (269 lines) |
| `useMessagingToken` | `hooks/useMessagingToken.ts` | FCM token lifecycle — registers service worker, requests permission, saves token |

---

## Core System Modules

The app is organized into **17 navigable views** (plus a fallback "Under Construction" page). Each module is a self-contained hub component rendered by `App.tsx`.

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
- **Assignment helpers**: `utils/taskAssignmentHelpers.ts` maps roles → task types for auto-assignment

### Quality Control Hub
- **File**: `components/QualityControlHub.tsx` + `components/QCReviewDrawer.tsx`
- **Features**: Tinder-style swipe review deck, rejection modal with notes/references, Google Drive in-app preview (thumbnail + iframe), deliverable switcher, type badges, role-based override rules (GM/CD), linked approval pipeline
- **Logic**: `utils/qcUtils.ts` — `computeQCStatus()`, `submitQCReview()`, `approveFromQCHub()`, `rejectFromQCHub()`, `syncApprovalToQCReview()`

### Creative Direction Hub
- **File**: `components/CreativeDirectionHub.tsx`
- **Sub-components**: 7 files in `components/creative/` — `CalendarActivation`, `CalendarPresentationView`, `CopywriterView`, `ManagerView`, `RejectionModal`, `ShareLinkManager`, `SwipeReviewCard`
- **Features**: Role-based views (Manager vs Copywriter), creative project lifecycle (assign → draft → review → approve → activate), swipe card review UX, strategy upload, calendar activation to Calendar Department
- **Presentation View** (855 lines): Polished editorial layout for client presentation — 3-column grid, Google Drive thumbnail extraction, type/search filtering, print CSS, bidi Arabic/English text support, slide mode with keyboard navigation
- **Share Link System**: `ShareLinkManager.tsx` generates cryptographically random tokens, stores in `presentation_shares` collection, tracks access count and last opened time. `PublicPresentationPage.tsx` (757 lines) renders the shared view externally without authentication
- **Data objects**: `CreativeProject`, `CreativeCalendar`, `CreativeCalendarItem`

### Calendar Hub
- **File**: `components/CalendarHub.tsx` (~1,210 lines)
- **Sub-components**: `components/calendar/CalendarDeptPresentationView.tsx` (~655 lines)
- **Features**: Calendar month management, calendar item CRUD per client, unified calendar view, presentation view for Calendar Department
- **Data objects**: `CalendarMonth`, `CalendarItem`

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

### Team Hub
- **File**: `components/TeamHub.tsx`
- **Features**: HR management, leave requests, attendance records, role assignments
- **Data objects**: `User`, `LeaveRequest`, `AttendanceRecord`

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

---

## Permissions System (RBAC)

### Overview

IRIS OS implements a comprehensive Role-Based Access Control system with **28 permission categories** containing **120+ individual permission keys**, supporting **scope-based access** (SELF → DEPARTMENT → PROJECT → ALL).

### Architecture

| Component | File | Purpose |
|-----------|------|---------|
| Permission catalog | `lib/permissions.ts` (587 lines) | `PERMISSIONS` object, `can()` function, scope helpers |
| Permission hooks | `hooks/usePermissions.ts` | `usePermissions()`, `useHasPermission()`, `useCanPerform()` |
| Permission gate | `components/PermissionGate.tsx` | Declarative component to conditionally render UI based on permissions |
| Role definitions | `constants.ts` | 9 built-in roles with default permission sets |
| Auth integration | `contexts/AuthContext.tsx` | Loads role permissions, provides `checkPermission()` |

### Built-in Roles

| Role | Department | Admin |
|------|-----------|-------|
| General Manager | Management | Yes |
| Creative Director | Creative | Yes |
| Art Director | Creative | No |
| Account Manager | Accounts | No |
| Production Manager | Production | No |
| Designer | Creative | No |
| Copywriter | Creative | No |
| Social Manager | Marketing | No |
| Finance Manager | Management | No |

### Permission Categories

```
AUTH             — LOGIN
USERS            — VIEW_ALL, CREATE, EDIT, DISABLE, FORCE_PASSWORD_RESET
ROLES            — VIEW, CREATE, EDIT, DELETE, ASSIGN
PERMISSIONS_ADMIN — VIEW, MANAGE
DEPARTMENTS      — VIEW, CREATE, EDIT, DELETE, ASSIGN_MEMBERS
CLIENTS          — VIEW_OWN, VIEW_DEPT, VIEW_ALL, CREATE, EDIT, ARCHIVE, DELETE
CLIENT_NOTES     — VIEW, CREATE, EDIT, DELETE
CLIENT_MEETINGS  — VIEW, CREATE, EDIT, DELETE
CLIENT_BRAND_ASSETS — VIEW, MANAGE
CLIENT_MARKETING — VIEW, MANAGE
PROJECTS         — VIEW_OWN, VIEW_DEPT, VIEW_ALL, CREATE, EDIT_OWN, EDIT_DEPT,
                   EDIT_ALL, EDIT, ARCHIVE, DELETE
MILESTONES       — VIEW, CREATE, EDIT, DELETE
TASKS            — VIEW_ALL, VIEW_DEPT, VIEW_PROJECT, VIEW_OWN, CREATE,
                   EDIT_ALL, EDIT_DEPT, EDIT_OWN, DELETE, ASSIGN_ALL, ASSIGN_DEPT,
                   MANAGE_ASSIGNEES, MANAGE_PUBLISHING, REOPEN, EDIT_COMPLETED,
                   ARCHIVE, ARCHIVE_VIEW, MANUAL_CLOSE_APPROVE, MANUAL_CLOSE_REJECT,
                   REFERENCES_VIEW, REFERENCES_ADD, REFERENCES_DELETE
TASK_FILES       — UPLOAD, DELETE, VIEW
APPROVALS        — VIEW_OWN, VIEW_DEPT, VIEW_ALL, ACT, CONFIGURE
POSTING          — VIEW_DEPT, VIEW_ALL, CREATE, EDIT, ASSIGN, SUBMIT_FOR_REVIEW,
                   REQUEST_REVISION, APPROVE, SCHEDULE, MARK_PUBLISHED, ARCHIVE, DELETE
ASSETS           — VIEW_DEPT, VIEW_ALL, UPLOAD, EDIT_METADATA, DELETE,
                   LINK_TO_TASK, ARCHIVE
PRODUCTION       — VIEW, CREATE, EDIT, ASSIGN_CREW, SCHEDULE, CLOSE_JOB, DELETE,
                   PLANS_CREATE, PLANS_EDIT, PLANS_DELETE, PLANS_VIEW,
                   OVERRIDE_CONFLICTS, RESTORE_ARCHIVED
VENDORS          — VIEW, CREATE, EDIT, DELETE, ASSIGN_TO_PROJECT
FINANCE          — VIEW_OWN, VIEW_PROJECT, VIEW_ALL, CREATE_INVOICE, EDIT_INVOICE,
                   DELETE_INVOICE, RECORD_PAYMENT, APPROVE_PAYMENT, EXPORT,
                   MANAGE_BUDGETS
REPORTS          — VIEW_DEPT, VIEW_ALL, EXPORT
ANALYTICS        — VIEW_DEPT, VIEW_ALL
ADMIN_BRANDING   — VIEW, EDIT, UPLOAD_ASSETS
ADMIN_SETTINGS   — VIEW, EDIT
DASHBOARD        — VIEW_GM_URGENT
NOTES            — CREATE, EDIT_OWN, DELETE_OWN, MANAGE_ALL
CALENDAR         — VIEW, MANAGE
CALENDAR_MONTHS  — CREATE, EDIT, DELETE
CALENDAR_ITEMS   — CREATE, EDIT, DELETE
CREATIVE         — VIEW, MANAGE, REVIEW, UPLOAD, APPROVE, REJECT
QC               — VIEW, MANAGE, REVIEW_APPROVE, REVIEW_REJECT, REVIEW_COMMENT,
                   ASSIGN_REVIEWERS
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

### Testing

Vitest and Testing Library are installed but no automated test suite is actively run. Test files go in `src/tests/`.

```bash
# When test scripts are added:
npx vitest        # Run tests
npx vitest --ui   # Visual test runner
```

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

## Folder Structure

```
iris-agency-os/
├── index.html              # HTML entry point
├── index.tsx               # React entry point + public URL interceptor
├── App.tsx                 # Main orchestration (2,509 lines, 52 Firestore subs)
├── types.ts                # All TypeScript interfaces (1,459 lines, 65+ interfaces)
├── constants.ts            # Roles, departments, collection names (1,408 lines)
├── index.css               # Global styles + Tailwind directives
├── vite.config.ts          # Vite + PWA + Workbox configuration
├── firebase.json           # Firebase hosting config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
├── storage.rules           # Firebase Storage security rules
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── postcss.config.js       # PostCSS configuration
├── package.json            # Dependencies and scripts
│
├── components/             # ~92 component files
│   ├── *.tsx               # 38 root-level hub & shared components
│   ├── admin/              # Admin hub sub-components (6 files)
│   ├── analytics/          # Analytics views & KPI cards (5 files)
│   ├── calendar/           # Calendar department presentation (1 file)
│   ├── common/             # Shared UI: Modal, Drawer, DataTable, DrivePreview,
│   │                         LinkPreviewThumbnail, DropdownMenu (6 files)
│   ├── creative/           # Creative direction: manager/copywriter views,
│   │                         presentation, share links, swipe review (7 files)
│   ├── dashboard/          # Dashboard cards (8 files) + widgets/ (8 files)
│   ├── layout/             # Page layout primitives (4 files)
│   ├── production/         # Production widgets & planning (2 files)
│   ├── public/             # Public-facing pages — PublicPresentationPage (1 file)
│   ├── tasks/              # Task board, list, detail, creation (5 files)
│   └── workflows/          # Workflow hub (1 file)
│
├── config/
│   └── branding.config.ts  # CSS variables, fonts, identity defaults
│
├── contexts/
│   ├── AuthContext.tsx      # Auth + user profile + role/permission loading
│   └── BrandingContext.tsx  # CSS variable injection
│
├── hooks/
│   ├── useDashboardData.ts # Dashboard stats aggregation
│   ├── useFirestore.ts     # Generic Firestore realtime hook
│   ├── useMessagingToken.ts # FCM token management
│   └── usePermissions.ts   # Permission checking hooks
│
├── lib/
│   ├── firebase.ts         # Firebase app init + exports (auth, db, storage, etc.)
│   ├── permissions.ts      # PERMISSIONS catalog + can() function
│   └── specialty.ts        # Specialty/skill definitions
│
├── services/
│   ├── geminiService.ts    # Google Gemini AI integration
│   └── notificationService.ts # Notification creation + delivery (432 lines)
│
├── utils/
│   ├── approvalUtils.ts    # Task approval step checking
│   ├── archiveUtils.ts     # Task archiving logic
│   ├── driveUtils.ts       # Google Drive URL detection & preview utilities
│   ├── fileUpload.ts       # Firebase Storage upload + branding asset validation
│   ├── folderUtils.ts      # Auto-folder creation for clients/projects/tasks
│   ├── overflowDetector.ts # Dev-mode CSS overflow debugging
│   ├── productionUtils.ts  # Production plan task generation & lifecycle
│   ├── qcUtils.ts          # QC status computation & review submission
│   ├── seedData.ts         # Mock data seeder for Firestore
│   ├── socialArchiveUtils.ts # Social post archiving
│   └── textDirection.ts    # Arabic/RTL text detection & bidi support
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
```

---

## Data Models

All types are defined in `types.ts` (1,459 lines). Key entities and their relationships:

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

### Firestore Collections (55+)

| Domain | Collections |
|--------|------------|
| **Users & Auth** | `users`, `roles`, `departments` |
| **Clients** | `clients`, `client_notes`, `client_meetings`, `client_brand_assets`, `client_social_links`, `client_monthly_reports`, `client_strategies`, `client_approvals` |
| **Projects** | `projects`, `project_members`, `project_milestones`, `project_activity_logs`, `project_marketing_assets` |
| **Tasks** | `tasks`, `task_comments`, `task_time_logs`, `task_dependencies`, `task_activity_logs`, `approval_steps` |
| **Social & Posting** | `social_posts` |
| **Calendar** | `calendar_months`, `calendar_items` |
| **Creative** | `creative_projects`, `creative_calendars`, `creative_calendar_items`, `presentation_shares` |
| **QC** | `task_qc_reviews` |
| **Production** | `production_assets`, `shot_lists`, `call_sheets`, `agency_locations`, `agency_equipment`, `production_plans` |
| **Finance** | `invoices`, `payments`, `quotations`, `expenses` |
| **Vendors** | `vendors`, `freelancer_assignments`, `vendor_service_orders` |
| **HR** | `leave_requests`, `attendance_records` |
| **Notifications** | `notifications`, `notification_preferences`, `notification_tokens`, `notifications_outbox` |
| **Admin** | `settings`, `audit_logs`, `workflow_templates`, `dashboard_banners` |
| **Files** | `files`, `folders` |

---

## Known Issues & Technical Debt

### Permission System
- `App.tsx` still checks some old underscore-style permission keys — need migration to `PERMISSIONS.*` constants
- Hub components largely ungated — need per-hub permission gates and scope-based data filtering
- Firestore security rules not aligned with the RBAC model (catch-all `allow read, write: if true` still in place)

### Testing
- Vitest and Testing Library are installed but no automated test suite is actively executed
- No CI/CD pipeline for automated testing

### Theming
- Some UI elements (tables, cards, login page, body text) still use hardcoded `slate-*` Tailwind classes instead of CSS variables
- Full theming requires extending branding variables to cover all surface types

### PostingHub
- Missing: drag/drop post moves, calendar view responsiveness, keyboard/swipe navigation

### File Management
- Missing: drag-and-drop upload, move/copy between folders, bulk operations, storage quotas, version history, file approval workflow

### Security
- Firestore catch-all rule allows unrestricted read/write — security is enforced only at the application level
- `firebase-messaging-sw.js` has hardcoded production config (acceptable tradeoff)

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
- TypeScript strict mode
- Tailwind CSS for styling (no external CSS files unless necessary)
- Lucide React for all icons
- Firebase SDK for all backend operations
- All new types go in `types.ts`
- All new collection names go in `constants.ts`
- All new permissions go in `lib/permissions.ts`

---

## Vision

IRIS Agency OS aims to be the **single operating system** a creative agency needs — replacing fragmented tool stacks (Asana + Slack + Drive + spreadsheets) with one unified, real-time platform that understands agency workflows: from client onboarding through creative direction, production, quality control, posting, and financial tracking.

**Roadmap priorities:**
- Full Firestore security rules aligned with RBAC
- Comprehensive test coverage
- Email notification delivery channel
- Advanced file management (drag/drop, version history, approvals)
- Complete theming system (all surfaces variable-driven)
- Client portal for external access
- Mobile-native companion app

---

## Documentation Policy

This `README.md` is the **single source of truth** for the project overview. Extended deployment and workflow guides live in the `docs/` folder:

- [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) — Git branching strategy
- [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) — Full development environment setup
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) — Step-by-step deployment instructions
- [`docs/MERGE_PROCEDURE.md`](docs/MERGE_PROCEDURE.md) — How to merge development to production
