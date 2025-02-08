import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export async function makeUserAdmin(email: string = 'demo@demo.com') {
  try {
    console.log('Looking for user:', email);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.error('No user found with email:', email);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    console.log('Found user:', userDoc.id);
    
    await updateDoc(doc(db, 'users', userDoc.id), {
      role: 'HR0',
      updatedAt: new Date()
    });

    console.log('Successfully updated user role to HR0');
    window.location.reload(); // Reload to update UI
  } catch (error) {
    console.error('Error making user admin:', error);
  }
}
