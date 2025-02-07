// This is a reference file for the Firestore schema structure

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
  managerId: string, // reference to employee
  deputyManagerId: string, // reference to employee
  createdAt: timestamp,
  updatedAt: timestamp
}
*/
