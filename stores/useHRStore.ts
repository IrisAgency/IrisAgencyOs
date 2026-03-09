/**
 * HR Store — employee profiles, leave management, attendance, onboarding,
 * offboarding, employee assets, performance reviews.
 * Collections: users, employee_profiles, leave_requests, leave_policies,
 *              leave_balances, attendance_records, attendance_corrections,
 *              onboarding_checklists, offboarding_checklists, employee_assets,
 *              performance_reviews, employee_status_changes, teams
 */
import { create } from 'zustand';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeCollection, Unsubscribe } from './firestoreSubscription';
import type {
  User, EmployeeProfile, LeaveRequest, LeavePolicy, LeaveBalance,
  AttendanceRecord, AttendanceCorrection, OnboardingChecklist, OffboardingChecklist,
  EmployeeAsset, PerformanceReview, EmployeeStatusChange, Team,
} from '../types';

interface HRState {
  users: User[];
  employeeProfiles: EmployeeProfile[];
  leaveRequests: LeaveRequest[];
  leavePolicies: LeavePolicy[];
  leaveBalances: LeaveBalance[];
  attendanceRecords: AttendanceRecord[];
  attendanceCorrections: AttendanceCorrection[];
  onboardingChecklists: OnboardingChecklist[];
  offboardingChecklists: OffboardingChecklist[];
  employeeAssets: EmployeeAsset[];
  performanceReviews: PerformanceReview[];
  employeeStatusChanges: EmployeeStatusChange[];
  teams: Team[];

  _unsubscribers: Unsubscribe[];
  subscribe: () => void;
  unsubscribe: () => void;

  // Derived
  activeUsers: () => User[];

  // User CRUD
  addUser: (user: User, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;
  updateUser: (user: User, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;

  // Employee Profile
  createEmployeeProfile: (profile: EmployeeProfile, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;
  updateEmployeeProfile: (profile: EmployeeProfile, userId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;

  // Leave Management
  addLeaveRequest: (req: LeaveRequest, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  approveLeaveRequest: (req: LeaveRequest, userId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  rejectLeaveRequest: (req: LeaveRequest, reason: string, userId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  cancelLeaveRequest: (req: LeaveRequest, userId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;
  updateLeaveRequest: (req: LeaveRequest) => Promise<void>;
  deleteLeaveRequest: (id: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;

  // Attendance
  checkIn: (userId: string, userName: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<string | null>;
  checkOut: (userId: string, userName: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<string | null>;
  submitAttendanceCorrection: (correction: AttendanceCorrection, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;
  approveAttendanceCorrection: (correctionId: string, userId: string, userName: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;

  // Onboarding/Offboarding
  startOnboarding: (checklist: OnboardingChecklist, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  completeOnboardingStep: (checklistId: string, stepId: string, userId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;
  startOffboarding: (checklist: OffboardingChecklist, userId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;

  // Employee Assets
  assignEmployeeAsset: (asset: EmployeeAsset, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  returnEmployeeAsset: (assetId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;

  // Performance Reviews
  createPerformanceReview: (review: PerformanceReview, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>) => Promise<void>;
  submitPerformanceReview: (reviewId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  finalizePerformanceReview: (reviewId: string, addAuditLog: (a: string, e: string, id: string, d: string) => Promise<void>, notify: (...args: any[]) => Promise<void>) => Promise<void>;
  updatePerformanceReview: (review: PerformanceReview) => Promise<void>;
}

export const useHRStore = create<HRState>((set, get) => ({
  users: [],
  employeeProfiles: [],
  leaveRequests: [],
  leavePolicies: [],
  leaveBalances: [],
  attendanceRecords: [],
  attendanceCorrections: [],
  onboardingChecklists: [],
  offboardingChecklists: [],
  employeeAssets: [],
  performanceReviews: [],
  employeeStatusChanges: [],
  teams: [],
  _unsubscribers: [],

  subscribe: () => {
    const unsubs: Unsubscribe[] = [];
    unsubs.push(subscribeCollection<User>('users', (items) => set({ users: items })));
    unsubs.push(subscribeCollection<EmployeeProfile>('employee_profiles', (items) => set({ employeeProfiles: items })));
    unsubs.push(subscribeCollection<LeaveRequest>('leave_requests', (items) => set({ leaveRequests: items })));
    unsubs.push(subscribeCollection<LeavePolicy>('leave_policies', (items) => set({ leavePolicies: items })));
    unsubs.push(subscribeCollection<LeaveBalance>('leave_balances', (items) => set({ leaveBalances: items })));
    unsubs.push(subscribeCollection<AttendanceRecord>('attendance_records', (items) => set({ attendanceRecords: items })));
    unsubs.push(subscribeCollection<AttendanceCorrection>('attendance_corrections', (items) => set({ attendanceCorrections: items })));
    unsubs.push(subscribeCollection<OnboardingChecklist>('onboarding_checklists', (items) => set({ onboardingChecklists: items })));
    unsubs.push(subscribeCollection<OffboardingChecklist>('offboarding_checklists', (items) => set({ offboardingChecklists: items })));
    unsubs.push(subscribeCollection<EmployeeAsset>('employee_assets', (items) => set({ employeeAssets: items })));
    unsubs.push(subscribeCollection<PerformanceReview>('performance_reviews', (items) => set({ performanceReviews: items })));
    unsubs.push(subscribeCollection<EmployeeStatusChange>('employee_status_changes', (items) => set({ employeeStatusChanges: items })));
    unsubs.push(subscribeCollection<Team>('teams', (items) => set({ teams: items })));
    set({ _unsubscribers: unsubs });
  },

  unsubscribe: () => {
    get()._unsubscribers.forEach(fn => fn());
    set({ _unsubscribers: [] });
  },

  activeUsers: () => get().users.filter(u => u && u.status !== 'inactive'),

  // --- User CRUD ---
  addUser: async (newUser, addAuditLog) => {
    const userToSave: User = {
      ...newUser,
      passwordHash: newUser.passwordHash || '',
      forcePasswordChange: typeof newUser.forcePasswordChange === 'boolean' ? newUser.forcePasswordChange : false,
    };
    await setDoc(doc(db, 'users', userToSave.id), userToSave);
    await addAuditLog('create_user', 'User', newUser.id, `Created user ${newUser.name}`);
  },

  updateUser: async (updatedUser, addAuditLog) => {
    await updateDoc(doc(db, 'users', updatedUser.id), updatedUser as any);
    await addAuditLog('update_user', 'User', updatedUser.id, `Updated user ${updatedUser.name}`);
  },

  // --- Employee Profile ---
  createEmployeeProfile: async (profile, addAuditLog) => {
    await setDoc(doc(db, 'employee_profiles', profile.id), profile);
    await addAuditLog('create_employee_profile', 'EmployeeProfile', profile.id, `Created employee profile for ${profile.fullName}`);
    const activePolicies = get().leavePolicies.filter(p => p.isActive);
    for (const policy of activePolicies) {
      const balance: LeaveBalance = {
        id: `lb_${profile.userId}_${policy.leaveType}_${new Date().getFullYear()}`,
        employeeId: profile.userId, leaveType: policy.leaveType,
        year: new Date().getFullYear(), entitled: policy.defaultDaysPerYear,
        used: 0, remaining: policy.defaultDaysPerYear, carried: 0,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'leave_balances', balance.id), balance);
    }
  },

  updateEmployeeProfile: async (profile, userId, addAuditLog) => {
    await updateDoc(doc(db, 'employee_profiles', profile.id), { ...profile, updatedAt: new Date().toISOString(), updatedBy: userId } as any);
    await addAuditLog('update_employee_profile', 'EmployeeProfile', profile.id, `Updated employee profile for ${profile.fullName}`);
  },

  // --- Leave Management ---
  addLeaveRequest: async (req, addAuditLog, notify) => {
    await setDoc(doc(db, 'leave_requests', req.id), { ...req, updatedAt: new Date().toISOString() });
    const userName = get().users.find(u => u.id === req.userId)?.name || 'Unknown';
    await addAuditLog('leave_request_created', 'LeaveRequest', req.id, `${userName} requested ${req.type} leave (${req.totalDays} days)`);
    const empProfile = get().employeeProfiles.find(ep => ep.userId === req.userId);
    if (empProfile?.directManagerId) {
      await notify('LEAVE_REQUESTED', 'Leave Request Submitted', `${userName} has requested ${req.type} leave for ${req.totalDays} days.`, [empProfile.directManagerId], req.id);
    }
  },

  approveLeaveRequest: async (req, userId, addAuditLog, notify) => {
    const updatedReq: LeaveRequest = { ...req, status: 'approved', approverId: userId, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId };
    await updateDoc(doc(db, 'leave_requests', req.id), updatedReq as any);
    const balanceId = `lb_${req.userId}_${req.type}_${new Date().getFullYear()}`;
    const balanceDoc = get().leaveBalances.find(b => b.id === balanceId);
    if (balanceDoc) {
      await updateDoc(doc(db, 'leave_balances', balanceId), { used: balanceDoc.used + req.totalDays, remaining: balanceDoc.remaining - req.totalDays, updatedAt: new Date().toISOString() });
    }
    const reqUser = get().users.find(u => u.id === req.userId);
    const now = new Date().toISOString().split('T')[0];
    if (reqUser && req.startDate <= now && req.endDate >= now) {
      await updateDoc(doc(db, 'users', req.userId), { status: 'on_leave' });
    }
    await addAuditLog('leave_request_approved', 'LeaveRequest', req.id, `Approved ${req.type} leave for ${reqUser?.name}`);
    await notify('LEAVE_APPROVED', 'Leave Approved', `Your ${req.type} leave request (${req.startDate} to ${req.endDate}) has been approved.`, [req.userId], req.id);
  },

  rejectLeaveRequest: async (req, reason, userId, addAuditLog, notify) => {
    await updateDoc(doc(db, 'leave_requests', req.id), { status: 'rejected', approverId: userId, rejectionReason: reason, updatedAt: new Date().toISOString(), updatedBy: userId } as any);
    const reqUser = get().users.find(u => u.id === req.userId);
    await addAuditLog('leave_request_rejected', 'LeaveRequest', req.id, `Rejected ${req.type} leave for ${reqUser?.name}: ${reason}`);
    await notify('LEAVE_REJECTED', 'Leave Rejected', `Your ${req.type} leave request has been rejected. Reason: ${reason}`, [req.userId], req.id);
  },

  cancelLeaveRequest: async (req, userId, addAuditLog) => {
    await updateDoc(doc(db, 'leave_requests', req.id), { status: 'cancelled', cancelledBy: userId, cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId } as any);
    if (req.status === 'approved') {
      const balanceId = `lb_${req.userId}_${req.type}_${new Date().getFullYear()}`;
      const balanceDoc = get().leaveBalances.find(b => b.id === balanceId);
      if (balanceDoc) {
        await updateDoc(doc(db, 'leave_balances', balanceId), { used: Math.max(0, balanceDoc.used - req.totalDays), remaining: balanceDoc.remaining + req.totalDays, updatedAt: new Date().toISOString() });
      }
    }
    await addAuditLog('leave_request_cancelled', 'LeaveRequest', req.id, `Cancelled ${req.type} leave request`);
  },

  updateLeaveRequest: async (req) => {
    await updateDoc(doc(db, 'leave_requests', req.id), { ...req, updatedAt: new Date().toISOString() } as any);
  },

  deleteLeaveRequest: async (id, addAuditLog) => {
    await deleteDoc(doc(db, 'leave_requests', id));
    await addAuditLog('leave_request_deleted', 'LeaveRequest', id, `Deleted leave request ${id}`);
  },

  // --- Attendance ---
  checkIn: async (userId, userName, addAuditLog) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const recordId = `ar_${userId}_${today}`;
    const existing = get().attendanceRecords.find(r => r.id === recordId);
    if (existing?.checkInTime) return 'Already checked in today.';
    const record: AttendanceRecord = {
      id: recordId, userId, date: today, status: 'present',
      checkInTime: now, workMode: 'on-site', createdAt: now, updatedAt: now,
    };
    await setDoc(doc(db, 'attendance_records', recordId), record);
    await addAuditLog('attendance_clock_in', 'Attendance', recordId, `${userName} clocked in`);
    return null;
  },

  checkOut: async (userId, userName, addAuditLog) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const recordId = `ar_${userId}_${today}`;
    const existing = get().attendanceRecords.find(r => r.id === recordId);
    if (!existing?.checkInTime) return 'You must check in before checking out.';
    if (existing?.checkOutTime) return 'Already checked out today.';
    const checkInMs = new Date(existing.checkInTime).getTime();
    const checkOutMs = new Date(now).getTime();
    const totalHours = Math.round(((checkOutMs - checkInMs) / (1000 * 60 * 60)) * 100) / 100;
    const overtimeHours = Math.max(0, totalHours - 8);
    await updateDoc(doc(db, 'attendance_records', recordId), { checkOutTime: now, totalHours, overtimeHours, updatedAt: now });
    await addAuditLog('attendance_clock_out', 'Attendance', recordId, `${userName} clocked out (${totalHours}h)`);
    return null;
  },

  submitAttendanceCorrection: async (correction, addAuditLog) => {
    await setDoc(doc(db, 'attendance_corrections', correction.id), correction);
    await addAuditLog('attendance_correction_requested', 'AttendanceCorrection', correction.id, 'Requested attendance correction');
  },

  approveAttendanceCorrection: async (correctionId, userId, userName, addAuditLog, notify) => {
    const correction = get().attendanceCorrections.find(c => c.id === correctionId);
    if (!correction) return;
    await updateDoc(doc(db, 'attendance_corrections', correctionId), {
      correctionStatus: 'approved', reviewedBy: userId, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    if (correction.attendanceRecordId) {
      const updatePayload: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: userId };
      if (correction.correctedCheckIn) updatePayload.checkIn = correction.correctedCheckIn;
      if (correction.correctedCheckOut) updatePayload.checkOut = correction.correctedCheckOut;
      await updateDoc(doc(db, 'attendance_records', correction.attendanceRecordId), updatePayload);
    }
    await addAuditLog('attendance_correction_approved', 'AttendanceCorrection', correctionId, `${userName} approved attendance correction for ${correction.employeeId}`);
    await notify('ATTENDANCE_CORRECTION_REQUESTED', 'Attendance Correction Approved', 'Your attendance correction has been approved.', [correction.employeeId], correctionId);
  },

  // --- Onboarding/Offboarding ---
  startOnboarding: async (checklist, addAuditLog, notify) => {
    await setDoc(doc(db, 'onboarding_checklists', checklist.id), checklist);
    await addAuditLog('onboarding_started', 'OnboardingChecklist', checklist.id, `Started onboarding for employee ${checklist.employeeId}`);
    await notify('ONBOARDING_STARTED', 'Onboarding Started', 'Onboarding has been initiated.', [checklist.employeeId], checklist.id);
  },

  completeOnboardingStep: async (checklistId, stepId, userId, addAuditLog) => {
    const checklist = get().onboardingChecklists.find(c => c.id === checklistId);
    if (!checklist) return;
    const updatedSteps = checklist.steps.map(s =>
      s.id === stepId ? { ...s, status: 'completed' as const, completedAt: new Date().toISOString(), completedBy: userId } : s
    );
    const allDone = updatedSteps.every(s => s.status === 'completed' || s.status === 'skipped');
    await updateDoc(doc(db, 'onboarding_checklists', checklistId), {
      steps: updatedSteps, status: allDone ? 'completed' : 'in_progress',
      completedAt: allDone ? new Date().toISOString() : null, updatedAt: new Date().toISOString(),
    });
    await addAuditLog('onboarding_step_completed', 'OnboardingChecklist', checklistId, `Completed onboarding step: ${stepId}`);
  },

  startOffboarding: async (checklist, userId, addAuditLog, notify) => {
    await setDoc(doc(db, 'offboarding_checklists', checklist.id), checklist);
    const profile = get().employeeProfiles.find(p => p.userId === checklist.employeeId);
    if (profile) {
      const statusChange: EmployeeStatusChange = {
        id: `esc_${Date.now()}`, employeeId: checklist.employeeId,
        fromStatus: profile.employmentStatus,
        toStatus: checklist.reason === 'termination' ? 'terminated' : 'resigned',
        reason: checklist.reason || 'offboarding',
        effectiveDate: checklist.finalWorkingDate || new Date().toISOString(),
        changedBy: userId, createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'employee_status_changes', statusChange.id), statusChange);
    }
    await addAuditLog('offboarding_started', 'OffboardingChecklist', checklist.id, `Started offboarding for employee ${checklist.employeeId}`);
    await notify('OFFBOARDING_STARTED', 'Offboarding Started', 'Offboarding process has been initiated.', [checklist.employeeId], checklist.id);
  },

  // --- Employee Assets ---
  assignEmployeeAsset: async (asset, addAuditLog, notify) => {
    await setDoc(doc(db, 'employee_assets', asset.id), asset);
    if (asset.assetId) {
      await updateDoc(doc(db, 'agency_equipment', asset.assetId), { status: 'checked_out', checkedOutBy: asset.employeeId, checkedOutAt: asset.assignedAt } as any);
    }
    await addAuditLog('asset_assigned', 'EmployeeAsset', asset.id, `Assigned ${asset.assetName} to employee ${asset.employeeId}`);
    await notify('ASSET_ASSIGNED', 'Asset Assigned', `${asset.assetName} has been assigned to you.`, [asset.employeeId], asset.id);
  },

  returnEmployeeAsset: async (assetId, addAuditLog) => {
    const asset = get().employeeAssets.find(a => a.id === assetId);
    if (!asset) return;
    await updateDoc(doc(db, 'employee_assets', assetId), { status: 'returned', returnedAt: new Date().toISOString() });
    if (asset.assetId) {
      await updateDoc(doc(db, 'agency_equipment', asset.assetId), { status: 'available', checkedOutBy: null, checkedOutAt: null } as any);
    }
    await addAuditLog('asset_returned', 'EmployeeAsset', assetId, `${asset.assetName} returned by employee ${asset.employeeId}`);
  },

  // --- Performance Reviews ---
  createPerformanceReview: async (review, addAuditLog) => {
    await setDoc(doc(db, 'performance_reviews', review.id), review);
    await addAuditLog('performance_review_created', 'PerformanceReview', review.id, `Created performance review for employee ${review.employeeId}`);
  },

  submitPerformanceReview: async (reviewId, addAuditLog, notify) => {
    const review = get().performanceReviews.find(r => r.id === reviewId);
    if (!review) return;
    await updateDoc(doc(db, 'performance_reviews', reviewId), { status: 'submitted', updatedAt: new Date().toISOString() });
    await addAuditLog('performance_review_submitted', 'PerformanceReview', reviewId, `Submitted performance review for employee ${review.employeeId}`);
    await notify('PERFORMANCE_REVIEW_SUBMITTED', 'Performance Review Submitted', `A performance review has been submitted for your review period ${review.reviewCycle}.`, [review.employeeId], reviewId);
  },

  finalizePerformanceReview: async (reviewId, addAuditLog, notify) => {
    const review = get().performanceReviews.find(r => r.id === reviewId);
    if (!review) return;
    await updateDoc(doc(db, 'performance_reviews', reviewId), { status: 'finalized', updatedAt: new Date().toISOString() });
    await addAuditLog('performance_review_finalized', 'PerformanceReview', reviewId, `Finalized performance review for employee ${review.employeeId}`);
    await notify('PERFORMANCE_REVIEW_FINALIZED', 'Performance Review Finalized', `Your performance review for ${review.reviewCycle} has been finalized.`, [review.employeeId], reviewId);
  },

  updatePerformanceReview: async (review) => {
    await updateDoc(doc(db, 'performance_reviews', review.id), { ...review, updatedAt: new Date().toISOString() } as any);
  },
}));
