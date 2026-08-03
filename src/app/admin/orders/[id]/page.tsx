import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminDocumentActions } from "@/features/admin/components/AdminDocumentActions";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminOrderProcessPanel } from "@/features/admin/components/AdminOrderProcessPanel";
import { AdminPaymentPanel } from "@/features/admin/components/AdminPaymentPanel";
import { AdminShipmentPanel } from "@/features/admin/components/AdminShipmentPanel";
import { AdminWooSyncPanel } from "@/features/admin/components/AdminWooSyncPanel";
import { getAdminOrderDetail } from "@/features/admin/admin.service";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import { getWooCommerceOrderAdminUrl } from "@/features/orders/woocommerce-order-sync.service";
import { getPaymentRuntimeConfig } from "@/features/payment/payment.config";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();
  const { order, tracking, documents, payment, paymentEvents } = detail;
  const paymentConfig = getPaymentRuntimeConfig();
  const invoicePdf = documents.find(
    (document) => document.documentType === "invoice_pdf" && document.status === "generated",
  );
  const wooOrderId = order.wooOrderId ?? order.woocommerceOrderId ?? null;
  const wooSyncStatus =
    order.wooSyncStatus ??
    (order.orderSyncStatus === "synced"
      ? "synced"
      : order.orderSyncStatus === "failed"
        ? "failed"
        : "disabled");
  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-sm font-bold text-brand-700">
        ← Back to orders
      </Link>
      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              Order detail
            </p>
            <h2 className="mt-1 text-2xl font-black text-ink">{tracking?.orderNumber ?? order.id}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {tracking?.companyName ?? order.companyId} · {formatAdminDate(order.createdAt)}
            </p>
          </div>
          <AdminBadge tone={adminStatusTone(order.status)}>{order.status}</AdminBadge>
        </div>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Subtotal</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.itemSubtotal)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Shipping</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.shippingFee)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
              {order.calculation.taxEnabled === false
                ? `${order.calculation.taxLabel ?? "PPN"} tidak dikenakan`
                : `${order.calculation.taxLabel ?? "PPN"} ${order.calculation.taxRate ?? ""}%`.replace(" %", "")}
            </dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.tax)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Grand total</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(order.calculation.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <AdminWooSyncPanel
        entityType="order"
        entityId={order.id}
        wooOrderId={wooOrderId}
        wooOrderNumber={order.wooOrderNumber ?? null}
        wooSyncStatus={wooSyncStatus}
        wooSyncError={order.wooSyncError ?? null}
        wooSyncedAt={order.wooSyncedAt ?? null}
        wooAdminUrl={getWooCommerceOrderAdminUrl(wooOrderId)}
        note="Order Ofissio dapat disinkronkan ke WooCommerce staging jika env WooCommerce aktif."
      />

      <AdminOrderProcessPanel
        orderId={order.id}
        processRoute={order.processRoute ?? "fulfillment"}
        processStatus={order.processStatus ?? "not_started"}
        replenishmentStatus={order.replenishmentStatus ?? "not_required"}
        hasCustomization={order.hasCustomization ?? false}
        customizationType={order.customizationType ?? "none"}
        processRouteReason={order.processRouteReason ?? null}
        processOrderId={detail.processOrder?.id ?? null}
        processOrderNumber={detail.processOrder?.processOrderNumber ?? null}
      />

      <AdminPaymentPanel
        orderId={order.id}
        payment={payment}
        events={paymentEvents}
        requestedProvider={paymentConfig.requestedProvider}
        activeProvider={paymentConfig.provider}
        ipaymuConfigured={paymentConfig.ipaymu.isComplete}
      />

      <AdminShipmentPanel
        orderId={order.id}
        processOrderId={detail.processOrder?.id ?? null}
        shipments={detail.shipments}
        events={detail.shipmentEvents}
      />

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">
              Documents
            </p>
            <h3 className="mt-1 text-lg font-black text-ink">
              Invoice PDF - invoice_ofissio_custom
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              QR dibuat dari payment link aktif. Jika link pembayaran berubah, regenerate PDF sebelum mengirim invoice.
            </p>
          </div>
          <AdminBadge tone={invoicePdf ? "success" : "warning"}>
            {invoicePdf ? "generated" : "not generated"}
          </AdminBadge>
        </div>
        {invoicePdf ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <InfoCard label="File" value={invoicePdf.filename} />
            <InfoCard label="Template" value={invoicePdf.templateId} />
            <InfoCard
              label="Generated"
              value={invoicePdf.generatedAt ? formatAdminDate(invoicePdf.generatedAt) : "-"}
            />
          </dl>
        ) : null}
        <div className="mt-4">
          <AdminDocumentActions
            entityId={order.id}
            generatePath={`/api/admin/orders/${order.id}/generate-invoice`}
            downloadPath={`/api/admin/orders/${order.id}/invoice`}
            canGenerate
            generateLabel="Generate invoice"
            regenerateLabel="Regenerate invoice"
            downloadLabel="Download invoice"
            templateId="invoice_ofissio_custom"
            sendPath={`/api/admin/orders/${order.id}/send-invoice`}
            sendLabel="Kirim Invoice ke Customer"
            resendLabel="Kirim Ulang Invoice"
            initialDocumentAvailable={Boolean(invoicePdf)}
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h3 className="text-lg font-black text-ink">Item snapshots</h3>
        {order.items.length === 0 ? (
          <AdminEmptyState title="Item snapshot belum tersedia" />
        ) : (
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <article key={`${order.id}-${item.productId}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-ink">{item.productName}</h4>
                    <p className="text-sm text-ink-muted">
                      {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      model3dUrl: {item.model3dUrl}
                    </p>
                  </div>
                  <AdminBadge tone="brand">{item.fulfillmentType}</AdminBadge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-white/75 bg-white/90 p-5 shadow-soft-md ring-1 ring-slate-950/[0.03]">
        <h3 className="text-lg font-black text-ink">Tracking timeline</h3>
        {!tracking ? (
          <AdminEmptyState title="Tracking belum tersedia" />
        ) : (
          <ol className="mt-4 space-y-2">
            {tracking.productionTimeline.map((stage) => (
              <li key={stage.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <AdminBadge tone={adminStatusTone(stage.state)}>{stage.state}</AdminBadge>
                <div>
                  <p className="font-bold text-ink">{stage.label}</p>
                  <p className="text-sm text-ink-muted">{stage.description ?? stage.updatedByRole ?? "-"}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}
