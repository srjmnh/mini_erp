import React from 'react';
import {
  Box,
  Card,
  Avatar,
  Typography,
  useTheme,
  alpha,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import { TreeItem, TreeView } from '@mui/lab';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  photoUrl?: string;
  departmentId?: string;
  reportsTo?: string | null;
  isManager?: boolean;
  isDeputyManager?: boolean;
}

interface Department {
  id: string;
  name: string;
  headId?: string;
  deputyManagerId?: string;
  description?: string;
}

interface OrganizationChartProps {
  department: Department;
  employees: Employee[];
  onEmployeeClick?: (employeeId: string) => void;
}

export default function OrganizationChart({ department, employees, onEmployeeClick }: OrganizationChartProps) {
  const theme = useTheme();

  const departmentEmployees = employees.filter(e => e.departmentId === department.id);
  const head = employees.find(e => e.id === department.headId);
  
  // Group employees by who they report to
  const employeesByManager = departmentEmployees.reduce((acc, emp) => {
    const reportsTo = emp.reportsTo || 'root';
    if (!acc[reportsTo]) {
      acc[reportsTo] = [];
    }
    if (emp.id !== head?.id) {
      acc[reportsTo].push(emp);
    }
    return acc;
  }, {} as Record<string, Employee[]>);

  const renderEmployee = (employee: Employee, role?: 'manager' | 'deputy' | 'member') => (
    <Paper
      elevation={0}
      onClick={() => onEmployeeClick?.(employee.id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: role === 'manager' 
          ? alpha(theme.palette.primary.main, 0.15)
          : role === 'deputy'
            ? alpha(theme.palette.success.main, 0.15)
            : 'background.paper',
        border: '1px solid',
        borderColor: role === 'manager'
          ? 'primary.main'
          : role === 'deputy'
            ? 'success.main'
            : 'divider',
        '&:hover': {
          bgcolor: role === 'manager'
            ? alpha(theme.palette.primary.main, 0.25)
            : role === 'deputy'
              ? alpha(theme.palette.success.main, 0.25)
              : alpha(theme.palette.grey[200], 0.5),
          transform: 'translateY(-2px)',
          transition: 'all 0.2s',
        },
      }}
    >
      <Avatar
        src={employee.photoUrl}
        alt={`${employee.firstName} ${employee.lastName}`}
        sx={{
          width: 48,
          height: 48,
          border: '2px solid',
          borderColor: role === 'manager'
            ? 'primary.main'
            : role === 'deputy'
              ? 'success.main'
              : 'grey.300',
          bgcolor: role === 'manager'
            ? 'primary.main'
            : role === 'deputy'
              ? 'success.main'
              : 'grey.100',
        }}
      >
        {employee.firstName[0]}{employee.lastName[0]}
      </Avatar>
      <Box>
        <Typography variant="subtitle1" sx={{ 
          fontWeight: role === 'manager' ? 700 : role === 'deputy' ? 600 : 500,
          color: role === 'manager' ? 'primary.main' : 'text.primary'
        }}>
          {employee.firstName} {employee.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {employee.position}
        </Typography>
        {role && (
          <Chip
            label={role === 'manager' ? 'Department Head' : role === 'deputy' ? 'Deputy Manager' : 'Team Member'}
            size="small"
            color={role === 'manager' ? 'primary' : role === 'deputy' ? 'success' : 'default'}
            sx={{ 
              mt: 1,
              fontWeight: role === 'manager' ? 600 : 400,
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />
        )}
      </Box>
    </Paper>
  );

  if (!manager && !deputyManager && departmentEmployees.length === 0) {
    return (
      <Card sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No employees in this department yet
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3, fontWeight: 600 }}>
        Department Members
      </Typography>
      <Stack spacing={2}>
        {manager && renderEmployee(manager, 'manager')}
        {deputyManager && renderEmployee(deputyManager, 'deputy')}
        {departmentEmployees
          .filter(emp => emp.id !== manager?.id && emp.id !== deputyManager?.id)
          .map(employee => (
            <Box key={employee.id}>
              {renderEmployee(employee, 'member')}
            </Box>
          ))
        }
      </Stack>
    </Card>
  );
}
