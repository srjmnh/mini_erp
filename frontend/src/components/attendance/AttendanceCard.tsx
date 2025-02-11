import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Divider,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function AttendanceCard() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<{
    id?: string;
    timeIn?: Date;
    timeOut?: Date;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{
    id: string;
    department: string;
  } | null>(null);

  // Fetch employee data using email
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user?.email) return;
      
      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', user.email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const employeeDoc = snapshot.docs[0];
          const data = employeeDoc.data();
          console.log('Found employee data:', data);
          setEmployeeData({
            id: employeeDoc.id,
            department: data.department
          });
        } else {
          console.error('No employee found with email:', user.email);
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
      }
    };

    fetchEmployeeData();
  }, [user?.email]);

  // Check today's attendance
  useEffect(() => {
    const checkTodayAttendance = async () => {
      if (!employeeData?.id) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('employeeId', '==', employeeData.id), // Use employee ID instead of user ID
        where('date', '>=', today),
        where('date', '<', tomorrow)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setTodayAttendance({
          id: doc.id,
          ...doc.data(),
          timeIn: doc.data().timeIn?.toDate(),
          timeOut: doc.data().timeOut?.toDate(),
        });
      } else {
        setTodayAttendance(null);
      }
    };

    checkTodayAttendance();
  }, [employeeData?.id]);

  // Handle attendance
  const handleAttendance = async (type: 'in' | 'out') => {
    if (!employeeData?.id || isLoading) return;
    
    setIsLoading(true);

    try {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (type === 'in') {
        const attendanceRef = collection(db, 'attendance');
        const newAttendance = {
          employeeId: employeeData.id, // Use employee ID instead of user ID
          date: today,
          timeIn: now,
          department: employeeData.department,
          employeeName: user?.displayName || 'Unknown User',
        };
        const docRef = await addDoc(attendanceRef, newAttendance);
        setTodayAttendance({ id: docRef.id, timeIn: now });
      } else if (todayAttendance?.id) {
        const attendanceRef = doc(db, 'attendance', todayAttendance.id);
        await updateDoc(attendanceRef, {
          timeOut: now,
        });
        setTodayAttendance({ ...todayAttendance, timeOut: now });
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Attendance</Typography>
        <Typography variant="body2" color="textSecondary">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {todayAttendance?.timeIn && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Time In: {todayAttendance.timeIn.toLocaleTimeString()}
        </Typography>
      )}
      {todayAttendance?.timeOut && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Time Out: {todayAttendance.timeOut.toLocaleTimeString()}
        </Typography>
      )}
      <Button
        variant="contained"
        fullWidth
        disabled={isLoading || (todayAttendance?.timeIn && todayAttendance?.timeOut) || !employeeData}
        color={!todayAttendance?.timeIn ? 'primary' : 'error'}
        startIcon={!todayAttendance?.timeIn ? <LoginIcon /> : <LogoutIcon />}
        onClick={() => handleAttendance(!todayAttendance?.timeIn ? 'in' : 'out')}
      >
        {!employeeData ? 'Employee Not Found' :
         !todayAttendance?.timeIn ? 'Log In for the Day' : 
         !todayAttendance?.timeOut ? 'Log Out for the Day' : 'Logged Out'}
      </Button>
    </Paper>
  );
}
