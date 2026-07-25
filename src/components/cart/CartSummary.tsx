// src/components/cart/CartSummary.tsx
// Order summary block — used in both cart page and (later) checkout.

import { formatIDR } from "@/types/product";
import { useCartItems } from "@/hooks/use-cart";
import { useCartHydrated } from "@/hooks/use-cart";

interface CartSummaryProps {
  /** show "checkout disabled" placeholder (Phase 4 enables real checkout) */
  showCheckout?: boolean;
}

export function CartSummary({ showCheckout = false }: CartSummaryProps) {
  const items = useCartItems();
  const hydrated = useCartHydrated();

  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);
  const subtotal = items.reduce((a, it) => a + it.estimatedPrice, 0);
  const estimatedTax = Math.round(subtotal * 0.11); // PPN 11% dummy
  const estimatedShipping = 0; // Phase 4B
  const total = subtotal + estimatedTax + estimatedShipping;

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-bold text-ink">Ringkasan</h2>

      <dl className="mt-3 space-y-2 text-sm">
        <Row label={`Subtotal (${totalQty} pcs)`} value={formatIDR(subtotal)} />
        <Row label="PPN 11% (estimasi)" value={formatIDR(estimatedTax)} muted />
        <Row
          label="Ongkos kirim"
          value="Dihitung saat checkout"
          muted
          italic
        />
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm font-semibold text-ink">Estimasi total</span>
        <span className="text-xl font-bold text-ink">{formatIDR(total)}</span>
      </div>

      {showCheckout && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
          Checkout &amp; pembayaran aktif di Phase 4 (iPaymu). Saat ini keranjang
          tersimpan lokal di browser Anda.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  italic,
}: {
  label: string;
  value: string;
  muted?: boolean;
  italic?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-ink-muted" : "text-ink"}>{label}</dt>
      <dd
        className={
          (muted ? "text-ink-muted " : "font-semibold text-ink ") +
          (italic ? "italic text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
