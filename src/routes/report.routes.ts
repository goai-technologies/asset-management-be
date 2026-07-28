import { Router } from "express";
import { reportController } from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/assets/export/excel", reportController.exportAssetsExcel);
router.get("/assets/export/pdf", reportController.exportAssetsPdf);
router.get("/assignments/export/excel", reportController.exportAssignmentsExcel);
router.get("/assignments/export/pdf", reportController.exportAssignmentsPdf);
router.get("/assets", reportController.getAssets);
router.get("/employees", reportController.getEmployees);
router.get("/vendors", reportController.getVendors);
router.get("/assignments", reportController.getAssignments);
router.get("/warranty-expiring", reportController.getWarrantyExpiring);

export default router;
