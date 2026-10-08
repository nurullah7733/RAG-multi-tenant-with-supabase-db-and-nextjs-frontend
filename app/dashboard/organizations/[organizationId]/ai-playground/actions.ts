"use server";

import { ApiError } from "@/lib/api/client";
import { aiPlaygroundApi, type AiPlaygroundResponse } from "@/lib/api/ai-playground";
import { organizationApi } from "@/lib/api/organizations";

type AnswerResult = { data?: AiPlaygroundResponse; error?: string; unauthorized?: boolean };

export async function generateAnswer(organizationId: string, query: string): Promise<AnswerResult> {
  if (typeof organizationId !== "string" || !/^[0-9a-f-]{36}$/i.test(organizationId) ||
      typeof query !== "string" || !query.trim() || query.length > 10000) {
    return { error: "Enter a valid question (up to 10,000 characters)." };
  }
  // Resolve the session outside the catch so Next.js redirects remain intact.
  const organizations = await organizationApi(true);
  const api = await aiPlaygroundApi(organizationId, true);
  try {
    await organizations.get(organizationId);
    return { data: await api.generate(query.trim()) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return { error: "Please sign in again.", unauthorized: true };
    if (error instanceof ApiError && [403, 404].includes(error.status))
      return { error: "This organization is unavailable or you no longer have access." };
    if (error instanceof ApiError) {
      const body = error.error as { error?: { code?: string } } | undefined;
      const messages: Record<string, string> = {
        generation_not_configured: "AI generation is not configured. Set AI_MODEL and the selected provider key on the backend, then restart it.",
        retrieval_unavailable: "Knowledge retrieval failed. Check the retrieval migration and backend logs.",
        grounded_generation_unavailable: "The AI provider could not generate an answer. Check the backend model, API key and provider credits.",
        generation_unavailable: "The AI provider is unavailable. Check backend configuration and provider credits.",
        prompt_injection: "This question was rejected by the content checks. Please rephrase it.",
      };
      const message = messages[body?.error?.code ?? ""];
      if (message) return { error: message };
    }
    return { error: "Failed to get a response. Please try again." };
  }
}
