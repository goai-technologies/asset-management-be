import type { Request, Response } from "express";
import type {
  CreateAssignmentInput,
  ReturnAssignmentInput,
  UnassignAssignmentInput,
} from "../interfaces/assignment.interface.js";
import { assignmentService } from "../services/assignment.service.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function getPerformedBy(req: Request): string {
  return req.user?.email ?? "System";
}

export const assignmentController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await assignmentService.listAssignments();
    sendSuccess(res, data, "Assignments retrieved");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await assignmentService.getAssignmentById(String(req.params.id));
    sendSuccess(res, data, "Assignment retrieved");
  }),

  listActive: asyncHandler(async (_req: Request, res: Response) => {
    const data = await assignmentService.listActiveAssignments();
    sendSuccess(res, data, "Active assignments retrieved");
  }),

  listByEmployee: asyncHandler(async (req: Request, res: Response) => {
    const data = await assignmentService.listByEmployee(String(req.params.employeeId));
    sendSuccess(res, data, "Employee assignments retrieved");
  }),

  listByAsset: asyncHandler(async (req: Request, res: Response) => {
    const data = await assignmentService.listByAsset(String(req.params.assetId));
    sendSuccess(res, data, "Asset assignment history retrieved");
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    const data = await assignmentService.searchAssignments(term);
    sendSuccess(res, data, "Assignment search completed");
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await assignmentService.getStats();
    sendSuccess(res, data, "Assignment stats retrieved");
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateAssignmentInput;
    const data = await assignmentService.assignAsset(body, getPerformedBy(req));
    sendSuccess(res, data, "Asset assigned", 201);
  }),

  returnAsset: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ReturnAssignmentInput;
    const data = await assignmentService.returnAsset(String(req.params.id), body, getPerformedBy(req));
    sendSuccess(res, data, "Asset returned");
  }),

  unassign: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UnassignAssignmentInput;
    const data = await assignmentService.unassignAsset(String(req.params.id), body, getPerformedBy(req));
    sendSuccess(res, data, "Asset unassigned");
  }),
};
