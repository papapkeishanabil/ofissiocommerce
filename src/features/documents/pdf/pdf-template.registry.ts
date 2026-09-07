import "server-only";

import type {
  DesignApprovalSheetPdfData,
  DocumentTemplateId,
  EmbroideryWorkOrderPdfData,
  InvoicePdfData,
  ProductionWorkOrderPdfData,
  QuotationPdfData,
} from "../document.types";
import type { PdfTemplate } from "./pdf.types";
import { invoiceDefaultTemplate } from "./templates/invoice-default.template";
import { invoiceOfissioCustomTemplate } from "./templates/invoice-ofissio-custom.template";
import { quotationDefaultTemplate } from "./templates/quotation-default.template";
import { embroideryWorkOrderOfissioTemplate } from "./templates/embroidery-work-order-ofissio.template";
import { productionWorkOrderOfissioTemplate } from "./templates/production-work-order-ofissio.template";
import { designApprovalSheetOfissioTemplate } from "./templates/design-approval-sheet-ofissio.template";

const templates = {
  quotation_default: quotationDefaultTemplate,
  invoice_default: invoiceDefaultTemplate,
  invoice_ofissio_custom: invoiceOfissioCustomTemplate,
  embroidery_work_order_ofissio: embroideryWorkOrderOfissioTemplate,
  production_work_order_ofissio: productionWorkOrderOfissioTemplate,
  design_approval_sheet_ofissio: designApprovalSheetOfissioTemplate,
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

export function renderEmbroideryWorkOrderPdfByTemplate(
  templateId: DocumentTemplateId,
  data: EmbroideryWorkOrderPdfData,
) {
  const template = getDocumentTemplate(templateId);
  if (template.kind !== "embroidery_work_order") {
    throw new Error("Template Bordir Work Order tidak valid.");
  }
  return (template as PdfTemplate<EmbroideryWorkOrderPdfData>).render(data);
}

export function renderProductionWorkOrderPdfByTemplate(
  templateId: DocumentTemplateId,
  data: ProductionWorkOrderPdfData,
) {
  const template = getDocumentTemplate(templateId);
  if (template.kind !== "production_work_order") throw new Error("Template Production Work Order tidak valid.");
  return (template as PdfTemplate<ProductionWorkOrderPdfData>).render(data);
}

export function renderDesignApprovalSheetPdfByTemplate(
  templateId: DocumentTemplateId,
  data: DesignApprovalSheetPdfData,
) {
  const template = getDocumentTemplate(templateId);
  if (template.kind !== "design_approval_sheet") {
    throw new Error("Template Lembar Approval Desain tidak valid.");
  }
  return (template as PdfTemplate<DesignApprovalSheetPdfData>).render(data);
}

export const documentTemplateRegistry = templates;
