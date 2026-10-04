import "server-only";

export function getAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const appUrl = process.env.APP_URL?.trim();
  if (!url || !key || !appUrl) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and APP_URL.",
    );
  }
  for (const value of [url, appUrl]) {
    const parsed = new URL(value);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    ) {
      throw new Error(
        "Auth URLs must be absolute HTTP(S) origins without paths or credentials.",
      );
    }
    if (
      process.env.NODE_ENV === "production" &&
      parsed.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(parsed.hostname)
    ) {
      throw new Error("Production auth URLs require HTTPS.");
    }
  }
  // Only a publishable key or the legacy anon JWT may be configured here.
  let publicKey = key.startsWith("sb_publishable_");
  if (!publicKey) {
    try {
      publicKey =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {
      /* Invalid keys fail closed below; never include their value in errors. */
    }
  }
  if (!publicKey)
    throw new Error(
      "Supabase requires a public publishable/anon key, never a secret or service-role key.",
    );
  return { url: new URL(url).origin, key, appUrl: new URL(appUrl).origin };
}
