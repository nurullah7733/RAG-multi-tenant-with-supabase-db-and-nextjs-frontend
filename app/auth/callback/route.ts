import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthConfig } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const { appUrl } = getAuthConfig();
  const code = request.nextUrl.searchParams.get("code");

  let success = false;
  if (code && !request.nextUrl.searchParams.has("error")) {
    try {
      const supabase = await createClient(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      success = !error;
    } catch {
      /* Never log authorization codes or raw provider errors. */
    }
  }
  // Fixed paths and configured origin prevent Host/next parameter redirects.
  const response = NextResponse.redirect(
    new URL(success ? "/dashboard" : "/login?error=callback", appUrl),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
