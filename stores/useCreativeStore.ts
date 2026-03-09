/**
 * Creative Store — creative projects, creative calendars, creative calendar items.
 * Collections: creative_projects, creative_calendars, creative_calendar_items
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { CreativeProject, CreativeCalendar, CreativeCalendarItem } from '../types';

interface CreativeState {
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  // Creative projects
  addCreativeProject: (proj: CreativeProject) => Promise<void>;
  updateCreativeProject: (proj: CreativeProject) => Promise<void>;
  deleteCreativeProject: (id: string) => Promise<void>;

  // Creative calendars
  addCreativeCalendar: (cal: CreativeCalendar) => Promise<void>;
  updateCreativeCalendar: (cal: CreativeCalendar) => Promise<void>;
  deleteCreativeCalendar: (id: string) => Promise<void>;

  // Creative calendar items
  addCreativeCalendarItem: (item: CreativeCalendarItem) => Promise<void>;
  updateCreativeCalendarItem: (item: CreativeCalendarItem) => Promise<void>;
  deleteCreativeCalendarItem: (id: string) => Promise<void>;
}

export const useCreativeStore = create<CreativeState>((set, get) => ({
  creativeProjects: [],
  creativeCalendars: [],
  creativeCalendarItems: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<CreativeProject>('creative_projects', (items) => set({ creativeProjects: items })));
    unsubs.push(subscribeCollection<CreativeCalendar>('creative_calendars', (items) => set({ creativeCalendars: items })));
    unsubs.push(subscribeCollection<CreativeCalendarItem>('creative_calendar_items', (items) => set({ creativeCalendarItems: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addCreativeProject: async (proj) => { await setDoc(doc(db, 'creative_projects', proj.id), proj); },
  updateCreativeProject: async (proj) => { await updateDoc(doc(db, 'creative_projects', proj.id), proj as any); },
  deleteCreativeProject: async (id) => { await deleteDoc(doc(db, 'creative_projects', id)); },

  addCreativeCalendar: async (cal) => { await setDoc(doc(db, 'creative_calendars', cal.id), cal); },
  updateCreativeCalendar: async (cal) => { await updateDoc(doc(db, 'creative_calendars', cal.id), cal as any); },
  deleteCreativeCalendar: async (id) => { await deleteDoc(doc(db, 'creative_calendars', id)); },

  addCreativeCalendarItem: async (item) => { await setDoc(doc(db, 'creative_calendar_items', item.id), item); },
  updateCreativeCalendarItem: async (item) => { await updateDoc(doc(db, 'creative_calendar_items', item.id), item as any); },
  deleteCreativeCalendarItem: async (id) => { await deleteDoc(doc(db, 'creative_calendar_items', id)); },
}));
