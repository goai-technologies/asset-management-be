import { query } from "../config/db.js";
import type { AssetReportFilters } from "../interfaces/report.interface.js";

type AssetReportDbRow = {
  asset_code: string;
  category_name: string | null;
  brand: string | null;
  serial_number: string | null;
  vendor_name: string | null;
  purchase_cost_inr: string | null;
  purchase_cost: string | null;
  purchase_date: Date | null;
  warranty_expiry: Date | null;
  status: string;
  employee_name: string | null;
};

type EmployeeReportDbRow = {
  employee_code: string;
  name: string;
  department: string | null;
  designation: string | null;
  assigned_asset_count: number;
};

type VendorReportDbRow = {
  vendor_code: string;
  vendor_name: string;
  contact_person: string | null;
  asset_count: number;
};

type AssignmentReportDbRow = {
  id: string;
  asset_code: string;
  category_name: string | null;
  employee_name: string | null;
  employee_code: string | null;
  assigned_date: Date;
  expected_return_date: Date | null;
  returned_date: Date | null;
  performed_by: string | null;
  returned_by: string | null;
  status: string;
  notes: string | null;
};

type WarrantyReportDbRow = AssetReportDbRow & {
  days_until_expiry: number;
};

function toDateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.includes("T") ? value.split("T")[0] : value;
}

function mapStatusToDb(status: string): string {
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "available":
      return "available";
    case "assigned":
      return "assigned";
    case "under repair":
    case "repair":
      return "repair";
    case "inactive":
    case "retired":
      return "retired";
    case "disposed":
      return "disposed";
    default:
      return normalized;
  }
}

function buildAssetFilterClause(filters: AssetReportFilters): {
  clause: string;
  params: unknown[];
} {
  const conditions = ["NOT a.is_deleted"];
  const params: unknown[] = [];
  let index = 1;

  if (filters.category) {
    conditions.push(`a.category_id = $${index++}`);
    params.push(filters.category);
  }
  if (filters.vendor) {
    conditions.push(`a.vendor_id = $${index++}`);
    params.push(filters.vendor);
  }
  if (filters.employee) {
    conditions.push(`a.assigned_employee_id = $${index++}`);
    params.push(filters.employee);
  }
  if (filters.status) {
    conditions.push(`a.status = $${index++}::public.asset_status`);
    params.push(mapStatusToDb(filters.status));
  }
  if (filters.purchaseDateFrom) {
    conditions.push(`a.purchase_date >= $${index++}`);
    params.push(filters.purchaseDateFrom);
  }
  if (filters.purchaseDateTo) {
    conditions.push(`a.purchase_date <= $${index++}`);
    params.push(filters.purchaseDateTo);
  }
  if (filters.warrantyFrom) {
    conditions.push(`a.warranty_expiry >= $${index++}`);
    params.push(filters.warrantyFrom);
  }
  if (filters.warrantyTo) {
    conditions.push(`a.warranty_expiry <= $${index++}`);
    params.push(filters.warrantyTo);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

const assetReportSelect = `
  SELECT
    a.asset_code,
    c.category_name,
    a.brand,
    a.serial_number,
    v.vendor_name,
    a.purchase_cost_inr,
    a.purchase_cost,
    a.purchase_date,
    a.warranty_expiry,
    a.status::TEXT AS status,
    e.name AS employee_name
  FROM public.assets a
  LEFT JOIN public.categories c ON c.id = a.category_id
  LEFT JOIN public.vendors v ON v.id = a.vendor_id
  LEFT JOIN public.employees e ON e.id = a.assigned_employee_id
`;

export const reportRepository = {
  async getAssetReport(filters: AssetReportFilters = {}): Promise<AssetReportDbRow[]> {
    const { clause, params } = buildAssetFilterClause(filters);
    const { rows } = await query<AssetReportDbRow>(
      `${assetReportSelect}
       ${clause}
       ORDER BY a.asset_code`,
      params,
    );
    return rows;
  },

  async getEmployeeReport(): Promise<EmployeeReportDbRow[]> {
    const { rows } = await query<EmployeeReportDbRow>(
      `SELECT
         e.employee_code,
         e.name,
         e.department,
         e.designation,
         COUNT(a.id) FILTER (
           WHERE NOT a.is_deleted AND a.assigned_employee_id = e.id
         )::INTEGER AS assigned_asset_count
       FROM public.employees e
       LEFT JOIN public.assets a ON a.assigned_employee_id = e.id
       GROUP BY e.id
       ORDER BY e.name`,
    );
    return rows;
  },

  async getVendorReport(): Promise<VendorReportDbRow[]> {
    const { rows } = await query<VendorReportDbRow>(
      `SELECT
         v.vendor_code,
         v.vendor_name,
         v.contact_person,
         COUNT(a.id) FILTER (WHERE NOT a.is_deleted)::INTEGER AS asset_count
       FROM public.vendors v
       LEFT JOIN public.assets a ON a.vendor_id = v.id
       GROUP BY v.id
       ORDER BY v.vendor_name`,
    );
    return rows;
  },

  async getAssignmentReport(): Promise<AssignmentReportDbRow[]> {
    const { rows } = await query<AssignmentReportDbRow>(
      `SELECT
         asg.id,
         a.asset_code,
         c.category_name,
         e.name AS employee_name,
         e.employee_code,
         asg.assigned_date,
         asg.expected_return_date,
         asg.returned_date,
         asg.performed_by,
         (
           SELECT al.performed_by
           FROM public.activity_logs al
           WHERE al.entity_type = 'asset'
             AND al.entity_id = asg.asset_id
             AND al.action IN ('returned', 'unassigned')
             AND al.metadata->>'assignmentId' = asg.id::TEXT
           ORDER BY al.created_at DESC
           LIMIT 1
         ) AS returned_by,
         asg.status::TEXT AS status,
         asg.notes
       FROM public.assignments asg
       JOIN public.assets a ON a.id = asg.asset_id
       LEFT JOIN public.categories c ON c.id = a.category_id
       LEFT JOIN public.employees e ON e.id = asg.employee_id
       ORDER BY asg.created_at DESC`,
    );
    return rows;
  },

  async getWarrantyExpiringReport(days: number): Promise<WarrantyReportDbRow[]> {
    const { rows } = await query<WarrantyReportDbRow>(
      `SELECT
         a.asset_code,
         c.category_name,
         a.brand,
         a.serial_number,
         v.vendor_name,
         a.purchase_cost_inr,
         a.purchase_cost,
         a.purchase_date,
         a.warranty_expiry,
         a.status::TEXT AS status,
         e.name AS employee_name,
         (a.warranty_expiry - CURRENT_DATE)::INTEGER AS days_until_expiry
       FROM public.assets a
       LEFT JOIN public.categories c ON c.id = a.category_id
       LEFT JOIN public.vendors v ON v.id = a.vendor_id
       LEFT JOIN public.employees e ON e.id = a.assigned_employee_id
       WHERE NOT a.is_deleted
         AND a.warranty_expiry IS NOT NULL
         AND a.warranty_expiry > CURRENT_DATE
         AND a.warranty_expiry <= CURRENT_DATE + ($1::INTEGER * INTERVAL '1 day')
       ORDER BY a.warranty_expiry ASC`,
      [days],
    );
    return rows;
  },

  toDateOnly,
};
