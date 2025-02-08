import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Initialize Firebase Admin with service account
const serviceAccount = require('../service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function makeUserAdmin() {
  const email = 'demo@demo.com';
  
  try {
    // First get the user from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    console.log('Found user in Firebase Auth:', userRecord.uid);
    
    // Update password
    await auth.updateUser(userRecord.uid, {
      password: 'demo123'
    });
    console.log('Updated password to: demo123');
    // Now create/update the Firestore document
    const usersRef = db.collection('users');
    const userDoc = usersRef.doc(userRecord.uid);
    
    // Create or update the user document
    await userDoc.set({
      email,
      role: 'HR0',
      displayName: 'Demo User',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('Successfully created/updated user with role HR0');

    console.log('Successfully created/updated user with role HR0');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

makeUserAdmin();
