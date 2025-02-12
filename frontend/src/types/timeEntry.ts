import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
  id: string;
  employeeId: string;
  clientId: string;
  projectId: string;
  date: Timestamp;
  billedHours: number;
  unbilledHours: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimeReport {
  employeeId: string;
  employeeName: string;
  department: string;
  entries: TimeEntry[];
  totalBilledHours: number;
  totalUnbilledHours: number;
  date: Timestamp;
}
