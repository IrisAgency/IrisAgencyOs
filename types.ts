export enum UserRole {
  GENERAL_MANAGER = 'General Manager',
  CREATIVE_DIRECTOR = 'Creative Director',
  ART_DIRECTOR = 'Art Director',
  ACCOUNT_MANAGER = 'Account Manager',
  PRODUCER = 'Production Manager',
  DESIGNER = 'Designer',
  COPYWRITER = 'Copywriter',
  SOCIAL_MANAGER = 'Social Manager',
  CLIENT = 'Client'
}

export enum Department {
  MANAGEMENT = 'Management',
  CREATIVE = 'Creative',
  MARKETING = 'Marketing',
  PRODUCTION = 'Production',
  ACCOUNTS = 'Accounts'
}

export type UserStatus = 'active' | 'inactive' | 'on_leave';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: Department;
  avatar: string;
  passwordHash: string;
  forcePasswordChange: boolean;

  // HR Extended Fields
  jobTitle?: string;
  employeeCode?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  dateJoined?: string;
  location?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: 'present' | 'absent' | 'remote' | 'on_leave';
  checkInTime?: string;
  checkOutTime?: string;
}

export enum TaskStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  AWAITING_REVIEW = 'awaiting_review',
  REVISIONS_REQUIRED = 'revisions_required',
  APPROVED = 'approved',
  CLIENT_REVIEW = 'client_review',
  CLIENT_APPROVED = 'client_approved',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ArchiveReason {
  WORKFLOW_COMPLETED = 'workflow_completed',
  MANUAL_APPROVED = 'manual_approved',
  MANUAL_REJECTED = 'manual_rejected',
  USER_ARCHIVED = 'user_archived',
  PROJECT_ARCHIVED = 'project_archived'
}

export enum ClosureMode {
  WORKFLOW = 'workflow',
  MANUAL = 'manual'
}

export enum FinalOutcome {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

export type TaskType = 'design' | 'video' | 'photo' | 'motion' | 'post_production' | 'copywriting' | 'meeting' | 'production' | 'social_content' | 'social_publishing' | 'other';

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'website' | 'twitter' | 'other';

export interface ClientSocialLink {
  id: string;
  clientId: string;
  platform: SocialPlatform;
  url: string;
  label: string | null;      // for "other", user-defined name
  username: string | null;   // optional extracted handle
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ClientMeeting {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  date: string;                // ISO Date string
  durationMinutes: number | null;
  status: "scheduled" | "completed" | "cancelled";
  locationType: "online" | "office" | "client_office" | "other";
  locationDetails: string | null;
  organizerId: string;
  participantIds: string[];    // internal team members
  clientParticipants: string[]; // optional client-side attendees (names/emails)
  meetingFolderId: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ClientBrandAsset {
  id: string;
  clientId: string;
  category: string; // "logo" | "brand_book" | "colors" | "typography" | "templates" | "packaging" | "other"
  name: string;
  type: "file" | "link" | "text";
  fileId?: string | null;
  url?: string | null;
  value?: string; // For color hex values or text content
  notes?: string; // Usage guidelines
  description?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ClientMonthlyReport {
  id: string;
  clientId: string;
  month: string; // Format: "YYYY-MM" (e.g., "2026-01")
  title: string; // e.g., "January 2026 Report"
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo?: string; // URL or Base64
  notes: string;
  status: 'active' | 'inactive' | 'lead';
  createdAt: string;
  updatedAt: string;
  accountManagerId: string; // Links to User
  contacts: ClientContact[];
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'campaign' | 'retainer' | 'one_time' | 'internal';

export interface Project {
  id: string;
  clientId: string;        // reference to Client
  name: string;            // e.g. "Le Bon – Ramadan Campaign 2026"
  client: string;          // Denormalized name for display/compatibility
  code?: string;            // optional, e.g. "LB-RAM-26"
  type: ProjectType;
  status: ProjectStatus | 'Active' | 'Completed' | 'On Hold';

  brief: string;           // main description / objectives
  objectives: string;      // bullet-style text
  notes: string;           // internal notes

  startDate: string;
  endDate: string;    // planned end
  actualEndDate?: string;

  budget: number;   // planned budget
  spent: number;    // Calculated/Tracked
  currency: string;        // "USD", "IQD", etc.
  deadline: string; // Legacy field for dashboard compatibility

  accountManagerId: string; // User id
  projectManagerId?: string; // optional, could be same as account manager

  thumbnail?: string; // For visual flair

  // Smart Project Creation Fields
  monthKey?: string; // "YYYY-MM" - linked calendar month
  calendarMonthId?: string; // Reference to CalendarMonth
  memberIds?: string[]; // Team member user IDs
  workflowByType?: {
    VIDEO?: string; // WorkflowTemplate ID for video tasks
    PHOTO?: string; // WorkflowTemplate ID for photo tasks
    MOTION?: string; // WorkflowTemplate ID for motion tasks
  };

  // Archive Fields
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;        // User in the system
  roleInProject: string; // e.g. "Account Manager", "Creative Lead", "Producer"
  isExternal?: boolean;   // true if freelancer
  addedAt?: string;      // ISO date string when member was added
}

// Smart Project Creation - Dynamic Milestones
export type MilestoneType = 'VIDEO' | 'PHOTO' | 'MOTION' | 'POSTING';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  type: MilestoneType; // Content type for dynamic tracking
  targetCount: number; // Total tasks expected
  completedCount: number; // Tasks completed
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  ownerId?: string;
  status: "not_started" | "in_progress" | "completed" | "on_hold" | "blocked";
  startDate?: string;
  endDate?: string;
  dueDate: string; // Keeping for legacy, but endDate is preferred for ranges
  completedAt?: string;
  progressPercent: number;
  order: number;

  // Target-based Progress
  targetTaskCount?: number | null;   // e.g. 5; null = no target
  autoCompleteOnTarget?: boolean;    // if true, mark completed when target reached
}

export interface ProjectActivityLog {
  id: string;
  projectId: string;
  userId: string;          // who did this
  type: string;            // "status_change" | "new_task" | "file_uploaded" | "comment" | "milestone_completed"
  message: string;         // human-readable summary
  createdAt: string;
}

// --- TASK MANAGEMENT ENTITIES ---

export interface Task {
  id: string;
  projectId: string;       // reference to Project
  milestoneId?: string;    // reference to ProjectMilestone
  title: string;
  description: string | null;      // Detailed task description (supports Arabic/English)
  voiceOver: string | null;        // Voice over script (supports Arabic/English)
  textDirHint?: 'auto' | 'rtl' | 'ltr'; // Text direction hint for description/voiceOver
  department: Department;
  priority: Priority;
  taskType: TaskType;      // New field

  status: TaskStatus;

  startDate: string;
  dueDate: string;
  completedAt?: string;

  assigneeIds: string[]; // userIds
  createdBy: string;

  approvalPath: string[]; // array of userIds (legacy/fallback)
  workflowTemplateId?: string | null; // Dynamic workflow reference
  currentApprovalLevel: number; // index in approvalPath or workflow steps
  isClientApprovalRequired: boolean;

  estimatedHours?: number;

  // Smart Project Creation - Calendar & Delivery
  calendarItemId?: string | null; // Link to CalendarItem
  publishAt?: string | null; // Publish date from calendar
  deliveryDueAt?: string | null; // Delivery deadline (separate from publish)
  dynamicMilestoneId?: string | null; // Link to Milestone (for dynamic tracking)

  // Production Workflow Integration
  isProductionCopy?: boolean; // True if this is a production-generated task
  productionPlanId?: string | null; // Link to ProductionPlan
  sourceType?: 'CALENDAR' | 'MANUAL' | null; // Source of production task
  sourceCalendarItemId?: string | null; // Original calendar item if from calendar
  sourceTaskId?: string | null; // Original task if manually selected
  originalPublishAt?: string | null; // Original publish date for reference

  // Social Handover
  requiresSocialPost?: boolean;
  socialPlatforms?: SocialPlatform[];
  socialPostId?: string | null; // Link to SocialPost entity
  socialManagerId?: string | null; // User ID of the Social Manager
  publishingNotes?: string | null; // Notes for the Social Manager

  // Revision Logic
  revisionContext?: {
    active: boolean;
    requestedByUserId: string;
    requestedByStepId: string;
    assignedToUserId: string;
    requestedAt: string; // ISO Date
    message: string;
    cycle: number;
  } | null;
  
  // Legacy Revision Fields (Deprecated but kept for compatibility if needed)
  revisionAssignedTo?: string | null;
  revisionComment?: string | null;
  
  revisionHistory?: {
    cycle: number;
    stepLevel: number;
    requestedBy: string;
    assignedTo: string;
    comment: string;
    date: string;
    resolvedAt?: string;
  }[];

  // Archival Fields
  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null; // User ID who archived the task
  archiveReason?: ArchiveReason | null; // Reason for archiving

  // Manual Closure Fields
  closedAt?: string | null; // When the task was closed (manual or workflow)
  closedBy?: string | null; // User ID who closed the task
  closureMode?: ClosureMode | null; // How the task was closed
  finalOutcome?: FinalOutcome | null; // Final outcome of the task

  // Soft Delete Fields
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;

  attachments: AgencyFile[]; // Legacy attachments
  
  // References
  referenceLinks?: ReferenceLink[];
  referenceImages?: ReferenceImage[];

  client?: string; // Denormalized client name

  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface TaskTimeLog {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  logDate: string;
  note: string;
  // Automatic tracking fields
  eventType?: 'manual' | 'task_accepted' | 'task_started' | 'task_submitted' | 'task_approved' | 'task_rejected' | 'status_change' | 'assignment_changed';
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  isAutomatic?: boolean;
  timestamp?: string;
}

export interface TaskActivityLog {
  id: string;
  taskId: string;
  userId: string;
  type: 'status_change' | 'assignment_change' | 'approval_action' | 'comment' | 'file_upload' | 'time_log' | 'dependency_added';
  message: string;
  createdAt: string;
}

// --- DYNAMIC WORKFLOWS ---

export interface WorkflowStepTemplate {
  id: string;
  workflowTemplateId: string;
  order: number;               // 0, 1, 2...
  label: string;               // e.g. "Art Director Review"

  // Approver Logic (One must be set)
  roleId: string | null;       // System Role ID (e.g. 'r3' for Creative Director)
  projectRoleKey: string | null; // Project Role String (e.g. "Account Manager")
  specificUserId?: string | null; // Specific User ID (e.g. 'u123')
  useDepartmentHead: boolean;  // Not fully implemented yet
}

export interface WorkflowTemplate {
  id: string;
  name: string;                 // e.g. "Standard Creative Flow"
  description: string;

  // Auto-assignment rules
  departmentId: string | null;  // Matches Department enum values (as string)
  taskType: TaskType | null;

  status: 'active' | 'available' | 'system_protected';
  isDefault: boolean; // Deprecated

  steps: WorkflowStepTemplate[];
  requiresClientApproval: boolean;

  createdAt: string;
  updatedAt: string;
}

// --- APPROVAL WORKFLOW ENTITIES ---

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested' | 'revision_submitted' | 'waiting';

export interface ApprovalStep {
  id: string;
  taskId: string;
  milestoneId: string | null; // Linked to milestone
  approverId: string;        // which user must approve
  level: number;             // sequence index
  status: ApprovalStatus;
  reviewedAt?: string;
  comment?: string;          // optional review comment
  createdAt: string;
}

export interface ClientApproval {
  id: string;
  taskId: string;
  clientId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  comment?: string;
}

// --- PRODUCTION PLANNING ENTITIES ---

export type ProductionPlanStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
export type ProductionSourceType = 'CALENDAR' | 'MANUAL';
export type ProductionArchiveReason = 'user_deleted' | 'plan_superseded' | null;

export interface ProductionConflictOverride {
  userName: string;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

export interface ProductionPlan {
  id: string;
  clientId: string;
  clientName: string; // Denormalized for quick display
  name: string; // e.g., "Client Name - Jan 15 Production"
  productionDate: string; // ISO date string

  // Content Selection
  calendarItemIds: string[]; // Selected calendar items
  manualTaskIds: string[]; // Manually selected tasks

  // Team Assignment
  teamMemberIds: string[];
  conflictOverrides: Record<string, ProductionConflictOverride>; // userId -> override info

  // Generated Tasks Tracking
  generatedTaskIds: string[]; // IDs of production tasks created

  // Status & Archival
  status: ProductionPlanStatus;
  isArchived: boolean;
  archivedAt: string | null;
  archivedBy: string | null; // User ID
  archiveReason: ProductionArchiveReason;
  canRestoreUntil: string | null; // 30 days from archival

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionAssignment {
  id: string;
  productionPlanId: string;
  userId: string;
  userName: string; // Denormalized
  productionDate: string;
  planName: string; // Denormalized
  clientName: string; // Denormalized
  itemCount: number; // Total calendar + manual items
  status: ProductionPlanStatus;
  createdAt: string;
}

export interface ProductionTask extends Task {
  isProductionCopy: true;
  productionPlanId: string;
  sourceType: ProductionSourceType;
  sourceCalendarItemId: string | null;
  sourceTaskId: string | null;
  originalPublishAt: string | null;
}


// --- FILE & ASSET MANAGEMENT ENTITIES ---

export type FileCategory = 'video' | 'image' | 'document' | 'design' | 'presentation' | 'spreadsheet' | 'archive' | 'link' | 'strategy' | 'other';

export interface AgencyFile {
  id: string;
  projectId: string;          // required
  clientId?: string | null;   // client association
  taskId?: string | null;     // optional
  folderId?: string | null;   // optional
  uploaderId: string;         // User who uploaded
  name: string;
  type: string;               // MIME type: image/jpeg, video/mp4, etc.
  size: number;               // in bytes
  url: string;                // storage path URL (mocked)
  thumbnailUrl?: string;      // optional thumbnail
  version: number;            // file version
  isDeliverable: boolean;     // true if final to client

  // Enhanced Categorization
  category?: FileCategory;    // computed category based on type
  originalName?: string;      // preserve original upload name

  // Archival Fields
  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  tags: string[];
  createdAt: string;
}

export type FolderType =
  | 'client_root'
  | 'project'
  | 'task'
  | 'meeting'
  | 'strategy'
  | 'archive'
  | 'videos'
  | 'photos'
  | 'documents'
  | 'deliverables';

export interface FileFolder {
  id: string;
  projectId: string | null; // Changed to nullable to support Client root archives
  clientId?: string | null; // Added for Client archives
  parentId: string | null;
  name: string;

  // Archival Fields
  isArchiveRoot: boolean;
  isTaskArchiveFolder: boolean;
  isProjectArchiveFolder?: boolean;
  isMeetingFolder?: boolean; // Added
  meetingId?: string | null; // Added
  taskId?: string | null;

  // Enhanced Hierarchy Fields
  folderType?: FolderType;
  linkedEntityType?: 'client' | 'project' | 'task' | 'meeting';
  linkedEntityId?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  uploaderId: string;
  createdAt: string;
  url: string;
  size: number;
}

export interface FileActivityLog {
  id: string;
  fileId: string;
  userId: string;
  action: "uploaded" | "updated" | "deleted" | "approved" | "downloaded" | "moved";
  message: string;
  createdAt: string;
}

// --- PRODUCTION ENTITIES ---

export interface ProductionAsset {
  // Legacy support for App.tsx state
  id: string;
  name: string;
  type: 'Shot List' | 'Call Sheet' | 'Location' | 'Equipment';
  status: 'Draft' | 'Approved' | 'Pending';
  date: string;
}

export interface Shot {
  id: string;
  shotListId: string;
  shotNumber: number;
  description: string;
  cameraMovement: string; // "Static", "Pan", "Tracking"
  framing: string; // "Wide", "Close-up"
  duration: string;
  equipment: string[];
  notes: string;
}

export interface ShotList {
  id: string;
  projectId: string;
  taskId: string | null;
  name: string;
  description: string;
  createdBy: string;
  date: string | null;
  locationId: string | null;
  shots: Shot[];
  createdAt: string;
}

export interface CallSheetCrewMember {
  id: string;
  callSheetId: string;
  userId: string | null;
  role: string;
  phone: string;
  callTime: string;
}

export interface CallSheet {
  id: string;
  projectId: string;
  date: string;
  callTime: string;
  locationId: string;
  productionNotes: string;
  crew: CallSheetCrewMember[];
  equipmentList: string[]; // equipment IDs
  status: 'Draft' | 'Published';
  createdBy: string;
  createdAt: string;
}

export interface AgencyLocation {
  id: string;
  projectId: string | null;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  notes: string;
  permitsRequired: boolean;
  mapUrl?: string; // Mock map image
}

export interface AgencyEquipment {
  id: string;
  name: string;
  category: 'Camera' | 'Lens' | 'Lighting' | 'Audio' | 'Grip' | 'Drone';
  serialNumber: string;
  status: 'available' | 'checked_out' | 'maintenance' | 'lost';
  checkedOutBy?: string; // userId
  checkedOutAt?: string;
  nextMaintenance: string | null;
}

// --- VENDORS & FREELANCERS ENTITIES ---

export type VendorType = 'rental' | 'location' | 'printing' | 'catering' | 'other';

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber?: string;
  paymentTerms?: string; // e.g. "Net 30"
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type RateType = 'hourly' | 'daily' | 'per_project';

export interface Freelancer {
  id: string;
  name: string;
  specialization: string; // e.g. "Video Editor", "Colorist"
  email: string;
  phone: string;
  location: string;
  portfolioUrl?: string;
  socialLinks?: string[];
  rateType: RateType;
  defaultRate: number;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FreelancerAssignment {
  id: string;
  freelancerId: string;
  projectId: string;
  taskId?: string | null;
  role: string;
  startDate?: string;
  endDate?: string;
  agreedRateType: RateType;
  agreedRate: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
}

export interface VendorServiceOrder {
  id: string;
  projectId: string;
  vendorId: string;
  orderNumber: string;
  date: string;
  serviceDescription: string;
  amount: number;
  currency: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  createdBy: string;
}

// --- MARKETING STRATEGY ENTITIES ---

export interface ClientMarketingStrategy {
  id: string;
  clientId: string;          // link to Client

  year: number;              // 2025
  month: number;             // 1–12
  monthLabel: string;        // "January 2025" (for UI)

  title: string;             // "Q1 Content Strategy", "Ramadan Campaign Plan"

  type: "file" | "link";

  // if type = "file"
  fileId: string | null;     // reference to Files/Assets module

  // if type = "link"
  url: string | null;        // Notion, Google Doc, Figma, etc.

  notes: string | null;      // optional short description

  createdBy: string;
  createdAt: string;         // ISO Date string
  updatedAt: string;         // ISO Date string
}

export interface ProjectMarketingAsset {
  id: string;
  projectId: string;        // linked project
  category: string;         // "strategy_doc", "media_plan", "content_calendar", "presentation", "other"
  name: string;             // "Main Strategy Deck", "Media Plan V1", "Content Calendar"
  type: "file" | "link";
  fileId: string | null;    // if type = "file", link to Files module
  url: string | null;       // if type = "link", e.g. Notion, Google Drive, Figma
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// --- FINANCE ENTITIES ---

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  projectId: string;
  clientId: string;
  quotationNumber: string; // QUO-2025-0001
  date: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  createdBy: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  projectId: string;
  clientId: string;
  invoiceNumber: string; // INV-2025-0234
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;    // sum of payments
  balance: number; // total - paid
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
  notes: string;
  createdBy: string;
  createdAt: string;

  // Legacy/Denormalized fields for backward compatibility with old mocks
  client?: string;
  amount?: number; // mapped to total
}

export interface Payment {
  id: string;
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
  type?: "client" | "vendor" | "freelancer"; // extended type
  vendorId?: string;
  freelancerId?: string;
  paymentNumber: string; // PAY-2025-xxxx
  amount: number;
  date: string;
  method: "cash" | "bank_transfer" | "credit_card" | "cheque";
  reference: string;
  note: string;
  createdBy: string;
}

export interface Expense {
  id: string;
  projectId: string | null; // null for general agency expense
  vendor: string;
  amount: number;
  date: string;
  category: string; // "equipment_rent", "crew", "location", "software", "office"
  description: string;
  attachmentUrl?: string;
  createdBy: string;
}

// --- NOTIFICATIONS & REAL-TIME ---

export type NotificationType =
  // Tasks & Workflow
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_SUBMITTED_FOR_REVIEW'
  | 'TASK_REVISION_REQUESTED'
  | 'TASK_APPROVED_STEP'
  | 'TASK_REJECTED_STEP'
  | 'TASK_APPROVED_FINAL'
  | 'TASK_ARCHIVED'
  | 'TASK_COMMENT_MENTION'
  | 'TASK_COMMENT_REPLY'
  // Approvals
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_REMINDER'
  | 'APPROVAL_ESCALATION'
  // Posting & Captions
  | 'POST_CREATED_FROM_TASK'
  | 'POST_ASSIGNED'
  | 'POST_CAPTION_SUBMITTED'
  | 'POST_REVISION_REQUESTED'
  | 'POST_APPROVED'
  | 'POST_SCHEDULED'
  | 'POST_PUBLISHING_TODAY'
  | 'POST_PUBLISHED'
  // Clients & Projects
  | 'NEW_CLIENT_CREATED'
  | 'PROJECT_CREATED'
  | 'PROJECT_ARCHIVED'
  | 'MILESTONE_STARTED'
  | 'MILESTONE_AT_RISK'
  // Meetings
  | 'MEETING_SCHEDULED'
  | 'MEETING_REMINDER_24H'
  | 'MEETING_REMINDER_1H'
  | 'MINUTES_UPLOADED'
  // Finance
  | 'INVOICE_CREATED'
  | 'INVOICE_DUE_SOON'
  | 'PAYMENT_RECORDED'
  | 'BUDGET_EXCEEDED'
  // Legacy
  | 'task_assigned'
  | 'task_status_changed'
  | 'approval_request'
  | 'comment_mention'
  | 'invoice_overdue'
  | 'production_update'
  | 'system';

export type NotificationSeverity = 'info' | 'warning' | 'urgent';
export type NotificationCategory = 'tasks' | 'approvals' | 'posting' | 'meetings' | 'finance' | 'projects' | 'system';
export type NotificationEntityType = 'task' | 'project' | 'client' | 'post' | 'meeting' | 'invoice' | 'milestone';

export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  
  severity: NotificationSeverity;
  category: NotificationCategory;
  
  entityType?: NotificationEntityType;
  entityId?: string;
  
  actionUrl?: string;
  actions?: NotificationAction[];
  
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  
  // Grouping & deduplication
  groupKey?: string;
  dedupeKey?: string;
  
  // Legacy support
  link?: string;
}

export interface NotificationPreference {
  userId: string;
  
  // Muting options
  mutedCategories: NotificationCategory[];
  mutedProjects: string[];
  severityThreshold: NotificationSeverity;
  
  // Delivery channels
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  
  // Legacy fields
  taskAssigned?: boolean;
  taskStatusChanged?: boolean;
  approvalRequests?: boolean;
  commentsMentions?: boolean;
  financeUpdates?: boolean;
  productionUpdates?: boolean;
}

// --- ADMIN & MANAGEMENT ---

export interface FileRef {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface AppBranding {
  id: string;
  appName: string;
  tagline?: string;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  sidebarColor: string;

  // Typography
  fontFamily: string;

  // Assets
  logoLight?: FileRef | null;
  logoDark?: FileRef | null;
  favicon?: FileRef | null;
  sidebarIcon?: FileRef | null;
  loginBackground?: FileRef | null;

  // Legacy fields (for backward compatibility)
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Metadata
  updatedBy: string;
  updatedAt: string;
}

export interface Permission {
  code: string;       // e.g. "projects.view"
  module: string;     // e.g. "Projects"
  name: string;       // e.g. "View Projects"
  description: string;
}

export interface RoleDefinition {
  id: string;
  name: string;        // matches UserRole enum values
  description: string;
  permissions: string[]; // list of permission codes
  isAdmin: boolean;
}

export interface AppSettings {
  id: string;
  timezone: string;
  defaultCurrency: string;
  taxRateDefault: number;
  security: {
    requireStrongPassword: boolean;
    sessionTimeoutMinutes: number;
    enable2FA: boolean;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  sourceTaskId: string;        // the original creative task id
  projectId: string;
  clientId: string;
  title: string;               // derived from task title
  status: "PENDING" | "READY" | "SCHEDULED" | "PUBLISHED" | "REVISION_REQUESTED";
  platforms: SocialPlatform[];         // ["instagram", "facebook", "tiktok", etc.]
  caption: string | null;
  publishAt: string | null;    // ISO Date string
  timezone: string | null;
  socialManagerId: string | null;      // Social Manager / Copywriter
  notesFromTask: string | null; // Notes passed from the task
  
  // Revision System
  revisionContext?: {
    active: boolean;
    requestedByUserId: string;
    assignedToUserId: string;
    requestedAt: string;
    message: string;
    cycle: number;
  } | null;

  revisionHistory?: {
    cycle: number;
    requestedBy: string;
    assignedTo: string;
    comment: string;
    date: string;
    resolvedAt?: string;
  }[];

  // Archival Fields
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentDefinition {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  memberIds: string[];
  defaultRoles: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  linkedEntityId?: string; // ID of client, project, or task
  linkedEntityType?: 'client' | 'project' | 'task';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceLink {
  id: string;
  title: string;
  url: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface ReferenceImage {
  id: string;
  title?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageProvider: "firebase";
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ============================================================================
// CALENDAR DEPARTMENT
// ============================================================================

export type CalendarContentType = 'VIDEO' | 'PHOTO' | 'MOTION';

export interface CalendarReferenceLink {
  title: string;
  url: string;
}

export interface CalendarReferenceFile {
  fileName: string;
  storagePath: string;
  downloadURL: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CalendarMonth {
  id: string;
  clientId: string;
  monthKey: string; // "YYYY-MM"
  title: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarItem {
  id: string;
  calendarMonthId: string;
  clientId: string;
  monthKey: string;
  type: CalendarContentType;
  seqNumber: number;
  autoName: string;
  primaryBrief: string;
  notes: string;
  referenceLinks: CalendarReferenceLink[];
  referenceFiles: CalendarReferenceFile[];
  publishAt: string;
  
  // Smart Project Creation - Task Link
  taskId?: string | null; // Link to generated delivery task
  
  // Archive
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
