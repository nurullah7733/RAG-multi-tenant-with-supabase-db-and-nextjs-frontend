import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";

export async function proxy(request: NextRequest) {
  const { url, key, appUrl } = getAuthConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const supabase = createServerClient(url, key, {
    cookieOptions: { sameSite: "lax", secure: appUrl.startsWith("https:"), httpOnly: true },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        response.headers.set("Cache-Control", "private, no-store");
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser checks with Auth, including revoked sessions. Cookie contents alone
  // are never used as proof of identity. The dashboard also checks independently.
  const { data, error } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith("/dashboard") && (error || !data.user)) {
    const redirect = NextResponse.redirect(new URL("/login", appUrl));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/signup"] };
