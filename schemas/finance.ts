/**
 * Zod schemas for Finance entities.
 * Validates data before Firestore writes.
 */
import { z } from 'zod';

// ─── Quotation ───────────────────────────────

export const QuotationItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export const QuotationSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  quotationNumber: z.string().min(1),
  date: z.string(),
  items: z.array(QuotationItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  notes: z.string(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']),
  createdBy: z.string().min(1),
  createdAt: z.string(),
});

// ─── Invoice ─────────────────────────────────

export const InvoiceItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export const InvoiceSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  date: z.string(),
  dueDate: z.string(),
  items: z.array(InvoiceItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  paid: z.number().min(0),
  balance: z.number(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']),
  notes: z.string(),
  createdBy: z.string().min(1),
  createdAt: z.string(),
  // Legacy/denormalized
  client: z.string().optional(),
  amount: z.number().optional(),
});

// ─── Payment ─────────────────────────────────

export const PaymentSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  invoiceId: z.string().optional(),
  type: z.enum(['client', 'vendor', 'freelancer']).optional(),
  vendorId: z.string().optional(),
  freelancerId: z.string().optional(),
  paymentNumber: z.string().min(1),
  amount: z.number().min(0),
  date: z.string(),
  method: z.enum(['cash', 'bank_transfer', 'credit_card', 'cheque']),
  reference: z.string(),
  note: z.string(),
  createdBy: z.string().min(1),
});

// ─── Expense ─────────────────────────────────

export const ExpenseSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().nullable(),
  vendor: z.string().min(1, 'Vendor name is required'),
  amount: z.number().min(0),
  date: z.string(),
  category: z.string().min(1),
  description: z.string(),
  attachmentUrl: z.string().optional(),
  createdBy: z.string().min(1),
});

// ─── Inferred types ──────────────────────────

export type ValidatedQuotation = z.infer<typeof QuotationSchema>;
export type ValidatedInvoice = z.infer<typeof InvoiceSchema>;
export type ValidatedPayment = z.infer<typeof PaymentSchema>;
export type ValidatedExpense = z.infer<typeof ExpenseSchema>;
