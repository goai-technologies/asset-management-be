import type { Request, Response } from "express";
import type { CreateVendorInput, UpdateVendorInput } from "../interfaces/vendor.interface.js";
import { vendorService } from "../services/vendor.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const vendorController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await vendorService.listVendors();
    sendSuccess(res, data, "Vendors retrieved");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await vendorService.getVendorById(String(req.params.id));
    sendSuccess(res, data, "Vendor retrieved");
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    const data = await vendorService.searchVendors(term);
    sendSuccess(res, data, "Vendor search completed");
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await vendorService.getStats();
    sendSuccess(res, data, "Vendor stats retrieved");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateVendorInput;
    const data = await vendorService.createVendor(body);
    sendSuccess(res, data, "Vendor created", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateVendorInput;
    const data = await vendorService.updateVendor(String(req.params.id), body);
    sendSuccess(res, data, "Vendor updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await vendorService.deleteVendor(String(req.params.id));
    sendSuccess(res, null, "Vendor deleted");
  }),
};
