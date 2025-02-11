export interface Comment {
  id: string;
  text: string;
  progress: number;
  timestamp: Date;
  userId: string;
  userName: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date | null;
  status?: string;
  progress?: number;
  priority?: string;
  assignedTo?: string;
  projectId?: string;
  comments?: Comment[];
  latestComment?: {
    text: string;
    userName: string;
    timestamp: Date;
  };
  completed?: boolean;
}
