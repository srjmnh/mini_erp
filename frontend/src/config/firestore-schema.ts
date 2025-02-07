// This is a reference file for the Firestore schema structure

// Leave Request Types
export type LeaveType = 'sick' | 'vacation' | 'personal' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

// Expense Types
export type ExpenseCategory = 'travel' | 'office' | 'equipment' | 'other';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

/*
Collection: roles
Document ID: auto-generated
{
  name: string,
  description: string,
  baseSalary: number,
  salaryRangeMin: number,
  salaryRangeMax: number,
  level: number, // 1: junior, 2: mid, 3: senior, etc.
  permissions: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}

Collection: employees
Document ID: auto-generated
{
  firstName: string,
  lastName: string,
  email: string,
  position: string,
  departmentId: string,
  roleId: string,
  salary: number,
  seniorityLevel: number,
  lastPromotionDate: timestamp,
  nextReviewDate: timestamp,
  status: 'active' | 'inactive',
  photoUrl: string,
  createdAt: timestamp,
  updatedAt: timestamp
}

Collection: leaveRequests
Document ID: auto-generated
{
  employeeId: string,
  departmentId: string,
  type: LeaveType,
  startDate: timestamp,
  endDate: timestamp,
  reason: string,
  status: LeaveStatus,
  approverNote?: string,
  approvedBy?: string,
  approvedAt?: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  notified: boolean
}

Collection: expenseRequests
Document ID: auto-generated
{
  employeeId: string,
  departmentId: string,
  category: ExpenseCategory,
  amount: number,
  currency: string,
  description: string,
  receiptUrl?: string,
  status: ExpenseStatus,
  approverNote?: string,
  approvedBy?: string,
  approvedAt?: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  notified: boolean
}

Collection: notifications
Document ID: auto-generated
{
  userId: string,
  type: 'leave_request' | 'expense_request' | 'leave_approved' | 'leave_rejected' | 'expense_approved' | 'expense_rejected',
  title: string,
  message: string,
  read: boolean,
  requestId: string,
  createdAt: timestamp
}

Collection: employees/{employeeId}/salaryHistory
Document ID: auto-generated
{
  oldSalary: number,
  newSalary: number,
  reason: 'promotion' | 'annual_raise' | 'role_change' | 'other',
  effectiveDate: timestamp,
  notes: string,
  createdAt: timestamp
}

Collection: departments
Document ID: auto-generated
{
  name: string,
  description: string,
  headId: string, // reference to employee who is the department head
  deputyHeadId: string, // reference to employee who is the deputy head
  createdAt: timestamp,
  updatedAt: timestamp
}
*/
