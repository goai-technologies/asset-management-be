import { body, param, query } from "express-validator";

const employeeCodeRules = body("employeeCode")
  .optional()
  .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase() : value))
  .trim()
  .matches(/^EMP\d{3}$/)
  .withMessage("Employee code must match format EMP001");

const employeeIdRules = body("employeeId")
  .trim()
  .notEmpty()
  .withMessage("Employee ID is required");

const nameRules = body("name").trim().notEmpty().withMessage("Name is required");

const emailRules = body("email")
  .trim()
  .notEmpty()
  .withMessage("Email is required")
  .isEmail()
  .withMessage("Valid email is required");

const phoneRules = body("phone")
  .trim()
  .notEmpty()
  .withMessage("Phone is required")
  .custom((value) => {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      throw new Error("Phone must be between 10 and 15 digits");
    }
    return true;
  });

const departmentRules = body("department")
  .trim()
  .notEmpty()
  .withMessage("Department is required");

const designationRules = body("designation")
  .trim()
  .notEmpty()
  .withMessage("Designation is required");

const locationRules = body("location")
  .trim()
  .notEmpty()
  .withMessage("Location is required");

const statusRules = body("status")
  .optional()
  .trim()
  .isIn(["Active", "Inactive", "active", "inactive"])
  .withMessage("Status must be Active or Inactive");

export const employeeIdValidator = [
  param("id").isUUID().withMessage("Valid employee id is required"),
];

export const createEmployeeValidator = [
  employeeCodeRules,
  employeeIdRules,
  nameRules,
  emailRules,
  phoneRules,
  departmentRules,
  designationRules,
  locationRules,
  statusRules,
];

export const updateEmployeeValidator = [
  ...employeeIdValidator,
  body("employeeCode")
    .optional()
    .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase() : value))
    .trim()
    .matches(/^EMP\d{3}$/)
    .withMessage("Employee code must match format EMP001"),
  body("employeeId").optional().trim().notEmpty().withMessage("Employee ID cannot be empty"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Email cannot be empty")
    .isEmail()
    .withMessage("Valid email is required"),
  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Phone cannot be empty")
    .custom((value) => {
      const digits = String(value).replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        throw new Error("Phone must be between 10 and 15 digits");
      }
      return true;
    }),
  body("department").optional().trim().notEmpty().withMessage("Department cannot be empty"),
  body("designation").optional().trim().notEmpty().withMessage("Designation cannot be empty"),
  body("location").optional().trim().notEmpty().withMessage("Location cannot be empty"),
  statusRules,
];

export const searchEmployeeValidator = [
  query("q").optional().trim().isLength({ min: 1 }).withMessage("Search query cannot be empty"),
];
