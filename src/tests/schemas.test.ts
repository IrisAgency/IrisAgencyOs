/**
 * Tests for Zod schemas — validates core entity shapes.
 */
import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  ProjectSchema,
  TaskSchema,
  QuotationSchema,
  InvoiceSchema,
  PaymentSchema,
  ExpenseSchema,
} from '../../schemas';

// ─── Helpers ─────────────────────────────────

const now = new Date().toISOString();

const validClient = {
  id: 'c1',
  name: 'Acme Corp',
  industry: 'Tech',
  email: 'hello@acme.com',
  phone: '+1234567890',
  address: '123 Main St',
  website: 'https://acme.com',
  notes: '',
  status: 'active' as const,
  createdAt: now,
  updatedAt: now,
  accountManagerId: 'u1',
  contacts: [],
};

const validProject = {
  id: 'p1',
  clientId: 'c1',
  name: 'Q1 Campaign',
  client: 'Acme Corp',
  type: 'campaign' as const,
  status: 'active' as const,
  brief: 'Campaign brief',
  objectives: 'Increase awareness',
  notes: '',
  startDate: now,
  endDate: now,
  budget: 50000,
  spent: 12000,
  currency: 'USD',
  deadline: now,
  accountManagerId: 'u1',
  createdAt: now,
  updatedAt: now,
};

const validTask = {
  id: 't1',
  projectId: 'p1',
  title: 'Design hero banner',
  description: null,
  voiceOver: null,
  department: 'Creative' as const,
  priority: 'high' as const,
  taskType: 'design' as const,
  status: 'in_progress' as const,
  startDate: now,
  dueDate: now,
  assigneeIds: ['u2'],
  createdBy: 'u1',
  approvalPath: ['u3'],
  currentApprovalLevel: 0,
  isClientApprovalRequired: false,
  isArchived: false,
  attachments: [],
  createdAt: now,
  updatedAt: now,
};

// ─── Client ──────────────────────────────────

describe('ClientSchema', () => {
  it('accepts a valid client', () => {
    expect(ClientSchema.safeParse(validClient).success).toBe(true);
  });

  it('rejects client without name', () => {
    const result = ClientSchema.safeParse({ ...validClient, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects client with invalid status', () => {
    const result = ClientSchema.safeParse({ ...validClient, status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('rejects client with invalid email', () => {
    const result = ClientSchema.safeParse({ ...validClient, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts empty string email (some clients may not have email)', () => {
    const result = ClientSchema.safeParse({ ...validClient, email: '' });
    expect(result.success).toBe(true);
  });
});

// ─── Project ─────────────────────────────────

describe('ProjectSchema', () => {
  it('accepts a valid project', () => {
    expect(ProjectSchema.safeParse(validProject).success).toBe(true);
  });

  it('rejects project without name', () => {
    const result = ProjectSchema.safeParse({ ...validProject, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects project with invalid type', () => {
    const result = ProjectSchema.safeParse({ ...validProject, type: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects negative budget', () => {
    const result = ProjectSchema.safeParse({ ...validProject, budget: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts legacy status strings (Active, Completed)', () => {
    expect(ProjectSchema.safeParse({ ...validProject, status: 'Active' }).success).toBe(true);
    expect(ProjectSchema.safeParse({ ...validProject, status: 'Completed' }).success).toBe(true);
  });

  it('accepts optional archive fields', () => {
    const archived = { ...validProject, isArchived: true, archivedAt: now, archivedBy: 'u1' };
    expect(ProjectSchema.safeParse(archived).success).toBe(true);
  });
});

// ─── Task ────────────────────────────────────

describe('TaskSchema', () => {
  it('accepts a valid task', () => {
    expect(TaskSchema.safeParse(validTask).success).toBe(true);
  });

  it('rejects task without title', () => {
    const result = TaskSchema.safeParse({ ...validTask, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects task with invalid department', () => {
    const result = TaskSchema.safeParse({ ...validTask, department: 'HR' });
    expect(result.success).toBe(false);
  });

  it('rejects task with invalid priority', () => {
    const result = TaskSchema.safeParse({ ...validTask, priority: 'urgent' });
    expect(result.success).toBe(false);
  });

  it('accepts task with revision context', () => {
    const withRevision = {
      ...validTask,
      revisionContext: {
        active: true,
        requestedByUserId: 'u3',
        requestedByStepId: 's1',
        assignedToUserId: 'u2',
        requestedAt: now,
        message: 'Please fix colors',
        cycle: 1,
      },
    };
    expect(TaskSchema.safeParse(withRevision).success).toBe(true);
  });

  it('accepts task with null revision context', () => {
    const result = TaskSchema.safeParse({ ...validTask, revisionContext: null });
    expect(result.success).toBe(true);
  });

  it('accepts task with all optional fields populated', () => {
    const full = {
      ...validTask,
      milestoneId: 'ms1',
      estimatedHours: 8,
      calendarItemId: 'ci1',
      publishAt: now,
      deliveryDueAt: now,
      isProductionCopy: true,
      productionPlanId: 'pp1',
      sourceType: 'CALENDAR' as const,
      requiresSocialPost: true,
      socialPlatforms: ['instagram', 'tiktok'] as const,
      isDeleted: false,
      qc: { enabled: true, reviewers: ['u3'], requiredApprovals: ['u3'], status: 'PENDING', lastUpdatedAt: now },
      referenceLinks: [{ id: 'rl1', title: 'Ref', url: 'https://example.com', createdBy: 'u1', createdAt: now }],
      deliveryLinks: [{ id: 'dl1', url: 'https://drive.google.com/file/123', label: 'Final Video', addedBy: 'u1', addedAt: now }],
    };
    expect(TaskSchema.safeParse(full).success).toBe(true);
  });
});

// ─── Finance: Quotation ──────────────────────

describe('QuotationSchema', () => {
  const validQuotation = {
    id: 'q1',
    projectId: 'p1',
    clientId: 'c1',
    quotationNumber: 'QUO-0001',
    date: now,
    items: [{ id: 'qi1', description: 'Video production', quantity: 1, unitPrice: 5000, total: 5000 }],
    subtotal: 5000,
    discount: 0,
    tax: 500,
    total: 5500,
    notes: '',
    status: 'draft' as const,
    createdBy: 'u1',
    createdAt: now,
  };

  it('accepts a valid quotation', () => {
    expect(QuotationSchema.safeParse(validQuotation).success).toBe(true);
  });

  it('rejects quotation with no items', () => {
    const result = QuotationSchema.safeParse({ ...validQuotation, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects quotation with invalid status', () => {
    const result = QuotationSchema.safeParse({ ...validQuotation, status: 'archived' });
    expect(result.success).toBe(false);
  });
});

// ─── Finance: Invoice ────────────────────────

describe('InvoiceSchema', () => {
  const validInvoice = {
    id: 'inv1',
    projectId: 'p1',
    clientId: 'c1',
    invoiceNumber: 'INV-0001',
    date: now,
    dueDate: now,
    items: [{ id: 'ii1', description: 'Design services', quantity: 10, unitPrice: 100, total: 1000 }],
    subtotal: 1000,
    discount: 0,
    tax: 100,
    total: 1100,
    paid: 0,
    balance: 1100,
    status: 'sent' as const,
    notes: '',
    createdBy: 'u1',
    createdAt: now,
  };

  it('accepts a valid invoice', () => {
    expect(InvoiceSchema.safeParse(validInvoice).success).toBe(true);
  });

  it('accepts invoice with legacy fields', () => {
    const result = InvoiceSchema.safeParse({ ...validInvoice, client: 'Acme', amount: 1100 });
    expect(result.success).toBe(true);
  });
});

// ─── Finance: Payment ────────────────────────

describe('PaymentSchema', () => {
  const validPayment = {
    id: 'pay1',
    clientId: 'c1',
    projectId: 'p1',
    invoiceId: 'inv1',
    paymentNumber: 'PAY-0001',
    amount: 1100,
    date: now,
    method: 'bank_transfer' as const,
    reference: 'TXN-12345',
    note: '',
    createdBy: 'u1',
  };

  it('accepts a valid payment', () => {
    expect(PaymentSchema.safeParse(validPayment).success).toBe(true);
  });

  it('rejects payment with invalid method', () => {
    const result = PaymentSchema.safeParse({ ...validPayment, method: 'bitcoin' });
    expect(result.success).toBe(false);
  });
});

// ─── Finance: Expense ────────────────────────

describe('ExpenseSchema', () => {
  const validExpense = {
    id: 'exp1',
    projectId: 'p1',
    vendor: 'Equipment Co',
    amount: 2500,
    date: now,
    category: 'equipment_rent',
    description: 'Camera rental',
    createdBy: 'u1',
  };

  it('accepts a valid expense', () => {
    expect(ExpenseSchema.safeParse(validExpense).success).toBe(true);
  });

  it('accepts expense with null projectId (general expense)', () => {
    const result = ExpenseSchema.safeParse({ ...validExpense, projectId: null });
    expect(result.success).toBe(true);
  });

  it('rejects expense without vendor', () => {
    const result = ExpenseSchema.safeParse({ ...validExpense, vendor: '' });
    expect(result.success).toBe(false);
  });
});
