import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) redirect("/dashboard");
  return <AuthForm mode="signup" />;
}
