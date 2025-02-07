import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Role } from '../types/roles';

const sampleRoles: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Software Engineer',
    level: 'mid',
    baseSalary: 80000,
    overtimeRate: 50,
    departmentId: null,
    seniorityLevels: [
      { level: 1, title: 'Junior', salaryMultiplier: 1.0 },
      { level: 2, title: 'Mid-Level', salaryMultiplier: 1.2 },
      { level: 3, title: 'Senior', salaryMultiplier: 1.5 },
      { level: 4, title: 'Lead', salaryMultiplier: 1.8 },
      { level: 5, title: 'Principal', salaryMultiplier: 2.0 },
    ],
  },
  {
    title: 'Product Manager',
    level: 'senior',
    baseSalary: 95000,
    overtimeRate: 60,
    departmentId: null,
    seniorityLevels: [
      { level: 1, title: 'Associate PM', salaryMultiplier: 1.0 },
      { level: 2, title: 'Product Manager', salaryMultiplier: 1.3 },
      { level: 3, title: 'Senior PM', salaryMultiplier: 1.6 },
      { level: 4, title: 'Lead PM', salaryMultiplier: 1.9 },
      { level: 5, title: 'Head of Product', salaryMultiplier: 2.2 },
    ],
  },
  {
    title: 'UX Designer',
    level: 'mid',
    baseSalary: 75000,
    overtimeRate: 45,
    departmentId: null,
    seniorityLevels: [
      { level: 1, title: 'Junior Designer', salaryMultiplier: 1.0 },
      { level: 2, title: 'Designer', salaryMultiplier: 1.2 },
      { level: 3, title: 'Senior Designer', salaryMultiplier: 1.5 },
      { level: 4, title: 'Lead Designer', salaryMultiplier: 1.8 },
      { level: 5, title: 'Design Director', salaryMultiplier: 2.1 },
    ],
  },
  {
    title: 'Sales Representative',
    level: 'junior',
    baseSalary: 50000,
    overtimeRate: 30,
    departmentId: null,
    seniorityLevels: [
      { level: 1, title: 'Sales Associate', salaryMultiplier: 1.0 },
      { level: 2, title: 'Sales Representative', salaryMultiplier: 1.2 },
      { level: 3, title: 'Senior Sales Rep', salaryMultiplier: 1.5 },
      { level: 4, title: 'Sales Manager', salaryMultiplier: 1.8 },
      { level: 5, title: 'Sales Director', salaryMultiplier: 2.0 },
    ],
  },
  {
    title: 'Marketing Specialist',
    level: 'mid',
    baseSalary: 65000,
    overtimeRate: 40,
    departmentId: null,
    seniorityLevels: [
      { level: 1, title: 'Marketing Associate', salaryMultiplier: 1.0 },
      { level: 2, title: 'Marketing Specialist', salaryMultiplier: 1.2 },
      { level: 3, title: 'Senior Marketing', salaryMultiplier: 1.5 },
      { level: 4, title: 'Marketing Manager', salaryMultiplier: 1.8 },
      { level: 5, title: 'Marketing Director', salaryMultiplier: 2.0 },
    ],
  },
];

export async function seedRoles() {
  const rolesRef = collection(db, 'roles');
  const now = Timestamp.now();

  for (const role of sampleRoles) {
    try {
      await addDoc(rolesRef, {
        ...role,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Added role: ${role.title}`);
    } catch (error) {
      console.error(`Error adding role ${role.title}:`, error);
    }
  }
}

// Run the seeding function
seedRoles().then(() => {
  console.log('Finished seeding roles');
}).catch((error) => {
  console.error('Error seeding roles:', error);
});
