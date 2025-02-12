export interface LeaveBalance {
  employeeId: string;
  annual: number;
  sick: number;
  casual: number;
  lastUpdated: Date;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'annual' | 'sick' | 'casual';
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  approvedBy?: string;
  approvalDate?: Date;
}
