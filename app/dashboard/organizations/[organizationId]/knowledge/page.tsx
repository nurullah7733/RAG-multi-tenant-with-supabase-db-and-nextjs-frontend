import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { organizationApi } from "@/lib/api/organizations";

export default async function KnowledgeEntry({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const api = await organizationApi();
  let organization;
  try {
    organization = await api.get(organizationId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (error instanceof ApiError && [404, 422].includes(error.status)) notFound();
    throw error;
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/dashboard" className="text-sm underline">All organizations</Link>
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{organization.name}</p>
        <h1 className="text-2xl font-semibold">Knowledge Base</h1>
      </header>
      <section className="space-y-3 rounded-xl border p-6">
        <h2 className="text-lg font-medium">Your workspace is ready</h2>
        <p>Next, add your business knowledge through documents such as a company profile, FAQ, price list, or policies.</p>
        <p className="text-sm text-muted-foreground">Document uploads are not available yet. PDF, DOCX, and TXT uploads will be added in the next phase.</p>
      </section>
    </main>
  );
}
