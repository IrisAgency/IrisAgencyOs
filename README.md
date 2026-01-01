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

## Notifications
- Type system with 40+ notification types, severities, categories; Firestore collection `notifications` schema documented here.
- `services/notificationService.ts` handles creation, dedupe (5-minute window), grouping, and routing; UI via `NotificationsHub` with filters, badges, quick actions.

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
- Prereqs: Node 18+, npm.
- Install: `npm install`
- Env (`.env.local`):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_GEMINI_API_KEY`
- Run dev: `npm run dev` (serves on 3000, 0.0.0.0)
- Build: `npm run build`; Preview: `npm run preview`.
- Tests: Vitest/RTL available; add an npm script and write coverage—currently not run here.

## Deployment
- Target: Firebase Hosting (`dist`), SPA rewrite to `index.html`; cache headers set for assets/manifest/service worker.
- Rebuild after branding config changes; deploy with `firebase deploy --only hosting`.
- Firestore: rules in `firestore.rules`, indexes in `firestore.indexes.json`; update rules to reflect RBAC scopes before production use.

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
- This `README.md` is the single source of truth. Additional project markdown files have been consolidated here.
