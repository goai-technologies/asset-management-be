import type { Request, Response } from "express";
import type { CreateCategoryInput, UpdateCategoryInput } from "../interfaces/category.interface.js";
import { categoryService } from "../services/category.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const categoryController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await categoryService.listCategories();
    sendSuccess(res, data, "Categories retrieved");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await categoryService.getCategoryById(String(req.params.id));
    sendSuccess(res, data, "Category retrieved");
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    const data = await categoryService.searchCategories(term);
    sendSuccess(res, data, "Categories search completed");
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await categoryService.getStats();
    sendSuccess(res, data, "Category stats retrieved");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateCategoryInput;
    const data = await categoryService.createCategory(body);
    sendSuccess(res, data, "Category created", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateCategoryInput;
    const data = await categoryService.updateCategory(String(req.params.id), body);
    sendSuccess(res, data, "Category updated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await categoryService.deleteCategory(String(req.params.id));
    sendSuccess(res, null, "Category deleted");
  }),
};
