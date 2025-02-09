export type ExpenseStatus = 'pending' | 'approved' | 'declined';
export type ExpenseCategory = 'travel' | 'meals' | 'office_supplies' | 'training' | 'other';

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  managerId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  receiptUrl: string;
  status: ExpenseStatus;
  submittedAt: Date;
  managerApproval?: {
    status: ExpenseStatus;
    approvedAt?: Date;
    comment?: string;
  };
  hrApproval?: {
    status: ExpenseStatus;
    approvedAt?: Date;
    comment?: string;
  };
  reimbursedAt?: Date;
}

export interface ExpenseStats {
  pending: number;
  approved: number;
  declined: number;
  total: number;
  thisMonth: number;
  lastMonth: number;
}
