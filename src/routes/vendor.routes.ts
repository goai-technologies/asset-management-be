import { Router } from "express";
import { vendorController } from "../controllers/vendor.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  createVendorValidator,
  searchVendorValidator,
  updateVendorValidator,
  vendorIdValidator,
} from "../validators/vendor.validator.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchVendorValidator, validateRequest, vendorController.search);
router.get("/stats", vendorController.stats);
router.get("/", vendorController.list);
router.get("/:id", vendorIdValidator, validateRequest, vendorController.getById);
router.post("/", createVendorValidator, validateRequest, vendorController.create);
router.put("/:id", updateVendorValidator, validateRequest, vendorController.update);
router.delete("/:id", vendorIdValidator, validateRequest, vendorController.remove);

export default router;
