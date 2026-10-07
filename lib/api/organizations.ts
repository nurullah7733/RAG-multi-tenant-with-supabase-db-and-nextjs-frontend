import "server-only";
import { apiClient } from "@/lib/api/client";
import { sessionRequestOptions } from "@/lib/api/session";

export type Organization = {
  id: string;
  name: string;
  organization_type: string | null;
  country_code: string | null;
  timezone: string | null;
  default_language: string;
  currency_code: string | null;
};
export type OrganizationAccess = { organization: Organization; role: "owner" | "admin" | "staff" };

export async function organizationApi(writable = false) {
  // Session token is transport only. FastAPI independently verifies identity.
  const options = await sessionRequestOptions(writable);
  return {
    list: (offset = 0) => apiClient.get<OrganizationAccess[]>(`/api/v1/organizations?limit=50&offset=${offset}`, options),
    get: (id: string) => apiClient.get<Organization>(`/api/v1/organizations/${encodeURIComponent(id)}`, options),
    create: (payload: Record<string, string>) => apiClient.post<Organization>("/api/v1/organizations", payload, options),
  };
}
