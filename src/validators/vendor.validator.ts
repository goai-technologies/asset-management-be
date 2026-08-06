import { body, param, query } from "express-validator";

const vendorCodeRules = body("vendorCode")
  .optional()
  .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase() : value))
  .trim()
  .matches(/^VEN\d{3}$/)
  .withMessage("Vendor code must match format VEN001");

const nameRules = body("name")
  .trim()
  .notEmpty()
  .withMessage("Name is required");

const contactPersonRules = body("contactPerson")
  .trim()
  .notEmpty()
  .withMessage("Contact person is required");

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

const addressRules = body("address")
  .trim()
  .notEmpty()
  .withMessage("Address is required");

const gstNumberRules = body("gstNumber")
  .trim()
  .notEmpty()
  .withMessage("GST number is required");

export const vendorIdValidator = [param("id").isUUID().withMessage("Valid vendor id is required")];

export const createVendorValidator = [
  vendorCodeRules,
  nameRules,
  contactPersonRules,
  emailRules,
  phoneRules,
  addressRules,
  gstNumberRules,
];

export const updateVendorValidator = [
  ...vendorIdValidator,
  body("vendorCode")
    .optional()
    .customSanitizer((value) => (typeof value === "string" ? value.toUpperCase() : value))
    .trim()
    .matches(/^VEN\d{3}$/)
    .withMessage("Vendor code must match format VEN001"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("contactPerson")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Contact person cannot be empty"),
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
  body("address").optional().trim().notEmpty().withMessage("Address cannot be empty"),
  body("gstNumber").optional().trim().notEmpty().withMessage("GST number cannot be empty"),
];

export const searchVendorValidator = [
  query("q").optional().trim().isLength({ min: 1 }).withMessage("Search query cannot be empty"),
];
