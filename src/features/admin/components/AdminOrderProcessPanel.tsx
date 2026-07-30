"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/Button";
import {
  processButtonLabel,
  processRouteLabel,
  processRouteSteps,
} from "@/features/orders/order-routing.service";
import type {
  OrderCustomizationType,
  OrderProcessRoute,
  OrderProcessStatus,
  OrderReplenishmentStatus,
} from "@/features/orders/order.types";

import { AdminBadge, adminStatusTone } from "./AdminBadge";

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
}: AdminOrderProcessPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const steps = processRouteSteps(processRoute);
  const buttonLabel = processButtonLabel(processRoute);
  const isCompleted = processStatus === "completed";
  const isInProgress =
    processStatus === "in_progress" || processStatus === "waiting_replenishment";

  function startProcess() {
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
      setMessage(
        `${result.idempotent ? "Process order sudah ada" : "Process order dibuat"}: ${
          result.processOrderNumber ?? result.processOrderId ?? processRouteLabel(processRoute)
        }.`,
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Process routing
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">
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
            replenishment: {replenishmentStatus}
          </AdminBadge>
        </div>
      </div>

      {replenishmentStatus !== "not_required" ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
          Replenishment needed — ini warning internal admin, bukan status “stok habis” untuk customer.
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Info label="has_customization" value={hasCustomization ? "true" : "false"} />
        <Info label="customization_type" value={customizationType} />
        <Info label="process_route" value={processRoute} />
      </dl>

      <div className="mt-4 rounded-2xl border border-line/70 bg-slate-50/80 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
          Flow foundation
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
            Buka {processOrderNumber ?? "Process Order"}
          </ButtonLink>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={processRoute === "production" ? "secondary" : "primary"}
            onClick={startProcess}
            disabled={isPending || isCompleted}
            aria-busy={isPending}
          >
            {isPending
              ? "Memproses..."
              : isCompleted
                ? "Selesai"
                : isInProgress
                  ? "Buat / buka process order"
                  : buttonLabel}
          </Button>
        )}
        <p className="self-center text-xs font-semibold text-ink-muted">
          Phase 19 membuat dokumen kerja internal sesuai route, tanpa input ulang order.
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
      <dd className="mt-1 break-all font-mono text-xs font-bold text-ink">{value}</dd>
    </div>
  );
}
