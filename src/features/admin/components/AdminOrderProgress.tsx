import {
  Check,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  PackagePlus,
  Truck,
} from "lucide-react";

import type {
  OrderProcessRoute,
  OrderProcessStatus,
} from "@/features/orders/order.types";
import type { PaymentOrderStatus, PaymentStatus } from "@/features/payment/payment.types";
import type { ShipmentStatus } from "@/features/shipments/shipment.types";
import { cn } from "@/lib/utils";

const ACTIVE_PROCESS_STATUSES: OrderProcessStatus[] = [
  "ready_to_process",
  "in_progress",
  "waiting_replenishment",
  "waiting_customer_approval",
  "on_hold",
];

const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "draft",
  "ready_to_ship",
  "booked",
  "picked_up",
  "in_transit",
];

const ATTENTION_PAYMENT_STATUSES: PaymentStatus[] = [
  "failed",
  "expired",
  "cancelled",
  "manual_review",
];

interface AdminOrderProgressProps {
  orderStatus: PaymentOrderStatus;
  paymentStatus: PaymentStatus | null;
  invoiceGenerated: boolean;
  invoiceSent: boolean;
  processRoute: OrderProcessRoute;
  processOrderCreated: boolean;
  processStatus: OrderProcessStatus;
  shipmentStatuses: ShipmentStatus[];
  processProgress: number;
}

export function AdminOrderProgress({
  orderStatus,
  paymentStatus,
  invoiceGenerated,
  invoiceSent,
  processRoute,
  processOrderCreated,
  processStatus,
  shipmentStatuses,
  processProgress,
}: AdminOrderProgressProps) {
  const paid = orderStatus === "payment_received" || paymentStatus === "paid";
  const processComplete = processOrderCreated && processStatus === "completed";
  const processStarted =
    processOrderCreated && ACTIVE_PROCESS_STATUSES.includes(processStatus);
  const delivered = shipmentStatuses.includes("delivered");
  const shipmentStarted = shipmentStatuses.some((status) =>
    ACTIVE_SHIPMENT_STATUSES.includes(status),
  );
  const paymentNeedsAttention =
    orderStatus === "payment_failed" ||
    (paymentStatus ? ATTENTION_PAYMENT_STATUSES.includes(paymentStatus) : false);
  const stopped = orderStatus === "cancelled" || processStatus === "cancelled";

  // Paid and downstream legacy orders imply that the preceding invoice stage was completed.
  const invoiceStageComplete = invoiceSent || paid || processOrderCreated || shipmentStarted || delivered;
  const paymentStageComplete = paid || processOrderCreated || shipmentStarted || delivered;
  const processOrderStageComplete = processOrderCreated || shipmentStarted || delivered;
  const workStageComplete = processComplete || shipmentStarted || delivered;
  const routeLabel = processOrderLabel(processRoute);
  const steps = [
    { label: "Order diterima", shortLabel: "Order", icon: ClipboardCheck },
    { label: "Invoice ke customer", shortLabel: "Invoice", icon: FileCheck2 },
    { label: "Pembayaran", shortLabel: "Bayar", icon: CircleDollarSign },
    { label: `Buat ${routeLabel}`, shortLabel: "Buat proses", icon: PackagePlus },
    { label: "Pengerjaan", shortLabel: "Kerjakan", icon: ListChecks },
    { label: "Pengiriman", shortLabel: "Kirim", icon: Truck },
    { label: "Selesai", shortLabel: "Selesai", icon: Check },
  ] as const;
  const completedSteps = [
    true,
    invoiceStageComplete,
    paymentStageComplete,
    processOrderStageComplete,
    workStageComplete,
    delivered,
    delivered,
  ];
  const currentStep = delivered
    ? 6
    : shipmentStarted || processComplete
      ? 5
      : processOrderCreated
        ? 4
        : paid
          ? 3
          : invoiceStageComplete
            ? 2
            : 1;
  const attention = paymentNeedsAttention || stopped;
  const statusLabel = delivered
    ? "Selesai"
    : stopped
      ? "Dibatalkan"
      : paymentNeedsAttention
        ? "Pembayaran perlu diperiksa"
        : shipmentStarted || processComplete
          ? "Siap / dalam pengiriman"
          : processStarted
            ? "Sedang dikerjakan"
            : processOrderCreated
              ? `${routeLabel} sudah dibuat`
              : paid
                ? `Buat ${routeLabel}`
                : invoiceStageComplete
                  ? "Menunggu pembayaran"
                  : invoiceGenerated
                    ? "Invoice siap dikirim"
                    : "Siapkan invoice";
  const nextAction = delivered
    ? "Order telah diterima customer dan seluruh proses selesai."
    : stopped
      ? "Order berhenti. Periksa alasan pembatalan sebelum melakukan tindak lanjut."
      : paymentNeedsAttention
        ? "Periksa transaksi pembayaran sebelum order dilanjutkan."
        : shipmentStarted || processComplete
          ? "Buat atau pantau shipment sampai pesanan diterima customer."
          : processOrderCreated
            ? "Selesaikan checklist pengerjaan, lalu lanjutkan ke pengiriman."
            : paid
              ? `Pembayaran sudah diterima. Buat ${routeLabel} untuk memulai pekerjaan.`
              : invoiceStageComplete
                ? "Invoice sudah dikirim. Pantau pembayaran customer sebelum memulai pekerjaan."
                : invoiceGenerated
                  ? "Invoice sudah dibuat. Kirimkan ke customer agar pembayaran dapat diproses."
                  : "Buat invoice, periksa rinciannya, lalu kirimkan ke customer.";
  const visibleProgress = delivered
    ? 100
    : shipmentStarted
      ? 90
      : processComplete
        ? 80
        : processStarted
          ? Math.max(55, Math.min(78, 55 + Math.round(processProgress * 0.23)))
          : processOrderCreated
            ? 52
            : paid
              ? 42
              : invoiceStageComplete
                ? 30
                : invoiceGenerated
                  ? 20
                  : 10;

  return (
    <section
      aria-labelledby="order-progress-title"
      className="overflow-hidden rounded-2xl bg-brand-950 text-white shadow-soft-md"
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-200">
              Alur kerja order
            </p>
            <h2 id="order-progress-title" className="mt-1 text-lg font-black tracking-tight">
              Progres operasional
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-brand-100">
              {nextAction}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-brand-100">
              Progres {visibleProgress}%
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em]",
                attention ? "bg-amber-300 text-amber-950" : "bg-white text-brand-900",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  attention ? "bg-amber-700" : delivered ? "bg-emerald-500" : "bg-brand-600",
                )}
                aria-hidden="true"
              />
              {statusLabel}
            </span>
          </div>
        </div>

        <ol className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-7" aria-label="Tahapan order">
          {steps.map((step, index) => {
            const completed = completedSteps[index];
            const current = index === currentStep && !delivered;
            const Icon = step.icon;
            return (
              <li key={step.label} className="relative flex min-w-0 items-center gap-3 md:block">
                <div className="flex items-center md:w-full">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm transition-colors",
                      completed && "border-emerald-400 bg-emerald-400 text-brand-950",
                      current &&
                        (attention
                          ? "border-amber-300 bg-amber-300 text-amber-950 ring-4 ring-amber-300/15"
                          : "border-white bg-white text-brand-800 ring-4 ring-white/15"),
                      !completed && !current && "border-white/25 bg-white/5 text-brand-200",
                    )}
                    aria-current={current ? "step" : undefined}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  {index < steps.length - 1 ? (
                    <span
                      className={cn(
                        "mx-2 hidden h-0.5 min-w-0 flex-1 xl:block",
                        completedSteps[index + 1] ? "bg-emerald-400" : "bg-white/20",
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 md:mt-2 md:pr-2">
                  <p
                    className={cn(
                      "text-sm font-bold leading-5",
                      completed || current ? "text-white" : "text-brand-200",
                    )}
                  >
                    <span className="md:hidden">{step.label}</span>
                    <span className="hidden md:inline xl:hidden">{step.shortLabel}</span>
                    <span className="hidden xl:inline">{step.label}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-brand-200">
                    {completed ? "Selesai" : current ? "Tahap sekarang" : "Belum dimulai"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="h-1 bg-white/10" aria-hidden="true">
        <div
          className={cn(
            "h-full transition-[width] duration-300",
            attention ? "bg-amber-300" : "bg-emerald-400",
          )}
          style={{ width: `${visibleProgress}%` }}
        />
      </div>
    </section>
  );
}

function processOrderLabel(route: OrderProcessRoute) {
  if (route === "customization") return "Customization Order";
  if (route === "production") return "Production Order";
  return "Fulfillment Order";
}
