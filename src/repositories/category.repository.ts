import { query } from "../config/db.js";

const CATEGORY_CODE_PATTERN = "^[A-Z][A-Z0-9]{2,9}$";

type CategoryRow = {
  id: string;
  category_name: string;
  description: string | null;
  icon: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  asset_count?: number;
};

type StatsRow = {
  total_categories: number;
  empty_categories: number;
  categories_with_assets: number;
};

const categorySelect = `
  SELECT
    c.id,
    c.category_name,
    c.description,
    c.icon,
    c.status::TEXT AS status,
    c.created_at,
    c.updated_at,
    COUNT(a.id) FILTER (WHERE NOT a.is_deleted)::INTEGER AS asset_count
  FROM public.categories c
  LEFT JOIN public.assets a ON a.category_id = c.id
`;

export const categoryRepository = {
  async findAll(): Promise<CategoryRow[]> {
    const { rows } = await query<CategoryRow>(
      `${categorySelect}
       GROUP BY c.id
       ORDER BY c.category_name`,
    );
    return rows;
  },

  async findById(id: string): Promise<CategoryRow | null> {
    const { rows } = await query<CategoryRow>(
      `${categorySelect}
       WHERE c.id = $1
       GROUP BY c.id`,
      [id],
    );
    return rows[0] ?? null;
  },

  async search(term: string): Promise<CategoryRow[]> {
    const pattern = `%${term}%`;
    const { rows } = await query<CategoryRow>(
      `${categorySelect}
       WHERE c.category_name ILIKE $1
          OR c.icon ILIKE $1
          OR (
            (c.icon IS NULL OR c.icon !~ $2)
            AND UPPER(LEFT(REGEXP_REPLACE(c.category_name, '[^A-Za-z0-9]', '', 'g'), 10)) ILIKE $1
          )
       GROUP BY c.id
       ORDER BY c.category_name`,
      [pattern, CATEGORY_CODE_PATTERN],
    );
    return rows;
  },

  async findByCategoryCode(categoryCode: string, excludeId?: string): Promise<CategoryRow | null> {
    const normalized = categoryCode.toUpperCase();
    const { rows } = await query<CategoryRow>(
      `SELECT id, category_name, description, icon, status::TEXT AS status, created_at, updated_at
       FROM public.categories
       WHERE (
         UPPER(icon) = $1
         OR (
           (icon IS NULL OR icon !~ $2)
           AND UPPER(LEFT(REGEXP_REPLACE(category_name, '[^A-Za-z0-9]', '', 'g'), 10)) = $1
         )
       )
       AND ($3::uuid IS NULL OR id <> $3::uuid)
       LIMIT 1`,
      [normalized, CATEGORY_CODE_PATTERN, excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async findByName(name: string, excludeId?: string): Promise<CategoryRow | null> {
    const { rows } = await query<CategoryRow>(
      `SELECT id, category_name, description, icon, status::TEXT AS status, created_at, updated_at
       FROM public.categories
       WHERE lower(category_name) = lower($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [name.trim(), excludeId ?? null],
    );
    return rows[0] ?? null;
  },

  async create(
    categoryCode: string,
    name: string,
    description: string | null,
    status: "active" | "inactive" = "active",
  ): Promise<CategoryRow> {
    const { rows } = await query<CategoryRow>(
      `INSERT INTO public.categories (category_name, description, status, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category_name, description, icon, status::TEXT AS status, created_at, updated_at`,
      [name.trim(), description, status, categoryCode.toUpperCase()],
    );
    return { ...rows[0], asset_count: 0 };
  },

  async update(
    id: string,
    categoryCode: string,
    name: string,
    description: string | null,
    status: "active" | "inactive",
  ): Promise<CategoryRow | null> {
    const { rows } = await query<CategoryRow>(
      `UPDATE public.categories
       SET category_name = $2,
           description = $3,
           icon = $4,
           status = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, category_name, description, icon, status::TEXT AS status, created_at, updated_at`,
      [id, name.trim(), description, categoryCode.toUpperCase(), status],
    );
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM public.categories WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  async countLinkedAssets(categoryId: string): Promise<number> {
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count
       FROM public.assets
       WHERE category_id = $1 AND NOT is_deleted`,
      [categoryId],
    );
    return rows[0]?.count ?? 0;
  },

  async getStats(): Promise<StatsRow> {
    const { rows } = await query<StatsRow>(
      `SELECT
         COUNT(*)::INTEGER AS total_categories,
         COUNT(*) FILTER (WHERE asset_count = 0)::INTEGER AS empty_categories,
         COUNT(*) FILTER (WHERE asset_count > 0)::INTEGER AS categories_with_assets
       FROM (
         SELECT c.id,
           COUNT(a.id) FILTER (WHERE NOT a.is_deleted)::INTEGER AS asset_count
         FROM public.categories c
         LEFT JOIN public.assets a ON a.category_id = c.id
         GROUP BY c.id
       ) category_counts`,
    );
    return (
      rows[0] ?? {
        total_categories: 0,
        empty_categories: 0,
        categories_with_assets: 0,
      }
    );
  },
};
