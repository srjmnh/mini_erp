import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Role, EmployeeRoleHistory, PromotionRequest } from '@/types/roles';

export const getRoles = async () => {
  const rolesRef = collection(db, 'roles');
  const snapshot = await getDocs(rolesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
};

export const createRole = async (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => {
  const rolesRef = collection(db, 'roles');
  const now = Timestamp.now();
  const roleData = {
    ...role,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(rolesRef, roleData);
  return { id: docRef.id, ...roleData } as Role;
};

export const getCurrentRole = async (employeeId: string) => {
  const historyRef = collection(db, 'employee_role_history');
  const q = query(
    historyRef, 
    where('employeeId', '==', employeeId),
    where('effectiveTo', '==', null)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.data() as EmployeeRoleHistory | undefined;
};

export const getRoleHistory = async (employeeId: string) => {
  const historyRef = collection(db, 'employee_role_history');
  const q = query(
    historyRef, 
    where('employeeId', '==', employeeId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeRoleHistory));
};

export const processPromotion = async (request: PromotionRequest) => {
  const historyRef = collection(db, 'employee_role_history');
  const now = Timestamp.now();

  // End current role
  const currentRole = await getCurrentRole(request.employeeId);
  if (currentRole) {
    const currentRoleRef = doc(db, 'employee_role_history', currentRole.id);
    await updateDoc(currentRoleRef, {
      effectiveTo: now,
      updatedAt: now,
    });
  }

  // Create new role entry
  const newRoleData = {
    ...request,
    effectiveFrom: now,
    effectiveTo: null,
    createdAt: now,
    updatedAt: now,
  };
  
  await addDoc(historyRef, newRoleData);

  // Update employee's salary in employees collection
  const employeeRef = doc(db, 'employees', request.employeeId);
  await updateDoc(employeeRef, {
    currentRoleId: request.newRoleId,
    salary: request.newSalary,
    updatedAt: now,
  });
};