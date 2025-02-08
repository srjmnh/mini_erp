import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { CreateUserAccountData, UserAccount, UserRole } from '@/types/auth';

export class AuthService {
  static async createUserAccount(data: CreateUserAccountData): Promise<UserAccount> {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const { user } = userCredential;

      // Update user profile
      await updateProfile(user, {
        displayName: data.displayName
      });

      // Create user document in Firestore
      const userAccount: UserAccount = {
        uid: user.uid,
        email: data.email,
        role: data.role,
        employeeId: data.employeeId,
        displayName: data.displayName,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), {
        ...userAccount,
        createdAt: Timestamp.fromDate(userAccount.createdAt),
        updatedAt: Timestamp.fromDate(userAccount.updatedAt)
      });

      // If this is an employee/manager account, update the employee document
      if (data.employeeId) {
        await setDoc(doc(db, 'employees', data.employeeId), {
          hasUserAccount: true,
          userRole: data.role,
          uid: user.uid
        }, { merge: true });
      }

      // Send password reset email so user can set their own password
      await sendPasswordResetEmail(auth, data.email);

      // Sign out the newly created user to prevent automatic sign-in
      await signOut(auth);

      return userAccount;
    } catch (error: any) {
      // If there's an error, make sure to sign out
      await signOut(auth).catch(console.error);
      console.error('Error creating user account:', error);
      throw new Error(error.message || 'Failed to create user account');
    }
  }

  static async getCurrentUser(): Promise<UserAccount | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return null;

      return userDoc.data() as UserAccount;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  static async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      await setDoc(doc(db, 'users', uid), {
        role,
        updatedAt: Timestamp.fromDate(new Date())
      }, { merge: true });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      throw new Error(error.message || 'Failed to update user role');
    }
  }
}
