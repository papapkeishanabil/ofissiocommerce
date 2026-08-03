"use client";

import { useState, useTransition } from "react";
import { Download, FileText, Mail, RefreshCw } from "lucide-react";

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
  sendPath?: string;
  sendLabel?: string;
  resendLabel?: string;
  initialDocumentAvailable?: boolean;
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
  sendPath,
  sendLabel = "Kirim ke customer",
  resendLabel = "Kirim ulang ke customer",
  initialDocumentAvailable = false,
}: AdminDocumentActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [documentAvailable, setDocumentAvailable] = useState(
    initialDocumentAvailable,
  );
  const [emailSent, setEmailSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generate(forceRegenerate = false) {
    setMessage(null);
    setMessageIsError(false);
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
        setMessageIsError(true);
        setMessage(result.message ?? "Dokumen belum dapat dibuat.");
        return;
      }
      setDocumentAvailable(true);
      setMessage(
        `${result.idempotent ? "Dokumen existing dipakai" : "Dokumen berhasil dibuat"}: ${
          result.document?.filename ?? entityId
        }`,
      );
    });
  }

  function download() {
    setMessage(null);
    setMessageIsError(false);
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
        setMessageIsError(true);
        setMessage(result.message ?? "Dokumen belum tersedia.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      setMessage("Signed URL dokumen dibuat.");
    });
  }

  function sendToCustomer() {
    if (!sendPath) return;
    setMessage(null);
    setMessageIsError(false);
    startTransition(async () => {
      const response = await fetch(sendPath, {
        method: "POST",
        headers: {
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        email?: { status?: string; provider?: string };
      };
      if (!response.ok || !result.ok) {
        setMessageIsError(true);
        setMessage(result.message ?? "Invoice belum dapat dikirim ke customer.");
        return;
      }
      setEmailSent(true);
      setMessage(
        result.message ??
          `Invoice berhasil diproses melalui ${result.email?.provider ?? "email"}.`,
      );
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
        {sendPath ? (
          <button
            type="button"
            disabled={!documentAvailable || isPending}
            onClick={sendToCustomer}
            aria-busy={isPending}
            title={
              documentAvailable
                ? undefined
                : "Generate invoice PDF terlebih dahulu."
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {emailSent ? resendLabel : sendLabel}
          </button>
        ) : null}
      </div>
      {message ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            messageIsError
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-800"
          }`}
          role={messageIsError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
