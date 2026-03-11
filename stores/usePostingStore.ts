/**
 * Posting Store — social media posts.
 * Collections: social_posts
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { SocialPost } from '../types';

interface PostingState {
  socialPosts: SocialPost[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  addPost: (post: SocialPost) => Promise<void>;
  updatePost: (post: SocialPost) => Promise<void>;
}

export const usePostingStore = create<PostingState>((set, get) => ({
  socialPosts: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<SocialPost>('social_posts', (items) => { set({ socialPosts: items, loading: false }); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addPost: async (post) => { await setDoc(doc(db, 'social_posts', post.id), post); },
  updatePost: async (post) => { await updateDoc(doc(db, 'social_posts', post.id), post as any); },
}));
