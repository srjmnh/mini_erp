import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Employee } from '@/types/employee';
import { LeaveBalance } from '@/types/leave';
import { Asset } from '@/types/asset';
import { PayrollRecord } from '@/types/payroll';

export default function EmployeeReportPage() {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!employeeId) return;

      // Fetch employee details
      const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
      if (employeeDoc.exists()) {
        setEmployee(employeeDoc.data() as Employee);
      }

      // Fetch leave balance
      const leaveBalanceDoc = await getDoc(doc(db, 'leaveBalances', employeeId));
      if (leaveBalanceDoc.exists()) {
        setLeaveBalance(leaveBalanceDoc.data() as LeaveBalance);
      }

      // Fetch assigned assets
      const assetsQuery = query(
        collection(db, 'assets'),
        where('assignedTo', '==', employeeId)
      );
      const assetsSnapshot = await getDocs(assetsQuery);
      const assignedAssets: Asset[] = [];
      assetsSnapshot.forEach((doc) => {
        assignedAssets.push({ id: doc.id, ...doc.data() } as Asset);
      });
      setAssets(assignedAssets);

      // Fetch latest payroll
      const payrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employeeId)
      );
      const payrollSnapshot = await getDocs(payrollQuery);
      const payrollRecords: PayrollRecord[] = [];
      payrollSnapshot.forEach((doc) => {
        payrollRecords.push({ id: doc.id, ...doc.data() } as PayrollRecord);
      });
      if (payrollRecords.length > 0) {
        // Sort by date and get the latest
        const latest = payrollRecords.sort((a, b) => 
          b.payPeriodEnd.toMillis() - a.payPeriodEnd.toMillis()
        )[0];
        setLatestPayroll(latest);
      }
    };

    fetchEmployeeData();
  }, [employeeId]);

  if (!employee) {
    return (
      <Container>
        <Typography>Loading employee data...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Employee Report
        </Typography>

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography>
                        {employee.firstName} {employee.lastName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography>{employee.email}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Department
                      </Typography>
                      <Typography>{employee.department}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Position
                      </Typography>
                      <Typography>{employee.position}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Leave Balance */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Leave Balance
              </Typography>
              {leaveBalance ? (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Annual Leave"
                      secondary={`${leaveBalance.annual} days remaining`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Sick Leave"
                      secondary={`${leaveBalance.sick} days remaining`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Casual Leave"
                      secondary={`${leaveBalance.casual} days remaining`}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography color="text.secondary">No leave balance found</Typography>
              )}
            </Paper>
          </Grid>

          {/* Assigned Assets */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Assigned Assets
              </Typography>
              {assets.length > 0 ? (
                <List>
                  {assets.map((asset) => (
                    <ListItem key={asset.id}>
                      <ListItemText
                        primary={asset.name}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              {asset.type} • {asset.status}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Serial: {asset.serialNumber}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No assets assigned</Typography>
              )}
            </Paper>
          </Grid>

          {/* Latest Payroll */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Latest Payroll Information
              </Typography>
              {latestPayroll ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Basic Salary
                        </Typography>
                        <Typography>
                          ${latestPayroll.basicSalary.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Allowances
                        </Typography>
                        <Typography>
                          ${latestPayroll.allowances.toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Deductions
                        </Typography>
                        <Typography color="error">
                          ${latestPayroll.deductions.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Net Salary
                        </Typography>
                        <Typography variant="h6" color="primary">
                          ${latestPayroll.netSalary.toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  No payroll information found
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
