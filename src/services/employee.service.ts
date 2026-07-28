import type {
  CreateEmployeeInput,
  Employee,
  EmployeeStats,
  UpdateEmployeeInput,
} from "../interfaces/employee.interface.js";
import { employeeRepository } from "../repositories/employee.repository.js";
import { AppError } from "../utils/AppError.js";

const EMPLOYEE_CODE_PATTERN = /^EMP\d{3}$/;

function formatStatus(status: string): string {
  return status.toLowerCase() === "inactive" ? "Inactive" : "Active";
}

function parseStatus(status?: string): "active" | "inactive" {
  if (!status) return "active";
  return status.trim().toLowerCase() === "inactive" ? "inactive" : "active";
}

function resolveEmployeeCode(manager: string | null, employeeCode: string): string {
  if (manager && EMPLOYEE_CODE_PATTERN.test(manager)) {
    return manager;
  }
  return employeeCode;
}

function mapEmployee(row: {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  location: string | null;
  manager: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  assigned_assets?: number;
}): Employee {
  const employeeCode = resolveEmployeeCode(row.manager, row.employee_code);
  return {
    id: row.id,
    employeeCode,
    employeeId: row.employee_code,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    department: row.department ?? "",
    designation: row.designation ?? "",
    location: row.location ?? "",
    status: formatStatus(row.status),
    assignedAssets: Number(row.assigned_assets ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function assertEmployeeCodeFormat(employeeCode: string): void {
  if (!EMPLOYEE_CODE_PATTERN.test(employeeCode)) {
    throw new AppError(400, "Employee code must match format EMP001");
  }
}

async function assertUniqueEmployeeId(employeeId: string, excludeId?: string): Promise<void> {
  const existing = await employeeRepository.findByEmployeeId(employeeId, excludeId);
  if (existing) {
    throw new AppError(409, "An employee with this employee ID already exists");
  }
}

async function assertUniqueEmail(email: string, excludeId?: string): Promise<void> {
  const existing = await employeeRepository.findByEmail(email, excludeId);
  if (existing) {
    throw new AppError(409, "An employee with this email already exists");
  }
}

async function assertUniqueEmployeeCode(employeeCode: string, excludeId?: string): Promise<void> {
  const existing = await employeeRepository.findByEmployeeCode(employeeCode, excludeId);
  if (existing) {
    throw new AppError(409, "An employee with this employee code already exists");
  }
}

async function resolveEmployeeCodeInput(inputCode?: string): Promise<string> {
  if (inputCode?.trim()) {
    const employeeCode = inputCode.trim().toUpperCase();
    assertEmployeeCodeFormat(employeeCode);
    return employeeCode;
  }
  return employeeRepository.getNextEmployeeCode();
}

async function assertNoAssignedAssets(employeeId: string, action: "delete" | "deactivate"): Promise<void> {
  const assetCount = await employeeRepository.countAssignedAssets(employeeId);
  if (assetCount > 0) {
    const message =
      action === "delete"
        ? "Cannot delete employee because assets are assigned."
        : "Cannot deactivate employee because assets are assigned.";
    throw new AppError(409, message);
  }
}

export const employeeService = {
  async listEmployees(): Promise<Employee[]> {
    const rows = await employeeRepository.findAll();
    return rows.map(mapEmployee);
  },

  async getEmployeeById(id: string): Promise<Employee> {
    const row = await employeeRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Employee not found");
    }
    return mapEmployee(row);
  },

  async searchEmployees(term: string): Promise<Employee[]> {
    const trimmed = term.trim();
    if (!trimmed) {
      return this.listEmployees();
    }
    const rows = await employeeRepository.search(trimmed);
    return rows.map(mapEmployee);
  },

  async getStats(): Promise<EmployeeStats> {
    const stats = await employeeRepository.getStats();
    return {
      totalEmployees: Number(stats.total_employees),
      activeEmployees: Number(stats.active_employees),
      inactiveEmployees: Number(stats.inactive_employees),
      employeesWithAssets: Number(stats.employees_with_assets),
      employeesWithoutAssets: Number(stats.employees_without_assets),
    };
  },

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    const employeeCode = await resolveEmployeeCodeInput(input.employeeCode);
    const employeeId = input.employeeId.trim();
    const status = parseStatus(input.status);

    await assertUniqueEmployeeCode(employeeCode);
    await assertUniqueEmployeeId(employeeId);
    await assertUniqueEmail(input.email);

    const row = await employeeRepository.create(
      employeeCode,
      employeeId,
      input.name,
      input.email,
      input.phone,
      input.department,
      input.designation,
      input.location,
      status,
    );
    return mapEmployee(row);
  },

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Employee not found");
    }

    const currentEmployeeCode = resolveEmployeeCode(existing.manager, existing.employee_code);
    const employeeCode = input.employeeCode
      ? input.employeeCode.trim().toUpperCase()
      : currentEmployeeCode;
    const employeeId = (input.employeeId ?? existing.employee_code).trim();
    const name = (input.name ?? existing.name).trim();
    const email = (input.email ?? existing.email).trim();
    const phone = (input.phone ?? existing.phone ?? "").trim();
    const department = (input.department ?? existing.department ?? "").trim();
    const designation = (input.designation ?? existing.designation ?? "").trim();
    const location = (input.location ?? existing.location ?? "").trim();
    const status = parseStatus(input.status ?? existing.status);

    if (input.employeeCode) {
      assertEmployeeCodeFormat(employeeCode);
    }

    await assertUniqueEmployeeCode(employeeCode, id);
    await assertUniqueEmployeeId(employeeId, id);
    await assertUniqueEmail(email, id);

    const row = await employeeRepository.update(
      id,
      employeeCode,
      employeeId,
      name,
      email,
      phone,
      department,
      designation,
      location,
      status,
    );
    if (!row) {
      throw new AppError(404, "Employee not found");
    }

    const withCount = await employeeRepository.findById(id);
    return mapEmployee(withCount ?? { ...row, assigned_assets: existing.assigned_assets });
  },

  async deleteEmployee(id: string): Promise<void> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Employee not found");
    }

    await assertNoAssignedAssets(id, "delete");

    const deleted = await employeeRepository.delete(id);
    if (!deleted) {
      throw new AppError(404, "Employee not found");
    }
  },

  async deactivateEmployee(id: string): Promise<Employee> {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Employee not found");
    }

    await assertNoAssignedAssets(id, "deactivate");

    const row = await employeeRepository.deactivate(id);
    if (!row) {
      throw new AppError(404, "Employee not found");
    }

    const withCount = await employeeRepository.findById(id);
    return mapEmployee(withCount ?? { ...row, assigned_assets: existing.assigned_assets });
  },
};
