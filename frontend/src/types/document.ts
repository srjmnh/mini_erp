export interface Document {
  id: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  uploadedAt: Date;
  folderId: string | null;
  size: number;
  type: string;
  status: 'active' | 'archived' | 'deleted';
  accessRoles: string[];
  createdAt: string;
  updatedAt: string;
  name?: string;
  description?: string;
  tags?: string[];
  category?: DocumentCategory;
  customMetadata?: Record<string, any>;
  // Advanced ERP features
  department?: Department;
  documentType: 'contract' | 'invoice' | 'report' | 'policy' | 'form' | 'other';
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  expiryDate?: string;
  version: number;
  previousVersions?: string[];
  sharedWith: {
    type: 'department' | 'role' | 'user';
    id: string;
    name: string;
    accessLevel: 'view' | 'edit' | 'manage';
    sharedAt: string;
    sharedBy: string;
  }[];
  workflow?: {
    status: 'draft' | 'pending_review' | 'approved' | 'rejected';
    currentStep: number;
    steps: {
      type: 'review' | 'approval' | 'signature';
      assignedTo: string;
      status: 'pending' | 'completed' | 'rejected';
      comments?: string;
      completedAt?: string;
    }[];
  };
  audit: {
    createdBy: string;
    lastModifiedBy: string;
    viewedBy: { userId: string; viewedAt: string }[];
    actions: {
      type: 'create' | 'edit' | 'share' | 'download' | 'delete' | 'restore';
      userId: string;
      timestamp: string;
      details?: string;
    }[];
  };
  retention?: {
    policy: string;
    expiryDate: string;
    action: 'delete' | 'archive' | 'review';
  };
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path: string[];
  createdAt: string;
  updatedAt: string;
  color?: string;
  icon?: string;
  type: 'department' | 'project' | 'personal' | 'shared' | 'template';
  accessRoles: string[];
  sharedWith: {
    type: 'department' | 'role' | 'user';
    id: string;
    name: string;
    accessLevel: 'view' | 'edit' | 'manage';
  }[];
  metadata?: {
    description?: string;
    tags?: string[];
    department?: Department;
    project?: string;
  };
}

export type DocumentCategory =
  | 'Contracts'
  | 'Invoices'
  | 'Reports'
  | 'Policies'
  | 'Forms'
  | 'HR Documents'
  | 'Financial Documents'
  | 'Legal Documents'
  | 'Project Documents'
  | 'Templates'
  | 'Archives';

export type Department =
  | 'HR'
  | 'Finance'
  | 'Legal'
  | 'Operations'
  | 'IT'
  | 'Sales'
  | 'Marketing'
  | 'Executive'
  | 'Customer Support'
  | 'Research & Development';

export interface DocumentFilter {
  search: string;
  category?: DocumentCategory;
  department?: Department;
  documentType?: Document['documentType'];
  confidentialityLevel?: Document['confidentialityLevel'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: Document['status'];
  sharedWith?: string;
  tags?: string[];
}
