# IRIS Agency OS

IRIS Agency OS is a unified operating system for creative agencies covering clients, projects, production, posting, finance, HR, files, and analytics with AI assistance, PWA installability, and Firebase real-time data.

**Live**
- https://iris-os-43718.web.app (PWA build)
- https://agency-management-cba4a.web.app (dashboard refactor build)

## Tech Stack
- React 19 + TypeScript (strict, bundler resolution), Vite 6, Tailwind CSS, Lucide React icons, Recharts.
- Firebase Auth, Firestore, Storage; Firestore indexes via `firestore.indexes.json`, hosting config in `firebase.json` with SPA rewrites.
- PWA via `vite-plugin-pwa` + Workbox runtime caching; dev server `0.0.0.0:3000`.
- AI: Google Gemini (`@google/generative-ai`).
- Tooling: Vitest + Testing Library (not yet wired into scripts), PostCSS/Autoprefixer, Sharp (icons).

## Architecture
- `App.tsx` orchestrates hubs, handlers, theming, and permission checks (`useAuth().checkPermission`).
- Data access: `useFirestoreCollection` real-time listeners; writes through Firebase SDK handlers in `App.tsx`; path alias `@/*` → project root.
- Contexts: `AuthContext` (auth + permissions), `BrandingContext` (CSS variables from `config/branding.config.ts`).
- Hubs (domain modules): `Dashboard`, `ClientsHub`, `ProjectsHub`, `TasksHub`, `PostingHub`, `FilesHub`, `ProductionHub`, `FinanceHub`, `VendorsHub`, `TeamHub`, `AnalyticsHub`, `NotificationsHub`, `AdminHub`, `AIAssistant`.
- Dashboard refactor: modular components under `components/dashboard/*` using `useDashboardData` and `types/dashboard.ts`.

## Features by Hub
- Dashboard: timeline/week/today views, urgent tasks, focus list, stats (completion, type distribution, weekly activity), upcoming meetings.
- Clients: CRM with notes, meetings, brand assets, marketing strategies; cascades to projects/tasks/files.
- Projects: lifecycle, milestones, members (staff/freelancers), approvals, files, activity logs.
- Tasks: Kanban with workflows, approvals, dependencies, time logs, comments, file attachments.
- Quality Control (QC): Tinder-style swipe review deck, linked approval pipeline, rejection modal with notes/references, role-based access (GM/CD override rules). **Google Drive in-app preview**: auto-detects Drive links in task references/attachments/deliveryLinks, renders thumbnails on cards (Drive Thumbnail API), full iframe preview in QC Review Drawer (video/image/PDF), deliverable switcher, type badges, permission-aware fallback with "Open in Drive" escape hatch.
- Creative Direction: Manager/Copywriter role-based views, creative project lifecycle (assign → draft → review → approve → activate), swipe card review UX, strategy upload, calendar activation to Calendar Department. **Presentation View**: polished client-friendly presentation mode for approved calendars, slide mode (keyboard nav) + grid overview, type/search filtering, Google Drive fast preview (thumbnail extraction), bidi Arabic/English text support, responsive (no horizontal scroll), gated by `creative_direction.presentation.view` permission, share link support.
- Posting: Refactored responsive board (kanban desktop, tabbed mobile), drawer/modal details, permission-aware read-only UX.
- Files: Client-first hierarchy with auto-created client/project/task folders, smart categorization, breadcrumbs, filters.
- Production: shot lists, call sheets, locations, equipment inventory.
- Finance: invoices, quotations, payments, expenses, budget tracking.
- Vendors/Team/Analytics/Notifications/Admin: vendor registry, HR/roles, analytics dashboards, in-app notifications, system settings, branding editor, role/permission management.
- AI Assistant: Gemini-backed ideation and content helpers.

## Theming & Branding
- Single source: `config/branding.config.ts` (identity, colors, typography, assets). Admin → Branding overrides defaults and persists to Firestore.
- CSS variables injected via `BrandingContext`, mapped in Tailwind; 57+ components consume branding.
- Color audit: many core surfaces now variable-driven; some elements remain hardcoded (e.g., tables/cards/body text slate palette, login page colors) and need future variable hooks for full theming.

## Permissions (RBAC)
- Permission catalog (150+ keys) and `can()` helper in `lib/permissions.ts`; hooks in `hooks/usePermissions.ts`; gates in `components/PermissionGate.tsx`; roles in `constants.ts` (12 defaults).
- Coverage map and implementation/status migrated into this README for reference.
- Current gaps to fix soon:
  - `App.tsx` still checks old permission keys (underscored variants) causing false Access Denied; migrate to `PERMISSIONS.*` constants.
  - Hub components largely ungated and lack scope-based filtering (own/dept/project/all) for tasks/projects/clients/posts/finance/etc.
  - Firestore security rules not yet updated to mirror the new permission model.

## Notifications (Refactored & Fully Functional)
- **Status**: ✅ Core notification system implemented and functional for task assignments and status changes
- **Architecture**: Hybrid system combining in-app notifications (Firestore) with Firebase Cloud Messaging (FCM) for push notifications
- **Service Layer** (`services/notificationService.ts`): Centralized notification creation with preference filtering, recipient resolution, and metadata management
- **Automatic Triggers** (implemented): Task creation notifies assigned users (`TASK_ASSIGNED`); Task updates notify on status changes (`TASK_STATUS_CHANGED`) and assignment changes (`TASK_ASSIGNED`/`TASK_UNASSIGNED`)
- **Notification Types** (50+ defined): Tasks, Approvals, Posting, Meetings, Finance, Projects with specific event types
- **Data Model**: `notifications` (per-user: userId, type, title, message, severity, category, entityType, entityId, actionUrl, isRead); `notification_preferences` (mutedCategories, severityThreshold, channel toggles); `notification_tokens` (FCM); `notifications_outbox` (queue)
- **Preference System**: Users control muted categories, severity threshold, delivery channels; preferences persisted and checked before creation
- **Manual Notifications**: Admin console to send to users/roles/projects/all
- **FCM Integration**: Permission handling, service worker, token management via `useMessagingToken` hook
- **Cloud Function**: Processes outbox, sends FCM in batches, creates per-user docs with full metadata, removes invalid tokens
- **Security Rules**: Notifications restricted by userId; preferences per-user only
- **Future**: Approval workflows, comment mentions, scheduled reminders, email delivery, archiving, advanced features

## File Management
- Client-centric folder hierarchy with auto folder creation for clients/projects/tasks; standardized filenames `[ClientCode]-[TaskName]-v[Version]-[Timestamp].[ext]`.
- Category detection (video/image/document/design/presentation/spreadsheet/archive/strategy) drives destination folders and UI badges.
- FilesHub UI: breadcrumbs, filters (videos/photos/documents/strategies), type icons, list/grid, client-first navigation.
- Future enhancements (not yet built): drag-and-drop upload/move, move/copy, bulk ops, storage quotas, advanced search, sharing, version history, approvals.

## PWA
- Installable on Android/desktop; iOS manual add-to-home-screen. Service worker caches assets, Google Fonts cache-first; include assets `icon-192/512`, `apple-touch-icon`, `splash.gif/mp4`.
- Install prompt obeys Chrome engagement heuristics; if prompt not shown, use browser Install/Add to Home Screen.
- Manifest in `vite.config.ts`; hosting headers in `firebase.json` set cache controls and SPA rewrites.

## AI Assistant
- `services/geminiService.ts` wraps Gemini (model `gemini-2.5-flash`); surfaced via `components/AIAssistant.tsx` for creative briefs/captions/logistics.

## Setup & Local Development
- Prereqs: Node 18+, npm, Firebase CLI (`npm install -g firebase-tools`).
- Install: `npm install`
- Env (`.env.local`):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_VAPID_KEY`
  - `VITE_GEMINI_API_KEY`
  - `VITE_ENVIRONMENT` (optional: `development` or `production`)
- Run dev: `npm run dev` (serves on 3000, 0.0.0.0)
- Build: `npm run build`; Preview: `npm run preview`.
- Tests: Vitest/RTL available; add an npm script and write coverage -- currently not run here.

## Environments & Branching

### Branch Strategy
| Branch | Purpose | Firebase Project | Deploy Command |
|--------|---------|-----------------|----------------|
| `main` | Production (live) | `iris-os-43718` | `firebase deploy --project=prod` |
| `development` | Development / staging | `iris-agency-os-dev` | `firebase deploy` (default) |

### Key Rules
- **Default `firebase deploy` targets the DEV project** (`iris-agency-os-dev`) to prevent accidental production deployments.
- Production deploys require explicit `--project=prod`.
- All new work happens on `development` branch or feature branches off it.
- Merges to `main` require pull request review.

### Environment Files
| File | Purpose | Git Tracked |
|------|---------|-------------|
| `.env.local` | Current environment (dev or prod Firebase credentials) | No (Ignored) |
| `.env.development` | Template for dev Firebase credentials | No (Ignored) |
| `.env.local.example` | Example env file for onboarding | Yes (Tracked) |

### Hosting URLs
- **Production**: https://iris-os-43718.web.app
- **Development**: https://iris-agency-os-dev.web.app
- **Legacy**: https://agency-management-cba4a.web.app

## Deployment
- **Development** (default): `firebase deploy` -- deploys to dev Firebase project.
- **Production**: `firebase deploy --project=prod` -- deploys to production Firebase project.
- Target: Firebase Hosting (`dist`), SPA rewrite to `index.html`; cache headers set for assets/manifest/service worker.
- Rebuild after branding config changes; deploy with `firebase deploy --only hosting`.
- Functions: deploy the notification outbox processor with `firebase deploy --only functions`; requires Node 18 and Firebase CLI logged into the target project. Admin SDK uses the project default service account -- no extra keys needed.
- Firestore: rules in `firestore.rules`, indexes in `firestore.indexes.json`; update rules to reflect RBAC scopes before production use.

## Extended Documentation
Detailed guides are available in the `docs/` folder:
- [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) -- Git branching strategy and workflow
- [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) -- Full development environment setup
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) -- Step-by-step deployment instructions
- [`docs/MERGE_PROCEDURE.md`](docs/MERGE_PROCEDURE.md) -- How to merge development to production
- [`docs/legacy/`](docs/legacy/) -- Archived scripts and historical documentation

## Data & Models
- Authoritative types in `types.ts` (users/roles/clients/projects/tasks/workflows/files/finance/vendors/production/notifications/settings).
- Seed helpers in `utils/seedData.ts` (optional bootstrap); mock dashboard data in `data/mockDashboardData.ts`.

## Known Bugs / Technical Debt
- Permission key mismatch in `App.tsx`; replace old underscore keys with `PERMISSIONS.*` constants.
- Hubs missing permission gates and scope-based filtering (clients/projects/tasks/posts/finance/production/team/vendors/analytics/files/admin/notifications).
- Firestore security rules not aligned with new RBAC model.
- PostingHub future items: drag/drop moves, calendar responsiveness, keyboard/swipe UX; needs regression tests.
- File management future items: drag/drop upload, move/copy, bulk ops, quotas, version history, approvals.
- Theming gaps: tables/cards/login/text still use hardcoded slate/white; extend branding variables for full theming.
- Storage integration: replace any mock file URLs with Firebase Storage + signed URLs before production.
- Testing gap: Vitest/RTL present but no automated test suite executed yet.

## Documentation Policy
- This `README.md` is the single source of truth for project overview. Extended documentation lives in the `docs/` folder.
- Legacy files and historical scripts are archived in `docs/legacy/`.
