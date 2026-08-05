import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calculator, History, Receipt, Truck } from "lucide-react";

import {
  canUpdateProcessOrder,
  getAdminOrderDetail,
  requireInternalAdminServer,
} from "@/features/admin/admin.service";
import { resolveAdminProductImages } from "@/features/admin/admin-product-images";
import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminCarrierShippingPanel } from "@/features/admin/components/AdminCarrierShippingPanel";
import { AdminDocumentActions } from "@/features/admin/components/AdminDocumentActions";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminInlineProcessChecklist } from "@/features/admin/components/AdminInlineProcessChecklist";
import { AdminOrderCustomerPanel } from "@/features/admin/components/AdminOrderCustomerPanel";
import { AdminOrderItems } from "@/features/admin/components/AdminOrderItems";
import {
  AdminOrderNextAction,
  type AdminOrderNextActionState,
} from "@/features/admin/components/AdminOrderNextAction";
import { AdminOrderProcessPanel } from "@/features/admin/components/AdminOrderProcessPanel";
import { AdminOrderProgress } from "@/features/admin/components/AdminOrderProgress";
import { AdminPaymentPanel } from "@/features/admin/components/AdminPaymentPanel";
import { AdminProcessRouteBadge } from "@/features/admin/components/AdminProcessRouteBadge";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { AdminShipmentPanel } from "@/features/admin/components/AdminShipmentPanel";
import { AdminWooSyncPanel } from "@/features/admin/components/AdminWooSyncPanel";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import { AdminOrderNotificationRead } from "@/features/admin-notifications/components/AdminOrderNotificationRead";
import { getCarrierShippingConfig } from "@/features/carrier-shipping/carrier-shipping.config";
import { getCarrierShippingState } from "@/features/carrier-shipping/carrier-shipping.service";
import type { CarrierShipmentStatus } from "@/features/carrier-shipping/carrier-shipping.types";
import { getWooCommerceOrderAdminUrl } from "@/features/orders/woocommerce-order-sync.service";
import type { OrderProcessRoute } from "@/features/orders/order.types";
import { getPaymentRuntimeConfig } from "@/features/payment/payment.config";
import type { ProcessOrder, ProcessOrderTask } from "@/features/process-orders/process-order.types";
import type { ShipmentStatus } from "@/features/shipments/shipment.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [detail, actor] = await Promise.all([
    getAdminOrderDetail(id),
    requireInternalAdminServer("admin:order:view"),
  ]);
  if (!detail) notFound();

  const {
    order,
    tracking,
    documents,
    payment,
    paymentEvents,
    processOrderDetail,
  } = detail;
  const productImages = await resolveAdminProductImages(
    order.items.map((item) => ({ productId: item.productId, productSlug: item.productSlug })),
  );
  const trackingSnapshots = Object.fromEntries(
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
  const paymentReceived = order.status === "payment_received" || payment?.status === "paid";
  const invoicePdf = documents.find(
    (document) => document.documentType === "invoice_pdf" && document.status === "generated",
  );
  const invoiceSent = Boolean(detail.invoiceDelivery);
  const processRoute = order.processRoute ?? "fulfillment";
  const wooOrderId = order.wooOrderId ?? order.woocommerceOrderId ?? null;
  const wooSyncStatus =
    order.wooSyncStatus ??
    (order.orderSyncStatus === "synced"
      ? "synced"
      : order.orderSyncStatus === "failed"
        ? "failed"
        : "disabled");
  const nextAction = deriveNextAction({
    orderStatus: order.status,
    invoiceGenerated: Boolean(invoicePdf),
    invoiceSent,
    paymentReceived,
    processRoute,
    processOrder: processOrderDetail?.processOrder ?? detail.processOrder,
    tasks: processOrderDetail?.tasks ?? [],
    carrierShipmentStatus: carrierShipping.shipment?.shipmentStatus ?? null,
    shipmentStatuses: detail.shipments.map((shipment) => shipment.status),
  });

  return (
    <div className="space-y-5">
      <AdminOrderNotificationRead notifications={detail.attentionNotifications} />
      <Link
        href="/admin/orders"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-bold text-brand-700 transition hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke orders
      </Link>

      <AdminOrderProgress
        orderStatus={order.status}
        paymentStatus={payment?.status ?? null}
        invoiceGenerated={Boolean(invoicePdf)}
        invoiceSent={invoiceSent}
        processRoute={processRoute}
        processOrderCreated={Boolean(detail.processOrder)}
        processStatus={detail.processOrder?.processStatus ?? order.processStatus ?? "not_started"}
        shipmentStatuses={detail.shipments.map((shipment) => shipment.status)}
        processProgress={detail.processOrder?.progress ?? 0}
      />

      <header className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
              {tracking?.orderNumber ?? order.orderNumber ?? order.id}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {detail.customer.companyName} · {formatAdminDate(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={invoiceSent ? "success" : "warning"}>
              {invoiceSent ? "INVOICE SENT" : invoicePdf ? "INVOICE READY" : "NO INVOICE"}
            </AdminBadge>
            <AdminBadge tone={paymentReceived ? "success" : "warning"}>
              {paymentReceived ? "PAID" : payment?.status ?? "WAITING PAYMENT"}
            </AdminBadge>
            <AdminProcessRouteBadge route={order.processRoute ?? "fulfillment"} />
            <AdminBadge tone={adminStatusTone(order.status)}>{order.status}</AdminBadge>
          </div>
        </div>
      </header>

      <AdminOrderNextAction state={nextAction} />

      <div id="invoice" className="scroll-mt-24">
        <AdminSectionCard
          icon={Receipt}
          tone={invoiceSent ? "emerald" : "neutral"}
          title="Invoice to customer"
          description="Buat dan kirim invoice terlebih dahulu. Setelah terkirim, admin dapat memantau pembayaran customer."
          actions={
            <AdminBadge tone={invoiceSent ? "success" : invoicePdf ? "warning" : "neutral"}>
              {invoiceSent ? "Sudah dikirim" : invoicePdf ? "Belum dikirim" : "Belum dibuat"}
            </AdminBadge>
          }
        >
          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <InfoCard
              label="Dokumen invoice"
              value={invoicePdf ? invoicePdf.filename : "Belum dibuat"}
            />
            <InfoCard
              label="Invoice to customer"
              value={invoiceSent ? "Sudah dikirim" : "Belum dikirim"}
            />
            <InfoCard
              label="Waktu pengiriman"
              value={
                detail.invoiceDelivery
                  ? formatAdminDate(
                      detail.invoiceDelivery.sentAt ?? detail.invoiceDelivery.createdAt,
                    )
                  : "-"
              }
            />
          </dl>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Generate invoice otomatis membuat atau memakai ulang payment link aktif, lalu
            menyertakan link dan QR di PDF.
          </p>
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
              initialEmailSent={invoiceSent}
            />
          </div>
        </AdminSectionCard>
      </div>

      <div id="payment" className="scroll-mt-24">
        <AdminPaymentPanel
          orderId={order.id}
          payment={payment}
          events={paymentEvents}
          requestedProvider={paymentConfig.requestedProvider}
          activeProvider={paymentConfig.provider}
          ipaymuConfigured={paymentConfig.ipaymu.isComplete}
        />
      </div>

      <div id="order-items" className="scroll-mt-24">
        <AdminOrderItems
          items={order.items}
          productImages={productImages}
          trackingSnapshots={trackingSnapshots}
          artworkPreviews={detail.artworkPreviews}
        />
      </div>

      <div id="process-order" className="scroll-mt-24">
        <AdminOrderProcessPanel
          orderId={order.id}
          processRoute={processRoute}
          processStatus={order.processStatus ?? "not_started"}
          replenishmentStatus={order.replenishmentStatus ?? "not_required"}
          hasCustomization={order.hasCustomization ?? false}
          customizationType={order.customizationType ?? "none"}
          processRouteReason={order.processRouteReason ?? null}
          processOrderId={detail.processOrder?.id ?? null}
          processOrderNumber={detail.processOrder?.processOrderNumber ?? null}
          paymentReceived={paymentReceived}
          canUpdate={canUpdateProcessOrder(actor)}
        />
      </div>

      {processOrderDetail ? (
        <div id="process-checklist" className="scroll-mt-24">
          <AdminInlineProcessChecklist
            processOrder={processOrderDetail.processOrder}
            tasks={processOrderDetail.tasks}
            canUpdate={canUpdateProcessOrder(actor)}
            variant="summary"
          />
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <AdminOrderCustomerPanel customer={detail.customer} />
        <AdminSectionCard icon={Calculator} tone="neutral" title="Nilai order">
          <dl className="divide-y divide-line text-sm">
            <SummaryRow label="Subtotal barang" value={formatRupiah(order.calculation.itemSubtotal)} />
            <SummaryRow label="Biaya custom" value={formatRupiah(order.calculation.customizationFee)} />
            <SummaryRow label="Pengiriman" value={formatRupiah(order.calculation.shippingFee)} />
            <SummaryRow
              label={
                order.calculation.taxEnabled === false
                  ? `${order.calculation.taxLabel ?? "PPN"} tidak dikenakan`
                  : `${order.calculation.taxLabel ?? "PPN"} ${order.calculation.taxRate ?? ""}%`.replace(" %", "")
              }
              value={formatRupiah(order.calculation.tax)}
            />
            <SummaryRow label="Grand total" value={formatRupiah(order.calculation.grandTotal)} strong />
          </dl>
        </AdminSectionCard>
      </div>

      <div id="shipping" className="scroll-mt-24">
        <AdminCarrierShippingPanel
          orderId={order.id}
          paymentReceived={paymentReceived}
          provider={carrierConfig.provider}
          providerConfigured={
            carrierConfig.isRuntimeAllowed &&
            (carrierConfig.provider === "mock" || carrierConfig.biteship.isConfigured)
          }
          initialQuotes={carrierShipping.quotes}
          initialShipment={carrierShipping.shipment}
          initialEvents={carrierShipping.events}
        />
      </div>

      <AdminShipmentPanel
        orderId={order.id}
        processOrderId={detail.processOrder?.id ?? null}
        shipments={detail.shipments}
        events={detail.shipmentEvents}
      />

      <AdminWooSyncPanel
        entityType="order"
        entityId={order.id}
        wooOrderId={wooOrderId}
        wooOrderNumber={order.wooOrderNumber ?? null}
        wooSyncStatus={wooSyncStatus}
        wooSyncError={order.wooSyncError ?? null}
        wooSyncedAt={order.wooSyncedAt ?? null}
        wooAdminUrl={getWooCommerceOrderAdminUrl(wooOrderId)}
        note="Sinkronisasi commerce disimpan sebagai referensi; operasional tetap dikerjakan dari halaman ini."
      />

      <AdminSectionCard icon={History} tone="neutral" title="Riwayat status order">
        {!tracking ? (
          <AdminEmptyState title="Tracking belum tersedia" />
        ) : (
          <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {tracking.productionTimeline.map((stage) => (
              <li key={stage.id} className="flex flex-col gap-2 bg-white px-4 py-3 sm:flex-row sm:items-start">
                <AdminBadge tone={adminStatusTone(stage.state)}>{stage.state}</AdminBadge>
                <div className="min-w-0">
                  <p className="font-bold text-ink">{stage.label}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {stage.description ?? stage.updatedByRole ?? "-"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </AdminSectionCard>
    </div>
  );
}

function deriveNextAction(input: {
  orderStatus: string;
  invoiceGenerated: boolean;
  invoiceSent: boolean;
  paymentReceived: boolean;
  processRoute: OrderProcessRoute;
  processOrder: ProcessOrder | null;
  tasks: ProcessOrderTask[];
  carrierShipmentStatus: CarrierShipmentStatus | null;
  shipmentStatuses: ShipmentStatus[];
}): AdminOrderNextActionState {
  if (input.orderStatus === "cancelled") {
    return {
      tone: "neutral",
      title: "Order dibatalkan",
      description: "Tidak ada proses operasional lanjutan. Periksa riwayat untuk konteks pembatalan.",
    };
  }
  const invoiceStageComplete = input.invoiceSent || input.paymentReceived;
  if (!invoiceStageComplete) {
    return input.invoiceGenerated
      ? {
          tone: "warning",
          title: "Kirim invoice ke customer",
          description:
            "Invoice sudah dibuat tetapi belum terkirim. Kirim invoice sebelum menunggu pembayaran customer.",
          actionLabel: "Kirim invoice",
          actionHref: "#invoice",
        }
      : {
          tone: "brand",
          title: "Buat invoice customer",
          description:
            "Siapkan invoice resmi, periksa total dan payment link, lalu kirimkan ke customer.",
          actionLabel: "Siapkan invoice",
          actionHref: "#invoice",
        };
  }
  if (!input.paymentReceived) {
    return {
      tone: "warning",
      title: "Invoice terkirim — tunggu pembayaran",
      description:
        "Invoice sudah terkirim. Pantau pembayaran dan jangan mulai pekerjaan sebelum status menjadi paid.",
      actionLabel: "Periksa pembayaran",
      actionHref: "#payment",
    };
  }
  const delivered =
    input.carrierShipmentStatus === "delivered" || input.shipmentStatuses.includes("delivered");
  if (delivered && !input.processOrder) {
    return {
      tone: "success",
      title: "Order legacy sudah selesai dikirim",
      description:
        "Shipment berstatus delivered. Process order tidak dibuat karena order ini berasal dari flow lama; tidak perlu membuat proses baru.",
    };
  }
  if (!input.processOrder) {
    const routeLabel = processOrderLabel(input.processRoute);
    return {
      tone: "brand",
      title: `Pembayaran diterima — buat ${routeLabel}`,
      description: `Pembayaran sudah terverifikasi. Buat ${routeLabel} dari snapshot order agar tim dapat mulai bekerja tanpa input ulang.`,
      actionLabel: `Buat ${routeLabel}`,
      actionHref: "#process-order",
    };
  }
  if (input.processOrder.processStatus !== "completed") {
    const activeTask = [...input.tasks]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .find((task) => task.status !== "completed");
    return {
      tone: input.processOrder.processStatus === "waiting_replenishment" ? "warning" : "brand",
      title: activeTask ? `Kerjakan: ${activeTask.taskName}` : "Lanjutkan process order",
      description:
        input.processOrder.processStatus === "waiting_replenishment"
          ? "Order menunggu replenishment internal. Customer tetap melihat order sebagai tersedia."
          : `Progress saat ini ${input.processOrder.progress}%. Selesaikan task aktif untuk memperbarui tracking customer.`,
      actionLabel: "Buka checklist",
      actionHref: "#process-checklist",
    };
  }
  if (delivered) {
    return {
      tone: "success",
      title: "Order selesai dan sudah diterima customer",
      description: "Process order serta pengiriman telah selesai. Tidak ada tindakan wajib berikutnya.",
    };
  }
  const shipmentStarted =
    Boolean(input.carrierShipmentStatus) || input.shipmentStatuses.length > 0;
  return {
    tone: "brand",
    title: shipmentStarted ? "Pantau status pengiriman" : "Process selesai — siapkan pengiriman",
    description: shipmentStarted
      ? "Shipment sudah dibuat. Perbarui tracking sampai paket diterima customer."
      : "Pilih layanan carrier, buat shipment, lalu simpan nomor resi untuk customer.",
    actionLabel: shipmentStarted ? "Buka pengiriman" : "Buat shipment",
    actionHref: "#shipping",
  };
}

function processOrderLabel(route: OrderProcessRoute) {
  if (route === "customization") return "Customization Order";
  if (route === "production") return "Production Order";
  return "Fulfillment Order";
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className={strong ? "font-extrabold text-ink" : "text-ink-muted"}>{label}</dt>
      <dd className={strong ? "text-lg font-extrabold text-brand-800" : "font-bold text-ink"}>{value}</dd>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}
