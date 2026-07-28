import { Router, type NextFunction, type Request, type Response } from "express";
import { assetController } from "../controllers/asset.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { assetImageUpload } from "../middleware/upload.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  assetActionValidator,
  assetIdValidator,
  createAssetValidator,
  disposeAssetValidator,
  normalizeAssetBody,
  searchAssetValidator,
  updateAssetValidator,
} from "../validators/asset.validator.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchAssetValidator, validateRequest, assetController.search);
router.get("/stats", assetController.stats);
router.get("/archived", assetController.listArchived);
router.get("/", assetController.list);
router.get("/:id", assetIdValidator, validateRequest, assetController.getById);

router.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    assetImageUpload.array("images", 10)(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  normalizeAssetBody,
  createAssetValidator,
  validateRequest,
  assetController.create,
);

router.put(
  "/:id",
  (req: Request, res: Response, next: NextFunction) => {
    assetImageUpload.array("images", 10)(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  normalizeAssetBody,
  updateAssetValidator,
  validateRequest,
  assetController.update,
);

router.delete("/:id", assetIdValidator, validateRequest, assetController.remove);
router.post("/:id/restore", assetIdValidator, validateRequest, assetController.restore);
router.post(
  "/:id/deactivate",
  assetActionValidator,
  validateRequest,
  assetController.deactivate,
);
router.post("/:id/dispose", disposeAssetValidator, validateRequest, assetController.dispose);
router.post("/:id/repair", assetActionValidator, validateRequest, assetController.repair);
router.post("/:id/available", assetIdValidator, validateRequest, assetController.available);

export default router;
