import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, CircularProgress } from '@mui/material';
import { PayrollGenerator } from '../../payroll/components/PayrollGenerator';
import { useAuth } from '../../../hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const HRPayrollPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      console.log('Current user:', user);
      if (!user?.email) {
        console.log('No user email found');
        return;
      }

      try {
        // Query employees collection using email
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', user.email));
        console.log('Querying employees with email:', user.email);
        const querySnapshot = await getDocs(q);
        console.log('Query results:', querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (!querySnapshot.empty) {
          const employeeDoc = querySnapshot.docs[0];
          const employeeData = employeeDoc.data();
          console.log('Found employee data:', employeeData);
          setDepartmentId(employeeData.departmentId);
          console.log('Set department ID to:', employeeData.departmentId);
        } else {
          console.log('No employee record found');
          setError('Employee record not found');
        }
      } catch (err) {
        console.error('Error fetching employee data:', err);
        setError('Failed to fetch employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [user]);

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !departmentId) {
    return (
      <Container>
        <Typography color="error">
          {error || 'Error: Department information not found'}
        </Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Management
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <PayrollGenerator departmentId={departmentId} />
        </Paper>
      </Box>
    </Container>
  );
};

export default HRPayrollPage;
