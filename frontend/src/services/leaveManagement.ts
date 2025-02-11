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
      casual: data.casual || 25, // Default to 25 if not set
      sick: data.sick || 999, // Default to unlimited if not set
      year: currentYear,
      used: {
        casual: data.used?.casual || 0,
        sick: data.used?.sick || 0
      }
    };
  }

  // If no balance exists, create new one with default values
  const defaultBalance = {
    employeeId,
    year: currentYear,
    casual: 25, // Default 25 days
    sick: 999, // Unlimited sick leave
    used: {
      casual: 0,
      sick: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await setDoc(balanceRef, defaultBalance);

  return {
    casual: defaultBalance.casual,
    sick: defaultBalance.sick,
    year: currentYear,
    used: defaultBalance.used
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
  
  // Get or create leave balance
  let data: any;
  const balanceDoc = await getDoc(balanceRef);
  
  if (!balanceDoc.exists()) {
    // Create new balance with default values
    data = {
      employeeId,
      year: currentYear,
      casual: 25, // Default 25 days
      sick: 999, // Unlimited sick leave
      used: {
        casual: 0,
        sick: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(balanceRef, data);
  } else {
    data = balanceDoc.data();
  }
  
  const currentBalance = data[leaveType];
  const currentUsed = data.used?.[leaveType] || 0;
  
  // For sick leave, we don't need to check balance since it's unlimited
  if (leaveType === 'casual') {
    // Check if we have enough balance
    const remainingBalance = currentBalance - currentUsed - daysRequested;
    if (remainingBalance < 0) throw new Error('Insufficient leave balance');
    
    // Only update the used days, keep total balance at 25
    await updateDoc(balanceRef, {
      'used.casual': currentUsed + daysRequested,
      updatedAt: new Date()
    });
  } else {
    // For sick leave, just track usage
    await updateDoc(balanceRef, {
      'used.sick': currentUsed + daysRequested,
      updatedAt: new Date()
    });
  }
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
