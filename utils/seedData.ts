import { doc, setDoc, writeBatch, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  USERS, TASKS, PROJECTS, INVOICES, PRODUCTION_ASSETS, CLIENTS, 
  PROJECT_MEMBERS, PROJECT_MILESTONES, PROJECT_ACTIVITY_LOGS, 
  TASK_COMMENTS, TASK_TIME_LOGS, TASK_DEPENDENCIES, TASK_ACTIVITY_LOGS, 
  APPROVAL_STEPS, CLIENT_APPROVALS, FILES, FOLDERS, AGENCY_LOCATIONS, 
  AGENCY_EQUIPMENT, SHOT_LISTS, CALL_SHEETS, QUOTATIONS, PAYMENTS, 
  EXPENSES, VENDORS, FREELANCERS, FREELANCER_ASSIGNMENTS, 
  VENDOR_SERVICE_ORDERS, LEAVE_REQUESTS, ATTENDANCE_RECORDS, 
  NOTIFICATIONS, DEFAULT_PREFERENCES, DEFAULT_BRANDING, 
  DEFAULT_SETTINGS, DEFAULT_ROLES, AUDIT_LOGS, WORKFLOW_TEMPLATES 
} from '../constants';

const clearCollection = async (collectionName: string) => {
  const snapshot = await getDocs(collection(db, collectionName));
  const batch = writeBatch(db);
  let count = 0;
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Cleared ${collectionName}`);
  }
};

export const seedDatabase = async () => {
  // 1. Clear critical collections to ensure a clean slate
  await clearCollection('roles');
  await clearCollection('users');
  
  // 2. Define collections to seed
  // Note: We exclude 'users' so the first person to sign up becomes Admin
  const collections = [
    // { name: 'users', data: USERS }, // Don't seed users, let the user Sign Up as Admin
    { name: 'roles', data: DEFAULT_ROLES }, // Critical: Re-seed roles
    { name: 'tasks', data: TASKS },
    { name: 'projects', data: PROJECTS },
    { name: 'invoices', data: INVOICES },
    { name: 'production_assets', data: PRODUCTION_ASSETS },
    { name: 'clients', data: CLIENTS },
    { name: 'project_members', data: PROJECT_MEMBERS },
    { name: 'project_milestones', data: PROJECT_MILESTONES },
    { name: 'project_activity_logs', data: PROJECT_ACTIVITY_LOGS },
    { name: 'task_comments', data: TASK_COMMENTS },
    { name: 'task_time_logs', data: TASK_TIME_LOGS },
    { name: 'task_dependencies', data: TASK_DEPENDENCIES },
    { name: 'task_activity_logs', data: TASK_ACTIVITY_LOGS },
    { name: 'approval_steps', data: APPROVAL_STEPS },
    { name: 'client_approvals', data: CLIENT_APPROVALS },
    { name: 'files', data: FILES },
    { name: 'folders', data: FOLDERS },
    { name: 'agency_locations', data: AGENCY_LOCATIONS },
    { name: 'agency_equipment', data: AGENCY_EQUIPMENT },
    { name: 'shot_lists', data: SHOT_LISTS },
    { name: 'call_sheets', data: CALL_SHEETS },
    { name: 'quotations', data: QUOTATIONS },
    { name: 'payments', data: PAYMENTS },
    { name: 'expenses', data: EXPENSES },
    { name: 'vendors', data: VENDORS },
    { name: 'freelancers', data: FREELANCERS },
    { name: 'freelancer_assignments', data: FREELANCER_ASSIGNMENTS },
    { name: 'vendor_service_orders', data: VENDOR_SERVICE_ORDERS },
    { name: 'leave_requests', data: LEAVE_REQUESTS },
    { name: 'attendance_records', data: ATTENDANCE_RECORDS },
    { name: 'notifications', data: NOTIFICATIONS },
    { name: 'audit_logs', data: AUDIT_LOGS },
    { name: 'workflow_templates', data: WORKFLOW_TEMPLATES },
    // Singletons or special cases
    { name: 'settings', data: [{ id: 'branding', ...DEFAULT_BRANDING }, { id: 'general', ...DEFAULT_SETTINGS }] },
  ];

  for (const { name, data } of collections) {
    console.log(`Seeding ${name}...`);
    const batch = writeBatch(db);
    let count = 0;
    
    for (const item of data) {
      const docRef = doc(db, name, item.id);
      batch.set(docRef, item);
      count++;
      
      // Batches are limited to 500 operations
      if (count >= 400) {
        await batch.commit();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
  }
  
  console.log('Database seeding completed!');
};
