// ============================================================================
// BROWSER CONSOLE SCRIPT - Copy and paste into browser console
// ============================================================================
// This will add the 6 new Production Planning permissions to General Manager
// 
// Steps:
// 1. Open https://iris-os-43718.web.app in your browser
// 2. Press F12 (or Cmd+Option+I on Mac) to open DevTools Console
// 3. Copy this ENTIRE file and paste it into the console
// 4. Press Enter to run
// 5. Wait for "SUCCESS!" message
// 6. Refresh the page (F5 or Cmd+R)
// ============================================================================

(async function() {
  console.clear();
  console.log('%c🔧 Production Planning Permission Fixer', 'font-size:16px;font-weight:bold;color:#e63c3c');
  console.log('━'.repeat(60));
  
  try {
    // Get Firestore from your app (it's already loaded)
    const { collection, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Get db from window (your app exposes it)
    const db = window.db;
    if (!db) {
      throw new Error('Firestore db not found. Make sure you are on the app page.');
    }
    
    console.log('✅ Connected to Firestore');
    
    const newPermissions = [
      'production.plans.create',
      'production.plans.edit',
      'production.plans.delete',
      'production.plans.view',
      'production.override_conflicts',
      'production.restore_archived'
    ];
    
    console.log('\n🔍 Finding General Manager role...');
    
    // Get all roles
    const rolesSnapshot = await getDocs(collection(db, 'roles'));
    let gmRoleId = null;
    let gmData = null;
    
    rolesSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name === 'General Manager') {
        gmRoleId = docSnap.id;
        gmData = data;
      }
    });
    
    if (!gmRoleId) {
      console.error('❌ General Manager role not found in Firestore');
      console.log('\n📋 Available roles:');
      rolesSnapshot.forEach(docSnap => {
        console.log(`   - ${docSnap.data().name} (ID: ${docSnap.id})`);
      });
      return;
    }
    
    console.log(`✅ Found: ${gmData.name} (${gmRoleId})`);
    
    const currentPerms = gmData.permissions || [];
    console.log(`📊 Current permissions: ${currentPerms.length}`);
    
    // Check what's missing
    const missing = newPermissions.filter(p => !currentPerms.includes(p));
    
    if (missing.length === 0) {
      console.log('\n✅ All production planning permissions already exist!');
      console.log('━'.repeat(60));
      return;
    }
    
    console.log(`\n➕ Adding ${missing.length} missing permissions:`);
    missing.forEach((p, i) => {
      console.log(`   ${i+1}. ${p}`);
    });
    
    // Update the role in Firestore
    const roleRef = doc(db, 'roles', gmRoleId);
    await updateDoc(roleRef, {
      permissions: [...currentPerms, ...missing]
    });
    
    console.log('\n%c✅ SUCCESS!', 'font-size:14px;font-weight:bold;color:#00ff00');
    console.log(`📊 Updated: ${currentPerms.length} → ${currentPerms.length + missing.length} permissions`);
    console.log('\n%c🔄 REFRESH THE PAGE NOW (F5 or Cmd+R)', 'font-size:14px;font-weight:bold;color:#ffaa00;background:#000;padding:8px');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n💡 Manual Alternative:');
    console.log('   1. Go to Admin Hub → Roles tab');
    console.log('   2. Click "Edit" on General Manager');
    console.log('   3. Enable these 6 permissions:');
    console.log('      • production.plans.create');
    console.log('      • production.plans.edit');
    console.log('      • production.plans.delete');
    console.log('      • production.plans.view');
    console.log('      • production.override_conflicts');
    console.log('      • production.restore_archived');
    console.log('   4. Save');
    console.log('━'.repeat(60));
  }
})();
