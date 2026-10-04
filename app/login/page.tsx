import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (!error && data.user) redirect("/dashboard");
  const params = await searchParams;
  return <AuthForm mode="login" callbackError={params.error === "callback"} />;
}
