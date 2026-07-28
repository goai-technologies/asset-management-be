import { body, param, query } from "express-validator";

const categoryIdRules = body("categoryId").isUUID().withMessage("Valid category is required");
const brandRules = body("brand").trim().notEmpty().withMessage("Brand is required");
const serialNumberRules = body("serialNumber")
  .trim()
  .notEmpty()
  .withMessage("Serial number is required");
const invoiceNumberRules = body("invoiceNumber")
  .trim()
  .notEmpty()
  .withMessage("Invoice number is required");
const purchaseDateRules = body("purchaseDate")
  .trim()
  .notEmpty()
  .withMessage("Purchase date is required")
  .isISO8601()
  .withMessage("Purchase date must be a valid date");
const warrantyExpiryRules = body("warrantyExpiry")
  .trim()
  .notEmpty()
  .withMessage("Warranty expiry is required")
  .isISO8601()
  .withMessage("Warranty expiry must be a valid date");
const vendorIdRules = body("vendorId").isUUID().withMessage("Valid vendor is required");
const purchaseCostRules = body("purchaseCost")
  .notEmpty()
  .withMessage("Purchase cost is required")
  .isFloat({ gt: 0 })
  .withMessage("Purchase cost must be a positive number");

export const assetIdValidator = [param("id").isUUID().withMessage("Valid asset id is required")];

export const createAssetValidator = [
  categoryIdRules,
  brandRules,
  serialNumberRules,
  invoiceNumberRules,
  purchaseDateRules,
  warrantyExpiryRules,
  vendorIdRules,
  purchaseCostRules,
  body("description").optional({ values: "null" }).trim().isLength({ max: 500 }),
  body("specifications").optional({ values: "null" }).trim().isLength({ max: 500 }),
  body("notes").optional({ values: "null" }).trim().isLength({ max: 1000 }),
];

export const updateAssetValidator = [
  ...assetIdValidator,
  body("categoryId").optional().isUUID().withMessage("Valid category is required"),
  body("brand").optional().trim().notEmpty().withMessage("Brand cannot be empty"),
  body("serialNumber").optional().trim().notEmpty().withMessage("Serial number cannot be empty"),
  body("invoiceNumber").optional().trim().notEmpty().withMessage("Invoice number cannot be empty"),
  body("purchaseDate")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Purchase date cannot be empty")
    .isISO8601()
    .withMessage("Purchase date must be a valid date"),
  body("warrantyExpiry")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Warranty expiry cannot be empty")
    .isISO8601()
    .withMessage("Warranty expiry must be a valid date"),
  body("vendorId").optional().isUUID().withMessage("Valid vendor is required"),
  body("purchaseCost")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Purchase cost must be a positive number"),
  body("description").optional({ values: "null" }).trim().isLength({ max: 500 }),
  body("specifications").optional({ values: "null" }).trim().isLength({ max: 500 }),
  body("notes").optional({ values: "null" }).trim().isLength({ max: 1000 }),
];

export const disposeAssetValidator = [
  ...assetIdValidator,
  body("reason").optional().trim().isLength({ max: 500 }),
  body("disposalDate").optional().trim().isISO8601().withMessage("Disposal date must be valid"),
  body("notes").optional({ values: "null" }).trim().isLength({ max: 1000 }),
];

export const assetActionValidator = [
  ...assetIdValidator,
  body("notes").optional({ values: "null" }).trim().isLength({ max: 1000 }),
];

export const searchAssetValidator = [
  query("q").optional().trim().isLength({ min: 1 }).withMessage("Search query cannot be empty"),
];

function parseNumericField(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeAssetBody(
  req: { body: Record<string, unknown> },
  _res: unknown,
  next: () => void,
): void {
  if (req.body.purchaseCost !== undefined) {
    const parsed = parseNumericField(req.body.purchaseCost);
    if (parsed !== undefined) req.body.purchaseCost = parsed;
  }
  next();
}
