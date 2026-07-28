export interface AssetReportFilters {
  category?: string;
  vendor?: string;
  employee?: string;
  status?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  warrantyFrom?: string;
  warrantyTo?: string;
}

export interface AssetReportRow {
  assetId: string;
  category: string | null;
  brand: string | null;
  serialNumber: string | null;
  vendor: string | null;
  purchaseCost: number | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: string;
  assignedEmployee: string | null;
}

export interface EmployeeReportRow {
  employeeId: string;
  name: string;
  department: string | null;
  designation: string | null;
  assignedAssetCount: number;
}

export interface VendorReportRow {
  vendorCode: string;
  vendorName: string;
  contactPerson: string | null;
  assetCount: number;
}

export interface AssignmentReportRow {
  id: string;
  assetId: string;
  assetCode: string;
  category: string | null;
  employeeName: string | null;
  employeeCode: string | null;
  assignedDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  assignedBy: string | null;
  returnedBy: string | null;
  status: string;
  remarks: string | null;
}

export interface WarrantyExpiringRow {
  assetId: string;
  category: string | null;
  brand: string | null;
  serialNumber: string | null;
  vendor: string | null;
  warrantyExpiry: string;
  daysUntilExpiry: number;
  status: string;
  assignedEmployee: string | null;
}
