import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Button, Dialog } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Role, EmployeeRoleHistory } from '@/types/roles';
import { Employee } from '@/types/models';
import RoleForm from './RoleForm';
import PromotionDialog from './PromotionDialog';
import { getRoles, getRoleHistory } from '@/services/roleService';
import { getEmployees } from '@/config/firebase';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roleHistory, setRoleHistory] = useState<EmployeeRoleHistory[]>([]);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [openPromotionDialog, setOpenPromotionDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesData, employeesData] = await Promise.all([
        getRoles(),
        getEmployees()
      ]);
      setRoles(rolesData);
      setEmployees(employeesData);

      // Fetch role history for all employees
      const allHistory = await Promise.all(
        employeesData.map(emp => getRoleHistory(emp.id))
      );
      setRoleHistory(allHistory.flat());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const employeeColumns = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'currentRole', headerName: 'Current Role', width: 200 },
    { field: 'salary', headerName: 'Salary', width: 150 },
    { field: 'level', headerName: 'Level', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params: any) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setSelectedEmployee(params.row);
            setOpenPromotionDialog(true);
          }}
        >
          Manage Promotion
        </Button>
      ),
    },
  ];

  const roleColumns = [
    { field: 'title', headerName: 'Role Title', width: 200 },
    { field: 'level', headerName: 'Level', width: 150 },
    { field: 'baseSalary', headerName: 'Base Salary', width: 150 },
    { field: 'overtimeRate', headerName: 'Overtime Rate', width: 150 },
    { 
      field: 'seniorityLevels', 
      headerName: 'Seniority Levels', 
      width: 200,
      renderCell: (params: any) => (
        params.value?.map((level: any) => level.title).join(', ')
      )
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Payroll & Role Management</Typography>
        <Button 
          variant="contained" 
          onClick={() => setOpenRoleDialog(true)}
        >
          Add New Role
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="Employees" />
        <Tab label="Roles" />
        <Tab label="Promotion History" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && (
          <DataGrid
            rows={employees}
            columns={employeeColumns}
            pageSize={10}
            autoHeight
          />
        )}
        {activeTab === 1 && (
          <DataGrid
            rows={roles}
            columns={roleColumns}
            pageSize={10}
            autoHeight
          />
        )}
        {activeTab === 2 && (
          <DataGrid
            rows={roleHistory}
            columns={[
              { field: 'employeeName', headerName: 'Employee', width: 200 },
              { field: 'previousRole', headerName: 'Previous Role', width: 200 },
              { field: 'newRole', headerName: 'New Role', width: 200 },
              { field: 'effectiveFrom', headerName: 'Effective From', width: 200 },
              { field: 'promotionNotes', headerName: 'Notes', width: 300 },
            ]}
            pageSize={10}
            autoHeight
          />
        )}
      </Box>

      <RoleForm
        open={openRoleDialog}
        onClose={() => setOpenRoleDialog(false)}
        onSubmit={fetchData}
      />

      <PromotionDialog
        open={openPromotionDialog}
        onClose={() => setOpenPromotionDialog(false)}
        employee={selectedEmployee}
        roles={roles}
        onSubmit={() => {
          fetchData();
        }}
      />
    </Box>
  );
}
