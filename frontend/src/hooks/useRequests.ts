import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveType, LeaveStatus, ExpenseCategory, ExpenseStatus } from '@/config/firestore-schema';
import { useFirestore } from '@/contexts/FirestoreContext';

interface LeaveRequest {
  id: string;
  employeeId: string;
  departmentId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approverNote?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  notified: boolean;
}

interface ExpenseRequest {
  id: string;
  employeeId: string;
  departmentId: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  approverNote?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  notified: boolean;
}

export function useRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const { employees } = useFirestore();

  useEffect(() => {
    if (!user) return;

    // Find the current employee's record
    const currentEmployee = employees.find(emp => emp.email === user.email);
    if (!currentEmployee) return;

    // Query based on user role
    const leaveQuery = userRole === 'manager' 
      ? query(
          collection(db, 'leaveRequests'),
          where('departmentId', '==', currentEmployee.departmentId),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'leaveRequests'),
          where('employeeId', '==', currentEmployee.id),
          orderBy('createdAt', 'desc')
        );

    const expenseQuery = userRole === 'manager'
      ? query(
          collection(db, 'expenseRequests'),
          where('departmentId', '==', currentEmployee.departmentId),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'expenseRequests'),
          where('employeeId', '==', currentEmployee.id),
          orderBy('createdAt', 'desc')
        );

    // Subscribe to leave requests
    const unsubLeave = onSnapshot(leaveQuery, (snapshot) => {
      const requests: LeaveRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          approvedAt: data.approvedAt?.toDate(),
        } as LeaveRequest);
      });
      setLeaveRequests(requests);
      setLoading(false);
    });

    // Subscribe to expense requests
    const unsubExpense = onSnapshot(expenseQuery, (snapshot) => {
      const requests: ExpenseRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          approvedAt: data.approvedAt?.toDate(),
        } as ExpenseRequest);
      });
      setExpenseRequests(requests);
      setLoading(false);
    });

    return () => {
      unsubLeave();
      unsubExpense();
    };
  }, [user, userRole, employees]);

  // Submit new leave request
  const submitLeaveRequest = async (data: Omit<LeaveRequest, 'id' | 'employeeId' | 'departmentId' | 'status' | 'createdAt' | 'updatedAt' | 'notified'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const currentEmployee = employees.find(emp => emp.email === user.email);
    if (!currentEmployee) throw new Error('Employee not found');

    const leaveRequest = {
      ...data,
      employeeId: currentEmployee.id,
      departmentId: currentEmployee.departmentId,
      status: 'pending' as LeaveStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      notified: false,
    };

    const docRef = await addDoc(collection(db, 'leaveRequests'), leaveRequest);
    
    // Create notification for manager
    await addDoc(collection(db, 'notifications'), {
      userId: currentEmployee.managerId,
      type: 'leave_request',
      title: 'New Leave Request',
      message: `${currentEmployee.firstName} ${currentEmployee.lastName} has submitted a leave request`,
      read: false,
      requestId: docRef.id,
      createdAt: new Date(),
    });
  };

  // Submit new expense request
  const submitExpenseRequest = async (data: Omit<ExpenseRequest, 'id' | 'employeeId' | 'departmentId' | 'status' | 'createdAt' | 'updatedAt' | 'notified'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const currentEmployee = employees.find(emp => emp.email === user.email);
    if (!currentEmployee) throw new Error('Employee not found');

    const expenseRequest = {
      ...data,
      employeeId: currentEmployee.id,
      departmentId: currentEmployee.departmentId,
      status: 'pending' as ExpenseStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      notified: false,
    };

    const docRef = await addDoc(collection(db, 'expenseRequests'), expenseRequest);
    
    // Create notification for manager
    await addDoc(collection(db, 'notifications'), {
      userId: currentEmployee.managerId,
      type: 'expense_request',
      title: 'New Expense Request',
      message: `${currentEmployee.firstName} ${currentEmployee.lastName} has submitted an expense request`,
      read: false,
      requestId: docRef.id,
      createdAt: new Date(),
    });
  };

  // Update request status (for managers)
  const updateRequestStatus = async (
    type: 'leave' | 'expense',
    requestId: string,
    status: LeaveStatus | ExpenseStatus,
    approverNote?: string
  ) => {
    if (!user || userRole !== 'manager') throw new Error('Unauthorized');

    const collection = type === 'leave' ? 'leaveRequests' : 'expenseRequests';
    const requestRef = doc(db, collection, requestId);
    
    await updateDoc(requestRef, {
      status,
      approverNote,
      approvedBy: user.uid,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the request details
    const request = type === 'leave' 
      ? leaveRequests.find(r => r.id === requestId)
      : expenseRequests.find(r => r.id === requestId);

    if (!request) return;

    // Create notification for employee
    await addDoc(collection(db, 'notifications'), {
      userId: request.employeeId,
      type: `${type}_${status}` as const,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your ${type} request has been ${status}${approverNote ? `: ${approverNote}` : ''}`,
      read: false,
      requestId,
      createdAt: new Date(),
    });
  };

  return {
    leaveRequests,
    expenseRequests,
    loading,
    submitLeaveRequest,
    submitExpenseRequest,
    updateRequestStatus,
  };
}
