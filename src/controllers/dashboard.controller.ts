import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardController = {
  getSummary: asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getSummary();
    sendSuccess(res, data, "Dashboard summary retrieved");
  }),

  getAssetsByCategory: asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getAssetsByCategory();
    sendSuccess(res, data, "Assets by category retrieved");
  }),

  getAssetsByStatus: asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getAssetsByStatus();
    sendSuccess(res, data, "Assets by status retrieved");
  }),

  getRecentActivities: asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getRecentActivities();
    sendSuccess(res, data, "Recent activities retrieved");
  }),

  getWarrantyExpiring: asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getWarrantyExpiring();
    sendSuccess(res, data, "Warranty expiring assets retrieved");
  }),
};
