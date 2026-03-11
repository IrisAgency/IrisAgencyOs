/**
 * Production Store — shot lists, call sheets, locations, equipment, production plans.
 * Collections: production_assets, shot_lists, call_sheets, agency_locations,
 *              agency_equipment, production_plans
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type {
  ProductionAsset, ShotList, CallSheet, AgencyLocation,
  AgencyEquipment, ProductionPlan,
} from '../types';

interface ProductionState {
  productionAssets: ProductionAsset[];
  shotLists: ShotList[];
  callSheets: CallSheet[];
  locations: AgencyLocation[];
  equipment: AgencyEquipment[];
  productionPlans: ProductionPlan[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  addShotList: (sl: ShotList) => Promise<void>;
  addCallSheet: (cs: CallSheet) => Promise<void>;
  addLocation: (loc: AgencyLocation) => Promise<void>;
  addEquipment: (eq: AgencyEquipment) => Promise<void>;
  updateEquipment: (eq: AgencyEquipment) => Promise<void>;
}

export const useProductionStore = create<ProductionState>((set, get) => ({
  productionAssets: [],
  shotLists: [],
  callSheets: [],
  locations: [],
  equipment: [],
  productionPlans: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    let pending = 6;
    const markLoaded = () => { pending--; if (pending <= 0) set({ loading: false }); };
    unsubs.push(subscribeCollection<ProductionAsset>('production_assets', (items) => { set({ productionAssets: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ShotList>('shot_lists', (items) => { set({ shotLists: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<CallSheet>('call_sheets', (items) => { set({ callSheets: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<AgencyLocation>('agency_locations', (items) => { set({ locations: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<AgencyEquipment>('agency_equipment', (items) => { set({ equipment: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<ProductionPlan>('production_plans', (items) => { set({ productionPlans: items }); markLoaded(); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addShotList: async (sl) => { await setDoc(doc(db, 'shot_lists', sl.id), sl); },
  addCallSheet: async (cs) => { await setDoc(doc(db, 'call_sheets', cs.id), cs); },
  addLocation: async (loc) => { await setDoc(doc(db, 'agency_locations', loc.id), loc); },
  addEquipment: async (eq) => { await setDoc(doc(db, 'agency_equipment', eq.id), eq); },
  updateEquipment: async (eq) => { await updateDoc(doc(db, 'agency_equipment', eq.id), eq as any); },
}));
