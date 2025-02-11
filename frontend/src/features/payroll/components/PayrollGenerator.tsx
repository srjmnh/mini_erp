import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { format } from 'date-fns';

interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  position: string;
  regularHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  totalSalary: number;
}

interface PayrollGeneratorProps {
  departmentId: string;
}

export const PayrollGenerator: React.FC<PayrollGeneratorProps> = ({ departmentId }) => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPayroll, setGeneratedPayroll] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<Array<{
    id: string;
    month: number;
    year: number;
    date: Date;
    entries: PayrollEntry[];
  }>>([]);

  // Fetch payroll history
  useEffect(() => {
    const fetchPayrollHistory = async () => {
      try {
        const payrollRef = collection(db, 'payroll');
        const q = query(
          payrollRef,
          where('departmentId', '==', departmentId),
          where('year', '==', year)
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        }));
        setPayrollHistory(history);
      } catch (err) {
        console.error('Error fetching payroll history:', err);
      }
    };

    fetchPayrollHistory();
  }, [departmentId, year]);

  const calculateHours = (timeIn: Date, timeOut: Date) => {
    const hours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
    return Number(hours.toFixed(2));
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the date range for the selected month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      // Get all employees in the department
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(employeesRef, where('departmentId', '==', departmentId));
      const employeesSnapshot = await getDocs(employeesQuery);

      // Get attendance records for the month
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      // Process each employee
      const payrollData = await Promise.all(
        employeesSnapshot.docs.map(async (empDoc) => {
          const empData = empDoc.data();
          
          // Get employee's attendance records
          const employeeAttendance = attendanceSnapshot.docs
            .filter(doc => doc.data().employeeId === empDoc.id)
            .map(doc => ({
              ...doc.data(),
              date: doc.data().date.toDate(),
              timeIn: doc.data().timeIn.toDate(),
              timeOut: doc.data().timeOut?.toDate()
            }));

          // Calculate total hours
          let totalRegularHours = 0;
          let totalOvertimeHours = 0;

          employeeAttendance.forEach(record => {
            if (record.timeOut) {
              const dailyHours = calculateHours(record.timeIn, record.timeOut);
              if (dailyHours <= 8) {
                totalRegularHours += dailyHours;
              } else {
                totalRegularHours += 8;
                totalOvertimeHours += dailyHours - 8;
              }
            }
          });

          // Calculate salary
          const hourlyRate = empData.salary / (8 * 22); // Assuming 22 working days
          const overtimeRate = empData.overtimeRate || 1.5;
          const regularPay = hourlyRate * totalRegularHours;
          const overtimePay = hourlyRate * overtimeRate * totalOvertimeHours;

          return {
            employeeId: empDoc.id,
            employeeName: `${empData.firstName} ${empData.lastName}`,
            position: empData.position,
            regularHours: totalRegularHours,
            overtimeHours: totalOvertimeHours,
            baseSalary: regularPay,
            overtimePay: overtimePay,
            totalSalary: regularPay + overtimePay
          };
        })
      );

      setGeneratedPayroll(payrollData);
      setShowPreview(true);
    } catch (err) {
      console.error('Error generating payroll:', err);
      setError('Failed to generate payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setShowPreview(false);
    // You could add additional logic here, like marking the payroll as approved
  };

  return (
    <Box>
      {/* Payroll History */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Payroll History
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Generated On</TableCell>
                <TableCell>Employees</TableCell>
                <TableCell align="right">Total Amount ($)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payrollHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.year, record.month), 'MMMM yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(record.date, 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {record.entries.length}
                  </TableCell>
                  <TableCell align="right">
                    {record.entries
                      .reduce((sum, entry) => sum + entry.totalSalary, 0)
                      .toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        setGeneratedPayroll(record.entries);
                        setShowPreview(true);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {payrollHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No payroll history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Typography variant="h6" gutterBottom>
        Generate Monthly Payroll
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Month</InputLabel>
          <Select
            value={month}
            label="Month"
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i} value={i}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={year}
            label="Year"
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <MenuItem key={i} value={new Date().getFullYear() - 2 + i}>
                {new Date().getFullYear() - 2 + i}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Generate Payroll'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Payroll Preview - {format(new Date(year, month), 'MMMM yyyy')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell align="right">Regular Hours</TableCell>
                  <TableCell align="right">Regular Pay ($)</TableCell>
                  <TableCell align="right">Overtime Hours</TableCell>
                  <TableCell align="right">Overtime Pay ($)</TableCell>
                  <TableCell align="right">Total ($)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {generatedPayroll.map((entry) => (
                  <TableRow key={entry.employeeId}>
                    <TableCell>{entry.employeeName}</TableCell>
                    <TableCell>{entry.position}</TableCell>
                    <TableCell align="right">
                      {entry.regularHours.toFixed(1)}
                    </TableCell>
                    <TableCell align="right">
                      {entry.baseSalary.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {entry.overtimeHours.toFixed(1)}
                    </TableCell>
                    <TableCell align="right">
                      {entry.overtimePay.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{entry.totalSalary.toFixed(2)}</strong>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                setLoading(true);
                // Save to Firestore
                const payrollRef = collection(db, 'payroll');
                const docRef = await addDoc(payrollRef, {
                  departmentId,
                  month,
                  year,
                  date: new Date(),
                  entries: generatedPayroll
                });

                // Update local history
                setPayrollHistory(prev => [{
                  id: docRef.id,
                  month,
                  year,
                  date: new Date(),
                  entries: generatedPayroll
                }, ...prev]);

                setShowPreview(false);
              } catch (err) {
                console.error('Error saving payroll:', err);
                setError('Failed to save payroll');
              } finally {
                setLoading(false);
              }
            }} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
