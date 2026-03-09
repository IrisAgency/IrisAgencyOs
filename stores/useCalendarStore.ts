/**
 * Calendar Store — calendar months, items, revisions.
 * Collections: calendar_months, calendar_items, calendar_item_revisions
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { CalendarMonth, CalendarItem, CalendarItemRevision } from '../types';

interface CalendarState {
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  calendarItemRevisions: CalendarItemRevision[];

  _unsubscribers: Unsubscribe[];
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
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  calendarMonths: [],
  calendarItems: [],
  calendarItemRevisions: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<CalendarMonth>('calendar_months', (items) => set({ calendarMonths: items })));
    unsubs.push(subscribeCollection<CalendarItem>('calendar_items', (items) => set({ calendarItems: items })));
    unsubs.push(subscribeCollection<CalendarItemRevision>('calendar_item_revisions', (items) => set({ calendarItemRevisions: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addCalendarMonth: async (month) => { await setDoc(doc(db, 'calendar_months', month.id), month); },
  updateCalendarMonth: async (month) => { await updateDoc(doc(db, 'calendar_months', month.id), month as any); },
  deleteCalendarMonth: async (id) => { await deleteDoc(doc(db, 'calendar_months', id)); },

  addCalendarItem: async (item) => { await setDoc(doc(db, 'calendar_items', item.id), item); },
  updateCalendarItem: async (item) => { await updateDoc(doc(db, 'calendar_items', item.id), item as any); },
  deleteCalendarItem: async (id) => { await deleteDoc(doc(db, 'calendar_items', id)); },

  addCalendarItemRevision: async (rev) => { await setDoc(doc(db, 'calendar_item_revisions', rev.id), rev); },
}));
