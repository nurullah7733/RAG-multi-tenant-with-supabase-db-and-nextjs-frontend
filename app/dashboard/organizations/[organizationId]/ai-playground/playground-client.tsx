"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { generateAnswer } from "./actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ documentId: string; pageNumber?: number }>;
  fallback?: boolean;
  language?: string;
  timestamp: Date;
}

interface DocumentInfo {
  id: string;
  filename: string;
  chunk_count: number;
  status: string;
}

export default function AiPlaygroundClient({ organizationId, organizationName, documents }: { organizationId: string; organizationName: string; documents: DocumentInfo[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationLanguage, setConversationLanguage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Calculate total ready documents
  const readyDocuments = documents.filter((doc) => doc.status === "ready" && doc.chunk_count > 0);
  const totalChunks = readyDocuments.reduce((sum, doc) => sum + doc.chunk_count, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Add user message
      const userMessage: Message = {
        id: `msg-${messageIdCounter.current++}`,
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Get AI response
      const result = await generateAnswer(organizationId, input.trim());
      if (result.error) {
        if (result.unauthorized) router.push("/login");
        setError(result.error);
        return;
      }
      const response = result.data!;

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg-${messageIdCounter.current++}`,
        role: "assistant",
        content: response.response,
        sources: response.sources.map((s) => ({
          documentId: s.document_id,
          pageNumber: s.page_number ?? undefined,
        })),
        fallback: response.fallback,
        language: response.language,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationLanguage(response.language);
    } catch {
      setError("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function getDocumentName(documentId: string): string {
    const doc = documents.find((d) => d.id === documentId);
    return doc ? doc.filename : "Unknown Document";
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/organizations/${organizationId}/knowledge`} className="text-sm underline">
          Knowledge Base
        </Link>
        <Link href="/dashboard" className="text-sm underline">
          All organizations
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{organizationName}</p>
        <h1 className="text-2xl font-semibold">AI Playground</h1>
        <p className="text-muted-foreground">
          Test your AI assistant with your organization&apos;s knowledge base.
        </p>
      </header>

      {/* Knowledge Base Status */}
      <section className="rounded-lg border bg-muted/50 p-4">
        <h2 className="text-sm font-medium mb-2">Knowledge Base</h2>
        {readyDocuments.length > 0 ? (
          <div className="text-sm">
            <span className="font-semibold">{readyDocuments.length}</span> document(s) ready
            {totalChunks > 0 && (
              <>
                <span className="mx-1">|</span>
                <span className="font-semibold">{totalChunks}</span> chunks indexed
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-amber-600">
            No documents ready. Please upload and process documents first.
          </div>
        )}
        {readyDocuments.length === 0 && (
          <div className="mt-2">
            <Link
              href={`/dashboard/organizations/${organizationId}/knowledge`}
              className="text-sm underline text-primary"
            >
              Go to Knowledge Base
            </Link>
          </div>
        )}
      </section>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Chat Messages */}
      <section className="flex-1 space-y-4">
        <div className="rounded-lg border h-[400px] overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>Ask a question to test your AI assistant</p>
                {readyDocuments.length > 0 && (
                  <p className="text-sm mt-1">
                    Example: &quot;What is your refund policy?&quot;
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-muted/20">
                        <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                        <div className="text-xs space-y-1">
                          {message.sources.map((source, index) => {
                            const docName = getDocumentName(source.documentId);
                            return (
                              <div key={index} className="text-muted-foreground">
                                {docName}
                                {source.pageNumber && (
                                  <>
                                    <span className="mx-1">—</span>
                                    <span>Page {source.pageNumber}</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {message.role === "assistant" && message.fallback && (
                      <div className="mt-2 text-xs text-amber-600">
                        Note: This answer may require human assistance
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </section>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={readyDocuments.length > 0 ? "Ask a question..." : "Upload documents first to enable AI assistant"}
            disabled={isLoading || readyDocuments.length === 0}
            className="flex-1 rounded-md border px-4 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || readyDocuments.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </div>
      </form>

      {/* Debug Section */}
      <details className="rounded-lg border border-muted/20 p-4">
        <summary className="cursor-pointer text-sm font-medium">Debug Info</summary>
        <div className="mt-2 text-xs space-y-2">
          <p>
            <strong>Organization ID:</strong> {organizationId}
          </p>
          {conversationLanguage && (
            <p>
              <strong>Conversation Language:</strong> {conversationLanguage} (default: English)
            </p>
          )}
          <p>
            <strong>Ready Documents:</strong> {readyDocuments.length}
          </p>
          <p>
            <strong>Total Chunks:</strong> {totalChunks}
          </p>
          {readyDocuments.length > 0 && (
            <div>
              <p className="font-medium">Documents:</p>
              <ul className="list-disc list-inside">
                {readyDocuments.map((doc) => (
                  <li key={doc.id}>
                    {doc.filename} ({doc.chunk_count} chunks)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </main>
  );
}
