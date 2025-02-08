import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface LeaveBalance {
  casualLeaves: number;
  sickLeaves: number;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  roleId: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
}

export interface Department {
  id: string;
  name: string;
  managerId?: string;
}

export const getEmployeeLeaveBalance = async (employeeId: string): Promise<LeaveBalance> => {
  try {
    const balanceRef = doc(db, 'leaveBalances', employeeId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (!balanceDoc.exists()) {
      return {
        casualLeaves: 25, // Default balance
        sickLeaves: 999999, // Unlimited
        updatedAt: new Date()
      };
    }

    const data = balanceDoc.data();
    return {
      casualLeaves: data.casualLeaves,
      sickLeaves: data.sickLeaves,
      updatedAt: data.updatedAt.toDate()
    };
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    throw error;
  }
};

export const getEmployeeManager = async (employeeId: string): Promise<Employee | null> => {
  try {
    // Get employee's department
    const employeeRef = doc(db, 'employees', employeeId);
    const employeeDoc = await getDoc(employeeRef);
    
    if (!employeeDoc.exists()) {
      throw new Error('Employee not found');
    }

    const employeeData = employeeDoc.data();
    const departmentId = employeeData.departmentId;

    // Get department info to find manager
    const departmentRef = doc(db, 'departments', departmentId);
    const departmentDoc = await getDoc(departmentRef);

    if (!departmentDoc.exists()) {
      return null;
    }

    const departmentData = departmentDoc.data() as Department;
    if (!departmentData.headId) {
      return null;
    }

    // Get department head's info
    const managerRef = doc(db, 'employees', departmentData.headId);
    const managerDoc = await getDoc(managerRef);

    if (!managerDoc.exists()) {
      return null;
    }

    const managerData = managerDoc.data() as Employee;
    return {
      ...managerData,
      id: managerDoc.id
    };
  } catch (error) {
    console.error('Error getting employee manager:', error);
    return null;
  }
};
