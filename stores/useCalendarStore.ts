/**
 * Calendar Store — calendar months, items, revisions.
 * Collections: calendar_months, calendar_items, calendar_item_revisions
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { CalendarMonth, CalendarItem, CalendarItemRevision } from '../types';

interface CalendarState {
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  calendarItemRevisions: CalendarItemRevision[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  // Calendar months
  addCalendarMonth: (month: CalendarMonth) => Promise<void>;
  updateCalendarMonth: (month: CalendarMonth) => Promise<void>;
  deleteCalendarMonth: (id: string) => Promise<void>;

  // Calendar items
  addCalendarItem: (item: CalendarItem) => Promise<void>;
  updateCalendarItem: (item: CalendarItem) => Promise<void>;
  deleteCalendarItem: (id: string) => Promise<void>;

  // Calendar item revisions
  addCalendarItemRevision: (rev: CalendarItemRevision) => Promise<void>;

  // Bulk import
  bulkAddCalendarItems: (items: Omit<CalendarItem, 'id'>[]) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  calendarMonths: [],
  calendarItems: [],
  calendarItemRevisions: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    let pending = 3;
    const markLoaded = () => {
      pending--;
      if (pending <= 0) set({ loading: false });
    };
    unsubs.push(
      subscribeCollection<CalendarMonth>('calendar_months', (items) => {
        set({ calendarMonths: items });
        markLoaded();
      }),
    );
    unsubs.push(
      subscribeCollection<CalendarItem>('calendar_items', (items) => {
        set({ calendarItems: items });
        markLoaded();
      }),
    );
    unsubs.push(
      subscribeCollection<CalendarItemRevision>('calendar_item_revisions', (items) => {
        set({ calendarItemRevisions: items });
        markLoaded();
      }),
    );
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach((fn) => fn());
    set({ _unsubscribers: [] });
  },

  addCalendarMonth: async (month) => {
    await setDoc(doc(db, 'calendar_months', month.id), month);
  },
  updateCalendarMonth: async (month) => {
    await updateDoc(doc(db, 'calendar_months', month.id), month as any);
  },
  deleteCalendarMonth: async (id) => {
    await deleteDoc(doc(db, 'calendar_months', id));
  },

  addCalendarItem: async (item) => {
    await setDoc(doc(db, 'calendar_items', item.id), item);
  },
  updateCalendarItem: async (item) => {
    await updateDoc(doc(db, 'calendar_items', item.id), item as any);
  },
  deleteCalendarItem: async (id) => {
    await deleteDoc(doc(db, 'calendar_items', id));
  },

  addCalendarItemRevision: async (rev) => {
    await setDoc(doc(db, 'calendar_item_revisions', rev.id), rev);
  },

  bulkAddCalendarItems: async (items) => {
    const BATCH_LIMIT = 500;
    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const chunk = items.slice(i, i + BATCH_LIMIT);
      for (const item of chunk) {
        const ref = doc(collection(db, 'calendar_items'));
        batch.set(ref, item);
      }
      await batch.commit();
    }
  },
}));
