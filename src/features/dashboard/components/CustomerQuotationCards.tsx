import Link from "next/link";
import { ArrowRight, FileText, Check } from "lucide-react";
import { formatTrackingDate } from "@/features/tracking/tracking.service";
import { formatCustomerRequestNumber } from "@/features/quotation/quotation.utils";
import type { CustomerQuotationTracking } from "@/features/tracking/tracking.types";
import s from "./DashboardOverview.module.css";
import { formatIDR } from "@/types/product";
import { ProductThumb } from "@/components/ui/ProductThumb";

const labels = { submitted:"Diajukan", reviewed:"Ditinjau", sent:"Siap ditinjau", accepted:"Disetujui", waiting_payment:"Menunggu pembayaran", paid:"Lunas" };
const stageLabels: Record<string, string> = { quotation_submitted: "Diajukan", quotation_reviewed: "Ditinjau", quotation_sent: "Penawaran dikirim", customer_accepted: "Disetujui", waiting_payment: "Pembayaran", completed: "Selesai" };

export function CustomerQuotationCards({ quotations }: { quotations: CustomerQuotationTracking[] }) {
  if (!quotations.length) return <section className={s.panel}><p className={s.empty}>Belum ada penawaran. Ajukan kebutuhan seragam perusahaan Anda untuk mendapatkan penawaran harga.</p><Link href="/quote" className={s.primary}>Ajukan penawaran <ArrowRight size={15} /></Link></section>;
  return <div className={s.quotationGrid}>{quotations.map(quotation => {
    const request = quotation.isOfficialQuotation === false;
    const number = request ? formatCustomerRequestNumber(quotation.quotationNumber, quotation.requestedProcessRoute ?? "fulfillment") : quotation.quotationNumber;
    return <article key={quotation.id} className={s.panel}>
      <div className={s.quoteHeading}><div><p className={s.subtitle}>Diajukan {formatTrackingDate(quotation.submittedAt)}</p><h2>{number}</h2></div><span className={s.status} data-tone={quotation.status === "waiting_payment" ? "pending" : "neutral"}>{request ? "Menunggu review Ofissio" : labels[quotation.status]}</span></div>
      <div className={s.quoteProducts}>{quotation.items[0]?.image ? <ProductThumb src={quotation.items[0].image} alt={quotation.items[0].productName} className="h-18 w-14 object-contain" /> : <FileText size={25} aria-hidden="true" />}<div><strong>{quotation.items.length} produk dalam {request ? "permintaan" : "penawaran"}</strong><p>{quotation.items.map(item => item.productName).join(", ")}</p></div></div>
      <ol className={s.quoteFlow} aria-label={`Tahapan ${number}`}>{quotation.timeline.map(stage=><li key={stage.id} data-state={stage.state}><span>{stage.state === "completed" ? <Check size={12} aria-hidden="true" /> : <span aria-hidden="true">•</span>}</span><small>{stageLabels[stage.id] || stage.label}</small></li>)}</ol>
      {quotation.grandTotal != null && <div className={s.quoteTotal}><span>Total penawaran</span><strong>{formatIDR(quotation.grandTotal)}</strong></div>}
      <div className={s.quoteActions}><Link className={s.primary} href={`/quotes/${encodeURIComponent(quotation.id)}`}>{request ? "Lihat permintaan" : "Lihat penawaran"}<ArrowRight size={15} /></Link>{quotation.convertedOrderId && <Link className={s.outline} href={`/orders/${encodeURIComponent(quotation.convertedOrderId)}`}>Lihat pesanan</Link>}</div>
    </article>;
  })}</div>;
}
