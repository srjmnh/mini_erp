import { format, isAfter } from 'date-fns';

export const isOverdue = (date: Date): boolean => {
  return isAfter(new Date(), date);
};

export const safeConvertToDate = (date: any): Date | null => {
  if (!date) return null;

  if (date instanceof Date) {
    return date;
  }

  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (date.toDate && typeof date.toDate === 'function') {
    try {
      return date.toDate();
    } catch (error) {
      console.error('Error converting Firestore Timestamp to Date:', error);
      return null;
    }
  }

  return null;
};

export const formatProjectDate = (date: any): string => {
  const convertedDate = safeConvertToDate(date);
  if (!convertedDate) return 'No date';
  return format(convertedDate, 'MMM d, yyyy');
};

export const formatTaskDate = (date: any): string => {
  const convertedDate = safeConvertToDate(date);
  if (!convertedDate) return 'No due date';
  return format(convertedDate, 'MMM d, yyyy');
};
