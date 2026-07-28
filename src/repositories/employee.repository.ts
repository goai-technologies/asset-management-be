import { query } from "../config/db.js";

const EMPLOYEE_CODE_PATTERN = "^EMP[0-9]{3}$";

type EmployeeRow = {
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
};

type StatsRow = {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  employees_with_assets: number;
  employees_without_assets: number;
};

const employeeSelect = `
  SELECT
    e.id,
    e.employee_code,
    e.name,
    e.email,
    e.phone,
    e.department,
    e.designation,
    e.location,
    e.manager,
    e.status::TEXT AS status,
    e.created_at,
    e.updated_at,
    COUNT(a.id) FILTER (
      WHERE NOT a.is_deleted AND a.assigned_employee_id = e.id
    )::INTEGER AS assigned_assets
  FROM public.employees e
  LEFT JOIN public.assets a ON a.assigned_employee_id = e.id
`;

export const employeeRepository = {
  async findAll(): Promise<EmployeeRow[]> {
    const { rows } = await query<EmployeeRow>(
      `${employeeSelect}
       GROUP BY e.id
       ORDER BY e.employee_code`,
    );
    return rows;
  },

  async findById(id: string): Promise<EmployeeRow | null> {
    const { rows } = await query<EmployeeRow>(
      `${employeeSelect}
       WHERE e.id = $1
       GROUP BY e.id`,
      [id],
    );
    return rows[0] ?? null;
  },

  async search(term: string): Promise<EmployeeRow[]> {
    const pattern = `%${term}%`;
    const { rows } = await query<EmployeeRow>(
      `${employeeSelect}
       WHERE e.employee_code ILIKE $1
          OR e.name ILIKE $1
          OR e.email ILIKE $1
          OR e.department ILIKE $1
          OR e.manager ILIKE $1
       GROUP BY e.id
       ORDER BY e.employee_code`,
      [pattern],
    );
    return rows;
  },

  async findByEmployeeId(employeeId: string, excludeId?: string): Promise<EmployeeRow | null> {
    const { rows } = await query<EmployeeRow>(
      `SELECT id, employee_code, name, email, phone, department, designation, location, manager, status::TEXT AS status, created_at, updated_at
       FROM public.employees
       WHERE employee_code = $1
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [employeeId.trim(), excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async findByEmail(email: string, excludeId?: string): Promise<EmployeeRow | null> {
    const { rows } = await query<EmployeeRow>(
      `SELECT id, employee_code, name, email, phone, department, designation, location, manager, status::TEXT AS status, created_at, updated_at
       FROM public.employees
       WHERE lower(email) = lower($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [email.trim(), excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async findByEmployeeCode(employeeCode: string, excludeId?: string): Promise<EmployeeRow | null> {
    const normalized = employeeCode.trim().toUpperCase();
    const { rows } = await query<EmployeeRow>(
      `SELECT id, employee_code, name, email, phone, department, designation, location, manager, status::TEXT AS status, created_at, updated_at
       FROM public.employees
       WHERE manager = $1
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [normalized, excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async getNextEmployeeCode(): Promise<string> {
    const { rows } = await query<{ max_num: number | null }>(
      `SELECT MAX(CAST(SUBSTRING(manager FROM 4) AS INTEGER)) AS max_num
       FROM public.employees
       WHERE manager ~ $1`,
      [EMPLOYEE_CODE_PATTERN],
    );
    const next = Number(rows[0]?.max_num ?? 0) + 1;
    return `EMP${String(next).padStart(3, "0")}`;
  },

  async create(
    employeeCode: string,
    employeeId: string,
    name: string,
    email: string,
    phone: string,
    department: string,
    designation: string,
    location: string,
    status: string,
  ): Promise<EmployeeRow> {
    const { rows } = await query<EmployeeRow>(
      `INSERT INTO public.employees (
         employee_code, manager, name, email, phone, department, designation, location, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::public.entity_status)
       RETURNING id, employee_code, name, email, phone, department, designation, location, manager, status::TEXT AS status, created_at, updated_at`,
      [
        employeeId.trim(),
        employeeCode,
        name.trim(),
        email.trim(),
        phone.trim(),
        department.trim(),
        designation.trim(),
        location.trim(),
        status,
      ],
    );
    return { ...rows[0], assigned_assets: 0 };
  },

  async update(
    id: string,
    employeeCode: string,
    employeeId: string,
    name: string,
    email: string,
    phone: string,
    department: string,
    designation: string,
    location: string,
    status: string,
  ): Promise<EmployeeRow | null> {
    const { rows } = await query<EmployeeRow>(
      `UPDATE public.employees
       SET employee_code = $2,
           manager = $3,
           name = $4,
           email = $5,
           phone = $6,
           department = $7,
           designation = $8,
           location = $9,
           status = $10::public.entity_status,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, employee_code, name, email, phone, department, designation, location, manager, status::TEXT AS status, created_at, updated_at`,
      [
        id,
        employeeId.trim(),
        employeeCode,
        name.trim(),
        email.trim(),
        phone.trim(),
        department.trim(),
        designation.trim(),
        location.trim(),
        status,
      ],
    );
    return rows[0] ?? null;
  },

  async deactivate(id: string): Promise<EmployeeRow | null> {
    const { rows } = await query<EmployeeRow>(
      `UPDATE public.employees
       SET status = 'inactive'::public.entity_status,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, employee_code, name, email, phone, department, designation, location, manager, status::TEXT AS status, created_at, updated_at`,
      [id],
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM public.employees WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  async countAssignedAssets(employeeId: string): Promise<number> {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count
       FROM public.assets
       WHERE assigned_employee_id = $1 AND NOT is_deleted`,
      [employeeId],
    );
    return rows[0]?.count ?? 0;
  },

  async getStats(): Promise<StatsRow> {
    const { rows } = await query<StatsRow>(
      `SELECT
         COUNT(*)::INTEGER AS total_employees,
         COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_employees,
         COUNT(*) FILTER (WHERE status = 'inactive')::INTEGER AS inactive_employees,
         COUNT(*) FILTER (WHERE assigned_assets > 0)::INTEGER AS employees_with_assets,
         COUNT(*) FILTER (WHERE assigned_assets = 0)::INTEGER AS employees_without_assets
       FROM (
         SELECT e.id,
           e.status::TEXT AS status,
           COUNT(a.id) FILTER (
             WHERE NOT a.is_deleted AND a.assigned_employee_id = e.id
           )::INTEGER AS assigned_assets
         FROM public.employees e
         LEFT JOIN public.assets a ON a.assigned_employee_id = e.id
         GROUP BY e.id, e.status
       ) employee_counts`,
    );
    return (
      rows[0] ?? {
        total_employees: 0,
        active_employees: 0,
        inactive_employees: 0,
        employees_with_assets: 0,
        employees_without_assets: 0,
      }
    );
  },
};
