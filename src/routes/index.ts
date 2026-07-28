import { Router } from "express";
import assetRoutes from "./asset.routes.js";
import assignmentRoutes from "./assignment.routes.js";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import employeeRoutes from "./employee.routes.js";
import reportRoutes from "./report.routes.js";
import vendorRoutes from "./vendor.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/categories", categoryRoutes);
router.use("/vendors", vendorRoutes);
router.use("/employees", employeeRoutes);
router.use("/assets", assetRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/reports", reportRoutes);

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "API is running", data: { status: "ok" } });
});

export default router;
