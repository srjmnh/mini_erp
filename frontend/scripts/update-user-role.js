import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, '..', 'service-account.json');

// Read service account file
const serviceAccount = JSON.parse(
  await readFile(serviceAccountPath, 'utf8')
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateUserRole(email, role) {
  try {
    // Get user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      console.log('No user found with email:', email);
      return;
    }

    // Update the first matching user
    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully updated role to ${role} for user:`, email);
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Update demo@demo.com to HR role
updateUserRole('demo@demo.com', 'HR0');
