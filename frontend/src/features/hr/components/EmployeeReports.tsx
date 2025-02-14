import React, { useState, useEffect } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Avatar,
  TablePagination,
  TextField,
  InputAdornment,
} from '@mui/material';
import LoadingAnimation from '@/components/common/LoadingAnimation';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Event as EventIcon,
  Computer as ComputerIcon,
  AccessTime as AccessTimeIcon,
  MonetizationOn as MonetizationOnIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import { collection, query, getDocs, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format, isValid } from 'date-fns';

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Date not available';
  const date = new Date(dateString);
  return isValid(date) ? format(date, 'PP') : 'Invalid date';
};

interface Equipment {
  id: string;
  name: string;
  type: string;
  assignedDate: string;
  serialNumber?: string;
  notes?: string;
}

interface LeaveBalance {
  casual: number;
  sick: number;
  year: number;
  used: {
    casual: number;
    sick: number;
  };
}

interface EmployeeReport {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: {
    id: string;
    name: string;
  };
  position: string;
  avatar?: string;
  equipment: Equipment[];
  billedHours: number;
  unbilledHours: number;
  leaveBalance: LeaveBalance;
  latestSalary?: {
    amount: number;
    generatedAt: string;
  };
}

const EmployeeReports = () => {
  const [employees, setEmployees] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeReport[]>([]);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(
      (employee) =>
        (employee.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.department?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
    setPage(0);
  }, [searchTerm, employees]);

  const fetchEmployeeData = async () => {
    try {
      console.log('Fetching employee data...');
      const employeesQuery = query(collection(db, 'employees'));
      const employeesSnapshot = await getDocs(employeesQuery);
      console.log('Found employees:', employeesSnapshot.size);
      const employeeData: EmployeeReport[] = [];

      // Helper function to get employee name parts
      const getEmployeeNameParts = (employee: any) => {
        // Case 1: name object with firstName/lastName
        if (employee.name?.firstName || employee.name?.lastName) {
          return {
            firstName: employee.name.firstName || '',
            lastName: employee.name.lastName || ''
          };
        }
        // Case 2: direct firstName/lastName fields
        if (employee.firstName || employee.lastName) {
          return {
            firstName: employee.firstName || '',
            lastName: employee.lastName || ''
          };
        }
        // Case 3: just name field
        if (employee.name && typeof employee.name === 'string') {
          const parts = employee.name.split(' ');
          return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
          };
        }
        return { firstName: '', lastName: '' };
      };

      for (const employeeDoc of employeesSnapshot.docs) {
        const employee = employeeDoc.data();
        console.log('Processing employee:', {
          id: employeeDoc.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          name: employee.name,
          fullData: employee
        });
        console.log('Employee raw data:', {
          id: employeeDoc.id,
          ...employee,
        });
        console.log('Processing employee:', employee.email);
        
        // Log specific fields we're interested in
        console.log('Equipment:', employee.equipment);
        console.log('Payroll:', employee.payroll);
        console.log('Department:', employee.department);

        // Fetch leave balance with current year
        const currentYear = new Date().getFullYear();
        const balanceId = `${employeeDoc.id}-${currentYear}`;
        const leaveBalanceRef = doc(db, 'leaveBalances', balanceId);
        const leaveBalanceDoc = await getDoc(leaveBalanceRef);
        console.log('Leave balance doc exists:', leaveBalanceDoc.exists());
        
        let leaveBalance;
        if (leaveBalanceDoc.exists()) {
          const data = leaveBalanceDoc.data();
          console.log('Leave balance data:', data);
          leaveBalance = {
            casual: data.casual || 25,
            sick: data.sick || 999,
            year: currentYear,
            used: {
              casual: data.used?.casual || 0,
              sick: data.used?.sick || 0
            }
          };
        } else {
          // Default values if no balance exists
          leaveBalance = {
            casual: 25,
            sick: 999,
            year: currentYear,
            used: {
              casual: 0,
              sick: 0
            }
          };
        }
        
        // Ensure the used values are properly structured
        if (!leaveBalance.used || typeof leaveBalance.used !== 'object') {
          leaveBalance.used = {
            casual: 0,
            sick: 0
          };
        }
        
        // Convert any string numbers to actual numbers
        leaveBalance.casual = Number(leaveBalance.casual);
        leaveBalance.sick = Number(leaveBalance.sick);
        leaveBalance.used.casual = Number(leaveBalance.used.casual);
        leaveBalance.used.sick = Number(leaveBalance.used.sick);
        console.log('Final leave balance:', leaveBalance);

        // Fetch timesheet data
        console.log('Employee data:', employee);
        let billedHours = 0;
        let unbilledHours = 0;

        // First get the user document by email
        if (employee.email) {
          console.log('Finding user by email:', employee.email);
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', employee.email)
          );
          const userSnapshot = await getDocs(usersQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const userId = userSnapshot.docs[0].id;
            console.log('Found user:', { userId, email: userData.email });
            
            // Now get timesheet entries using this user's ID
            const timesheetQuery = query(
              collection(db, 'timeEntries'),
              where('employeeId', '==', userId)
            );
            const timesheetSnapshot = await getDocs(timesheetQuery);
            console.log('Found timesheet entries:', timesheetSnapshot.size);

            timesheetSnapshot.forEach((timeDoc) => {
              const entry = timeDoc.data();
              console.log('Raw timesheet entry:', entry);
              console.log('Entry billed hours (raw):', entry.billedHours, 'type:', typeof entry.billedHours);
              console.log('Entry unbilled hours (raw):', entry.unbilledHours, 'type:', typeof entry.unbilledHours);
              
              // Convert string values to numbers and handle null/undefined
              const billed = entry.billedHours ? parseFloat(entry.billedHours) : 0;
              const unbilled = entry.unbilledHours ? parseFloat(entry.unbilledHours) : 0;
              
              console.log('Parsed billed hours:', billed, 'type:', typeof billed);
              console.log('Parsed unbilled hours:', unbilled, 'type:', typeof unbilled);
              
              if (!isNaN(billed)) {
                billedHours += billed;
                console.log('Running total billed:', billedHours);
              }
              if (!isNaN(unbilled)) {
                unbilledHours += unbilled;
                console.log('Running total unbilled:', unbilledHours);
              }
            });
            
            // Round to 2 decimal places
            billedHours = Number(billedHours.toFixed(2));
            unbilledHours = Number(unbilledHours.toFixed(2));
            
            console.log('Final hours calculated:', { 
              employeeId: employeeDoc.id,
              billedHours, 
              unbilledHours 
            });
          }
        } else {
          console.log('No email found for employee:', employeeDoc.id);
        }

        // Get latest salary from payroll array
        const payroll = Array.isArray(employee.payroll) ? employee.payroll : [];
        console.log('Payroll data:', payroll);
        
        // Sort payroll entries by date in descending order
        const sortedPayroll = [...payroll].sort((a, b) => {
          const dateA = a.date?.seconds || 0;
          const dateB = b.date?.seconds || 0;
          return dateB - dateA;
        });

        // Get the latest salary entry
        const latestPayrollEntry = sortedPayroll[0];
        const latestSalary = latestPayrollEntry ? {
          amount: Number(latestPayrollEntry.baseSalary || latestPayrollEntry.totalSalary || 0),
          generatedAt: latestPayrollEntry.date ? new Date(latestPayrollEntry.date.seconds * 1000).toISOString() : null
        } : undefined;

        console.log('Latest salary:', latestSalary);

        // Ensure department has the correct structure
        const department = typeof employee.department === 'object' && employee.department
          ? { 
              id: employee.department.id || employee.departmentId || '',
              name: employee.department.name || ''
            }
          : { id: employee.departmentId || '', name: '' };

        // Process equipment data
        const equipment = Array.isArray(employee.equipment)
          ? employee.equipment.map(item => ({
              id: item.id || '',
              name: item.name || 'Unnamed Equipment',
              type: item.type || 'Other',
              assignedDate: item.assignedDate || null,
              serialNumber: item.serialNumber || '',
              notes: item.notes || ''
            }))
          : [];

        // Process leave balance with defaults
        const defaultLeaveBalance = {
          used: { casual: 0, sick: 0 },
          total: { casual: 20, sick: 12 }
        };

        const processedLeaveBalance = {
          used: {
            casual: leaveBalance?.used?.casual || defaultLeaveBalance.used.casual,
            sick: leaveBalance?.used?.sick || defaultLeaveBalance.used.sick
          },
          total: {
            casual: leaveBalance?.total?.casual || defaultLeaveBalance.total.casual,
            sick: leaveBalance?.total?.sick || defaultLeaveBalance.total.sick
          }
        };

        const nameParts = getEmployeeNameParts(employee);
        employeeData.push({
          id: employeeDoc.id,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          fullName: `${nameParts.firstName} ${nameParts.lastName}`.trim() || 'Unknown',
          email: employee.email || '',
          department,
          position: employee.position || '',
          avatar: employee.avatar || '',
          equipment,
          billedHours,
          unbilledHours,
          leaveBalance: processedLeaveBalance,
          latestSalary: latestSalary ? {
            amount: Math.max(0, latestSalary.amount),
            generatedAt: latestSalary.generatedAt
          } : undefined
        });
      }

      setEmployees(employeeData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return <LoadingAnimation />;
  }

  return (
    <Paper sx={{ p: 3 }}>      
      {/* Leave Balance Chart */}
      <Box sx={{ height: 400, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Employee Leave Usage
        </Typography>
        <ResponsiveBar
          data={employees.map(emp => ({
            employee: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
            'Casual Leave': emp.leaveBalance?.used?.casual || 0,
            'Sick Leave': emp.leaveBalance?.used?.sick || 0,
          }))}
          keys={['Casual Leave', 'Sick Leave']}
          indexBy="employee"
          margin={{ top: 50, right: 170, bottom: 50, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={['#ff9800', '#f44336']}
          groupMode="grouped"
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Employee',
            legendPosition: 'middle',
            legendOffset: 45
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Days',
            legendPosition: 'middle',
            legendOffset: -40
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 160,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 140,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 20,
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          role="application"
          ariaLabel="Employee Leave Usage"
        />
      </Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Employee Reports
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Leave Status</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Latest Salary</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar src={employee.avatar} sx={{ mr: 2 }}>
                        {employee.firstName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {employee.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{employee.department.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Tooltip title="Casual Leave (Used/Total)">
                      <Chip
                        icon={<EventIcon />}
                        label={`${employee.leaveBalance?.used?.casual || 0}/${employee.leaveBalance?.casual || 25}`}
                        size="small"
                        sx={{ mr: 1 }}
                        color={((employee.leaveBalance?.used?.casual || 0) >= (employee.leaveBalance?.casual || 25)) ? 'error' : 'default'}
                      />
                    </Tooltip>
                    <Tooltip title="Sick Leave (Used/Total)">
                      <Chip
                        icon={<EventIcon />}
                        label={`${employee.leaveBalance?.used?.sick || 0}/${employee.leaveBalance?.sick || 999}`}
                        size="small"
                        color={((employee.leaveBalance?.used?.sick || 0) >= (employee.leaveBalance?.sick || 999)) ? 'error' : 'secondary'}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {employee.equipment.map((item, index) => {
                        const type = (item.type || '').toLowerCase();
                        const name = item.name || 'Unnamed Equipment';
                        return (
                          <Tooltip 
                            key={index}
                            title={
                              `${item.type || 'Unknown Type'}
                              ${item.serialNumber ? `\nSerial No: ${item.serialNumber}` : ''}
                              ${item.notes ? `\nNotes: ${item.notes}` : ''}
                              \nAssigned on: ${formatDate(item.assignedDate)}`
                            }
                          >
                            <Chip
                              icon={type.includes('laptop') ? <ComputerIcon /> : 
                                   type.includes('phone') ? <PhoneAndroidIcon /> :
                                   <DevicesIcon />}
                              label={name}
                              size="small"
                              variant="outlined"
                              sx={{ maxWidth: 150 }}
                            />
                          </Tooltip>
                        );
                      })}
                      {employee.equipment.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No equipment assigned
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Total Billed Hours">
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={`${employee.billedHours > 0 ? employee.billedHours.toFixed(1) : 0} hrs`}
                        size="small"
                        color="success"
                        sx={{ mr: 1 }}
                      />
                    </Tooltip>
                    <Tooltip title="Total Unbilled Hours">
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={`${employee.unbilledHours > 0 ? employee.unbilledHours.toFixed(1) : 0} hrs`}
                        size="small"
                        color="warning"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {employee.latestSalary ? (
                      <Tooltip title={
                        `Generated on ${formatDate(employee.latestSalary.generatedAt)}`
                      }>
                        <Chip
                          icon={<MonetizationOnIcon />}
                          label={`$${Number(employee.latestSalary.amount).toFixed(2)}`}
                          size="small"
                          color="success"
                        />
                      </Tooltip>
                    ) : (
                      <Chip
                        label="No salary data"
                        size="small"
                        color="default"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredEmployees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default EmployeeReports;