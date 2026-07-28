import type {
  Category,
  CategoryStats,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../interfaces/category.interface.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { AppError } from "../utils/AppError.js";

const CATEGORY_CODE_PATTERN = /^[A-Z][A-Z0-9]{2,9}$/;

function deriveCategoryCode(categoryName: string): string {
  const alphanumeric = categoryName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!alphanumeric) return "CAT";
  return alphanumeric.slice(0, 10);
}

function resolveCategoryCode(icon: string | null, categoryName: string): string {
  if (icon && CATEGORY_CODE_PATTERN.test(icon)) {
    return icon;
  }
  return deriveCategoryCode(categoryName);
}

function mapCategory(row: {
  id: string;
  category_name: string;
  description: string | null;
  icon: string | null;
  status?: string;
  created_at: Date;
  updated_at: Date;
  asset_count?: number;
}): Category {
  return {
    id: row.id,
    categoryCode: resolveCategoryCode(row.icon, row.category_name),
    name: row.category_name,
    description: row.description,
    status: row.status === "inactive" ? "inactive" : "active",
    assetCount: Number(row.asset_count ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function assertUniqueCategoryCode(
  categoryCode: string,
  excludeId?: string,
): Promise<void> {
  const existing = await categoryRepository.findByCategoryCode(categoryCode, excludeId);
  if (existing) {
    throw new AppError(409, "A category with this category code already exists");
  }
}

async function assertUniqueName(name: string, excludeId?: string): Promise<void> {
  const existing = await categoryRepository.findByName(name, excludeId);
  if (existing) {
    throw new AppError(409, "A category with this name already exists");
  }
}

export const categoryService = {
  async listCategories(): Promise<Category[]> {
    const rows = await categoryRepository.findAll();
    return rows.map(mapCategory);
  },

  async getCategoryById(id: string): Promise<Category> {
    const row = await categoryRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Category not found");
    }
    return mapCategory(row);
  },

  async searchCategories(term: string): Promise<Category[]> {
    const trimmed = term.trim();
    if (!trimmed) {
      return this.listCategories();
    }
    const rows = await categoryRepository.search(trimmed);
    return rows.map(mapCategory);
  },

  async getStats(): Promise<CategoryStats> {
    const stats = await categoryRepository.getStats();
    return {
      totalCategories: Number(stats.total_categories),
      emptyCategories: Number(stats.empty_categories),
      categoriesWithAssets: Number(stats.categories_with_assets),
    };
  },

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const categoryCode = input.categoryCode.trim().toUpperCase();
    const name = input.name.trim();
    const description = input.description?.trim() || null;
    const status = input.status === "inactive" ? "inactive" : "active";

    await assertUniqueCategoryCode(categoryCode);
    await assertUniqueName(name);

    const row = await categoryRepository.create(categoryCode, name, description, status);
    return mapCategory(row);
  },

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Category not found");
    }

    const categoryCode = (input.categoryCode ?? resolveCategoryCode(existing.icon, existing.category_name))
      .trim()
      .toUpperCase();
    const name = (input.name ?? existing.category_name).trim();
    const description =
      input.description !== undefined
        ? input.description?.trim() || null
        : existing.description;
    const status =
      input.status === "inactive" || input.status === "active"
        ? input.status
        : existing.status === "inactive"
          ? "inactive"
          : "active";

    await assertUniqueCategoryCode(categoryCode, id);
    await assertUniqueName(name, id);

    const row = await categoryRepository.update(id, categoryCode, name, description, status);
    if (!row) {
      throw new AppError(404, "Category not found");
    }

    const withCount = await categoryRepository.findById(id);
    return mapCategory(withCount ?? { ...row, asset_count: existing.asset_count });
  },

  async deleteCategory(id: string): Promise<void> {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "Category not found");
    }

    const assetCount = await categoryRepository.countLinkedAssets(id);
    if (assetCount > 0) {
      throw new AppError(409, "Cannot delete category because assets are assigned.");
    }

    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw new AppError(404, "Category not found");
    }
  },
};
