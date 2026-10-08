import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { organizationApi } from "@/lib/api/organizations";
import { documentsApi } from "@/lib/api/documents";
import AiPlaygroundClient from "./playground-client";

export default async function AiPlaygroundPage({ params }: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const api = await organizationApi();
  let organization;
  let documents;
  try {
    organization = await api.get(organizationId);
    documents = await documentsApi(organizationId).then((client) => client.list());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    if (error instanceof ApiError && [403, 404, 422].includes(error.status)) notFound();
    throw error;
  }
  return <AiPlaygroundClient key={organizationId} organizationId={organizationId}
    organizationName={organization.name} documents={documents} />;
}
