/**
 * Zod schema for Project entity.
 * Validates data before Firestore writes.
 */
import { z } from 'zod';

const ProjectStatusEnum = z.enum([
  'planning', 'active', 'on_hold', 'completed', 'cancelled',
  // Legacy string variants used in some parts of the app
  'Active', 'Completed', 'On Hold',
]);

const ProjectTypeEnum = z.enum(['campaign', 'retainer', 'one_time', 'internal']);

export const ProjectSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1, 'Project name is required'),
  client: z.string(), // denormalized client name
  code: z.string().optional(),
  type: ProjectTypeEnum,
  status: ProjectStatusEnum,

  brief: z.string(),
  objectives: z.string(),
  notes: z.string(),

  startDate: z.string(),
  endDate: z.string(),
  actualEndDate: z.string().optional(),

  budget: z.number().min(0),
  spent: z.number().min(0),
  currency: z.string(),
  deadline: z.string(),

  accountManagerId: z.string().min(1),
  projectManagerId: z.string().optional(),
  thumbnail: z.string().optional(),

  // Smart Project Creation
  monthKey: z.string().optional(),
  calendarMonthId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  workflowByType: z.object({
    VIDEO: z.string().optional(),
    PHOTO: z.string().optional(),
    MOTION: z.string().optional(),
  }).optional(),

  // Archive
  isArchived: z.boolean().optional(),
  archivedAt: z.string().nullable().optional(),
  archivedBy: z.string().nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ValidatedProject = z.infer<typeof ProjectSchema>;
