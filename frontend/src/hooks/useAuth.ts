import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthUser extends User {
  role?: 'employee' | 'manager' | 'admin';
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.data()?.role || 'employee';
        
        setUser({ ...user, role });
        setUserRole(role);
      } else {
        setUser(null);
        setUserRole('employee');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, userRole, loading };
}
