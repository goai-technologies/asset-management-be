import type { Request, Response } from "express";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "../interfaces/employee.interface.js";
import { employeeService } from "../services/employee.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const employeeController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await employeeService.listEmployees();
    sendSuccess(res, data, "Employees retrieved");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await employeeService.getEmployeeById(String(req.params.id));
    sendSuccess(res, data, "Employee retrieved");
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    const data = await employeeService.searchEmployees(term);
    sendSuccess(res, data, "Employee search completed");
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await employeeService.getStats();
    sendSuccess(res, data, "Employee stats retrieved");
  }),

  sync: asyncHandler(async (_req: Request, res: Response) => {
    const data = await employeeService.syncFromZoho();
    sendSuccess(res, data, "Employees synced from Zoho People");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateEmployeeInput;
    const data = await employeeService.createEmployee(body);
    sendSuccess(res, data, "Employee created", 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateEmployeeInput;
    const data = await employeeService.updateEmployee(String(req.params.id), body);
    sendSuccess(res, data, "Employee updated");
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    const data = await employeeService.deactivateEmployee(String(req.params.id));
    sendSuccess(res, data, "Employee deactivated");
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await employeeService.deleteEmployee(String(req.params.id));
    sendSuccess(res, null, "Employee deleted");
  }),
};
