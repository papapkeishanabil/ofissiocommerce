import "server-only";

import type { DocumentTemplateId } from "./document.types";

function templateId(value: string | undefined, fallback: DocumentTemplateId) {
  const normalized = value?.trim();
  if (
    normalized === "quotation_default" ||
    normalized === "invoice_default" ||
    normalized === "invoice_ofissio_custom"
  ) {
    return normalized;
  }
  return fallback;
}

export function getDocumentRuntimeConfig() {
  return {
    defaultQuotationTemplate: templateId(
      process.env.DEFAULT_QUOTATION_TEMPLATE,
      "quotation_default",
    ),
    defaultInvoiceTemplate: templateId(
      process.env.DEFAULT_INVOICE_TEMPLATE,
      "invoice_ofissio_custom",
    ),
    companyLocationLabel:
      process.env.OFISSIO_INVOICE_LOCATION?.trim() ||
      "Kabupaten Bandung, Indonesia",
    signerName: process.env.OFISSIO_INVOICE_SIGNER_NAME?.trim() || "Triyadi Yuwono",
    signerTitle: process.env.OFISSIO_INVOICE_SIGNER_TITLE?.trim() || "Direktur",
    contactTel: process.env.OFISSIO_CONTACT_TEL?.trim() || "-",
    contactWeb: process.env.OFISSIO_CONTACT_WEB?.trim() || "www.ofissio.com",
    contactEmail:
      process.env.OFISSIO_CONTACT_EMAIL?.trim() || "halo@ofissio.com",
    signedUrlExpiresSeconds: Number(
      process.env.DOCUMENT_SIGNED_URL_EXPIRES_SECONDS || 3600,
    ),
  };
}
