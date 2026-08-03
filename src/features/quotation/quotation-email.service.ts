import "server-only";

import { getEmailRuntimeConfig } from "@/features/email/email.config";
import {
  renderEmailItemCard,
  renderEmailMetaTable,
  renderEmailNotice,
  renderEmailSectionHeading,
  renderEmailSummary,
  renderOfissioEmail,
} from "@/features/email/email-brand.template";
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
  const subject = `Permintaan quotation diterima - ${input.quotation.code}`;
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
    .map((item) =>
      [
        `- ${item.productName} (${item.sku}), ${item.color}, ${item.totalQty} pcs, estimasi ${formatIDR(item.estimatedPrice)}`,
        `  Ukuran: ${sizeSummary(item.sizes)}`,
        `  Kustomisasi: ${item.customization || "Tidak ada"}`,
      ].join("\n"),
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
  const items = input.quotation.items
    .map(
      (item) =>
        renderEmailItemCard({
          title: item.productName,
          subtitle: `SKU ${item.sku} | Warna ${item.color}`,
          quantity: `${item.totalQty} pcs`,
          size: sizeSummary(item.sizes),
          customization: item.customization || "Tidak ada",
          amount: formatIDR(item.estimatedPrice),
        }),
    )
    .join("");

  return renderOfissioEmail({
    preheader: `Permintaan quotation ${input.quotation.code} telah diterima tim Ofissio.`,
    statusLabel: "Request diterima",
    statusTone: "success",
    title: "Permintaan Anda sudah kami terima",
    lead: `Halo ${input.picName}, tim Ofissio akan meninjau kebutuhan ${input.companyName} dan menyiapkan penawaran resmi.`,
    bodyHtml: `
      ${renderEmailMetaTable([
        { label: "Nomor quotation", value: input.quotation.code },
        { label: "Perusahaan", value: input.companyName },
        { label: "PIC", value: input.picName },
        { label: "Status", value: "Sedang ditinjau" },
      ])}
      ${renderEmailSectionHeading("Ringkasan permintaan", "Rincian berikut menjadi dasar peninjauan dan penyusunan penawaran final.")}
      ${items}
      ${renderEmailSummary({
        rows: [{ label: "Status harga", value: "Estimasi awal" }],
        totalLabel: "Estimasi subtotal",
        totalValue: formatIDR(subtotal),
      })}
      ${
        input.quotation.notes
          ? renderEmailNotice({
              title: "Catatan Anda",
              text: input.quotation.notes,
            })
          : ""
      }
      ${renderEmailNotice({
        title: "Tahap berikutnya",
        text: "Tim Ofissio akan memeriksa spesifikasi dan mengirim penawaran harga final melalui email berikutnya.",
        tone: "brand",
      })}
    `,
    footerNote: "Email ini merupakan konfirmasi penerimaan, bukan invoice atau penawaran harga final.",
  });
}

function sizeSummary(sizes: Record<string, number>) {
  const summary = Object.entries(sizes)
    .filter(([, quantity]) => quantity > 0)
    .map(([size, quantity]) => `${size}: ${quantity} pcs`)
    .join(", ");
  return summary || "Tidak ada";
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
