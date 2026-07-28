import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import pg from "pg";
import { AppError } from "../utils/AppError.js";
import { sendError } from "../utils/apiResponse.js";

function isUploadValidationError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false;
  if (err instanceof multer.MulterError) return true;
  return (
    err.message.includes("images are allowed") ||
    err.message.includes("File too large") ||
    err.message.includes("Too many files")
  );
}

function mapDatabaseError(err: pg.DatabaseError): AppError | null {
  if (err.code !== "23505") return null;

  const target = `${err.constraint ?? ""} ${err.detail ?? ""}`.toLowerCase();
  if (target.includes("asset_code")) {
    return new AppError(409, "An asset with this AI Asset ID already exists. Please try again.");
  }
  if (target.includes("serial_number")) {
    return new AppError(409, "An asset with this serial number already exists");
  }
  if (target.includes("invoice_number")) {
    return new AppError(409, "An asset with this invoice number already exists");
  }
  return new AppError(409, "Duplicate value already exists");
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  if (isUploadValidationError(err)) {
    sendError(res, err.message, 400);
    return;
  }

  if (err instanceof pg.DatabaseError) {
    const mapped = mapDatabaseError(err);
    if (mapped) {
      sendError(res, mapped.message, mapped.statusCode);
      return;
    }
  }

  console.error("[Error]", err);
  sendError(res, "Internal server error", 500);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, "Route not found", 404);
}
