import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import { formatIDR } from "@/types/product";
import s from "./DashboardOverview.module.css";

export function InvoiceNotifications({ orders }: { orders: CustomerTrackingOrder[] }) {
  if (!orders.length) return null;
  return <section className={s.invoiceNotices} aria-label="Pemberitahuan invoice" aria-live="polite">
    <h2><Bell size={19} aria-hidden="true" />Invoice tersedia — menunggu pembayaran ({orders.length})</h2>
    <ul>{orders.map(order => <li key={order.id}>
      <div>
        <b>{order.invoiceNotification!.invoiceNumber} · {order.orderNumber}</b>
        <p>Invoice sudah dikirim. Total pesanan {formatIDR(order.total)}. Buka pesanan untuk melihat invoice dan status pembayaran.</p>
        <time dateTime={order.invoiceNotification!.sentAt}>Dikirim {new Date(order.invoiceNotification!.sentAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</time>
      </div>
      <Link className={s.gold} href={`/orders/${encodeURIComponent(order.id)}#order-documents`}>Lihat invoice &amp; pembayaran <ArrowRight size={15} /></Link>
    </li>)}</ul>
  </section>;
}
