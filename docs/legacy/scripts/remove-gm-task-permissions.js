/**
 * Script to remove ALL task-related permissions from General Manager role
 * Run this with: node scripts/remove-gm-task-permissions.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeTaskPermissions() {
  try {
    const roleRef = db.collection('roles').doc('r1'); // General Manager role ID
    const roleDoc = await roleRef.get();
    
    if (!roleDoc.exists) {
      console.log('❌ General Manager role not found');
      return;
    }
    
    const roleData = roleDoc.data();
    const currentPermissions = roleData.permissions || [];
    
    console.log('📋 Current permissions count:', currentPermissions.length);
    
    // Remove ALL permissions that start with 'tasks.' or 'task_files.'
    const filteredPermissions = currentPermissions.filter(p => 
      !p.startsWith('tasks.') && !p.startsWith('task_files.')
    );
    
    const removedCount = currentPermissions.length - filteredPermissions.length;
    
    console.log('🗑️  Removing', removedCount, 'task-related permissions');
    console.log('✨ New permissions count:', filteredPermissions.length);
    
    // List removed permissions
    const removed = currentPermissions.filter(p => 
      p.startsWith('tasks.') || p.startsWith('task_files.')
    );
    console.log('\n🚫 Removed permissions:');
    removed.forEach(p => console.log('  -', p));
    
    // Update Firestore
    await roleRef.update({
      permissions: filteredPermissions
    });
    
    console.log('\n✅ Successfully updated General Manager role');
    console.log('🔄 Please refresh your browser to see changes');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

removeTaskPermissions();
