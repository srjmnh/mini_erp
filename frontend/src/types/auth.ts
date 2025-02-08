export type UserRole = 'HR0' | 'hr' | 'manager' | 'employee';

export interface UserAccount {
  uid: string;
  email: string;
  role: UserRole;
  employeeId?: string; // Reference to employee document if role is manager or employee
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface CreateUserAccountData {
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  displayName: string;
}

export interface UserPermissions {
  canCreateUsers: boolean;
  canManageEmployees: boolean;
  canManageDepartments: boolean;
  canViewSalaries: boolean;
  canEditSalaries: boolean;
  canManageRoles: boolean;
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  HR0: {
    canCreateUsers: true,
    canManageEmployees: true,
    canManageDepartments: true,
    canViewSalaries: true,
    canEditSalaries: true,
    canManageRoles: true,
  },
  manager: {
    canCreateUsers: false,
    canManageEmployees: true,
    canManageDepartments: false,
    canViewSalaries: true,
    canEditSalaries: false,
    canManageRoles: false,
  },
  employee: {
    canCreateUsers: false,
    canManageEmployees: false,
    canManageDepartments: false,
    canViewSalaries: false,
    canEditSalaries: false,
    canManageRoles: false,
  },
};
