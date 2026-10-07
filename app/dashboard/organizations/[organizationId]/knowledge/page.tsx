import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { documentsApi } from "@/lib/api/documents";
import { organizationApi } from "@/lib/api/organizations";
import { DocumentManager } from "@/components/knowledge/document-manager";

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
  const documents = await documentsApi(organizationId).then((client) => client.list());
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/dashboard" className="text-sm underline">All organizations</Link>
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{organization.name}</p>
        <h1 className="text-2xl font-semibold">Knowledge Base</h1>
        <p className="text-muted-foreground">Add your business knowledge through documents such as a company profile, FAQ, price list, or policies.</p>
      </header>
      <DocumentManager organizationId={organizationId} documents={documents} />
    </main>
  );
}
