import type {
  DesignApprovalSheetPdfData,
  DocumentTemplateId,
  EmbroideryWorkOrderPdfData,
  InvoicePdfData,
  ProductionWorkOrderPdfData,
  QuotationPdfData,
} from "../document.types";

export type PdfTemplateKind =
  | "quotation"
  | "invoice"
  | "embroidery_work_order"
  | "production_work_order"
  | "design_approval_sheet";

export interface PdfTemplate<TData = QuotationPdfData | InvoicePdfData | EmbroideryWorkOrderPdfData | ProductionWorkOrderPdfData | DesignApprovalSheetPdfData> {
  id: DocumentTemplateId;
  kind: PdfTemplateKind;
  label: string;
  render(data: TData): Uint8Array;
}

export interface PdfTextOptions {
  font?: "regular" | "bold" | "mono";
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
}
