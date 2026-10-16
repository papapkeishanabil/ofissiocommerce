import Image from "next/image";
import { Shirt } from "lucide-react";
import { OrderLogoThumbnails } from "./OrderLogoThumbnails";
import type { OrderItemProgress } from "../tracking.types";
import { summarizeSizeMatrix } from "../tracking-utils";
import { zoneLabel } from "@/types/uniform-3d";
import { formatIDR } from "@/types/product";
import styles from "./OrderItemProgressList.module.css";

export function OrderItemProgressList({ items }: { items: OrderItemProgress[] }) {
  return (
    <section className={styles.panel} aria-label="Item pesanan">
      <h2>Item pesanan</h2>
      <div className={styles.head} aria-hidden="true"><span>Produk</span><span>Ukuran</span><span>Jumlah</span><span>Bordir</span><span>Subtotal</span></div>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <div className={styles.product}>
              <div className={styles.image}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.productName} loading="lazy" />
                ) : item.snapshotUrl ? <Image src={item.snapshotUrl} alt={`Snapshot ${item.productName}`} fill sizes="96px" className="object-contain" /> : <Shirt className="h-10 w-10 text-ink-muted" />}
              </div>
              <div className="min-w-0"><h3>{item.productName}</h3><p>{item.selectedColor}</p></div>
            </div>
            <div className={styles.cell}><span className={styles.mobileLabel}>Ukuran</span>{summarizeSizeMatrix(item.sizeMatrix)}</div>
            <div className={styles.cell}><span className={styles.mobileLabel}>Jumlah</span>{item.totalQty} pcs</div>
            <div className={styles.cell}><span className={styles.mobileLabel}>Bordir</span>{item.embroideryPlacements.length ? item.embroideryPlacements.map((placement) => zoneLabel(placement.zone)).join(", ") : "Tidak ada"}</div>
            <div className={`${styles.cell} ${styles.price}`}><span className={styles.mobileLabel}>Subtotal</span>{formatIDR(item.estimatedPrice)}</div>
            {item.notes || item.embroideryPlacements.length ? <div className={styles.extra}>{item.notes ? <p><strong>Catatan:</strong> {item.notes}</p> : null}<OrderLogoThumbnails placements={item.embroideryPlacements} /></div> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
