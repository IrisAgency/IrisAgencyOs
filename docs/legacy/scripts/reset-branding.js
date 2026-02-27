/**
 * Reset Branding Script
 * 
 * This script deletes the branding document from Firestore,
 * forcing the app to re-initialize with values from branding.config.ts
 * 
 * Usage: node scripts/reset-branding.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read Firebase config
const firebaseConfig = JSON.parse(readFileSync('./firebase.json', 'utf8'));

// Initialize Firebase (you'll need to add your config here)
const app = initializeApp({
  // Add your Firebase config from lib/firebase.ts
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function resetBranding() {
  try {
    console.log('🗑️  Deleting branding document from Firestore...');
    await deleteDoc(doc(db, 'settings', 'branding'));
    console.log('✅ Branding document deleted!');
    console.log('📝 Next time you load the app, it will use branding.config.ts values');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

resetBranding();
