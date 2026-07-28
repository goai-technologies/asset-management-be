import { Router } from "express";
import { assignmentController } from "../controllers/assignment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  assetIdParamValidator,
  assignmentIdValidator,
  createAssignmentValidator,
  employeeIdParamValidator,
  returnAssignmentValidator,
  searchAssignmentValidator,
  unassignAssignmentValidator,
} from "../validators/assignment.validator.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchAssignmentValidator, validateRequest, assignmentController.search);
router.get("/stats", assignmentController.stats);
router.get("/active", assignmentController.listActive);
router.get(
  "/employee/:employeeId",
  employeeIdParamValidator,
  validateRequest,
  assignmentController.listByEmployee,
);
router.get(
  "/asset/:assetId",
  assetIdParamValidator,
  validateRequest,
  assignmentController.listByAsset,
);
router.get("/", assignmentController.list);
router.get("/:id", assignmentIdValidator, validateRequest, assignmentController.getById);
router.post("/", createAssignmentValidator, validateRequest, assignmentController.create);
router.post(
  "/:id/return",
  returnAssignmentValidator,
  validateRequest,
  assignmentController.returnAsset,
);
router.post(
  "/:id/unassign",
  unassignAssignmentValidator,
  validateRequest,
  assignmentController.unassign,
);

export default router;
