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
      `SELECT role::text AS role
       FROM public.user_roles
       WHERE user_id = $1
       ORDER BY CASE role::text
         WHEN 'administrator' THEN 1
         WHEN 'it_team' THEN 2
         ELSE 3
       END`,
      [userId],
    );
    return rows.map((r) => r.role);
  },

  async listUsersWithRoles(): Promise<
    Array<{ id: string; name: string; email: string; role: string }>
  > {
    const { rows } = await query<{ id: string; name: string; email: string; role: string }>(
      `SELECT u.id,
              COALESCE(p.name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS name,
              u.email,
              COALESCE(
                (
                  SELECT ur.role::text
                  FROM public.user_roles ur
                  WHERE ur.user_id = u.id
                  ORDER BY CASE ur.role::text
                    WHEN 'administrator' THEN 1
                    WHEN 'it_team' THEN 2
                    ELSE 3
                  END
                  LIMIT 1
                ),
                'employee'
              ) AS role
       FROM auth.users u
       LEFT JOIN public.profiles p ON p.id = u.id
       ORDER BY u.email`,
    );
    return rows;
  },

  async setUserRole(userId: string, role: string): Promise<void> {
    await query(`DELETE FROM public.user_roles WHERE user_id = $1`, [userId]);
    await query(
      `INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2::public.app_role)`,
      [userId, role],
    );
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
