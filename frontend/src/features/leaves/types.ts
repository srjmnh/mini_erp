export type LeaveType = 'casual' | 'sick';

export type LeaveStatus = 'pending' | 'approved' | 'declined';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  medicalCertificate?: string; // URL to uploaded certificate
  managerComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  employeeId: string;
  casualLeaves: number;
  sickLeaves: number;
  updatedAt: string;
}
