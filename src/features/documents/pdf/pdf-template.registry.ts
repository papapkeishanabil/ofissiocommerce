import "server-only";

import type {
  DocumentTemplateId,
  InvoicePdfData,
  QuotationPdfData,
} from "../document.types";
import type { PdfTemplate } from "./pdf.types";
import { invoiceDefaultTemplate } from "./templates/invoice-default.template";
import { invoiceOfissioCustomTemplate } from "./templates/invoice-ofissio-custom.template";
import { quotationDefaultTemplate } from "./templates/quotation-default.template";

const templates = {
  quotation_default: quotationDefaultTemplate,
  invoice_default: invoiceDefaultTemplate,
  invoice_ofissio_custom: invoiceOfissioCustomTemplate,
} satisfies Record<DocumentTemplateId, PdfTemplate>;

export function getDocumentTemplate(templateId: DocumentTemplateId) {
  return templates[templateId];
}

export function renderQuotationPdfByTemplate(
  templateId: DocumentTemplateId,
  data: QuotationPdfData,
) {
  const template = getDocumentTemplate(templateId);
  if (template.kind !== "quotation") {
    throw new Error("Template quotation tidak valid.");
  }
  return (template as PdfTemplate<QuotationPdfData>).render(data);
}

export function renderInvoicePdfByTemplate(
  templateId: DocumentTemplateId,
  data: InvoicePdfData,
) {
  const template = getDocumentTemplate(templateId);
  if (template.kind !== "invoice") {
    throw new Error("Template invoice tidak valid.");
  }
  return (template as PdfTemplate<InvoicePdfData>).render(data);
}

export const documentTemplateRegistry = templates;
