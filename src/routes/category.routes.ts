import { Router } from "express";
import { categoryController } from "../controllers/category.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  categoryIdValidator,
  createCategoryValidator,
  searchCategoryValidator,
  updateCategoryValidator,
} from "../validators/category.validator.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchCategoryValidator, validateRequest, categoryController.search);
router.get("/stats", categoryController.stats);
router.get("/", categoryController.list);
router.get("/:id", categoryIdValidator, validateRequest, categoryController.getById);
router.post("/", createCategoryValidator, validateRequest, categoryController.create);
router.put(
  "/:id",
  updateCategoryValidator,
  validateRequest,
  categoryController.update,
);
router.delete("/:id", categoryIdValidator, validateRequest, categoryController.remove);

export default router;
