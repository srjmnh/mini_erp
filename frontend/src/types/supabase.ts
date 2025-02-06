export type DocumentSection = 'general' | 'department' | 'employee';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
}

export interface Folder {
  id: string;
  name: string;
  section: DocumentSection;
  parent_id: string | null;
  department_id: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  name: string;
  section: DocumentSection;
  folder_id: string | null;
  department_id: string | null;
  employee_id: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}
