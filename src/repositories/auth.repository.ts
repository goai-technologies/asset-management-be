import { query } from "../config/db.js";

export type DbUser = {
  id: string;
  email: string;
  encrypted_password: string | null;
  raw_user_meta_data: { name?: string } | null;
};

export const authRepository = {
  async findUserByEmail(email: string): Promise<DbUser | null> {
    const { rows } = await query<DbUser>(
      `SELECT id, email, encrypted_password, raw_user_meta_data
       FROM auth.users
       WHERE lower(email) = lower($1)`,
      [email.trim()],
    );
    return rows[0] ?? null;
  },

  async findUserById(userId: string): Promise<DbUser | null> {
    const { rows } = await query<DbUser>(
      `SELECT id, email, encrypted_password, raw_user_meta_data
       FROM auth.users
       WHERE id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async createUser(email: string, passwordHash: string, name: string): Promise<DbUser> {
    const id = crypto.randomUUID();
    const { rows } = await query<DbUser>(
      `INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, email, encrypted_password, raw_user_meta_data`,
      [id, email, passwordHash, JSON.stringify({ name })],
    );
    return rows[0];
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(`UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
  },

  async updatePasswordByEmail(email: string, passwordHash: string): Promise<void> {
    await query(`UPDATE auth.users SET encrypted_password = $1 WHERE lower(email) = lower($2)`, [
      passwordHash,
      email,
    ]);
  },

  async getProfile(userId: string): Promise<{ name: string; email: string } | null> {
    const { rows } = await query<{ name: string; email: string }>(
      `SELECT name, email FROM public.profiles WHERE id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async getUserRoles(userId: string): Promise<string[]> {
    const { rows } = await query<{ role: string }>(
      `SELECT role::text AS role FROM public.user_roles WHERE user_id = $1`,
      [userId],
    );
    return rows.map((r) => r.role);
  },

  async upsertPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    await query(
      `INSERT INTO auth.password_reset_tokens (email, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = $3`,
      [email, token, expiresAt.toISOString()],
    );
  },

  async findPasswordResetToken(
    email: string,
  ): Promise<{ token: string; expires_at: string } | null> {
    const { rows } = await query<{ token: string; expires_at: string }>(
      `SELECT token, expires_at FROM auth.password_reset_tokens WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  },

  async deletePasswordResetToken(email: string): Promise<void> {
    await query(`DELETE FROM auth.password_reset_tokens WHERE email = $1`, [email]);
  },
};
