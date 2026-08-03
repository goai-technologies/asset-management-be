import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  changePasswordValidator,
  forgotPasswordValidator,
  loginValidator,
  registerValidator,
  resetPasswordValidator,
  updateUserRoleValidator,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/login", loginValidator, validateRequest, authController.login);
router.post("/register", registerValidator, validateRequest, authController.register);
router.post("/logout", authController.logout);
router.get("/profile", authenticate, authController.profile);
router.put(
  "/change-password",
  authenticate,
  changePasswordValidator,
  validateRequest,
  authController.changePassword,
);
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validateRequest,
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  resetPasswordValidator,
  validateRequest,
  authController.resetPassword,
);
router.get("/users", authenticate, authController.listUsers);
router.put(
  "/users/:userId/role",
  authenticate,
  updateUserRoleValidator,
  validateRequest,
  authController.updateUserRole,
);

export default router;
