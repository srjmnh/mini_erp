import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { supabase } from '@/config/supabase';
import { UserRole } from '@/types/auth';

interface AuthUser extends User {
  department?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  userRole: UserRole | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state observer...', {
      currentUser: auth.currentUser?.email,
      loading,
      timestamp: new Date().toISOString()
    });

    // Set up auth state observer
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Sync with Supabase auth
      if (user) {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: user.uid // Using Firebase UID as password for Supabase
        });
        if (error) {
          console.error('Error syncing with Supabase:', error);
        } else {
          console.log('Synced with Supabase:', session);
        }
      } else {
        await supabase.auth.signOut();
      }
      console.log('Auth state changed:', { 
        user: user ? { 
          uid: user.uid, 
          email: user.email, 
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          metadata: user.metadata,
          providerId: user.providerId,
          refreshToken: !!user.refreshToken
        } : null,
        currentUser: auth.currentUser?.email,
        loading,
        timestamp: new Date().toISOString()
      });

      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          console.log('Raw user document:', userDoc.exists() ? userDoc.data() : 'not found');
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Found user document:', userData);
            
            // If role is HR0 or hr, set as HR0
            const role = (userData.role === 'HR0' || userData.role === 'hr') ? 'HR0' : (userData.role as UserRole);
            console.log('Setting user role:', role, 'from userData.role:', userData.role);
            setUserRole(role);

            // Fetch department from employees collection using email
            const employeesRef = collection(db, 'employees');
            const employeeQuery = query(employeesRef, where('email', '==', user.email));
            const employeeSnapshot = await getDocs(employeeQuery);

            if (!employeeSnapshot.empty) {
              const employeeData = employeeSnapshot.docs[0].data();
              console.log('Found employee data:', employeeData);
              setUser({
                ...user,
                department: employeeData.department
              });
            } else {
              console.log('No employee record found for email:', user.email);
              setUser(user);
            }
          } else {
            console.log('No user document found, checking email');
            // For demo@demo.com, set as HR0
            if (user.email === 'demo@demo.com') {
              console.log('Setting demo user as HR0');
              setUserRole('HR0');
            } else {
              console.log('Defaulting to employee role');
              setUserRole('employee');
            }
          }
        } catch (error) {
          console.error('Error getting user role:', error);
          setUserRole('HR0'); // Fallback to HR0 for legacy accounts
        }
      } else {
        setUserRole(null);
      }

      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      console.log('Attempting email/password sign in...');
      const result = await firebaseSignInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', result.user.email);
    } catch (error) {
      console.error('Error signing in with email/password:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    userRole,
    signInWithGoogle,
    signInWithEmailAndPassword,
    signOut,
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
