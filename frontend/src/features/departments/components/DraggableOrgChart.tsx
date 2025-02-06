import React from 'react';
import { Box, Paper, Typography, Stack, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Draggable } from 'react-beautiful-dnd';
import { Department, Employee } from '../../../types';

interface DraggableOrgChartProps {
  department: Department;
  subDepartments: Department[];
  employees: Employee[];
  onEmployeeMove: (employeeId: string, newDepartmentId: string) => Promise<void>;
  onCreateSubDepartment: (name: string, description: string) => Promise<void>;
  onDeleteSubDepartment: (subDepartmentId: string) => Promise<void>;
}

const DraggableOrgChart: React.FC<DraggableOrgChartProps> = ({
  department,
  subDepartments,
  employees,
  onEmployeeMove,
  onCreateSubDepartment,
  onDeleteSubDepartment,
}) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Stack spacing={2}>
        {/* Main Department */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 2,
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            position: 'relative'
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {department.name}
          </Typography>
          <Typography variant="body2">
            {employees.length} members
          </Typography>
        </Paper>

        {/* Sub Departments */}
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          {subDepartments.map((subDept) => (
            <Paper
              key={subDept.id}
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                minWidth: 200,
                position: 'relative'
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2">
                    {subDept.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {employees.filter(e => e.departmentId === subDept.id).length} members
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => onDeleteSubDepartment(subDept.id)}
                  sx={{ 
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    '&:hover': {
                      color: 'error.main'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* Draggable Employee Area */}
              <Box
                sx={{
                  mt: 2,
                  p: 1,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  minHeight: 50
                }}
              >
                {employees
                  .filter(e => e.departmentId === subDept.id)
                  .map((employee, index) => (
                    <Draggable
                      key={employee.id}
                      draggableId={employee.id}
                      index={index}
                    >
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            p: 1,
                            mb: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            '&:last-child': { mb: 0 },
                            cursor: 'grab',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                        >
                          <Typography variant="body2">
                            {employee.name}
                          </Typography>
                        </Box>
                      )}
                    </Draggable>
                  ))}
              </Box>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};

export default DraggableOrgChart;
