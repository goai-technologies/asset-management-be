import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/summary", dashboardController.getSummary);
router.get("/assets-by-category", dashboardController.getAssetsByCategory);
router.get("/assets-by-status", dashboardController.getAssetsByStatus);
router.get("/recent-activities", dashboardController.getRecentActivities);
router.get("/warranty-expiring", dashboardController.getWarrantyExpiring);

export default router;
