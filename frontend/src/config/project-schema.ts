// Project Types
export type ProjectStatus = 'active' | 'completed' | 'on_hold';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

/*
Collection: projects
Document ID: auto-generated
{
  name: string,
  description: string,
  status: ProjectStatus,
  departmentId: string,
  managerId: string,
  startDate: timestamp,
  endDate: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}

Collection: projects/{projectId}/tasks
Document ID: auto-generated
{
  title: string,
  description: string,
  status: TaskStatus,
  priority: TaskPriority,
  assigneeId: string,
  dueDate: timestamp,
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}

Collection: projects/{projectId}/members
Document ID: employeeId
{
  role: 'manager' | 'member',
  joinedAt: timestamp
}
*/
