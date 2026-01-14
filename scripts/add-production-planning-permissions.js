/**
 * Add Production Planning Permissions to General Manager Role
 * Run this script in the browser console on the deployed app
 */

// New production planning permissions to add
const newPermissions = [
  'production.plans.create',
  'production.plans.edit',
  'production.plans.delete',
  'production.plans.view',
  'production.override_conflicts',
  'production.restore_archived'
];

async function addProductionPlanningPermissions() {
  try {
    // Get Firestore instance
    const { db } = await import('./lib/firebase');
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    
    // Find General Manager role
    const rolesRef = doc(db, 'roles', 'general_manager');
    const roleDoc = await getDoc(rolesRef);
    
    if (!roleDoc.exists()) {
      console.error('❌ General Manager role not found');
      return;
    }
    
    const roleData = roleDoc.data();
    const currentPermissions = roleData.permissions || [];
    
    console.log(`📊 Current permissions count: ${currentPermissions.length}`);
    
    // Add new permissions that don't already exist
    const updatedPermissions = [...new Set([...currentPermissions, ...newPermissions])];
    
    console.log(`📊 Updated permissions count: ${updatedPermissions.length}`);
    console.log('➕ Adding permissions:', newPermissions);
    
    // Update the role
    await updateDoc(rolesRef, {
      permissions: updatedPermissions
    });
    
    console.log('✅ Successfully added production planning permissions to General Manager role!');
    console.log('🔄 Please refresh the page for changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error updating role:', error);
  }
}

// Run the update
addProductionPlanningPermissions();
