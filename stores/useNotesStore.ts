/**
 * Notes Store — personal / shared notes.
 * Collections: notes
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { Note } from '../types';

interface NotesState {
  notes: Note[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  addNote: (note: Note) => Promise<void>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<Note>('notes', (items) => { set({ notes: items, loading: false }); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addNote: async (note) => { await setDoc(doc(db, 'notes', note.id), note); },
  updateNote: async (note) => { await updateDoc(doc(db, 'notes', note.id), note as any); },
  deleteNote: async (noteId) => { await deleteDoc(doc(db, 'notes', noteId)); },
}));
