import type { Request, Response } from "express";
import type {
  AssetActionInput,
  CreateAssetInput,
  DisposeAssetInput,
  UpdateAssetInput,
} from "../interfaces/asset.interface.js";
import { assetService } from "../services/asset.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

type UploadedFile = Express.Multer.File;

function getUploadedFiles(req: Request): UploadedFile[] {
  if (Array.isArray(req.files)) {
    return req.files as UploadedFile[];
  }
  if (req.file) {
    return [req.file];
  }
  return [];
}

function parseCreateInput(req: Request): CreateAssetInput {
  const body = req.body as Record<string, string>;
  return {
    categoryId: body.categoryId,
    brand: body.brand,
    serialNumber: body.serialNumber,
    invoiceNumber: body.invoiceNumber,
    purchaseDate: body.purchaseDate,
    warrantyExpiry: body.warrantyExpiry,
    vendorId: body.vendorId,
    purchaseCost: Number(body.purchaseCost),
    description: body.description ?? null,
    specifications: body.specifications ?? null,
    notes: body.notes ?? null,
  };
}

function parseUpdateInput(req: Request): UpdateAssetInput {
  const body = req.body as Record<string, string | undefined>;
  return {
    categoryId: body.categoryId,
    brand: body.brand,
    serialNumber: body.serialNumber,
    invoiceNumber: body.invoiceNumber,
    purchaseDate: body.purchaseDate,
    warrantyExpiry: body.warrantyExpiry,
    vendorId: body.vendorId,
    purchaseCost: body.purchaseCost !== undefined ? Number(body.purchaseCost) : undefined,
    description: body.description,
    specifications: body.specifications,
    notes: body.notes,
  };
}

export const assetController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await assetService.listAssets();
    sendSuccess(res, data, "Assets retrieved");
  }),

  listArchived: asyncHandler(async (_req: Request, res: Response) => {
    const data = await assetService.listArchivedAssets();
    sendSuccess(res, data, "Archived assets retrieved");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await assetService.getAssetById(String(req.params.id));
    sendSuccess(res, data, "Asset retrieved");
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    const data = await assetService.searchAssets(term);
    sendSuccess(res, data, "Asset search completed");
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await assetService.getStats();
    sendSuccess(res, data, "Asset stats retrieved");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await assetService.createAsset(parseCreateInput(req), getUploadedFiles(req));
    sendSuccess(res, data, "Asset created", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await assetService.updateAsset(
      String(req.params.id),
      parseUpdateInput(req),
      getUploadedFiles(req),
    );
    sendSuccess(res, data, "Asset updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await assetService.deleteAsset(String(req.params.id));
    sendSuccess(res, null, "Asset deleted");
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const data = await assetService.restoreAsset(String(req.params.id));
    sendSuccess(res, data, "Asset restored");
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as AssetActionInput;
    const data = await assetService.deactivateAsset(String(req.params.id), body);
    sendSuccess(res, data, "Asset deactivated");
  }),

  dispose: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as DisposeAssetInput;
    const data = await assetService.disposeAsset(String(req.params.id), body);
    sendSuccess(res, data, "Asset disposed");
  }),

  repair: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as AssetActionInput;
    const data = await assetService.repairAsset(String(req.params.id), body);
    sendSuccess(res, data, "Asset moved to repair");
  }),

  available: asyncHandler(async (req: Request, res: Response) => {
    const data = await assetService.markAvailable(String(req.params.id));
    sendSuccess(res, data, "Asset marked available");
  }),
};
