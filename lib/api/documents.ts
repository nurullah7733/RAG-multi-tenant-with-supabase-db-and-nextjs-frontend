import "server-only";
import { ApiError, apiClient } from "@/lib/api/client";
import { sessionRequestOptions } from "@/lib/api/session";

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export type KnowledgeDocument = {
  id: string;
  organization_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  processing_error: string | null;
  chunk_count: number;
  created_at: string;
};

export const MAX_DOCUMENT_SIZE_MB = 20;
export const DOCUMENT_EXTENSIONS = /\.(pdf|docx|txt)$/i;

export async function documentsApi(organizationId: string, writable = false) {
  const options = await sessionRequestOptions(writable);
  const base = `/api/v1/organizations/${encodeURIComponent(organizationId)}/documents`;
  return {
    list: () => apiClient.get<KnowledgeDocument[]>(base, options),
    upload: (form: FormData) =>
      apiClient.postForm<KnowledgeDocument>(base, form, options),
    remove: (documentId: string) =>
      apiClient.delete(`${base}/${encodeURIComponent(documentId)}`, options),
    reprocess: (documentId: string) =>
      apiClient.post<KnowledgeDocument>(
        `${base}/${encodeURIComponent(documentId)}/reprocess`,
        null,
        options,
      ),
  };
}

export function describeUploadRejection(error: unknown): string {
  if (error instanceof ApiError && error.status === 413) {
    return "This upload exceeds the allowed size. Choose a smaller file.";
  }
  if (error instanceof ApiError && error.status === 404) {
    return "This organization is unavailable or you no longer have access.";
  }
  if (error instanceof ApiError && error.status === 422) {
    return "This file failed validation. Upload a real PDF, DOCX or TXT file.";
  }
  return "Upload failed. Please try again.";
}
