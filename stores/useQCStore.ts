/**
 * QC Store — quality control reviews.
 * Collections: task_qc_reviews
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { QCReview } from '../types';

interface QCState {
  qcReviews: QCReview[];

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  addQCReview: (review: QCReview) => Promise<void>;
  updateQCReview: (review: QCReview) => Promise<void>;
}

export const useQCStore = create<QCState>((set, get) => ({
  qcReviews: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<QCReview>('task_qc_reviews', (items) => set({ qcReviews: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addQCReview: async (review) => { await setDoc(doc(db, 'task_qc_reviews', review.id), review); },
  updateQCReview: async (review) => { await updateDoc(doc(db, 'task_qc_reviews', review.id), review as any); },
}));
