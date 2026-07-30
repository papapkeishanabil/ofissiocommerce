"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { formatIDR } from "@/types/product";
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
  cancelled: "Cancelled",
};

export function AdminQuotationStatusActions({
  quotation,
}: {
  quotation: QuotationRequestRecord;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

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
    }));
    patchQuotation(
      {
        action: "update_pricing",
        items,
        discountTotal: Number(formData.get("discountTotal") ?? 0),
        taxTotal: Number(formData.get("taxTotal") ?? 0),
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

  const canConvert = quotation.status === "accepted" || quotation.status === "quoted";

  return (
    <section className="space-y-4">
      <div className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">
            Quotation actions
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Status, pricing, email mock/resend-aware, dan convert-to-order foundation.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ADMIN_QUOTATION_UPDATE_STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === quotation.status ? "secondary" : "outline"}
              disabled={isPending || status === quotation.status}
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
            disabled={isPending || !quotation.grandTotal}
            onClick={() =>
              patchQuotation(
                { action: "send_quote_to_customer" },
                "Quotation customer notification diproses.",
              )
            }
          >
            Send quote to customer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={isPending || !canConvert || !quotation.grandTotal}
            onClick={convertToOrder}
          >
            Convert to order
          </Button>
        </div>
        {message ? (
          <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <form
        action={updatePricing}
        className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">
              Pricing editor
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
              <NumberField
                label="Unit price"
                name={`unitPrice:${item.id}`}
                defaultValue={item.unitPrice ?? item.priceFrom}
              />
              <NumberField
                label="Final unit price"
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
            </fieldset>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <NumberField
            label="Global discount"
            name="discountTotal"
            defaultValue={quotation.discountTotal}
          />
          <NumberField label="Tax" name="taxTotal" defaultValue={quotation.taxTotal} />
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
            defaultValue={quotation.salesEmail ?? ""}
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
        <Button className="mt-4" type="submit" disabled={isPending}>
          Update pricing
        </Button>
      </form>

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
