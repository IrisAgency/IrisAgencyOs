/**
 * Firestore timestamp utilities.
 *
 * Provides `serverTimestamp()` for Firestore writes and a helper
 * to convert Firestore Timestamp objects back to ISO strings on read.
 *
 * ## Migration Pattern
 *
 * ### Before (client-side timestamp — clock-skew risk):
 * ```ts
 * await setDoc(doc(db, 'audit_logs', id), {
 *   ...data,
 *   createdAt: new Date().toISOString(),
 * });
 * ```
 *
 * ### After (server-side timestamp — authoritative):
 * ```ts
 * import { serverTimestamp } from 'firebase/firestore';
 * import { withTimestamps, withUpdatedAt } from '../utils/timestamps';
 *
 * // New document:
 * await setDoc(doc(db, 'audit_logs', id), withTimestamps({ ...data }));
 *
 * // Update existing:
 * await updateDoc(doc(db, 'audit_logs', id), withUpdatedAt({ ...data }));
 * ```
 *
 * ### Reading data
 * The `subscribeCollection` helper in stores already calls `doc.data()`
 * which returns Firestore `Timestamp` objects. Use `normalizeTimestamps()`
 * in the snapshot callback to convert them to ISO strings for the UI layer.
 *
 * **Gradual adoption**: Apply `withTimestamps()` / `withUpdatedAt()` to
 * one store at a time, starting with the lowest-risk collections.
 */
import { serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Add `createdAt` and `updatedAt` server timestamps to a new document.
 * Use this when calling `setDoc()` for document creation.
 */
export function withTimestamps<T extends Record<string, unknown>>(
  data: T,
): T & { createdAt: FieldValue; updatedAt: FieldValue } {
  return {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Add `updatedAt` server timestamp for document updates.
 * Use this when calling `updateDoc()`.
 */
export function withUpdatedAt<T extends Record<string, unknown>>(
  data: T,
): T & { updatedAt: FieldValue } {
  return {
    ...data,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Convert Firestore Timestamp fields to ISO strings.
 *
 * Call this on `doc.data()` results before passing to Zustand stores
 * so the rest of the app can continue working with plain strings.
 *
 * @example
 * snapshot.forEach((doc) => {
 *   items.push(normalizeTimestamps({ id: doc.id, ...doc.data() }) as T);
 * });
 */
export function normalizeTimestamps<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = normalizeTimestamps(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
