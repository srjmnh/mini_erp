export type RoleLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'head';

export interface Role {
    id: string;
    title: string;
    level: RoleLevel;
    baseSalary: number;
    overtimeRate: number; // per hour
    seniorityLevels: {
        level: number; // 1-5
        title: string; // e.g., "Junior", "Senior", etc.
        salaryMultiplier: number; // e.g., 1.0 for junior, 1.5 for senior
    }[];
    departmentId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface EmployeeRoleHistory {
    id: string;
    employeeId: string;
    roleId: string;
    salary: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    promotionNotes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PromotionRequest {
    employeeId: string;
    newRoleId: string;
    newSalary: number;
    effectiveFrom: string;
    promotionNotes: string;
}