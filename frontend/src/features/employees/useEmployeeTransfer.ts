import { useState } from 'react';
import { useFirestore } from '@/contexts/FirestoreContext';
import { Employee } from '@/types/employee';
import { useSnackbar } from '@/hooks/useSnackbar';

interface UseEmployeeTransferProps {
  onSuccess?: () => void;
}

export const useEmployeeTransfer = ({ onSuccess }: UseEmployeeTransferProps = {}) => {
  const { db } = useFirestore();
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  const checkDepartmentHead = async (employeeId: string): Promise<{
    isDepartmentHead: boolean;
    departmentId?: string;
    departmentName?: string;
    deputyId?: string;
  }> => {
    try {
      // Get department where this employee is a head
      const departmentsSnapshot = await db.collection('departments')
        .where('managerId', '==', employeeId)
        .get();

      if (departmentsSnapshot.empty) {
        return { isDepartmentHead: false };
      }

      const department = departmentsSnapshot.docs[0].data();
      return {
        isDepartmentHead: true,
        departmentId: departmentsSnapshot.docs[0].id,
        departmentName: department.name,
        deputyId: department.deputyManagerId
      };
    } catch (error) {
      console.error('Error checking department head:', error);
      throw new Error('Failed to check department head status');
    }
  };

  const promoteDeputyToHead = async (
    departmentId: string,
    deputyId: string,
    oldHeadId: string
  ) => {
    try {
      // Update department
      await db.collection('departments').doc(departmentId).update({
        managerId: deputyId,
        deputyManagerId: null, // Clear deputy position
        updatedAt: new Date().toISOString()
      });

      // Clear old head's status
      await db.collection('employees').doc(oldHeadId).update({
        isManager: false,
        isDepartmentHead: false,
        isDeputyManager: false,
        updatedAt: new Date().toISOString()
      });

      // Update deputy's status to department head
      await db.collection('employees').doc(deputyId).update({
        isManager: true,
        isDepartmentHead: true,
        isDeputyManager: false,
        updatedAt: new Date().toISOString()
      });

      showSnackbar('Deputy manager promoted to department head', 'success');
    } catch (error) {
      console.error('Error promoting deputy:', error);
      throw new Error('Failed to promote deputy manager');
    }
  };

  const clearDepartmentHead = async (
    departmentId: string,
    oldHeadId: string
  ) => {
    try {
      // Update department to have no head
      await db.collection('departments').doc(departmentId).update({
        managerId: null,
        updatedAt: new Date().toISOString()
      });

      // Clear old head's status
      await db.collection('employees').doc(oldHeadId).update({
        isManager: false,
        isDepartmentHead: false,
        isDeputyManager: false,
        updatedAt: new Date().toISOString()
      });

      showSnackbar('Warning: Department now has no head', 'warning');
    } catch (error) {
      console.error('Error clearing department head:', error);
      throw new Error('Failed to clear department head');
    }
  };

  const transferEmployee = async (
    employeeId: string,
    newDepartmentId: string
  ) => {
    try {
      setLoading(true);

      // Check if employee is a department head
      const { isDepartmentHead, departmentId, deputyId } = 
        await checkDepartmentHead(employeeId);

      // If employee is a department head
      if (isDepartmentHead && departmentId) {
        if (deputyId) {
          // If there's a deputy, promote them
          await promoteDeputyToHead(departmentId, deputyId, employeeId);
        } else {
          // If no deputy, just clear the head position
          await clearDepartmentHead(departmentId, employeeId);
        }
      }

      // Update employee's department and clear all manager statuses
      await db.collection('employees').doc(employeeId).update({ 
        departmentId: newDepartmentId,
        isManager: false,
        isDepartmentHead: false,
        isDeputyManager: false,
        updatedAt: new Date().toISOString()
      });

      showSnackbar('Employee transferred successfully', 'success');
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Transfer error:', error);
      showSnackbar('Failed to transfer employee', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    transferEmployee,
    loading
  };
};
