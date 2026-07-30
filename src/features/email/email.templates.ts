import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
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

function sizeSummary(item: ValidatedCheckoutCartItem) {
  return Object.entries(item.sizeMatrix)
    .filter(([, qty]) => qty > 0)
    .map(([size, qty]) => `${size}: ${qty}`)
    .join(", ");
}

function embroiderySummary(item: ValidatedCheckoutCartItem) {
  if (item.embroideryPlacements.length === 0) return "Tidak ada";
  return item.embroideryPlacements
    .map(
      (placement) =>
        `${placement.zone} (${placement.widthCm}x${placement.heightCm} cm, ${placement.logoFileName}, ${placement.logoFileId})`,
    )
    .join("; ");
}

export function renderQuotationRequestToSales(
  ctx: QuotationEmailContext,
): RenderedEmailTemplate {
  const subject = `Request Quotation Baru - ${ctx.companyName}`;
  const itemLines = ctx.items
    .map(
      (item) =>
        `- ${item.productName} / ${item.sku} / ${item.selectedColor} / ${item.totalQty} pcs / ${sizeSummary(item)} / Bordir: ${embroiderySummary(item)}`,
    )
    .join("\n");
  const rows = ctx.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.selectedColor)}</td>
          <td style="text-align:right">${item.totalQty} pcs</td>
          <td>${escapeHtml(sizeSummary(item))}</td>
          <td>${escapeHtml(embroiderySummary(item))}</td>
        </tr>
      `,
    )
    .join("");

  return {
    subject,
    text: [
      `Request Quotation Baru - ${ctx.companyName}`,
      "",
      `Quotation: ${ctx.quotationNumber}`,
      `PIC: ${ctx.picName}`,
      `Email: ${ctx.picEmail ?? "-"}`,
      `WhatsApp: ${ctx.picWhatsapp ?? "-"}`,
      `Dibuat: ${ctx.createdAt}`,
      "",
      "Item:",
      itemLines,
      "",
      ctx.customerNotes ? `Catatan: ${ctx.customerNotes}` : "",
      `Internal placeholder: ${ctx.internalUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
        <h2>Request Quotation Baru</h2>
        <p><strong>${escapeHtml(ctx.companyName)}</strong> mengirim request quotation.</p>
        <ul>
          <li>Quotation: ${escapeHtml(ctx.quotationNumber)}</li>
          <li>PIC: ${escapeHtml(ctx.picName)}</li>
          <li>Email: ${escapeHtml(ctx.picEmail ?? "-")}</li>
          <li>WhatsApp: ${escapeHtml(ctx.picWhatsapp ?? "-")}</li>
          <li>Timestamp: ${escapeHtml(ctx.createdAt)}</li>
        </ul>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#e5e7eb;width:100%;font-size:13px">
          <thead>
            <tr>
              <th align="left">Produk</th>
              <th align="left">SKU</th>
              <th align="left">Warna</th>
              <th align="right">Qty</th>
              <th align="left">Size matrix</th>
              <th align="left">Bordir</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${
          ctx.customerNotes
            ? `<p><strong>Catatan customer:</strong> ${escapeHtml(ctx.customerNotes)}</p>`
            : ""
        }
        <p><a href="${escapeHtml(ctx.internalUrl)}">Buka dashboard internal placeholder</a></p>
      </div>
    `,
  };
}

export function renderQuotationConfirmationToCustomer(
  ctx: QuotationEmailContext,
): RenderedEmailTemplate {
  const subject = "Request Quotation Ofissio Diterima";
  const itemLines = ctx.items
    .map((item) => `- ${item.productName} (${item.sku}), ${item.totalQty} pcs`)
    .join("\n");
  const rows = ctx.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.selectedColor)}</td>
          <td style="text-align:right">${item.totalQty} pcs</td>
          <td>${escapeHtml(embroiderySummary(item))}</td>
        </tr>
      `,
    )
    .join("");

  return {
    subject,
    text: [
      `Halo ${ctx.picName},`,
      "",
      `Request quotation ${ctx.quotationNumber} untuk ${ctx.companyName} sudah diterima Ofissio.`,
      "",
      "Ringkasan:",
      itemLines,
      "",
      ctx.customerNotes ? `Catatan: ${ctx.customerNotes}` : "",
      "",
      "Tim sales Ofissio akan menghubungi Bapak/Ibu untuk konfirmasi harga final dan detail produksi.",
      "Harga final akan dikonfirmasi oleh tim sales; email ini bukan invoice.",
      `Link quotation: ${ctx.customerUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
        <h2>Request Quotation Ofissio Diterima</h2>
        <p>Halo ${escapeHtml(ctx.picName)}, request quotation untuk <strong>${escapeHtml(ctx.companyName)}</strong> sudah kami terima.</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#e5e7eb;width:100%;font-size:13px">
          <thead>
            <tr>
              <th align="left">Produk</th>
              <th align="left">SKU</th>
              <th align="left">Warna</th>
              <th align="right">Qty</th>
              <th align="left">Kustomisasi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${
          ctx.customerNotes
            ? `<p><strong>Catatan:</strong> ${escapeHtml(ctx.customerNotes)}</p>`
            : ""
        }
        <p>Tim sales Ofissio akan menghubungi Bapak/Ibu untuk konfirmasi harga final dan detail produksi.</p>
        <p><a href="${escapeHtml(ctx.customerUrl)}">Buka status quotation</a></p>
        <p style="font-size:12px;color:#64748b">Harga final akan dikonfirmasi oleh tim sales; email ini bukan invoice.</p>
      </div>
    `,
  };
}

export function renderQuotationReadyToCustomer(
  quotation: QuotationRequestRecord,
  options: { customerUrl: string } = { customerUrl: `/quotes/${quotation.id}` },
): RenderedEmailTemplate {
  const subject = `Penawaran Ofissio ${quotation.quotationNumber} siap direview`;
  const itemLines = quotation.items
    .map(
      (item) =>
        `- ${item.productName} (${item.sku}), ${item.selectedColor}, ${item.totalQty} pcs, ${formatMoney(item.finalLineTotal ?? 0)}`,
    )
    .join("\n");
  const rows = quotation.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.selectedColor)}</td>
          <td style="text-align:right">${item.totalQty} pcs</td>
          <td style="text-align:right">${formatMoney(item.finalLineTotal ?? 0)}</td>
        </tr>
      `,
    )
    .join("");

  return {
    subject,
    text: [
      `Halo ${quotation.picName},`,
      "",
      `Penawaran Ofissio ${quotation.quotationNumber} untuk ${quotation.companyName} sudah siap direview.`,
      "",
      "Ringkasan item:",
      itemLines,
      "",
      `Subtotal: ${formatMoney(quotation.subtotal ?? 0)}`,
      `Diskon: ${formatMoney(quotation.discountTotal)}`,
      `Pajak: ${formatMoney(quotation.taxTotal)}`,
      `Ongkir estimasi: ${formatMoney(quotation.shippingEstimate)}`,
      `Grand total: ${formatMoney(quotation.grandTotal ?? 0)}`,
      quotation.validUntil ? `Berlaku sampai: ${quotation.validUntil}` : "",
      "",
      quotation.customerMessage ?? "Silakan buka halaman quotation untuk accept/reject penawaran.",
      options.customerUrl,
      "",
      "Masa berlaku mengikuti tanggal valid until di atas. Jika ada revisi, gunakan tombol request revision pada halaman quotation.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
        <h2>Penawaran Ofissio siap direview</h2>
        <p>Halo ${escapeHtml(quotation.picName)}, penawaran <strong>${escapeHtml(quotation.quotationNumber)}</strong> untuk ${escapeHtml(quotation.companyName)} sudah siap.</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#e5e7eb;width:100%;font-size:13px">
          <thead>
            <tr>
              <th align="left">Produk</th>
              <th align="left">SKU</th>
              <th align="left">Warna</th>
              <th align="right">Qty</th>
              <th align="right">Final</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p><strong>Grand total:</strong> ${formatMoney(quotation.grandTotal ?? 0)}</p>
        ${quotation.validUntil ? `<p>Berlaku sampai: ${escapeHtml(quotation.validUntil)}</p>` : ""}
        ${quotation.customerMessage ? `<p>${escapeHtml(quotation.customerMessage)}</p>` : ""}
        <p><a href="${escapeHtml(options.customerUrl)}">Buka quotation dan pilih accept/reject</a></p>
        <p style="font-size:12px;color:#64748b">PDF quotation final dan attachment email belum aktif pada Phase 21. Masa berlaku mengikuti tanggal valid until.</p>
      </div>
    `,
  };
}

export function renderTestEmail(): RenderedEmailTemplate {
  return {
    subject: "[Ofissio Staging] Test Email",
    text: "Ini adalah test email Ofissio. Jika EMAIL_PROVIDER=mock, email ini hanya tercatat di log.",
    html: "<p>Ini adalah test email Ofissio. Jika <strong>EMAIL_PROVIDER=mock</strong>, email ini hanya tercatat di log.</p>",
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
