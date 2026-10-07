"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_MB,
  describeUploadRejection,
  documentsApi,
} from "@/lib/api/documents";

export type UploadState = { error?: string };

export async function uploadDocument(
  organizationId: string,
  _previous: UploadState,
  form: FormData
): Promise<UploadState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF, DOCX or TXT file to upload." };
  }
  if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
    return { error: `Files must be ${MAX_DOCUMENT_SIZE_MB} MB or smaller.` };
  }
  if (!DOCUMENT_EXTENSIONS.test(file.name)) {
    return { error: "Only PDF, DOCX and TXT files are supported." };
  }

  const api = await documentsApi(organizationId, true);
  const data = new FormData();
  data.append("file", file, file.name);
  try {
    await api.upload(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    return { error: describeUploadRejection(error) };
  }
  revalidatePath(`/dashboard/organizations/${organizationId}/knowledge`);
  return {};
}

export async function deleteDocument(
  organizationId: string,
  documentId: string
): Promise<void> {
  const api = await documentsApi(organizationId, true);
  try {
    await api.remove(documentId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    return;
  }
  revalidatePath(`/dashboard/organizations/${organizationId}/knowledge`);
}

export async function reprocessDocument(
  organizationId: string,
  documentId: string
): Promise<void> {
  const api = await documentsApi(organizationId, true);
  try {
    await api.reprocess(documentId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    return;
  }
  revalidatePath(`/dashboard/organizations/${organizationId}/knowledge`);
}
