import React from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Stack,
  IconButton,
  Avatar,
  Chip,
  alpha,
  useTheme,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import { useDrop, useDrag } from 'react-dnd';
import { Department, Employee } from '@/types';

interface OrgChartProps {
  department: Department;
  subDepartments: Department[];
  employees: Employee[];
  onEmployeeMove: (employeeId: string, toDepartmentId: string) => void;
  onCreateSubDepartment: (name: string, description: string) => void;
  onDeleteSubDepartment: (subDepartmentId: string) => void;
  onUpdateDepartmentHead: (departmentId: string, employeeId: string) => void;
}

interface DraggableEmployeeProps {
  employee: Employee;
  departmentId: string;
}

const DraggableEmployee: React.FC<DraggableEmployeeProps> = ({ employee, departmentId }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'employee',
    item: { id: employee.id, fromDepartmentId: departmentId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <Box
      ref={drag}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        mb: 1
      }}
    >
      <Paper
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04)
          }
        }}
      >
        <DragIndicatorIcon sx={{ color: 'text.secondary' }} />
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main'
          }}
        >
          {employee.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            {employee.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {employee.position}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

interface DroppableAreaProps {
  departmentId: string;
  onDrop: (employeeId: string, fromDepartmentId: string, toDepartmentId: string) => void;
  children?: React.ReactNode;
}

const DroppableArea: React.FC<DroppableAreaProps> = ({ departmentId, onDrop, children }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'employee',
    drop: (item: { id: string; fromDepartmentId: string }) => {
      onDrop(item.id, item.fromDepartmentId, departmentId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <Box
      ref={drop}
      sx={{
        height: '100%',
        bgcolor: isOver ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
        transition: 'background-color 0.2s',
        borderRadius: 1
      }}
    >
      {children}
    </Box>
  );
};

const SubDepartment: React.FC<{
  department: Department;
  employees: Employee[];
  onEmployeeMove: (employeeId: string, fromDepartmentId: string, toDepartmentId: string) => void;
  onDelete: () => void;
}> = ({ department, employees, onEmployeeMove, onDelete }) => {
  const departmentEmployees = employees.filter(e => e.departmentId === department.id);
  const head = employees.find(e => e.id === department.managerId);

  return (
    <Card 
      sx={{ 
        width: 280,
        bgcolor: 'background.paper',
        boxShadow: (theme) => `0 0 0 1px ${alpha(theme.palette.divider, 0.8)}`
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={500}>
            {department.name}
          </Typography>
          <IconButton 
            size="small" 
            onClick={onDelete}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        {head ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main'
              }}
            >
              {head.name.charAt(0)}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {head.name}
            </Typography>
            <Chip
              label="Head"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main'
              }}
            />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No head assigned
          </Typography>
        )}
      </Box>
      
      <DroppableArea
        departmentId={department.id}
        onDrop={onEmployeeMove}
      >
        <Box sx={{ p: 2 }}>
          {departmentEmployees.length === 0 ? (
            <Box
              sx={{
                p: 2,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                textAlign: 'center'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Drop employees here
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {departmentEmployees.map(employee => (
                <DraggableEmployee
                  key={employee.id}
                  employee={employee}
                  departmentId={department.id}
                />
              ))}
            </Stack>
          )}
        </Box>
      </DroppableArea>
    </Card>
  );
};

export const OrgChart: React.FC<OrgChartProps> = ({
  department,
  subDepartments,
  employees,
  onEmployeeMove,
  onCreateSubDepartment,
  onDeleteSubDepartment,
  onUpdateDepartmentHead
}) => {
  const theme = useTheme();

  const handleEmployeeMove = (employeeId: string, fromDepartmentId: string, toDepartmentId: string) => {
    if (fromDepartmentId === toDepartmentId) return;
    onEmployeeMove(employeeId, toDepartmentId);
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={500}>
          Organization Structure
        </Typography>
        <Button
          startIcon={<AddIcon />}
          size="small"
          onClick={() => {
            // TODO: Show create sub-department dialog
            onCreateSubDepartment('New Department', '');
          }}
        >
          Add Sub-department
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexWrap: 'wrap'
        }}
      >
        {subDepartments.map(subDept => (
          <SubDepartment
            key={subDept.id}
            department={subDept}
            employees={employees}
            onEmployeeMove={handleEmployeeMove}
            onDelete={() => onDeleteSubDepartment(subDept.id)}
          />
        ))}
      </Box>
    </Box>
  );
};
