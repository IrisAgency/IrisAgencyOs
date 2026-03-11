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

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  addQCReview: (review: QCReview) => Promise<void>;
  updateQCReview: (review: QCReview) => Promise<void>;
}

export const useQCStore = create<QCState>((set, get) => ({
  qcReviews: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<QCReview>('task_qc_reviews', (items) => { set({ qcReviews: items, loading: false }); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addQCReview: async (review) => { await setDoc(doc(db, 'task_qc_reviews', review.id), review); },
  updateQCReview: async (review) => { await updateDoc(doc(db, 'task_qc_reviews', review.id), review as any); },
}));
