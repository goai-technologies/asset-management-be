export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstNumber: string;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  vendorCode?: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstNumber: string;
}

export interface UpdateVendorInput {
  vendorCode?: string;
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
}

export interface VendorStats {
  totalVendors: number;
  vendorsWithAssets: number;
  vendorsWithoutAssets: number;
}
