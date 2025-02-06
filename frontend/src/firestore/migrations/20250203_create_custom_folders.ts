import * as admin from 'firebase-admin';

export async function up(db: admin.firestore.Firestore) {
  // Create custom folders collection
  const customFoldersRef = db.collection('customFolders');
  
  // Add indexes
  await db.collection('customFolders').doc('__indexes__').set({
    // Index for querying folders by parent
    parentId: {
      fields: ['parentId', 'name'],
      method: 'ASCENDING',
    },
    // Index for querying folders by creator
    createdBy: {
      fields: ['createdBy', 'createdAt'],
      method: 'DESCENDING',
    },
  });

  // Add security rules
  const rules = `
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /customFolders/{folderId} {
          allow read: if request.auth != null;
          allow create: if request.auth != null;
          allow update: if request.auth != null 
            && request.auth.uid == resource.data.createdBy;
          allow delete: if request.auth != null 
            && request.auth.uid == resource.data.createdBy;
        }
      }
    }
  `;

  // Note: You'll need to apply these rules manually in the Firebase Console
  // or using the Firebase CLI
  console.log('Apply these Firestore rules:');
  console.log(rules);
}

export async function down(db: admin.firestore.Firestore) {
  // Remove indexes
  await db.collection('customFolders').doc('__indexes__').delete();
  
  // Delete all documents in the collection
  const batch = db.batch();
  const snapshot = await db.collection('customFolders').get();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}
