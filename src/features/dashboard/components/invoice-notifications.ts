import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";

export function getPendingInvoiceOrders(companyId: string, orders: CustomerTrackingOrder[]) {
  const seen = new Set<string>();
  return orders.filter(order => {
    if (!companyId || order.companyId !== companyId || !order.invoiceNotification || order.paymentStatus !== "waiting_payment" ||
      ["cancelled", "canceled", "refunded", "failed"].includes(order.orderStatus ?? "") ||
      ["completed", "delivered", "cancelled"].includes(order.currentStageId) || seen.has(order.id) ||
      !order.documents.some(doc => doc.type === "invoice" && doc.status === "available" && doc.id === order.invoiceNotification!.documentId)) return false;
    seen.add(order.id);return true;
  }).sort((a,b) => Date.parse(b.invoiceNotification!.sentAt) - Date.parse(a.invoiceNotification!.sentAt));
}
