# IRIS Agency OS — System Reference

## 1. Platform Overview
- **Purpose**: IRIS OS is an agency operations platform covering client management, production workflows, task orchestration, finance, HR, and analytics with AI-assisted ideation.
- **Tech Stack**: React (Vite + TypeScript) frontend, Firebase Authentication, Firestore, and Storage. State is pulled via real-time Firestore listeners (`useFirestoreCollection`).
- **Structure**: A root `App` component orchestrates theming, layout, and hub routing. Each functional domain lives in a dedicated hub component (e.g., `ProjectsHub`, `TasksHub`).
- **Data Flow**: Firestore collections mirror TypeScript domain types in `types.ts`. `constants.ts` supplies mock defaults and seeding data. Actions write back through Firebase SDK helpers in `App.tsx`.
- **AI Integration**: `services/geminiService.ts` exposes Gemini-powered content helpers surfaced through the `AIAssistant` component.

```
+-------------------+        +-------------------+
| React UI (Hubs)  | <----> | useFirestore hooks |
+-------------------+        +---------+---------+
                                          |
                                     Firestore
                                          |
                                 Firebase Auth
```

## 2. Architecture Breakdown
### 2.1 Core Shell
- `index.tsx` mounts `App` within `AuthProvider`.
- `App.tsx` wires hubs, global handlers, theming, and RBAC-aware views (via `useAuth().checkPermission`).
- `Sidebar` + `Header` manage navigation and user controls.

### 2.2 Data Access Layer
- `useFirestoreCollection<T>` wraps `onSnapshot` listeners, returning `[data, loading, error]`. It gates subscriptions on authenticated users and merges doc IDs into typed objects.
- Mutations use Firebase SDK (`setDoc`, `updateDoc`, `writeBatch`, etc.) defined within `App.tsx` handlers to keep logic colocated with UI modules.

### 2.3 Domain Modules (“Hubs”)
- **Dashboard**: High-level stats, urgent tasks, upcoming deadlines. Consumes `tasks` and `projects`.
- **ClientsHub**: CRUD for clients, linking to projects, invoices, quotations. Embedded handler support for cascading deletes.
- **ProjectsHub**: Project lifecycle (creation, status, milestones, members, freelancer assignments, files). Integrates approval steps, files, and tasks.
- **TasksHub**: Task board with advanced filters, workflow automation, approvals, comments, time logs, dependencies, and file attachments. Supports dynamic workflow templates.
- **FilesHub**: Project-centric file manager with folder hierarchy and upload stubs.
- **ProductionHub**: Shot lists, call sheets, locations, equipment inventory (production asset pipeline).
- **VendorsHub**: Vendor and freelancer registry plus service orders and assignments.
- **FinanceHub**: Invoices, quotations, payments, expenses. Auto-updates invoice balance and project spend.
- **TeamHub (HR)**: User management, leave requests, attendance records, role definitions.
- **AnalyticsHub**: Aggregate dashboards across tasks/projects/finance.
- **NotificationsHub**: In-app notifications with preference toggles.
- **AdminHub**: System settings, branding, roles, workflows, audit logs, and user provisioning.
- **AIAssistant**: Chat overlay for Gemini-based creative support.

## 3. Data Model Reference (FireStore Collections)
> Refer to `types.ts` for type definitions. Below are the primary schemas and relationships.

### 3.1 Identity
- `users` (`User`): profile, RBAC role, department, status, avatar, hashed password surrogate (for forced change logic).
- `roles` (`RoleDefinition`): permission codes, admin flag, description. Seeded via `DEFAULT_ROLES`.

### 3.2 Client & Project
- `clients` (`Client`): contact info, status, account manager, contacts sub-array.
- `projects` (`Project`): client link, metadata, financials, status, manager IDs, timeline.
- `project_members` (`ProjectMember`): many-to-many between users/freelancers and projects.
- `project_milestones` (`ProjectMilestone`): timeline checkpoints with progress tracking and optional owners.
- `project_activity_logs` (`ProjectActivityLog`): audit trail covering status changes, milestones, file events.

### 3.3 Tasking & Workflow
- `tasks` (`Task`): assignments, approvals, timing, priority, workflow references.
- `approval_steps` (`ApprovalStep`): dynamic approval state per approver, level, status.
- `client_approvals` (`ClientApproval`): external sign-off state by client.
- `task_comments` (`TaskComment`), `task_time_logs` (`TaskTimeLog`), `task_dependencies` (`TaskDependency`), `task_activity_logs` (`TaskActivityLog`).
- `workflow_templates` (`WorkflowTemplate` with `WorkflowStepTemplate` sub-entries): pre-defined multi-step approval chains.

### 3.4 Files & Production Assets
- `files` (`AgencyFile`) and `folders` (`FileFolder`) for storage metadata.
- Production-specific collections: `shot_lists`, `call_sheets`, `agency_locations`, `agency_equipment`.

### 3.5 Finance & Vendors
- `invoices`, `quotations`, `payments`, `expenses` for revenue and spending.
- `vendors`, `freelancers`, `freelancer_assignments`, `vendor_service_orders` for external resources.

### 3.6 HR & Ops
- `leave_requests`, `attendance_records` for staff management.
- `notifications` (`Notification` + user preferences), `audit_logs` for compliance.
- `settings` singleton docs for branding (`AppBranding`) and general settings (`AppSettings`).

## 4. Role-Based Access Control (RBAC)
### 4.1 Permissions Model
- Permission codes enumerated in `constants.ts` (`PERMISSIONS_LIST`). Examples: `projects.view_all`, `tasks.edit_own`, `finance.manage`, `admin.view_console`.
- Roles map to permissions via `RoleDefinition.permissions`. `isAdmin` ensures full access.

### 4.2 Default Roles (Selected)
- **General Manager**: Full system access, admin console.
- **Account Manager**: Broad project/task control plus finance view.
- **Creative Director**: Creative oversight, approvals, production visibility.
- **Designer / Videographer**: Own project/task visibility and file uploads.
- **Freelancer**: Restricted to assigned tasks/files.

### 4.3 Enforcement Points
- `AuthContext.checkPermission(permissionCode)` centralizes checks; used by `Sidebar` to hide modules and by hubs to gate access (e.g., Finance, Admin, Production modules).
- Server-side enforcement depends on Firestore security rules (see `firestore.rules`). Ensure parity between UI checks and rules.
- New users invited via `AuthContext.inviteUser` default to `forcePasswordChange = true` for initial credential reset.

## 5. System Initialization
1. **Firebase Project Setup**
   - Create project, enable Authentication (email/password), Firestore (in production mode with rules), and optionally Storage.
   - Populate `.env` with Firebase config (`lib/firebase.ts`) and Gemini API key (`GEMINI_API_KEY` in `.env.local`).
2. **Install & Run**
   - `npm install`
   - `npm run dev`
3. **Seed Baseline Data** (optional but recommended)
   - Update Firebase config in `lib/firebase.ts`.
   - Temporarily invoke `seedDatabase()` from `utils/seedData.ts` (e.g., via CLI script or diagnostic route) to populate roles, projects, tasks, workflows, etc.
   - First authenticated signup becomes General Manager if `users` collection is empty.
4. **Deploy Considerations**
   - Swap mock upload URLs in file handlers with actual Firebase Storage integration.
   - Configure Firestore rules for multi-tenant isolation if hosting multiple agencies.
   - Set branding (`AdminHub`) and global settings (`AppSettings`).

## 6. User Journeys & Daily Operations
### 6.1 Administrators (General Manager)
- Manage system branding, settings, and RBAC in `AdminHub`.
- Invite staff, assign roles, and monitor audit logs.
- Oversee all hubs, handle escalations, and review analytics.

### 6.2 Account / Project Managers
- `ProjectsHub`: Create projects, assign teams, track milestones, review activity logs.
- `TasksHub`: Create tasks, configure workflows, monitor approvals, log dependencies.
- `ClientsHub`: Maintain client records, initiate quotes/invoices, manage approvals.
- `FinanceHub`: Monitor budgets, approve expenses (requires `finance.manage`).

### 6.3 Creative & Production Staff
- `TasksHub`: View assigned tasks, update statuses, log time, comment, and attach files.
- `FilesHub`: Manage project artifact versions.
- `ProductionHub`: Create shot lists, call sheets, manage equipment/location bookings.
- Use AI assistant for ideation (briefs, captions, schedules).

### 6.4 Finance Team
- `FinanceHub`: Issue invoices, track payments, log expenses, reconcile budgets.
- Coordinate with PMs on project spending updates.

### 6.5 HR / Operations
- `TeamHub`: Review leave requests, attendance, update user statuses.
- Ensure freelancers/vendors have correct permissions and contracts recorded.

### 6.6 Clients / Vendors (Limited Roles)
- With tailored roles (e.g., `Client`, `Freelancer`), access a narrowed view (assigned projects/tasks, deliverables). Requires dedicated UI restrictions + Firestore rules.

## 7. Workflow & Automation
- **Dynamic Approval Engine**: `TasksHub` auto-matches workflow templates by department/task type using `workflowTemplates`. Steps resolve approvers via project role, role definitions, or department head fallback.
- **Milestone Progress**: Task updates recompute milestone completion percentages.
- **Finance Automation**: Payments auto-adjust invoice balances and statuses; expenses increment project spend.
- **Notifications**: `handleNotify` writes to `notifications` collection and drives toast UX. Extend to email/push on future iterations.

## 8. AI Assistant Integration
- `generateCreativeContent(prompt, context)` wraps Gemini model `gemini-2.5-flash`.
- `AIAssistant` offers chat-style interactions, preloaded with agency context, for creative briefs, captions, logistics.
- Requires `GEMINI_API_KEY` environment variable. Add server-side proxying for secure key management in production.

## 9. Operational Guidelines
- **Data Integrity**: Ensure batched writes when cascading deletes (clients → projects → tasks → finance docs) to avoid partial state.
- **Realtime Listening**: `useFirestoreCollection` ensures live updates. For heavy datasets, add query constraints or pagination.
- **Audit Trails**: Use `addAuditLog` helper after sensitive operations (roles, settings, user updates).
- **Theming**: Dynamic CSS variables set from `AppBranding`. Extend to persist user-custom branding.
- **Security Rules**: Align Firestore rules with permission codes; deny reads/writes lacking explicit permission.

## 10. Improvement Recommendations
1. **Firestore Rules & Multi-Tenancy**: Harden rules to enforce per-project/per-role access, especially for external clients/vendors.
2. **Storage Integration**: Replace mock file URLs with Firebase Storage and signed download tokens.
3. **Error Handling & Toasts**: Centralize error states for Firestore writes and surface user-friendly feedback.
4. **Testing Strategy**: Introduce unit/integration tests (React Testing Library + Jest) for hubs and hooks.
5. **State Management**: Consider lightweight global state (Zustand, Redux Toolkit) for cross-hub data reuse, reducing prop drilling.
6. **Performance**: Implement lazy loading/code splitting for seldom-used hubs (Admin, Production) to improve initial load.
7. **Client Portal UX**: Develop a dedicated experience for clients with limited navigation and aggregated approvals.
8. **Analytics Enhancements**: Add saved filters, exports, and trend analysis across finance and production metrics.
9. **Automation Rules**: Extend workflow templates with conditional triggers (e.g., auto-assign reviewers, SLA reminders).
10. **Observability**: Add monitoring/logging (e.g., Sentry) for tracking runtime issues, especially around Firebase operations.

## 11. Launch Checklist for New Deployments
- [ ] Configure Firebase project and environment variables.
- [ ] Seed roles and baseline data (or prepare admin-only bootstrap workflow).
- [ ] Review and apply Firestore/Storage security rules.
- [ ] Customize branding and settings in AdminHub.
- [ ] Validate RBAC by testing each major role.
- [ ] Ensure AI assistant key is active and review usage quotas.
- [ ] Document escalation paths and support contact within AdminHub/README.

## 12. Glossary
- **Hub**: A modular page handling a domain slice (Projects, Tasks, etc.).
- **Workflow Template**: A reusable approval path matched to department/task type.
- **Milestone**: Project checkpoint with progress computation.
- **Assignment**: Freelancer-to-project/task association with rate details.
- **Notification Preference**: User-level toggle for in-app/email alerts (currently mocked in state).

---
For further exploration, review:
- `App.tsx` — orchestration, handlers, and module wiring.
- `contexts/AuthContext.tsx` — authentication lifecycle and RBAC checks.
- `types.ts` — authoritative domain schema definitions.
- `utils/seedData.ts` — seeding strategy and baseline data.
- `services/geminiService.ts` — AI assistant integration details.
