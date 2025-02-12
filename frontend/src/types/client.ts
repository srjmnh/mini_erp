import { Timestamp } from 'firebase/firestore';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  status: 'active' | 'inactive';
  projects: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  budget: number;
  status: 'planned' | 'in-progress' | 'completed' | 'on-hold';
  assignedEmployees: string[]; // Employee IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
