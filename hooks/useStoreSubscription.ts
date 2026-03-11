/**
 * useStoreSubscription — lazy Firestore subscription hook.
 *
 * Activates a store's Firestore listeners when the component mounts
 * and tears them down when it unmounts (unless another component
 * is still using the same store — ref-counted via the store's own
 * `_subscriberCount` field).
 *
 * Usage:
 *   useStoreSubscription(useFinanceStore);   // subscribes on mount, unsubs on unmount
 *   useStoreSubscription(useClientStore, useFinanceStore);  // multiple stores
 */
import { useEffect } from 'react';

interface SubscribableStore {
  subscribe: () => void;
  unsubscribe: () => void;
  _subscriberCount: number;
}

type StoreHook = {
  getState: () => SubscribableStore;
};

/**
 * Subscribe to one or more Zustand stores on mount,
 * unsubscribe on unmount. Ref-counted so overlapping
 * routes sharing the same store don't cause data loss.
 */
export function useStoreSubscription(...stores: StoreHook[]): void {
  useEffect(() => {
    for (const store of stores) {
      store.getState().subscribe();
    }
    return () => {
      for (const store of stores) {
        store.getState().unsubscribe();
      }
    };
    // We intentionally depend on the store references themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
