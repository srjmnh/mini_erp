import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { EmployeePayrollData, PayrollEntry } from '../types';
import { calculatePayroll } from '../utils/payrollCalculator';

export const usePayroll = (departmentId: string) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeePayrollData[]>([]);

  const fetchEmployeeData = async (month: number, year: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching employees for department:', departmentId);

      // Get all employees in the department
      const employeesQuery = query(
        collection(db, 'employees'),
        where('departmentId', '==', departmentId)
      );
      const employeeSnapshot = await getDocs(employeesQuery);
      console.log('Found employees:', employeeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const employeePromises = employeeSnapshot.docs.map(async (empDoc) => {
        const empData = empDoc.data();
        console.log('Processing employee:', empDoc.id, empData);
        
        // Get role details for overtime rate
        const roleDoc = await getDoc(doc(db, 'roles', empData.roleId));
        const roleData = roleDoc.data();
        console.log('Role data for employee:', roleData);
        
        // Get attendance records for the month
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        console.log('Fetching attendance for period:', monthStart, 'to', monthEnd);
        
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('employeeId', '==', empDoc.id),
          where('date', '>=', monthStart),
          where('date', '<=', monthEnd)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        console.log('Found attendance records:', attendanceSnapshot.docs.length);
        
        const attendance = attendanceSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            date: data.date?.toDate?.() || data.date,
            checkIn: data.checkIn?.toDate?.() || data.checkIn,
            checkOut: data.checkOut?.toDate?.() || data.checkOut
          };
        });

        return {
          id: empDoc.id,
          firstName: empData.firstName,
          lastName: empData.lastName,
          position: empData.position,
          salary: empData.salary,
          departmentId: empData.departmentId,
          overtimeRate: roleData?.overtimeRate || 1.5,
          attendance
        };
      });

      const employeesData = await Promise.all(employeePromises);
      console.log('Processed employee data:', employeesData);
      setEmployeeData(employeesData);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch employee data');
      setLoading(false);
      console.error('Error fetching employee data:', err);
    }
  };

  const generatePayroll = async (month: number, year: number) => {
    try {
      const payrollEntries: PayrollEntry[] = employeeData.map(employee => 
        calculatePayroll(employee, month, year)
      );

      // Store payroll entries in Firestore
      const payrollPromises = payrollEntries.map(entry =>
        addDoc(collection(db, 'payroll'), {
          ...entry,
          generatedAt: new Date()
        })
      );

      await Promise.all(payrollPromises);
      return payrollEntries;
    } catch (err) {
      console.error('Error generating payroll:', err);
      throw new Error('Failed to generate payroll');
    }
  };

  return {
    loading,
    error,
    employeeData,
    fetchEmployeeData,
    generatePayroll
  };
};
