import { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthUser extends User {
  role?: 'employee' | 'manager' | 'admin';
  departmentId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<'employee' | 'manager' | 'admin'>('employee');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          // Get employee data to get departmentId
          const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
          const employeeData = employeeDoc.data();
          
          console.log('User data:', userData);
          console.log('Employee data:', employeeData);

          setUser({ 
            ...user, 
            role: userData?.role || 'employee',
            departmentId: employeeData?.departmentId
          });
          setUserRole(userData?.role || 'employee');
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setUserRole('employee');
        }
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
