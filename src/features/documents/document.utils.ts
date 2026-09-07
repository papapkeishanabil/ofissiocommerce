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
  processRoute?: "fulfillment" | "customization" | "production" | null;
  sequence?: number;
  date?: Date;
}) {
  const date = input.date ?? new Date();
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const period = `${year.slice(-2)}${month}`;
  const source = input.sourceNumber?.trim();
  if (input.documentType === "quotation_pdf") {
    if (source) return source;
    return `QUO-${processRouteCode(input.processRoute)}-${period}-${formatSequence(input.sequence)}`;
  }
  if (input.documentType === "invoice_pdf") {
    return `INV-${processRouteCode(input.processRoute)}-${period}-${formatSequence(input.sequence)}`;
  }
  if (input.documentType === "embroidery_work_order_pdf") {
    return `BWO-CUS-${period}-${formatSequence(input.sequence)}`;
  }
  if (input.documentType === "production_work_order_pdf") {
    return `PWO-PRO-${period}-${formatSequence(input.sequence)}`;
  }
  if (input.documentType === "design_approval_sheet_pdf") {
    return `DAS-PRO-${period}-${formatSequence(input.sequence)}`;
  }
  return `DOC-${year}-${shortId()}`;
}

export function processRouteCode(
  route: "fulfillment" | "customization" | "production" | null | undefined,
) {
  if (route === "customization") return "CUS";
  if (route === "production") return "PRO";
  return "STK";
}

export function nextMonthlyDocumentSequence(input: {
  existingNumbers: string[];
  prefix: "QUO" | "INV" | "BWO" | "PWO" | "DAS";
  processRoute: "fulfillment" | "customization" | "production";
  date?: Date;
}) {
  const date = input.date ?? new Date();
  const routeCode = processRouteCode(input.processRoute);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const stem = `${input.prefix}-${routeCode}-${year.slice(-2)}${month}-`;
  const legacyRouteCode = routeCode === "STK" ? "FUL" : routeCode;
  const legacyStem = `${input.prefix}/OFS/${legacyRouteCode}/${year}/${month}/`;
  const highest = input.existingNumbers.reduce((max, number) => {
    const matchedStem = number.startsWith(stem)
      ? stem
      : number.startsWith(legacyStem)
        ? legacyStem
        : null;
    if (!matchedStem) return max;
    const sequence = Number(number.slice(matchedStem.length));
    return Number.isInteger(sequence) && sequence > max ? sequence : max;
  }, 0);
  return highest + 1;
}

function formatSequence(sequence: number | undefined) {
  return String(Math.max(1, sequence ?? 1)).padStart(3, "0");
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

export function isEmbroideryWorkOrderTemplate(templateId: DocumentTemplateId) {
  return templateId === "embroidery_work_order_ofissio";
}

export function isProductionWorkOrderTemplate(templateId: DocumentTemplateId) {
  return templateId === "production_work_order_ofissio";
}

export function isDesignApprovalSheetTemplate(templateId: DocumentTemplateId) {
  return templateId === "design_approval_sheet_ofissio";
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
