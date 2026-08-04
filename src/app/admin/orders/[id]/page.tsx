import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Receipt, Truck } from "lucide-react";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminDocumentActions } from "@/features/admin/components/AdminDocumentActions";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminOrderProcessPanel } from "@/features/admin/components/AdminOrderProcessPanel";
import { AdminOrderProgress } from "@/features/admin/components/AdminOrderProgress";
import { AdminPaymentPanel } from "@/features/admin/components/AdminPaymentPanel";
import { AdminProductThumb } from "@/features/admin/components/AdminProductThumb";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { AdminShipmentPanel } from "@/features/admin/components/AdminShipmentPanel";
import { AdminCarrierShippingPanel } from "@/features/admin/components/AdminCarrierShippingPanel";
import { AdminWooSyncPanel } from "@/features/admin/components/AdminWooSyncPanel";
import { AdminOrderNotificationRead } from "@/features/admin-notifications/components/AdminOrderNotificationRead";
import { getAdminOrderDetail } from "@/features/admin/admin.service";
import { resolveAdminProductImages } from "@/features/admin/admin-product-images";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import { getWooCommerceOrderAdminUrl } from "@/features/orders/woocommerce-order-sync.service";
import { getPaymentRuntimeConfig } from "@/features/payment/payment.config";
import { getCarrierShippingConfig } from "@/features/carrier-shipping/carrier-shipping.config";
import { getCarrierShippingState } from "@/features/carrier-shipping/carrier-shipping.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();
  const { order, tracking, documents, payment, paymentEvents } = detail;
  const productImages = await resolveAdminProductImages(
    order.items.map((item) => ({ productId: item.productId, productSlug: item.productSlug })),
  );
  // Customer's own configured/uploaded product preview (3D snapshot) wins over
  // the generic catalog image when available.
  const trackingSnapshotByProductId = new Map(
    (tracking?.items ?? [])
      .filter((item) => Boolean(item.snapshotUrl))
      .map((item) => [item.productId, item.snapshotUrl as string] as const),
  );
  const paymentConfig = getPaymentRuntimeConfig();
  const carrierConfig = getCarrierShippingConfig();
  const carrierShipping = await getCarrierShippingState({
    orderId: order.id,
    companyId: order.companyId,
  });
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
      <AdminOrderNotificationRead notifications={detail.attentionNotifications} />
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 transition hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to orders
      </Link>
      <AdminOrderProgress
        orderStatus={order.status}
        paymentStatus={payment?.status ?? null}
        processStatus={detail.processOrder?.processStatus ?? order.processStatus ?? "not_started"}
        shipmentStatuses={detail.shipments.map((shipment) => shipment.status)}
        processProgress={detail.processOrder?.progress ?? 0}
      />

      {/* Page header */}
      <header className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-eyebrow text-brand-700">Order detail</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
              {tracking?.orderNumber ?? order.id}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {tracking?.companyName ?? order.companyId} · {formatAdminDate(order.createdAt)}
            </p>
          </div>
          <AdminBadge tone={adminStatusTone(order.status)}>{order.status}</AdminBadge>
        </div>
      </header>

      <AdminSectionCard icon={Receipt} eyebrow="Ringkasan" title="Total & perhitungan">
        <dl className="grid gap-3 text-sm md:grid-cols-4">
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
          <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Grand total</dt>
            <dd className="mt-1 font-extrabold text-ink">{formatRupiah(order.calculation.grandTotal)}</dd>
          </div>
        </dl>
      </AdminSectionCard>

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

      <AdminCarrierShippingPanel
        orderId={order.id}
        paymentReceived={order.status === "payment_received" || payment?.status === "paid"}
        provider={carrierConfig.provider}
        providerConfigured={
          carrierConfig.isRuntimeAllowed &&
          (carrierConfig.provider === "mock" || carrierConfig.biteship.isConfigured)
        }
        initialQuotes={carrierShipping.quotes}
        initialShipment={carrierShipping.shipment}
        initialEvents={carrierShipping.events}
      />

      <AdminShipmentPanel
        orderId={order.id}
        processOrderId={detail.processOrder?.id ?? null}
        shipments={detail.shipments}
        events={detail.shipmentEvents}
      />

      <AdminSectionCard
        icon={Receipt}
        tone="neutral"
        eyebrow="Documents"
        title="Invoice PDF · invoice_ofissio_custom"
        description="QR dibuat dari payment link aktif. Jika link pembayaran berubah, regenerate PDF sebelum mengirim invoice."
        actions={<AdminBadge tone={invoicePdf ? "success" : "warning"}>{invoicePdf ? "generated" : "not generated"}</AdminBadge>}
      >
        {invoicePdf ? (
          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <InfoCard label="File" value={invoicePdf.filename} />
            <InfoCard label="Template" value={invoicePdf.templateId} />
            <InfoCard label="Generated" value={invoicePdf.generatedAt ? formatAdminDate(invoicePdf.generatedAt) : "-"} />
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
      </AdminSectionCard>

      <AdminSectionCard
        icon={Package}
        eyebrow="Items"
        title="Item snapshots"
        description="Foto produk teresolusi dari katalog agar staff mudah mengenali item."
      >
        {order.items.length === 0 ? (
          <AdminEmptyState title="Item snapshot belum tersedia" />
        ) : (
          <div className="space-y-3">
            {order.items.map((item) => (
              <article
                key={`${order.id}-${item.productId}`}
                className="rounded-2xl border border-line bg-surface-muted/50 p-4"
              >
                <div className="flex items-start gap-4">
                  <AdminProductThumb
                    src={
                      trackingSnapshotByProductId.get(item.productId) ??
                      productImages[item.productId]?.mainImage
                    }
                    alt={item.productName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-base font-extrabold tracking-tight text-ink">{item.productName}</h4>
                        <p className="text-sm text-ink-muted">
                          {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                        </p>
                      </div>
                      <AdminBadge tone="brand">{item.fulfillmentType}</AdminBadge>
                    </div>
                    {item.model3dUrl ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-mono text-[11px] text-ink-muted ring-1 ring-line">
                        <Package className="h-3 w-3" aria-hidden="true" />
                        3D: {item.model3dUrl}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard icon={Truck} tone="neutral" title="Tracking timeline">
        {!tracking ? (
          <AdminEmptyState title="Tracking belum tersedia" />
        ) : (
          <ol className="space-y-2">
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
      </AdminSectionCard>
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
