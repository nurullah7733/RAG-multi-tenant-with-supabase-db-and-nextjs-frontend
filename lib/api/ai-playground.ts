import "server-only";
import { apiClient } from "./client";
import { sessionRequestOptions } from "./session";

type AiPlaygroundRequest = { query: string; organization_id: string; conversation_context?: string | null };
type SourceReference = { document_id: string; page_number?: number | null };
type AiPlaygroundResponse = {
  query: string; response: string; organization_id: string; language: string;
  sources: SourceReference[]; used_context: boolean; fallback: boolean;
};
type RetrievedChunk = {
  id: string; document_id: string; chunk_index: number; content: string;
  page_number?: number | null; similarity: number;
};
type RetrievalResult = {
  query: string; organization_id: string; chunks: RetrievedChunk[];
  embedding_provider: string; embedding_model: string;
};

// API client functions
/**
 * AI Playground API client for Phase 3.5.
 * Provides functions for generating grounded AI responses and testing RAG retrieval.
 */
export async function aiPlaygroundApi(organizationId: string, writable = false) {
  const options = await sessionRequestOptions(writable);
  const basePath = "/api/v1";

  return {
    // Generate grounded AI response
    generate: async function (
      query: string,
      conversationContext?: string | null
    ): Promise<AiPlaygroundResponse> {
      const response = await apiClient.post<AiPlaygroundResponse>(
        `${basePath}/grounded-ai/generate`,
        {
          query,
          organization_id: organizationId,
          conversation_context: conversationContext,
        },
        { ...options, timeoutMs: 330_000 }
      );

      return response;
    },

    // Retrieve knowledge chunks (for debugging)
    retrieve: async function (
      query: string,
      limit: number = 10
    ): Promise<RetrievalResult> {
      const response = await apiClient.post<RetrievalResult>(`${basePath}/rag/retrieve`, {
        query,
        organization_id: organizationId,
        limit,
      }, options);

      return response;
    },

    // Build context only (for debugging)
    buildContext: async function (query: string): Promise<string> {
      const response = await apiClient.post<string>(`${basePath}/rag/build-context`, {
        query,
        organization_id: organizationId,
      }, options);

      return response;
    },
  };
}

export type {
  AiPlaygroundRequest,
  AiPlaygroundResponse,
  SourceReference,
  RetrievedChunk,
  RetrievalResult,
};
