/**
 * Resets transactional data (assets, employees, related records).
 * Preserves: categories, vendors, auth.users, profiles, user_roles.
 */
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

async function count(table) {
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM public.${table}`);
  return r.rows[0].c;
}

const before = {
  assets: await count("assets"),
  employees: await count("employees"),
  assignments: await count("assignments"),
  asset_images: await count("asset_images"),
  repairs: await count("repairs"),
  asset_disposals: await count("asset_disposals"),
  notifications: await count("notifications"),
  activity_logs: await count("activity_logs"),
  categories: await count("categories"),
  vendors: await count("vendors"),
  profiles: await count("profiles"),
  user_roles: await count("user_roles"),
};

try {
  await client.query("BEGIN");

  const del = async (table) => {
    const r = await client.query(`DELETE FROM public.${table} RETURNING id`);
    return r.rowCount ?? 0;
  };

  const deleted = {
    notifications: await del("notifications"),
    activity_logs: await del("activity_logs"),
    asset_disposals: await del("asset_disposals"),
    asset_images: await del("asset_images"),
    repairs: await del("repairs"),
    assignments: await del("assignments"),
    assets: await del("assets"),
    employees: await del("employees"),
  };

  await client.query("ALTER SEQUENCE public.asset_code_seq RESTART WITH 1");

  await client.query("COMMIT");

  const after = {
    assets: await count("assets"),
    employees: await count("employees"),
    assignments: await count("assignments"),
    asset_images: await count("asset_images"),
    repairs: await count("repairs"),
    activity_logs: await count("activity_logs"),
    categories: await count("categories"),
    vendors: await count("vendors"),
    profiles: await count("profiles"),
    user_roles: await count("user_roles"),
  };

  const seq = await client.query("SELECT last_value, is_called FROM asset_code_seq");

  console.log(JSON.stringify({ before, deleted, after, asset_code_seq: seq.rows[0] }, null, 2));
} catch (err) {
  await client.query("ROLLBACK");
  console.error("ROLLBACK:", err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
