"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Clock3, ShoppingCart } from "lucide-react";
import { ProductThumb } from "@/components/ui/ProductThumb";
import { productColorDisplayLabel } from "@/lib/product-colors";
import { formatIDR } from "@/types/product";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";
import styles from "./CartPage.module.css";

function Products({ order }: { order: CustomerTrackingOrder }) {
  return <span>{order.items.map((item) => <span className={styles.product} key={item.id ?? `${item.sku}-${item.selectedColor}`}>
    <ProductThumb src={item.image} alt={item.productName} className={styles.photo} />
    <span className={styles.productText}><span className={styles.name}>{item.productName}</span>
      <span className={styles.meta}>{[item.sku, item.selectedColor ? productColorDisplayLabel(item.selectedColor) : null, `${item.totalQty} pcs`].filter(Boolean).join(" · ")}</span>
    </span>
  </span>)}</span>;
}

export function UnpaidOrders({ orders, cartCount, onShowCart }: {
  orders: CustomerTrackingOrder[]; cartCount: number; onShowCart: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = orders.find(order => order.id === selectedId) ?? orders[0];
  if (!selected) return <div className={styles.notice}>Tidak ada pesanan yang menunggu pembayaran.</div>;
  const href = `/orders/${encodeURIComponent(selected.id)}`;
  return <section aria-label="Pesanan belum dibayar" className={styles.split}>
    <div>
      <div className={styles.listHeading}><h2>Pilih pesanan</h2><span>{orders.length} belum dibayar</span></div>
      <ul className={styles.orders}>{orders.map(order => <li key={order.id}>
        <button type="button" className={styles.choice} aria-pressed={selected.id === order.id} onClick={() => setSelectedId(order.id)} aria-label={`Pilih pesanan ${order.orderNumber}`}>
          <span className={styles.radio} aria-hidden="true" />
          <span className={styles.choiceBody}><span className={styles.reference}>{order.orderNumber}</span><Products order={order} /><span className={styles.amount}>{formatIDR(order.total)}</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </li>)}</ul>
      <div className={styles.shoppingNote}><ShoppingCart size={18} aria-hidden="true" /><span>{cartCount ? `${cartCount} produk di keranjang belanja.` : "Keranjang belanja Anda saat ini kosong."}</span>
        {cartCount ? <button type="button" onClick={onShowCart}>Lihat keranjang →</button> : <Link href="/catalog">Tambah produk →</Link>}
      </div>
    </div>
    <aside aria-label="Ringkasan pembayaran" className={styles.summary}>
      <h2>Ringkasan pembayaran</h2><p className={styles.status}><Clock3 size={13} aria-hidden="true" />Menunggu pembayaran</p>
      <div className={styles.rule} />
      <span className={styles.reference}>{selected.orderNumber}</span><Products order={selected} />
      <div className={styles.rule} />
      <p className={styles.totalLabel}>Total pembayaran</p><p className={styles.total}>{formatIDR(selected.total)}</p>
      <p className={styles.fine}>Rincian lengkap tersedia di halaman pembayaran.</p>
      <Link href={href} className={styles.primary}>Lanjutkan pembayaran<ArrowRight size={16} aria-hidden="true" /></Link>
      <p className={styles.fine}>Pesanan Anda sudah tersimpan. Lanjutkan pembayaran tanpa membuat pesanan baru.</p>
      <Link href={href} className={styles.detailLink}>Lihat rincian pesanan</Link>
    </aside>
  </section>;
}
