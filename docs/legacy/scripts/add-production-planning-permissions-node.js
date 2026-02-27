/**
 * Add Production Planning Permissions to General Manager Role
 * Run: node scripts/add-production-planning-permissions-node.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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
    console.log('🔍 Looking for General Manager role...');
    
    // Query all roles to find General Manager
    const rolesSnapshot = await db.collection('roles').get();
    
    let generalManagerDoc = null;
    rolesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name === 'General Manager' || doc.id === 'general_manager') {
        generalManagerDoc = doc;
      }
    });
    
    if (!generalManagerDoc) {
      console.error('❌ General Manager role not found');
      console.log('Available roles:', rolesSnapshot.docs.map(d => ({ id: d.id, name: d.data().name })));
      process.exit(1);
    }
    
    const roleData = generalManagerDoc.data();
    const currentPermissions = roleData.permissions || [];
    
    console.log(`\n📊 General Manager Role ID: ${generalManagerDoc.id}`);
    console.log(`📊 Current permissions count: ${currentPermissions.length}`);
    
    // Check which permissions are missing
    const missingPermissions = newPermissions.filter(p => !currentPermissions.includes(p));
    
    if (missingPermissions.length === 0) {
      console.log('✅ All production planning permissions already exist!');
      process.exit(0);
    }
    
    console.log(`\n➕ Adding ${missingPermissions.length} missing permissions:`);
    missingPermissions.forEach(p => console.log(`   - ${p}`));
    
    // Add new permissions
    const updatedPermissions = [...currentPermissions, ...missingPermissions];
    
    // Update the role
    await db.collection('roles').doc(generalManagerDoc.id).update({
      permissions: updatedPermissions
    });
    
    console.log(`\n✅ Successfully updated General Manager role!`);
    console.log(`📊 New permissions count: ${updatedPermissions.length}`);
    console.log('\n🔄 Users with General Manager role will see changes on next login.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating role:', error);
    process.exit(1);
  }
}

// Run the update
addProductionPlanningPermissions();
