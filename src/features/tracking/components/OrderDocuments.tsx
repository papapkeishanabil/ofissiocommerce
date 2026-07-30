"use client";

import { Download, FileText, LockKeyhole } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/Badge";
import type { TrackingDocument } from "@/features/tracking/tracking.types";
import { useAuth } from "@/hooks/use-auth";
import type { AuthSession } from "@/types/account";

interface OrderDocumentsProps {
  orderId: string;
  documents: TrackingDocument[];
}

export function OrderDocuments({ orderId, documents }: OrderDocumentsProps) {
  const { session } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function downloadDocument(doc: TrackingDocument) {
    if (!session || doc.type !== "invoice") return;
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        headers: authHeaders(session),
        cache: "no-store",
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        signedUrl?: string;
      };
      if (!response.ok || !result.ok || !result.signedUrl) {
        setMessage(result.message ?? "Invoice PDF belum tersedia.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      setMessage("Invoice dibuka lewat signed URL sementara.");
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <FileText className="h-4 w-4 text-brand-700" />
        Dokumen order
      </h2>
      <ul className="mt-4 space-y-2">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{doc.label}</p>
              <p className="text-[11px] text-ink-muted">
                {doc.fileName ?? "Placeholder dokumen"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={doc.status === "available" ? "success" : doc.status === "required" ? "amber" : "neutral"}>
                {doc.status === "available"
                  ? "Ada"
                  : doc.status === "required"
                    ? "Wajib"
                    : "Pending"}
              </Badge>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full border border-line-strong text-ink-muted disabled:opacity-45"
                disabled={isPending || (doc.type !== "invoice" && doc.status !== "available")}
                onClick={() => downloadDocument(doc)}
                aria-label={`Download ${doc.label}`}
              >
                {doc.status === "available" || doc.type === "invoice" ? (
                  <Download className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {message ? (
        <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function authHeaders(session: AuthSession): HeadersInit {
  return {
    "x-ofissio-company-id": session.company.id,
    "x-ofissio-company-name": session.company.companyName,
    "x-ofissio-user-id": session.user.id,
    "x-ofissio-user-email": session.user.email,
    "x-ofissio-user-name": session.user.fullName,
    "x-ofissio-role": session.user.role,
  };
}
