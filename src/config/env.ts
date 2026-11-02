import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const zohoClientId = process.env.ZOHO_CLIENT_ID?.trim() ?? "";
const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET?.trim() ?? "";
const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim() ?? "";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5001),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  isProduction: process.env.NODE_ENV === "production",
  /** Allows self role changes for local testing (NODE_ENV !== production or DEV_MODE=true). */
  allowDevSelfRoleChange:
    process.env.NODE_ENV !== "production" || process.env.DEV_MODE === "true",
  zoho: {
    accountsUrl: (process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com").replace(/\/$/, ""),
    peopleBaseUrl: (process.env.ZOHO_PEOPLE_BASE_URL ?? "https://people.zoho.com").replace(
      /\/$/,
      "",
    ),
    clientId: zohoClientId,
    clientSecret: zohoClientSecret,
    refreshToken: zohoRefreshToken,
    employeeForm: process.env.ZOHO_EMPLOYEE_FORM?.trim() || "employee",
    isConfigured: Boolean(zohoClientId && zohoClientSecret && zohoRefreshToken),
  },
} as const;
