/**
 * Network Store — vendors, freelancers, assignments, service orders.
 * Collections: vendors, freelancers, freelancer_assignments, vendor_service_orders
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type { Vendor, Freelancer, FreelancerAssignment, VendorServiceOrder } from '../types';

interface NetworkState {
  vendors: Vendor[];
  freelancers: Freelancer[];
  assignments: FreelancerAssignment[];
  serviceOrders: VendorServiceOrder[];

  loading: boolean;
  _unsubscribers: Unsubscribe[];
  _subscriberCount: number;
  subscribe: () => void;
  unsubscribe: () => void;

  addVendor: (v: Vendor) => Promise<void>;
  updateVendor: (v: Vendor) => Promise<void>;
  addFreelancer: (f: Freelancer) => Promise<void>;
  updateFreelancer: (f: Freelancer) => Promise<void>;
  addFreelancerAssignment: (a: FreelancerAssignment) => Promise<void>;
  removeFreelancerAssignment: (id: string) => Promise<void>;
  addServiceOrder: (so: VendorServiceOrder) => Promise<void>;
  updateServiceOrder: (so: VendorServiceOrder) => Promise<void>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  vendors: [],
  freelancers: [],
  assignments: [],
  serviceOrders: [],
  loading: true,
  _unsubscribers: [],
  _subscriberCount: 0,

  subscribe: () => {
    const count = get()._subscriberCount + 1;
    set({ _subscriberCount: count });
    if (count > 1) return;
    set({ loading: true });
    const unsubs: Unsubscribe[] = [];
    let pending = 4;
    const markLoaded = () => { pending--; if (pending <= 0) set({ loading: false }); };
    unsubs.push(subscribeCollection<Vendor>('vendors', (items) => { set({ vendors: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<Freelancer>('freelancers', (items) => { set({ freelancers: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<FreelancerAssignment>('freelancer_assignments', (items) => { set({ assignments: items }); markLoaded(); }));
    unsubs.push(subscribeCollection<VendorServiceOrder>('vendor_service_orders', (items) => { set({ serviceOrders: items }); markLoaded(); }));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    const count = Math.max(0, get()._subscriberCount - 1);
    set({ _subscriberCount: count });
    if (count > 0) return;
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  addVendor: async (v) => { await setDoc(doc(db, 'vendors', v.id), v); },
  updateVendor: async (v) => { await updateDoc(doc(db, 'vendors', v.id), v as any); },
  addFreelancer: async (f) => { await setDoc(doc(db, 'freelancers', f.id), f); },
  updateFreelancer: async (f) => { await updateDoc(doc(db, 'freelancers', f.id), f as any); },
  addFreelancerAssignment: async (a) => { await setDoc(doc(db, 'freelancer_assignments', a.id), a); },
  removeFreelancerAssignment: async (id) => { await deleteDoc(doc(db, 'freelancer_assignments', id)); },
  addServiceOrder: async (so) => { await setDoc(doc(db, 'vendor_service_orders', so.id), so); },
  updateServiceOrder: async (so) => { await updateDoc(doc(db, 'vendor_service_orders', so.id), so as any); },
}));
