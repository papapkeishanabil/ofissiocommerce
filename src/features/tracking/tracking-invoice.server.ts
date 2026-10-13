import "server-only";

import { repositoryRegistry } from "@/features/repositories/repository.factory";
import type { CustomerTrackingOrder, TrackingDocument } from "./tracking.types";

/** Read current documents and successful delivery logs; never send email or mutate tracking. */
export async function enrichTrackingInvoices(companyId: string, orders: CustomerTrackingOrder[]) {
  const scopedOrders = orders.filter(order => order.companyId === companyId);
  if (!companyId || !scopedOrders.length) return [];
  const [documents, logs] = await Promise.all([
    repositoryRegistry.documents.listByCompany(companyId),
    repositoryRegistry.emailLogs.listByCompany(companyId),
  ]);
  const invoiceRecords = documents.filter(doc => doc.companyId === companyId &&
    doc.documentType === "invoice_pdf" && doc.entityType === "order");
  const invoices = invoiceRecords.filter(doc => doc.status === "generated" && !doc.deletedAt);
  const sent = logs.filter(log => log.companyId === companyId &&
    (log.status === "sent" || (repositoryRegistry.provider === "mock" && log.status === "mocked")) &&
    log.safeMetadata.emailPurpose === "invoice_ready")
    .sort((a, b) => Date.parse(b.sentAt ?? b.createdAt) - Date.parse(a.sentAt ?? a.createdAt));
  const invoiceById = new Map(invoiceRecords.map(doc => [doc.id, doc]));
  const latestByOrder = new Map<string, typeof invoices[number]>();
  for (const doc of invoices) {
    const previous = latestByOrder.get(doc.entityId);
    if (!previous || Date.parse(doc.createdAt) > Date.parse(previous.createdAt)) latestByOrder.set(doc.entityId, doc);
  }
  return scopedOrders.map(order => {
    const invoice = latestByOrder.get(order.id);
    const delivery = sent.find(log => {
      const delivered = typeof log.safeMetadata.invoiceDocumentId === "string"
        ? invoiceById.get(log.safeMetadata.invoiceDocumentId) : null;
      // Regeneration expires the old PDF while preserving its invoice number.
      return log.safeMetadata.orderId === order.id && delivered?.entityId === order.id &&
        delivered.documentNumber === invoice?.documentNumber;
    });
    const invoiceDoc: TrackingDocument = {
      id: invoice?.id ?? `${order.id}-invoice`, label: "Invoice", type: "invoice",
      status: invoice ? "available" : "pending", fileName: invoice?.filename ?? null,
    };
    return {
      ...order,
      // Do not serialize email recipients, internal notes, storage keys or payment tokens.
      invoiceNotification: invoice && delivery ? {
        documentId: invoice.id, invoiceNumber: invoice.documentNumber,
        sentAt: delivery.sentAt ?? delivery.createdAt,
      } : null,
      documents: [...order.documents.filter(doc => doc.type !== "invoice"), invoiceDoc],
    };
  });
}
