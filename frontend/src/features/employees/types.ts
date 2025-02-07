export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  position: string;
  department: string;
  currentLevel: number;
  salary: number;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  joiningDate: any;
  skills: string[];
  education?: {
    degree: string;
    field: string;
    university: string;
    graduationYear: number;
  };
  status?: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
  departmentId?: string;
}

export interface Department {
  id: string;
  name: string;
  headId?: string;
  deputyHeadId?: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  members: {
    employeeId: string;
    role: string;
  }[];
}
