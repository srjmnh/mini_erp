export interface Department {
  id: string;
  name: string;
  description?: string;
  head?: string;
  deputy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  startDate?: string;
  endDate?: string;
  budget?: number;
  actualCost?: number;
  progress?: number;
  departments: Array<{
    id: string;
    name: string;
    assignedAt: string;
  }>;
  members: Array<{
    id: string;
    role: string;
  }>;
  tasks?: Array<any>;
  createdAt: string;
  updatedAt: string;
}
