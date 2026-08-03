import {
  Check,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Send,
  UserCheck,
} from "lucide-react";

import { quotationStatusLabel } from "@/features/quotation/quotation.mapper";
import type { QuotationStatus } from "@/features/quotation/quotation.types";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Permintaan masuk", shortLabel: "Request", icon: FileText },
  { label: "Review & harga", shortLabel: "Review", icon: ClipboardCheck },
  { label: "Penawaran dikirim", shortLabel: "Quoted", icon: Send },
  { label: "Keputusan customer", shortLabel: "Approval", icon: UserCheck },
  { label: "Menjadi order", shortLabel: "Order", icon: PackageCheck },
] as const;

const STATUS_STEP: Record<QuotationStatus, number> = {
  draft: 0,
  submitted: 0,
  emailed: 0,
  under_review: 1,
  revision_requested: 2,
  quoted: 2,
  expired: 2,
  accepted: 3,
  rejected: 3,
  converted_to_order: 4,
  cancelled: 0,
};

const NEXT_ACTION: Record<QuotationStatus, string> = {
  draft: "Lengkapi permintaan sebelum diajukan.",
  submitted: "Review kebutuhan, lalu lengkapi harga final.",
  emailed: "Review kebutuhan, lalu lengkapi harga final.",
  under_review: "Lengkapi pricing dan kirim penawaran ke customer.",
  revision_requested: "Perbarui pricing, lalu kirim ulang penawaran.",
  quoted: "Menunggu keputusan customer atas penawaran.",
  accepted: "Quotation siap dikonversi menjadi order.",
  rejected: "Quotation ditolak customer. Hubungi customer bila perlu tindak lanjut.",
  expired: "Masa berlaku habis. Perbarui quotation bila proses dilanjutkan.",
  converted_to_order: "Order sudah terbentuk dan siap diproses.",
  cancelled: "Quotation dibatalkan dan tidak memiliki aksi lanjutan.",
};

const ATTENTION_STATUSES: QuotationStatus[] = [
  "revision_requested",
  "rejected",
  "expired",
  "cancelled",
];

export function AdminQuotationProgress({ status }: { status: QuotationStatus }) {
  const currentStep = STATUS_STEP[status];
  const attention = ATTENTION_STATUSES.includes(status);

  return (
    <section
      aria-labelledby="quotation-progress-title"
      className="rounded-2xl bg-brand-950 px-5 py-5 text-white shadow-soft-md sm:px-6"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 id="quotation-progress-title" className="text-lg font-black tracking-tight">
            Progres quotation
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-100">
            {NEXT_ACTION[status]}
          </p>
        </div>
        <div
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em]",
            attention ? "bg-amber-300 text-amber-950" : "bg-white/10 text-white",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", attention ? "bg-amber-700" : "bg-emerald-400")} />
          Status: {quotationStatusLabel(status)}
        </div>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-5" aria-label="Tahapan quotation">
        {STEPS.map((step, index) => {
          const completed = index < currentStep || status === "converted_to_order";
          const current = index === currentStep && status !== "converted_to_order";
          const Icon = step.icon;
          return (
            <li key={step.label} className="relative flex min-w-0 items-center gap-3 sm:block">
              <div className="flex items-center sm:w-full">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm transition-colors",
                    completed && "border-emerald-400 bg-emerald-400 text-brand-950",
                    current && "border-white bg-white text-brand-800 ring-4 ring-white/15",
                    !completed && !current && "border-white/25 bg-white/5 text-brand-200",
                  )}
                  aria-current={current ? "step" : undefined}
                >
                  {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                </span>
                {index < STEPS.length - 1 ? (
                  <span
                    className={cn(
                      "mx-2 hidden h-0.5 min-w-0 flex-1 sm:block",
                      index < currentStep ? "bg-emerald-400" : "bg-white/20",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="min-w-0 sm:mt-2 sm:pr-2">
                <p className={cn(
                  "text-sm font-bold leading-5",
                  completed || current ? "text-white" : "text-brand-200",
                )}>
                  <span className="sm:hidden">{step.label}</span>
                  <span className="hidden sm:inline lg:hidden">{step.shortLabel}</span>
                  <span className="hidden lg:inline">{step.label}</span>
                </p>
                <p className="mt-0.5 text-xs text-brand-200">
                  {completed ? "Selesai" : current ? "Tahap sekarang" : "Belum dimulai"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
