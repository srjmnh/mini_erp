export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  position: string;
  baseSalary: number;
  regularHours: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  totalSalary: number;
  month: string;
  year: number;
  generatedAt: Date;
  status: 'pending' | 'approved' | 'paid';
}

export interface EmployeePayrollData {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  salary: number;
  departmentId: string;
  overtimeRate: number;
  attendance: {
    date: Date;
    checkIn: Date;
    checkOut: Date;
    totalHours: number;
  }[];
}
