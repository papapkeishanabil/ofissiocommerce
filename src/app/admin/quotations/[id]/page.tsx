import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  History,
  Mail,
  MessageSquare,
  Package,
  Wallet,
} from "lucide-react";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminBriefApprovalLink } from "@/features/admin/components/AdminBriefApprovalLink";
import { AdminDocumentActions } from "@/features/admin/components/AdminDocumentActions";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminProductThumb } from "@/features/admin/components/AdminProductThumb";
import { AdminQuotationProgress } from "@/features/admin/components/AdminQuotationProgress";
import { AdminReferenceGallery } from "@/features/admin/components/AdminReferenceGallery";
import { AdminProcessRouteBadge } from "@/features/admin/components/AdminProcessRouteBadge";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import {
  AdminQuotationProcessControl,
  AdminQuotationStatusActions,
} from "@/features/admin/components/AdminQuotationStatusActions";
import { AdminQuotationNotificationRead } from "@/features/admin-notifications/components/AdminQuotationNotificationRead";
import { AdminWooSyncPanel } from "@/features/admin/components/AdminWooSyncPanel";
import { getAdminQuotationDetail } from "@/features/admin/admin.service";
import { resolveAdminProductImages } from "@/features/admin/admin-product-images";
import { formatAdminDate, formatRupiah } from "@/features/admin/admin.utils";
import { getEmailRuntimeConfig } from "@/features/email/email.config";
import { getWooCommerceOrderAdminUrl } from "@/features/orders/woocommerce-order-sync.service";
import { getGlobalTaxSettings } from "@/features/tax/tax.service";
import { quotationTaxLabel } from "@/features/quotation/quotation.utils";
import {
  getBriefApprovalStatus,
  requirementTypeLabel,
  requiresCustomerBriefApproval,
} from "@/features/quotation/quotation-requirement";
import { quotationSourceLabel } from "@/features/quotation/custom-quotation";
import type { TechnicalGarmentSpecification } from "@/features/quotation/quotation.types";
import { embroideryTechniqueLabel, zoneLabel } from "@/types/uniform-3d";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuotationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [detail, taxState] = await Promise.all([
    getAdminQuotationDetail(id),
    getGlobalTaxSettings(),
  ]);
  if (!detail) notFound();
  const {
    quotation,
    logoPreviews,
    referencePreviews,
    events,
    emailLogs,
    documents,
    acceptedNotification,
  } = detail;
  const referencePreviewByFileId = new Map(
    referencePreviews
      .filter((preview) => Boolean(preview.signedUrl))
      .map((preview) => [preview.fileId, preview.signedUrl as string] as const),
  );
  const productImages = await resolveAdminProductImages(
    quotation.items.map((item) => ({ productId: item.productId, productSlug: item.productSlug })),
  );
  const emailConfig = getEmailRuntimeConfig();
  const latestEmailLog = emailLogs[0] ?? null;
  const quotationPdf = documents.find(
    (document) => document.documentType === "quotation_pdf" && document.status === "generated",
  );
  const canGenerateQuotationPdf = ["quoted", "accepted", "converted_to_order"].includes(
    quotation.status,
  );
  const briefApprovalStatus = getBriefApprovalStatus(quotation.productionBrief);
  const briefApprovalPending = requiresCustomerBriefApproval(quotation);

  return (
    <div className="space-y-5">
      <AdminQuotationNotificationRead notification={acceptedNotification} />
      <Link
        href="/admin/quotations"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 transition hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to quotations
      </Link>

      {briefApprovalPending ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-soft-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="type-eyebrow text-amber-800">Tahap 1 dari 2 · approval brief</p>
              <h2 className="mt-1 text-lg font-black text-amber-950">
                {briefApprovalStatus === "revision_requested"
                  ? "Customer meminta revisi spesifikasi"
                  : "Menunggu persetujuan customer"}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-800">
                Brief ini belum menjadi quotation aktif. Kirim link approval kepada customer; pricing baru terbuka setelah brief disetujui.
              </p>
              {quotation.productionBrief?.approvalRevisionNote ? (
                <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950">
                  Catatan customer: {quotation.productionBrief.approvalRevisionNote}
                </p>
              ) : null}
            </div>
            <AdminBriefApprovalLink briefId={quotation.id} />
          </div>
        </section>
      ) : (
        <AdminQuotationProgress status={quotation.status} />
      )}

      <AdminQuotationProcessControl quotation={quotation} />

      {/* Page header */}
      <header className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-eyebrow text-brand-700">
              {briefApprovalPending ? "Draft brief Full Custom" : "Quotation detail"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
              {quotation.quotationNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {quotation.companyName} · {formatAdminDate(quotation.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={quotation.source === "custom_request" ? "warning" : "neutral"}>
              {quotationSourceLabel(quotation.source)}
            </AdminBadge>
            <AdminProcessRouteBadge route={quotation.requestedProcessRoute} />
            <AdminBadge tone={adminStatusTone(quotation.status)}>{quotation.status}</AdminBadge>
            {quotation.productionBrief?.intakeChannel !== "customer_portal" ? (
              <AdminBadge tone={briefApprovalStatus === "approved" ? "success" : "warning"}>
                brief {briefApprovalStatus}
              </AdminBadge>
            ) : null}
            <AdminBadge tone={adminStatusTone(quotation.emailStatus)}>{quotation.emailStatus}</AdminBadge>
          </div>
        </div>
      </header>

      <AdminQuotationStatusActions
        quotation={quotation}
        defaultTaxRate={taxState.settings.rate}
        showProcessControl={false}
      />

      <AdminSectionCard
        icon={FileText}
        eyebrow="Overview"
        title="Ringkasan quotation"
      >
        <dl className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">PIC</dt>
            <dd className="mt-1 font-semibold text-ink">{quotation.picName}</dd>
            <dd className="text-ink-muted">{quotation.picEmail ?? "-"}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Qty / Items</dt>
            <dd className="mt-1 font-semibold text-ink">{quotation.totalQty} pcs · {quotation.items.length} item</dd>
            <dd className="text-ink-muted">{quotation.embroideryPointCount} titik bordir</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Estimasi subtotal</dt>
            <dd className="mt-1 font-semibold text-ink">{formatRupiah(quotation.subtotalEstimate)}</dd>
            <dd className="text-ink-muted">Harga final Phase 17</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl border border-line bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                Jenis kebutuhan customer
              </p>
              <p className="mt-1 font-bold text-ink">
                {requirementTypeLabel(quotation.requirementType)}
              </p>
            </div>
            <p className="max-w-xl text-sm text-ink-muted">
              Route ini akan dipertahankan saat quotation dikonversi menjadi order.
              Sistem hanya dapat menaikkan route jika menemukan kebutuhan yang lebih kompleks.
            </p>
          </div>
          {quotation.productionBrief ? (
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm md:grid-cols-2">
              <BriefRow label="Nama proyek" value={quotation.productionBrief.projectName ?? "Belum diberi nama"} />
              <BriefRow label="Jenis pakaian" value={quotation.productionBrief.garmentType ?? "Belum ditentukan"} />
              <BriefRow label="Estimasi jumlah" value={quotation.productionBrief.estimatedQuantity ? `${quotation.productionBrief.estimatedQuantity} pcs` : `${quotation.totalQty} pcs`} />
              <BriefRow label="Penggunaan" value={quotation.productionBrief.usageContext ?? "Belum dijelaskan"} />
              <BriefRow label="Brief desain/model" value={quotation.productionBrief.designDescription} />
              <BriefRow label="Bahan" value={quotation.productionBrief.materialPreference ?? "Belum ditentukan"} />
              <BriefRow label="Warna" value={quotation.productionBrief.colorPreference ?? "Belum ditentukan"} />
              <BriefRow label="Ukuran/pola" value={quotation.productionBrief.sizeNotes ?? "Mengikuti pembahasan"} />
              <BriefRow label="Target kebutuhan" value={quotation.productionBrief.targetDate ? formatAdminDate(quotation.productionBrief.targetDate) : "Belum ditentukan"} />
              <BriefRow
                label="Sumber brief"
                value={quotation.productionBrief.intakeChannel === "customer_portal"
                  ? "Customer portal"
                  : `Sales-assisted · ${quotation.productionBrief.intakeChannel ?? "internal"}`}
              />
              <BriefRow label="No. PO / referensi" value={quotation.productionBrief.externalReference ?? "Belum dicatat"} />
              {(quotation.productionBrief.technicalSpecifications?.length ?? 0) > 0 ? (
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
                    Spesifikasi teknis terstruktur
                  </p>
                  <div className="space-y-3">
                    {quotation.productionBrief.technicalSpecifications?.map((garment) => (
                      <TechnicalSpecificationCard key={garment.id} garment={garment} />
                    ))}
                  </div>
                </div>
              ) : null}
              {(quotation.productionBrief.referenceFiles?.length ?? 0) > 0 ? (
                <div className="rounded-2xl bg-white p-3 ring-1 ring-line md:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
                    File referensi customer
                  </dt>
                  <dd className="mt-2">
                    <AdminReferenceGallery
                      items={(quotation.productionBrief.referenceFiles ?? []).map((file) => ({
                        fileId: file.fileId,
                        filename: file.filename,
                        mimeType: file.mimeType,
                        url: referencePreviewByFileId.get(file.fileId) ?? null,
                      }))}
                    />
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>

        {quotation.customerNotes ? (
          <div className="mt-4 rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-bold text-ink">Customer notes</p>
            <p className="mt-1 text-ink-muted">{quotation.customerNotes}</p>
          </div>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard
        icon={Mail}
        tone="neutral"
        eyebrow="Email delivery"
        title={emailConfig.enabled ? `Provider ${emailConfig.provider}` : "Email real belum aktif — mock/skipped"}
        description={`Status quotation saat ini: ${quotation.emailStatus}. Email failure tidak membatalkan quotation flow.`}
        actions={
          <>
            <AdminBadge tone={adminStatusTone(quotation.emailStatus)}>{quotation.emailStatus}</AdminBadge>
            <AdminBadge tone={emailConfig.enabled ? "success" : "warning"}>
              {emailConfig.enabled ? "email enabled" : "mock/skipped"}
            </AdminBadge>
          </>
        }
      >
        {latestEmailLog ? (
          <dl className="grid gap-3 text-sm md:grid-cols-4">
            <InfoCard label="Last type" value={latestEmailLog.type} />
            <InfoCard label="Last status" value={latestEmailLog.status} />
            <InfoCard label="Provider" value={latestEmailLog.provider} />
            <InfoCard label="Created" value={formatAdminDate(latestEmailLog.createdAt)} />
          </dl>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-ink-muted">
            Belum ada email log untuk quotation ini.
          </p>
        )}
        {latestEmailLog?.errorMessage ? (
          <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Last safe error: {latestEmailLog.errorMessage}
          </p>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard
        icon={FileText}
        tone="neutral"
        eyebrow="Documents"
        title="Quotation PDF / Penawaran resmi"
        description="PDF final hanya untuk quotation status quoted, accepted, atau converted_to_order."
        actions={<AdminBadge tone={quotationPdf ? "success" : "warning"}>{quotationPdf ? "generated" : "not generated"}</AdminBadge>}
      >
        {quotationPdf ? (
          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <InfoCard label="File" value={quotationPdf.filename} />
            <InfoCard label="Template" value={quotationPdf.templateId} />
            <InfoCard label="Generated" value={quotationPdf.generatedAt ? formatAdminDate(quotationPdf.generatedAt) : "-"} />
          </dl>
        ) : null}
        <div className="mt-4">
          <AdminDocumentActions
            entityId={quotation.id}
            generatePath={`/api/admin/quotations/${quotation.id}/generate-pdf`}
            downloadPath={`/api/admin/quotations/${quotation.id}/pdf`}
            canGenerate={canGenerateQuotationPdf}
            blockedMessage="Quotation belum final, PDF final belum bisa dibuat."
            generateLabel="Generate PDF"
            regenerateLabel="Regenerate PDF"
            downloadLabel="Download PDF"
            templateId="quotation_default"
          />
        </div>
      </AdminSectionCard>

      <section id="final-pricing-summary" className="grid scroll-mt-28 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <AdminSectionCard icon={Wallet} eyebrow="Final pricing" title="Harga final">
          {quotation.grandTotal ? (
            <dl className="space-y-2 text-sm">
              <PriceRow label="Subtotal final" value={quotation.subtotal} />
              <PriceRow label="Discount" value={quotation.discountTotal} />
              <PriceRow label={quotationTaxLabel(quotation)} value={quotation.taxTotal} />
              <PriceRow label="Shipping estimate" value={quotation.shippingEstimate} />
              <PriceRow label="Grand total" value={quotation.grandTotal} strong />
              <InfoRow label="Valid until" value={quotation.validUntil ? formatAdminDate(quotation.validUntil) : "-"} />
            </dl>
          ) : (
            <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Menunggu review sales. Harga final belum diisi.
            </p>
          )}
          {quotation.customerMessage ? (
            <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
              <p className="font-bold">Customer-facing message</p>
              <p className="mt-1">{quotation.customerMessage}</p>
            </div>
          ) : null}
          {quotation.salesNotes ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-ink-muted">
              <p className="font-bold text-ink">Sales notes</p>
              <p className="mt-1">{quotation.salesNotes}</p>
            </div>
          ) : null}
        </AdminSectionCard>

        <AdminSectionCard icon={MessageSquare} tone="neutral" title="Internal notes">
          {quotation.internalNotes.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada internal note.</p>
          ) : (
            <ul className="space-y-2">
              {quotation.internalNotes.slice().reverse().map((note) => (
                <li key={note.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <p className="text-ink">{note.note}</p>
                  <p className="mt-1 text-xs font-semibold text-ink-muted">
                    {note.authorId ?? "system"} - {formatAdminDate(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSectionCard>
      </section>

      <AdminWooSyncPanel
        entityType="quotation"
        entityId={quotation.id}
        wooOrderId={quotation.wooOrderId}
        wooOrderNumber={quotation.wooOrderNumber ?? null}
        wooSyncStatus={quotation.wooSyncStatus ?? (quotation.wooOrderId ? "synced" : "disabled")}
        wooSyncError={quotation.wooSyncError ?? null}
        wooSyncedAt={quotation.wooSyncedAt ?? null}
        wooAdminUrl={getWooCommerceOrderAdminUrl(quotation.wooOrderId)}
        canRetry={Boolean(quotation.convertedOrderId)}
        note={
          quotation.convertedOrderId
            ? "Quotation converted dapat membuat/menghubungkan order WooCommerce staging."
            : "Sync WooCommerce aktif setelah quotation dikonversi menjadi order Ofissio."
        }
      />

      <AdminSectionCard
        icon={Package}
        eyebrow="Items"
        title="Item quotation, size matrix & bordir"
        description="Foto produk membantu staff mengenali item saat review."
      >
        {quotation.items.length === 0 ? (
          <AdminEmptyState title="Item quotation belum tersedia" />
        ) : (
          <div className="space-y-3">
            {quotation.items.map((item) => (
              <article
                key={`${quotation.id}-${item.productId}-${item.selectedColor}`}
                className="rounded-2xl border border-line bg-surface-muted/50 p-4"
              >
                <div className="flex items-start gap-4">
                  <AdminProductThumb
                    src={productImages[item.productId]?.mainImage}
                    alt={item.productName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-base font-extrabold tracking-tight text-ink">{item.productName}</h4>
                        <p className="text-sm text-ink-muted">
                          SKU {item.sku} · {item.selectedColor} · {item.totalQty} pcs
                        </p>
                      </div>
                      <AdminBadge tone="brand">{item.fulfillmentType}</AdminBadge>
                    </div>

                    {item.source === "custom" ? (
                      <div className="mt-3 rounded-2xl border border-ochre-200 bg-ochre-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-900">
                          Custom project scope
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-amber-950">
                          Item ini dibuat dari brief customer, bukan dari produk katalog. Harga,
                          pola, bahan, size chart, dan feasibility ditetapkan saat review sales
                          dan produksi.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mt-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Size matrix</p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-sm sm:grid-cols-6">
                            {Object.entries(item.sizeMatrix).map(([size, qty]) => (
                              <div key={size} className="rounded-xl bg-white p-2.5 text-center ring-1 ring-line">
                                <p className="font-extrabold text-ink">{size}</p>
                                <p className="text-ink-muted">{qty} pcs</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Embroidery placements</p>
                          {item.embroideryPlacements.length === 0 ? (
                            <p className="mt-1.5 text-sm text-ink-muted">Belum ada placement bordir.</p>
                          ) : (
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {item.embroideryPlacements.map((placement) => {
                                const preview = logoPreviews.find((logo) => logo.fileId === placement.logoFileId);
                                return (
                                  <div key={`${placement.zone}-${placement.logoFileId}`} className="rounded-2xl bg-white p-3 text-sm ring-1 ring-line">
                                    <div className="flex items-start gap-3">
                                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-line">
                                        {preview?.signedUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={preview.signedUrl} alt="" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                          <span className="px-2 text-center text-[10px] font-bold text-ink-muted">N/A</span>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-ink">{zoneLabel(placement.zone)}</p>
                                        <p className="truncate text-xs font-semibold text-ink-muted" title={placement.logoFileName}>
                                          {placement.logoFileName}
                                        </p>
                                        <p className="text-xs text-ink-muted">
                                          {embroideryTechniqueLabel(placement.technique)} · {placement.widthCm}×{placement.heightCm} cm · Rotasi {placement.rotation}°
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard icon={History} tone="neutral" title="Quotation events">
        {events.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Event table belum tersedia atau belum ada event Phase 17.
          </p>
        ) : (
          <ol className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ink">{event.eventType}</p>
                  <span className="text-xs font-semibold text-ink-muted">
                    {formatAdminDate(event.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-ink-muted">
                  {event.oldStatus ?? "-"} → {event.newStatus ?? "-"}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </AdminSectionCard>
    </div>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "text-lg font-extrabold text-ink" : "font-semibold text-ink"}>
        {formatRupiah(value ?? 0)}
      </dd>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
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

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-3 ring-1 ring-line">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}

function TechnicalSpecificationCard({
  garment,
}: {
  garment: TechnicalGarmentSpecification;
}) {
  const visibleSpecifications = garment.specifications.filter(
    (specification) => specification.status !== "not_used",
  );
  const sizeBreakdown = garment.sizeBreakdown.filter((entry) => entry.quantity > 0);
  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink">{garment.garmentType}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {garment.category} · {garment.quantity} pcs
          </p>
        </div>
        {garment.templateKey ? (
          <AdminBadge tone="brand">{garment.templateKey.replaceAll("_", " ")}</AdminBadge>
        ) : null}
      </div>
      {visibleSpecifications.length > 0 ? (
        <dl className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleSpecifications.map((specification) => (
            <div key={specification.key} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-bold text-ink-muted">{specification.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {specification.status === "recommendation"
                  ? "Minta rekomendasi Ofissio"
                  : [specification.option, specification.detail, specification.notes]
                      .filter(Boolean)
                      .join(" · ") || "Digunakan"}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {sizeBreakdown.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {sizeBreakdown.map((entry) => (
            <span key={`${garment.id}-${entry.size}`} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
              {entry.size}: {entry.quantity} pcs
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
