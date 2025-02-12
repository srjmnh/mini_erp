import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Employee } from '@/types/employee';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesList: Employee[] = [];
      employeesSnapshot.forEach((doc) => {
        employeesList.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeesList);
    };

    fetchEmployees();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
                Employees
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 3 }} />

            <TableContainer>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {employee.firstName} {employee.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{employee.department}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{employee.position}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{employee.email}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={RouterLink}
                          to={`/hr/employee/${employee.id}/report`}
                          startIcon={<AssessmentIcon />}
                          variant="contained"
                          size="small"
                          sx={{
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' },
                          }}
                        >
                          View Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
      </Box>
    </Container>
  );
}
