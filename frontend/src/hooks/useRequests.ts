import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { updateLeaveBalance } from '@/services/leaveManagement';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveType, LeaveStatus, ExpenseCategory, ExpenseStatus } from '@/config/firestore-schema';
import { useFirestore } from '@/contexts/FirestoreContext';
import { format } from 'date-fns';

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
  managerId?: string;
  managerName?: string;
  statusText?: string;
  medicalCertificateUrl?: string;
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
  managerId?: string;
  managerName?: string;
  statusText?: string;
}

export function useRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const { employees } = useFirestore();

  useEffect(() => {
    if (!user) {
      setLoading(true);
      return;
    }

    // For HR users, we don't need an employee record
    if (userRole === 'HR0' || userRole === 'hr') {
      // Set up query for all leave requests
      const leaveQuery = query(
        collection(db, 'leaveRequests'),
        orderBy('createdAt', 'desc')
      );
      
      // Set up listeners
      const unsubLeave = onSnapshot(leaveQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLeaveRequests(requests as LeaveRequest[]);
        setLoading(false);
      });

      return () => {
        unsubLeave();
      };
    }

    // For regular users, find their employee record
    if (!employees.length) {
      setLoading(true);
      return;
    }

    const currentEmployee = employees.find(emp => emp.email === user.email);
    if (!currentEmployee) {
      console.error('Employee record not found for:', user.email);
      setLoading(false);
      return;
    }

    // Query based on user role
    let leaveQuery;
    if (userRole === 'manager') {
      // Managers see their department's requests
      leaveQuery = query(
        collection(db, 'leaveRequests'),
        where('departmentId', '==', currentEmployee.departmentId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Regular employees see their own requests
      leaveQuery = query(
        collection(db, 'leaveRequests'),
        where('employeeId', '==', currentEmployee.id),
        orderBy('createdAt', 'desc')
      );
    }

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
  const submitLeaveRequest = async (data: Omit<LeaveRequest, 'id' | 'employeeId' | 'departmentId' | 'status' | 'createdAt' | 'updatedAt' | 'notified'> & { employeeId?: string }) => {
    if (!user) throw new Error('User not authenticated');
    
    // For HR submitting on behalf of other employees
    const targetEmployeeId = data.employeeId || user.uid;
    const targetEmployee = employees.find(emp => emp.id === targetEmployeeId);
    if (!targetEmployee) throw new Error('Target employee not found');
    
    let submitterInfo;
    if (userRole === 'HR0' || userRole === 'hr') {
      // For HR users, use default HR info
      submitterInfo = {
        submittedBy: 'HR_SYSTEM',
        submittedByName: 'HR Department'
      };
    } else {
      const currentEmployee = employees.find(emp => emp.email === user.email);
      if (!currentEmployee) throw new Error('Current employee not found');
      submitterInfo = {
        submittedBy: currentEmployee.id,
        submittedByName: `${currentEmployee.firstName} ${currentEmployee.lastName}`
      };
    }

    const leaveRequest = {
      ...data,
      employeeId: targetEmployee.id,
      departmentId: targetEmployee.departmentId,
      status: 'pending' as LeaveStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      notified: false,
      ...submitterInfo
    };

    // Convert dates to Firestore Timestamps
    const firestoreLeaveRequest = {
      ...leaveRequest,
      startDate: new Date(leaveRequest.startDate),
      endDate: new Date(leaveRequest.endDate),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate leave duration and update leave balance
    const duration = differenceInDays(new Date(leaveRequest.endDate), new Date(leaveRequest.startDate)) + 1;
    await updateLeaveBalance(targetEmployee.id, leaveRequest.type, duration);

    // Add the leave request
    const docRef = await addDoc(collection(db, 'leaveRequests'), firestoreLeaveRequest);
    
    // Get department head/manager ID
    const departmentDoc = await getDoc(doc(db, 'departments', targetEmployee.departmentId));
    const departmentData = departmentDoc.data();
    const managerId = departmentData?.headId;

    if (managerId) {
      // Create notification for manager
      await addDoc(collection(db, 'notifications'), {
        userId: managerId,
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${submitterInfo.submittedByName} has submitted a leave request for ${targetEmployee.firstName} ${targetEmployee.lastName}`,
        read: false,
        requestId: docRef.id,
        createdAt: new Date(),
      });
    }
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

    try {
      const collection = type === 'leave' ? 'leaveRequests' : 'expenseRequests';
      const requestRef = doc(db, collection, requestId);
      
      // Get the request details first
      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data();
      
      if (!requestData) {
        throw new Error('Request not found');
      }

      console.log('Updating request status:', { type, requestId, status, requestData }); // Debug log

      // Get employee details
      const employeeDoc = await getDoc(doc(db, 'employees', requestData.employeeId));
      const employeeData = employeeDoc.data();
      
      if (!employeeData) {
        throw new Error('Employee not found');
      }

      // Get user document to get Firebase UID
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', employeeData.email));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        console.error('User account not found for email:', employeeData.email);
        throw new Error('User account not found for employee');
      }

      const employeeUid = userSnapshot.docs[0].id;
      console.log('Found employee UID:', employeeUid);

      // Update the request status first
      await updateDoc(requestRef, {
        status,
        approverNote,
        approvedBy: user.uid,
        approvedAt: new Date(),
        updatedAt: new Date(),
        managerId: user.uid,
        managerName: user.displayName || user.email,
        statusText: `${status} by ${user.displayName || user.email}`,
      });

      // Create notification for the employee using their Firebase UID
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        userId: employeeUid, // Use Firebase UID
        type: 'system_notification',
        title: `${type === 'leave' ? 'Leave' : 'Expense'} Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: type === 'leave' 
          ? `Your leave request from ${format(requestData.startDate.toDate(), 'MMM dd')} to ${format(requestData.endDate.toDate(), 'MMM dd')} has been ${status}${approverNote ? `. Note: ${approverNote}` : ''}`
          : `Your expense request for ${requestData.amount} ${requestData.currency} has been ${status}${approverNote ? `. Note: ${approverNote}` : ''}`,
        read: false,
        createdAt: new Date(),
        data: {
          requestId,
          requestType: type,
          status
        }
      });

      console.log('Created notification:', { 
        notificationId: notificationRef.id,
        employeeUid,
        employeeEmail: employeeData.email,
        type,
        status
      }); // Enhanced debug log

      // If it's a leave request and it's approved, update the leave balance
      if (type === 'leave' && status === 'approved') {
        const days = differenceInDays(requestData.endDate.toDate(), requestData.startDate.toDate()) + 1;
        await updateLeaveBalance(requestData.employeeId, requestData.type, days);
      }
    } catch (error) {
      console.error('Error in updateRequestStatus:', error);
      throw error;
    }
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
