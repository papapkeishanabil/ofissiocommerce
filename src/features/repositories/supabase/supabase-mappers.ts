import "server-only";

import type { CompanyLogoRegistration } from "@/features/company-assets/company-assets.types";
import type { EmailLog } from "@/features/email/email.types";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { UploadedFile } from "@/features/storage/storage.types";

type Row = Record<string, unknown>;

export function uploadedFileToRow(file: UploadedFile): Row {
  return {
    id: file.id,
    company_id: file.companyId,
    user_id: file.userId,
    file_type: file.fileType,
    original_filename: file.originalFilename,
    safe_filename: file.safeFilename,
    storage_bucket: file.storageBucket,
    storage_key: file.storageKey,
    mime_type: file.mimeType,
    extension: file.extension,
    size_bytes: file.sizeBytes,
    status: file.status,
    public_url: file.publicUrl,
    signed_url_expires_at: file.signedUrlExpiresAt,
    metadata_json: file.metadata,
    created_at: file.createdAt,
    updated_at: file.updatedAt,
  };
}

export function rowToUploadedFile(row: Row): UploadedFile {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    userId: String(row.user_id),
    fileType: row.file_type as UploadedFile["fileType"],
    originalFilename: String(row.original_filename),
    safeFilename: String(row.safe_filename),
    storageBucket: String(row.storage_bucket),
    storageKey: String(row.storage_key),
    mimeType: String(row.mime_type),
    extension: String(row.extension),
    sizeBytes: Number(row.size_bytes),
    status: row.status as UploadedFile["status"],
    publicUrl: row.public_url ? String(row.public_url) : null,
    signedUrlExpiresAt: row.signed_url_expires_at
      ? String(row.signed_url_expires_at)
      : null,
    metadata: objectOrEmpty(row.metadata_json),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function companyLogoToRow(logo: CompanyLogoRegistration): Row {
  return {
    id: logo.id,
    company_id: logo.companyId,
    file_id: logo.fileId,
    label: logo.label,
    status: logo.status,
    created_at: logo.createdAt,
    updated_at: logo.updatedAt,
  };
}

export function rowToCompanyLogo(row: Row): CompanyLogoRegistration {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    fileId: String(row.file_id),
    label: String(row.label),
    status: row.status === "deleted" ? "deleted" : "active",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function quotationToRow(quotation: QuotationRequestRecord): Row {
  return {
    id: quotation.id,
    quotation_number: quotation.quotationNumber,
    company_id: quotation.companyId,
    company_name: quotation.companyName,
    user_id: quotation.userId,
    user_email: quotation.userEmail,
    pic_name: quotation.picName,
    pic_email: quotation.picEmail,
    pic_whatsapp: quotation.picWhatsapp,
    status: quotation.status,
    source: quotation.source,
    subtotal_estimate: quotation.subtotalEstimate,
    total_qty: quotation.totalQty,
    embroidery_point_count: quotation.embroideryPointCount,
    customer_notes: quotation.customerNotes,
    shipping_destination: quotation.shippingDestination,
    email_status: quotation.emailStatus,
    email_log_ids_json: quotation.emailLogIds,
    email_results_json: quotation.emailResults,
    quotation_json: quotation,
    created_at: quotation.createdAt,
    updated_at: quotation.updatedAt,
  };
}

export function rowToQuotation(row: Row): QuotationRequestRecord {
  if (row.quotation_json && typeof row.quotation_json === "object") {
    return row.quotation_json as QuotationRequestRecord;
  }
  return {
    id: String(row.id),
    quotationNumber: String(row.quotation_number),
    companyId: String(row.company_id),
    companyName: String(row.company_name ?? row.company_id),
    userId: String(row.user_id),
    userEmail: row.user_email ? String(row.user_email) : null,
    picName: String(row.pic_name),
    picEmail: row.pic_email ? String(row.pic_email) : null,
    picWhatsapp: row.pic_whatsapp ? String(row.pic_whatsapp) : null,
    status: row.status as QuotationRequestRecord["status"],
    source: "web_cart",
    items: [],
    subtotalEstimate: Number(row.subtotal_estimate ?? 0),
    totalQty: Number(row.total_qty ?? 0),
    embroideryPointCount: Number(row.embroidery_point_count ?? 0),
    customerNotes: row.customer_notes ? String(row.customer_notes) : null,
    shippingDestination: row.shipping_destination ? String(row.shipping_destination) : null,
    emailStatus: row.email_status as QuotationRequestRecord["emailStatus"],
    emailLogIds: arrayOfString(row.email_log_ids_json),
    emailResults: [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function quotationItemToRow(input: {
  quotationId: string;
  item: QuotationRequestRecord["items"][number];
  index: number;
}): Row {
  return {
    id: `${input.quotationId}_item_${input.index}`,
    quotation_id: input.quotationId,
    product_id: input.item.productId,
    source: input.item.source,
    source_id: input.item.sourceId,
    sku: input.item.sku,
    product_name: input.item.productName,
    slug: input.item.productSlug,
    selected_color: input.item.selectedColor,
    size_matrix_json: input.item.sizeMatrix,
    total_qty: input.item.totalQty,
    price_from: input.item.priceFrom,
    fulfillment_type: input.item.fulfillmentType,
    transaction_mode: input.item.transactionMode,
    model_3d_id: input.item.model3dId,
    model_3d_url: input.item.model3dUrl,
    customization: input.item.customization,
    embroidery_placements_json: input.item.embroideryPlacements,
    item_snapshot_json: input.item,
  };
}

export function emailLogToRow(log: EmailLog): Row {
  return {
    id: log.id,
    company_id: log.companyId,
    user_id: log.userId,
    provider: log.provider,
    status: log.status,
    type: log.type,
    recipient_emails_json: log.to,
    from_email: log.from,
    reply_to_email: log.replyTo,
    subject: log.subject,
    provider_message_id: log.providerMessageId,
    error_message: log.errorMessage,
    safe_metadata_json: log.safeMetadata,
    created_at: log.createdAt,
    sent_at: log.sentAt,
  };
}

export function rowToEmailLog(row: Row): EmailLog {
  return {
    id: String(row.id),
    companyId: row.company_id ? String(row.company_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    to: arrayOfString(row.recipient_emails_json),
    from: String(row.from_email),
    replyTo: row.reply_to_email ? String(row.reply_to_email) : null,
    subject: String(row.subject),
    type: row.type as EmailLog["type"],
    provider: row.provider as EmailLog["provider"],
    status: row.status as EmailLog["status"],
    providerMessageId: row.provider_message_id
      ? String(row.provider_message_id)
      : null,
    safeMetadata: objectOrEmpty(row.safe_metadata_json),
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
  };
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayOfString(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
