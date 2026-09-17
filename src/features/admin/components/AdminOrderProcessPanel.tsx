"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/Button";
import { processRouteLabel, processRouteSteps } from "@/features/orders/order-routing.service";
import type {
  OrderCustomizationType,
  OrderProcessRoute,
  OrderProcessStatus,
  OrderReplenishmentStatus,
} from "@/features/orders/order.types";

import { AdminBadge, adminStatusTone } from "./AdminBadge";
import { AdminProcessRouteBadge } from "./AdminProcessRouteBadge";

// Pengadaan stok (replenishment) — label internal admin; nilai mentah tetap
// dipakai untuk tone badge supaya warna status tidak berubah.
const REPLENISHMENT_LABEL: Record<OrderReplenishmentStatus, string> = {
  not_required: "Stok cukup",
  needed: "Perlu pengadaan",
  in_progress: "Pengadaan berjalan",
  completed: "Pengadaan selesai",
};

interface AdminOrderProcessPanelProps {
  orderId: string;
  processRoute: OrderProcessRoute;
  processStatus: OrderProcessStatus;
  replenishmentStatus: OrderReplenishmentStatus;
  hasCustomization: boolean;
  customizationType: OrderCustomizationType;
  processRouteReason?: string | null;
  processOrderId?: string | null;
  processOrderNumber?: string | null;
  paymentReceived: boolean;
  canUpdate: boolean;
}

export function AdminOrderProcessPanel({
  orderId,
  processRoute,
  processStatus,
  replenishmentStatus,
  hasCustomization,
  customizationType,
  processRouteReason,
  processOrderId,
  processOrderNumber,
  paymentReceived,
  canUpdate,
}: AdminOrderProcessPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const steps = processRouteSteps(processRoute);
  const isCompleted = processStatus === "completed";
  const isInProgress =
    processStatus === "in_progress" || processStatus === "waiting_replenishment";

  function startProcess() {
    if (!window.confirm("Teruskan pesanan ini ke pengerjaan dan buat Perintah Kerja untuk tim terkait?")) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/orders/${orderId}/process`, {
        method: "POST",
        headers: {
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        processOrderId?: string;
        processOrderNumber?: string;
        processRoute?: string;
        idempotent?: boolean;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Order belum dapat diproses.");
        return;
      }
      if (result.processOrderId) {
        router.push(`/admin/process-orders/${encodeURIComponent(result.processOrderId)}?created=${result.idempotent ? "existing" : "new"}`);
        return;
      }
      setMessage("Perintah Kerja berhasil dibuat. Silakan buka menu Perintah Kerja.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <AdminProcessRouteBadge route={processRoute} showDescription />
          <h3 className="mt-3 text-lg font-black text-ink">
            {processRouteLabel(processRoute)}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {processRouteReason ??
              "Route ditentukan dari tipe produk standar dan kebutuhan custom order."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminBadge tone={adminStatusTone(processStatus)}>{processStatus}</AdminBadge>
          <AdminBadge tone={adminStatusTone(replenishmentStatus)}>
            Pengadaan: {REPLENISHMENT_LABEL[replenishmentStatus]}
          </AdminBadge>
        </div>
      </div>

      {replenishmentStatus !== "not_required" ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
          Perlu pengadaan stok — ini peringatan internal admin, bukan status “stok habis” untuk customer.
        </p>
      ) : null}

      {!paymentReceived && !processOrderId ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Pembayaran belum terverifikasi. Pesanan dapat diteruskan setelah pembayaran memenuhi ketentuan.
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Memerlukan custom" value={hasCustomization ? "Ya" : "Tidak"} />
        <Info label="Jenis custom" value={customizationType === "none" ? "Tidak ada" : customizationType} />
        <Info label="Rute pengerjaan" value={processRouteLabel(processRoute)} />
      </dl>

      <div className="mt-4 rounded-2xl border border-line/70 bg-slate-50/80 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
          Tahapan pengerjaan
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step} className="rounded-2xl bg-white p-3 text-sm shadow-soft-xs ring-1 ring-line">
              <span className="text-xs font-black text-brand-700">{index + 1}</span>
              <p className="mt-1 font-bold text-ink">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {message ? (
        <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {processOrderId ? (
          <ButtonLink href={`/admin/process-orders/${processOrderId}`} size="sm">
            Buka Perintah Kerja{processOrderNumber ? `, ${processOrderNumber}` : ""}
          </ButtonLink>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={processRoute === "production" ? "secondary" : "primary"}
            onClick={startProcess}
            disabled={isPending || isCompleted || !paymentReceived || !canUpdate}
            aria-busy={isPending}
          >
            {isPending
              ? "Memproses..."
              : isCompleted
                ? "Selesai"
                : isInProgress
                  ? "Buat / buka Perintah Kerja"
                  : "Teruskan ke Pengerjaan"}
          </Button>
        )}
        <p className="self-center text-xs font-semibold text-ink-muted">
          {canUpdate
            ? "Tindakan ini membuat Perintah Kerja dari data pesanan tanpa input ulang."
            : "Role Anda hanya memiliki akses melihat Perintah Kerja."}
        </p>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50/80 p-3 ring-1 ring-line/70">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
