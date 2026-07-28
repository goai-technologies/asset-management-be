import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { AUTH_COOKIE } from "../middleware/auth.middleware.js";
import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
  });
}

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    setAuthCookie(res, result.accessToken);
    sendSuccess(res, result, "Login successful");
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name?: string;
    };
    const result = await authService.register(email, password, name ?? "");
    setAuthCookie(res, result.accessToken);
    sendSuccess(res, result, "Registration successful", 201);
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    clearAuthCookie(res);
    sendSuccess(res, null, "Logged out successfully");
  }),

  profile: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const email = req.user!.email;
    const profile = await authService.getProfile(userId, email);
    sendSuccess(res, profile, "Profile retrieved");
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    await authService.changePassword(req.user!.sub, password);
    sendSuccess(res, null, "Password updated successfully");
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const result = await authService.requestPasswordReset(email);
    sendSuccess(
      res,
      result,
      "If an account exists for this email, a reset code has been sent",
    );
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email, token, password } = req.body as {
      email: string;
      token: string;
      password: string;
    };
    await authService.resetPassword(email, token, password);
    sendSuccess(res, null, "Password reset successful");
  }),
};
