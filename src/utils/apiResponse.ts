import type { Response } from "express";
import type { ApiErrorResponse, ApiSuccessResponse } from "../interfaces/api.interface.js";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
): void {
  const body: ApiSuccessResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: string[],
): void {
  const body: ApiErrorResponse = {
    success: false,
    message,
    ...(errors?.length ? { errors } : {}),
  };
  res.status(statusCode).json(body);
}
