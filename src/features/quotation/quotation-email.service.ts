import "server-only";

import { getEmailRuntimeConfig } from "@/features/email/email.config";
import { sendEmail } from "@/features/email/email.service";
import type { EmailProvider } from "@/features/email/email.types";
import { logAuditEvent } from "@/lib/security/audit-log";
import { formatIDR } from "@/types/product";

import type { quotationEmailRequestSchema } from "./quotation-email.validation";
import type { z } from "zod";

export type QuotationEmailStatus = "sent" | "mock" | "failed";

export interface QuotationEmailResult {
  status: QuotationEmailStatus;
  recipientEmail: string;
  provider: EmailProvider;
  message: string;
}

type QuotationEmailInput = z.infer<typeof quotationEmailRequestSchema>;

export async function sendQuotationEmail(
  input: QuotationEmailInput,
  request?: Request,
): Promise<QuotationEmailResult> {
  const config = getEmailRuntimeConfig();
  const recipientEmail = input.picEmail;
  const subject = `[Ofissio] Request quotation ${input.quotation.code}`;
  const text = buildText(input);
  const html = buildHtml(input);

  const recipients = uniqueEmails([
    recipientEmail,
    config.salesQuotationEmail ?? "",
  ]);

  try {
    const result = await sendEmail({
      type: "quotation_confirmation_customer",
      companyId: input.companyId,
      userId: input.userId,
      to: recipients,
      subject,
      text,
      html,
      safeMetadata: {
        quotationId: input.quotation.id,
        quotationNumber: input.quotation.code,
        flow: "legacy_quotation_confirmation",
      },
      request,
    });
    const sent = result.status === "sent";
    const mocked = result.status === "mocked";
    return {
      status: sent ? "sent" : mocked ? "mock" : "failed",
      recipientEmail,
      provider: result.provider,
      message: sent
        ? `Email quotation dikirim ke ${recipientEmail}.`
        : mocked
          ? "Request quotation tercatat. Email masih menggunakan provider mock."
          : "Request quotation tercatat, tetapi email belum berhasil dikirim. Tim perlu cek konfigurasi email.",
    };
  } catch {
    logAuditEvent({
      request,
      actorId: input.userId,
      actorType: "customer",
      companyId: input.companyId,
      action: "quotation_email_failed",
      entityType: "quotation",
      entityId: input.quotation.id,
      metadata: { provider: config.provider, recipientEmail },
    });
    return {
      status: "failed",
      recipientEmail,
      provider: config.provider,
      message:
        "Request quotation tercatat, tetapi email belum berhasil dikirim. Tim perlu cek konfigurasi email.",
    };
  }
}

function buildText(input: QuotationEmailInput) {
  const subtotal = input.quotation.items.reduce(
    (total, item) => total + item.estimatedPrice,
    0,
  );
  const lines = input.quotation.items
    .map(
      (item) =>
        `- ${item.productName} (${item.sku}), ${item.color}, ${item.totalQty} pcs, estimasi ${formatIDR(item.estimatedPrice)}`,
    )
    .join("\n");

  return [
    `Halo ${input.picName},`,
    "",
    `Request quotation ${input.quotation.code} dari ${input.companyName} sudah diterima Ofissio.`,
    "",
    "Item:",
    lines,
    "",
    `Estimasi subtotal: ${formatIDR(subtotal)}`,
    input.quotation.notes ? `Catatan: ${input.quotation.notes}` : "",
    "",
    "Tim Ofissio akan meninjau kebutuhan ini dan menyiapkan penawaran resmi.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtml(input: QuotationEmailInput) {
  const subtotal = input.quotation.items.reduce(
    (total, item) => total + item.estimatedPrice,
    0,
  );
  const rows = input.quotation.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.color)}</td>
          <td style="text-align:right">${item.totalQty} pcs</td>
          <td style="text-align:right">${formatIDR(item.estimatedPrice)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h2>Request quotation ${escapeHtml(input.quotation.code)}</h2>
      <p>Halo ${escapeHtml(input.picName)}, request quotation dari <strong>${escapeHtml(input.companyName)}</strong> sudah diterima Ofissio.</p>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#e5e7eb;width:100%;font-size:13px">
        <thead>
          <tr>
            <th align="left">Produk</th>
            <th align="left">SKU</th>
            <th align="left">Warna</th>
            <th align="right">Qty</th>
            <th align="right">Estimasi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Estimasi subtotal:</strong> ${formatIDR(subtotal)}</p>
      ${
        input.quotation.notes
          ? `<p><strong>Catatan:</strong> ${escapeHtml(input.quotation.notes)}</p>`
          : ""
      }
      <p>Tim Ofissio akan meninjau kebutuhan ini dan menyiapkan penawaran resmi.</p>
    </div>
  `;
}

function uniqueEmails(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
    ),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
