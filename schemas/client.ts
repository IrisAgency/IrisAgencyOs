/**
 * Zod schema for Client entity.
 * Validates data before Firestore writes.
 */
import { z } from 'zod';

export const ClientContactSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  role: z.string(),
  email: z.string().email(),
  phone: z.string(),
  isPrimary: z.boolean(),
});

export const ClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Client name is required'),
  industry: z.string(),
  email: z.string().email().or(z.literal('')),
  phone: z.string(),
  address: z.string(),
  website: z.string(),
  logo: z.string().optional(),
  notes: z.string(),
  status: z.enum(['active', 'inactive', 'lead']),
  createdAt: z.string(),
  updatedAt: z.string(),
  accountManagerId: z.string().min(1),
  contacts: z.array(ClientContactSchema),
});

export type ValidatedClient = z.infer<typeof ClientSchema>;
