import { query, withTransaction } from "../config/db.js";

type AssignmentRow = {
  id: string;
  asset_id: string;
  employee_id: string | null;
  assigned_date: Date;
  expected_return_date: Date | null;
  returned_date: Date | null;
  status: string;
  notes: string | null;
  reason: string | null;
  performed_by: string | null;
  created_at: Date;
  updated_at: Date;
  asset_code: string;
  category_name: string | null;
  employee_name: string | null;
  employee_code: string | null;
  returned_by: string | null;
};

type StatsRow = {
  total_assignments: number;
  active_assignments: number;
  returned_assignments: number;
  overdue_assignments: number;
};

type AssetRow = {
  id: string;
  status: string;
  assigned_employee_id: string | null;
  asset_code: string;
  is_deleted: boolean;
};

const assignmentSelect = `
  SELECT
    asg.id,
    asg.asset_id,
    asg.employee_id,
    asg.assigned_date,
    asg.expected_return_date,
    asg.returned_date,
    asg.status::TEXT AS status,
    asg.notes,
    asg.reason,
    asg.performed_by,
    asg.created_at,
    asg.updated_at,
    a.asset_code,
    c.category_name,
    e.name AS employee_name,
    e.employee_code,
    (
      SELECT al.performed_by
      FROM public.activity_logs al
      WHERE al.entity_type = 'asset'
        AND al.entity_id = asg.asset_id
        AND al.action IN ('returned', 'unassigned')
        AND al.metadata->>'assignmentId' = asg.id::TEXT
      ORDER BY al.created_at DESC
      LIMIT 1
    ) AS returned_by
  FROM public.assignments asg
  JOIN public.assets a ON a.id = asg.asset_id
  LEFT JOIN public.categories c ON c.id = a.category_id
  LEFT JOIN public.employees e ON e.id = asg.employee_id
`;

function toDateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.includes("T") ? value.split("T")[0] : value;
}

export const assignmentRepository = {
  async findAll(): Promise<AssignmentRow[]> {
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       ORDER BY asg.created_at DESC`,
    );
    return rows;
  },

  async findById(id: string): Promise<AssignmentRow | null> {
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       WHERE asg.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async findActive(): Promise<AssignmentRow[]> {
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       WHERE asg.status IN ('active', 'assigned')
         AND asg.returned_date IS NULL
       ORDER BY asg.assigned_date DESC`,
    );
    return rows;
  },

  async findByEmployee(employeeId: string): Promise<AssignmentRow[]> {
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       WHERE asg.employee_id = $1
       ORDER BY asg.created_at DESC`,
      [employeeId],
    );
    return rows;
  },

  async findByAsset(assetId: string): Promise<AssignmentRow[]> {
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       WHERE asg.asset_id = $1
       ORDER BY asg.created_at DESC`,
      [assetId],
    );
    return rows;
  },

  async search(term: string): Promise<AssignmentRow[]> {
    const pattern = `%${term}%`;
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       WHERE a.asset_code ILIKE $1
          OR e.name ILIKE $1
          OR e.employee_code ILIKE $1
       ORDER BY asg.created_at DESC`,
      [pattern],
    );
    return rows;
  },

  async findAssetById(assetId: string): Promise<AssetRow | null> {
    const { rows } = await query<AssetRow>(
      `SELECT id, status::TEXT AS status, assigned_employee_id, asset_code, is_deleted
       FROM public.assets
       WHERE id = $1`,
      [assetId],
    );
    return rows[0] ?? null;
  },

  async findEmployeeById(employeeId: string): Promise<{ id: string } | null> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM public.employees WHERE id = $1`,
      [employeeId],
    );
    return rows[0] ?? null;
  },

  async findActiveAssignmentForAsset(assetId: string): Promise<AssignmentRow | null> {
    const { rows } = await query<AssignmentRow>(
      `${assignmentSelect}
       WHERE asg.asset_id = $1
         AND asg.status IN ('active', 'assigned')
         AND asg.returned_date IS NULL
       ORDER BY asg.created_at DESC
       LIMIT 1`,
      [assetId],
    );
    return rows[0] ?? null;
  },

  async createAssignment(
    assetId: string,
    employeeId: string,
    assignedDate: string,
    expectedReturnDate: string | null,
    remarks: string | null,
    performedBy: string,
  ): Promise<string> {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO public.assignments (
         asset_id, employee_id, assigned_date, expected_return_date, status, notes, performed_by
       ) VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id`,
      [assetId, employeeId, assignedDate, expectedReturnDate, remarks, performedBy],
    );
    return rows[0].id;
  },

  async assignAsset(assetId: string, employeeId: string): Promise<void> {
    await query(
      `UPDATE public.assets
       SET status = 'assigned', assigned_employee_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [assetId, employeeId],
    );
  },

  async releaseAsset(assetId: string): Promise<void> {
    await query(
      `UPDATE public.assets
       SET status = 'available', assigned_employee_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [assetId],
    );
  },

  async returnAssignment(
    assignmentId: string,
    returnedDate: string,
    remarks: string | null,
  ): Promise<void> {
    await query(
      `UPDATE public.assignments
       SET returned_date = $2,
           status = 'returned',
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $1`,
      [assignmentId, returnedDate, remarks],
    );
  },

  async unassignAssignment(
    assignmentId: string,
    assetId: string,
    employeeId: string,
    returnedDate: string,
    remarks: string | null,
    reason: string,
    performedBy: string,
  ): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.assignments
         SET returned_date = $2, status = 'returned', updated_at = NOW()
         WHERE id = $1`,
        [assignmentId, returnedDate],
      );
      await client.query(
        `INSERT INTO public.assignments (
           asset_id, employee_id, assigned_date, status, notes, reason, performed_by
         ) VALUES ($1, $2, $3, 'unassigned', $4, $5, $6)`,
        [assetId, employeeId, returnedDate, remarks, reason, performedBy],
      );
    });
  },

  async insertActivityLog(
    assetId: string,
    action: string,
    description: string,
    performedBy: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await query(
      `INSERT INTO public.activity_logs (entity_type, entity_id, action, description, performed_by, metadata)
       VALUES ('asset', $1, $2, $3, $4, $5::jsonb)`,
      [assetId, action, description, performedBy, JSON.stringify(metadata)],
    );
  },

  async getStats(): Promise<StatsRow> {
    const { rows } = await query<StatsRow>(
      `SELECT
         COUNT(*)::INTEGER AS total_assignments,
         COUNT(*) FILTER (
           WHERE status IN ('active', 'assigned') AND returned_date IS NULL
         )::INTEGER AS active_assignments,
         COUNT(*) FILTER (WHERE status = 'returned')::INTEGER AS returned_assignments,
         COUNT(*) FILTER (
           WHERE status IN ('active', 'assigned')
             AND returned_date IS NULL
             AND expected_return_date IS NOT NULL
             AND expected_return_date < CURRENT_DATE
         )::INTEGER AS overdue_assignments
       FROM public.assignments`,
    );
    return (
      rows[0] ?? {
        total_assignments: 0,
        active_assignments: 0,
        returned_assignments: 0,
        overdue_assignments: 0,
      }
    );
  },

  toDateOnly,
};
