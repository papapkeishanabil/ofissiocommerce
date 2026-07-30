"use client";

import { useState, useTransition } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";

interface AdminDocumentActionsProps {
  entityId: string;
  generatePath: string;
  downloadPath: string;
  canGenerate: boolean;
  blockedMessage?: string;
  generateLabel: string;
  regenerateLabel: string;
  downloadLabel: string;
  templateId?: string;
}

export function AdminDocumentActions({
  entityId,
  generatePath,
  downloadPath,
  canGenerate,
  blockedMessage,
  generateLabel,
  regenerateLabel,
  downloadLabel,
  templateId,
}: AdminDocumentActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate(forceRegenerate = false) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(generatePath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify({
          forceRegenerate,
          ...(templateId ? { templateId } : {}),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        document?: { filename?: string };
        idempotent?: boolean;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Dokumen belum dapat dibuat.");
        return;
      }
      setMessage(
        `${result.idempotent ? "Dokumen existing dipakai" : "Dokumen berhasil dibuat"}: ${
          result.document?.filename ?? entityId
        }`,
      );
    });
  }

  function download() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(downloadPath, {
        headers: {
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        signedUrl?: string;
      };
      if (!response.ok || !result.ok || !result.signedUrl) {
        setMessage(result.message ?? "Dokumen belum tersedia.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      setMessage("Signed URL dokumen dibuat.");
    });
  }

  return (
    <div className="space-y-3">
      {!canGenerate && blockedMessage ? (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          {blockedMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canGenerate || isPending}
          onClick={() => generate(false)}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-900 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          {generateLabel}
        </button>
        <button
          type="button"
          disabled={!canGenerate || isPending}
          onClick={() => generate(true)}
          className="inline-flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-4 py-2 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          {regenerateLabel}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={download}
          className="inline-flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-4 py-2 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloadLabel}
        </button>
      </div>
      {message ? (
        <p className="text-sm font-semibold text-ink-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
