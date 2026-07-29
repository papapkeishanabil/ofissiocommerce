"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ADMIN_QUOTATION_UPDATE_STATUSES } from "../admin.config";
import type { AdminQuotationUpdateStatus } from "../admin.validation";

const LABELS: Record<AdminQuotationUpdateStatus, string> = {
  submitted: "Submitted",
  under_review: "Mark under review",
  quoted: "Mark quoted",
  revision_requested: "Revision requested",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export function AdminQuotationStatusActions({
  quotationId,
  currentStatus,
}: {
  quotationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateStatus(status: AdminQuotationUpdateStatus) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/quotations/${quotationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify({
          status,
          internalNote: "Updated from Phase 16 admin foundation UI.",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Status belum dapat diperbarui.");
        return;
      }
      setMessage("Status quotation diperbarui.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">
          Action foundation
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Update status internal saja. Harga final, email real, dan convert order masuk fase berikutnya.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ADMIN_QUOTATION_UPDATE_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={status === currentStatus ? "secondary" : "outline"}
            disabled={isPending || status === currentStatus}
            onClick={() => updateStatus(status)}
          >
            {LABELS[status]}
          </Button>
        ))}
      </div>
      {message ? (
        <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
