import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const employees = [
  {
    name: "Arjun Patel",
    email: "arjun.patel@example.com",
    phone: "+91 98765 43210",
    role: "Software Engineer",
    position: "Software Engineer",
    department: "Engineering",
    currentLevel: 2,
    salary: 85000,
    address: {
      street: "123 Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050"
    },
    joiningDate: Timestamp.fromDate(new Date("2023-01-15")),
    skills: ["React", "Node.js", "TypeScript"],
    education: {
      degree: "B.Tech",
      field: "Computer Science",
      university: "IIT Bombay",
      graduationYear: 2022
    }
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+91 87654 32109",
    role: "Product Manager",
    position: "Product Manager",
    department: "Product",
    currentLevel: 3,
    salary: 120000,
    address: {
      street: "456 Indiranagar",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560038"
    },
    joiningDate: Timestamp.fromDate(new Date("2022-08-20")),
    skills: ["Product Strategy", "Agile", "User Research"],
    education: {
      degree: "MBA",
      field: "Product Management",
      university: "IIM Ahmedabad",
      graduationYear: 2021
    }
  },
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@example.com",
    phone: "+91 76543 21098",
    role: "Office Assistant",
    position: "Office Assistant",
    department: "Operations",
    currentLevel: 1,
    salary: 35000,
    address: {
      street: "789 Anna Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600040"
    },
    joiningDate: Timestamp.fromDate(new Date("2024-01-05")),
    skills: ["MS Office", "Documentation", "Administration"],
    education: {
      degree: "B.Com",
      field: "Commerce",
      university: "University of Madras",
      graduationYear: 2023
    }
  },
  {
    name: "Neha Gupta",
    email: "neha.gupta@example.com",
    phone: "+91 65432 10987",
    role: "HR Manager",
    position: "HR Manager",
    department: "Human Resources",
    currentLevel: 3,
    salary: 95000,
    address: {
      street: "321 Aundh",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411007"
    },
    joiningDate: Timestamp.fromDate(new Date("2022-03-10")),
    skills: ["Recruitment", "Employee Relations", "Training"],
    education: {
      degree: "MBA",
      field: "Human Resources",
      university: "Symbiosis Institute",
      graduationYear: 2020
    }
  },
  {
    name: "Vikram Singh",
    email: "vikram.singh@example.com",
    phone: "+91 54321 09876",
    role: "Sales Executive",
    position: "Sales Executive",
    department: "Sales",
    currentLevel: 2,
    salary: 65000,
    address: {
      street: "567 Vaishali",
      city: "Delhi",
      state: "Delhi",
      pincode: "110096"
    },
    joiningDate: Timestamp.fromDate(new Date("2023-06-15")),
    skills: ["Sales Strategy", "Negotiation", "Client Relations"],
    education: {
      degree: "BBA",
      field: "Marketing",
      university: "Delhi University",
      graduationYear: 2021
    }
  },
  {
    name: "Ananya Reddy",
    email: "ananya.reddy@example.com",
    phone: "+91 43210 98765",
    role: "Software Engineer",
    position: "Software Engineer",
    department: "Engineering",
    currentLevel: 1,
    salary: 75000,
    address: {
      street: "890 Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500033"
    },
    joiningDate: Timestamp.fromDate(new Date("2024-01-10")),
    skills: ["Python", "Django", "AWS"],
    education: {
      degree: "B.Tech",
      field: "Information Technology",
      university: "BITS Pilani",
      graduationYear: 2023
    }
  },
  {
    name: "Mohammed Ismail",
    email: "mohammed.ismail@example.com",
    phone: "+91 32109 87654",
    role: "Finance Manager",
    position: "Finance Manager",
    department: "Finance",
    currentLevel: 3,
    salary: 110000,
    address: {
      street: "432 Koramangala",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560034"
    },
    joiningDate: Timestamp.fromDate(new Date("2022-11-20")),
    skills: ["Financial Planning", "Risk Management", "Analytics"],
    education: {
      degree: "CA",
      field: "Chartered Accountancy",
      university: "ICAI",
      graduationYear: 2020
    }
  },
  {
    name: "Kavita Menon",
    email: "kavita.menon@example.com",
    phone: "+91 21098 76543",
    role: "Marketing Specialist",
    position: "Marketing Specialist",
    department: "Marketing",
    currentLevel: 2,
    salary: 70000,
    address: {
      street: "765 Palarivattom",
      city: "Kochi",
      state: "Kerala",
      pincode: "682025"
    },
    joiningDate: Timestamp.fromDate(new Date("2023-04-05")),
    skills: ["Digital Marketing", "Content Strategy", "Social Media"],
    education: {
      degree: "MBA",
      field: "Marketing",
      university: "IIM Kozhikode",
      graduationYear: 2022
    }
  }
];

async function seedEmployees() {
  try {
    for (const employee of employees) {
      const employeeRef = await addDoc(collection(db, 'employees'), {
        ...employee,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'active'
      });
      
      // Add initial salary history
      await addDoc(collection(db, 'employees', employeeRef.id, 'salaryHistory'), {
        employeeId: employeeRef.id,
        oldSalary: 0,
        newSalary: employee.salary,
        oldLevel: 0,
        newLevel: employee.currentLevel,
        reason: 'hiring',
        effectiveDate: employee.joiningDate,
        notes: `Initial salary on joining as ${employee.role} (Level ${employee.currentLevel})`,
        createdAt: Timestamp.now()
      });
      
      console.log(`Added employee: ${employee.name}`);
    }
    console.log('Successfully added all employees!');
  } catch (error) {
    console.error('Error adding employees:', error);
  }
}

seedEmployees();
