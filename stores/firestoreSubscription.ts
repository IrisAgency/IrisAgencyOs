/**
 * Shared Firestore subscription helper for Zustand stores.
 * Each store calls `subscribeCollection()` to get a real-time listener
 * and returns an `unsubscribe` function for cleanup.
 */
import { collection, onSnapshot, query, Query, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Unsubscribe = () => void;

/**
 * Subscribe to a Firestore collection and pipe results into a setter.
 * Returns an unsubscribe function.
 */
export function subscribeCollection<T>(
  collectionName: string,
  setter: (items: T[]) => void,
  queryFn?: (ref: ReturnType<typeof collection>) => Query<DocumentData>,
): Unsubscribe {
  const colRef = collection(db, collectionName);
  const q = queryFn ? queryFn(colRef) : query(colRef);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items: T[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as unknown as T);
    });
    setter(items);
  }, (err) => {
    console.error(`[Firestore] Error subscribing to ${collectionName}:`, err);
  });

  return unsubscribe;
}
