/**
 * Zod schema for Task entity.
 * Validates data before Firestore writes.
 *
 * This schema covers the full Task interface including production,
 * social handover, revision, archive, QC, and soft-delete fields.
 */
import { z } from 'zod';

const DepartmentEnum = z.enum(['Management', 'Creative', 'Marketing', 'Production', 'Accounts']);

const PriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

const TaskTypeEnum = z.enum([
  'design', 'video', 'photo', 'motion', 'post_production',
  'copywriting', 'meeting', 'production', 'social_content',
  'social_publishing', 'other',
]);

const TaskStatusEnum = z.enum([
  'new', 'assigned', 'in_progress', 'awaiting_review',
  'revisions_required', 'approved', 'client_review',
  'client_approved', 'completed', 'archived',
]);

const SocialPlatformEnum = z.enum([
  'instagram', 'facebook', 'linkedin', 'tiktok',
  'youtube', 'website', 'twitter', 'other',
]);

const ArchiveReasonEnum = z.enum([
  'workflow_completed', 'manual_approved', 'manual_rejected',
  'user_archived', 'project_archived',
]);

const ClosureModeEnum = z.enum(['workflow', 'manual']);
const FinalOutcomeEnum = z.enum(['approved', 'rejected', 'completed']);

const ReferenceLinkSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  url: z.string().url(),
  note: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
});

const ReferenceImageSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  storageProvider: z.literal('firebase'),
  storagePath: z.string(),
  downloadUrl: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
});

const DeliveryLinkSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  label: z.string(),
  type: z.enum(['video', 'image', 'pdf', 'document', 'other']).optional(),
  driveFileId: z.string().nullable().optional(),
  addedBy: z.string(),
  addedAt: z.string(),
});

const RevisionContextSchema = z.object({
  active: z.boolean(),
  requestedByUserId: z.string(),
  requestedByStepId: z.string(),
  assignedToUserId: z.string(),
  requestedAt: z.string(),
  message: z.string(),
  cycle: z.number().int().min(1),
}).nullable().optional();

const RevisionHistoryEntrySchema = z.object({
  cycle: z.number().int(),
  stepLevel: z.number().int(),
  requestedBy: z.string(),
  assignedTo: z.string(),
  comment: z.string(),
  date: z.string(),
  resolvedAt: z.string().optional(),
});

const TaskQCBlockSchema = z.object({
  enabled: z.boolean(),
  reviewers: z.array(z.string()),
  requiredApprovals: z.array(z.string()),
  status: z.string(), // QCStatus enum is complex, keep flexible
  lastUpdatedAt: z.string(),
}).optional();

const AgencyFileSchema = z.object({
  id: z.string().min(1),
  projectId: z.string(),
  clientId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  folderId: z.string().nullable().optional(),
  uploaderId: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  version: z.number(),
  isDeliverable: z.boolean(),
  category: z.string().optional(),
  originalName: z.string().optional(),
  isArchived: z.boolean(),
  archivedAt: z.string().nullable().optional(),
  archivedBy: z.string().nullable().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  milestoneId: z.string().optional(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().nullable(),
  voiceOver: z.string().nullable(),
  textDirHint: z.enum(['auto', 'rtl', 'ltr']).optional(),
  department: DepartmentEnum,
  priority: PriorityEnum,
  taskType: TaskTypeEnum,

  status: TaskStatusEnum,

  startDate: z.string(),
  dueDate: z.string(),
  completedAt: z.string().optional(),

  assigneeIds: z.array(z.string()),
  createdBy: z.string().min(1),

  approvalPath: z.array(z.string()),
  workflowTemplateId: z.string().nullable().optional(),
  currentApprovalLevel: z.number().int().min(0),
  isClientApprovalRequired: z.boolean(),

  estimatedHours: z.number().min(0).optional(),

  // Smart Project Creation
  calendarItemId: z.string().nullable().optional(),
  publishAt: z.string().nullable().optional(),
  deliveryDueAt: z.string().nullable().optional(),
  dynamicMilestoneId: z.string().nullable().optional(),

  // Production
  isProductionCopy: z.boolean().optional(),
  productionPlanId: z.string().nullable().optional(),
  sourceType: z.enum(['CALENDAR', 'MANUAL']).nullable().optional(),
  sourceCalendarItemId: z.string().nullable().optional(),
  sourceTaskId: z.string().nullable().optional(),
  originalPublishAt: z.string().nullable().optional(),

  // Social Handover
  requiresSocialPost: z.boolean().optional(),
  socialPlatforms: z.array(SocialPlatformEnum).optional(),
  socialPostId: z.string().nullable().optional(),
  socialManagerId: z.string().nullable().optional(),
  publishingNotes: z.string().nullable().optional(),

  // Revisions
  revisionContext: RevisionContextSchema,
  revisionAssignedTo: z.string().nullable().optional(),
  revisionComment: z.string().nullable().optional(),
  revisionHistory: z.array(RevisionHistoryEntrySchema).optional(),

  // Archive
  isArchived: z.boolean(),
  archivedAt: z.string().nullable().optional(),
  archivedBy: z.string().nullable().optional(),
  archiveReason: ArchiveReasonEnum.nullable().optional(),

  // Manual Closure
  closedAt: z.string().nullable().optional(),
  closedBy: z.string().nullable().optional(),
  closureMode: ClosureModeEnum.nullable().optional(),
  finalOutcome: FinalOutcomeEnum.nullable().optional(),

  // Soft Delete
  isDeleted: z.boolean().optional(),
  deletedAt: z.string().nullable().optional(),
  deletedBy: z.string().nullable().optional(),

  attachments: z.array(AgencyFileSchema),

  referenceLinks: z.array(ReferenceLinkSchema).optional(),
  referenceImages: z.array(ReferenceImageSchema).optional(),
  deliveryLinks: z.array(DeliveryLinkSchema).optional(),

  client: z.string().optional(),

  qc: TaskQCBlockSchema,
  qcOverride: z.enum(['force_enable', 'force_disable']).nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ValidatedTask = z.infer<typeof TaskSchema>;
