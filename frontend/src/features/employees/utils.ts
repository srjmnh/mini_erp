import { Department, Employee } from './types';

export const getDepartmentName = (departments: Department[], departmentId: string | undefined) => {
  if (!departments?.length) return 'Loading...';
  if (!departmentId) return 'Not Assigned';
  
  // Find department by ID in the departments collection
  const department = departments.find(d => d.id === departmentId);
  console.log('Finding department:', { 
    departmentId, 
    departmentFound: department?.name, 
    allDepartments: departments.map(d => ({ id: d.id, name: d.name }))
  });
  
  return department?.name || 'Not Assigned';
};

export const isEmployeeDepartmentHead = (departments: Department[] | undefined | null, employeeId: string) => {
  if (!departments || !Array.isArray(departments)) return false;
  return departments.some(dept => dept.headId === employeeId);
};

export const getDepartmentHeadOf = (departments: Department[], employees: Employee[], employeeId: string) => {
  const employee = employees.find(e => e.id === employeeId);
  return employee?.departmentId ? getDepartmentName(departments, employee.departmentId) : null;
};

export const getManagerName = (departments: Department[], employees: Employee[], employeeId: string) => {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee?.departmentId) {
    return 'No Department';
  }
  
  const department = departments.find(d => d.id === employee.departmentId);
  if (!department?.headId) {
    return 'No Department Head';
  }

  // If the employee is the department head
  if (department.headId === employeeId) {
    return 'Department Head';
  }
  
  const departmentHead = employees.find(e => e.id === department.headId);
  return departmentHead ? departmentHead.name : 'Unknown Manager';
};
