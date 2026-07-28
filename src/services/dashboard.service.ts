import type {
  AssetsByCategory,
  AssetsByStatus,
  DashboardSummary,
  RecentActivity,
  WarrantyExpiringAsset,
} from "../interfaces/dashboard.interface.js";
import { dashboardRepository } from "../repositories/dashboard.repository.js";

const RECENT_ACTIVITY_LIMIT = 10;

function formatStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "repair") return "Under Repair";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const row = await dashboardRepository.getSummary();

    return {
      totalAssets: Number(row.total_assets ?? 0),
      availableAssets: Number(row.available_assets ?? 0),
      assignedAssets: Number(row.assigned_assets ?? 0),
      underRepair: Number(row.under_repair_assets ?? 0),
      inactiveAssets: Number(row.retired_assets ?? 0),
      employees: Number(row.total_employees ?? 0),
      vendors: Number(row.vendor_count ?? 0),
      categories: Number(row.category_count ?? 0),
    };
  },

  async getAssetsByCategory(): Promise<AssetsByCategory[]> {
    const rows = await dashboardRepository.getAssetsByCategory();
    return rows.map((row) => ({
      category: row.category_name,
      count: Number(row.asset_count),
    }));
  },

  async getAssetsByStatus(): Promise<AssetsByStatus[]> {
    const rows = await dashboardRepository.getAssetsByStatus();
    return rows.map((row) => ({
      status: formatStatusLabel(row.status),
      count: Number(row.asset_count),
    }));
  },

  async getRecentActivities(): Promise<RecentActivity[]> {
    const rows = await dashboardRepository.getRecentActivities(RECENT_ACTIVITY_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      description: row.description,
      entityId: row.entity_id,
      performedBy: row.performed_by,
      createdAt: row.created_at.toISOString(),
    }));
  },

  async getWarrantyExpiring(): Promise<WarrantyExpiringAsset[]> {
    const rows = await dashboardRepository.getWarrantyExpiring();
    return rows.map((row) => ({
      assetId: row.asset_id,
      assetCode: row.asset_code,
      assetName: row.asset_name,
      warrantyExpiry: toDateOnly(row.warranty_expiry),
      daysUntilExpiry: Number(row.days_until_expiry),
    }));
  },
};
