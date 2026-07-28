import { Router } from "express";
import { employeeController } from "../controllers/employee.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  createEmployeeValidator,
  employeeIdValidator,
  searchEmployeeValidator,
  updateEmployeeValidator,
} from "../validators/employee.validator.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchEmployeeValidator, validateRequest, employeeController.search);
router.get("/stats", employeeController.stats);
router.get("/", employeeController.list);
router.get("/:id", employeeIdValidator, validateRequest, employeeController.getById);
router.post("/", createEmployeeValidator, validateRequest, employeeController.create);
router.post("/:id/deactivate", employeeIdValidator, validateRequest, employeeController.deactivate);
router.put("/:id", updateEmployeeValidator, validateRequest, employeeController.update);
router.delete("/:id", employeeIdValidator, validateRequest, employeeController.remove);

export default router;
