export interface Category {
  id: string;
  categoryCode: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  categoryCode: string;
  name: string;
  description?: string | null;
  status?: "active" | "inactive";
}

export interface UpdateCategoryInput {
  categoryCode?: string;
  name?: string;
  description?: string | null;
  status?: "active" | "inactive";
}

export interface CategoryStats {
  totalCategories: number;
  emptyCategories: number;
  categoriesWithAssets: number;
}
