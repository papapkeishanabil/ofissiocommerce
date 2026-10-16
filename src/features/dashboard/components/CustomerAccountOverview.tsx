"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, FileText, Package, Search } from "lucide-react";
import type { AuthSession } from "@/types/account";
import type { CustomerTrackingOrder as Order, CustomerQuotationTracking } from "@/features/tracking/tracking.types";
import { formatIDR } from "@/types/product";
import { formatTrackingDate } from "@/features/tracking/tracking.service";
import { trackingOrderStatusLabel } from "@/features/tracking/tracking-utils";
import { CompanyLogoLibrary } from "@/features/company-assets/components/CompanyLogoLibrary";
import { AccountSidebar, type AccountView } from "./AccountSidebar";
import { getPendingInvoiceOrders } from "./invoice-notifications";
import { CustomerQuotationCards } from "./CustomerQuotationCards";
import s from "./DashboardOverview.module.css";
import { AccountFooter } from "./AccountFooter";

function Product({ order }: { order: Order }) {
  const [failed, setFailed] = useState(false);
  const item = order.items[0];
  const src = item?.image || item?.snapshotUrl;
  const totalQty = order.items.reduce((sum, product) => sum + product.totalQty, 0);
  return <div className={s.product}><span className={s.thumb}>{src && !failed ? (
    // Order images are external, immutable product snapshots.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={item?.productName || "Produk pesanan"} onError={() => setFailed(true)} />
  ) : <Package size={23} aria-hidden="true" />}</span><div><Link href={`/orders/${encodeURIComponent(order.id)}`} className={s.orderNumber}>{order.orderNumber}</Link><p className={s.productName}>{item?.productName || "Pesanan seragam"}</p><small>{item?.selectedColor || ""}{item?.selectedColor ? " · " : ""}{totalQty} pcs{order.items.length > 1 ? ` · ${order.items.length} produk` : ""}</small></div></div>;
}

function Status({ order }: { order: Order }) {
  return <span className={s.status} data-tone={order.paymentStatus === "waiting_payment" ? "pending" : ["paid", "verified"].includes(order.paymentStatus) ? "success" : "neutral"}>{trackingOrderStatusLabel(order)}</span>;
}

export function CustomerAccountOverview({ session, profileComplete, orders, history, quotations, initialView = "overview", refreshFailed = false, onRefresh }: {
  session: AuthSession; profileComplete: boolean; orders: Order[]; history: Order[]; quotations: CustomerQuotationTracking[];
  initialView?: AccountView; refreshFailed?: boolean; onRefresh?: () => void;
}) {
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState<"all" | "pending" | "history">("all");
  const [search, setSearch] = useState("");
  const invoiceOrders = getPendingInvoiceOrders(session.company.id, orders);
  const pending = orders.filter(order => order.paymentStatus === "waiting_payment" && order.orderStatus !== "cancelled");
  const tasks = [
    ...invoiceOrders.map(order => ({ id: `${order.id}-invoice`, title: "Invoice tersedia", note: order.invoiceNotification!.invoiceNumber, href: `/orders/${encodeURIComponent(order.id)}#order-documents`, action: "Lihat invoice" })),
    ...orders.flatMap(order => order.actionRequired.filter(action => action.required).map(action => ({ id: `${order.id}-${action.id}`, title: action.label, note: action.description, href: `/orders/${encodeURIComponent(order.id)}`, action: "Tinjau pesanan" }))),
    ...quotations.filter(q => q.status === "sent" && q.isOfficialQuotation !== false).map(q => ({ id: q.id, title: "Penawaran siap ditinjau", note: q.quotationNumber, href: `/quotes/${encodeURIComponent(q.id)}`, action: "Tinjau penawaran" })),
  ];
  const list = (filter === "history" ? history : filter === "pending" ? pending : [...orders, ...history]).filter(order => `${order.orderNumber} ${order.items.map(item => `${item.productName} ${item.sku}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const deliveries = orders.filter(o => !o.actualDeliveredAt && (o.estimatedArrivalEndDate || o.estimatedArrivalStartDate || o.estimatedDeliveryDate)).slice(0,3);
  const title = { overview: "Ringkasan akun", orders: "Pesanan Anda", quotes: "Penawaran", logos: "Logo Library" }[view];
  const subtitle = { overview: `Selamat datang, ${session.user.fullName.split(" ")[0]}. Berikut perkembangan pesanan perusahaan Anda.`, orders: "Seluruh pesanan, status pembayaran, dan pengiriman dalam satu tempat.", quotes: "Kelola penawaran harga dan dokumen pengadaan perusahaan.", logos: "File logo perusahaan untuk kebutuhan bordir dan pemesanan berikutnya." }[view];
  function changeView(next: AccountView) { setView(next); window.history.replaceState(null, "", `/dashboard?view=${next}`); }

  return <div className={s.shell}>
    <AccountSidebar active={view} onViewChange={changeView} quotationCount={quotations.length} invoiceCount={invoiceOrders.length} />
    <div className={s.content}>
      <header className={s.header}><div><h1>{title}</h1><p>{subtitle}</p></div>{view !== "logos" && <Link className={s.primary} href={view === "quotes" ? "/quote" : "/catalog"}>{view === "quotes" ? "Ajukan penawaran" : "Buat pesanan"}<ArrowRight size={16} aria-hidden="true" /></Link>}</header>
      {!profileComplete && <p className={s.profileNotice}>Lengkapi profil perusahaan untuk memudahkan pemesanan. <Link href="/dashboard/profile">Lengkapi profil <ArrowRight size={14} /></Link></p>}
      {refreshFailed && <p role="alert" className={s.profileNotice}>Pembaruan data belum berhasil. Informasi terakhir masih ditampilkan. <button type="button" onClick={onRefresh}>Coba lagi</button></p>}
      {view === "overview" && <>
        {pending.length > 0 && <section className={s.paymentNotice} aria-label="Pesanan menunggu pembayaran"><Clock3 size={20} aria-hidden="true" /><div><h2>{pending.length} pesanan menunggu pembayaran</h2><p>Pesanan sudah tersimpan. Lanjutkan pembayaran tanpa checkout ulang.</p></div><Link className={s.outline} href="/cart">Lihat pembayaran <ArrowRight size={15} /></Link></section>}
        <div className={s.metrics}><button onClick={()=>changeView("orders")}><span><Package size={15} />Pesanan aktif</span><strong>{orders.length}</strong><small>Pesanan yang sedang berjalan</small></button><Link href="/cart"><span><Clock3 size={15} />Menunggu pembayaran</span><strong>{pending.length}</strong><small>Siap dilanjutkan pembayarannya</small></Link><button onClick={()=>changeView("quotes")}><span><FileText size={15} />Penawaran</span><strong>{quotations.length}</strong><small>Permintaan pengadaan perusahaan</small></button></div>
        <div className={s.columns}>
          <section className={s.panel}><div className={s.sectionHeading}><h2>Pesanan terbaru</h2><button type="button" onClick={()=>changeView("orders")}>Semua pesanan <ArrowRight size={15} /></button></div>{orders.length ? <ul>{orders.slice(0,3).map(order=><li key={order.id} className={s.recentRow}><div><Product order={order} /><strong className={s.rowAmount}>{formatIDR(order.total)}</strong></div><div className={s.recentSide}><Status order={order} /><Link href={`/orders/${encodeURIComponent(order.id)}`}>Lihat pesanan <ArrowRight size={14} /></Link></div></li>)}</ul> : <p className={s.empty}>Belum ada pesanan aktif. Mulai dari katalog produk.</p>}</section>
          <div className={s.sideStack}><section id="dashboard-actions" className={s.panel}><div className={s.sectionHeading}><h2>Perlu perhatian Anda</h2></div>{tasks.length ? <ul className={s.attention}>{tasks.map(task=><li key={task.id}><h3>{task.title}</h3><p>{task.note}</p><Link href={task.href}>{task.action} <ArrowRight size={14} /></Link></li>)}</ul> : <p className={s.empty}><Check size={17} />Tidak ada tindakan yang menunggu Anda.</p>}</section><section className={s.panel}><div className={s.sectionHeading}><h2>Pengiriman berikutnya</h2></div>{deliveries.length ? <ul className={s.attention}>{deliveries.map(order=><li key={order.id}><h3>{order.orderNumber}</h3><p><CalendarDays size={13} /> {formatTrackingDate(order.estimatedArrivalEndDate || order.estimatedArrivalStartDate || order.estimatedDeliveryDate)}</p><Link href={`/orders/${encodeURIComponent(order.id)}`}>Pantau pengiriman <ArrowRight size={14} /></Link></li>)}</ul> : <p className={s.empty}>Jadwal akan tampil setelah pengiriman ditentukan.</p>}</section></div>
        </div>
      </>}
      {view === "orders" && <>
        <div className={s.filters} aria-label="Filter pesanan">{([{ id:"all", label:"Semua pesanan", count:orders.length+history.length },{ id:"pending", label:"Belum dibayar", count:pending.length },{ id:"history", label:"Selesai", count:history.length }] as const).map(tab=><button key={tab.id} type="button" aria-pressed={filter===tab.id} onClick={()=>setFilter(tab.id)}>{tab.label} <small>{tab.count}</small></button>)}</div>
        <label className={s.search}><Search size={16} aria-hidden="true" /><span className="sr-only">Cari pesanan</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Cari nomor pesanan atau produk" /></label><p className={s.resultCount}>{list.length} pesanan</p>
        <div className={s.tableWrap}><table className={s.orderTable}><thead><tr><th>Pesanan &amp; produk</th><th>Tanggal</th><th>Status</th><th>Total</th><th><span className="sr-only">Tindakan</span></th></tr></thead><tbody>{list.map(order=><tr key={order.id}><td><Product order={order} /></td><td>{formatTrackingDate(order.orderDate)}</td><td><Status order={order} /></td><td className={s.money}>{formatIDR(order.total)}</td><td><Link aria-label={`Lihat pesanan ${order.orderNumber}`} href={`/orders/${encodeURIComponent(order.id)}`}><ArrowRight size={16} /></Link></td></tr>)}</tbody></table>{!list.length&&<p className={s.empty}>Tidak ada pesanan sesuai pencarian atau filter ini.</p>}</div>
      </>}
      {view === "quotes" && <CustomerQuotationCards quotations={quotations} />}
      {view === "logos" && <div className={s.logoLibrary}><CompanyLogoLibrary fullPage /></div>}
      <AccountFooter />
    </div>
  </div>;
}
