import type {
  DocumentTemplateId,
  InvoicePdfData,
  QuotationPdfData,
} from "../document.types";

export type PdfTemplateKind = "quotation" | "invoice";

export interface PdfTemplate<TData = QuotationPdfData | InvoicePdfData> {
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
