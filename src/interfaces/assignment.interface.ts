export interface AssignmentEmployee {
  id: string;
  name: string;
  employeeId: string;
}

export interface AssignmentAsset {
  id: string;
  assetCode: string;
  category: string | null;
}

export interface Assignment {
  id: string;
  asset: AssignmentAsset;
  employee: AssignmentEmployee | null;
  assignedDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  assignedBy: string | null;
  returnedBy: string | null;
  status: string;
  remarks: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  assetId: string;
  employeeId: string;
  assignedDate: string;
  expectedReturnDate?: string | null;
  remarks?: string | null;
}

export interface ReturnAssignmentInput {
  returnedDate: string;
  remarks?: string | null;
}

export interface UnassignAssignmentInput {
  remarks?: string | null;
  reason?: string | null;
}

export interface AssignmentStats {
  totalAssignments: number;
  activeAssignments: number;
  returnedAssignments: number;
  overdueAssignments: number;
}
