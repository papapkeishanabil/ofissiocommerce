import { Download, FileText, LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { TrackingDocument } from "@/features/tracking/tracking.types";

interface OrderDocumentsProps {
  documents: TrackingDocument[];
}

export function OrderDocuments({ documents }: OrderDocumentsProps) {
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
                disabled={doc.status !== "available"}
                aria-label={`Download ${doc.label}`}
              >
                {doc.status === "available" ? (
                  <Download className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
