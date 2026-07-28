export interface DashboardSummary {
  totalAssets: number;
  availableAssets: number;
  assignedAssets: number;
  underRepair: number;
  inactiveAssets: number;
  employees: number;
  vendors: number;
  categories: number;
}

export interface AssetsByCategory {
  category: string;
  count: number;
}

export interface AssetsByStatus {
  status: string;
  count: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  description: string | null;
  entityId: string;
  performedBy: string | null;
  createdAt: string;
}

export interface WarrantyExpiringAsset {
  assetId: string;
  assetCode: string;
  assetName: string;
  warrantyExpiry: string;
  daysUntilExpiry: number;
}
