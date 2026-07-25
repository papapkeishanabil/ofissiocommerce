// src/components/checkout/OrderConfirmation.tsx
"use client";

import { useSearchParams } from "next/navigation";

import type { Order } from "@/types/order";
import { statusLabel } from "@/types/order";
import { formatIDR } from "@/types/product";
import { CheckCircle2, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

interface OrderConfirmationProps {
  order: Order;
}

export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const sp = useSearchParams();
  const isNew = sp.get("new") === "1";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </span>

        {isNew && (
          <Badge tone="success" className="mt-4">
            Order dibuat
          </Badge>
        )}

        <h1 className="mt-3 text-2xl font-bold text-ink">
          Pesanan berhasil dibuat.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Order Anda berstatus <strong>menunggu pembayaran (dummy)</strong>.
          Integrasi iPaymu aktif di Phase 4 — Anda akan menerima instruksi
          pembayaran resmi saat itu.
        </p>

        <div className="mt-6 rounded-xl border border-line bg-surface-muted p-4 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <ShoppingBag className="h-4 w-4" />
              {order.code}
            </span>
            <Badge tone="amber">{statusLabel(order.status)}</Badge>
          </div>

          <ul className="mt-3 divide-y divide-line text-xs">
            {order.items.map((it, i) => (
              <li
                key={`${it.productId}-${i}`}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {it.productName}
                  </p>
                  <p className="text-ink-muted">
                    {it.color} · {it.totalQty} pcs
                  </p>
                </div>
                <p className="font-semibold">{formatIDR(it.estimatedPrice)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Alamat kirim</dt>
              <dd className="text-right text-ink">
                {order.shippingAddressLabel}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="text-ink">{formatIDR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">PPN 11%</dt>
              <dd className="text-ink">{formatIDR(order.tax)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-sm font-bold">
              <dt>Total</dt>
              <dd>{formatIDR(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/dashboard">Lihat di dashboard</ButtonLink>
          <ButtonLink href="/catalog" variant="outline">
            Lanjut belanja
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
