import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import type { Employee, Department } from '@/contexts/FirestoreContext';

interface DraggableOrgChartProps {
  department: Department;
  subDepartments: Department[];
  employees: Employee[];
  onEmployeeClick?: (employeeId: string) => void;
  onEmployeeMove: (employeeId: string, newDepartmentId: string | null, newSubDepartmentId: string | null) => Promise<void>;
  onCreateSubDepartment: (name: string, description: string) => Promise<void>;
  onDeleteSubDepartment: (subDepartmentId: string) => Promise<void>;
}

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

interface DraggableEmployeeProps {
  employee: Employee;
  onClick?: () => void;
}

function DraggableEmployee({ employee, onClick }: DraggableEmployeeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: employee.id,
    data: { type: 'employee', employee },
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{ 
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <EmployeeCard
        employee={employee}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </Box>
  );
}

interface DroppableContainerProps {
  id: string;
  items: Employee[];
  title: string;
  onDelete?: () => void;
  renderItem: (item: Employee) => React.ReactNode;
}

function DroppableContainer({ id, items, title, onDelete, renderItem }: DroppableContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        minWidth: 300,
        bgcolor: isOver 
          ? alpha(theme.palette.primary.main, 0.1)
          : id === 'main'
            ? alpha(theme.palette.primary.main, 0.05)
            : alpha(theme.palette.info.main, 0.05),
        borderRadius: 2,
        transition: 'background-color 0.2s ease',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {title}
        </Typography>
        {onDelete && (
          <IconButton
            size="small"
            color="error"
            onClick={onDelete}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Stack>
      <Box
        ref={setNodeRef}
        sx={{
          minHeight: 100,
          transition: 'background-color 0.2s ease',
          '&:empty': {
            backgroundColor: alpha(theme.palette.divider, 0.1),
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
          },
        }}
      >
        {items.map((item) => renderItem(item))}
      </Box>
    </Paper>
  );
}

const EmployeeCard = React.memo(({ employee, onClick, isDragging, dragHandleProps }: EmployeeCardProps) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={isDragging ? 8 : 1}
      sx={{
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
        cursor: 'grab',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.05),
        },
      }}
      onClick={onClick}
    >
      <Box {...dragHandleProps}>
        <DragIcon color="action" />
      </Box>
      <Avatar
        src={employee.photoUrl}
        sx={{
          width: 40,
          height: 40,
          border: '2px solid',
          borderColor: employee.isManager 
            ? 'primary.main'
            : employee.isDeputyManager
              ? 'success.main'
              : employee.isSubDepartmentHead
                ? 'info.main'
                : 'grey.300',
        }}
      >
        {employee.firstName[0]}{employee.lastName[0]}
      </Avatar>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2">
          {employee.firstName} {employee.lastName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {employee.position}
        </Typography>
      </Box>
      {(employee.isManager || employee.isDeputyManager || employee.isSubDepartmentHead) && (
        <Chip
          size="small"
          label={
            employee.isManager 
              ? 'Department Head'
              : employee.isDeputyManager
                ? 'Deputy Manager'
                : 'Sub-Department Head'
          }
          color={
            employee.isManager
              ? 'primary'
              : employee.isDeputyManager
                ? 'success'
                : 'info'
          }
        />
      )}
    </Paper>
  );
});

function DraggableOrgChart({
  department,
  subDepartments,
  employees,
  onEmployeeClick,
  onEmployeeMove,
  onCreateSubDepartment,
  onDeleteSubDepartment,
}: DraggableOrgChartProps) {
  const theme = useTheme();
  const [openNewDeptDialog, setOpenNewDeptDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const employeeId = active.id as string;
    const containerId = over.id as string;

    let newDepartmentId: string | null = null;
    let newSubDepartmentId: string | null = null;

    if (containerId === 'main') {
      newDepartmentId = department.id;
      newSubDepartmentId = null;
    } else {
      newDepartmentId = department.id;
      newSubDepartmentId = containerId;
    }

    try {
      await onEmployeeMove(employeeId, newDepartmentId, newSubDepartmentId);
    } catch (error) {
      console.error('Error moving employee:', error);
      alert('Failed to move employee. Please try again.');
    }
    
    setActiveId(null);
  };

  const handleCreateSubDepartment = async () => {
    if (!newDeptName.trim()) return;
    await onCreateSubDepartment(newDeptName, newDeptDescription);
    setNewDeptName('');
    setNewDeptDescription('');
    setOpenNewDeptDialog(false);
  };

  const mainDepartmentEmployees = employees.filter(
    e => e.departmentId === department.id && !e.subDepartmentId
  );

  const draggingEmployee = activeId ? employees.find(e => e.id === activeId) : null;

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
          Organization Structure
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewDeptDialog(true)}
        >
          Add Sub-Department
        </Button>
      </Stack>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Main Department */}
          <DroppableContainer
            id="main"
            title={department.name}
            items={mainDepartmentEmployees}
            renderItem={(employee) => (
              <DraggableEmployee
                key={employee.id}
                employee={employee}
                onClick={() => onEmployeeClick?.(employee.id)}
              />
            )}
          />

          {/* Sub Departments */}
          {subDepartments.map((subDept) => {
            const subDeptEmployees = employees.filter(
              e => e.subDepartmentId === subDept.id
            );

            return (
              <DroppableContainer
                key={subDept.id}
                id={subDept.id}
                title={subDept.name}
                items={subDeptEmployees}
                onDelete={() => onDeleteSubDepartment(subDept.id)}
                renderItem={(employee) => (
                  <DraggableEmployee
                    key={employee.id}
                    employee={employee}
                    onClick={() => onEmployeeClick?.(employee.id)}
                  />
                )}
              />
            );
          })}
        </Box>

        <DragOverlay>
          {draggingEmployee && (
            <EmployeeCard
              employee={draggingEmployee}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* New Sub-Department Dialog */}
      <Dialog
        open={openNewDeptDialog}
        onClose={() => setOpenNewDeptDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Sub-Department</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Department Name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newDeptDescription}
              onChange={(e) => setNewDeptDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewDeptDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSubDepartment}
            disabled={!newDeptName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export { DraggableOrgChart };
