import type {
  Assignment,
  AssignmentStats,
  CreateAssignmentInput,
  ReturnAssignmentInput,
  UnassignAssignmentInput,
} from "../interfaces/assignment.interface.js";
import { assignmentRepository } from "../repositories/assignment.repository.js";
import { AppError } from "../utils/AppError.js";

function formatStatus(status: string): string {
  switch (status) {
    case "active":
    case "assigned":
      return "Active";
    case "returned":
      return "Returned";
    case "unassigned":
      return "Unassigned";
    case "disposed":
      return "Disposed";
    case "inactive":
      return "Inactive";
    case "overdue":
      return "Overdue";
    default:
      return status;
  }
}

function isActiveStatus(status: string, returnedDate: Date | string | null): boolean {
  return ["active", "assigned"].includes(status) && !returnedDate;
}

function mapAssignment(row: {
  id: string;
  asset_id: string;
  employee_id: string | null;
  assigned_date: Date;
  expected_return_date: Date | null;
  returned_date: Date | null;
  status: string;
  notes: string | null;
  performed_by: string | null;
  created_at: Date;
  updated_at: Date;
  asset_code: string;
  category_name: string | null;
  employee_name: string | null;
  employee_code: string | null;
  returned_by?: string | null;
}): Assignment {
  const expectedReturn = assignmentRepository.toDateOnly(row.expected_return_date);
  const returnedDate = assignmentRepository.toDateOnly(row.returned_date);
  const active = isActiveStatus(row.status, row.returned_date);
  const overdue =
    active &&
    expectedReturn !== null &&
    new Date(expectedReturn) < new Date(new Date().toISOString().slice(0, 10));

  return {
    id: row.id,
    asset: {
      id: row.asset_id,
      assetCode: row.asset_code,
      category: row.category_name,
    },
    employee: row.employee_id
      ? {
          id: row.employee_id,
          name: row.employee_name ?? "",
          employeeId: row.employee_code ?? "",
        }
      : null,
    assignedDate: assignmentRepository.toDateOnly(row.assigned_date) ?? "",
    expectedReturnDate: expectedReturn,
    returnedDate,
    assignedBy: row.performed_by,
    returnedBy: row.returned_by ?? null,
    status: overdue ? "Overdue" : formatStatus(row.status),
    remarks: row.notes,
    isOverdue: overdue,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function assertAssignableAsset(asset: NonNullable<Awaited<ReturnType<typeof assignmentRepository.findAssetById>>>): void {
  if (asset.is_deleted) {
    throw new AppError(400, "Asset not found");
  }
  if (asset.status === "disposed") {
    throw new AppError(409, "Cannot assign disposed asset.");
  }
  if (asset.status === "repair") {
    throw new AppError(409, "Cannot assign asset that is under repair.");
  }
  if (asset.status === "retired") {
    throw new AppError(409, "Cannot assign inactive asset.");
  }
  if (asset.status !== "available") {
    throw new AppError(409, "Asset must be available to assign.");
  }
  if (asset.assigned_employee_id) {
    throw new AppError(409, "Asset is already assigned.");
  }
}

function assertExpectedReturnAfterAssigned(
  assignedDate: string,
  expectedReturnDate?: string | null,
): void {
  if (!expectedReturnDate) return;
  if (new Date(expectedReturnDate) <= new Date(assignedDate)) {
    throw new AppError(400, "Expected return date must be after assigned date");
  }
}

function assertActiveAssignment(assignment: NonNullable<Awaited<ReturnType<typeof assignmentRepository.findById>>>): void {
  if (!isActiveStatus(assignment.status, assignment.returned_date)) {
    throw new AppError(409, "Assignment is already completed.");
  }
}

export const assignmentService = {
  async listAssignments(): Promise<Assignment[]> {
    const rows = await assignmentRepository.findAll();
    return rows.map(mapAssignment);
  },

  async getAssignmentById(id: string): Promise<Assignment> {
    const row = await assignmentRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Assignment not found");
    }
    return mapAssignment(row);
  },

  async listActiveAssignments(): Promise<Assignment[]> {
    const rows = await assignmentRepository.findActive();
    return rows.map(mapAssignment);
  },

  async listByEmployee(employeeId: string): Promise<Assignment[]> {
    const employee = await assignmentRepository.findEmployeeById(employeeId);
    if (!employee) {
      throw new AppError(404, "Employee not found");
    }
    const rows = await assignmentRepository.findByEmployee(employeeId);
    return rows.map(mapAssignment);
  },

  async listByAsset(assetId: string): Promise<Assignment[]> {
    const asset = await assignmentRepository.findAssetById(assetId);
    if (!asset || asset.is_deleted) {
      throw new AppError(404, "Asset not found");
    }
    const rows = await assignmentRepository.findByAsset(assetId);
    return rows.map(mapAssignment);
  },

  async searchAssignments(term: string): Promise<Assignment[]> {
    const trimmed = term.trim();
    if (!trimmed) {
      return this.listAssignments();
    }
    const rows = await assignmentRepository.search(trimmed);
    return rows.map(mapAssignment);
  },

  async getStats(): Promise<AssignmentStats> {
    const stats = await assignmentRepository.getStats();
    return {
      totalAssignments: Number(stats.total_assignments),
      activeAssignments: Number(stats.active_assignments),
      returnedAssignments: Number(stats.returned_assignments),
      overdueAssignments: Number(stats.overdue_assignments),
    };
  },

  async assignAsset(
    input: CreateAssignmentInput,
    performedBy: string,
  ): Promise<Assignment> {
    assertExpectedReturnAfterAssigned(input.assignedDate, input.expectedReturnDate);

    const asset = await assignmentRepository.findAssetById(input.assetId);
    if (!asset || asset.is_deleted) {
      throw new AppError(404, "Asset not found");
    }
    assertAssignableAsset(asset);

    const employee = await assignmentRepository.findEmployeeById(input.employeeId);
    if (!employee) {
      throw new AppError(404, "Employee not found");
    }

    const existingActive = await assignmentRepository.findActiveAssignmentForAsset(input.assetId);
    if (existingActive) {
      throw new AppError(409, "Asset is already assigned.");
    }

    const assignmentId = await assignmentRepository.createAssignment(
      input.assetId,
      input.employeeId,
      input.assignedDate,
      input.expectedReturnDate ?? null,
      input.remarks?.trim() || null,
      performedBy,
    );
    await assignmentRepository.assignAsset(input.assetId, input.employeeId);
    await assignmentRepository.insertActivityLog(
      input.assetId,
      "assigned",
      `Asset assigned to employee`,
      performedBy,
      {
        assignmentId,
        employeeId: input.employeeId,
        assignedBy: performedBy,
      },
    );

    return this.getAssignmentById(assignmentId);
  },

  async returnAsset(
    assignmentId: string,
    input: ReturnAssignmentInput,
    performedBy: string,
  ): Promise<Assignment> {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError(404, "Assignment not found");
    }
    assertActiveAssignment(assignment);

    await assignmentRepository.returnAssignment(
      assignmentId,
      input.returnedDate,
      input.remarks?.trim() || null,
    );
    await assignmentRepository.releaseAsset(assignment.asset_id);
    await assignmentRepository.insertActivityLog(
      assignment.asset_id,
      "returned",
      "Asset returned",
      performedBy,
      {
        assignmentId,
        returnedBy: performedBy,
        returnedDate: input.returnedDate,
      },
    );

    return this.getAssignmentById(assignmentId);
  },

  async unassignAsset(
    assignmentId: string,
    input: UnassignAssignmentInput,
    performedBy: string,
  ): Promise<Assignment> {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError(404, "Assignment not found");
    }
    assertActiveAssignment(assignment);

    if (!assignment.employee_id) {
      throw new AppError(400, "Assignment has no employee to unassign");
    }

    const today = new Date().toISOString().slice(0, 10);
    const reason = input.reason?.trim() || "Employee transfer or resignation";

    await assignmentRepository.unassignAssignment(
      assignmentId,
      assignment.asset_id,
      assignment.employee_id,
      today,
      input.remarks?.trim() || null,
      reason,
      performedBy,
    );
    await assignmentRepository.releaseAsset(assignment.asset_id);
    await assignmentRepository.insertActivityLog(
      assignment.asset_id,
      "unassigned",
      "Asset unassigned",
      performedBy,
      {
        assignmentId,
        returnedBy: performedBy,
        reason,
      },
    );

    return this.getAssignmentById(assignmentId);
  },
};
