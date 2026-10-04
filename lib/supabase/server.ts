import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthConfig } from "@/lib/auth/config";

// Read-only rendering relies on proxy.ts to persist refreshed cookies.
// Actions and route handlers explicitly request a writable cookie adapter.
export async function createClient(writable = false) {
  const store = await cookies();
  const { url, key, appUrl } = getAuthConfig();

  return createServerClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      secure: appUrl.startsWith("https:"),
      httpOnly: true,
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        if (writable)
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
      },
    },
  });
}
