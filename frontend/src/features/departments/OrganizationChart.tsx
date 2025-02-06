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
  managerId?: string;
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
  const manager = employees.find(e => e.id === department.managerId);
  const deputyManager = employees.find(e => e.id === department.deputyManagerId);
  
  // Group employees by who they report to
  const employeesByManager = departmentEmployees.reduce((acc, emp) => {
    const reportsTo = emp.reportsTo || 'root';
    if (!acc[reportsTo]) {
      acc[reportsTo] = [];
    }
    if (emp.id !== manager?.id && emp.id !== deputyManager?.id) {
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
          ? alpha(theme.palette.primary.main, 0.1)
          : role === 'deputy'
            ? alpha(theme.palette.success.main, 0.1)
            : alpha(theme.palette.grey[100], 0.5),
        '&:hover': {
          bgcolor: role === 'manager'
            ? alpha(theme.palette.primary.main, 0.2)
            : role === 'deputy'
              ? alpha(theme.palette.success.main, 0.2)
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
        }}
      >
        {employee.firstName[0]}{employee.lastName[0]}
      </Avatar>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
            sx={{ mt: 1 }}
          />
        )}
      </Box>
    </Paper>
  );

  const renderTeam = (managerId: string = 'root') => {
    const teamMembers = employeesByManager[managerId] || [];
    
    return teamMembers.map((employee) => (
      <TreeItem
        key={employee.id}
        nodeId={employee.id}
        label={renderEmployee(employee, 'member')}
        sx={{
          '& .MuiTreeItem-content': {
            p: 0.5,
          },
        }}
      >
        {employeesByManager[employee.id] && renderTeam(employee.id)}
      </TreeItem>
    ));
  };

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
        Organizational Structure
      </Typography>
      <TreeView
        defaultExpanded={['root', 'management', ...(manager ? [manager.id] : []), ...(deputyManager ? [deputyManager.id] : [])]}
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        sx={{
          '& .MuiTreeItem-group': {
            ml: 4,
            borderLeft: `2px dashed ${theme.palette.divider}`,
            pt: 2,
            pb: 2,
          },
        }}
      >
        <TreeItem
          nodeId="management"
          label={
            <Stack spacing={2}>
              {manager && renderEmployee(manager, 'manager')}
              {deputyManager && (
                <Box sx={{ ml: 4 }}>
                  {renderEmployee(deputyManager, 'deputy')}
                </Box>
              )}
            </Stack>
          }
        >
          {renderTeam(manager?.id || 'root')}
        </TreeItem>
      </TreeView>
    </Card>
  );
}
