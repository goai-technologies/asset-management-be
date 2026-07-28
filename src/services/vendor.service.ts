import type {
  CreateVendorInput,
  UpdateVendorInput,
  Vendor,
  VendorStats,
} from "../interfaces/vendor.interface.js";
import { vendorRepository } from "../repositories/vendor.repository.js";
import { AppError } from "../utils/AppError.js";

const VENDOR_CODE_PATTERN = /^VEN\d{3}$/;

function resolveAddress(row: { address: string | null; office_address: string | null }): string {
  return row.office_address?.trim() || row.address?.trim() || "";
}

function mapVendor(row: {
  id: string;
  vendor_code: string;
  vendor_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  office_address: string | null;
  created_at: Date;
  updated_at: Date;
  asset_count?: number;
}): Vendor {
  return {
    id: row.id,
    vendorCode: row.vendor_code,
    name: row.vendor_name,
    contactPerson: row.contact_person ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: resolveAddress(row),
    assetCount: Number(row.asset_count ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function normalizeVendorCode(vendorCode: string): string {
  return vendorCode.trim().toUpperCase();
}

function assertVendorCodeFormat(vendorCode: string): void {
  if (!VENDOR_CODE_PATTERN.test(vendorCode)) {
    throw new AppError(400, "Vendor code must match format VEN001");
  }
}

async function assertUniqueVendorCode(vendorCode: string, excludeId?: string): Promise<void> {
  const existing = await vendorRepository.findByVendorCode(vendorCode, excludeId);
  if (existing) {
    throw new AppError(409, "A vendor with this vendor code already exists");
  }
}

async function assertUniqueName(name: string, excludeId?: string): Promise<void> {
  const existing = await vendorRepository.findByName(name, excludeId);
  if (existing) {
    throw new AppError(409, "A vendor with this name already exists");
  }
}

async function assertUniqueEmail(email: string, excludeId?: string): Promise<void> {
  const existing = await vendorRepository.findByEmail(email, excludeId);
  if (existing) {
    throw new AppError(409, "A vendor with this email already exists");
  }
}

async function resolveVendorCode(inputCode?: string): Promise<string> {
  if (inputCode?.trim()) {
    const vendorCode = normalizeVendorCode(inputCode);
    assertVendorCodeFormat(vendorCode);
    return vendorCode;
  }
  return vendorRepository.getNextVenCode();
}

export const vendorService = {
  async listVendors(): Promise<Vendor[]> {
    const rows = await vendorRepository.findAll();
    return rows.map(mapVendor);
  },

  async getVendorById(id: string): Promise<Vendor> {
    const row = await vendorRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Vendor not found");
    }
    return mapVendor(row);
  },

  async searchVendors(term: string): Promise<Vendor[]> {
    const trimmed = term.trim();
    if (!trimmed) {
      return this.listVendors();
    }
    const rows = await vendorRepository.search(trimmed);
    return rows.map(mapVendor);
  },

  async getStats(): Promise<VendorStats> {
    const stats = await vendorRepository.getStats();
    return {
      totalVendors: Number(stats.total_vendors),
      vendorsWithAssets: Number(stats.vendors_with_assets),
      vendorsWithoutAssets: Number(stats.vendors_without_assets),
    };
  },

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const vendorCode = await resolveVendorCode(input.vendorCode);
    const name = input.name.trim();
    const contactPerson = input.contactPerson.trim();
    const email = input.email.trim();
    const phone = input.phone.trim();
    const address = input.address.trim();

    await assertUniqueVendorCode(vendorCode);
    await assertUniqueName(name);
    await assertUniqueEmail(email);

    const row = await vendorRepository.create(
      vendorCode,
      name,
      contactPerson,
      email,
      phone,
      address,
    );
    return mapVendor(row);
  },

  async updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
    const existing = await vendorRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Vendor not found");
    }

    const vendorCode = normalizeVendorCode(
      input.vendorCode ?? existing.vendor_code,
    );
    const name = (input.name ?? existing.vendor_name).trim();
    const contactPerson = (input.contactPerson ?? existing.contact_person ?? "").trim();
    const email = (input.email ?? existing.email ?? "").trim();
    const phone = (input.phone ?? existing.phone ?? "").trim();
    const address = (input.address ?? resolveAddress(existing)).trim();

    if (input.vendorCode) {
      assertVendorCodeFormat(vendorCode);
    }

    await assertUniqueVendorCode(vendorCode, id);
    await assertUniqueName(name, id);
    await assertUniqueEmail(email, id);

    const row = await vendorRepository.update(
      id,
      vendorCode,
      name,
      contactPerson,
      email,
      phone,
      address,
    );
    if (!row) {
      throw new AppError(404, "Vendor not found");
    }

    const withCount = await vendorRepository.findById(id);
    return mapVendor(withCount ?? { ...row, asset_count: existing.asset_count });
  },

  async deleteVendor(id: string): Promise<void> {
    const existing = await vendorRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Vendor not found");
    }

    const assetCount = await vendorRepository.countLinkedAssets(id);
    if (assetCount > 0) {
      throw new AppError(409, "Cannot delete vendor because assets are assigned.");
    }

    const deleted = await vendorRepository.delete(id);
    if (!deleted) {
      throw new AppError(404, "Vendor not found");
    }
  },
};
