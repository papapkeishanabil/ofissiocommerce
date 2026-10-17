"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Circle, FileText, Package, Truck } from "lucide-react";
import { AccountSidebar, type AccountView } from "./AccountSidebar";
import type { AuthSession } from "@/types/account";
import type { CustomerTrackingOrder, CustomerQuotationTracking } from "@/features/tracking/tracking.types";
import { trackingOrderStatusLabel, fulfillmentLabel } from "@/features/tracking/tracking-utils";
import { formatTrackingDate } from "@/features/tracking/tracking.service";
import { formatIDR } from "@/types/product";
import { CompanyLogoLibrary } from "@/features/company-assets/components/CompanyLogoLibrary";
import { getPendingInvoiceOrders } from "./invoice-notifications";
import { InvoiceNotifications } from "./InvoiceNotifications";
import { QuotationList } from "./QuotationList";
import { OrderHistoryList } from "./OrderHistoryList";
import s from "./DashboardOverview.module.css";

type Order = CustomerTrackingOrder;
type View = AccountView;
type Filter = "all" | "production" | "shipping";

export function orderPhase(order: Order) {
  if (order.actualDeliveredAt || ["delivered", "completed"].includes(order.currentStageId)) return 3;
  if (order.actualCourierPickupAt || ["ready_to_ship", "awaiting_pickup", "in_transit"].includes(order.currentStageId)) return 2;
  if (["waiting_payment", "order_received", "payment_confirmed", "payment_received", "artwork_approval"].includes(order.currentStageId)) return 0;
  return 1;
}

function arrival(order: Order) {
  return order.estimatedArrivalEndDate || order.estimatedArrivalStartDate || order.estimatedDeliveryDate;
}

function ProductThumb({ order }: { order: Order }) {
  const [failed, setFailed] = useState(false);
  const src = order.items[0]?.image || order.items[0]?.snapshotUrl;
  return <span className={s.thumb}>{src && !failed ? (
    // Product images are order snapshots and may use external storage URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={order.items[0]?.productName || "Produk pesanan"} onError={() => setFailed(true)} />
  ) : <Package aria-label="Produk pesanan" />}</span>;
}

function OrderRow({ order }: { order: Order }) {
  const phase = orderPhase(order);
  const stages = ["Pesanan", order.fulfillmentType === "READY_STOCK" ? "Persiapan" : "Produksi", "Pengiriman", "Selesai"];
  return <li className={s.orderRow}>
    <div className={s.product}><ProductThumb order={order} /><div>
      <Link className={s.orderNumber} href={`/orders/${order.id}`}>{order.orderNumber}</Link>
      <p>{order.items[0]?.productName || "Pesanan seragam"}</p>
      <small>{order.items.length} item, {fulfillmentLabel(order.fulfillmentType)}</small>
      <strong>{formatIDR(order.total)}</strong>
    </div></div>
    <div className={s.progress}><span className={s.status}>{trackingOrderStatusLabel(order)}</span>
      <ol aria-label={`Tahapan ${order.orderNumber}`} className={s.stages}>{stages.map((label, i) => <li key={label} data-reached={i <= phase} aria-current={i === phase ? "step" : undefined}><span>{i < phase ? <Check size={12} /> : <Circle size={14} fill={i === phase ? "currentColor" : "white"} />}</span><small>{label}</small></li>)}</ol>
    </div>
    <Link className={s.arrival} href={`/orders/${order.id}`}><small>Estimasi tiba</small><span><CalendarDays size={15} />{arrival(order) ? formatTrackingDate(arrival(order)) : "Belum dijadwalkan"}</span><span className={s.detail}>Lihat detail <ArrowRight size={13} /></span></Link>
  </li>;
}

export function DashboardOverview({ session, profileComplete, orders, history, quotations, refreshFailed = false, onRefresh, initialView = "overview" }: {
  initialView?: View;
  refreshFailed?: boolean;
  onRefresh?: () => void;
  session: AuthSession; profileComplete: boolean; orders: Order[]; history: Order[]; quotations: CustomerQuotationTracking[];
}) {
  const [view, setView] = useState<View>(initialView);
  const [filter, setFilter] = useState<Filter>("all");
  const [allActions, setAllActions] = useState(false);
  const invoiceOrders = getPendingInvoiceOrders(session.company.id, orders);
  const tasks = [
    ...invoiceOrders.map(order => ({ id: `${order.id}-invoice-notice`, title: "Invoice tersedia — menunggu pembayaran", description: order.invoiceNotification!.invoiceNumber, number: order.orderNumber, href: `/orders/${encodeURIComponent(order.id)}#order-documents`, action: "Lihat invoice", order })),
    ...orders.flatMap(order => order.actionRequired.filter(action => action.required).map(action => ({ id: `${order.id}-${action.id}`, title: action.label, description: action.description, number: order.orderNumber, href: `/orders/${order.id}`, action: "Tinjau pesanan", order }))),
    ...quotations.filter(q => q.status === "sent" && q.isOfficialQuotation !== false).map(q => ({ id: q.id, title: "Penawaran siap ditinjau", description: `${q.items.length} item`, number: q.quotationNumber, href: `/quotes/${q.id}`, action: "Lihat penawaran", order: null })),
  ];
  const shipping = orders.filter(o => orderPhase(o) === 2);
  const production = orders.filter(o => orderPhase(o) === 1);
  const filtered = filter === "shipping" ? shipping : filter === "production" ? production : orders;
  const deliveries = [...orders].filter(o => arrival(o) && !o.actualDeliveredAt).sort((a,b) => new Date(arrival(a)!).getTime() - new Date(arrival(b)!).getTime()).slice(0,3);
  const title = view === "overview" ? "Ringkasan akun" : view === "orders" ? "Pesanan Anda" : view === "quotes" ? "Penawaran" : "Logo Library";

  return <main className={s.shell}>
    <AccountSidebar active={view} onViewChange={setView} quotationCount={quotations.length} invoiceCount={invoiceOrders.length} />
    <div className={s.content}>
      <header className={s.header}><div><h1>{title}</h1><p>Halo {session.user.fullName.split(" ")[0]}. Pantau pesanan, pengiriman, dan hal yang perlu Anda tinjau.</p></div><Link className={s.primary} href="/catalog">Buat Pesanan <ArrowRight size={16} /></Link></header>
      {!profileComplete && <p className={s.profileNotice}>Lengkapi profil perusahaan untuk memudahkan pemesanan. <Link href="/dashboard/profile">Lengkapi profil <ArrowRight size={14} /></Link></p>}
      {refreshFailed && <p className={s.profileNotice} role="alert">Pembaruan data belum berhasil. Informasi di bawah adalah data terakhir yang dimuat. <button type="button" className={s.gold} onClick={onRefresh}>Coba lagi</button></p>}
      <InvoiceNotifications orders={invoiceOrders} />
      {view === "overview" && <>
        <div className={s.summary}>
          {[{ count: orders.length, label: "Pesanan aktif", note: "Sedang diproses oleh tim Ofissio", icon: Package, action: () => setView("orders") }, { count: tasks.length, label: "Perlu ditinjau", note: "Menunggu tindakan Anda", icon: FileText, action: () => document.getElementById("dashboard-actions")?.scrollIntoView({ block: "center" }) }, { count: quotations.length, label: "Penawaran", note: "Permintaan dan penawaran perusahaan", icon: FileText, action: () => setView("quotes") }].map(({ count, label, note, icon: Icon, action }) => <button key={label} onClick={action}><span className={s.summaryIcon}><Icon size={23} /></span><span><strong>{count}</strong><b>{label}</b><small>{note}</small></span></button>)}
        </div>
      </>}
      {(view === "overview" || view === "orders") && <div className={s.columns}>
        <section className={s.panel}><div className={s.sectionHeading}><h2>Pesanan aktif</h2>{view === "overview" && <button onClick={() => setView("orders")}>Lihat semua pesanan <ArrowRight size={14} /></button>}</div>
          <div className={s.filters} aria-label="Filter pesanan">{([{ id: "all", label: "Semua aktif", count: orders.length }, { id: "production", label: "Produksi", count: production.length }, { id: "shipping", label: "Pengiriman", count: shipping.length }] as const).map(t => <button key={t.id} aria-pressed={filter === t.id} onClick={() => setFilter(t.id)}>{t.label} ({t.count})</button>)}</div>
          {filtered.length ? <ul>{(view === "overview" ? filtered.slice(0,3) : filtered).map(order => <OrderRow key={order.id} order={order} />)}</ul> : <p className={s.empty}>Belum ada pesanan{filter === "shipping" ? " dalam pengiriman" : filter === "production" ? " dalam produksi" : " aktif"}.</p>}
        </section>
        <section className={s.panel}><div className={s.sectionHeading}><h2>Pengiriman berikutnya</h2></div><p className={s.subtitle}>Jadwal estimasi kedatangan pesanan Anda.</p>
          {deliveries.length ? <ul className={s.deliveries}>{deliveries.map(order => { const date = new Date(arrival(order)!); return <li key={order.id}><Link href={`/orders/${order.id}`}><time dateTime={arrival(order)!}><b>{Number.isNaN(date.getTime()) ? "—" : date.getDate()}</b><small>{Number.isNaN(date.getTime()) ? "Belum tersedia" : date.toLocaleDateString("id-ID", { month: "short", year: "numeric" })}</small></time><Truck size={25} /><div><b>{order.orderNumber}</b><p>{order.items[0]?.productName || "Pesanan seragam"}</p><small>{trackingOrderStatusLabel(order)}</small></div><ChevronRight size={16} /></Link></li>; })}</ul> : <p className={s.empty}>Jadwal pengiriman akan tampil setelah ditentukan.</p>}
          <p className={s.deliveryNote}><CalendarDays size={14} />Tanggal estimasi dapat berubah sesuai proses produksi dan pengiriman.</p>
        </section>
      </div>}
      {view === "overview" && <section id="dashboard-actions" className={`${s.panel} ${s.actions}`}><div className={s.sectionHeading}><h2>Perlu tindakan Anda</h2>{tasks.length > 2 && <button onClick={() => setAllActions(!allActions)}>{allActions ? "Ringkas" : `Lihat semua (${tasks.length})`} <ArrowRight size={14} /></button>}</div><p className={s.subtitle}>Tinjau desain, dokumen, atau penawaran agar pesanan dapat dilanjutkan.</p>
        {tasks.length ? <ul className={s.taskGrid}>{(allActions ? tasks : tasks.slice(0,2)).map(task => <li key={task.id}>{task.order ? <ProductThumb order={task.order} /> : <span className={s.thumb}><FileText size={26} /></span>}<div><b>{task.title}</b><p>{task.number}</p><small>{task.description}</small></div><Link className={s.gold} href={task.href}>{task.action} <ArrowRight size={15} /></Link></li>)}</ul> : <p className={s.empty}><Check size={18} />Semua sudah ditinjau. Tidak ada tindakan yang menunggu Anda.</p>}
      </section>}
      {view === "orders" && <section className={`${s.panel} ${s.secondary}`}><div className={s.sectionHeading}><h2>Riwayat pesanan</h2></div><OrderHistoryList orders={history} /></section>}
      {view === "quotes" && <section className={`${s.panel} ${s.secondary}`}><div className={s.sectionHeading}><h2>Semua penawaran ({quotations.length})</h2><Link className={s.gold} href="/quote">Ajukan penawaran <ArrowRight size={14} /></Link></div><QuotationList quotations={quotations} /></section>}
      {view === "logos" && <div className={s.library}><CompanyLogoLibrary /></div>}
    </div>
  </main>;
}
