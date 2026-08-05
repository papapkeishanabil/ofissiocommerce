"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { quotationStatusLabel } from "@/features/quotation/quotation.mapper";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import {
  canAdminTransitionQuotationStatus,
  hasFinalQuotationPricing,
  isQuotationPricingEditable,
  isQuotationSendable,
} from "@/features/quotation/quotation.utils";
import {
  getBriefApprovalStatus,
  requiresCustomerBriefApproval,
} from "@/features/quotation/quotation-requirement";
import { formatIDR } from "@/types/product";
import { ADMIN_QUOTATION_UPDATE_STATUSES } from "../admin.config";
import type { AdminQuotationUpdateStatus } from "../admin.validation";

const LABELS: Record<AdminQuotationUpdateStatus, string> = {
  submitted: "Diajukan",
  under_review: "Mulai review",
  expired: "Tandai kedaluwarsa",
  cancelled: "Batalkan",
};

/** Prefilled sales contact shown on the quotation pricing panel. */
const DEFAULT_SALES_EMAIL = "sales@ofissio.com";

export function AdminQuotationProcessControl({
  quotation,
}: {
  quotation: QuotationRequestRecord;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const briefApprovalPending = requiresCustomerBriefApproval(quotation);
  const canConvert = !briefApprovalPending && quotation.status === "accepted" && Boolean(quotation.grandTotal);
  const canEditPricing = !briefApprovalPending && isQuotationPricingEditable(quotation.status);
  const canSendQuote =
    !briefApprovalPending && hasFinalQuotationPricing(quotation) && isQuotationSendable(quotation.status);
  const isResendingQuote = quotation.status === "quoted";
  const availableStatuses = briefApprovalPending
    ? []
    : ADMIN_QUOTATION_UPDATE_STATUSES.filter(
        (status) => canAdminTransitionQuotationStatus(quotation.status, status),
      );
  const nextStep = briefApprovalPending
    ? {
        title: getBriefApprovalStatus(quotation.productionBrief) === "revision_requested"
          ? "Customer meminta revisi brief"
          : "Menunggu persetujuan brief dari customer",
        description:
          "Pricing dan pengiriman quotation dikunci. Bagikan halaman approval kepada customer, lalu lanjutkan setelah brief disetujui.",
      }
    : processControlCopy(quotation.status);

  function patchQuotation(payload: Record<string, unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/quotations/${quotation.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-ofissio-internal-role": "super_admin",
            "x-ofissio-internal-user-id": "internal-dev",
          },
          body: JSON.stringify(payload),
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          order?: { id?: string };
          idempotent?: boolean;
        };
        if (!response.ok || !result.ok) {
          setMessage(result.message ?? "Action quotation belum berhasil.");
          return;
        }
        setMessage(
          result.order?.id
            ? `${success} Order: ${result.order.id}${result.idempotent ? " (existing)" : ""}.`
            : success,
        );
        router.refresh();
      } catch {
        setMessage("Koneksi terputus. Silakan coba kembali.");
      }
    });
  }

  function updateStatus(status: AdminQuotationUpdateStatus) {
    patchQuotation(
      {
        action: "update_status",
        status,
        internalNote: "Updated from admin quotation process control.",
      },
      "Status quotation diperbarui.",
    );
  }

  function sendQuote() {
    patchQuotation(
      { action: "send_quote_to_customer" },
      isResendingQuote
        ? "Penawaran berhasil dikirim ulang ke customer."
        : "Penawaran berhasil dikirim ke customer.",
    );
  }

  function convertToOrder() {
    if (!window.confirm("Konversi quotation ini menjadi order Ofissio?")) return;
    patchQuotation({ action: "convert_to_order" }, "Quotation dikonversi ke order.");
  }

  return (
    <section
      aria-labelledby="quotation-next-action"
      className={`z-10 overflow-hidden rounded-2xl border bg-white/95 shadow-soft-md backdrop-blur lg:sticky lg:top-20 ${
        quotation.status === "accepted" ? "border-emerald-300" : "border-brand-200"
      }`}
    >
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                quotation.status === "accepted"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-brand-50 text-brand-800"
              }`}
            >
              {quotation.status === "accepted" ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {quotationStatusLabel(quotation.status)}
            </span>
            {quotation.grandTotal ? (
              <span className="text-sm font-bold tabular-nums text-ink">
                {formatIDR(quotation.grandTotal)}
              </span>
            ) : null}
          </div>
          <h2
            id="quotation-next-action"
            className="mt-2 text-lg font-black tracking-tight text-ink sm:text-xl"
          >
            {nextStep.title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">
            {nextStep.description}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          {briefApprovalPending ? (
            <a
              href={`/briefs/${quotation.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Buka halaman approval
            </a>
          ) : canConvert ? (
            <Button type="button" disabled={isPending} onClick={convertToOrder}>
              {isPending ? "Memproses..." : "Konversi menjadi order"}
            </Button>
          ) : canSendQuote ? (
            <Button
              type="button"
              variant={isResendingQuote ? "secondary" : "primary"}
              disabled={isPending}
              onClick={sendQuote}
            >
              {isPending
                ? "Mengirim..."
                : isResendingQuote
                  ? "Kirim ulang penawaran"
                  : "Kirim penawaran"}
            </Button>
          ) : canEditPricing ? (
            <a
              href="#quotation-pricing"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Lengkapi harga final
            </a>
          ) : quotation.status === "converted_to_order" && quotation.convertedOrderId ? (
            <a
              href={`/admin/orders/${quotation.convertedOrderId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Buka order
            </a>
          ) : null}
        </div>
      </div>

      {availableStatuses.length > 0 ? (
        <details className="border-t border-line bg-slate-50/80 px-4 py-3 sm:px-5">
          <summary className="cursor-pointer text-xs font-bold text-ink-muted marker:text-brand-500">
            Aksi status lainnya
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableStatuses.map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => updateStatus(status)}
              >
                {LABELS[status]}
              </Button>
            ))}
          </div>
        </details>
      ) : null}

      {message ? (
        <p
          className="border-t border-line bg-white px-4 py-3 text-sm font-semibold text-ink-muted sm:px-5"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

export function AdminQuotationStatusActions({
  quotation,
  defaultTaxRate,
  showProcessControl = true,
}: {
  quotation: QuotationRequestRecord;
  defaultTaxRate: number;
  showProcessControl?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const briefApprovalPending = requiresCustomerBriefApproval(quotation);

  function patchQuotation(payload: Record<string, unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "super_admin",
          "x-ofissio-internal-user-id": "internal-dev",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        order?: { id?: string };
        idempotent?: boolean;
      };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "Action quotation belum berhasil.");
        return;
      }
      setMessage(
        result.order?.id
          ? `${success} Order: ${result.order.id}${result.idempotent ? " (existing)" : ""}.`
          : success,
      );
      router.refresh();
    });
  }

  function updateStatus(status: AdminQuotationUpdateStatus) {
    patchQuotation(
      {
        action: "update_status",
        status,
        internalNote: "Updated from Phase 17 admin quotation management.",
      },
      "Status quotation diperbarui.",
    );
  }

  function updatePricing(formData: FormData) {
    const items = quotation.items.map((item) => ({
      itemId: item.id,
      unitPrice: Number(formData.get(`unitPrice:${item.id}`) ?? 0),
      discountAmount: Number(formData.get(`discount:${item.id}`) ?? 0),
      finalUnitPrice: Number(formData.get(`finalUnitPrice:${item.id}`) ?? 0),
      embroideryLines: item.embroideryLines.map((line) => ({
        zoneId: line.zoneId,
        unitPrice: Number(formData.get(`embroideryUnitPrice:${item.id}:${line.zoneId}`) ?? line.unitPrice),
        setupFee: Number(formData.get(`embroiderySetupFee:${item.id}:${line.zoneId}`) ?? line.setupFee),
      })),
    }));
    patchQuotation(
      {
        action: "update_pricing",
        items,
        discountTotal: Number(formData.get("discountTotal") ?? 0),
        taxEnabled: formData.get("taxEnabled") === "on",
        taxRate: Number(formData.get("taxRate") ?? defaultTaxRate),
        taxLabel: quotation.taxLabel || "PPN",
        shippingEstimate: Number(formData.get("shippingEstimate") ?? 0),
        customerMessage: String(formData.get("customerMessage") ?? ""),
        salesNotes: String(formData.get("salesNotes") ?? ""),
        validUntil: String(formData.get("validUntil") ?? ""),
        salesEmail: String(formData.get("salesEmail") ?? ""),
      },
      "Harga final quotation diperbarui.",
    );
  }

  function addInternalNote(formData: FormData) {
    patchQuotation(
      {
        action: "add_internal_note",
        note: String(formData.get("note") ?? ""),
      },
      "Internal note ditambahkan.",
    );
  }

  function convertToOrder() {
    if (!window.confirm("Convert quotation ini menjadi order Ofissio foundation?")) {
      return;
    }
    patchQuotation(
      { action: "convert_to_order" },
      "Quotation dikonversi ke order.",
    );
  }

  const canConvert = !briefApprovalPending && quotation.status === "accepted";
  const canEditPricing = !briefApprovalPending && isQuotationPricingEditable(quotation.status);
  const canSendQuote =
    !briefApprovalPending &&
    hasFinalQuotationPricing(quotation) &&
    isQuotationSendable(quotation.status);
  const isResendingQuote = quotation.status === "quoted";

  return (
    <section className="space-y-4">
      {briefApprovalPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-black text-amber-950">Quotation belum dapat diproses</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Brief sales-assisted masih menunggu persetujuan customer. Editor harga dan tombol kirim penawaran akan aktif setelah approval.
          </p>
        </div>
      ) : null}
      {showProcessControl ? (
      <div className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div>
          <h2 className="text-lg font-black tracking-tight text-ink">
            Kontrol proses quotation
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Lihat aksi yang tersedia sekarang. Tombol yang belum sesuai tahap otomatis dinonaktifkan.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ADMIN_QUOTATION_UPDATE_STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === quotation.status ? "secondary" : "outline"}
              disabled={
                isPending ||
                briefApprovalPending ||
                status === quotation.status ||
                !canAdminTransitionQuotationStatus(quotation.status, status)
              }
              onClick={() => updateStatus(status)}
            >
              {LABELS[status]}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending || !canSendQuote}
            onClick={() =>
              patchQuotation(
                { action: "send_quote_to_customer" },
                isResendingQuote
                  ? "Penawaran berhasil dikirim ulang ke customer."
                  : "Quotation customer notification diproses.",
              )
            }
          >
            {isResendingQuote
              ? "Kirim ulang penawaran"
              : "Kirim penawaran ke customer"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={isPending || !canConvert || !quotation.grandTotal}
            onClick={convertToOrder}
          >
            Konversi menjadi order
          </Button>
        </div>
        {canEditPricing ? (
          <a
            href="#quotation-pricing"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-black text-brand-800 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Lanjut isi harga final ↓
          </a>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
            {message}
          </p>
        ) : null}
      </div>
      ) : null}

      {!canEditPricing ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-brand-950">
              {briefApprovalPending ? "Harga belum dapat diproses" : "Harga final sudah dikunci"}
            </p>
            <p className="mt-1 text-sm leading-6 text-brand-800">
              {briefApprovalPending
                ? "Editor disembunyikan sampai customer menyetujui brief Full Custom."
                : "Editor disembunyikan karena quotation sudah melewati tahap pricing. Rincian final tetap tersedia di ringkasan."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-black tabular-nums text-brand-950">
              {quotation.grandTotal ? formatIDR(quotation.grandTotal) : "Belum tersedia"}
            </span>
            {!briefApprovalPending ? (
              <a
                href="#final-pricing-summary"
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-black text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Lihat ringkasan
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {canEditPricing ? (
        <form
          id="quotation-pricing"
          action={updatePricing}
          className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]"
        >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-ink">
              Isi harga final
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Total akhir dihitung ulang server-side. Jangan percaya total frontend.
            </p>
          </div>
          <p className="rounded-full bg-brand-50 px-3 py-1 text-sm font-black text-brand-800">
            Current total {quotation.grandTotal ? formatIDR(quotation.grandTotal) : "pending"}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {quotation.items.map((item) => (
            <fieldset
              key={item.id}
              className="grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 md:grid-cols-4"
            >
              <legend className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                {item.productName} - {item.totalQty} pcs
              </legend>
              <div className="md:col-span-4 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
                Harga kalkulasi Ofissio: <strong>{formatIDR(item.unitPrice ?? item.finalUnitPrice ?? item.priceFrom)} / pcs</strong>
                {item.quantityTierApplied && item.quantityTierLabel ? <> · Tier harga: <strong>{item.quantityTierLabel}</strong></> : <> · Harga regular</>}
                <span className="mt-1 block text-brand-700">Harga final tetap dapat di-override oleh admin sebelum quotation dikirim.</span>
              </div>
              <NumberField
                label="Original calculated price"
                name={`unitPrice:${item.id}`}
                defaultValue={item.unitPrice ?? item.priceFrom}
              />
              <NumberField
                label="Override / final unit price"
                name={`finalUnitPrice:${item.id}`}
                defaultValue={item.finalUnitPrice ?? item.unitPrice ?? item.priceFrom}
              />
              <NumberField
                label="Item discount"
                name={`discount:${item.id}`}
                defaultValue={item.discountAmount}
              />
              <div className="rounded-2xl bg-white p-3 text-sm ring-1 ring-line">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Final line
                </p>
                <p className="mt-1 font-black text-ink">
                  {formatIDR(item.finalLineTotal ?? 0)}
                </p>
              </div>
              {item.embroideryLines.length > 0 ? (
                <div className="md:col-span-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-900">Breakdown bordir · kalkulasi awal {formatIDR(item.embroideryTotal)}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {item.embroideryLines.map((line) => (
                      <div key={line.zoneId} className="grid gap-3 rounded-xl bg-white p-3 ring-1 ring-amber-100 sm:grid-cols-2">
                        <NumberField label={`${line.label} / pcs`} name={`embroideryUnitPrice:${item.id}:${line.zoneId}`} defaultValue={line.unitPrice} />
                        <NumberField label="Setup fee" name={`embroiderySetupFee:${item.id}:${line.zoneId}`} defaultValue={line.setupFee} />
                        <p className="sm:col-span-2 text-xs text-ink-muted">Original: {line.quantity} pcs × {formatIDR(line.unitPrice)}{line.setupFeeApplied ? ` + setup ${formatIDR(line.setupFee)}` : ""} = <strong>{formatIDR(line.subtotal)}</strong></p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-amber-800">Admin dapat override harga per zona. Total final selalu dihitung ulang server-side dan dicatat pada audit pricing.</p>
                </div>
              ) : item.missingEmbroideryPricingZones.length > 0 ? (
                <p className="md:col-span-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Harga bordir untuk zona ini perlu dikonfirmasi admin.</p>
              ) : null}
            </fieldset>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <NumberField
            label="Global discount"
            name="discountTotal"
            defaultValue={quotation.discountTotal}
          />
          <div className="rounded-2xl border border-line bg-slate-50 p-3 md:col-span-2">
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-white px-3 ring-1 ring-line">
              <span>
                <span className="block text-sm font-black text-ink">Kenakan PPN</span>
                <span className="block text-xs text-ink-muted">Aktif/nonaktif khusus quotation ini</span>
              </span>
              <input
                name="taxEnabled"
                type="checkbox"
                defaultChecked={quotation.taxEnabled}
                className="h-5 w-5 accent-brand-700"
              />
            </label>
            <label className="mt-3 block text-sm font-bold text-ink">
              Tarif PPN (%)
              <input
                name="taxRate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={quotation.taxRate || defaultTaxRate}
                className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal tabular-nums outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-ink-muted">Dihitung server-side dari subtotal setelah diskon, sebelum ongkir. Nilai saat ini {formatIDR(quotation.taxTotal)}.</p>
          </div>
          <NumberField
            label="Shipping estimate"
            name="shippingEstimate"
            defaultValue={quotation.shippingEstimate}
          />
          <TextField
            label="Valid until"
            name="validUntil"
            type="date"
            defaultValue={quotation.validUntil?.slice(0, 10) ?? ""}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TextField
            label="Sales email"
            name="salesEmail"
            type="email"
            defaultValue={quotation.salesEmail || DEFAULT_SALES_EMAIL}
          />
          <TextField
            label="Customer message"
            name="customerMessage"
            defaultValue={quotation.customerMessage ?? ""}
          />
        </div>
        <label className="mt-4 block text-sm font-bold text-ink">
          Sales notes
          <textarea
            name="salesNotes"
            defaultValue={quotation.salesNotes ?? ""}
            className="mt-2 min-h-24 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-700"
          />
        </label>
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-ink-muted">
            Urutan kerja: simpan harga terlebih dahulu, lalu kirim penawaran dari tombol di sebelahnya tanpa kembali ke atas.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              disabled={isPending || !canEditPricing}
            >
              Simpan harga final
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || !canSendQuote}
              onClick={() =>
                patchQuotation(
                  { action: "send_quote_to_customer" },
                  isResendingQuote
                    ? "Penawaran berhasil dikirim ulang ke customer."
                    : "Quotation customer notification diproses.",
                )
              }
            >
              {isResendingQuote ? "Kirim ulang ke customer" : "Kirim ke customer"}
            </Button>
          </div>
        </div>
        </form>
      ) : null}

      <form
        action={addInternalNote}
        className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]"
      >
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">
          Add internal note
        </h2>
        <label className="mt-4 block text-sm font-bold text-ink">
          Note
          <textarea
            name="note"
            required
            maxLength={1000}
            className="mt-2 min-h-20 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-700"
            placeholder="Catatan internal tidak tampil ke customer."
          />
        </label>
        <Button className="mt-4" type="submit" variant="outline" disabled={isPending}>
          Add note
        </Button>
      </form>
    </section>
  );
}

function processControlCopy(status: QuotationRequestRecord["status"]) {
  switch (status) {
    case "accepted":
      return {
        title: "Quotation diterima — siap dibuat menjadi order",
        description:
          "Customer sudah menyetujui harga final. Konversi sekarang agar payment, tracking, dan proses operasional dapat dimulai.",
      };
    case "quoted":
      return {
        title: "Menunggu keputusan customer",
        description:
          "Penawaran final sudah dikirim. Anda dapat mengirim ulang jika customer belum menerima email.",
      };
    case "converted_to_order":
      return {
        title: "Quotation sudah dikonversi",
        description:
          "Lanjutkan pekerjaan melalui detail order dan process routing yang sudah dibuat.",
      };
    case "revision_requested":
      return {
        title: "Customer meminta revisi",
        description:
          "Tinjau catatan customer, perbarui harga atau detail penawaran, lalu kirim kembali.",
      };
    case "rejected":
      return {
        title: "Quotation ditolak customer",
        description:
          "Tinjau alasan penolakan sebelum menentukan tindak lanjut bersama tim sales.",
      };
    case "expired":
      return {
        title: "Masa berlaku quotation berakhir",
        description:
          "Quotation ini tidak dapat diterima customer sampai penawaran diperbarui.",
      };
    case "cancelled":
      return {
        title: "Quotation dibatalkan",
        description: "Tidak ada aksi komersial lanjutan untuk quotation ini.",
      };
    default:
      return {
        title: "Lengkapi harga final dan kirim penawaran",
        description:
          "Pastikan pricing, PPN, masa berlaku, dan rincian customization sudah benar sebelum dikirim.",
      };
  }
}

function NumberField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
}) {
  return (
    <label className="text-sm font-bold text-ink">
      {label}
      <input
        name={name}
        type="number"
        min={0}
        step={1000}
        defaultValue={defaultValue ?? 0}
        className="mt-2 h-10 w-full rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-brand-700"
      />
    </label>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "text" | "date" | "email";
}) {
  return (
    <label className="text-sm font-bold text-ink">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 h-10 w-full rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-brand-700"
      />
    </label>
  );
}
