import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { mapZohoFieldsToEmployee } from "./map-employee.js";
import type { ZohoEmployeeRecord } from "./types.js";

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;

function assertZohoConfigured(): void {
  if (!env.zoho.isConfigured) {
    throw new AppError(
      503,
      "Zoho People sync is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN.",
    );
  }
}

async function refreshAccessToken(): Promise<string> {
  assertZohoConfigured();

  if (tokenCache && tokenCache.expiresAtMs > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.zoho.clientId,
    client_secret: env.zoho.clientSecret,
    refresh_token: env.zoho.refreshToken,
  });

  const response = await fetch(`${env.zoho.accountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    const detail = payload.error_description || payload.error || response.statusText;
    throw new AppError(502, `Failed to refresh Zoho access token: ${detail}`);
  }

  const expiresInSec = Number(payload.expires_in ?? 3600);
  tokenCache = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  };
  return tokenCache.accessToken;
}

type ZohoGetRecordsResponse = {
  response?: {
    result?: Array<Record<string, Array<Record<string, unknown>>>>;
    errors?: { code?: number; message?: string } | string;
    message?: string;
    status?: number | string;
  };
  error?: string;
  message?: string;
};

function extractRecordsFromPage(payload: ZohoGetRecordsResponse): ZohoEmployeeRecord[] {
  const result = payload.response?.result;
  if (!Array.isArray(result)) {
    return [];
  }

  const employees: ZohoEmployeeRecord[] = [];
  for (const entry of result) {
    if (!entry || typeof entry !== "object") continue;
    for (const [recordId, fieldSets] of Object.entries(entry)) {
      if (!Array.isArray(fieldSets) || fieldSets.length === 0) continue;
      const mapped = mapZohoFieldsToEmployee(recordId, fieldSets[0] ?? {});
      if (mapped) employees.push(mapped);
    }
  }
  return employees;
}

export const zohoPeopleClient = {
  isConfigured(): boolean {
    return env.zoho.isConfigured;
  },

  async fetchAllEmployees(): Promise<ZohoEmployeeRecord[]> {
    assertZohoConfigured();

    const pageSize = 200;
    let sIndex = 1;
    const all: ZohoEmployeeRecord[] = [];

    for (;;) {
      const accessToken = await refreshAccessToken();
      const url = new URL(
        `${env.zoho.peopleBaseUrl}/people/api/forms/${encodeURIComponent(env.zoho.employeeForm)}/getRecords`,
      );
      url.searchParams.set("sIndex", String(sIndex));
      url.searchParams.set("limit", String(pageSize));

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      const payload = (await response.json()) as ZohoGetRecordsResponse;

      if (!response.ok) {
        const detail =
          payload.response?.message ||
          payload.message ||
          payload.error ||
          response.statusText;
        throw new AppError(502, `Zoho People API error: ${detail}`);
      }

      const errors = payload.response?.errors;
      if (errors) {
        const errorCode = typeof errors === "object" ? errors.code : undefined;
        const message =
          typeof errors === "string"
            ? errors
            : errors.message || `Zoho error code ${errorCode ?? "unknown"}`;
        // Zoho returns an error object when no records match; treat empty as success.
        if (String(message).toLowerCase().includes("no data") || errorCode === 7024) {
          break;
        }
        throw new AppError(502, `Zoho People API error: ${message}`);
      }

      const page = extractRecordsFromPage(payload);
      all.push(...page);

      if (page.length < pageSize) {
        break;
      }
      sIndex += pageSize;
    }

    return all;
  },
};
