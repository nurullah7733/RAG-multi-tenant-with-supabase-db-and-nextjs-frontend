import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { ApiError } from "@/lib/api/client";
import { organizationApi } from "@/lib/api/organizations";

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ offset?: string }> }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const requested = Number((await searchParams)?.offset ?? 0);
  const offset = Number.isSafeInteger(requested) && requested >= 0 ? requested : 0;
  const api = await organizationApi();
  let organizations;
  try {
    organizations = await api.list(offset);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    throw error;
  }
  if (!organizations.length && offset === 0) redirect("/dashboard/onboarding");
  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <LogoutButton />
      </header>
      <p className="break-all text-muted-foreground">Signed in as {data.user.email ?? "an authenticated user"}.</p>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Your organizations</h2>
          <Link href="/dashboard/onboarding" className="text-sm underline">Create organization</Link>
        </div>
        {organizations.map(({ organization, role }) => (
          <Link key={organization.id} href={`/dashboard/organizations/${encodeURIComponent(organization.id)}/knowledge`} className="block space-y-2 rounded-xl border p-6 hover:bg-muted">
            <h3 className="font-medium">{organization.name}</h3>
            <p className="text-sm text-muted-foreground">{role} · Knowledge Base</p>
          </Link>
        ))}
        {!organizations.length && <p>No more organizations.</p>}
        <nav aria-label="Organization pages" className="flex gap-4 text-sm underline">
          {offset > 0 && <Link href={`/dashboard?offset=${Math.max(0, offset - 50)}`}>Previous</Link>}
          {organizations.length === 50 && <Link href={`/dashboard?offset=${offset + 50}`}>Next</Link>}
        </nav>
      </section>
    </main>
  );
}
