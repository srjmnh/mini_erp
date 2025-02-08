import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserRole } from '@/types/auth';

export async function updateUserRole(userId: string, role: UserRole) {
  try {
    const userRef = doc(db, 'users', userId);
    
    // First check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    // Update the role
    await updateDoc(userRef, {
      role,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}
