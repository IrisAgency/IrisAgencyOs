/**
 * Browser Console Script to Remove Task Permissions from General Manager
 * 
 * HOW TO USE:
 * 1. Open your app in the browser
 * 2. Press F12 to open Developer Console
 * 3. Copy and paste this ENTIRE script into the console
 * 4. Press Enter
 * 5. Refresh the page after it completes
 */

(async function removeTaskPermissions() {
  console.log('🚀 Starting task permission removal...');
  
  try {
    // Import Firebase (it's already loaded in your app)
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase.ts');
    
    // Get General Manager role
    const roleRef = doc(db, 'roles', 'r1');
    const roleDoc = await getDoc(roleRef);
    
    if (!roleDoc.exists()) {
      console.error('❌ General Manager role not found');
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
    await updateDoc(roleRef, {
      permissions: filteredPermissions
    });
    
    console.log('\n✅ Successfully updated General Manager role!');
    console.log('🔄 Please REFRESH your browser now to see changes');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Alternative: Go to Admin Panel → Roles → General Manager');
    console.log('   Then manually uncheck all task-related permissions');
  }
})();
