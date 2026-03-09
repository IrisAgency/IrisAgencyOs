/**
 * Finance Store — invoices, quotations, payments, expenses.
 * Collections: invoices, quotations, payments, expenses
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { Invoice, Quotation, Payment, Expense, Project } from '../types';

interface FinanceState {
  invoices: Invoice[];
  quotations: Quotation[];
  payments: Payment[];
  expenses: Expense[];

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  // Invoice CRUD
  addInvoice: (inv: Invoice) => Promise<void>;
  updateInvoice: (inv: Invoice) => Promise<void>;

  // Quotation CRUD
  addQuotation: (quo: Quotation) => Promise<void>;
  updateQuotation: (quo: Quotation) => Promise<void>;

  // Payment
  addPayment: (pay: Payment) => Promise<void>;

  // Expense
  addExpense: (exp: Expense, updateProject: (p: Project) => Promise<void>, projects: Project[]) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  invoices: [],
  quotations: [],
  payments: [],
  expenses: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<Invoice>('invoices', (items) => set({ invoices: items })));
    unsubs.push(subscribeCollection<Quotation>('quotations', (items) => set({ quotations: items })));
    unsubs.push(subscribeCollection<Payment>('payments', (items) => set({ payments: items })));
    unsubs.push(subscribeCollection<Expense>('expenses', (items) => set({ expenses: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addInvoice: async (inv) => { await setDoc(doc(db, 'invoices', inv.id), inv); },
  updateInvoice: async (inv) => { await updateDoc(doc(db, 'invoices', inv.id), inv as any); },

  addQuotation: async (quo) => { await setDoc(doc(db, 'quotations', quo.id), quo); },
  updateQuotation: async (quo) => { await updateDoc(doc(db, 'quotations', quo.id), quo as any); },

  addPayment: async (pay) => {
    await setDoc(doc(db, 'payments', pay.id), pay);
    // Auto-update invoice status
    const invoice = get().invoices.find(i => i.id === pay.invoiceId);
    if (invoice) {
      const newPaid = invoice.paid + pay.amount;
      const newBalance = invoice.total - newPaid;
      const newStatus: any = newBalance <= 0 ? 'paid' : 'partially_paid';
      await updateDoc(doc(db, 'invoices', invoice.id), { paid: newPaid, balance: newBalance, status: newStatus });
    }
  },

  addExpense: async (exp, updateProject, projects) => {
    await setDoc(doc(db, 'expenses', exp.id), exp);
    if (exp.projectId) {
      const project = projects.find(p => p.id === exp.projectId);
      if (project) {
        await updateProject({ ...project, spent: project.spent + exp.amount });
      }
    }
  },
}));
