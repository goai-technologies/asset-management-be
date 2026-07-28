import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type {
  AssetReportFilters,
  AssetReportRow,
  AssignmentReportRow,
  EmployeeReportRow,
  VendorReportRow,
  WarrantyExpiringRow,
} from "../interfaces/report.interface.js";
import { reportRepository } from "../repositories/report.repository.js";
import { AppError } from "../utils/AppError.js";

function formatAssetStatus(status: string): string {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "repair":
      return "Under Repair";
    case "retired":
      return "Inactive";
    case "disposed":
      return "Disposed";
    default:
      return "Available";
  }
}

function formatAssignmentStatus(status: string): string {
  switch (status) {
    case "active":
    case "assigned":
      return "Active";
    case "returned":
      return "Returned";
    case "unassigned":
      return "Unassigned";
    default:
      return status;
  }
}

function mapAssetRow(row: Awaited<ReturnType<typeof reportRepository.getAssetReport>>[number]): AssetReportRow {
  return {
    assetId: row.asset_code,
    category: row.category_name,
    brand: row.brand,
    serialNumber: row.serial_number,
    vendor: row.vendor_name,
    purchaseCost:
      row.purchase_cost_inr != null
        ? Number(row.purchase_cost_inr)
        : row.purchase_cost != null
          ? Number(row.purchase_cost)
          : null,
    purchaseDate: reportRepository.toDateOnly(row.purchase_date),
    warrantyExpiry: reportRepository.toDateOnly(row.warranty_expiry),
    status: formatAssetStatus(row.status),
    assignedEmployee: row.employee_name,
  };
}

async function buildPdfBuffer(
  title: string,
  headers: string[],
  rows: string[][],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "center" });
    doc.moveDown();

    const columnWidth = (doc.page.width - 80) / headers.length;
    let y = doc.y;

    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((header, index) => {
      doc.text(header, 40 + index * columnWidth, y, { width: columnWidth, continued: false });
    });
    y += 16;
    doc.font("Helvetica");

    for (const row of rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      row.forEach((cell, index) => {
        doc.text(cell ?? "", 40 + index * columnWidth, y, { width: columnWidth, continued: false });
      });
      y += 14;
    }

    doc.end();
  });
}

async function buildExcelBuffer(
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const reportService = {
  async getAssetReport(filters: AssetReportFilters = {}): Promise<AssetReportRow[]> {
    const rows = await reportRepository.getAssetReport(filters);
    return rows.map(mapAssetRow);
  },

  async getEmployeeReport(): Promise<EmployeeReportRow[]> {
    const rows = await reportRepository.getEmployeeReport();
    return rows.map((row) => ({
      employeeId: row.employee_code,
      name: row.name,
      department: row.department,
      designation: row.designation,
      assignedAssetCount: Number(row.assigned_asset_count),
    }));
  },

  async getVendorReport(): Promise<VendorReportRow[]> {
    const rows = await reportRepository.getVendorReport();
    return rows.map((row) => ({
      vendorCode: row.vendor_code,
      vendorName: row.vendor_name,
      contactPerson: row.contact_person,
      assetCount: Number(row.asset_count),
    }));
  },

  async getAssignmentReport(): Promise<AssignmentReportRow[]> {
    const rows = await reportRepository.getAssignmentReport();
    return rows.map((row) => ({
      id: row.id,
      assetId: row.asset_code,
      assetCode: row.asset_code,
      category: row.category_name,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
      assignedDate: reportRepository.toDateOnly(row.assigned_date) ?? "",
      expectedReturnDate: reportRepository.toDateOnly(row.expected_return_date),
      returnedDate: reportRepository.toDateOnly(row.returned_date),
      assignedBy: row.performed_by,
      returnedBy: row.returned_by,
      status: formatAssignmentStatus(row.status),
      remarks: row.notes,
    }));
  },

  async getWarrantyExpiringReport(days: number): Promise<WarrantyExpiringRow[]> {
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      throw new AppError(400, "Days must be between 1 and 365");
    }
    const rows = await reportRepository.getWarrantyExpiringReport(days);
    return rows.map((row) => ({
      assetId: row.asset_code,
      category: row.category_name,
      brand: row.brand,
      serialNumber: row.serial_number,
      vendor: row.vendor_name,
      warrantyExpiry: reportRepository.toDateOnly(row.warranty_expiry) ?? "",
      daysUntilExpiry: Number(row.days_until_expiry),
      status: formatAssetStatus(row.status),
      assignedEmployee: row.employee_name,
    }));
  },

  async exportAssetsExcel(filters: AssetReportFilters = {}): Promise<Buffer> {
    const data = await this.getAssetReport(filters);
    return buildExcelBuffer(
      "Assets",
      [
        "Asset ID",
        "Category",
        "Brand",
        "Serial Number",
        "Vendor",
        "Purchase Cost",
        "Purchase Date",
        "Warranty Expiry",
        "Status",
        "Assigned Employee",
      ],
      data.map((row) => [
        row.assetId,
        row.category,
        row.brand,
        row.serialNumber,
        row.vendor,
        row.purchaseCost,
        row.purchaseDate,
        row.warrantyExpiry,
        row.status,
        row.assignedEmployee,
      ]),
    );
  },

  async exportAssetsPdf(filters: AssetReportFilters = {}): Promise<Buffer> {
    const data = await this.getAssetReport(filters);
    return buildPdfBuffer(
      "Asset Report",
      ["Asset ID", "Category", "Brand", "Vendor", "Status", "Employee"],
      data.map((row) => [
        row.assetId,
        row.category ?? "",
        row.brand ?? "",
        row.vendor ?? "",
        row.status,
        row.assignedEmployee ?? "",
      ]),
    );
  },

  async exportAssignmentsExcel(): Promise<Buffer> {
    const data = await this.getAssignmentReport();
    return buildExcelBuffer(
      "Assignments",
      [
        "Assignment ID",
        "Asset Code",
        "Category",
        "Employee",
        "Employee ID",
        "Assigned Date",
        "Expected Return",
        "Returned Date",
        "Status",
        "Remarks",
      ],
      data.map((row) => [
        row.id,
        row.assetCode,
        row.category,
        row.employeeName,
        row.employeeCode,
        row.assignedDate,
        row.expectedReturnDate,
        row.returnedDate,
        row.status,
        row.remarks,
      ]),
    );
  },

  async exportAssignmentsPdf(): Promise<Buffer> {
    const data = await this.getAssignmentReport();
    return buildPdfBuffer(
      "Assignment Report",
      ["Asset Code", "Employee", "Assigned", "Returned", "Status"],
      data.map((row) => [
        row.assetCode,
        row.employeeName ?? "",
        row.assignedDate,
        row.returnedDate ?? "",
        row.status,
      ]),
    );
  },
};
