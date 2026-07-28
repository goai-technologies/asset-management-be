import { query } from "../config/db.js";

type SummaryRow = {
  total_assets: number;
  total_employees: number;
  assigned_assets: number;
  available_assets: number;
  under_repair_assets: number;
  retired_assets: number;
};

type CategoryRow = {
  category_name: string;
  asset_count: number;
};

type StatusRow = {
  status: string;
  asset_count: number;
};

type ActivityRow = {
  id: string;
  entity_id: string;
  action: string;
  description: string | null;
  performed_by: string | null;
  created_at: Date;
};

type WarrantyRow = {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  warranty_expiry: Date;
  days_until_expiry: number;
};

type CountRow = {
  count: number;
};

export const dashboardRepository = {
  async getSummary(): Promise<SummaryRow & { vendor_count: number; category_count: number }> {
    const [summaryRes, vendorsRes, categoriesRes] = await Promise.all([
      query<SummaryRow>(`SELECT * FROM public.dashboard_summary`),
      query<CountRow>(
        `SELECT COUNT(*)::INTEGER AS count FROM public.vendors WHERE status = 'active'`,
      ),
      query<CountRow>(
        `SELECT COUNT(*)::INTEGER AS count FROM public.categories WHERE status = 'active'`,
      ),
    ]);

    const summary = summaryRes.rows[0] ?? {
      total_assets: 0,
      total_employees: 0,
      assigned_assets: 0,
      available_assets: 0,
      under_repair_assets: 0,
      retired_assets: 0,
    };

    return {
      ...summary,
      vendor_count: vendorsRes.rows[0]?.count ?? 0,
      category_count: categoriesRes.rows[0]?.count ?? 0,
    };
  },

  async getAssetsByCategory(): Promise<CategoryRow[]> {
    const { rows } = await query<CategoryRow>(
      `SELECT category_name, asset_count
       FROM public.dashboard_assets_by_category`,
    );
    return rows;
  },

  async getAssetsByStatus(): Promise<StatusRow[]> {
    const { rows } = await query<StatusRow>(
      `SELECT status, asset_count
       FROM public.dashboard_assets_by_status`,
    );
    return rows;
  },

  async getRecentActivities(limit: number): Promise<ActivityRow[]> {
    const { rows } = await query<ActivityRow>(
      `SELECT id, entity_id, action, description, performed_by, created_at
       FROM public.activity_logs
       WHERE entity_type = 'asset'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows;
  },

  async getWarrantyExpiring(): Promise<WarrantyRow[]> {
    const { rows } = await query<WarrantyRow>(
      `SELECT
         a.id AS asset_id,
         a.asset_code,
         a.asset_name,
         a.warranty_expiry,
         (a.warranty_expiry - CURRENT_DATE)::INTEGER AS days_until_expiry
       FROM public.assets a
       WHERE NOT a.is_deleted
         AND a.warranty_expiry IS NOT NULL
         AND a.warranty_expiry > CURRENT_DATE
         AND a.warranty_expiry <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY a.warranty_expiry ASC`,
    );
    return rows;
  },
};
