import "server-only";

import { randomUUID } from "node:crypto";
import { isFinalQuotationStatus } from "@/features/quotation/quotation.utils";

import type {
  DocumentTemplateId,
  DocumentType,
  PublicDocumentRecord,
  DocumentRecord,
} from "./document.types";

const SMALL_NUMBERS = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

export function amountToIndonesianWords(amount: number): string {
  const rounded = Math.max(0, Math.round(Number(amount) || 0));
  if (rounded === 0) return "Nol Rupiah";
  return `${capitalize(words(rounded))} Rupiah`;
}

function words(value: number): string {
  if (value < 12) return SMALL_NUMBERS[value] ?? "";
  if (value < 20) return `${words(value - 10)} belas`;
  if (value < 100) {
    return joinWords(words(Math.floor(value / 10)), "puluh", words(value % 10));
  }
  if (value < 200) return joinWords("seratus", words(value - 100));
  if (value < 1000) {
    return joinWords(words(Math.floor(value / 100)), "ratus", words(value % 100));
  }
  if (value < 2000) return joinWords("seribu", words(value - 1000));
  if (value < 1_000_000) {
    return joinWords(words(Math.floor(value / 1000)), "ribu", words(value % 1000));
  }
  if (value < 1_000_000_000) {
    return joinWords(
      words(Math.floor(value / 1_000_000)),
      "juta",
      words(value % 1_000_000),
    );
  }
  if (value < 1_000_000_000_000) {
    return joinWords(
      words(Math.floor(value / 1_000_000_000)),
      "miliar",
      words(value % 1_000_000_000),
    );
  }
  return joinWords(
    words(Math.floor(value / 1_000_000_000_000)),
    "triliun",
    words(value % 1_000_000_000_000),
  );
}

function joinWords(...parts: string[]) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0));
}

export function formatInvoiceDate(value: string | Date | null | undefined) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function sizeMatrixSummary(sizeMatrix: Record<string, number>) {
  const summary = Object.entries(sizeMatrix)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([size, qty]) => `${size} ${qty}`)
    .join(", ");
  return summary || "-";
}

export function safeDocumentNumber(input: {
  documentType: DocumentType;
  sourceNumber?: string | null;
  date?: Date;
}) {
  const year = String((input.date ?? new Date()).getUTCFullYear());
  const source = input.sourceNumber?.trim();
  if (input.documentType === "quotation_pdf") {
    return source?.startsWith("OF-QUO") ? source : `OF-QUO-PDF-${year}-${shortId()}`;
  }
  if (input.documentType === "invoice_pdf") {
    const suffix = source ? source.replace(/[^a-z0-9]+/gi, "-").slice(-18) : shortId();
    return `INV-${year}-${suffix.toUpperCase()}`;
  }
  return `DOC-${year}-${shortId()}`;
}

export function buildDocumentStorageKey(input: {
  companyId: string;
  documentType: DocumentType;
  documentNumber: string;
  filename?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeCompanyId = safeSegment(input.companyId);
  const safeDocumentType = safeSegment(input.documentType);
  const safeNumber = safeSegment(input.documentNumber);
  const suffix = shortId();
  return [
    safeCompanyId,
    "documents",
    year,
    month,
    safeDocumentType,
    `${safeNumber}-${suffix}.pdf`,
  ].join("/");
}

export function publicDocument(record: DocumentRecord): PublicDocumentRecord {
  return {
    id: record.id,
    documentType: record.documentType,
    entityType: record.entityType,
    entityId: record.entityId,
    documentNumber: record.documentNumber,
    templateId: record.templateId,
    filename: record.filename,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    status: record.status,
    generatedAt: record.generatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function isQuotationFinalForPdf(status: string) {
  return isFinalQuotationStatus(status);
}

export function isInvoiceTemplate(templateId: DocumentTemplateId) {
  return templateId === "invoice_default" || templateId === "invoice_ofissio_custom";
}

export function isQuotationTemplate(templateId: DocumentTemplateId) {
  return templateId === "quotation_default";
}

function shortId() {
  return randomUUID().slice(0, 8).toUpperCase();
}

function safeSegment(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "document"
  );
}
