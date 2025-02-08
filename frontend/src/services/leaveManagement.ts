import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { supabase } from '@/config/supabase';
import { LeaveBalance, LeaveType } from '@/config/firestore-schema';
import { differenceInDays } from 'date-fns';

export const uploadMedicalCertificate = async (file: File, employeeId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
  const filePath = `medical-certificates/${fileName}`;

  const { data, error } = await supabase.storage
    .from('employee-documents')
    .upload(filePath, file);

  if (error) throw error;

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('employee-documents')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const getLeaveBalance = async (employeeId: string): Promise<LeaveBalance> => {
  const currentYear = new Date().getFullYear();
  const balanceId = `${employeeId}-${currentYear}`;
  
  const balanceRef = doc(db, 'leaveBalances', balanceId);
  const balanceDoc = await getDoc(balanceRef);

  if (balanceDoc.exists()) {
    const data = balanceDoc.data();
    return {
      casual: data.casual,
      sick: data.sick,
      year: currentYear
    };
  }

  // If no balance exists, create new one with default values
  const defaultBalance = {
    employeeId,
    year: currentYear,
    casual: 25, // Default 25 days
    sick: 999, // Unlimited sick leave
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await setDoc(balanceRef, defaultBalance);

  return {
    casual: defaultBalance.casual,
    sick: defaultBalance.sick,
    year: currentYear
  };
};

export const updateLeaveBalance = async (
  employeeId: string,
  leaveType: LeaveType,
  daysRequested: number
) => {
  const currentYear = new Date().getFullYear();
  const balanceId = `${employeeId}-${currentYear}`;
  const balanceRef = doc(db, 'leaveBalances', balanceId);
  
  const balanceDoc = await getDoc(balanceRef);
  if (!balanceDoc.exists()) throw new Error('Leave balance not found');
  
  const currentBalance = balanceDoc.data()[leaveType];
  const newBalance = currentBalance - daysRequested;
  
  if (newBalance < 0) throw new Error('Insufficient leave balance');
  
  await updateDoc(balanceRef, {
    [leaveType]: newBalance,
    updatedAt: new Date()
  });
};

export const calculateLeaveDuration = (startDate: Date, endDate: Date) => {
  return differenceInDays(endDate, startDate) + 1; // Include both start and end dates
};

export const requiresMedicalCertificate = (
  leaveType: LeaveType,
  startDate: Date,
  endDate: Date
) => {
  if (leaveType !== 'sick') return false;
  const duration = calculateLeaveDuration(startDate, endDate);
  return duration > 3;
};
