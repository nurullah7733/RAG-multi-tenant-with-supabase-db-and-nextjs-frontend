import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verified session + request options for FastAPI calls from the server.
 * The session token is transport only; FastAPI independently verifies
 * identity and organization membership on every request.
 */
export async function sessionRequestOptions(writable = false) {
  const supabase = await createClient(writable);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: session, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !session.session) redirect("/login");

  return {
    headers: { Authorization: `Bearer ${session.session.access_token}` },
    cache: "no-store" as const,
    redirect: "error" as const,
  };
}
