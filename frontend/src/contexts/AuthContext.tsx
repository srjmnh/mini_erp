import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { UserRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
