import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <LogoutButton />
      </header>
      <section className="space-y-3 rounded-xl border p-6">
        <h2 className="text-lg font-medium">Welcome</h2>
        <p className="break-all text-muted-foreground">Signed in as {data.user.email ?? "an authenticated user"}.</p>
        <p className="text-sm text-muted-foreground">Your account is ready.</p>
      </section>
    </main>
  );
}
