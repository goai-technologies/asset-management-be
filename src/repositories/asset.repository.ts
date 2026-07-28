import { query, withTransaction } from "../config/db.js";
import type pg from "pg";

type AssetRow = {
  id: string;
  asset_code: string;
  asset_name: string;
  category_id: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: Date | null;
  purchase_cost: string | null;
  purchase_cost_inr: string | null;
  invoice_number: string | null;
  vendor_id: string | null;
  warranty_expiry: Date | null;
  status: string;
  assigned_employee_id: string | null;
  location: string | null;
  remarks: string | null;
  created_at: Date;
  updated_at: Date;
  category_name?: string | null;
  vendor_name?: string | null;
  vendor_code?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  thumbnail_url?: string | null;
};

type ImageRow = {
  id: string;
  asset_id: string;
  file_name: string;
  file_size: number;
  image_url: string;
  sort_order: number;
  upload_date: Date;
};

type StatsRow = {
  total_assets: number;
  available: number;
  assigned: number;
  repair: number;
  inactive: number;
  disposed: number;
};

const assetSelect = `
  SELECT
    a.id,
    a.asset_code,
    a.asset_name,
    a.category_id,
    a.brand,
    a.model,
    a.serial_number,
    a.purchase_date,
    a.purchase_cost,
    a.purchase_cost_inr,
    a.invoice_number,
    a.vendor_id,
    a.warranty_expiry,
    a.status::TEXT AS status,
    a.assigned_employee_id,
    a.location,
    a.remarks,
    a.created_at,
    a.updated_at,
    c.category_name,
    v.vendor_name,
    v.vendor_code,
    e.name AS employee_name,
    e.employee_code,
    (
      SELECT ai.image_url
      FROM public.asset_images ai
      WHERE ai.asset_id = a.id
      ORDER BY ai.sort_order ASC, ai.created_at ASC
      LIMIT 1
    ) AS thumbnail_url
  FROM public.assets a
  LEFT JOIN public.categories c ON c.id = a.category_id
  LEFT JOIN public.vendors v ON v.id = a.vendor_id
  LEFT JOIN public.employees e ON e.id = a.assigned_employee_id
`;

function toDateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.includes("T") ? value.split("T")[0] : value;
}

export const assetRepository = {
  async findAll(): Promise<AssetRow[]> {
    const { rows } = await query<AssetRow>(
      `${assetSelect}
       WHERE NOT a.is_deleted
       ORDER BY a.created_at DESC`,
    );
    return rows;
  },

  async findById(id: string): Promise<AssetRow | null> {
    const { rows } = await query<AssetRow>(
      `${assetSelect}
       WHERE a.id = $1 AND NOT a.is_deleted`,
      [id],
    );
    return rows[0] ?? null;
  },

  async findArchived(): Promise<AssetRow[]> {
    const { rows } = await query<AssetRow>(
      `${assetSelect}
       WHERE a.is_deleted
       ORDER BY a.updated_at DESC`,
    );
    return rows;
  },

  async findByIdIncludingDeleted(id: string): Promise<(AssetRow & { is_deleted: boolean }) | null> {
    const { rows } = await query<AssetRow & { is_deleted: boolean }>(
      `${assetSelect}, a.is_deleted
       WHERE a.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async search(term: string): Promise<AssetRow[]> {
    const pattern = `%${term}%`;
    const { rows } = await query<AssetRow>(
      `${assetSelect}
       WHERE NOT a.is_deleted
         AND (
           a.asset_code ILIKE $1
           OR a.serial_number ILIKE $1
           OR a.brand ILIKE $1
           OR c.category_name ILIKE $1
           OR v.vendor_name ILIKE $1
         )
       ORDER BY a.created_at DESC`,
      [pattern],
    );
    return rows;
  },

  async findAssetCodesByCategory(categoryId: string): Promise<{ asset_code: string; category_id: string | null }[]> {
    const { rows } = await query<{ asset_code: string; category_id: string | null }>(
      `SELECT asset_code, category_id
       FROM public.assets
       WHERE category_id = $1`,
      [categoryId],
    );
    return rows;
  },

  async findAllAssetCodes(): Promise<{ asset_code: string; category_id: string | null }[]> {
    const { rows } = await query<{ asset_code: string; category_id: string | null }>(
      `SELECT asset_code, category_id
       FROM public.assets
       WHERE NOT is_deleted`,
    );
    return rows;
  },

  async findCategoryName(categoryId: string): Promise<string | null> {
    const { rows } = await query<{ category_name: string }>(
      `SELECT category_name FROM public.categories WHERE id = $1`,
      [categoryId],
    );
    return rows[0]?.category_name ?? null;
  },

  async findBySerialNumber(serialNumber: string, excludeId?: string): Promise<AssetRow | null> {
    const { rows } = await query<AssetRow>(
      `SELECT id FROM public.assets
       WHERE lower(serial_number) = lower($1)
         AND NOT is_deleted
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [serialNumber.trim(), excludeId ?? null],
    );
    return rows[0] ? ({ id: rows[0].id } as AssetRow) : null;
  },

  async findByInvoiceNumber(invoiceNumber: string, excludeId?: string): Promise<AssetRow | null> {
    const { rows } = await query<AssetRow>(
      `SELECT id FROM public.assets
       WHERE lower(invoice_number) = lower($1)
         AND NOT is_deleted
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [invoiceNumber.trim(), excludeId ?? null],
    );
    return rows[0] ? ({ id: rows[0].id } as AssetRow) : null;
  },

  async countAssignments(assetId: string): Promise<number> {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count FROM public.assignments WHERE asset_id = $1`,
      [assetId],
    );
    return rows[0]?.count ?? 0;
  },

  async createAsset(
    assetCode: string,
    assetName: string,
    categoryId: string,
    brand: string,
    model: string | null,
    serialNumber: string,
    purchaseDate: string,
    purchaseCost: number,
    invoiceNumber: string,
    vendorId: string,
    warrantyExpiry: string,
    remarks: string | null,
  ): Promise<AssetRow> {
    const { rows } = await query<AssetRow>(
      `INSERT INTO public.assets (
         asset_code, asset_name, category_id, brand, model, serial_number,
         purchase_date, purchase_cost, purchase_cost_inr, invoice_number, vendor_id,
         warranty_expiry, status, remarks, is_deleted
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,'available',$12,false)
       RETURNING id, asset_code, asset_name, category_id, brand, model, serial_number,
         purchase_date, purchase_cost, purchase_cost_inr, invoice_number, vendor_id,
         warranty_expiry, status::TEXT AS status, assigned_employee_id, location, remarks,
         created_at, updated_at`,
      [
        assetCode,
        assetName,
        categoryId,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchaseCost,
        invoiceNumber,
        vendorId,
        warrantyExpiry,
        remarks,
      ],
    );
    return rows[0];
  },

  async createAssetWithImages(
    asset: {
      assetCode: string;
      assetName: string;
      categoryId: string;
      brand: string;
      model: string | null;
      serialNumber: string;
      purchaseDate: string;
      purchaseCost: number;
      invoiceNumber: string;
      vendorId: string;
      warrantyExpiry: string;
      remarks: string | null;
    },
    images: { fileName: string; fileSize: number; imageUrl: string; sortOrder: number }[],
  ): Promise<AssetRow> {
    return withTransaction(async (client) => {
      const row = await insertAsset(client, asset);
      if (images.length > 0) {
        await insertImages(client, row.id, images);
      }
      return row;
    });
  },

  async updateAsset(
    id: string,
    assetName: string,
    categoryId: string,
    brand: string,
    model: string | null,
    serialNumber: string,
    purchaseDate: string,
    purchaseCost: number,
    invoiceNumber: string,
    vendorId: string,
    warrantyExpiry: string,
    remarks: string | null,
  ): Promise<AssetRow | null> {
    const { rows } = await query<AssetRow>(
      `UPDATE public.assets SET
         asset_name = $2,
         category_id = $3,
         brand = $4,
         model = $5,
         serial_number = $6,
         purchase_date = $7,
         purchase_cost = $8,
         purchase_cost_inr = $8,
         invoice_number = $9,
         vendor_id = $10,
         warranty_expiry = $11,
         remarks = $12,
         updated_at = NOW()
       WHERE id = $1 AND NOT is_deleted
       RETURNING id, asset_code, asset_name, category_id, brand, model, serial_number,
         purchase_date, purchase_cost, purchase_cost_inr, invoice_number, vendor_id,
         warranty_expiry, status::TEXT AS status, assigned_employee_id, location, remarks,
         created_at, updated_at`,
      [
        id,
        assetName,
        categoryId,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchaseCost,
        invoiceNumber,
        vendorId,
        warrantyExpiry,
        remarks,
      ],
    );
    return rows[0] ?? null;
  },

  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE public.assets
       SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND NOT is_deleted`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  },

  async restore(id: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE public.assets
       SET is_deleted = false, deleted_at = NULL, updated_at = NOW()
       WHERE id = $1 AND is_deleted`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  },

  async setStatus(id: string, status: string, clearAssignee = false): Promise<AssetRow | null> {
    const { rows } = await query<AssetRow>(
      `UPDATE public.assets
       SET status = $2::public.asset_status,
           assigned_employee_id = CASE WHEN $3 THEN NULL ELSE assigned_employee_id END,
           updated_at = NOW()
       WHERE id = $1 AND NOT is_deleted
       RETURNING id, asset_code, asset_name, category_id, brand, model, serial_number,
         purchase_date, purchase_cost, purchase_cost_inr, invoice_number, vendor_id,
         warranty_expiry, status::TEXT AS status, assigned_employee_id, location, remarks,
         created_at, updated_at`,
      [id, status, clearAssignee],
    );
    return rows[0] ?? null;
  },

  async disposeAsset(
    id: string,
    reason: string,
    disposalDate: string,
    notes: string | null,
  ): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.assets SET status = 'disposed', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO public.assignments (asset_id, assigned_date, status, notes, reason, performed_by)
         VALUES ($1, $2, 'disposed', $3, $4, 'System')`,
        [id, disposalDate, notes, reason],
      );
    });
  },

  async deactivateAsset(id: string, notes: string | null): Promise<void> {
    await withTransaction(async (client) => {
      const today = new Date().toISOString().slice(0, 10);
      await client.query(
        `UPDATE public.assets
         SET status = 'retired', assigned_employee_id = NULL, updated_at = NOW()
         WHERE id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO public.assignments (asset_id, assigned_date, status, notes, reason, performed_by)
         VALUES ($1, $2, 'inactive', $3, 'Asset Deactivated', 'System')`,
        [id, today, notes],
      );
    });
  },

  async startRepair(id: string, notes: string | null): Promise<void> {
    await withTransaction(async (client) => {
      const today = new Date().toISOString().slice(0, 10);
      await client.query(
        `UPDATE public.assets SET status = 'repair', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO public.repairs (asset_id, issue, repair_date, status, repair_notes)
         VALUES ($1, 'Sent for repair', $2, 'in_progress', $3)`,
        [id, today, notes],
      );
    });
  },

  async markAvailable(id: string): Promise<void> {
    await withTransaction(async (client) => {
      const today = new Date().toISOString().slice(0, 10);
      await client.query(
        `UPDATE public.assets SET status = 'available', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      await client.query(
        `UPDATE public.repairs
         SET status = 'completed', actual_return_date = $2, completed_date = $2, updated_at = NOW()
         WHERE asset_id = $1 AND status IN ('pending', 'in_progress')`,
        [id, today],
      );
    });
  },

  async getImages(assetId: string): Promise<ImageRow[]> {
    const { rows } = await query<ImageRow>(
      `SELECT id, asset_id, file_name, file_size, image_url, sort_order, upload_date
       FROM public.asset_images
       WHERE asset_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [assetId],
    );
    return rows;
  },

  async insertImages(
    assetId: string,
    images: { fileName: string; fileSize: number; imageUrl: string; sortOrder: number }[],
  ): Promise<void> {
    for (const image of images) {
      await query(
        `INSERT INTO public.asset_images (asset_id, file_name, file_size, image_url, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [assetId, image.fileName, image.fileSize, image.imageUrl, image.sortOrder],
      );
    }
  },

  async countImages(assetId: string): Promise<number> {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count FROM public.asset_images WHERE asset_id = $1`,
      [assetId],
    );
    return rows[0]?.count ?? 0;
  },

  async getStats(): Promise<StatsRow> {
    const { rows } = await query<StatsRow>(
      `SELECT
         COUNT(*)::INTEGER AS total_assets,
         COUNT(*) FILTER (WHERE status = 'available')::INTEGER AS available,
         COUNT(*) FILTER (WHERE status = 'assigned')::INTEGER AS assigned,
         COUNT(*) FILTER (WHERE status = 'repair')::INTEGER AS repair,
         COUNT(*) FILTER (WHERE status = 'retired')::INTEGER AS inactive,
         COUNT(*) FILTER (WHERE status = 'disposed')::INTEGER AS disposed
       FROM public.assets
       WHERE NOT is_deleted`,
    );
    return (
      rows[0] ?? {
        total_assets: 0,
        available: 0,
        assigned: 0,
        repair: 0,
        inactive: 0,
        disposed: 0,
      }
    );
  },

  toDateOnly,
};

async function insertAsset(
  client: pg.PoolClient,
  asset: {
    assetCode: string;
    assetName: string;
    categoryId: string;
    brand: string;
    model: string | null;
    serialNumber: string;
    purchaseDate: string;
    purchaseCost: number;
    invoiceNumber: string;
    vendorId: string;
    warrantyExpiry: string;
    remarks: string | null;
  },
): Promise<AssetRow> {
  const { rows } = await client.query<AssetRow>(
    `INSERT INTO public.assets (
       asset_code, asset_name, category_id, brand, model, serial_number,
       purchase_date, purchase_cost, purchase_cost_inr, invoice_number, vendor_id,
       warranty_expiry, status, remarks, is_deleted
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,'available',$12,false)
     RETURNING id, asset_code, asset_name, category_id, brand, model, serial_number,
       purchase_date, purchase_cost, purchase_cost_inr, invoice_number, vendor_id,
       warranty_expiry, status::TEXT AS status, assigned_employee_id, location, remarks,
       created_at, updated_at`,
    [
      asset.assetCode,
      asset.assetName,
      asset.categoryId,
      asset.brand,
      asset.model,
      asset.serialNumber,
      asset.purchaseDate,
      asset.purchaseCost,
      asset.invoiceNumber,
      asset.vendorId,
      asset.warrantyExpiry,
      asset.remarks,
    ],
  );
  return rows[0];
}

async function insertImages(
  client: pg.PoolClient,
  assetId: string,
  images: { fileName: string; fileSize: number; imageUrl: string; sortOrder: number }[],
): Promise<void> {
  for (const image of images) {
    await client.query(
      `INSERT INTO public.asset_images (asset_id, file_name, file_size, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, image.fileName, image.fileSize, image.imageUrl, image.sortOrder],
    );
  }
}
