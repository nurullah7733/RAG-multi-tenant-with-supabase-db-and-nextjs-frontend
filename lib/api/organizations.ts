import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiClient } from "@/lib/api/client";

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
  const supabase = await createClient(writable);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session.session) redirect("/login");
  // Session token is transport only. FastAPI independently verifies identity.
  const options = {
    headers: { Authorization: `Bearer ${session.session.access_token}` },
    cache: "no-store" as const,
    redirect: "error" as const,
  };
  return {
    list: (offset = 0) => apiClient.get<OrganizationAccess[]>(`/api/v1/organizations?limit=50&offset=${offset}`, options),
    get: (id: string) => apiClient.get<Organization>(`/api/v1/organizations/${encodeURIComponent(id)}`, options),
    create: (payload: Record<string, string>) => apiClient.post<Organization>("/api/v1/organizations", payload, options),
  };
}
