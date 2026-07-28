import type { Request, Response } from "express";
import type { AssetReportFilters } from "../interfaces/report.interface.js";
import { reportService } from "../services/report.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function parseAssetFilters(req: Request): AssetReportFilters {
  const query = req.query;
  return {
    category: typeof query.category === "string" ? query.category : undefined,
    vendor: typeof query.vendor === "string" ? query.vendor : undefined,
    employee: typeof query.employee === "string" ? query.employee : undefined,
    status: typeof query.status === "string" ? query.status : undefined,
    purchaseDateFrom:
      typeof query.purchaseDateFrom === "string" ? query.purchaseDateFrom : undefined,
    purchaseDateTo: typeof query.purchaseDateTo === "string" ? query.purchaseDateTo : undefined,
    warrantyFrom: typeof query.warrantyFrom === "string" ? query.warrantyFrom : undefined,
    warrantyTo: typeof query.warrantyTo === "string" ? query.warrantyTo : undefined,
  };
}

function sendFile(res: Response, buffer: Buffer, filename: string, contentType: string): void {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export const reportController = {
  getAssets: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.getAssetReport(parseAssetFilters(req));
    sendSuccess(res, data, "Asset report retrieved");
  }),

  getEmployees: asyncHandler(async (_req: Request, res: Response) => {
    const data = await reportService.getEmployeeReport();
    sendSuccess(res, data, "Employee report retrieved");
  }),

  getVendors: asyncHandler(async (_req: Request, res: Response) => {
    const data = await reportService.getVendorReport();
    sendSuccess(res, data, "Vendor report retrieved");
  }),

  getAssignments: asyncHandler(async (_req: Request, res: Response) => {
    const data = await reportService.getAssignmentReport();
    sendSuccess(res, data, "Assignment report retrieved");
  }),

  getWarrantyExpiring: asyncHandler(async (req: Request, res: Response) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    const data = await reportService.getWarrantyExpiringReport(days);
    sendSuccess(res, data, "Warranty expiring report retrieved");
  }),

  exportAssetsExcel: asyncHandler(async (req: Request, res: Response) => {
    const buffer = await reportService.exportAssetsExcel(parseAssetFilters(req));
    sendFile(
      res,
      buffer,
      `assets-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }),

  exportAssetsPdf: asyncHandler(async (req: Request, res: Response) => {
    const buffer = await reportService.exportAssetsPdf(parseAssetFilters(req));
    sendFile(
      res,
      buffer,
      `assets-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      "application/pdf",
    );
  }),

  exportAssignmentsExcel: asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await reportService.exportAssignmentsExcel();
    sendFile(
      res,
      buffer,
      `assignments-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }),

  exportAssignmentsPdf: asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await reportService.exportAssignmentsPdf();
    sendFile(
      res,
      buffer,
      `assignments-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      "application/pdf",
    );
  }),
};
