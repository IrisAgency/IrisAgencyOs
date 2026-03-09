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

  _unsubscribers: Unsubscribe[];
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
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<Vendor>('vendors', (items) => set({ vendors: items })));
    unsubs.push(subscribeCollection<Freelancer>('freelancers', (items) => set({ freelancers: items })));
    unsubs.push(subscribeCollection<FreelancerAssignment>('freelancer_assignments', (items) => set({ assignments: items })));
    unsubs.push(subscribeCollection<VendorServiceOrder>('vendor_service_orders', (items) => set({ serviceOrders: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
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
