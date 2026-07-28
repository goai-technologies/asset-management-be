export interface AssetImage {
  id: string;
  fileName: string;
  fileSize: number;
  imageUrl: string;
  sortOrder: number;
  uploadDate: string;
}

export interface AssetCategoryRef {
  id: string;
  name: string;
}

export interface AssetVendorRef {
  id: string;
  name: string;
  vendorCode: string;
}

export interface AssetEmployeeRef {
  id: string;
  name: string;
  employeeId: string;
}

export interface AssetSummary {
  id: string;
  assetId: string;
  name: string;
  brand: string | null;
  serialNumber: string | null;
  category: AssetCategoryRef | null;
  vendor: AssetVendorRef | null;
  purchaseCost: number | null;
  invoiceNumber: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: string;
  assignedEmployee: AssetEmployeeRef | null;
  thumbnailImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDetail extends AssetSummary {
  description: string | null;
  specifications: string | null;
  notes: string | null;
  images: AssetImage[];
}

export interface CreateAssetInput {
  categoryId: string;
  brand: string;
  serialNumber: string;
  invoiceNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  vendorId: string;
  purchaseCost: number;
  description?: string | null;
  specifications?: string | null;
  notes?: string | null;
}

export interface UpdateAssetInput {
  categoryId?: string;
  brand?: string;
  serialNumber?: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  vendorId?: string;
  purchaseCost?: number;
  description?: string | null;
  specifications?: string | null;
  notes?: string | null;
}

export interface AssetStats {
  totalAssets: number;
  available: number;
  assigned: number;
  repair: number;
  inactive: number;
  disposed: number;
}

export interface DisposeAssetInput {
  reason?: string;
  disposalDate?: string;
  notes?: string;
}

export interface AssetActionInput {
  notes?: string;
}
