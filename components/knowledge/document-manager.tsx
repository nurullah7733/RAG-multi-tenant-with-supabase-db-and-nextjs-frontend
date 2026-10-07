"use client";

import { useActionState, useRef, useState } from "react";
import {
  deleteDocument,
  reprocessDocument,
  uploadDocument,
  type UploadState,
} from "@/app/dashboard/organizations/[organizationId]/knowledge/actions";
import { Button } from "@/components/ui/button";
import type { KnowledgeDocument } from "@/lib/api/documents";

const STATUS_STYLES: Record<KnowledgeDocument["status"], string> = {
  uploaded: "bg-secondary text-secondary-foreground",
  processing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function formatSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager({
  organizationId,
  documents,
}: {
  organizationId: string;
  documents: KnowledgeDocument[];
}) {
  const [state, action, pending] = useActionState(
    (previous: UploadState, form: FormData) =>
      uploadDocument(organizationId, previous, form),
    {}
  );
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFile(file: File | undefined) {
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setSelected(file.name);
    formRef.current?.requestSubmit();
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} action={action} className="space-y-3">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            acceptFile(event.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-ring bg-muted" : "border-border"
          }`}
        >
          <p className="font-medium">
            Drag &amp; drop a document here, or
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="ml-1 underline"
            >
              browse files
            </button>
          </p>
          <p className="text-sm text-muted-foreground">
            PDF, DOCX or TXT up to 20 MB. Your documents stay private to this
            organization.
          </p>
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".pdf,.docx,.txt"
            className="sr-only"
            aria-label="Document file"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />
          {selected && <p className="text-sm">Selected: {selected}</p>}
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? `Uploading${selected ? ` ${selected}` : "…"}…` : "Upload document"}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Documents</h2>
        {!documents.length && (
          <p className="text-muted-foreground">
            No documents yet. Upload your first knowledge document above.
          </p>
        )}
        <ul className="space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{document.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(document.size_bytes)} ·{" "}
                  {document.status === "ready" && document.chunk_count > 0
                    ? `${document.chunk_count} chunks · `
                    : ""}
                  {new Date(document.created_at).toLocaleString()}
                  {document.status === "failed" && document.processing_error
                    ? ` · ${document.processing_error}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[document.status]}`}
                >
                  {document.status}
                </span>
                <form
                  action={() =>
                    reprocessDocument(organizationId, document.id)
                  }
                >
                  <Button type="submit" variant="outline" size="sm">
                    Reprocess
                  </Button>
                </form>
                <form
                  action={() => deleteDocument(organizationId, document.id)}
                >
                  <Button type="submit" variant="outline" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
