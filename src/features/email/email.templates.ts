import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { PaymentOrderRecord, PaymentRecord } from "@/features/payment/payment.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { quotationTaxLabel } from "@/features/quotation/quotation.utils";
import {
  embroideryTechniqueLabel,
  zoneLabel,
  type LogoPlacement,
} from "@/types/uniform-3d";

import {
  escapeHtml,
  renderEmailItemCard,
  renderEmailMetaTable,
  renderEmailNotice,
  renderEmailSectionHeading,
  renderEmailSummary,
  renderOfissioEmail,
} from "./email-brand.template";
import type { RenderedEmailTemplate } from "./email.types";

interface QuotationEmailContext {
  quotationNumber: string;
  companyName: string;
  picName: string;
  picEmail: string | null;
  picWhatsapp: string | null;
  customerNotes: string | null;
  items: ValidatedCheckoutCartItem[];
  createdAt: string;
  internalUrl: string;
  customerUrl: string;
}

type SizeSummaryItem = Pick<ValidatedCheckoutCartItem, "sizeMatrix">;
type EmbroiderySummaryItem = Pick<
  ValidatedCheckoutCartItem,
  "embroideryPlacements" | "embroideryLines" | "embroideryTotal"
>;
type QuotationSummaryItem = Pick<
  ValidatedCheckoutCartItem,
  | "productName"
  | "sku"
  | "selectedColor"
  | "totalQty"
  | "sizeMatrix"
  | "embroideryPlacements"
  | "embroideryLines"
  | "embroideryTotal"
> & {
  finalEstimatedTotal?: number | null;
  finalLineTotal?: number | null;
};

export function renderQuotationRequestToSales(
  ctx: QuotationEmailContext,
): RenderedEmailTemplate {
  const subject = `Request quotation baru - ${ctx.companyName} - ${ctx.quotationNumber}`;
  const itemLines = quotationItemText(ctx.items, false);
  const itemsHtml = ctx.items
    .map((item) =>
      renderEmailItemCard({
        title: item.productName,
        subtitle: `SKU ${item.sku} | Warna ${item.selectedColor}`,
        quantity: `${item.totalQty} pcs`,
        size: sizeSummary(item),
        ...embroideryEmailCardDetails(item, false),
      }),
    )
    .join("");
  const html = renderOfissioEmail({
    preheader: `${ctx.companyName} mengirim permintaan quotation ${ctx.quotationNumber}.`,
    statusLabel: "Perlu ditinjau",
    statusTone: "warning",
    title: "Request quotation baru",
    lead: `${ctx.companyName} mengirim kebutuhan seragam baru melalui Ofissio.`,
    bodyHtml: `
      ${renderEmailMetaTable([
        { label: "Quotation", value: ctx.quotationNumber },
        { label: "Diterima", value: formatEmailDateTime(ctx.createdAt) },
        { label: "PIC", value: ctx.picName },
        { label: "Email", value: ctx.picEmail ?? "-" },
        { label: "WhatsApp", value: ctx.picWhatsapp ?? "-" },
        { label: "Perusahaan", value: ctx.companyName },
      ])}
      ${renderEmailSectionHeading("Rincian kebutuhan", "Tinjau jumlah, ukuran, dan detail bordir sebelum menyiapkan penawaran final.")}
      ${itemsHtml}
      ${
        ctx.customerNotes
          ? renderEmailNotice({
              title: "Catatan customer",
              text: ctx.customerNotes,
              tone: "warning",
            })
          : ""
      }
    `,
    primaryAction: { label: "Buka quotation di Ofissio Admin", href: ctx.internalUrl },
    footerNote: "Email internal Ofissio. Pastikan pricing dan spesifikasi sudah lengkap sebelum penawaran dikirim ke customer.",
  });

  return {
    subject,
    text: [
      "Request Quotation Baru",
      "",
      `Quotation: ${ctx.quotationNumber}`,
      `Perusahaan: ${ctx.companyName}`,
      `PIC: ${ctx.picName}`,
      `Email: ${ctx.picEmail ?? "-"}`,
      `WhatsApp: ${ctx.picWhatsapp ?? "-"}`,
      `Diterima: ${formatEmailDateTime(ctx.createdAt)}`,
      "",
      "Rincian kebutuhan:",
      itemLines,
      ctx.customerNotes ? `Catatan customer: ${ctx.customerNotes}` : "",
      "",
      `Buka Ofissio Admin: ${ctx.internalUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html,
  };
}

export function renderQuotationConfirmationToCustomer(
  ctx: QuotationEmailContext,
): RenderedEmailTemplate {
  const subject = `Permintaan quotation diterima - ${ctx.quotationNumber}`;
  const itemLines = quotationItemText(ctx.items, false);
  const itemsHtml = ctx.items
    .map((item) =>
      renderEmailItemCard({
        title: item.productName,
        subtitle: `SKU ${item.sku} | Warna ${item.selectedColor}`,
        quantity: `${item.totalQty} pcs`,
        size: sizeSummary(item),
        ...embroideryEmailCardDetails(item, false),
      }),
    )
    .join("");
  const html = renderOfissioEmail({
    preheader: `Permintaan quotation ${ctx.quotationNumber} telah diterima tim Ofissio.`,
    statusLabel: "Request diterima",
    statusTone: "success",
    title: "Permintaan Anda sudah kami terima",
    lead: `Halo ${ctx.picName}, tim Ofissio akan meninjau kebutuhan ${ctx.companyName} dan menyiapkan penawaran resmi.`,
    bodyHtml: `
      ${renderEmailMetaTable([
        { label: "Nomor quotation", value: ctx.quotationNumber },
        { label: "Tanggal permintaan", value: formatEmailDate(ctx.createdAt) },
        { label: "Perusahaan", value: ctx.companyName },
        { label: "PIC", value: ctx.picName },
      ])}
      ${renderEmailSectionHeading("Ringkasan permintaan", "Data berikut menjadi dasar peninjauan tim sales Ofissio.")}
      ${itemsHtml}
      ${
        ctx.customerNotes
          ? renderEmailNotice({
              title: "Catatan Anda",
              text: ctx.customerNotes,
            })
          : ""
      }
      ${renderEmailNotice({
        title: "Apa yang terjadi berikutnya?",
        text: "Tim sales akan memeriksa spesifikasi, harga, dan kebutuhan produksi. Penawaran final akan dikirim melalui email berikutnya.",
        tone: "brand",
      })}
    `,
    primaryAction: { label: "Lihat status quotation", href: ctx.customerUrl },
    footerNote: "Email ini merupakan konfirmasi penerimaan, bukan invoice atau penawaran harga final.",
  });

  return {
    subject,
    text: [
      `Halo ${ctx.picName},`,
      "",
      `Permintaan quotation ${ctx.quotationNumber} untuk ${ctx.companyName} sudah diterima Ofissio.`,
      "",
      "Ringkasan permintaan:",
      itemLines,
      ctx.customerNotes ? `Catatan: ${ctx.customerNotes}` : "",
      "",
      "Tim sales Ofissio akan meninjau spesifikasi dan mengirim penawaran final melalui email berikutnya.",
      `Lihat status quotation: ${ctx.customerUrl}`,
      "",
      "Email ini bukan invoice atau penawaran harga final.",
    ]
      .filter(Boolean)
      .join("\n"),
    html,
  };
}

export function renderQuotationReadyToCustomer(
  quotation: QuotationRequestRecord,
  options: { customerUrl: string; pdfAvailable?: boolean } = {
    customerUrl: `/quotes/${quotation.id}`,
  },
): RenderedEmailTemplate {
  const subject = `Penawaran resmi Ofissio - ${quotation.quotationNumber}`;
  const itemLines = quotationItemText(quotation.items, true);
  const itemsHtml = quotation.items
    .map((item) =>
      renderEmailItemCard({
        title: item.productName,
        subtitle: `SKU ${item.sku} | Warna ${item.selectedColor}`,
        quantity: `${item.totalQty} pcs`,
        size: sizeSummary(item),
        ...embroideryEmailCardDetails(item, true),
        amount: formatMoney(item.finalLineTotal ?? 0),
      }),
    )
    .join("");
  const validUntil = quotation.validUntil
    ? formatEmailDate(quotation.validUntil)
    : "Mengikuti konfirmasi tim sales";
  const html = renderOfissioEmail({
    preheader: `Penawaran resmi ${quotation.quotationNumber} senilai ${formatMoney(quotation.grandTotal ?? 0)} siap ditinjau.`,
    statusLabel: "Penawaran final",
    statusTone: "success",
    title: "Penawaran Anda siap ditinjau",
    lead: `Halo ${quotation.picName}, penawaran resmi untuk kebutuhan ${quotation.companyName} telah selesai kami siapkan.`,
    bodyHtml: `
      ${renderEmailMetaTable([
        { label: "Nomor quotation", value: quotation.quotationNumber },
        { label: "Berlaku sampai", value: validUntil },
        { label: "Perusahaan", value: quotation.companyName },
        { label: "PIC", value: quotation.picName },
      ])}
      ${renderEmailSectionHeading("Rincian penawaran", "Harga berikut sudah mencakup konfigurasi produk dan customization yang tercantum.")}
      ${itemsHtml}
      ${renderEmailSummary({
        rows: [
          { label: "Subtotal", value: formatMoney(quotation.subtotal ?? 0) },
          { label: "Diskon", value: formatMoney(quotation.discountTotal), muted: quotation.discountTotal === 0 },
          { label: quotationTaxLabel(quotation), value: formatMoney(quotation.taxTotal), muted: quotation.taxTotal === 0 },
          { label: "Ongkir estimasi", value: formatMoney(quotation.shippingEstimate), muted: quotation.shippingEstimate === 0 },
        ],
        totalLabel: "Grand total",
        totalValue: formatMoney(quotation.grandTotal ?? 0),
      })}
      ${
        quotation.customerMessage
          ? renderEmailNotice({
              title: "Catatan penawaran",
              text: quotation.customerMessage,
            })
          : ""
      }
      ${renderEmailNotice({
        title: options.pdfAvailable ? "PDF penawaran tersedia" : "Dokumen PDF sedang disiapkan",
        text: options.pdfAvailable
          ? "PDF final dapat diunduh secara aman dari halaman quotation Ofissio."
          : "PDF akan tersedia di halaman quotation setelah dokumen selesai dibuat oleh tim Ofissio.",
        tone: options.pdfAvailable ? "success" : "warning",
      })}
    `,
    primaryAction: {
      label: "Lihat dan tanggapi penawaran",
      href: options.customerUrl,
    },
    footerNote: `Penawaran berlaku sampai ${validUntil}. Dari portal, Anda dapat menerima, menolak, atau meminta revisi penawaran.`,
  });

  return {
    subject,
    text: [
      `Halo ${quotation.picName},`,
      "",
      `Penawaran resmi Ofissio ${quotation.quotationNumber} untuk ${quotation.companyName} sudah siap ditinjau.`,
      "",
      "Rincian penawaran:",
      itemLines,
      "",
      `Subtotal: ${formatMoney(quotation.subtotal ?? 0)}`,
      `Diskon: ${formatMoney(quotation.discountTotal)}`,
      `${quotationTaxLabel(quotation)}: ${formatMoney(quotation.taxTotal)}`,
      `Ongkir estimasi: ${formatMoney(quotation.shippingEstimate)}`,
      `Grand total: ${formatMoney(quotation.grandTotal ?? 0)}`,
      `Berlaku sampai: ${validUntil}`,
      quotation.customerMessage ? `Catatan: ${quotation.customerMessage}` : "",
      "",
      `Lihat dan tanggapi penawaran: ${options.customerUrl}`,
      options.pdfAvailable
        ? "PDF final tersedia di halaman quotation."
        : "PDF akan tersedia setelah dokumen selesai dibuat tim Ofissio.",
    ]
      .filter(Boolean)
      .join("\n"),
    html,
  };
}

export function renderTestEmail(): RenderedEmailTemplate {
  return {
    subject: "[Ofissio Staging] Test Email",
    text: "Ini adalah test email Ofissio. Konfigurasi pengiriman email berhasil digunakan.",
    html: renderOfissioEmail({
      preheader: "Konfigurasi pengiriman email Ofissio berhasil digunakan.",
      statusLabel: "Test berhasil",
      statusTone: "success",
      title: "Email Ofissio siap digunakan",
      lead: "Pesan ini memastikan konfigurasi provider email dapat mengirim template transactional Ofissio.",
      bodyHtml: renderEmailNotice({
        title: "Konfigurasi terhubung",
        text: "Jika Anda menerima email ini, jalur pengiriman email staging Ofissio telah berfungsi.",
        tone: "success",
      }),
      footerNote: "Email test ini tidak berkaitan dengan quotation, order, atau pembayaran customer.",
    }),
  };
}

export function renderInvoiceReadyToCustomer(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord | null;
  invoiceNumber: string;
  portalUrl: string;
}): RenderedEmailTemplate {
  const orderNumber = input.order.orderNumber ?? input.order.id;
  const paymentStatus = paymentStatusLabel(
    input.payment?.status ?? input.order.status,
  );
  const expiry = input.payment?.expiredAt
    ? formatEmailDateTime(input.payment.expiredAt)
    : "Mengikuti instruksi pembayaran";
  const primaryAction = input.payment?.paymentUrl
    ? { label: "Bayar invoice", href: input.payment.paymentUrl }
    : { label: "Buka portal order", href: input.portalUrl };
  const secondaryAction = input.payment?.paymentUrl
    ? { label: "Lihat detail order dan invoice", href: input.portalUrl }
    : undefined;
  const html = renderOfissioEmail({
    preheader: `Invoice ${input.invoiceNumber} senilai ${formatMoney(input.order.calculation.grandTotal)} telah tersedia.`,
    statusLabel: paymentStatus,
    statusTone: input.payment?.status === "paid" ? "success" : "warning",
    title: "Invoice Anda sudah tersedia",
    lead: `Invoice resmi untuk order ${orderNumber} telah diterbitkan dan dapat diakses melalui portal Ofissio.`,
    bodyHtml: `
      ${renderEmailMetaTable([
        { label: "Nomor invoice", value: input.invoiceNumber },
        { label: "Nomor order", value: orderNumber },
        { label: "Status pembayaran", value: paymentStatus },
        { label: "Batas pembayaran", value: expiry },
      ])}
      ${renderEmailSummary({
        rows: [
          { label: "Status pembayaran", value: paymentStatus },
          { label: "Provider", value: input.payment?.provider ?? "Menunggu konfirmasi" },
        ],
        totalLabel: "Total tagihan",
        totalValue: formatMoney(input.order.calculation.grandTotal),
      })}
      ${renderEmailNotice({
        title: input.payment?.paymentUrl ? "Tautan pembayaran tersedia" : "Instruksi pembayaran sedang disiapkan",
        text: input.payment?.paymentUrl
          ? `Gunakan tombol Bayar Invoice sebelum ${expiry}.`
          : "Tim Ofissio akan mengonfirmasi tautan dan instruksi pembayaran.",
        tone: input.payment?.paymentUrl ? "brand" : "warning",
      })}
    `,
    primaryAction,
    secondaryAction,
    footerNote: "PDF invoice dapat diunduh dari portal Ofissio agar dokumen tetap terlindungi sesuai akses perusahaan Anda.",
  });

  return {
    subject: `Invoice Ofissio tersedia - ${input.invoiceNumber}`,
    text: [
      `Invoice ${input.invoiceNumber} untuk order ${orderNumber} sudah tersedia.`,
      `Total tagihan: ${formatMoney(input.order.calculation.grandTotal)}`,
      `Status pembayaran: ${paymentStatus}`,
      input.payment?.paymentUrl
        ? `Bayar invoice: ${input.payment.paymentUrl}`
        : "Instruksi pembayaran sedang disiapkan tim Ofissio.",
      `Batas pembayaran: ${expiry}`,
      `Portal order: ${input.portalUrl}`,
    ].join("\n"),
    html,
  };
}

export function renderPaymentReceivedToCustomer(input: {
  order: PaymentOrderRecord;
  payment: PaymentRecord;
  trackingUrl: string;
}): RenderedEmailTemplate {
  const orderNumber = input.order.orderNumber ?? input.order.id;
  const paidAt = input.payment.paidAt
    ? formatEmailDateTime(input.payment.paidAt)
    : "Terkonfirmasi";
  const html = renderOfissioEmail({
    preheader: `Pembayaran ${formatMoney(input.payment.amount)} untuk order ${orderNumber} telah diterima.`,
    statusLabel: "Pembayaran diterima",
    statusTone: "success",
    title: "Pembayaran berhasil dikonfirmasi",
    lead: `Terima kasih. Pembayaran untuk order ${orderNumber} telah kami terima dan proses order akan dilanjutkan.`,
    bodyHtml: `
      ${renderEmailMetaTable([
        { label: "Nomor order", value: orderNumber },
        { label: "Tanggal pembayaran", value: paidAt },
        { label: "Referensi pembayaran", value: input.payment.referenceId },
        { label: "Status", value: "Lunas" },
      ])}
      ${renderEmailSummary({
        rows: [{ label: "Status", value: "Pembayaran diterima" }],
        totalLabel: "Nominal diterima",
        totalValue: formatMoney(input.payment.amount),
      })}
      ${renderEmailNotice({
        title: "Order dilanjutkan",
        text: "Tim Ofissio akan melanjutkan fulfillment, customization, atau produksi sesuai rute order Anda.",
        tone: "success",
      })}
    `,
    primaryAction: { label: "Lihat progres order", href: input.trackingUrl },
    footerNote: "Simpan email ini sebagai konfirmasi pembayaran. Status terbaru selalu tersedia di portal Ofissio.",
  });

  return {
    subject: `Pembayaran dikonfirmasi - ${orderNumber}`,
    text: [
      `Pembayaran untuk order ${orderNumber} sudah diterima.`,
      `Nominal: ${formatMoney(input.payment.amount)}`,
      `Tanggal pembayaran: ${paidAt}`,
      "Tim Ofissio akan melanjutkan proses order sesuai routing.",
      `Lihat progres order: ${input.trackingUrl}`,
    ].join("\n"),
    html,
  };
}

function quotationItemText(
  items: QuotationSummaryItem[],
  includePrice: boolean,
) {
  return items
    .map((item) =>
      [
        `- ${item.productName} (${item.sku}), ${item.selectedColor}, ${item.totalQty} pcs`,
        `  Ukuran: ${sizeSummary(item)}`,
        `  Detail bordir: ${embroiderySummary(item)}`,
        item.embroideryPlacements.length > 0
          ? `  Biaya bordir: ${embroideryPricingSummary(item)}`
          : null,
        includePrice
          ? `  Total item: ${formatMoney(
              item.finalLineTotal ?? item.finalEstimatedTotal ?? 0,
            )}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}

function sizeSummary(item: SizeSummaryItem) {
  const summary = Object.entries(item.sizeMatrix)
    .filter(([, qty]) => qty > 0)
    .map(([size, qty]) => `${size}: ${qty} pcs`)
    .join(", ");
  return summary || "Tidak ada";
}

function embroideryPlacementSummary(placement: LogoPlacement) {
  return [
    zoneLabel(placement.zone),
    embroideryTechniqueLabel(placement.technique),
    `${placement.widthCm}x${placement.heightCm} cm`,
    `rotasi ${placement.rotation} deg`,
    `file ${placement.logoFileName}`,
    placement.notes?.trim() ? `catatan: ${placement.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function embroiderySummary(
  item: Pick<EmbroiderySummaryItem, "embroideryPlacements">,
) {
  if (item.embroideryPlacements.length === 0) return "Tidak ada";
  return item.embroideryPlacements
    .map(embroideryPlacementSummary)
    .join("; ");
}

function embroideryPricingSummary(item: EmbroiderySummaryItem) {
  if (item.embroideryPlacements.length === 0) return "Tidak ada biaya bordir";
  if (item.embroideryLines.length === 0) {
    return "Biaya bordir akan dikonfirmasi tim Ofissio";
  }
  const lines = item.embroideryLines
    .map(
      (line) =>
        `${line.label}: ${line.quantity} pcs x ${formatMoney(line.unitPrice)} = ${formatMoney(line.subtotal)}`,
    )
    .join("; ");
  return `${lines}. Total bordir: ${formatMoney(item.embroideryTotal)}`;
}

function embroideryEmailCardDetails(
  item: EmbroiderySummaryItem,
  includePricing: boolean,
) {
  if (item.embroideryPlacements.length === 0) {
    return { customization: "Tidak ada bordir" };
  }

  return {
    customizationItems: item.embroideryPlacements.map((placement) => {
      const pricingZone =
        placement.zone === "middle_back" ? "center_back" : placement.zone;
      const priceLine = item.embroideryLines.find(
        (line) => line.zoneId === pricingZone,
      );
      const setupFee =
        priceLine?.setupFeeApplied && priceLine.setupFee > 0
          ? ` + setup ${formatMoney(priceLine.setupFee)}`
          : "";

      return {
        zone: zoneLabel(placement.zone),
        technique: embroideryTechniqueLabel(placement.technique),
        dimensions: `${placement.widthCm} × ${placement.heightCm} cm`,
        rotation: `${placement.rotation}°`,
        fileName: placement.logoFileName,
        notes: placement.notes?.trim() || null,
        priceFormula:
          includePricing && priceLine
            ? `${priceLine.quantity} pcs × ${formatMoney(priceLine.unitPrice)}${setupFee}`
            : includePricing
              ? "Harga dikonfirmasi tim Ofissio"
              : null,
        subtotal:
          includePricing && priceLine ? formatMoney(priceLine.subtotal) : null,
      };
    }),
    customizationTotal: includePricing
      ? formatMoney(item.embroideryTotal)
      : null,
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEmailDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatEmailDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(date);
}

function paymentStatusLabel(value: string) {
  if (value === "paid" || value === "payment_received") return "Lunas";
  if (value === "failed") return "Pembayaran gagal";
  if (value === "cancelled") return "Dibatalkan";
  return "Menunggu pembayaran";
}

export { escapeHtml };
