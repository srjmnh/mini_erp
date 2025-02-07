import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to create seniority levels
const createSeniorityLevels = (levels) => {
  return levels.map((level, index) => ({
    level: index + 1,
    title: level.title,
    salaryMultiplier: level.multiplier
  }));
};

const sampleRoles = [
  // Support Staff
  {
    title: 'Office Assistant',
    level: 'junior',
    baseSalary: 24000,
    overtimeRate: 15,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Junior Office Assistant', multiplier: 1.0 },
      { title: 'Office Assistant', multiplier: 1.1 },
      { title: 'Senior Office Assistant', multiplier: 1.2 },
      { title: 'Lead Office Assistant', multiplier: 1.3 },
      { title: 'Office Coordinator', multiplier: 1.4 },
    ]),
  },
  {
    title: 'Receptionist',
    level: 'junior',
    baseSalary: 28000,
    overtimeRate: 17,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Junior Receptionist', multiplier: 1.0 },
      { title: 'Receptionist', multiplier: 1.15 },
      { title: 'Senior Receptionist', multiplier: 1.25 },
      { title: 'Front Desk Supervisor', multiplier: 1.4 },
      { title: 'Front Office Manager', multiplier: 1.6 },
    ]),
  },
  {
    title: 'Administrative Assistant',
    level: 'junior',
    baseSalary: 32000,
    overtimeRate: 20,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Junior Admin Assistant', multiplier: 1.0 },
      { title: 'Admin Assistant', multiplier: 1.2 },
      { title: 'Senior Admin Assistant', multiplier: 1.35 },
      { title: 'Executive Assistant', multiplier: 1.5 },
      { title: 'Senior Executive Assistant', multiplier: 1.7 },
    ]),
  },
  {
    // Technical Roles
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
    title: 'System Administrator',
    level: 'mid',
    baseSalary: 70000,
    overtimeRate: 45,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Junior SysAdmin', multiplier: 1.0 },
      { title: 'System Administrator', multiplier: 1.2 },
      { title: 'Senior SysAdmin', multiplier: 1.4 },
      { title: 'Lead SysAdmin', multiplier: 1.6 },
      { title: 'Infrastructure Manager', multiplier: 1.8 },
    ]),
  },
  {
    title: 'Data Analyst',
    level: 'mid',
    baseSalary: 65000,
    overtimeRate: 40,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Junior Data Analyst', multiplier: 1.0 },
      { title: 'Data Analyst', multiplier: 1.2 },
      { title: 'Senior Data Analyst', multiplier: 1.4 },
      { title: 'Lead Data Analyst', multiplier: 1.6 },
      { title: 'Data Science Manager', multiplier: 1.8 },
    ]),
  },
  {
    // Management Roles
    title: 'Project Manager',
    level: 'senior',
    baseSalary: 85000,
    overtimeRate: 55,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Associate PM', multiplier: 1.0 },
      { title: 'Project Manager', multiplier: 1.2 },
      { title: 'Senior PM', multiplier: 1.4 },
      { title: 'Program Manager', multiplier: 1.6 },
      { title: 'Senior Program Manager', multiplier: 1.8 },
    ]),
  },
  {
    title: 'Department Manager',
    level: 'senior',
    baseSalary: 90000,
    overtimeRate: 60,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Assistant Manager', multiplier: 1.0 },
      { title: 'Department Manager', multiplier: 1.3 },
      { title: 'Senior Manager', multiplier: 1.6 },
      { title: 'Director', multiplier: 2.0 },
      { title: 'Senior Director', multiplier: 2.4 },
    ]),
  },
  {
    // Executive Roles
    title: 'Vice President',
    level: 'head',
    baseSalary: 150000,
    overtimeRate: 0, // Executives typically don't get overtime
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Associate VP', multiplier: 1.0 },
      { title: 'Vice President', multiplier: 1.3 },
      { title: 'Senior VP', multiplier: 1.6 },
      { title: 'Executive VP', multiplier: 2.0 },
      { title: 'Senior Executive VP', multiplier: 2.5 },
    ]),
  },
  {
    title: 'Chief Officer',
    level: 'head',
    baseSalary: 200000,
    overtimeRate: 0,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Chief Technology Officer', multiplier: 1.0 },
      { title: 'Chief Financial Officer', multiplier: 1.1 },
      { title: 'Chief Operating Officer', multiplier: 1.2 },
      { title: 'Chief Executive Officer', multiplier: 1.5 },
      { title: 'President & CEO', multiplier: 2.0 },
    ]),
  },
  {
    // Support Department Roles
    title: 'HR Specialist',
    level: 'mid',
    baseSalary: 55000,
    overtimeRate: 35,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'HR Assistant', multiplier: 1.0 },
      { title: 'HR Specialist', multiplier: 1.2 },
      { title: 'Senior HR Specialist', multiplier: 1.4 },
      { title: 'HR Manager', multiplier: 1.7 },
      { title: 'HR Director', multiplier: 2.0 },
    ]),
  },
  {
    title: 'Accountant',
    level: 'mid',
    baseSalary: 60000,
    overtimeRate: 40,
    departmentId: null,
    seniorityLevels: createSeniorityLevels([
      { title: 'Junior Accountant', multiplier: 1.0 },
      { title: 'Accountant', multiplier: 1.2 },
      { title: 'Senior Accountant', multiplier: 1.4 },
      { title: 'Finance Manager', multiplier: 1.7 },
      { title: 'Finance Director', multiplier: 2.0 },
    ]),
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

async function seedRoles() {
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
