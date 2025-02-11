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
  comments?: Comment[];
  latestComment?: Comment;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
