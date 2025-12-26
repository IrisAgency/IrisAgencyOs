# Permission Coverage Map - IRIS Agency OS

This document maps every UI action and API endpoint to its required permission key. Use this for testing and auditing the permission system.

## Permission System Overview

### 3-Layer Enforcement

1. **UI Layer**: Hide/disable buttons, tabs, and features based on permissions
2. **API Layer**: Reject unauthorized calls with 403 (server-side enforcement)
3. **Data Scope**: Filter data based on scope (own, dept, project, all)

### Permission Format

`module.action.scope`

- **module**: Feature area (tasks, clients, projects, etc.)
- **action**: What you're doing (view, create, edit, delete, etc.)
- **scope**: Who/what you can affect (own, dept, project, all)

### Scope Hierarchy

Higher scopes automatically grant lower scope permissions:
- `all` includes `dept`, `project`, and `own`
- `dept` includes `own`
- `project` includes `own`

---

## Module: Dashboard

| UI Action | Permission Key | Component | Notes |
|-----------|---------------|-----------|-------|
| View dashboard | `auth.login` | Dashboard | All logged-in users |
| View task stats | `tasks.view.*` | Dashboard | Any task view permission |
| View project stats | `projects.view.*` | Dashboard | Any project view permission |
| View calendar | `tasks.view.*` | DashboardTimeline | See assigned tasks |
| Create quick task | `tasks.create` | Dashboard | Quick action button |

---

## Module: Clients

### Main Actions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View clients list | `clients.view.own \| clients.view.dept \| clients.view.all` | ClientsHub | Filtered by scope |
| Create client | `clients.create` | ClientsHub | "Add Client" button |
| Edit client | `clients.edit` | ClientsHub | Edit button in detail view |
| Archive client | `clients.archive` | ClientsHub | Archive button |
| Delete client | `clients.delete` | ClientsHub | Delete button (GM only) |

### Client Notes

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View notes | `client.notes.view` | ClientsHub | Notes tab |
| Create note | `client.notes.create` | ClientsHub | "Add Note" button |
| Edit note | `client.notes.edit` | ClientsHub | Edit button on note |
| Delete note | `client.notes.delete` | ClientsHub | Delete button on note |

### Client Meetings

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View meetings | `client.meetings.view` | ClientMeetings | Meetings tab |
| Create meeting | `client.meetings.create` | ClientMeetings | "Schedule Meeting" button |
| Edit meeting | `client.meetings.edit` | ClientMeetings | Edit button |
| Delete meeting | `client.meetings.delete` | ClientMeetings | Delete button |

### Brand Assets

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View brand assets | `client.brand_assets.view` | ClientBrandAssets | Brand tab |
| Upload asset | `client.brand_assets.manage` | ClientBrandAssets | Upload button |
| Edit asset | `client.brand_assets.manage` | ClientBrandAssets | Edit/delete buttons |

### Marketing Strategies

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View strategies | `client.marketing_strategies.view` | ClientMarketingStrategies | Marketing tab |
| Edit strategies | `client.marketing_strategies.manage` | ClientMarketingStrategies | Edit button |

---

## Module: Projects

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View projects list | `projects.view.own \| projects.view.dept \| projects.view.all` | ProjectsHub | Filtered by scope |
| View project detail | Same as above | ProjectsHub | Access to detail view |
| Create project | `projects.create` | ProjectsHub | "New Project" button |
| Edit project | `projects.edit` | ProjectsHub | Edit button |
| Archive project | `projects.archive` | ProjectsHub | Archive button |
| Delete project | `projects.delete` | ProjectsHub | Delete button (GM only) |
| View milestones | `milestones.view` | ProjectsHub | Milestones tab |
| Create milestone | `milestones.create` | ProjectsHub | "Add Milestone" button |
| Edit milestone | `milestones.edit` | ProjectsHub | Edit milestone |
| Delete milestone | `milestones.delete` | ProjectsHub | Delete milestone |

---

## Module: Tasks

### View Permissions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View own tasks | `tasks.view.own` | TasksHub | Tasks assigned to user |
| View dept tasks | `tasks.view.dept` | TasksHub | Department tasks |
| View project tasks | `tasks.view.project` | TasksHub | Tasks in user's projects |
| View all tasks | `tasks.view.all` | TasksHub | All tasks |

### Edit Permissions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| Edit own tasks | `tasks.edit.own` | TasksHub | Own task assigneeId check |
| Edit dept tasks | `tasks.edit.dept` | TasksHub | Department check |
| Edit all tasks | `tasks.edit.all` | TasksHub | Full edit access |

### Workflow Actions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| Create task | `tasks.create` | TasksHub | "New Task" button |
| Assign task (dept) | `tasks.assign.dept` | TasksHub | Assign dropdown |
| Assign task (all) | `tasks.assign.all` | TasksHub | Assign to anyone |
| Reassign task | `tasks.reassign.dept \| tasks.reassign.all` | TasksHub | Change assignee |
| Advance task | `tasks.advance` | TasksHub | Move to next stage |
| Submit for review | `tasks.submit_for_review` | TasksHub | Submit button |
| Request revision | `tasks.request_revision` | TasksHub | Revision button |
| Approve task | `tasks.approve` | TasksHub | Approve button |
| Reject task | `tasks.reject` | TasksHub | Reject button |
| Archive task | `tasks.archive` | TasksHub | Archive button |
| Delete task | `tasks.delete` | TasksHub | Delete button (GM only) |

### Task Files

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View task files | `task_files.view` | TasksHub | Files tab |
| Upload file | `task_files.upload` | TasksHub | Upload button |
| Delete file | `task_files.delete` | TasksHub | Delete file button |

---

## Module: Approvals

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View own approvals | `approvals.view.own` | Dashboard/TasksHub | Items needing user's approval |
| View dept approvals | `approvals.view.dept` | Dashboard | Department approvals |
| View all approvals | `approvals.view.all` | Dashboard | All approval requests |
| Act on approval | `approvals.act` | TasksHub | Approve/reject/request revision |
| Configure workflow | `approvals.configure` | AdminHub | Workflow builder |

---

## Module: Posting & Social

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View dept posts | `posting.view.dept` | PostingHub | Department posts |
| View all posts | `posting.view.all` | PostingHub | All posts |
| Create post | `posting.create` | PostingHub | "Create Post" button |
| Edit post | `posting.edit` | PostingHub | Edit button |
| Assign post | `posting.assign` | PostingHub | Assign dropdown |
| Submit for review | `posting.submit_for_review` | PostingHub | Submit button |
| Request revision | `posting.request_revision` | PostingHub | Revision button |
| Approve post | `posting.approve` | PostingHub | Approve button |
| Schedule post | `posting.schedule` | PostingHub | Schedule picker |
| Mark published | `posting.mark_published` | PostingHub | Publish button |
| Archive post | `posting.archive` | PostingHub | Archive button |
| Delete post | `posting.delete` | PostingHub | Delete button (GM only) |

---

## Module: Files & Assets

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View dept assets | `assets.view.dept` | FilesHub | Department files |
| View all assets | `assets.view.all` | FilesHub | All files |
| Upload asset | `assets.upload` | FilesHub | Upload button |
| Edit metadata | `assets.edit_metadata` | FilesHub | Edit file info |
| Delete asset | `assets.delete` | FilesHub | Delete button |
| Link to task | `assets.link_to_task` | FilesHub | Link button |
| Archive asset | `assets.archive` | FilesHub | Archive button |

---

## Module: Production

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View production | `production.view` | ProductionHub | Production tab |
| Create job | `production.create` | ProductionHub | "New Job" button |
| Edit job | `production.edit` | ProductionHub | Edit button |
| Assign crew | `production.assign_crew` | ProductionHub | Assign dropdown |
| Schedule shoot | `production.schedule` | ProductionHub | Calendar picker |
| Close job | `production.close_job` | ProductionHub | Complete button |
| Delete job | `production.delete` | ProductionHub | Delete button (GM only) |

---

## Module: Vendors & Freelancers

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View vendors | `vendors.view` | VendorsHub | Vendors tab |
| Create vendor | `vendors.create` | VendorsHub | "Add Vendor" button |
| Edit vendor | `vendors.edit` | VendorsHub | Edit button |
| Delete vendor | `vendors.delete` | VendorsHub | Delete button |
| Assign to project | `vendors.assign_to_project` | VendorsHub | Assign dropdown |

---

## Module: Finance

### View Permissions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View own finance | `finance.view.own` | FinanceHub | User's invoices only |
| View project finance | `finance.view.project` | FinanceHub | Project member check |
| View all finance | `finance.view.all` | FinanceHub | Full access |

### Actions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| Create invoice | `finance.create_invoice` | FinanceHub | "New Invoice" button |
| Edit invoice | `finance.edit_invoice` | FinanceHub | Edit button |
| Delete invoice | `finance.delete_invoice` | FinanceHub | Delete button |
| Record payment | `finance.record_payment` | FinanceHub | Payment button |
| Approve payment | `finance.approve_payment` | FinanceHub | Approve button |
| Export data | `finance.export` | FinanceHub | Export button |
| Manage budgets | `finance.manage_budgets` | FinanceHub | Budget editor |

---

## Module: Analytics & Reports

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View dept reports | `reports.view.dept` | AnalyticsHub | Department analytics |
| View all reports | `reports.view.all` | AnalyticsHub | All analytics |
| Export reports | `reports.export` | AnalyticsHub | Export button |
| View dept analytics | `analytics.view.dept` | AnalyticsHub | Department charts |
| View all analytics | `analytics.view.all` | AnalyticsHub | All charts |

---

## Module: Team & HR

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View team | `users.view.all` | TeamHub | Team directory |
| View user details | `users.view.all` | TeamHub | User profile |
| Create user | `users.create` | TeamHub | Invite button |
| Edit user | `users.edit` | TeamHub | Edit button |
| Disable user | `users.disable` | TeamHub | Disable button |
| Force password reset | `users.force_password_reset` | TeamHub | Reset button |

---

## Module: Admin

### Roles & Permissions

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View roles | `roles.view` | AdminHub | Roles tab |
| Create role | `roles.create` | AdminHub | "New Role" button |
| Edit role | `roles.edit` | AdminHub | Edit button |
| Delete role | `roles.delete` | AdminHub | Delete button |
| Assign role | `roles.assign` | AdminHub | Assign dropdown |
| View permissions | `permissions.view` | AdminHub | Permissions matrix |
| Manage permissions | `permissions.manage` | AdminHub | Edit permissions |

### Branding

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View branding | `admin.branding.view` | AdminHub | Branding tab |
| Edit branding | `admin.branding.edit` | AdminHub | Edit button |
| Upload assets | `admin.branding.upload_assets` | AdminHub | Upload button |

### Settings

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View settings | `admin.settings.view` | AdminHub | Settings tab |
| Edit settings | `admin.settings.edit` | AdminHub | Save button |

---

## Module: Notifications

| UI Action | Permission Key | Component | Context |
|-----------|---------------|-----------|---------|
| View notifications | `notifications.view` | Header | Bell icon |
| Manage notification rules | `notifications.manage` | NotificationsHub | Admin notification settings |

---

## Testing Checklist

### Test Roles

#### 1. Designer (Restricted)
**Permissions**: Own tasks only, view clients, upload files

Test:
- [ ] Can see Dashboard with own tasks
- [ ] Can view own tasks only (not others)
- [ ] Can edit own tasks
- [ ] Cannot create tasks
- [ ] Cannot assign tasks
- [ ] Can view client brand assets
- [ ] Can upload task files
- [ ] Cannot view Finance module
- [ ] Cannot view Team module
- [ ] Cannot access Admin

#### 2. Videographer (Production Focus)
**Permissions**: Own tasks, production view/edit

Test:
- [ ] Can see Dashboard with own tasks
- [ ] Can view own tasks
- [ ] Can view Production Hub
- [ ] Can edit production jobs
- [ ] Cannot view all tasks
- [ ] Cannot create projects
- [ ] Cannot view Finance
- [ ] Cannot access Admin

#### 3. Social Manager (Department Access)
**Permissions**: Dept posts, view dept tasks, full posting control

Test:
- [ ] Can see Posting Hub
- [ ] Can create/edit posts
- [ ] Can schedule posts
- [ ] Can view department tasks
- [ ] Can view department clients
- [ ] Cannot edit other dept tasks
- [ ] Cannot view Finance
- [ ] Cannot access Admin

#### 4. Project Manager (Management Level)
**Permissions**: Assign tasks, configure approvals, view all projects

Test:
- [ ] Can view all projects
- [ ] Can create projects
- [ ] Can assign tasks within dept
- [ ] Can approve tasks
- [ ] Can configure workflows
- [ ] Can view all clients
- [ ] Can view finance data
- [ ] Cannot delete projects
- [ ] Cannot access system settings

#### 5. Finance Manager (Finance Focus)
**Permissions**: Full finance access, view-only for projects/clients

Test:
- [ ] Can view Finance Hub
- [ ] Can create invoices
- [ ] Can record payments
- [ ] Can approve payments
- [ ] Can manage budgets
- [ ] Can export reports
- [ ] Can view all clients (read-only)
- [ ] Can view all projects (read-only)
- [ ] Cannot edit tasks
- [ ] Cannot access Admin (except reports)

#### 6. General Manager (Full Access)
**Permissions**: Everything

Test:
- [ ] Can access all modules
- [ ] Can view all data
- [ ] Can edit all data
- [ ] Can delete items
- [ ] Can access Admin Hub
- [ ] Can manage roles
- [ ] Can edit branding
- [ ] Can edit system settings
- [ ] Can manage users
- [ ] Can force password resets

---

## API Enforcement Checklist

**IMPORTANT**: For each permission check in the UI, there MUST be a corresponding check in the API/backend.

### Firebase Security Rules Template

```javascript
match /tasks/{taskId} {
  allow read: if request.auth != null && (
    // Own tasks
    (hasPermission('tasks.view.own') && resource.data.assignedTo == request.auth.uid) ||
    // Dept tasks
    (hasPermission('tasks.view.dept') && resource.data.department == getUserDept()) ||
    // All tasks
    hasPermission('tasks.view.all')
  );
  
  allow update: if request.auth != null && (
    (hasPermission('tasks.edit.own') && resource.data.assignedTo == request.auth.uid) ||
    (hasPermission('tasks.edit.dept') && resource.data.department == getUserDept()) ||
    hasPermission('tasks.edit.all')
  );
  
  allow create: if request.auth != null && hasPermission('tasks.create');
  
  allow delete: if request.auth != null && hasPermission('tasks.delete');
}
```

### Next Steps for API Security

1. Update `firestore.rules` with permission-based security rules
2. Add permission checks to Firebase Cloud Functions (if any)
3. Add permission checks to any custom API endpoints
4. Test API enforcement by making requests with different user roles
5. Verify 403 errors are returned for unauthorized requests

---

## Audit Process

1. **UI Audit**: For each Hub component, verify all buttons/actions have `<PermissionGate>` wrappers
2. **API Audit**: For each Firestore collection, verify security rules check permissions
3. **Testing**: Log in as each test role and verify access matches expectations
4. **Penetration Testing**: Try to access restricted URLs directly, verify redirects/403s
5. **Manual Testing**: Inspect browser DevTools to ensure restricted data isn't loaded

---

## Permission Debugging

### Common Issues

**Problem**: User has permission but can't see feature
- Check: Is `userPermissions` array loaded in AuthContext?
- Check: Is permission key exact match (case-sensitive)?
- Check: Is scope context being passed correctly?

**Problem**: User can see UI but API rejects
- Check: Firestore rules match UI permission checks
- Check: API receives auth token correctly
- Check: Permission key spelling matches between UI and API

**Problem**: Scope not working (user sees all when should see own)
- Check: Context object passed to `can()` function
- Check: Resource has `department`, `assigneeId`, or `projectMembers` field
- Check: Higher scope permission not overriding (e.g., `view.all` grants `view.own`)

### Debug Helpers

```tsx
// Add to any component to debug permissions
const { userPermissions } = useAuth();
console.log('User Permissions:', userPermissions);
console.log('Has tasks.view.all?', userPermissions.includes('tasks.view.all'));
```

---

**Last Updated**: December 2025
**Version**: 1.0
**Maintained By**: Development Team
