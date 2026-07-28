import { body, param, query } from "express-validator";

export const assignmentIdValidator = [
  param("id").isUUID().withMessage("Valid assignment id is required"),
];

export const employeeIdParamValidator = [
  param("employeeId").isUUID().withMessage("Valid employee id is required"),
];

export const assetIdParamValidator = [
  param("assetId").isUUID().withMessage("Valid asset id is required"),
];

export const createAssignmentValidator = [
  body("assetId").isUUID().withMessage("Valid asset id is required"),
  body("employeeId").isUUID().withMessage("Valid employee id is required"),
  body("assignedDate")
    .trim()
    .notEmpty()
    .withMessage("Assigned date is required")
    .isISO8601()
    .withMessage("Assigned date must be valid"),
  body("expectedReturnDate")
    .optional({ values: "null" })
    .trim()
    .isISO8601()
    .withMessage("Expected return date must be valid"),
  body("remarks").optional({ values: "null" }).trim().isLength({ max: 1000 }),
];

export const returnAssignmentValidator = [
  ...assignmentIdValidator,
  body("returnedDate")
    .trim()
    .notEmpty()
    .withMessage("Returned date is required")
    .isISO8601()
    .withMessage("Returned date must be valid"),
  body("remarks").optional({ values: "null" }).trim().isLength({ max: 1000 }),
];

export const unassignAssignmentValidator = [
  ...assignmentIdValidator,
  body("remarks").optional({ values: "null" }).trim().isLength({ max: 1000 }),
  body("reason").optional({ values: "null" }).trim().isLength({ max: 500 }),
];

export const searchAssignmentValidator = [
  query("q").optional().trim().isLength({ min: 1 }).withMessage("Search query cannot be empty"),
];
