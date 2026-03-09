/**
 * Zod Schema barrel export.
 *
 * Usage:
 *   import { ClientSchema, TaskSchema, ProjectSchema } from '../schemas';
 *   const result = TaskSchema.safeParse(data);
 *   if (!result.success) console.error(result.error.flatten());
 */
export { ClientSchema, ClientContactSchema, type ValidatedClient } from './client';
export { ProjectSchema, type ValidatedProject } from './project';
export { TaskSchema, type ValidatedTask } from './task';
export {
  QuotationSchema, QuotationItemSchema,
  InvoiceSchema, InvoiceItemSchema,
  PaymentSchema,
  ExpenseSchema,
  type ValidatedQuotation,
  type ValidatedInvoice,
  type ValidatedPayment,
  type ValidatedExpense,
} from './finance';
