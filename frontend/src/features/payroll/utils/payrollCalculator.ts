import { PayrollEntry, EmployeePayrollData } from '../types';

const REGULAR_HOURS_PER_DAY = 8;
const WORKING_DAYS_PER_MONTH = 22; // Assuming average working days
const REGULAR_HOURS_PER_MONTH = REGULAR_HOURS_PER_DAY * WORKING_DAYS_PER_MONTH;

export const calculatePayroll = (employeeData: EmployeePayrollData, month: number, year: number): PayrollEntry => {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Filter attendance for the selected month
  const monthlyAttendance = employeeData.attendance.filter(record => {
    const recordDate = record.date instanceof Date ? record.date : record.date.toDate();
    return recordDate >= monthStart && recordDate <= monthEnd;
  });

  // Calculate total hours worked
  const totalHours = monthlyAttendance.reduce((sum, record) => sum + record.totalHours, 0);
  
  // Calculate overtime hours
  const overtimeHours = Math.max(0, totalHours - REGULAR_HOURS_PER_MONTH);
  const regularHours = Math.min(totalHours, REGULAR_HOURS_PER_MONTH);

  // Calculate regular pay (proportional to hours worked)
  const hourlyRate = employeeData.salary / REGULAR_HOURS_PER_MONTH;
  const regularPay = regularHours * hourlyRate;

  // Calculate overtime pay
  const overtimePay = overtimeHours * (hourlyRate * employeeData.overtimeRate);

  // Calculate total salary
  const totalSalary = regularPay + overtimePay;

  return {
    employeeId: employeeData.id,
    employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
    position: employeeData.position,
    baseSalary: employeeData.salary,
    regularHours,
    overtimeHours,
    overtimeRate: employeeData.overtimeRate,
    overtimePay,
    totalSalary,
    month: new Date(year, month).toLocaleString('default', { month: 'long' }),
    year,
    generatedAt: new Date(),
    status: 'pending'
  };
};
