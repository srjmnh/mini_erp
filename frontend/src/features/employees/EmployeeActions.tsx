import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  Typography,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Transform as TransformIcon,
} from '@mui/icons-material';
import { Employee } from '@/types/employee';
import { Department } from '@/types/department';
import { useEmployeeTransfer } from './useEmployeeTransfer';
import { useFirestore } from '@/contexts/FirestoreContext';
import { ManagerSuccessionDialog } from '@/features/departments/ManagerSuccessionDialog';

interface EmployeeActionsProps {
  employee: Employee;
  onEdit?: () => void;
  onSuccess?: () => void;
}

export const EmployeeActions: React.FC<EmployeeActionsProps> = ({
  employee,
  onEdit,
  onSuccess,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [deputyManager, setDeputyManager] = useState<Employee | undefined>();

  const { db } = useFirestore();
  const { transferEmployee, loading } = useEmployeeTransfer({ onSuccess });

  useEffect(() => {
    const loadDepartments = async () => {
      const departmentsSnapshot = await db.collection('departments').get();
      const depts = departmentsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(dept => dept.id !== employee.departmentId); // Exclude current department
      setDepartments(depts);
    };

    loadDepartments();
  }, [db, employee.departmentId]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!employee.departmentId) return;

      // Get all employees in the department
      const employeesSnapshot = await db.collection('employees')
        .where('departmentId', '==', employee.departmentId)
        .get();

      const employees = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTeamMembers(employees);

      // Get deputy if exists
      const departmentSnapshot = await db.collection('departments')
        .doc(employee.departmentId)
        .get();
      
      if (departmentSnapshot.exists) {
        const deptData = departmentSnapshot.data();
        if (deptData?.deputyManagerId) {
          const deputy = employees.find(emp => emp.id === deptData.deputyManagerId);
          setDeputyManager(deputy);
        }
      }
    };

    loadTeamMembers();
  }, [db, employee.departmentId]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTransferClick = () => {
    setTransferDialogOpen(true);
    handleClose();
  };

  const handleTransferDialogClose = () => {
    setTransferDialogOpen(false);
    setSelectedDepartment('');
  };

  const handleTransferConfirm = async () => {
    if (!selectedDepartment) return;

    // Do the transfer - it will automatically handle department head cases
    const success = await transferEmployee(
      employee.id,
      selectedDepartment
    );

    if (success) {
      setTransferDialogOpen(false);
      setSelectedDepartment('');
      onSuccess?.();
    }
  };

  return (
    <>
      <IconButton
        aria-label="more"
        aria-controls="long-menu"
        aria-haspopup="true"
        onClick={handleClick}
        size="small"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={onEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleTransferClick}>
          <ListItemIcon>
            <TransformIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Transfer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Transfer Dialog */}
      <Dialog 
        open={transferDialogOpen} 
        onClose={handleTransferDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transfer Employee</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Select the new department for {employee.name}
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Department</InputLabel>
            <Select
              value={selectedDepartment}
              label="Select Department"
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTransferDialogClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransferConfirm}
            variant="contained" 
            disabled={loading || !selectedDepartment}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
