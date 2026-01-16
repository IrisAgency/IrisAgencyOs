# IRIS Agency OS - Permissions Catalogue

**Version:** 1.0  
**Last Updated:** January 16, 2026  
**System:** IRIS Agency Operating System

---

## Table of Contents

1. [Overview](#overview)
2. [Permission Scopes](#permission-scopes)
3. [Authentication & Users](#authentication--users)
4. [Clients Module](#clients-module)
5. [Projects Module](#projects-module)
6. [Tasks & Workflow](#tasks--workflow)
7. [Approvals](#approvals)
8. [Calendar](#calendar)
9. [Production Hub](#production-hub)
10. [Posting & Social](#posting--social)
11. [Files & Assets](#files--assets)
12. [Finance](#finance)
13. [Analytics & Reports](#analytics--reports)
14. [Admin & System](#admin--system)
15. [Permission Matrix by Role](#permission-matrix-by-role)

---

## Overview

The IRIS Agency OS uses a comprehensive permission system to control access to features and data. Permissions follow a hierarchical scope-based model where higher-level permissions automatically grant lower-level access.

### Permission Format

```
module.action.scope
```

- **module**: Feature area (tasks, clients, projects, etc.)
- **action**: Operation (view, create, edit, delete, etc.)
- **scope**: Access level (own, dept, project, all)

### Permission Hierarchy

```
ALL > DEPT/PROJECT > OWN
```

Users with `all` scope can perform actions on all resources. Users with `dept` scope can access department resources and their own. Users with `own` scope can only access their assigned resources.

---

## Permission Scopes

### OWN (Own)
- Access only to resources assigned to or owned by the user
- Applies when user is the creator, assignee, or owner

### DEPT (Department)
- Access to resources within the user's department
- Includes own resources
- Useful for department heads and team leads

### PROJECT (Project)
- Access to resources within projects the user is assigned to
- Includes own resources
- Useful for cross-department project collaboration

### ALL (All/Global)
- Full access to all resources regardless of assignment
- Typically for managers and administrators

---

## Authentication & Users

### auth.login
**Permission Code:** `auth.login`

#### Screens & Effects:
- **Login Screen**: Allows user to access the login form and authenticate
- **App Access**: Required to use any part of the system

#### Visible Elements:
- Login form
- Password reset option
- Remember me checkbox

---

### users.view.all
**Permission Code:** `users.view.all`

#### Screens & Effects:
- **Sidebar Navigation**: Shows "Team" menu item
- **Team Hub**: Access to full team directory
- **User Selection Dropdowns**: Shows all users in assignment selectors throughout the app

#### Visible Elements:
- Team navigation item in sidebar
- Complete user list in Team Hub
- All users in task assignment, project member selection, approval workflow builders

---

### users.create
**Permission Code:** `users.create`

#### Screens & Effects:
- **Team Hub**: Shows "+ New User" button
- **User Creation Dialog**: Access to create new user accounts

#### Dialog Fields:
- Name, email, password
- Role selection
- Department assignment
- Avatar upload

---

### users.edit
**Permission Code:** `users.edit`

#### Screens & Effects:
- **Team Hub**: Shows edit icon on user cards
- **User Edit Dialog**: Modify user details

#### Editable Fields:
- Name, email, role, department
- Active/inactive status
- Avatar

---

### users.disable
**Permission Code:** `users.disable`

#### Screens & Effects:
- **Team Hub**: Shows disable/enable toggle
- **User Card Context Menu**: Disable user option

#### Effects:
- Disables user login
- Hides user from active assignments
- Preserves user history

---

### users.force_password_reset
**Permission Code:** `users.force_password_reset`

#### Screens & Effects:
- **Team Hub**: Shows "Force Password Reset" option in user context menu
- **User Edit Dialog**: Password reset checkbox

#### Effects:
- Forces user to change password on next login
- Sends password reset notification

---

## Clients Module

### clients.view.own
**Permission Code:** `clients.view.own`

#### Screens & Effects:
- **Sidebar Navigation**: Shows "Clients" menu item
- **Clients Hub**: Access to list view with filtered clients
- **Dashboard**: Client Status widget shows assigned clients only

#### Visible Clients:
- Clients where user is the account manager
- Clients user created
- Clients assigned to user's projects

---

### clients.view.dept
**Permission Code:** `clients.view.dept`

#### Screens & Effects:
- **Clients Hub**: Shows all clients within user's department
- **Dashboard**: Department-level client metrics

#### Visible Clients:
- All clients managed by department members
- Includes own clients

---

### clients.view.all
**Permission Code:** `clients.view.all`

#### Screens & Effects:
- **Clients Hub**: Full access to all clients
- **Dashboard**: Organization-wide client metrics
- **Reports**: All client data visible in analytics

#### Visible Clients:
- Every client in the system

---

### clients.create
**Permission Code:** `clients.create`

#### Screens & Effects:
- **Clients Hub**: Shows "+ New Client" button in header
- **Client Creation Dialog**: Access to create new clients

#### Dialog Steps:
1. **Basic Info Tab**
   - Client name (required)
   - Industry dropdown
   - Logo upload
   - Status (Active/Inactive)

2. **Contact Tab**
   - Email, phone, address
   - Website URL
   - Account manager assignment

3. **Notes Tab**
   - Initial client notes
   - Tags

#### Effects:
- Creates new client record
- Auto-assigns creator as account manager (if applicable)
- Generates client folder structure

---

### clients.edit
**Permission Code:** `clients.edit`

#### Screens & Effects:
- **Client Detail View**: Shows edit button in header
- **Client Cards**: Edit icon visible
- **Context Menu**: Edit option available

#### Editable Fields:
- All client information fields
- Logo and branding assets
- Account manager reassignment
- Status changes

---

### clients.archive
**Permission Code:** `clients.archive`

#### Screens & Effects:
- **Client Detail View**: Shows "Archive" button
- **Client List**: Archive option in context menu

#### Effects:
- Moves client to archived state
- Hides from active client lists
- Preserves all client data and history
- Related projects remain accessible

---

### clients.delete
**Permission Code:** `clients.delete`

#### Screens & Effects:
- **Client Detail View**: Shows "Delete" button (danger zone)
- **Context Menu**: Delete option (red text)

#### Dialog:
- Confirmation dialog with warning
- "Type client name to confirm" safety check
- Warning about cascading deletions

#### Effects:
- **PERMANENT**: Deletes client and all related data
- Deletes all client projects
- Deletes all client notes, meetings, brand assets
- Cannot be undone

---

### client.notes.view
**Permission Code:** `client.notes.view`

#### Screens & Effects:
- **Client Detail View**: "Notes" tab visible
- **Notes List**: Can see all client notes

#### Visible Elements:
- Note content
- Author and timestamp
- Attachments

---

### client.notes.create
**Permission Code:** `client.notes.create`

#### Screens & Effects:
- **Client Notes Tab**: Shows "+ Add Note" button
- **Note Creation Form**: Access to create notes

#### Form Fields:
- Note title
- Rich text content
- Tags
- Attachments

---

### client.notes.edit
**Permission Code:** `client.notes.edit`

#### Screens & Effects:
- **Note Cards**: Edit icon visible
- **Note Edit Dialog**: Modify existing notes

---

### client.notes.delete
**Permission Code:** `client.notes.delete`

#### Screens & Effects:
- **Note Cards**: Delete icon visible
- **Context Menu**: Delete option

---

### client.meetings.view
**Permission Code:** `client.meetings.view`

#### Screens & Effects:
- **Client Detail View**: "Meetings" tab visible
- **Meetings List**: Can see scheduled meetings

#### Visible Information:
- Meeting title, date, time
- Attendees
- Agenda
- Meeting notes

---

### client.meetings.create
**Permission Code:** `client.meetings.create`

#### Screens & Effects:
- **Client Meetings Tab**: Shows "+ Schedule Meeting" button
- **Meeting Creation Dialog**: Access to schedule meetings

#### Dialog Fields:
- Meeting title
- Date and time picker
- Duration
- Location/meeting link
- Attendees (multi-select)
- Agenda
- Attach files

---

### client.meetings.edit
**Permission Code:** `client.meetings.edit`

#### Screens & Effects:
- **Meeting Cards**: Edit option in context menu
- **Meeting Edit Dialog**: Modify meeting details

---

### client.meetings.delete
**Permission Code:** `client.meetings.delete`

#### Screens & Effects:
- **Meeting Cards**: Delete option in context menu
- **Confirmation Dialog**: Confirm deletion

---

### client.brand_assets.view
**Permission Code:** `client.brand_assets.view`

#### Screens & Effects:
- **Client Detail View**: "Brand Assets" tab visible
- **Brand Assets Gallery**: View logos, colors, fonts, guidelines

#### Visible Elements:
- Logo variations
- Color palette
- Typography guide
- Brand guidelines PDF
- Asset download buttons

---

### client.brand_assets.manage
**Permission Code:** `client.brand_assets.manage`

#### Screens & Effects:
- **Brand Assets Tab**: Shows "+ Upload Asset" button
- **Asset Management**: Edit, delete, organize assets

#### Management Actions:
- Upload new brand assets
- Update existing assets
- Set primary logo
- Define color palette
- Add typography
- Upload brand guidelines
- Delete assets

---

### client.marketing_strategies.view
**Permission Code:** `client.marketing_strategies.view`

#### Screens & Effects:
- **Client Detail View**: "Strategies" tab visible
- **Strategies List**: View marketing plans and strategies

#### Visible Information:
- Strategy name and description
- Goals and objectives
- Target audience
- Key messages
- Timeline

---

### client.marketing_strategies.manage
**Permission Code:** `client.marketing_strategies.manage`

#### Screens & Effects:
- **Strategies Tab**: Shows "+ New Strategy" button
- **Strategy Editor**: Create and edit strategies

#### Editor Features:
- Strategy builder
- Goal setting
- Audience definition
- Message crafting
- Timeline planning
- Budget allocation

---

## Projects Module

### projects.view.own
**Permission Code:** `projects.view.own`

#### Screens & Effects:
- **Sidebar Navigation**: Shows "Projects" menu item
- **Projects Hub**: Shows projects where user is a member or creator
- **Dashboard**: Project widgets show assigned projects only

#### Visible Projects:
- Projects user created
- Projects where user is account manager
- Projects where user is a team member

---

### projects.view.dept
**Permission Code:** `projects.view.dept`

#### Screens & Effects:
- **Projects Hub**: Shows all projects within user's department
- **Dashboard**: Department project metrics

#### Visible Projects:
- All department projects
- Includes own projects

---

### projects.view.all
**Permission Code:** `projects.view.all`

#### Screens & Effects:
- **Projects Hub**: Full access to all projects
- **Dashboard**: Organization-wide project metrics
- **Reports**: Complete project visibility

#### Visible Projects:
- Every project in the system

---

### projects.create
**Permission Code:** `projects.create`

#### Screens & Effects:
- **Projects Hub**: Shows "+ New Project" button in header
- **Project Creation Dialog**: Access to create projects

#### Dialog Steps:
1. **Basic Information**
   - Project name (required)
   - Client selection (required)
   - Project type (Campaign, Retainer, One-time, Internal)
   - Start and end dates
   - Budget

2. **Smart Project Setup** (if calendar.view or calendar.manage)
   - Calendar month selector
   - Content type counts (Video, Photo, Motion)
   - Team member selection
   - Workflow assignment per content type

3. **Team Members**
   - Search and select team members
   - Role assignment within project

4. **Project Brief**
   - Summary
   - Objectives
   - Notes

#### Effects:
- Creates project record
- Auto-assigns creator as project member
- Generates project folder structure
- Creates project members records
- Optionally generates tasks from calendar items

---

### projects.edit.own
**Permission Code:** `projects.edit.own`

#### Screens & Effects:
- **Project Detail View**: Edit button visible for own projects
- **Project Cards**: Edit option in context menu for own projects

#### Editable Fields:
- Project details (name, dates, budget)
- Status updates
- Brief and objectives

---

### projects.edit.dept
**Permission Code:** `projects.edit.dept`

#### Screens & Effects:
- **Project Detail View**: Edit button visible for department projects
- Full edit access to department projects

---

### projects.edit.all / projects.edit
**Permission Code:** `projects.edit.all` or `projects.edit`

#### Screens & Effects:
- **Project Detail View**: Edit button visible on all projects
- **Project Settings**: Full access to modify any project

#### Editable Fields:
- All project information
- Team member management
- Milestone editing
- Budget modifications
- Status changes

---

### projects.archive
**Permission Code:** `projects.archive`

#### Screens & Effects:
- **Project Detail View**: "Archive Project" button in settings
- **Project Context Menu**: Archive option

#### Dialog:
- Confirmation dialog
- Option to archive related tasks

#### Effects:
- Moves project to archived state
- Hides from active project lists
- Tasks remain accessible
- Can be restored later

---

### projects.delete
**Permission Code:** `projects.delete`

#### Screens & Effects:
- **Project Detail View**: "Delete Project" button (danger zone)
- **Context Menu**: Delete option (red text)

#### Dialog:
- Confirmation with project name verification
- Warning about cascading effects

#### Effects:
- **PERMANENT**: Deletes project and related data
- Deletes project tasks (optional)
- Deletes milestones
- Deletes project files (optional)

---

### milestones.view
**Permission Code:** `milestones.view`

#### Screens & Effects:
- **Project Detail View**: "Milestones" tab visible
- **Milestone Timeline**: Visual milestone display

---

### milestones.create
**Permission Code:** `milestones.create`

#### Screens & Effects:
- **Milestones Tab**: Shows "+ Add Milestone" button
- **Milestone Creation Form**: Create new milestones

#### Form Fields:
- Milestone name
- Due date
- Description
- Dependencies

---

### milestones.edit
**Permission Code:** `milestones.edit`

#### Screens & Effects:
- **Milestone Cards**: Edit icon visible
- **Milestone Editor**: Modify milestone details

---

### milestones.delete
**Permission Code:** `milestones.delete`

#### Screens & Effects:
- **Milestone Cards**: Delete icon visible
- **Context Menu**: Delete option

---

## Tasks & Workflow

### tasks.view.own
**Permission Code:** `tasks.view.own`

#### Screens & Effects:
- **Sidebar Navigation**: Shows "Tasks" menu item
- **Tasks Hub**: Shows tasks assigned to user
- **Dashboard**: "My Tasks" widget shows personal tasks

#### Visible Tasks:
- Tasks where user is assignee
- Tasks user created

#### Task Board Views:
- All status columns visible
- Filtered to show only own tasks
- "My Tasks" quick filter

---

### tasks.view.project
**Permission Code:** `tasks.view.project`

#### Screens & Effects:
- **Tasks Hub**: Shows tasks from projects user is member of
- **Project Detail View**: Task list visible

#### Visible Tasks:
- All tasks within assigned projects
- Includes own tasks

---

### tasks.view.dept
**Permission Code:** `tasks.view.dept`

#### Screens & Effects:
- **Tasks Hub**: Shows all department tasks
- **Team Progress Widget**: Department task metrics

#### Visible Tasks:
- All tasks assigned to department members
- Includes own tasks

---

### tasks.view.all
**Permission Code:** `tasks.view.all`

#### Screens & Effects:
- **Tasks Hub**: Shows all tasks in the system
- **Dashboard**: Organization-wide task metrics
- **Reports**: Complete task visibility

#### Visible Tasks:
- Every task in the system

#### Additional Views:
- Cross-department filtering
- Complete task search

---

### tasks.create
**Permission Code:** `tasks.create`

#### Screens & Effects:
- **Tasks Hub**: Shows "+ New Task" button
- **Project Detail View**: "Add Task" button visible
- **Task Creation Dialog**: Full access to create tasks

#### Dialog Tabs:

1. **Details Tab**
   - Task title (required)
   - Description (rich text)
   - Client selection
   - Project selection (auto-filtered by client)
   - Task type (Design, Video, Photo, Motion, Copywriting, etc.)
   - Priority (Low, Medium, High, Urgent)
   - Department
   - Start and due dates

2. **Assignees Tab** (if has assign permissions)
   - Multi-select user assignment
   - Workload indicator per user

3. **Workflow Tab**
   - Workflow template selection
   - Auto-assigns based on task type/department
   - Preview approval steps

4. **Dependencies Tab**
   - Link to blocking tasks
   - Set task relationships

#### Effects:
- Creates task record
- Auto-assigns creator if no assignees
- Generates approval steps if workflow assigned
- Links to project and client
- Creates initial activity log

---

### tasks.edit.own
**Permission Code:** `tasks.edit.own`

#### Screens & Effects:
- **Task Detail View**: Edit button visible for own tasks
- **Task Cards**: Edit icon visible on own tasks

#### Editable Fields:
- Description and notes
- Dates (if not locked)
- Status progression
- Time logs

#### Restrictions:
- Cannot change assignees
- Cannot change project/client (if edit.all not granted)
- Cannot modify completed tasks (unless edit_completed)

---

### tasks.edit.dept
**Permission Code:** `tasks.edit.dept`

#### Screens & Effects:
- **Task Detail View**: Edit access for department tasks
- Full modification rights for department tasks

#### Editable Fields:
- All task details
- Assignee management (with assign.dept)
- Status and workflow

---

### tasks.edit.all
**Permission Code:** `tasks.edit.all`

#### Screens & Effects:
- **Task Detail View**: Full edit access on all tasks
- **Create Task Dialog**: Can modify project/client when editing

#### Editable Fields:
- All task fields
- Project and client reassignment
- Assignee management
- Workflow override
- Status override

---

### tasks.delete
**Permission Code:** `tasks.delete`

#### Screens & Effects:
- **Task Detail View**: "Delete Task" button in danger zone
- **Task Context Menu**: Delete option (red)

#### Dialog:
- Confirmation prompt
- Option to keep or delete related data (comments, time logs)

#### Effects:
- Soft delete (marks as deleted, preserves data)
- Removes from active views
- Preserves in archive for reporting

---

### tasks.assign.dept
**Permission Code:** `tasks.assign.dept`

#### Screens & Effects:
- **Create Task Dialog**: Assignees tab visible
- **Task Detail View**: "Manage Assignees" button visible for dept tasks
- **Assignee Selector**: Shows department members

#### Actions:
- Add/remove assignees from department
- Bulk assignment
- Reassignment

---

### tasks.assign.all
**Permission Code:** `tasks.assign.all`

#### Screens & Effects:
- **Assignee Selector**: Shows all users across departments
- **Bulk Actions**: Assign to any user

#### Actions:
- Cross-department assignment
- Mass task reassignment

---

### tasks.manage_assignees
**Permission Code:** `tasks.manage_assignees`

#### Screens & Effects:
- **Task Detail View**: Full assignee management panel
- **Assignee Section**: Add/remove buttons visible

#### Actions:
- Add multiple assignees
- Remove assignees
- Change primary assignee
- See assignee workload

---

### tasks.advance
**Permission Code:** `tasks.advance`

#### Screens & Effects:
- **Task Detail View**: Status progression buttons visible
- **Quick Actions**: Advance status option in task card menu

#### Available Actions:
- Move from NEW → ASSIGNED
- Move from ASSIGNED → IN_PROGRESS
- Submit for review (AWAITING_REVIEW)
- Mark complete

---

### tasks.submit_for_review
**Permission Code:** `tasks.submit_for_review`

#### Screens & Effects:
- **Task Detail View**: "Submit for Review" button visible when IN_PROGRESS
- **Workflow Tab**: Submit action available

#### Dialog (if workflow exists):
- Review submission confirmation
- Optional submission notes
- File attachment reminder

#### Effects:
- Changes status to AWAITING_REVIEW
- Generates approval steps (if first submission)
- Activates first approval step
- Notifies first approver
- Creates activity log

---

### tasks.request_revision
**Permission Code:** `tasks.request_revision`

#### Screens & Effects:
- **Task Detail View - Approvals Tab**: "Request Revisions" button visible
- **Approval Step**: Revision option for current approver

#### Dialog:
- Revision reason (required)
- Assign to (dropdown - previous assignees + original assignees)
- Detailed feedback textarea
- Attach reference files

#### Effects:
- Changes status to REVISIONS_REQUIRED
- Creates revision context with cycle tracking
- Updates approval step to 'revision_requested'
- Reassigns to selected user
- Notifies assignee
- Adds to revision history

---

### tasks.approve
**Permission Code:** `tasks.approve`

#### Screens & Effects:
- **Task Detail View - Approvals Tab**: "Approve" button visible for pending approvals
- **Task Board**: Approval badge on tasks needing approval

#### Button Visibility:
- Shown when:
  - User has pending approval step
  - Task status is NEW, AWAITING_REVIEW, APPROVED, or REVISIONS_REQUIRED
  - User is the assigned approver

#### Dialog:
- Optional approval comment
- "Approve" confirmation button

#### Effects:
- Marks current approval step as 'approved'
- Activates next approval step (if exists)
- If last step: moves task to APPROVED or CLIENT_REVIEW
- If all approvals complete and no client approval: marks COMPLETED
- Clears revision context
- Notifies next approver or task owner
- Creates activity log

---

### tasks.reject
**Permission Code:** `tasks.reject`

#### Screens & Effects:
- **Task Detail View - Approvals Tab**: "Reject" option in approver actions
- Alternative to requesting revisions

#### Dialog:
- Rejection reason (required)
- Final rejection checkbox

#### Effects:
- Marks step as 'rejected'
- Returns task to previous status
- Can trigger task cancellation workflow

---

### tasks.reopen
**Permission Code:** `tasks.reopen`

#### Screens & Effects:
- **Task Detail View**: "Reopen Task" button visible on completed tasks
- **Archived Tasks**: Reopen option

#### Dialog:
- Reopen reason
- Status selection (where to reopen to)
- Reassignment option

#### Effects:
- Changes status from COMPLETED to selected status
- Clears completion timestamp
- Reactivates task in project
- Creates activity log

---

### tasks.edit_completed
**Permission Code:** `tasks.edit_completed`

#### Screens & Effects:
- **Task Detail View**: Edit button visible on completed tasks
- **Completed Task Cards**: Edit icon shown

#### Editable Fields:
- Task details
- Time logs
- Notes
- Files

---

### tasks.archive
**Permission Code:** `tasks.archive`

#### Screens & Effects:
- **Task Detail View**: "Archive" button visible
- **Task Context Menu**: Archive option

#### Effects:
- Marks task as archived
- Removes from active views
- Still searchable in archive
- Preserves all data

---

### tasks.archive.view
**Permission Code:** `tasks.archive.view`

#### Screens & Effects:
- **Tasks Hub**: "Archived" filter option visible
- **Archived Tasks View**: Access to view archived tasks

---

### tasks.manual_close.approve
**Permission Code:** `tasks.manual_close.approve`

#### Screens & Effects:
- **Task Closure Requests**: Approve manual closure requests
- **Approval Dialog**: Manual close approval form

---

### tasks.manual_close.reject
**Permission Code:** `tasks.manual_close.reject`

#### Screens & Effects:
- **Task Closure Requests**: Reject manual closure with reason

---

### tasks.manage_publishing
**Permission Code:** `tasks.manage_publishing`

#### Screens & Effects:
- **Task Detail View**: Publishing section visible
- **Social Post Link**: Manage social media posting

---

### tasks.references.view
**Permission Code:** `tasks.references.view`

#### Screens & Effects:
- **Task Detail View**: References section visible

---

### tasks.references.add
**Permission Code:** `tasks.references.add`

#### Screens & Effects:
- **References Section**: "+ Add Reference" button visible

---

### tasks.references.delete
**Permission Code:** `tasks.references.delete`

#### Screens & Effects:
- **Reference Items**: Delete icon visible

---

### task_files.view
**Permission Code:** `task_files.view`

#### Screens & Effects:
- **Task Detail View**: "Files" tab visible
- **File Gallery**: View attached files

---

### task_files.upload
**Permission Code:** `task_files.upload`

#### Screens & Effects:
- **Task Files Tab**: "Upload File" button visible
- **Drag & Drop**: File upload zone active

---

### task_files.delete
**Permission Code:** `task_files.delete`

#### Screens & Effects:
- **File Items**: Delete icon visible
- **Context Menu**: Delete file option

---

## Approvals

### approvals.view.own
**Permission Code:** `approvals.view.own`

#### Screens & Effects:
- **Task Detail View**: Approvals tab visible for own approval steps
- **Dashboard**: "Needs My Approval" widget shows tasks awaiting user's approval

#### Visible Information:
- Approval steps assigned to user
- Approval status
- Comments from approvers

---

### approvals.view.dept
**Permission Code:** `approvals.view.dept`

#### Screens & Effects:
- **Workflow Hub**: Department approval workflows visible
- **Approvals Tab**: Can see department approval history

---

### approvals.view.all
**Permission Code:** `approvals.view.all`

#### Screens & Effects:
- **Workflow Hub**: All approval workflows visible
- **Approvals Tab**: Complete approval history across organization
- **Analytics**: Approval metrics and bottleneck analysis

---

### approvals.act
**Permission Code:** `approvals.act`

#### Screens & Effects:
- **Task Detail View - Approvals Tab**: Approve/Reject/Revise buttons visible
- **Approval Actions**: Full approval step management

#### Available Actions:
- Approve step
- Request revisions
- Reject (if also has tasks.reject)
- Add approval comments

#### Effects:
- Execute approval workflow
- Advance or return task status
- Notify stakeholders

---

### approvals.configure
**Permission Code:** `approvals.configure`

#### Screens & Effects:
- **Admin Hub**: Workflows section visible
- **Workflow Builder**: Access to create/edit workflows

#### Workflow Builder Features:
- Create new workflow templates
- Add/remove approval steps
- Define step order
- Set approvers (by role, user, or project role)
- Configure auto-assignment rules
- Set department/task type filters
- Enable/disable client approval
- Test workflow

---

## Calendar

### calendar.view
**Permission Code:** `calendar.view`

#### Screens & Effects:
- **Sidebar Navigation**: "Calendar" menu item visible
- **Calendar Hub**: Read-only access to calendar view
- **Dashboard**: Calendar widget visible

#### Visible Elements:
- Month view calendar
- Calendar items
- Scheduled content
- Deadlines

---

### calendar.manage
**Permission Code:** `calendar.manage`

#### Screens & Effects:
- **Calendar Hub**: Full edit access to calendar
- **Project Creation**: Smart Project Setup section visible (with calendar.view OR calendar.manage)

#### Management Actions:
- All view permissions
- All month and item management permissions
- Full calendar administration

---

### calendar.months.create
**Permission Code:** `calendar.months.create`

#### Screens & Effects:
- **Calendar Hub**: "+ New Month" button visible
- **Month Creation Dialog**: Create calendar months

#### Dialog Fields:
- Month name/title
- Client selection
- Month year (YYYY-MM format)
- Description
- Status

#### Effects:
- Creates calendar month container
- Links to client
- Ready for content items

---

### calendar.months.edit
**Permission Code:** `calendar.months.edit`

#### Screens & Effects:
- **Calendar Month**: Edit icon visible
- **Month Settings**: Modify month details

---

### calendar.months.delete
**Permission Code:** `calendar.months.delete`

#### Screens & Effects:
- **Month Context Menu**: Delete option
- **Confirmation Dialog**: Verify deletion with cascading warning

#### Effects:
- Deletes month and all calendar items
- Unlinks from projects using this month

---

### calendar.items.create
**Permission Code:** `calendar.items.create`

#### Screens & Effects:
- **Calendar Month View**: "+ Add Item" button visible
- **Item Creation Dialog**: Create content items

#### Dialog Fields:
- Item title
- Content type (VIDEO, PHOTO, MOTION, DESIGN, COPY)
- Publish date
- Platform (Instagram, Facebook, TikTok, etc.)
- Caption preview
- Asset requirements

#### Effects:
- Creates calendar item
- Can generate tasks automatically
- Links to social posts

---

### calendar.items.edit
**Permission Code:** `calendar.items.edit`

#### Screens & Effects:
- **Calendar Items**: Edit icon visible
- **Item Editor**: Modify item details

---

### calendar.items.delete
**Permission Code:** `calendar.items.delete`

#### Screens & Effects:
- **Calendar Items**: Delete icon visible
- **Context Menu**: Delete option

---

## Production Hub

### production.view
**Permission Code:** `production.view`

#### Screens & Effects:
- **Sidebar Navigation**: "Production" menu item visible
- **Production Hub**: Access to production planning and tracking

#### Visible Sections:
- Production calendar
- Shoot schedule
- Equipment booking
- Crew assignments
- Location management

---

### production.create
**Permission Code:** `production.create`

#### Screens & Effects:
- **Production Hub**: "+ New Production" button visible
- **Production Planning Dialog**: Create production plans

---

### production.edit
**Permission Code:** `production.edit`

#### Screens & Effects:
- **Production Details**: Edit button visible
- **Production Editor**: Modify production details

---

### production.assign_crew
**Permission Code:** `production.assign_crew`

#### Screens & Effects:
- **Production Detail**: Crew assignment section visible
- **Crew Selector**: Assign team members to production roles

---

### production.schedule
**Permission Code:** `production.schedule`

#### Screens & Effects:
- **Production Calendar**: Schedule and reschedule productions
- **Timeline Editor**: Drag and drop scheduling

---

### production.close_job
**Permission Code:** `production.close_job`

#### Screens & Effects:
- **Production Detail**: "Close Production" button visible
- **Closure Checklist**: Mark production complete

---

### production.delete
**Permission Code:** `production.delete`

#### Screens & Effects:
- **Production Detail**: Delete button in danger zone
- **Context Menu**: Delete option

---

### production.plans.view
**Permission Code:** `production.plans.view`

#### Screens & Effects:
- **Production Hub**: Production plans list visible

---

### production.plans.create
**Permission Code:** `production.plans.create`

#### Screens & Effects:
- **Production Hub**: "+ New Plan" button visible
- **Production Planning Modal**: Multi-step wizard

#### Modal Steps:

1. **Plan Setup**
   - Client selection (required)
   - Production date
   - Plan name

2. **Content Selection**
   - Calendar month items (if linked)
   - Manual task selection
   - Content type filtering

3. **Task Configuration**
   - Set delivery dates per item
   - Assign workflows
   - Set priorities

4. **Review & Generate**
   - Preview generated tasks
   - Conflict detection
   - Force override option (if permission)

#### Effects:
- Creates production plan record
- Generates tasks from calendar items
- Links tasks to project
- Assigns workflows automatically
- Creates approval steps

---

### production.plans.edit
**Permission Code:** `production.plans.edit`

#### Screens & Effects:
- **Production Plans**: Edit icon visible
- **Plan Editor**: Modify plan details

---

### production.plans.delete
**Permission Code:** `production.plans.delete`

#### Screens & Effects:
- **Production Plans**: Delete option visible

---

### production.override_conflicts
**Permission Code:** `production.override_conflicts`

#### Screens & Effects:
- **Production Planning Modal**: "Force Update" checkbox visible when conflicts detected

#### Dialog:
- Conflict warning bypass
- Reason for override (required)

#### Effects:
- Allows overwriting existing tasks
- Bypasses date conflict warnings
- Archives conflicting production plans

---

### production.restore_archived
**Permission Code:** `production.restore_archived`

#### Screens & Effects:
- **Archived Plans**: Restore button visible

---

## Posting & Social

### posting.view.dept
**Permission Code:** `posting.view.dept`

#### Screens & Effects:
- **Sidebar Navigation**: "Posting" menu item visible
- **Posting Hub**: Department social posts visible

---

### posting.view.all
**Permission Code:** `posting.view.all`

#### Screens & Effects:
- **Posting Hub**: All social posts visible across organization

---

### posting.create
**Permission Code:** `posting.create`

#### Screens & Effects:
- **Posting Hub**: "+ New Post" button visible
- **Post Creation Dialog**: Create social posts

---

### posting.edit
**Permission Code:** `posting.edit`

#### Screens & Effects:
- **Post Cards**: Edit icon visible
- **Post Editor**: Modify post details

---

### posting.assign
**Permission Code:** `posting.assign`

#### Screens & Effects:
- **Post Editor**: Social manager assignment dropdown visible

---

### posting.submit_for_review
**Permission Code:** `posting.submit_for_review`

#### Screens & Effects:
- **Post Editor**: "Submit for Review" button visible

---

### posting.request_revision
**Permission Code:** `posting.request_revision`

#### Screens & Effects:
- **Post Review**: "Request Changes" button visible for reviewers

---

### posting.approve
**Permission Code:** `posting.approve`

#### Screens & Effects:
- **Post Review**: "Approve" button visible for approvers

---

### posting.schedule
**Permission Code:** `posting.schedule`

#### Screens & Effects:
- **Post Editor**: Scheduling section visible
- **Schedule Picker**: Date/time scheduling

---

### posting.mark_published
**Permission Code:** `posting.mark_published`

#### Screens & Effects:
- **Post Actions**: "Mark as Published" button visible

---

### posting.archive
**Permission Code:** `posting.archive`

#### Screens & Effects:
- **Post Context Menu**: Archive option visible

---

### posting.delete
**Permission Code:** `posting.delete`

#### Screens & Effects:
- **Post Context Menu**: Delete option visible

---

## Files & Assets

### assets.view.dept
**Permission Code:** `assets.view.dept`

#### Screens & Effects:
- **Files Hub**: Department files visible
- **File Browser**: Filtered to department assets

---

### assets.view.all
**Permission Code:** `assets.view.all`

#### Screens & Effects:
- **Files Hub**: All files across organization visible
- **File Browser**: Complete file system access

---

### assets.upload
**Permission Code:** `assets.upload`

#### Screens & Effects:
- **Files Hub**: "Upload" button visible
- **Project Files**: Upload button in project file sections
- **Task Files**: Upload button in task attachments

#### Upload Dialog:
- Drag & drop zone
- File browser
- Folder selection
- Metadata input (tags, description)
- Multiple file support

---

### assets.edit_metadata
**Permission Code:** `assets.edit_metadata`

#### Screens & Effects:
- **File Details**: Edit metadata button visible
- **Metadata Editor**: Modify file information

#### Editable Fields:
- File name
- Description
- Tags
- Category

---

### assets.delete
**Permission Code:** `assets.delete`

#### Screens & Effects:
- **File Context Menu**: Delete option visible
- **Bulk Actions**: Delete selected files

---

### assets.link_to_task
**Permission Code:** `assets.link_to_task`

#### Screens & Effects:
- **File Actions**: "Link to Task" option visible
- **Task Linker**: Associate files with tasks

---

### assets.archive
**Permission Code:** `assets.archive`

#### Screens & Effects:
- **File Context Menu**: Archive option visible

---

## Finance

### finance.view.own
**Permission Code:** `finance.view.own`

#### Screens & Effects:
- **Finance Hub**: Own invoices and payments visible
- **Dashboard**: Personal financial summary

---

### finance.view.project
**Permission Code:** `finance.view.project`

#### Screens & Effects:
- **Finance Hub**: Financial data for assigned projects
- **Project Detail**: Budget and spend visible

---

### finance.view.all
**Permission Code:** `finance.view.all`

#### Screens & Effects:
- **Sidebar Navigation**: "Finance" menu item visible
- **Finance Hub**: Complete financial visibility
- **All Invoices**: View all invoices and payments
- **Budget Reports**: Organization-wide financial reports

---

### finance.create_invoice
**Permission Code:** `finance.create_invoice`

#### Screens & Effects:
- **Finance Hub**: "+ New Invoice" button visible
- **Invoice Creation Dialog**: Create client invoices

#### Dialog Fields:
- Client selection
- Project selection
- Invoice number (auto-generated)
- Line items (description, quantity, rate)
- Tax settings
- Due date
- Payment terms
- Notes

---

### finance.edit_invoice
**Permission Code:** `finance.edit_invoice`

#### Screens & Effects:
- **Invoice Details**: Edit button visible
- **Invoice Editor**: Modify invoice details

---

### finance.delete_invoice
**Permission Code:** `finance.delete_invoice`

#### Screens & Effects:
- **Invoice Context Menu**: Delete option visible

---

### finance.record_payment
**Permission Code:** `finance.record_payment`

#### Screens & Effects:
- **Invoice Details**: "Record Payment" button visible
- **Payment Dialog**: Log payment receipt

#### Dialog Fields:
- Payment amount
- Payment date
- Payment method
- Reference number
- Notes

---

### finance.approve_payment
**Permission Code:** `finance.approve_payment`

#### Screens & Effects:
- **Payment Requests**: Approve payment authorization
- **Approval Queue**: Payment approval workflow

---

### finance.export
**Permission Code:** `finance.export`

#### Screens & Effects:
- **Finance Hub**: "Export" button visible
- **Export Dialog**: Download financial data

#### Export Options:
- CSV format
- PDF reports
- Excel workbooks
- Date range selection
- Filter by client/project

---

### finance.manage_budgets
**Permission Code:** `finance.manage_budgets`

#### Screens & Effects:
- **Project Detail**: Budget editor visible
- **Budget Management**: Set and adjust project budgets

---

## Analytics & Reports

### reports.view.dept
**Permission Code:** `reports.view.dept`

#### Screens & Effects:
- **Analytics Hub**: Department reports visible
- **Reports Section**: Department-level insights

---

### reports.view.all
**Permission Code:** `reports.view.all`

#### Screens & Effects:
- **Analytics Hub**: Organization-wide reports
- **Dashboard**: Advanced analytics widgets

---

### reports.export
**Permission Code:** `reports.export`

#### Screens & Effects:
- **Reports**: Export button on all reports
- **Export Options**: PDF, CSV, Excel

---

### analytics.view.dept
**Permission Code:** `analytics.view.dept`

#### Screens & Effects:
- **Analytics Hub**: Department analytics dashboards

---

### analytics.view.all
**Permission Code:** `analytics.view.all`

#### Screens & Effects:
- **Analytics Hub**: Complete analytics access
- **Advanced Metrics**: Organization-wide insights

---

## Admin & System

### roles.view
**Permission Code:** `roles.view`

#### Screens & Effects:
- **Admin Hub**: "Roles" section visible
- **Roles List**: View all role definitions

---

### roles.create
**Permission Code:** `roles.create`

#### Screens & Effects:
- **Roles Section**: "+ New Role" button visible
- **Role Creator**: Define new roles

---

### roles.edit
**Permission Code:** `roles.edit`

#### Screens & Effects:
- **Role Details**: Edit button visible
- **Permission Matrix**: Modify role permissions

---

### roles.delete
**Permission Code:** `roles.delete`

#### Screens & Effects:
- **Role Context Menu**: Delete option visible

---

### roles.assign
**Permission Code:** `roles.assign`

#### Screens & Effects:
- **User Management**: Assign roles to users

---

### permissions.view
**Permission Code:** `permissions.view`

#### Screens & Effects:
- **Admin Hub**: Permissions section visible
- **Permission Matrix**: View permission catalog

---

### permissions.manage
**Permission Code:** `permissions.manage`

#### Screens & Effects:
- **Permission Matrix**: Edit permissions for roles
- **Permission Editor**: Modify permission grants

---

### departments.view
**Permission Code:** `departments.view`

#### Screens & Effects:
- **Admin Hub**: Departments section visible

---

### departments.create
**Permission Code:** `departments.create`

#### Screens & Effects:
- **Departments**: "+ New Department" button visible

---

### departments.edit
**Permission Code:** `departments.edit`

#### Screens & Effects:
- **Department Editor**: Modify department details

---

### departments.delete
**Permission Code:** `departments.delete`

#### Screens & Effects:
- **Department Context Menu**: Delete option visible

---

### departments.assign_members
**Permission Code:** `departments.assign_members`

#### Screens & Effects:
- **Department Editor**: Member assignment section visible

---

### admin.branding.view
**Permission Code:** `admin.branding.view`

#### Screens & Effects:
- **Admin Hub**: Branding section visible
- **Branding Preview**: View current branding

---

### admin.branding.edit
**Permission Code:** `admin.branding.edit`

#### Screens & Effects:
- **Branding Editor**: Modify app branding
- **Color Picker**: Change theme colors
- **Logo Upload**: Update agency logo

---

### admin.branding.upload_assets
**Permission Code:** `admin.branding.upload_assets`

#### Screens & Effects:
- **Branding Assets**: Upload branding files

---

### admin.settings.view
**Permission Code:** `admin.settings.view`

#### Screens & Effects:
- **Sidebar Navigation**: "Admin" menu item visible
- **Admin Hub**: Access to system settings
- **Settings Sections**: View configuration

---

### admin.settings.edit
**Permission Code:** `admin.settings.edit`

#### Screens & Effects:
- **Settings Editor**: Modify system settings
- **Configuration Panel**: Change app behavior

#### Editable Settings:
- Default workflow assignments
- Notification settings
- System preferences
- Integration settings

---

### dashboard.view_gm_urgent
**Permission Code:** `dashboard.view_gm_urgent`

#### Screens & Effects:
- **Dashboard**: "GM Urgent Tasks" widget visible
- Special high-priority task visibility

---

### notes.create
**Permission Code:** `notes.create`

#### Screens & Effects:
- **Dashboard**: Quick notes widget with "+ Add Note" button
- **Notes Section**: Create button visible

---

### notes.edit_own
**Permission Code:** `notes.edit_own`

#### Screens & Effects:
- **Note Cards**: Edit icon on own notes
- **Note Editor**: Modify own notes

---

### notes.delete_own
**Permission Code:** `notes.delete_own`

#### Screens & Effects:
- **Note Cards**: Delete icon on own notes

---

### notes.manage_all
**Permission Code:** `notes.manage_all`

#### Screens & Effects:
- **All Notes**: Full edit/delete access to all notes

---

### vendors.view
**Permission Code:** `vendors.view`

#### Screens & Effects:
- **Sidebar Navigation**: "Vendors" menu item visible
- **Vendors Hub**: Access to vendor directory

---

### vendors.create
**Permission Code:** `vendors.create`

#### Screens & Effects:
- **Vendors Hub**: "+ New Vendor" button visible

---

### vendors.edit
**Permission Code:** `vendors.edit`

#### Screens & Effects:
- **Vendor Details**: Edit button visible

---

### vendors.delete
**Permission Code:** `vendors.delete`

#### Screens & Effects:
- **Vendor Context Menu**: Delete option visible

---

### vendors.assign_to_project
**Permission Code:** `vendors.assign_to_project`

#### Screens & Effects:
- **Project Detail**: Vendor assignment section visible

---

## Permission Matrix by Role

### General Manager (GM)
**Role ID:** `r1`  
**Is Admin:** Yes  
**Permission Count:** 166+ permissions

#### Full Access To:
- All modules and features
- Complete user management
- System administration
- All viewing, creating, editing, deleting across all modules
- Override capabilities
- Analytics and reporting
- Branding and settings

#### Key Capabilities:
- Unrestricted access to entire system
- Can see and modify all data
- Administrative functions
- System configuration

---

### Account Manager
**Role ID:** `r2`  
**Is Admin:** No  
**Permission Count:** 60 permissions

#### Access Summary:
- **Clients**: Full access (view.all, create, edit, archive, notes, meetings, brand assets, strategies)
- **Projects**: Full access (view.all, create, edit, milestones)
- **Tasks**: Department level (view.all, create, edit.dept, assign.dept, approve, manage workflow)
- **Calendar**: Full management (manage, months, items)
- **Finance**: Full visibility (view.all, create/edit invoices, manage budgets)
- **Reports**: Full access (view.all, export, analytics)
- **Approvals**: Full access (view.all, act, configure)

#### Key Capabilities:
- Client relationship management
- Project oversight
- Task and workflow management
- Financial tracking
- Calendar content planning
- Approval workflows

---

### Creative Director
**Role ID:** `r3`  
**Is Admin:** No  
**Permission Count:** ~60 permissions

#### Access Summary:
- **Clients**: View all, notes, meetings, brand assets
- **Projects**: Full access (view.all, create, edit, milestones)
- **Tasks**: Full control (view.all, create, edit.all, assign.dept, approve, reject)
- **Calendar**: Full management
- **Approvals**: Full access (view.all, act, configure)
- **Posting**: Full access (view.all, create, edit, approve, schedule)
- **Production**: Full access (view, edit, assign crew)

#### Key Capabilities:
- Creative team oversight
- Project creative control
- Approval authority
- Production coordination
- Social media oversight

---

### Art Director
**Role ID:** `r4`  
**Is Admin:** No  
**Permission Count:** ~40 permissions

#### Access Summary:
- **Clients**: View department
- **Projects**: Department level (view.dept, edit)
- **Tasks**: Department level (view.dept, create, edit.dept, assign.dept, approve)
- **Calendar**: Full management
- **Approvals**: Department level (view.dept, act)

#### Key Capabilities:
- Design team leadership
- Department task management
- Approval authority for design work
- Calendar management

---

### Designer
**Role ID:** `r5`  
**Is Admin:** No  
**Permission Count:** ~21 permissions

#### Access Summary:
- **Clients**: View own
- **Projects**: View own
- **Tasks**: Own only (view.own, edit.own, submit_for_review, approve, reject)
- **Calendar**: View only
- **Approvals**: View own
- **Assets**: Department view, upload

#### Key Capabilities:
- Complete own tasks
- Submit work for review
- View related project information
- Access brand assets

---

### Copywriter
**Role ID:** `r6`  
**Is Admin:** No  
**Permission Count:** ~20 permissions

#### Access Summary:
- Similar to Designer
- Focus on content creation
- Own task management
- Submit for review

---

### Social Manager
**Role ID:** `r7`  
**Is Admin:** No

#### Access Summary:
- **Posting**: Full access (view.all, create, edit, approve, schedule, mark_published)
- **Calendar**: View and items management
- **Tasks**: View related, submit for review
- **Clients**: View assigned

#### Key Capabilities:
- Social media content management
- Scheduling and publishing
- Caption writing and editing
- Calendar item creation

---

### Production Manager
**Role ID:** `r8`  
**Is Admin:** No

#### Access Summary:
- **Production**: Full access (view, create, edit, assign crew, schedule, plans)
- **Projects**: Department view
- **Tasks**: Department view and management
- **Calendar**: Full management

#### Key Capabilities:
- Production planning and scheduling
- Crew assignment
- Equipment management
- Location coordination

---

### Videographer / Photographer
**Role ID:** `r9-r10`  
**Is Admin:** No

#### Access Summary:
- **Production**: View and participate
- **Tasks**: Own tasks
- **Assets**: Upload and link
- **Projects**: View assigned

#### Key Capabilities:
- Complete production tasks
- Upload deliverables
- View production schedules

---

### Finance Manager
**Role ID:** `r11`  
**Is Admin:** No

#### Access Summary:
- **Finance**: Full access (view.all, create/edit/delete invoices, payments, export, budgets)
- **Clients**: View all
- **Projects**: View all (for financial tracking)
- **Reports**: Full access

#### Key Capabilities:
- Invoice management
- Payment processing
- Budget oversight
- Financial reporting

---

### Freelancer
**Role ID:** `r12`  
**Is Admin:** No

#### Access Summary:
- **Tasks**: View and edit assigned tasks only
- **Projects**: View assigned projects
- **Assets**: Upload deliverables
- **Time Tracking**: Log hours

#### Key Capabilities:
- Complete assigned work
- Submit deliverables
- Track time
- Limited system access

---

### Client
**Role ID:** `r13`  
**Is Admin:** No

#### Access Summary:
- **Projects**: View own projects
- **Tasks**: View tasks in client review
- **Approvals**: Approve/reject submitted work
- **Calendar**: View own calendar items
- **Files**: View project deliverables

#### Key Capabilities:
- Review and approve work
- View project progress
- Access brand assets
- Schedule meetings

---

## Best Practices

### For Administrators

1. **Principle of Least Privilege**: Grant only the permissions necessary for each role
2. **Regular Audits**: Review role permissions quarterly
3. **Custom Roles**: Create specialized roles for unique positions
4. **Testing**: Test permission changes in development before production
5. **Documentation**: Keep this catalogue updated when adding new permissions

### For Users

1. **Check Access**: If you can't see a feature, check with your administrator
2. **Request Access**: Use proper channels to request additional permissions
3. **Scope Awareness**: Understand your access level (own, dept, all)
4. **Report Issues**: If permissions seem incorrect, report immediately

### Common Permission Combinations

#### Project Manager Role (Custom)
```
projects.view.all + projects.edit.all
tasks.view.all + tasks.edit.all + tasks.assign.all
milestones.create + milestones.edit
reports.view.all
```

#### Department Head Role (Custom)
```
*.view.dept + *.edit.dept
tasks.assign.dept
approvals.act
reports.view.dept
```

#### Junior Designer Role (Custom)
```
tasks.view.own + tasks.edit.own
tasks.submit_for_review
assets.upload
calendar.view
```

---

## Troubleshooting

### "Access Denied" Messages

If you see "Access Denied" or missing features:

1. **Check Your Role**: View your profile to see your assigned role
2. **Verify Permissions**: Contact admin to review your role permissions
3. **Scope Issue**: You might have permission but wrong scope (e.g., view.own instead of view.all)
4. **Module Access**: Ensure the module permission is granted (e.g., calendar.view for calendar access)

### Missing Buttons or Options

Common causes:

- **Base Permission**: Need the view/access permission for the module
- **Action Permission**: Need specific permission (e.g., tasks.create to see "+ New Task")
- **Scope Mismatch**: Have permission but not for this resource (e.g., edit.own but trying to edit others' tasks)

### Workflow Issues

If approval workflows aren't working:

- **approvals.view.own**: See your pending approvals
- **approvals.act**: Actually approve/reject
- **tasks.approve**: Specific permission to approve tasks
- All three may be needed for full functionality

---

## Version History

- **v1.0** (January 16, 2026): Initial comprehensive catalogue
  - Documented all 200+ permissions
  - Added screen and dialog references
  - Included role-based matrices
  - Added troubleshooting guide

---

## Contact

For permission-related questions or requests:
- **System Administrators**: Contact your IT department
- **Feature Requests**: Submit through proper channels
- **Bug Reports**: Use the issue tracking system

---

**Document End**
