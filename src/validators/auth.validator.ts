import { body } from "express-validator";

export const loginValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const registerValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("name").optional().trim().isLength({ max: 120 }).withMessage("Name is too long"),
];

export const changePasswordValidator = [
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const forgotPasswordValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
];

export const resetPasswordValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("token").trim().notEmpty().withMessage("Verification code is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const updateUserRoleValidator = [
  body("role")
    .trim()
    .isIn(["administrator", "it_team", "employee"])
    .withMessage("Role must be administrator, it_team, or employee"),
];
