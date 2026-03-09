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

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  addPost: (post: SocialPost) => Promise<void>;
  updatePost: (post: SocialPost) => Promise<void>;
}

export const usePostingStore = create<PostingState>((set, get) => ({
  socialPosts: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<SocialPost>('social_posts', (items) => set({ socialPosts: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addPost: async (post) => { await setDoc(doc(db, 'social_posts', post.id), post); },
  updatePost: async (post) => { await updateDoc(doc(db, 'social_posts', post.id), post as any); },
}));
