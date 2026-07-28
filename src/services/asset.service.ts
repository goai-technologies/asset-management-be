import type {
  AssetActionInput,
  AssetDetail,
  AssetImage,
  AssetStats,
  AssetSummary,
  CreateAssetInput,
  DisposeAssetInput,
  UpdateAssetInput,
} from "../interfaces/asset.interface.js";
import { assetRepository } from "../repositories/asset.repository.js";
import { generateCategoryAssetCode } from "../utils/asset-code.js";
import { AppError } from "../utils/AppError.js";
import { cleanupUploadedFiles } from "../utils/upload-cleanup.js";

type UploadedImage = {
  originalname: string;
  size: number;
  filename: string;
};

function formatStatus(status: string): string {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "repair":
      return "Under Repair";
    case "retired":
      return "Inactive";
    case "disposed":
      return "Disposed";
    default:
      return "Available";
  }
}

function mapSummary(row: Awaited<ReturnType<typeof assetRepository.findById>> & object): AssetSummary {
  if (!row) throw new AppError(500, "Failed to map asset");
  return {
    id: row.id,
    assetId: row.asset_code,
    name: row.asset_name,
    brand: row.brand,
    serialNumber: row.serial_number,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name ?? "Uncategorized" }
      : null,
    vendor: row.vendor_id
      ? {
          id: row.vendor_id,
          name: row.vendor_name ?? "",
          vendorCode: row.vendor_code ?? "",
        }
      : null,
    purchaseCost:
      row.purchase_cost_inr != null
        ? Number(row.purchase_cost_inr)
        : row.purchase_cost != null
          ? Number(row.purchase_cost)
          : null,
    invoiceNumber: row.invoice_number,
    purchaseDate: assetRepository.toDateOnly(row.purchase_date),
    warrantyExpiry: assetRepository.toDateOnly(row.warranty_expiry),
    status: formatStatus(row.status),
    assignedEmployee:
      row.assigned_employee_id && row.employee_name
        ? {
            id: row.assigned_employee_id,
            name: row.employee_name,
            employeeId: row.employee_code ?? "",
          }
        : null,
    thumbnailImage: row.thumbnail_url ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapImages(images: Awaited<ReturnType<typeof assetRepository.getImages>>): AssetImage[] {
  return images.map((image) => ({
    id: image.id,
    fileName: image.file_name,
    fileSize: image.file_size,
    imageUrl: image.image_url,
    sortOrder: image.sort_order,
    uploadDate: image.upload_date.toISOString(),
  }));
}

function buildAssetName(input: { brand: string; description?: string | null }): string {
  const description = input.description?.trim();
  if (description) return description;
  return input.brand.trim();
}

function assertWarrantyAfterPurchase(purchaseDate: string, warrantyExpiry: string): void {
  if (new Date(warrantyExpiry) <= new Date(purchaseDate)) {
    throw new AppError(400, "Warranty expiry must be after purchase date");
  }
}

async function assertUniqueSerial(serialNumber: string, excludeId?: string): Promise<void> {
  const existing = await assetRepository.findBySerialNumber(serialNumber, excludeId);
  if (existing) {
    throw new AppError(409, "An asset with this serial number already exists");
  }
}

async function assertUniqueInvoice(invoiceNumber: string, excludeId?: string): Promise<void> {
  const existing = await assetRepository.findByInvoiceNumber(invoiceNumber, excludeId);
  if (existing) {
    throw new AppError(409, "An asset with this invoice number already exists");
  }
}

function mapUploadedImages(files: UploadedImage[]): {
  fileName: string;
  fileSize: number;
  imageUrl: string;
  sortOrder: number;
}[] {
  return files.map((file, index) => ({
    fileName: file.originalname,
    fileSize: file.size,
    imageUrl: `/uploads/assets/${file.filename}`,
    sortOrder: index,
  }));
}

async function assertCanDelete(asset: NonNullable<Awaited<ReturnType<typeof assetRepository.findById>>>): Promise<void> {
  if (asset.assigned_employee_id) {
    throw new AppError(409, "Cannot delete assigned asset.");
  }
  const assignmentCount = await assetRepository.countAssignments(asset.id);
  if (assignmentCount > 0) {
    throw new AppError(409, "Cannot delete asset that has assignment history.");
  }
}

async function assertNotAssigned(
  asset: NonNullable<Awaited<ReturnType<typeof assetRepository.findById>>>,
  action: string,
): Promise<void> {
  if (asset.assigned_employee_id) {
    throw new AppError(409, `Cannot ${action} assigned asset.`);
  }
}

async function assertNotDisposed(
  asset: NonNullable<Awaited<ReturnType<typeof assetRepository.findById>>>,
  action: string,
): Promise<void> {
  if (asset.status === "disposed") {
    throw new AppError(409, `Cannot ${action} disposed asset.`);
  }
}

export const assetService = {
  async listAssets(): Promise<AssetSummary[]> {
    const rows = await assetRepository.findAll();
    return rows.map((row) => mapSummary(row));
  },

  async listArchivedAssets(): Promise<AssetSummary[]> {
    const rows = await assetRepository.findArchived();
    return rows.map((row) => mapSummary(row));
  },

  async getAssetById(id: string): Promise<AssetDetail> {
    const row = await assetRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Asset not found");
    }
    const images = await assetRepository.getImages(id);
    const summary = mapSummary(row);
    return {
      ...summary,
      description: row.asset_name,
      specifications: row.model,
      notes: row.remarks,
      images: mapImages(images),
    };
  },

  async searchAssets(term: string): Promise<AssetSummary[]> {
    const trimmed = term.trim();
    if (!trimmed) {
      return this.listAssets();
    }
    const rows = await assetRepository.search(trimmed);
    return rows.map((row) => mapSummary(row));
  },

  async getStats(): Promise<AssetStats> {
    const stats = await assetRepository.getStats();
    return {
      totalAssets: Number(stats.total_assets),
      available: Number(stats.available),
      assigned: Number(stats.assigned),
      repair: Number(stats.repair),
      inactive: Number(stats.inactive),
      disposed: Number(stats.disposed),
    };
  },

  async createAsset(input: CreateAssetInput, files: UploadedImage[] = []): Promise<AssetDetail> {
    assertWarrantyAfterPurchase(input.purchaseDate, input.warrantyExpiry);
    await assertUniqueSerial(input.serialNumber);
    await assertUniqueInvoice(input.invoiceNumber);

    const categoryName = await assetRepository.findCategoryName(input.categoryId);
    if (!categoryName) {
      throw new AppError(400, "Invalid category");
    }

    const existingCodes = await assetRepository.findAllAssetCodes();
    let assetCode: string;
    try {
      assetCode = generateCategoryAssetCode(input.categoryId, categoryName, existingCodes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate asset ID";
      throw new AppError(409, message);
    }

    const assetName = buildAssetName(input);
    const mappedImages = mapUploadedImages(files);

    try {
      const row = await assetRepository.createAssetWithImages(
        {
          assetCode,
          assetName,
          categoryId: input.categoryId,
          brand: input.brand.trim(),
          model: input.specifications?.trim() || null,
          serialNumber: input.serialNumber.trim(),
          purchaseDate: input.purchaseDate,
          purchaseCost: input.purchaseCost,
          invoiceNumber: input.invoiceNumber.trim(),
          vendorId: input.vendorId,
          warrantyExpiry: input.warrantyExpiry,
          remarks: input.notes?.trim() || null,
        },
        mappedImages,
      );

      return this.getAssetById(row.id);
    } catch (error) {
      if (files.length > 0) {
        await cleanupUploadedFiles(files);
      }
      throw error;
    }
  },

  async updateAsset(
    id: string,
    input: UpdateAssetInput,
    files: UploadedImage[] = [],
  ): Promise<AssetDetail> {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }

    const purchaseDate = input.purchaseDate ?? assetRepository.toDateOnly(existing.purchase_date) ?? "";
    const warrantyExpiry =
      input.warrantyExpiry ?? assetRepository.toDateOnly(existing.warranty_expiry) ?? "";
    assertWarrantyAfterPurchase(purchaseDate, warrantyExpiry);

    const serialNumber = (input.serialNumber ?? existing.serial_number ?? "").trim();
    const invoiceNumber = (input.invoiceNumber ?? existing.invoice_number ?? "").trim();
    await assertUniqueSerial(serialNumber, id);
    await assertUniqueInvoice(invoiceNumber, id);

    const brand = (input.brand ?? existing.brand ?? "").trim();
    const assetName = buildAssetName({
      brand,
      description: input.description ?? existing.asset_name,
    });

    const row = await assetRepository.updateAsset(
      id,
      assetName,
      input.categoryId ?? existing.category_id ?? "",
      brand,
      input.specifications !== undefined
        ? input.specifications?.trim() || null
        : existing.model,
      serialNumber,
      purchaseDate,
      input.purchaseCost ??
        Number(existing.purchase_cost_inr ?? existing.purchase_cost ?? 0),
      invoiceNumber,
      input.vendorId ?? existing.vendor_id ?? "",
      warrantyExpiry,
      input.notes !== undefined ? input.notes?.trim() || null : existing.remarks,
    );
    if (!row) {
      throw new AppError(404, "Asset not found");
    }

    if (files.length > 0) {
      const currentCount = await assetRepository.countImages(id);
      if (currentCount + files.length > 10) {
        throw new AppError(400, "Maximum 10 images allowed per asset");
      }
      const startOrder = currentCount;
      const mapped = mapUploadedImages(files).map((image, index) => ({
        ...image,
        sortOrder: startOrder + index,
      }));
      await assetRepository.insertImages(id, mapped);
    }

    return this.getAssetById(id);
  },

  async deleteAsset(id: string): Promise<void> {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }
    await assertCanDelete(existing);
    const deleted = await assetRepository.softDelete(id);
    if (!deleted) {
      throw new AppError(404, "Asset not found");
    }
  },

  async restoreAsset(id: string): Promise<AssetDetail> {
    const existing = await assetRepository.findByIdIncludingDeleted(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }
    if (!existing.is_deleted) {
      throw new AppError(400, "Asset is not archived");
    }

    const restored = await assetRepository.restore(id);
    if (!restored) {
      throw new AppError(404, "Asset not found");
    }

    return this.getAssetById(id);
  },

  async deactivateAsset(id: string, input: AssetActionInput = {}): Promise<AssetDetail> {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }
    await assertNotDisposed(existing, "deactivate");
    await assertNotAssigned(existing, "deactivate");
    if (existing.status === "retired") {
      throw new AppError(400, "Asset is already inactive");
    }

    await assetRepository.deactivateAsset(id, input.notes?.trim() || null);
    return this.getAssetById(id);
  },

  async disposeAsset(id: string, input: DisposeAssetInput = {}): Promise<AssetDetail> {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }
    if (existing.status === "disposed") {
      throw new AppError(400, "Asset is already disposed");
    }
    await assertNotAssigned(existing, "dispose");

    const disposalDate = input.disposalDate ?? new Date().toISOString().slice(0, 10);
    await assetRepository.disposeAsset(
      id,
      input.reason?.trim() || "Disposed",
      disposalDate,
      input.notes?.trim() || null,
    );
    return this.getAssetById(id);
  },

  async repairAsset(id: string, input: AssetActionInput = {}): Promise<AssetDetail> {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }
    await assertNotDisposed(existing, "repair");
    await assertNotAssigned(existing, "repair");
    if (existing.status === "repair") {
      throw new AppError(400, "Asset is already under repair");
    }

    await assetRepository.startRepair(id, input.notes?.trim() || null);
    return this.getAssetById(id);
  },

  async markAvailable(id: string): Promise<AssetDetail> {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Asset not found");
    }
    if (existing.status !== "repair") {
      throw new AppError(400, "Only assets under repair can be marked available");
    }

    await assetRepository.markAvailable(id);
    return this.getAssetById(id);
  },
};
