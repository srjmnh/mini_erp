import { useState, useEffect } from 'react';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Employee, Department } from '@/types/firestore';

interface ManagerData {
  department: Department | null;
  departmentEmployees: Employee[];
  departmentProjects: any[];
  loading: boolean;
  error: string | null;
}

export function useManagerData(): ManagerData {
  const [managerData, setManagerData] = useState<ManagerData>({
    department: null,
    departmentEmployees: [],
    departmentProjects: [],
    loading: true,
    error: null,
  });

  const { employees, departments } = useFirestore();
  const { projects } = useProjects();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setManagerData(prev => ({ ...prev, loading: false, error: 'No user found' }));
      return;
    }

    if (!employees.length || !departments.length) {
      setManagerData(prev => ({ ...prev, loading: true }));
      return;
    }

    try {
      // Find the manager's employee record
      const managerEmployee = employees.find(emp => emp.email === user.email);
      if (!managerEmployee) {
        setManagerData(prev => ({ ...prev, loading: false, error: 'Manager employee record not found' }));
        return;
      }

      // Get manager's department
      const department = departments.find(dept => dept.id === managerEmployee.departmentId);
      if (!department) {
        setManagerData(prev => ({ ...prev, loading: false, error: 'Department not found' }));
        return;
      }

      // Get department employees
      const departmentEmployees = employees.filter(emp => emp.departmentId === department.id);

      // Get department projects
      const departmentProjects = projects.filter(project => 
        // Check if the department is assigned to the project
        project.departments?.some(dept => dept.id === department.id) ||
        // Check if any department employee is a project member
        project.members?.some(member => 
          departmentEmployees.some(emp => emp.id === member.employeeId)
        )
      );

      setManagerData({
        department,
        departmentEmployees,
        departmentProjects,
        loading: false,
        error: null,
      });
    } catch (error) {
      setManagerData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  }, [user, employees, departments, projects]);

  return managerData;
}
