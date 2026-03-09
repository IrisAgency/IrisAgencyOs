# HR Department Module — IRIS Agency OS

> Internal Product and Operations Document  
> Module: Team / HR Department  
> System: IRIS Agency OS  
> Last Updated: March 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [HR Module Objectives](#2-hr-module-objectives)
3. [Core Functional Areas](#3-core-functional-areas)
4. [Data Model](#4-data-model)
5. [Workflow Design](#5-workflow-design)
6. [Roles and Permissions](#6-roles-and-permissions)
7. [Notifications and Audit Logs](#7-notifications-and-audit-logs)
8. [Confidentiality and Security](#8-confidentiality-and-security)
9. [Operational Use Cases](#9-operational-use-cases)
10. [Dashboards and Views](#10-dashboards-and-views)
11. [Business Value](#11-business-value)
12. [Future Expansion](#12-future-expansion)
13. [Summary](#13-summary)

---

## 1. Overview

The HR Department module is a core operational module within IRIS Agency OS. It provides structured employee lifecycle management, attendance tracking, leave administration, organizational hierarchy, asset management, performance evaluation, and workforce capacity planning — all integrated into the same real-time platform that manages clients, projects, production, finance, and creative workflows.

This module is accessed through the **Team** navigation item in the sidebar and renders as an 8-tab interface within `components/TeamHub.tsx`. It is backed by 11 dedicated Firestore collections, 21 handler functions orchestrated through `App.tsx`, 26 permission keys under the `hr.*` namespace, and 12 notification types covering the full HR event lifecycle.

The HR module is not a standalone product. It operates within the same architecture as every other IRIS module: centralized state management via `App.tsx`, real-time Firestore listeners, role-based access control through `lib/permissions.ts`, and an audit trail that logs every significant HR action.

### System Architecture Context

| Layer | Implementation |
|-------|----------------|
| Frontend | React + TypeScript, 16 sub-components in `components/hr/` |
| State Management | Centralized in `App.tsx` via `useFirestoreCollection` hooks |
| Backend | Firebase Firestore (real-time), Firebase Auth, Firebase Storage |
| Access Control | RBAC with scope hierarchy (own / department / all) |
| Notifications | In-app + push (FCM) via `notificationService.ts` |
| Audit Trail | `addAuditLog()` writes to `audit_logs` collection |

---

## 2. HR Module Objectives

The HR module exists to address specific operational requirements within an agency environment:

| Objective | Description |
|-----------|-------------|
| Centralized employee records | Maintain a single, structured source of truth for every employee's profile, employment details, emergency contacts, and status history. |
| Leave administration | Allow employees to request leave, managers to approve or reject with reason, and HR to track balances against defined policies. |
| Attendance and timekeeping | Capture clock-in/out events, calculate work hours and overtime, and provide correction workflows for discrepancies. |
| Employee lifecycle management | Track onboarding for new hires and offboarding for departing employees through structured, step-by-step checklists. |
| Organizational structure | Visualize and manage the department-team-member hierarchy across the company. |
| Asset accountability | Track company equipment assigned to employees and manage return workflows. |
| Performance evaluation | Conduct structured performance reviews with self-assessment, manager assessment, scored categories, and finalization workflows. |
| Workforce planning | Provide real-time capacity and availability data to support production planning, project staffing, and resource allocation. |
| Manager approvals | Route leave requests, attendance corrections, and performance reviews through the appropriate approval chain. |
| HR-sensitive access control | Restrict confidential employee data to authorized personnel only, with scope-based visibility. |

---

## 3. Core Functional Areas

### 3.1 Employee Profiles

**Purpose:** Provide a structured record for every employee beyond the basic `users` collection. The `employee_profiles` collection stores employment-specific data that does not belong in the authentication or general user record.

**Key Data:**

| Field | Description |
|-------|-------------|
| `userId` | Links to the Firebase Auth UID and the `users` collection |
| `fullName`, `preferredName` | Legal and working name |
| `personalEmail`, `personalPhone` | Personal contact (separate from company email) |
| `nationalId` | Government ID number |
| `jobTitle` | Current position title |
| `departmentId`, `teamId`, `roleId` | Links to organizational structure |
| `directManagerId` | Reporting line (userId of direct manager) |
| `employmentType` | `full-time`, `part-time`, `freelancer`, `contractor`, or `intern` |
| `employmentStatus` | `active`, `probation`, `on-leave`, `suspended`, `resigned`, or `terminated` |
| `joinDate`, `probationEndDate` | Employment timeline |
| `contractStartDate`, `contractEndDate` | Contract boundaries |
| `workMode` | `on-site`, `hybrid`, or `remote` |
| `emergencyContact` | Name, relationship, phone number |
| `salaryGrade`, `location`, `notes` | Additional HR metadata |

**User Actions:**
- Employees can view their own profile
- HR managers can create and edit any employee profile
- Managers with `hr.employees.view_dept` can view profiles in their department

**Business Value:** Eliminates scattered spreadsheets and ad-hoc employee records. Every employee has one structured record that HR, management, and the employee themselves can reference.

---

### 3.2 Organization Structure

**Purpose:** Visualize the company's department-team-member hierarchy and manage team composition.

**Key Data:**
- `departments` collection (shared with the admin module)
- `teams` collection — each team has a `name`, `departmentId`, `leadId`, `memberIds`, and metadata
- `employee_profiles.directManagerId` — defines reporting lines

**User Actions:**
- View org chart in tree or flat layout
- See department member counts and team leads
- Identify unassigned employees (not part of any team)
- Manage team composition (requires `hr.org.manage` permission)

**Business Value:** Provides a live, queryable org chart rather than a static diagram. Supports reporting line verification and department capacity analysis.

---

### 3.3 Leave Management

**Purpose:** Handle the full leave lifecycle — from policy definition through request, approval, balance tracking, and calendar visualization.

**Sub-views:** The Leave tab contains four sub-tabs: **Requests** (board), **New Request** (form), **Calendar**, and **My Balance**.

#### Leave Policies

Seven default policies are defined in seed data:

| Policy | Type | Days/Year | Carry-Over | Attachment Required | Requires Approval |
|--------|------|-----------|------------|--------------------|--------------------|
| Annual Leave | `annual` | 21 | 5 days | No | Yes |
| Sick Leave | `sick` | 10 | 0 | Yes | Yes |
| Unpaid Leave | `unpaid` | 30 | 0 | No | Yes |
| Emergency Leave | `emergency` | 5 | 0 | No | Yes |
| Maternity Leave | `maternity` | 90 | 0 | Yes | Yes |
| Paternity Leave | `paternity` | 5 | 0 | Yes | Yes |
| Compensatory Leave | `compensatory` | 0 | 0 | No | Yes |

#### Leave Request Lifecycle

| Status | Description |
|--------|-------------|
| `pending` | Employee has submitted the request; awaiting manager approval |
| `approved` | Manager has approved; leave balance is deducted; user status may update to `on_leave` if dates overlap with today |
| `rejected` | Manager has rejected with a stated reason |
| `cancelled` | Employee or HR has cancelled the request; if it was previously approved, the balance is restored |

**Key Actions:**
- Employee submits a leave request with type, dates, reason, and optional attachments
- Working days are calculated automatically (weekends excluded)
- Balance is validated against the employee's `leave_balances` record
- Manager sees pending requests on the Leave Board and can approve or reject (with reason)
- Approved leave appears on the Leave Calendar as a colored entry per leave type
- Employees can cancel their own pending requests

**Business Value:** Replaces email-based leave requests with a tracked, auditable workflow. Managers see leave impact on team capacity before approving.

---

### 3.4 Attendance and Timekeeping

**Purpose:** Record daily clock-in/out times, calculate work hours and overtime, and provide a correction mechanism for discrepancies.

**Sub-views:** The Attendance tab provides three views: **Today** (live team board), **Monthly** (summary table), and **Corrections** (pending correction queue).

**Key Data:**

| Field | Description |
|-------|-------------|
| `userId` | Employee who clocked in |
| `date` | The working day |
| `checkIn`, `checkOut` | ISO timestamps |
| `totalHours` | Calculated on clock-out |
| `overtimeHours` | Hours exceeding 8.0 |
| `status` | `present`, `absent`, `late`, `remote`, `on_leave`, `holiday`, or `half-day` |
| `workMode` | `on-site`, `hybrid`, or `remote` |

**Attendance Correction Workflow:**
1. Employee submits a correction request specifying the affected field, old value, new value, corrected check-in/out times, and reason
2. The correction enters `pending` status
3. A manager with `hr.attendance.manage` reviews and approves or rejects
4. On approval, the original `attendance_records` document is updated with the corrected values

**Business Value:** Provides objective, timestamped attendance data. The correction workflow prevents silent modifications while still allowing legitimate fixes.

---

### 3.5 Onboarding

**Purpose:** Ensure every new hire goes through a structured, trackable onboarding process rather than an ad-hoc checklist.

**Default Onboarding Steps (10):**

| Order | Step | Category |
|-------|------|----------|
| 1 | Accept Offer Letter | Paperwork |
| 2 | Submit ID Documents | Paperwork |
| 3 | Set Up Email Account | IT |
| 4 | Issue Laptop/Equipment | IT |
| 5 | Access Permissions Setup | IT |
| 6 | Team Introduction | Orientation |
| 7 | Office Tour and Safety Brief | Orientation |
| 8 | Company Policies Review | Paperwork |
| 9 | First Day Meeting with Manager | Orientation |
| 10 | Probation Check-in Scheduled | Orientation |

**Workflow:**
- HR manager initiates onboarding for a user, which creates an `onboarding_checklists` document
- Each step can be marked as completed, which records `completedAt` and `completedBy`
- A progress bar tracks overall completion percentage
- When all steps are completed or skipped, the checklist status transitions to `completed`
- The system identifies users who have no onboarding checklist (potential new hires)

**Checklist Statuses:** `not_started` → `in_progress` → `completed` (or `cancelled`)

**Business Value:** Standardizes the new hire experience. Prevents forgotten steps (e.g., access provisioning, policy acknowledgment). Provides an audit trail of who completed each step and when.

---

### 3.6 Offboarding

**Purpose:** Manage the departure of employees through a structured, HR-sensitive process that ensures all company assets, access, and records are properly handled.

**Default Offboarding Steps (10):**

| Order | Step | Category |
|-------|------|----------|
| 1 | Resignation Letter / Termination Notice | Paperwork |
| 2 | Exit Interview | HR |
| 3 | Knowledge Transfer | Handover |
| 4 | Return Laptop and Equipment | Assets |
| 5 | Revoke System Access | IT |
| 6 | Return Access Cards and Keys | Assets |
| 7 | Final Payroll Processing | Finance |
| 8 | Remove from Communication Channels | IT |
| 9 | Update Org Chart | HR |
| 10 | Archive Employee Records | HR |

**Workflow:**
- HR manager initiates offboarding, which creates an `offboarding_checklists` document
- An `employee_status_changes` record is automatically created to track the status transition
- Each step is completed individually with progress tracking
- The offboarding record includes `reason` (`resignation`, `termination`, `contract_end`, or `other`) and `finalWorkingDate`
- The UI displays an HR-sensitive audit warning to reinforce the importance of the process

**Business Value:** Prevents security gaps (unreturned equipment, active access after departure). Creates a defensible audit trail for employment termination processes.

---

### 3.7 Employee Assets

**Purpose:** Track company equipment and assets assigned to employees throughout the assignment lifecycle.

**Asset Categories:** `laptop`, `phone`, `monitor`, `keyboard`, `headset`, `access-card`, `vehicle`, `other`

**Key Data:**

| Field | Description |
|-------|-------------|
| `employeeId` | The employee who holds the asset |
| `assetId` | Optional link to `agency_equipment` in the Production module |
| `assetType` | Category of asset |
| `assetName` | Descriptive name (e.g., "MacBook Pro 16-inch") |
| `serialNumber` | Unique hardware identifier |
| `assignedAt`, `assignedBy` | When and by whom the asset was assigned |
| `returnedAt` | When the asset was returned |
| `conditionOnAssign`, `conditionOnReturn` | Condition notes |
| `status` | `assigned`, `returned`, `lost`, or `damaged` |

**Workflow:**
1. HR assigns an asset to an employee → status becomes `assigned`
2. When linked to `agency_equipment`, the production equipment status is updated to `checked_out`
3. On return, the asset status becomes `returned` and the linked equipment is restored to `available`
4. Overdue detection flags assets that have been assigned beyond expected return dates

**Business Value:** Eliminates "who has what" confusion. Provides a clear chain of custody for company property. Supports offboarding asset recovery.

---

### 3.8 Performance Reviews

**Purpose:** Conduct structured performance evaluations with scored categories, self-assessment, manager assessment, and a formalized approval workflow.

**Assessment Categories (8):**

| Category | Description |
|----------|-------------|
| Quality of Work | Accuracy, thoroughness, and standards adherence |
| Productivity | Volume and efficiency of output |
| Communication | Clarity, responsiveness, and collaboration |
| Teamwork | Contribution to team goals and peer support |
| Initiative | Proactiveness and self-direction |
| Reliability | Consistency, punctuality, and dependability |
| Problem Solving | Analytical thinking and resolution capability |
| Leadership | Guidance, mentoring, and decision-making |

Each category is scored on a 1-5 scale:

| Score | Label |
|-------|-------|
| 1 | Needs Improvement |
| 2 | Below Expectations |
| 3 | Meets Expectations |
| 4 | Exceeds Expectations |
| 5 | Outstanding |

**Review Structure:**
- `selfAssessment` — Scores and comments from the employee
- `managerAssessment` — Scores and comments from the reviewing manager
- `goals` — Goals for the next review period
- `strengths`, `areasForImprovement`, `managerComments`, `employeeComments` — Narrative fields
- `overallRating` — Aggregate score (1-5)

**Review Lifecycle:**

| Status | Description |
|--------|-------------|
| `draft` | Review created, not yet submitted |
| `submitted` | Employee or manager has submitted their assessment |
| `in-review` | Under active review by the manager |
| `acknowledged` | Employee has acknowledged the finalized review |
| `finalized` | Review is complete and locked |

**Business Value:** Replaces informal feedback with a documented, scored evaluation process. Supports probation reviews, annual reviews, and performance improvement plans.

---

### 3.9 Capacity and Availability

**Purpose:** Provide a real-time workforce overview that connects HR data (leave, attendance) with operational data (tasks, projects) to support resource planning.

**Dashboard Components:**

| Metric | Source |
|--------|--------|
| Total Team Size | Active users count |
| Availability Percentage | (Total - On Leave - Absent) / Total |
| Currently On Leave | Approved leave requests overlapping today |
| Currently Clocked In | Attendance records with check-in but no check-out today |
| Department Capacity | Per-department availability bars |
| 7-Day Leave Forecast | Upcoming approved leaves for the next week |
| Active Task Distribution | Task counts per employee (when task data is available) |

**Business Value:** Answers the operational question "who is available right now?" before scheduling production shoots, allocating project work, or approving additional leave. This is the connection point between HR data and operational planning.

---

## 4. Data Model

### 4.1 Firestore Collections

The HR module uses 11 dedicated Firestore collections, plus shared collections (`users`, `departments`, `agency_equipment`).

| Collection | Purpose | Key Relationships |
|-----------|---------|-------------------|
| `employee_profiles` | Extended employee records | `userId` → `users`, `departmentId` → `departments`, `directManagerId` → `users` |
| `teams` | Team composition within departments | `departmentId` → `departments`, `leadId` → `users`, `memberIds` → `users[]` |
| `leave_requests` | Leave request records | `userId` → `users`, `type` → `leave_policies.type` |
| `leave_policies` | Leave type definitions | Referenced by `leave_balances` and `leave_requests` |
| `leave_balances` | Per-employee leave entitlements | `employeeId` → `users`, `leaveType` → `leave_policies.type` |
| `attendance_records` | Daily clock-in/out records | `userId` → `users` |
| `attendance_corrections` | Correction requests for attendance | `attendanceRecordId` → `attendance_records`, `employeeId` → `users` |
| `onboarding_checklists` | New hire onboarding progress | `employeeId` → `users` |
| `offboarding_checklists` | Departing employee offboarding progress | `employeeId` → `users` |
| `employee_assets` | Equipment assigned to employees | `employeeId` → `users`, `assetId` → `agency_equipment` |
| `performance_reviews` | Performance evaluation records | `employeeId` → `users`, `reviewerId` → `users` |
| `employee_status_changes` | Append-only status transition log | `employeeId` → `users` |

### 4.2 Collection Relationships Diagram

```
users ─────────────────────────────────────┐
  │                                         │
  ├── employee_profiles (1:1)               │
  │     └── departmentId → departments      │
  │     └── teamId → teams                  │
  │     └── directManagerId → users         │
  │                                         │
  ├── leave_requests (1:many)               │
  │     └── type → leave_policies           │
  │                                         │
  ├── leave_balances (1:many per policy)    │
  │     └── leaveType → leave_policies      │
  │                                         │
  ├── attendance_records (1:many per day)   │
  │     └── attendance_corrections (1:many) │
  │                                         │
  ├── onboarding_checklists (1:1)           │
  ├── offboarding_checklists (1:1)          │
  │                                         │
  ├── employee_assets (1:many)              │
  │     └── assetId → agency_equipment      │
  │                                         │
  ├── performance_reviews (1:many)          │
  │     └── reviewerId → users              │
  │                                         │
  └── employee_status_changes (1:many)      │
        └── changedBy → users ──────────────┘
```

### 4.3 Append-Only Collections

The `employee_status_changes` collection is **append-only** — Firestore security rules prohibit updates and deletes. This ensures a tamper-proof audit trail of all employment status transitions (e.g., `active` → `on-leave`, `probation` → `active`, `active` → `terminated`).

---

## 5. Workflow Design

### 5.1 Leave Request Lifecycle

```
Employee submits request
        │
        ▼
    [PENDING] ──── Employee cancels ──→ [CANCELLED]
        │
        ├── Manager approves ──→ [APPROVED]
        │     │
        │     ├── Leave balance deducted
        │     ├── User status → on_leave (if dates overlap)
        │     └── Employee notified (LEAVE_APPROVED)
        │
        └── Manager rejects ──→ [REJECTED]
              │
              ├── Rejection reason recorded
              └── Employee notified (LEAVE_REJECTED)

[APPROVED] ──── Employee/HR cancels ──→ [CANCELLED]
                  │
                  └── Leave balance restored
```

**Trigger Points:**
- `handleAddLeaveRequest` — Creates request, notifies direct manager
- `handleApproveLeaveRequest` — Deducts balance, updates user status if needed
- `handleRejectLeaveRequest` — Records reason, notifies employee
- `handleCancelLeaveRequest` — Restores balance if previously approved

---

### 5.2 Attendance Correction Workflow

```
Employee identifies discrepancy
        │
        ▼
    Submits correction request
    (old value, new value, reason,
     corrected check-in/out times)
        │
        ▼
    [PENDING] ──── Manager reviews
        │
        ├── Approved ──→ Original attendance record updated
        │                 with corrected values
        │
        └── Rejected ──→ No change to original record
```

**Trigger Points:**
- `handleSubmitAttendanceCorrection` — Creates correction document
- `handleApproveAttendanceCorrection` — Updates original record, notifies employee

---

### 5.3 Onboarding Workflow

```
HR initiates onboarding for new user
        │
        ▼
    Checklist created [NOT_STARTED]
        │
        ▼
    First step completed → [IN_PROGRESS]
        │
        ├── Step 1: Accept Offer Letter
        ├── Step 2: Submit ID Documents
        ├── Step 3: Set Up Email Account
        ├── Step 4: Issue Laptop/Equipment
        ├── Step 5: Access Permissions Setup
        ├── Step 6: Team Introduction
        ├── Step 7: Office Tour & Safety Brief
        ├── Step 8: Company Policies Review
        ├── Step 9: First Day Meeting with Manager
        └── Step 10: Probation Check-in Scheduled
              │
              ▼
    All steps completed → [COMPLETED]
```

Each step records: `completedAt`, `completedBy`, `status` (pending/completed/skipped).

---

### 5.4 Offboarding Workflow

```
HR initiates offboarding (reason + final working date)
        │
        ▼
    Checklist created [NOT_STARTED]
    Employee status change logged (append-only)
    Employee notified (OFFBOARDING_STARTED)
        │
        ▼
    Steps completed sequentially → [IN_PROGRESS]
        │
        ├── Paperwork: Resignation/termination notice
        ├── HR: Exit interview, org chart update, record archival
        ├── Handover: Knowledge transfer
        ├── Assets: Return equipment, access cards
        ├── IT: Revoke access, remove from channels
        └── Finance: Final payroll processing
              │
              ▼
    All steps completed → [COMPLETED]
```

---

### 5.5 Performance Review Lifecycle

```
Manager creates review for employee
        │
        ▼
    [DRAFT] ── Scores and comments entered
        │
        ▼
    Employee/Manager submits → [SUBMITTED]
        │
        ▼
    Manager reviews assessment → [IN-REVIEW]
        │
        ▼
    Manager finalizes → [FINALIZED]
        │
        └── Employee notified (PERFORMANCE_REVIEW_FINALIZED)
              │
              ▼
        Employee acknowledges → [ACKNOWLEDGED]
```

---

### 5.6 Asset Assignment and Return Workflow

```
HR assigns asset to employee
        │
        ├── EmployeeAsset created [ASSIGNED]
        ├── If linked to agency_equipment → equipment status = checked_out
        └── Employee notified (ASSET_ASSIGNED)
              │
              ▼
    Asset in use by employee
              │
              ▼
    HR processes return
        │
        ├── Asset status → [RETURNED]
        ├── returnedAt recorded
        ├── conditionOnReturn noted
        └── Linked equipment restored to available

    ── OR ──

    Asset reported lost/damaged → [LOST] / [DAMAGED]
```

---

## 6. Roles and Permissions

### 6.1 Permission Architecture

The HR module uses 26 permission keys under the `hr.*` namespace, organized into 9 functional groups. These follow the same scope hierarchy used throughout IRIS Agency OS:

- **Own (self):** Employee can access only their own records
- **Department:** Manager can access records within their department
- **All:** HR administrator or General Manager can access all records

### 6.2 Permission Keys

| Group | Permission Key | Description |
|-------|---------------|-------------|
| **Employee Profiles** | `hr.employees.view_own` | View own employee profile |
| | `hr.employees.view_dept` | View employee profiles in own department |
| | `hr.employees.view_all` | View all employee profiles |
| | `hr.employees.create` | Create new employee profiles |
| | `hr.employees.edit` | Edit employee profiles |
| **Leave** | `hr.leave.view_own` | View own leave requests and balance |
| | `hr.leave.view_dept` | View leave requests in own department |
| | `hr.leave.view_all` | View all leave requests |
| | `hr.leave.create` | Submit leave requests |
| | `hr.leave.approve` | Approve leave requests |
| | `hr.leave.reject` | Reject leave requests |
| | `hr.leave.cancel` | Cancel leave requests |
| **Attendance** | `hr.attendance.view_own` | View own attendance records |
| | `hr.attendance.view_dept` | View department attendance records |
| | `hr.attendance.view_all` | View all attendance records |
| | `hr.attendance.manage` | Manage attendance records and approve corrections |
| **Performance** | `hr.performance.view_own` | View own performance reviews |
| | `hr.performance.view_dept` | View department performance reviews |
| | `hr.performance.view_all` | View all performance reviews |
| | `hr.performance.manage` | Create, finalize, and manage performance reviews |
| **Assets** | `hr.assets.view` | View employee asset assignments |
| | `hr.assets.manage` | Assign, return, and manage employee assets |
| **Onboarding** | `hr.onboarding.manage` | Create and manage onboarding checklists |
| **Offboarding** | `hr.offboarding.manage` | Create and manage offboarding checklists |
| **Organization** | `hr.org.manage` | Manage teams and org structure |
| **Confidential** | `hr.confidential.view` | Access confidential HR records |

### 6.3 Role-Based Access Matrix

| Role | Employee Access | Leave Access | Attendance | Performance | Assets | On/Offboarding | Org | Confidential |
|------|----------------|-------------|------------|------------|--------|----------------|-----|-------------|
| **General Manager** | View all, Create, Edit | View all, Create, Approve, Reject, Cancel | View all, Manage | View all, Manage | View, Manage | Manage both | Manage | Yes |
| **Account Manager** | View dept | View dept, Create | View own | View dept | View | — | — | — |
| **Creative Director** | View dept, Edit | View dept, Create, Approve, Reject | View dept | View dept, Manage | View | — | — | — |
| **Art Director** | View own | View own, Create | View own | View own | — | — | — | — |
| **Designer** | View own | View own, Create | View own | View own | — | — | — | — |
| **Copywriter** | View own | View own, Create | View own | View own | — | — | — | — |
| **Social Manager** | View own | View own, Create | View own | View own | — | — | — | — |
| **Producer** | View own | View own, Create | View own | View own | — | — | — | — |
| **Videographer** | View own | View own, Create | View own | View own | — | — | — | — |
| **Finance Manager** | View own | View own, Create | View own | — | — | — | — | — |
| **Freelancer** | — | — | — | — | — | — | — | — |
| **Client** | — | — | — | — | — | — | — | — |

### 6.4 Permission Dependencies

Certain permissions require prerequisite permissions:

| Permission | Requires at least one of |
|-----------|-------------------------|
| `hr.leave.approve` | `hr.leave.view_dept`, `hr.leave.view_all` |
| `hr.leave.reject` | `hr.leave.view_dept`, `hr.leave.view_all` |
| `hr.performance.manage` | `hr.performance.view_dept`, `hr.performance.view_all` |
| `hr.employees.edit` | `hr.employees.view_all` |
| `hr.attendance.manage` | `hr.attendance.view_all` |
| `hr.assets.manage` | `hr.assets.view` |
| `hr.confidential.view` | `hr.employees.view_all` |

### 6.5 Admin-Only Permissions

The following permissions are flagged as dangerous and restricted to senior roles:

- `hr.confidential.view`
- `hr.onboarding.manage`
- `hr.offboarding.manage`
- `hr.org.manage`

---

## 7. Notifications and Audit Logs

### 7.1 HR Notification Types

Every significant HR event triggers an in-app notification (and optionally a push notification via FCM). The following 12 notification types are registered in `notificationService.ts`:

| Notification Type | Category | Severity | Trigger |
|------------------|----------|----------|---------|
| `LEAVE_REQUESTED` | `hr` | `warning` | Employee submits a leave request |
| `LEAVE_APPROVED` | `hr` | `info` | Manager approves a leave request |
| `LEAVE_REJECTED` | `hr` | `warning` | Manager rejects a leave request |
| `LEAVE_CANCELLED` | `hr` | `info` | Leave request is cancelled |
| `ONBOARDING_STARTED` | `hr` | `info` | HR initiates onboarding for a new hire |
| `OFFBOARDING_STARTED` | `hr` | `warning` | HR initiates offboarding for an employee |
| `ATTENDANCE_CORRECTION_REQUESTED` | `hr` | `warning` | Employee requests an attendance correction |
| `ATTENDANCE_CORRECTION_REVIEWED` | `hr` | `info` | Manager reviews an attendance correction |
| `PERFORMANCE_REVIEW_SUBMITTED` | `hr` | `info` | A performance review is submitted |
| `PERFORMANCE_REVIEW_FINALIZED` | `hr` | `info` | A performance review is finalized |
| `ASSET_ASSIGNED` | `hr` | `info` | An asset is assigned to an employee |
| `ASSET_RETURN_OVERDUE` | `hr` | `urgent` | An assigned asset is overdue for return |

### 7.2 Notification Routing

| Event | Notified Party |
|-------|---------------|
| Leave request submitted | Employee's direct manager |
| Leave approved/rejected/cancelled | The requesting employee |
| Onboarding/offboarding started | The affected employee |
| Attendance correction approved | The requesting employee |
| Performance review submitted | The reviewing manager |
| Performance review finalized | The reviewed employee |
| Asset assigned | The receiving employee |
| Asset overdue | HR administrators |

### 7.3 Audit Logging

All HR handler functions call `addAuditLog()`, which writes to the `audit_logs` Firestore collection. Each audit entry includes:

| Field | Content |
|-------|---------|
| Action type | e.g., `leave_requested`, `attendance_clock_in`, `onboarding_started`, `performance_review_finalized` |
| Entity type | e.g., `LeaveRequest`, `AttendanceRecord`, `OnboardingChecklist`, `PerformanceReview` |
| Entity ID | The Firestore document ID of the affected record |
| Description | Human-readable summary (e.g., "Ahmed requested annual leave for 5 days") |
| User ID | The authenticated user who performed the action |
| Timestamp | Server timestamp |

This creates a complete, queryable history of every HR action taken in the system.

---

## 8. Confidentiality and Security

### 8.1 Data Classification

HR data is treated as sensitive throughout the system:

| Data Category | Sensitivity | Access Level |
|--------------|------------|-------------|
| Employee personal information (national ID, personal email, phone) | High | HR administrators and the employee only |
| Salary grade | High | HR administrators only (`hr.confidential.view`) |
| Performance reviews | Medium-High | Employee, reviewer, and HR administrators |
| Leave requests | Medium | Employee, manager, and HR |
| Attendance records | Medium | Employee, manager, and HR |
| Onboarding/offboarding checklists | Medium-High | HR administrators only |
| Employee assets | Medium | Employee, HR, and asset managers |
| Employee status changes | High | Append-only, readable by authenticated users |

### 8.2 Access Control Enforcement

Access is enforced at three levels:

1. **Firestore Security Rules:** Each HR collection has explicit read/write rules referencing `isAuthenticated()` and `hasPermission()` checks. The `employee_status_changes` collection is append-only (create only, no update or delete).

2. **Application-Level RBAC:** Every UI component checks permissions via `checkPermission()` before rendering sensitive data or action buttons. Scope-based filtering ensures managers see only their department's data unless they have `*_all` permissions.

3. **UI Gating:** The On/Offboarding tab is hidden for users without `hr.onboarding.manage`. Profile edit forms are disabled for users without `hr.employees.edit` or self-edit rights. Performance review creation requires `hr.performance.manage`.

### 8.3 Security Principles

| Principle | Implementation |
|-----------|---------------|
| Least privilege | Default roles grant only self-view permissions; department and system-wide access requires explicit elevation |
| Audit trail | Every HR action is logged with actor, timestamp, and description |
| Append-only history | Employment status changes cannot be modified or deleted after creation |
| Separation of concerns | Employees can view their own data; managers can view their department; only HR/GM can view everything |
| Offboarding warning | The offboarding UI displays an explicit HR-sensitive audit warning |

---

## 9. Operational Use Cases

### 9.1 Adding a New Employee

1. **Admin** creates a user account through the Admin Hub (email, role, department)
2. **HR Manager** navigates to Team → Employees → opens the new user's profile drawer
3. HR fills in the Employee Profile form: full name, job title, employment type, join date, probation end date, emergency contact, work mode, direct manager
4. HR saves the profile → `employee_profiles` document created
5. HR navigates to On/Offboarding → clicks "Start Onboarding" for the new user
6. An `onboarding_checklists` document is created with 10 default steps
7. HR and relevant team members complete each step, tracking progress
8. When all steps are complete, the checklist status transitions to `completed`
9. HR assigns company assets (laptop, access card) through the Assets tab

### 9.2 Approving Annual Leave

1. **Employee** navigates to Team → Leave → New Request
2. Employee sees their balance cards (e.g., Annual: 16 remaining of 21)
3. Employee selects dates, enters reason, submits
4. Working days are calculated automatically (e.g., 5 weekdays)
5. Balance is validated (sufficient days available)
6. **Manager** receives a `LEAVE_REQUESTED` notification
7. Manager navigates to Team → Leave → Requests
8. Manager sees the pending request with employee name, dates, type, and day count
9. Manager clicks Approve → leave balance is deducted, employee is notified
10. The leave appears on the Leave Calendar for the approved dates

### 9.3 Investigating Attendance Issues

1. **HR Manager** navigates to Team → Attendance → Monthly
2. Filters to a specific department and month
3. Reviews summary statistics: total present days, absent days, late arrivals, total hours
4. Identifies an employee with multiple late arrivals
5. Clicks into the Corrections view to see if any correction requests have been submitted
6. If a correction is pending, reviews the original record vs. the requested change
7. Approves or rejects the correction based on the stated reason

### 9.4 Assigning Equipment to a Staff Member

1. **HR Manager** navigates to Team → Assets
2. Clicks "Assign Asset"
3. Selects the employee, asset category (e.g., `laptop`), enters asset name ("MacBook Pro 16-inch") and serial number
4. Submits → `employee_assets` document created with status `assigned`
5. If the asset is linked to `agency_equipment`, the production inventory is updated to `checked_out`
6. Employee receives an `ASSET_ASSIGNED` notification

### 9.5 Reviewing Team Availability Before Production Planning

1. **Producer** navigates to Team → Capacity
2. Reviews top-level metrics: Total Team (20), Available (85%), On Leave (3), Clocked In (15)
3. Checks the 7-Day Leave Forecast to see upcoming absences
4. Reviews department capacity bars to identify which departments are understaffed this week
5. Uses this data to schedule the production shoot with available team members

### 9.6 Running a Probation Review

1. **Manager** navigates to Team → Performance → clicks "New Review"
2. Selects the employee under probation
3. Enters the review period (e.g., first 90 days)
4. Completes scores across 8 categories for the manager assessment
5. Saves as draft → review is in `draft` status
6. Later, submits the review → status changes to `submitted`
7. After discussion with the employee, finalizes → status changes to `finalized`
8. Employee is notified and can view the review and add acknowledgment comments

---

## 10. Dashboards and Views

The HR module is organized into 8 primary tabs, each containing its own views and sub-navigation where applicable.

### Tab Structure

| Tab | Component | Sub-Views | Description |
|-----|-----------|-----------|-------------|
| **Employees** | `EmployeeDirectory` + `EmployeeProfileDrawer` | — | Filterable employee grid, profile detail drawer |
| **Org Structure** | `OrgStructureView` | Tree / Flat toggle | Department → Team → Member hierarchy |
| **Leave** | 4 sub-components | Requests, New Request, Calendar, My Balance | Full leave lifecycle management |
| **Attendance** | `AttendanceDashboard` + `AttendanceCorrectionForm` | Today, Monthly, Corrections | Clock in/out, summaries, correction workflows |
| **On/Offboarding** | `OnboardingWorkflow` + `OffboardingWorkflow` | — | Checklist-based lifecycle workflows |
| **Assets** | `AssetAssignment` | — | Asset CRUD, assign/return, overdue tracking |
| **Performance** | `PerformanceReviewList` + `PerformanceReviewForm` | List / Form toggle | Review management and scored evaluations |
| **Capacity** | `CapacityDashboard` | — | Workforce availability, forecasting, task distribution |

### Employee Profile Drawer

The employee profile drawer is a shared component that can be opened from any tab. When a user clicks "View Profile" on an employee card, the drawer slides in with the full profile form. This provides consistent access to employee details without navigating away from the current view.

### Leave Calendar

The Leave Calendar renders a monthly grid with colored indicators per leave type:

| Leave Type | Color |
|-----------|-------|
| Annual | Blue |
| Sick | Red |
| Unpaid | Gray |
| Emergency | Orange |
| Maternity | Pink |
| Paternity | Purple |
| Compensatory | Teal |
| Personal | Yellow |

---

## 11. Business Value

### Operational Impact

| Before | After |
|--------|-------|
| Employee records scattered across spreadsheets, emails, and chat messages | Single structured profile per employee with full employment history |
| Leave requests handled via email or verbal agreement | Tracked workflow with balance validation, approval chain, and calendar visualization |
| Attendance tracked manually or not at all | Real-time clock-in/out with overtime calculation and correction workflows |
| Onboarding ad-hoc, steps forgotten | Standardized 10-step checklist with progress tracking and accountability |
| Offboarding incomplete, security gaps | Structured process ensuring asset return, access revocation, and record archival |
| Equipment ownership unknown | Clear chain of custody with assign/return tracking |
| Performance feedback informal and undocumented | Scored evaluations with self and manager assessment across 8 categories |
| Workforce availability guesswork | Real-time capacity dashboard with leave forecasting |

### Strategic Value

- **Compliance readiness:** Structured records and audit trails support labor law compliance and internal audits.
- **Operational integration:** HR data feeds directly into capacity planning, production scheduling, and project staffing decisions within the same platform.
- **Manager empowerment:** Department heads have self-service access to their team's leave, attendance, and performance data without waiting for HR.
- **Employee self-service:** Employees can view their own profiles, submit leave, check attendance, and access performance reviews without HR intermediation.
- **Scalability:** The permission system and data model support growth from 10 to 200+ employees without architectural changes.

---

## 12. Future Expansion

The following areas represent natural extensions of the current HR module. The data model, permission system, and component architecture have been designed to accommodate these additions without structural changes.

| Expansion Area | Description | Prerequisite |
|---------------|-------------|-------------|
| **Payroll Integration** | Connect leave balances, attendance hours, and overtime to payroll calculation. Export payroll data to external accounting systems. | Final payroll processing step already exists in offboarding. |
| **Recruitment Pipeline** | Track job openings, candidates, interview stages, and hiring decisions. Convert accepted candidates to onboarding checklists. | Onboarding workflow already exists. |
| **Advanced Review Cycles** | Support quarterly, semi-annual, and annual review cycles with automatic scheduling. Add 360-degree feedback (peer reviews). | Performance review structure already supports `reviewCycle` and `reviewPeriodStart/End`. |
| **Compliance Records** | Track certifications, training completions, policy acknowledgments, and regulatory filings per employee. | Employee profile already has extensible notes and metadata fields. |
| **Disciplinary Records** | Document warnings, performance improvement plans, and disciplinary actions with confidential access controls. | `hr.confidential.view` permission already exists. |
| **Workforce Analytics** | Advanced dashboards for turnover rate, average tenure, department growth, leave utilization patterns, and performance score distributions. | All underlying data is already collected in Firestore. |
| **Document Management** | Attach and manage employment contracts, offer letters, NDAs, and certificates directly on employee profiles. | Firebase Storage integration already exists in the platform. |
| **Timesheet Integration** | Connect attendance records with task time logs from the Tasks module for cross-referenced productivity analysis. | Both `attendance_records` and `task_time_logs` collections exist. |
| **Leave Accrual Automation** | Automatically accrue leave balances monthly based on policy rules and carry-forward calculations. | `leave_policies` already defines `daysPerYear` and `carryForwardMax`. |

---

## 13. Summary

The HR Department module in IRIS Agency OS is a structured employee lifecycle management system. It is not a basic team directory or a simple leave tracker. It is a multi-functional HR operations platform that covers the complete employee journey — from onboarding through daily attendance, leave management, asset tracking, and performance evaluation, to offboarding.

The module is built on the same architectural foundations as every other IRIS module: real-time Firestore data, centralized state management, role-based access control with scope hierarchy, in-app and push notifications, and a comprehensive audit trail. This means HR data is not siloed — it integrates directly with capacity planning, production scheduling, and project resource allocation.

The system currently provides:

- **11 Firestore collections** dedicated to HR data
- **21 handler functions** covering the full spectrum of HR operations
- **26 permission keys** with own/department/all scope granularity
- **12 notification types** for real-time HR event communication
- **16 UI components** organized into 8 tabs with sub-navigation
- **7 leave policies** covering standard employment leave types
- **10-step onboarding and offboarding checklists** with progress tracking
- **8-category performance reviews** with self and manager assessment
- **Real-time capacity dashboard** connecting HR data to operational planning

The HR module is operational and ready for production use. Future expansion into payroll, recruitment, compliance, and advanced analytics can be built on top of the existing data model and permission framework without architectural changes.

---

*This document describes the HR Department module as implemented in IRIS Agency OS on the `development` branch. It reflects the current state of the codebase and should be updated as features are added or modified.*
