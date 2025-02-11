import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
auth.setPersistence(browserLocalPersistence);

// Get Firestore instance
const db = getFirestore(app);

// Get Storage instance
const storage = getStorage(app);

// Get Analytics instance
const analytics = getAnalytics(app);



// Auth functions
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signInWithEmailAndPassword = async (email: string, password: string) => {
  return firebaseSignInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => {
  return firebaseSignOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore Operations
export const getEmployees = async () => {
  console.log('Getting all employees from Firestore');
  const employeesRef = collection(db, 'employees');
  const snapshot = await getDocs(employeesRef);
  const employees = snapshot.docs.map(doc => {
    const data = { id: doc.id, ...doc.data() };
    console.log('Retrieved employee:', data);
    return data;
  });
  console.log('Total employees retrieved:', employees.length);
  return employees;
};

export const getDepartments = async () => {
  const departmentsRef = collection(db, 'departments');
  const snapshot = await getDocs(departmentsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getEmployeesByDepartment = async (departmentId: string) => {
  const employeesRef = collection(db, 'employees');
  const q = query(employeesRef, where('department', '==', departmentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addEmployee = async (data: any) => {
  console.log('Adding employee to Firestore:', data);
  const employeesRef = collection(db, 'employees');
  const employeeData = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.log('Final employee data to add:', employeeData);
  const docRef = await addDoc(employeesRef, employeeData);
  console.log('Employee added successfully with ID:', docRef.id);
  return docRef;
};

export const updateEmployee = async (id: string, data: any) => {
  console.log('Updating employee in Firebase:', { id, data });
  try {
    const employeeRef = doc(db, 'employees', id);
    
    // Format the dates
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    console.log('Final update data:', updateData);
    await updateDoc(employeeRef, updateData);
    
    // Verify update
    const updatedDoc = await getDocs(query(collection(db, 'employees'), where('id', '==', id)));
    console.log('Updated employee data:', updatedDoc.docs[0]?.data());
    
    return true;
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

export const deleteEmployee = async (id: string) => {
  const docRef = doc(db, 'employees', id);
  return await deleteDoc(docRef);
};

// File Upload function
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return { path: snapshot.ref.fullPath, url: downloadURL };
};

export { app, auth, db, storage, analytics, firebaseConfig };
