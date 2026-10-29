import type { ZohoEmployeeRecord } from "./types.js";

type ZohoFieldMap = Record<string, unknown>;

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function pickField(fields: ZohoFieldMap, keys: string[]): string {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(fields)) {
    normalized.set(key.toLowerCase().replace(/[\s_-]+/g, ""), value);
  }
  for (const key of keys) {
    const value = normalized.get(key.toLowerCase().replace(/[\s_-]+/g, ""));
    const text = asString(value);
    if (text) return text;
  }
  return "";
}

function parseStatus(raw: string): "active" | "inactive" {
  const value = raw.trim().toLowerCase();
  if (!value) return "active";
  if (
    value.includes("inactive") ||
    value.includes("terminat") ||
    value.includes("resign") ||
    value.includes("disabled") ||
    value === "0" ||
    value === "false" ||
    value === "no"
  ) {
    return "inactive";
  }
  return "active";
}

export function mapZohoFieldsToEmployee(
  zohoRecordId: string,
  fields: ZohoFieldMap,
): ZohoEmployeeRecord | null {
  const firstName = pickField(fields, ["FirstName", "First Name", "firstname"]);
  const lastName = pickField(fields, ["LastName", "Last Name", "lastname"]);
  const fullName =
    pickField(fields, [
      "EmployeeName",
      "Employee Name",
      "Employee_Name",
      "Name",
      "displayname",
      "DisplayName",
    ]) || [firstName, lastName].filter(Boolean).join(" ").trim();

  const email = pickField(fields, [
    "EmailID",
    "Email ID",
    "Email",
    "Work_Email",
    "Work Email",
    "Official_Email",
  ]);

  const employeeId =
    pickField(fields, [
      "EmployeeID",
      "Employee ID",
      "Employee_ID",
      "EmpId",
      "Emp ID",
      "EmployeeCode",
      "Employee Code",
    ]) || zohoRecordId;

  if (!email && !fullName) {
    return null;
  }

  return {
    zohoRecordId,
    employeeId,
    name: fullName || email.split("@")[0] || employeeId,
    email: email || `${employeeId}@unknown.local`,
    phone: pickField(fields, [
      "Mobile",
      "MobileNumber",
      "Mobile Number",
      "Work_phone",
      "Work Phone",
      "Phone",
      "PhoneNumber",
    ]),
    department: pickField(fields, ["Department", "Department_Name", "Department Name"]),
    designation: pickField(fields, ["Designation", "Designation_Name", "JobTitle", "Job Title"]),
    location: pickField(fields, [
      "Location",
      "Work_location",
      "Work Location",
      "WorkLocation",
      "OfficeLocation",
    ]),
    status: parseStatus(
      pickField(fields, [
        "Employeestatus",
        "EmployeeStatus",
        "Employee Status",
        "Status",
        "EmploymentStatus",
      ]),
    ),
  };
}
