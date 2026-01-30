// Run this in browser console on your app page to add calendar.view to Copywriter role
// Make sure you're logged in as an admin

(async function addCalendarViewToCopywriter() {
  console.log('🔧 Adding calendar.view permission to Copywriter role...');
  
  try {
    // Get Firestore instance
    const db = window.firebase?.firestore?.() || window.db;
    if (!db) {
      console.error('❌ Firestore not available. Make sure you are on the app page.');
      return;
    }

    // Find Copywriter role
    const rolesSnapshot = await db.collection('roles').get();
    let copywriterRole = null;
    let copywriterDocId = null;

    rolesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name === 'Copywriter') {
        copywriterRole = data;
        copywriterDocId = doc.id;
      }
    });

    if (!copywriterRole) {
      console.error('❌ Copywriter role not found in Firestore');
      return;
    }

    console.log('📋 Current Copywriter permissions:', copywriterRole.permissions);

    // Check if calendar.view already exists
    if (copywriterRole.permissions.includes('calendar.view')) {
      console.log('✅ calendar.view permission already exists for Copywriter');
      return;
    }

    // Add calendar.view permission
    const updatedPermissions = [...copywriterRole.permissions];
    
    // Find position after 'assets.upload' to insert calendar.view
    const assetsUploadIndex = updatedPermissions.indexOf('assets.upload');
    if (assetsUploadIndex !== -1) {
      updatedPermissions.splice(assetsUploadIndex + 1, 0, 'calendar.view');
    } else {
      // If assets.upload not found, just add it before calendar.manage
      const calendarManageIndex = updatedPermissions.indexOf('calendar.manage');
      if (calendarManageIndex !== -1) {
        updatedPermissions.splice(calendarManageIndex, 0, 'calendar.view');
      } else {
        // Fallback: add at the end
        updatedPermissions.push('calendar.view');
      }
    }

    // Update Firestore
    await db.collection('roles').doc(copywriterDocId).update({
      permissions: updatedPermissions,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Successfully added calendar.view to Copywriter role');
    console.log('📋 Updated permissions:', updatedPermissions);
    console.log('🔄 Please refresh the page to see changes');

  } catch (error) {
    console.error('❌ Error updating Copywriter role:', error);
  }
})();
