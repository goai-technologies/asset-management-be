import { AppError } from "../utils/AppError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";
import { authRepository } from "../repositories/auth.repository.js";
import type { AuthUserProfile, LoginResult } from "../interfaces/api.interface.js";
import { env } from "../config/env.js";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function buildUserProfile(userId: string, email: string): Promise<AuthUserProfile> {
  const profile = await authRepository.getProfile(userId);
  const roles = await authRepository.getUserRoles(userId);
  const user = await authRepository.findUserById(userId);
  const metaName = user?.raw_user_meta_data?.name;

  return {
    id: userId,
    email,
    name: profile?.name ?? metaName ?? email.split("@")[0],
    roles,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await authRepository.findUserByEmail(email);
    if (!user?.encrypted_password) {
      throw new AppError(401, "Invalid email or password");
    }

    const valid = await comparePassword(password, user.encrypted_password);
    if (!valid) {
      throw new AppError(401, "Invalid email or password");
    }

    const profile = await buildUserProfile(user.id, user.email);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    return { accessToken, user: profile };
  },

  async register(email: string, password: string, name: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const displayName = name.trim() || normalizedEmail.split("@")[0];

    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(409, "An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await authRepository.createUser(normalizedEmail, passwordHash, displayName);
    const profile = await buildUserProfile(user.id, user.email);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    return { accessToken, user: profile };
  },

  async getProfile(userId: string, email: string): Promise<AuthUserProfile> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return buildUserProfile(userId, email);
  },

  async changePassword(userId: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) {
      throw new AppError(400, "Password must be at least 6 characters");
    }
    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePassword(userId, passwordHash);
  },

  async requestPasswordReset(email: string): Promise<{ devToken?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const token = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await authRepository.upsertPasswordResetToken(normalizedEmail, token, expiresAt);

    if (!env.isProduction) {
      console.log(`[Auth] Password reset code for ${normalizedEmail}: ${token}`);
      return { devToken: token };
    }

    return {};
  },

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) {
      throw new AppError(400, "Password must be at least 6 characters");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const reset = await authRepository.findPasswordResetToken(normalizedEmail);

    if (!reset || reset.token !== token) {
      throw new AppError(400, "Invalid verification code");
    }
    if (new Date(reset.expires_at) < new Date()) {
      throw new AppError(400, "Verification code has expired");
    }

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePasswordByEmail(normalizedEmail, passwordHash);
    await authRepository.deletePasswordResetToken(normalizedEmail);
  },
};
