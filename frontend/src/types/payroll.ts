import { Timestamp } from 'firebase/firestore';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriodStart: Timestamp;
  payPeriodEnd: Timestamp;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
  processedDate?: Timestamp;
  notes?: string;
}
