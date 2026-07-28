import { body, param, query } from "express-validator";

const categoryCodeRules = body("categoryCode")
  .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase() : value))
  .trim()
  .notEmpty()
  .withMessage("Category code is required")
  .matches(/^[A-Z0-9]+$/)
  .withMessage("Category code must be uppercase alphanumeric")
  .isLength({ min: 3, max: 10 })
  .withMessage("Category code must be between 3 and 10 characters");

const nameRules = body("name")
  .trim()
  .notEmpty()
  .withMessage("Name is required")
  .isLength({ min: 2, max: 100 })
  .withMessage("Name must be between 2 and 100 characters");

const descriptionRules = body("description")
  .optional({ values: "null" })
  .trim()
  .isLength({ max: 500 })
  .withMessage("Description must be at most 500 characters");

const statusRules = body("status")
  .optional()
  .isIn(["active", "inactive"])
  .withMessage("Status must be active or inactive");

export const categoryIdValidator = [
  param("id").isUUID().withMessage("Valid category id is required"),
];

export const createCategoryValidator = [categoryCodeRules, nameRules, descriptionRules, statusRules];

export const updateCategoryValidator = [
  ...categoryIdValidator,
  body("categoryCode")
    .optional()
    .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase() : value))
    .trim()
    .notEmpty()
    .withMessage("Category code cannot be empty")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Category code must be uppercase alphanumeric")
    .isLength({ min: 3, max: 10 })
    .withMessage("Category code must be between 3 and 10 characters"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  descriptionRules,
  statusRules,
];

export const searchCategoryValidator = [
  query("q").optional().trim().isLength({ min: 1 }).withMessage("Search query cannot be empty"),
];
