export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  managerId?: string;
  hireDate: Date;
  status: 'active' | 'inactive' | 'onLeave';
}
