"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { organizationApi } from "@/lib/api/organizations";

export type OnboardingState = { error?: string; values?: Record<string, string> };

export async function onboard(_previous: OnboardingState, form: FormData): Promise<OnboardingState> {
  const api = await organizationApi(true);
  const values: Record<string, string> = {};
  for (const field of ["name", "organization_type", "country_code", "timezone", "default_language", "currency_code"]) {
    const value = form.get(field);
    if (typeof value !== "string" || !value.trim() || value.length > 100) {
      return { error: "Complete all six fields using the formats shown." };
    }
    values[field] = value.trim();
  }
  let id: string;
  try {
    const organization = await api.create(values);
    id = organization.id;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (error instanceof ApiError && error.status === 422)
      return { values, error: "Check your country code (2 letters), currency code (3 letters), IANA timezone, and language tag (for example en or bn-BD)." };
    return { values, error: "We could not confirm creation. Check your dashboard before retrying, as your organization may already have been created." };
  }
  redirect(`/dashboard/organizations/${encodeURIComponent(id)}/knowledge`);
}
