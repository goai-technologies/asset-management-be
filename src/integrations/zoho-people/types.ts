export interface ZohoEmployeeRecord {
  zohoRecordId: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  location: string;
  status: "active" | "inactive";
}

export interface ZohoSyncResult {
  created: number;
  updated: number;
  deactivated: number;
  total: number;
}
