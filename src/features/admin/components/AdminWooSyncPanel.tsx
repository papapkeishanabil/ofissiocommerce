"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/Button";

import { AdminBadge, adminStatusTone } from "./AdminBadge";

interface AdminWooSyncPanelProps {
  entityType: "order" | "quotation";
  entityId: string;
  title?: string;
  wooOrderId?: string | null;
  wooOrderNumber?: string | null;
  wooSyncStatus?: string | null;
  wooSyncError?: string | null;
  wooSyncedAt?: string | null;
  wooAdminUrl?: string | null;
  canRetry?: boolean;
  note?: string;
}

export function AdminWooSyncPanel({
  entityType,
  entityId,
  title = "WooCommerce sync",
  wooOrderId,
  wooOrderNumber,
  wooSyncStatus = "disabled",
  wooSyncError,
  wooSyncedAt,
  wooAdminUrl,
  canRetry = true,
  note,
}: AdminWooSyncPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const endpoint =
    entityType === "order"
      ? `/api/admin/orders/${entityId}/sync-woocommerce`
      : `/api/admin/quotations/${entityId}/sync-woocommerce`;
  const status = wooSyncStatus ?? "disabled";

  function retrySync() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        sync?: { ok?: boolean; message?: string; externalOrderId?: string | null };
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Sync WooCommerce belum berhasil.");
        return;
      }
      setMessage(
        result.sync?.externalOrderId
          ? `WooCommerce sync selesai: #${result.sync.externalOrderId}.`
          : result.sync?.message ?? "WooCommerce sync diproses.",
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            {title}
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">
            {wooOrderId ? `Woo order #${wooOrderNumber ?? wooOrderId}` : "Belum tersinkron"}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {note ??
              "Sync bersifat idempotent: retry tidak membuat order baru jika woo_order_id sudah ada."}
          </p>
        </div>
        <AdminBadge tone={adminStatusTone(status)}>{status}</AdminBadge>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Info label="woo_order_id" value={wooOrderId ?? "-"} />
        <Info label="woo_order_number" value={wooOrderNumber ?? "-"} />
        <Info label="last synced" value={wooSyncedAt ? new Date(wooSyncedAt).toLocaleString("id-ID") : "-"} />
      </dl>

      {wooSyncError ? (
        <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {wooSyncError}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={retrySync}
          disabled={isPending || !canRetry || status === "pending"}
        >
          {isPending ? "Syncing..." : wooOrderId ? "Retry status" : "Sync to Woo"}
        </Button>
        {wooAdminUrl ? (
          <ButtonLink href={wooAdminUrl} size="sm" variant="outline" target="_blank" rel="noreferrer">
            Open WP admin
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-xs font-bold text-ink">{value}</dd>
    </div>
  );
}
