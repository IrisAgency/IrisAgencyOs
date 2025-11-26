export enum UserRole {
  GENERAL_MANAGER = 'General Manager',
  CREATIVE_DIRECTOR = 'Creative Director',
  ART_DIRECTOR = 'Art Director',
  ACCOUNT_MANAGER = 'Account Manager',
  PRODUCER = 'Production Manager',
  DESIGNER = 'Designer',
  COPYWRITER = 'Copywriter',
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

export type TaskType = 'design' | 'video' | 'photo' | 'motion' | 'post_production' | 'copywriting' | 'meeting' | 'production' | 'social_content' | 'other';

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  website: string;
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

  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;        // User in the system
  roleInProject: string; // e.g. "Account Manager", "Creative Lead", "Producer"
  isExternal: boolean;   // true if freelancer
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
  description: string;
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
  
  // Revision Logic
  revisionAssignedTo?: string | null;
  revisionComment?: string | null;
  revisionHistory?: {
    stepLevel: number;
    requestedBy: string;
    assignedTo: string;
    comment: string;
    date: string;
  }[];

  // Archival Fields
  isArchived: boolean;
  archivedAt?: string | null;

  // Soft Delete Fields
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  
  attachments: string[]; // references to File ids (mocked for now)
  
  // Legacy/Compatibility fields
  client?: string; // Denormalized for dashboard
  
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

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested' | 'waiting';

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

// --- FILE & ASSET MANAGEMENT ENTITIES ---

export interface AgencyFile {
  id: string;
  projectId: string;          // required
  taskId?: string | null;     // optional
  folderId?: string | null;   // optional
  uploaderId: string;         // User who uploaded
  name: string;               
  type: string;               // image, video, audio, pdf, doc, ai, psd, zip, etc.
  size: number;               // in bytes
  url: string;                // storage path URL (mocked)
  thumbnailUrl?: string;      // optional thumbnail
  version: number;            // file version
  isDeliverable: boolean;     // true if final to client
  
  // Archival Fields
  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  tags: string[];             
  createdAt: string;
}

export interface FileFolder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  
  // Archival Fields
  isArchiveRoot: boolean;
  isTaskArchiveFolder: boolean;
  taskId?: string | null;
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
  | 'task_assigned' 
  | 'task_status_changed' 
  | 'approval_request' 
  | 'comment_mention' 
  | 'invoice_overdue' 
  | 'production_update' 
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string; // "Task" | "Project" | "Invoice"
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationPreference {
  userId: string;
  taskAssigned: boolean;
  taskStatusChanged: boolean;
  approvalRequests: boolean;
  commentsMentions: boolean;
  financeUpdates: boolean;
  productionUpdates: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

// --- ADMIN & MANAGEMENT ---

export interface AppBranding {
  id: string;
  appName: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  primaryColor: string;      // HEX
  secondaryColor: string;
  sidebarColor: string;
  backgroundColor: string;
  textColor: string;
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
