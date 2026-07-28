import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";

const AUTH_COOKIE = "access_token";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const cookieToken =
      typeof req.cookies?.[AUTH_COOKIE] === "string" ? req.cookies[AUTH_COOKIE] : null;
    const token = bearer ?? cookieToken;

    if (!token) {
      throw new AppError(401, "Unauthorized");
    }

    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

export { AUTH_COOKIE };
