/**
 * Quick Fix: Add Production Planning Permissions to General Manager
 * 
 * INSTRUCTIONS:
 * 1. Open your deployed app (https://iris-os-43718.web.app) in the browser
 * 2. Open Developer Console (F12 or Cmd+Option+I on Mac)
 * 3. Paste this entire script and press Enter
 * 4. Wait for success message
 * 5. Refresh the page
 */

import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const newPermissions = [
  'production.plans.create',
  'production.plans.edit',
  'production.plans.delete',
  'production.plans.view',
  'production.override_conflicts',
  'production.restore_archived'
];

async function addProductionPermissions() {
  console.log('🚀 Adding Production Planning permissions to General Manager...\n');
  
  try {
    // Find General Manager role
    const rolesSnapshot = await getDocs(collection(db, 'roles'));
    let gmRole = null;
    
    rolesSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name === 'General Manager') {
        gmRole = { id: docSnap.id, ...data };
        console.log(`✅ Found General Manager role: ${docSnap.id}`);
      }
    });
    
    if (!gmRole) {
      console.error('❌ General Manager role not found');
      return;
    }
    
    const currentPerms = gmRole.permissions || [];
    const missing = newPermissions.filter(p => !currentPerms.includes(p));
    
    if (missing.length === 0) {
      console.log('✅ All permissions already exist!');
      return;
    }
    
    console.log(`\n➕ Adding ${missing.length} missing permissions:`);
    missing.forEach(p => console.log(`   - ${p}`));
    
    // Update role
    await updateDoc(doc(db, 'roles', gmRole.id), {
      permissions: [...currentPerms, ...missing]
    });
    
    console.log('\n✅ SUCCESS! Permissions added');
    console.log(`📊 Total permissions: ${currentPerms.length} → ${currentPerms.length + missing.length}`);
    console.log('\n🔄 Please refresh the page now\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Alternative: Use Admin Hub > Roles > Edit General Manager');
  }
}

addProductionPermissions();
