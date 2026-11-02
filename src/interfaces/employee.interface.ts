export interface Employee {
  id: string;
  employeeCode: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  status: string;
  assignedAssets: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  employeeCode?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  status?: string;
}

export interface UpdateEmployeeInput {
  employeeCode?: string;
  employeeId?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  location?: string;
  status?: string;
}

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesWithAssets: number;
  employeesWithoutAssets: number;
}

export interface EmployeeSyncResult {
  created: number;
  updated: number;
  deactivated: number;
  total: number;
}
