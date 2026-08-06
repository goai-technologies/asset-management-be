import { query } from "../config/db.js";

type VendorRow = {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  office_address: string | null;
  gst_number: string | null;
  created_at: Date;
  updated_at: Date;
  asset_count?: number;
};

type StatsRow = {
  total_vendors: number;
  vendors_with_assets: number;
  vendors_without_assets: number;
};

const vendorSelect = `
  SELECT
    v.id,
    v.vendor_code,
    v.vendor_name,
    v.contact_person,
    v.email,
    v.phone,
    v.address,
    v.office_address,
    v.gst_number,
    v.created_at,
    v.updated_at,
    COUNT(a.id) FILTER (WHERE NOT a.is_deleted)::INTEGER AS asset_count
  FROM public.vendors v
  LEFT JOIN public.assets a ON a.vendor_id = v.id
`;

export const vendorRepository = {
  async findAll(): Promise<VendorRow[]> {
    const { rows } = await query<VendorRow>(
      `${vendorSelect}
       GROUP BY v.id
       ORDER BY v.vendor_name`,
    );
    return rows;
  },

  async findById(id: string): Promise<VendorRow | null> {
    const { rows } = await query<VendorRow>(
      `${vendorSelect}
       WHERE v.id = $1
       GROUP BY v.id`,
      [id],
    );
    return rows[0] ?? null;
  },

  async search(term: string): Promise<VendorRow[]> {
    const pattern = `%${term}%`;
    const { rows } = await query<VendorRow>(
      `${vendorSelect}
       WHERE v.vendor_name ILIKE $1
          OR v.vendor_code ILIKE $1
          OR v.contact_person ILIKE $1
          OR v.email ILIKE $1
       GROUP BY v.id
       ORDER BY v.vendor_name`,
      [pattern],
    );
    return rows;
  },

  async findByVendorCode(vendorCode: string, excludeId?: string): Promise<VendorRow | null> {
    const { rows } = await query<VendorRow>(
      `SELECT id, vendor_code, vendor_name, contact_person, email, phone, address, office_address, gst_number, created_at, updated_at
       FROM public.vendors
       WHERE UPPER(vendor_code) = UPPER($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [vendorCode.trim(), excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async findByName(name: string, excludeId?: string): Promise<VendorRow | null> {
    const { rows } = await query<VendorRow>(
      `SELECT id, vendor_code, vendor_name, contact_person, email, phone, address, office_address, gst_number, created_at, updated_at
       FROM public.vendors
       WHERE lower(vendor_name) = lower($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [name.trim(), excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async findByEmail(email: string, excludeId?: string): Promise<VendorRow | null> {
    const { rows } = await query<VendorRow>(
      `SELECT id, vendor_code, vendor_name, contact_person, email, phone, address, office_address, gst_number, created_at, updated_at
       FROM public.vendors
       WHERE lower(email) = lower($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [email.trim(), excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async getNextVenCode(): Promise<string> {
    const { rows } = await query<{ max_num: number | null }>(
      `SELECT MAX(CAST(SUBSTRING(vendor_code FROM 4) AS INTEGER)) AS max_num
       FROM public.vendors
       WHERE vendor_code ~ '^VEN[0-9]{3}$'`,
    );
    const next = Number(rows[0]?.max_num ?? 0) + 1;
    return `VEN${String(next).padStart(3, "0")}`;
  },

  async create(
    vendorCode: string,
    name: string,
    contactPerson: string,
    email: string,
    phone: string,
    address: string,
    gstNumber: string,
  ): Promise<VendorRow> {
    const { rows } = await query<VendorRow>(
      `INSERT INTO public.vendors (
         vendor_code, vendor_name, contact_person, email, phone, address, office_address, gst_number, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, 'active')
       RETURNING id, vendor_code, vendor_name, contact_person, email, phone, address, office_address, gst_number, created_at, updated_at`,
      [
        vendorCode,
        name.trim(),
        contactPerson.trim(),
        email.trim(),
        phone.trim(),
        address.trim(),
        gstNumber.trim(),
      ],
    );
    return { ...rows[0], asset_count: 0 };
  },

  async update(
    id: string,
    vendorCode: string,
    name: string,
    contactPerson: string,
    email: string,
    phone: string,
    address: string,
    gstNumber: string,
  ): Promise<VendorRow | null> {
    const { rows } = await query<VendorRow>(
      `UPDATE public.vendors
       SET vendor_code = $2,
           vendor_name = $3,
           contact_person = $4,
           email = $5,
           phone = $6,
           address = $7,
           office_address = $7,
           gst_number = $8,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, vendor_code, vendor_name, contact_person, email, phone, address, office_address, gst_number, created_at, updated_at`,
      [
        id,
        vendorCode,
        name.trim(),
        contactPerson.trim(),
        email.trim(),
        phone.trim(),
        address.trim(),
        gstNumber.trim(),
      ],
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM public.vendors WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  async countLinkedAssets(vendorId: string): Promise<number> {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count
       FROM public.assets
       WHERE vendor_id = $1 AND NOT is_deleted`,
      [vendorId],
    );
    return rows[0]?.count ?? 0;
  },

  async getStats(): Promise<StatsRow> {
    const { rows } = await query<StatsRow>(
      `SELECT
         COUNT(*)::INTEGER AS total_vendors,
         COUNT(*) FILTER (WHERE asset_count > 0)::INTEGER AS vendors_with_assets,
         COUNT(*) FILTER (WHERE asset_count = 0)::INTEGER AS vendors_without_assets
       FROM (
         SELECT v.id,
           COUNT(a.id) FILTER (WHERE NOT a.is_deleted)::INTEGER AS asset_count
         FROM public.vendors v
         LEFT JOIN public.assets a ON a.vendor_id = v.id
         GROUP BY v.id
       ) vendor_counts`,
    );
    return (
      rows[0] ?? {
        total_vendors: 0,
        vendors_with_assets: 0,
        vendors_without_assets: 0,
      }
    );
  },
};
