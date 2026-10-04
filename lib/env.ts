/**
 * Environment variable access for the Next.js application.
 *
 * Only NEXT_PUBLIC_* values are available here. Any other public value
 * would be inlined into the client bundle. Secrets (service-role keys,
 * AI provider keys) must never appear behind this module.
 *
 * Auth configuration is isolated in lib/auth/config.ts.
 */

function readPublicEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

function isHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const rawApiBaseUrl = readPublicEnv("NEXT_PUBLIC_API_BASE_URL");

if (rawApiBaseUrl !== undefined && !isHttpUrl(rawApiBaseUrl)) {
  throw new Error(
    `Invalid NEXT_PUBLIC_API_BASE_URL: "${rawApiBaseUrl}" is not an absolute http(s) URL.`
  );
}

export const API_BASE_URL: string =
  rawApiBaseUrl ?? "http://localhost:8000";

export type Env = {
  apiBaseUrl: string;
};

export const env: Env = {
  apiBaseUrl: API_BASE_URL,
};
