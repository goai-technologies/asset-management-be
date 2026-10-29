import type { NextFunction, Request, Response } from "express";
import type { AppRole } from "../interfaces/api.interface.js";
import { authRepository } from "../repositories/auth.repository.js";
import { AppError } from "../utils/AppError.js";

export function requireRoles(...allowedRoles: AppRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw new AppError(401, "Unauthorized");
      }

      const roles = await authRepository.getUserRoles(userId);
      const allowed = allowedRoles.some((role) => roles.includes(role));
      if (!allowed) {
        throw new AppError(403, "Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
