import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  Timestamp,
  orderBy,
  DocumentData,
  QuerySnapshot,
  CollectionReference,
  DocumentReference,
  getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

// Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Department Head' | 'Team Lead' | 'Manager' | 'Employee' | string;
  department: string;
  departmentId: string;
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
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  parentDepartmentId?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface CustomFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface FirestoreContextType {
  firestore: any;
  departments: Department[];
  employees: Employee[];
  customers: Customer[];
  documents: Document[];
  customFolders: CustomFolder[];
  loading: boolean;
  error: string | null;
  getDepartments: () => Promise<Department[]>;
  getEmployees: () => Promise<Employee[]>;
  getEmployee: (id: string) => Promise<Employee | null>;
  getCustomers: () => Promise<Customer[]>;
  addEmployee: (data: Omit<Employee, 'id'>) => Promise<string>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addDepartment: (data: Omit<Department, 'id'>) => Promise<void>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addDocument: (data: Omit<Document, 'id'>) => Promise<void>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addCustomFolder: (folder: Omit<CustomFolder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  deleteCustomFolder: (folderId: string) => Promise<void>;
}

const FirestoreContext = createContext<FirestoreContextType | null>(null);

export const FirestoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState({
    firestore: db,
    departments: [],
    employees: [],
    customers: [],
    documents: [],
    customFolders: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    console.log('FirestoreContext effect running:', {
      hasUser: !!user,
      userId: user?.uid,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
      state: {
        departments: state.departments.length,
        employees: state.employees.length,
        customers: state.customers.length,
        documents: state.documents.length,
        customFolders: state.customFolders.length,
        loading: state.loading,
        error: state.error
      }
    });

    if (!user) {
      console.log('No user, clearing state...');
      setState(prev => ({
        ...prev,
        departments: [],
        employees: [],
        customers: [],
        documents: [],
        customFolders: [],
        loading: false,
        error: null
      }));
      return;
    }

    console.log('User authenticated, setting up listeners...');
    setState(prev => ({ ...prev, loading: true, error: null }));

    console.log('Setting up Firestore listeners...');
    const departmentsRef = collection(db, 'departments');
    console.log('Departments ref:', departmentsRef.path);
    
    const departmentsUnsubscribe = onSnapshot(
      departmentsRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        console.log('Departments snapshot received:', { count: snapshot.docs.length });
        const departments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Department[];
        console.log('Processed departments:', { count: departments.length });
        setState(prev => ({ ...prev, departments }));
      },
      (error: any) => {
        console.error('Error in departments listener:', error);
        setState(prev => ({ ...prev, error: 'Failed to load departments' }));
      }
    );

    const employeesRef = collection(db, 'employees');
    const employeesUnsubscribe = onSnapshot(
      employeesRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const employees = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.joiningDate?.toDate?.();
          const joiningDate = timestamp ? timestamp.toISOString().split('T')[0] : '';
          
          return {
            id: doc.id,
            ...data,
            // Ensure required fields have default values
            name: data.name || 'Unnamed Employee',
            role: data.role || 'Unassigned',
            position: data.position || data.role || 'Unassigned',
            department: data.department || 'Unassigned',
            currentLevel: data.currentLevel || 1,
            status: data.status || 'active',
            joiningDate: joiningDate
          };
        }) as Employee[];
        setState(prev => ({ ...prev, employees }));
      },
      (error: any) => {
        console.error('Error in employees listener:', error);
        setState(prev => ({ ...prev, error: 'Failed to load employees' }));
      }
    );
    const customersRef = collection(db, 'customers');
    const customersUnsubscribe = onSnapshot(
      customersRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const customers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Customer[];
        setState(prev => ({ ...prev, customers }));
      },
      (error: any) => {
        console.error('Error in customers listener:', error);
        setState(prev => ({ ...prev, error: 'Failed to load customers' }));
      }
    );

    const documentsRef = collection(db, 'documents');
    const documentsUnsubscribe = onSnapshot(
      documentsRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Document[];
        setState(prev => ({ ...prev, documents }));
      },
      (error: any) => {
        console.error('Error in documents listener:', error);
        setState(prev => ({ ...prev, error: 'Failed to load documents' }));
      }
    );

    const customFoldersRef = collection(db, 'customFolders');
    const customFoldersUnsubscribe = onSnapshot(
      customFoldersRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const customFolders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CustomFolder[];
        setState(prev => ({ ...prev, customFolders }));
      },
      (error: any) => {
        console.error('Error in custom folders listener:', error);
        setState(prev => ({ ...prev, error: 'Failed to load custom folders' }));
      }
    );

    // Set loading to false after a short delay to ensure data is loaded
    setTimeout(() => {
      setState(prev => ({ ...prev, loading: false }));
    }, 1000);

    return () => {
      departmentsUnsubscribe();
      employeesUnsubscribe();
      customersUnsubscribe();
      documentsUnsubscribe();
      customFoldersUnsubscribe();
    };
  }, [user]);



  const getDepartments = async () => {
    try {
      const departmentsRef = collection(db, 'departments');
      const snapshot = await getDocs(departmentsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[];
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  };

  const getEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: `${data.firstName} ${data.lastName}` // Add computed name field
        };
      }) as Employee[];
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  };

  const getEmployee = async (id: string): Promise<Employee | null> => {
    try {
      const docRef = doc(db, 'employees', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Employee;
      }
      return null;
    } catch (error) {
      console.error('Error fetching employee:', error);
      setState(prev => ({ ...prev, error: 'Failed to fetch employee' }));
      return null;
    }
  };

  const getCustomers = async () => {
    try {
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(customersRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  };

  const addEmployee = async (data: Omit<Employee, 'id'>) => {
    try {
      console.log('FirestoreContext: Adding employee with data:', data);
      const docRef = await addDoc(collection(db, 'employees'), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('FirestoreContext: Employee added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    try {
      const docRef = doc(db, 'employees', id);
      const now = new Date().toISOString().split('T')[0];

      // Get current data
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Employee not found');
      }
      const currentData = docSnap.data();

      // Prepare update data
      const updateData = {
        ...currentData,
        ...data,
        updatedAt: now
      };

      // Ensure photoUrl is properly set if provided
      if (data.photoUrl) {
        updateData.photoUrl = data.photoUrl;
        console.log('FirestoreContext: Updating employee photo URL:', data.photoUrl);
      }

      console.log('FirestoreContext: Sending update to Firestore:', updateData);
      
      await setDoc(docRef, updateData, { merge: true });

      // Verify the update
      const verifySnap = await getDoc(docRef);
      const verifyData = verifySnap.data();
      console.log('FirestoreContext: Verified data after update:', verifyData);

      // Update local state
      setState(prev => ({ 
        ...prev, 
        employees: prev.employees.map(emp => 
          emp.id === id ? { ...emp, ...updateData } : emp
        )
      }));

    } catch (error) {
      console.error('FirestoreContext: Error updating employee:', error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  };

  const addDepartment = async (data: Omit<Department, 'id'>) => {
    try {
      const departmentsRef = collection(db, 'departments');
      await addDoc(departmentsRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding department:', error);
      throw error;
    }
  };

  const updateDepartment = async (id: string, data: Partial<Department>) => {
    try {
      const docRef = doc(db, 'departments', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'departments', id));
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  };

  const addCustomer = async (data: Omit<Customer, 'id'>) => {
    try {
      const customersRef = collection(db, 'customers');
      await addDoc(customersRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  const addDocument = async (data: Omit<Document, 'id'>) => {
    try {
      const documentsRef = collection(db, 'documents');
      await addDoc(documentsRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  };

  const updateDocument = async (id: string, data: Partial<Document>) => {
    try {
      const docRef = doc(db, 'documents', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const addCustomFolder = async (folder: Omit<CustomFolder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      const folderData: Omit<CustomFolder, 'id'> = {
        ...folder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.email || 'unknown',
      };

      await addDoc(collection(db, 'customFolders'), folderData);
    } catch (error) {
      console.error('Error adding custom folder:', error);
      throw error;
    }
  };

  const deleteCustomFolder = async (folderId: string) => {
    try {
      await deleteDoc(doc(db, 'customFolders', folderId));
    } catch (error) {
      console.error('Error deleting custom folder:', error);
      throw error;
    }
  };

  const value = {
    ...state,
    getDepartments,
    getEmployees,
    getEmployee,
    getCustomers,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addDocument,
    updateDocument,
    deleteDocument,
    addCustomFolder,
    deleteCustomFolder,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};

export const useFirestore = () => {
  const context = useContext(FirestoreContext);
  if (!context) {
    throw new Error('useFirestore must be used within a FirestoreProvider');
  }
  return context;
};
