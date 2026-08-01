// src/components/catalog/ProductCard.tsx

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OfissioProduct } from "@/features/products/product.types";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { emptySizeMatrix } from "@/types/cart";
import { useCartStore } from "@/stores/cart-store";
import { useOfistantStore } from "@/stores/ofistant-store";
import { afterConfirmItemAdded } from "@/lib/ofistant/ofistant.rules";
import { Clock, Layers, Package } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";

interface ProductCardProps {
  product: OfissioProduct;
}

/**
 * "Quick add to cart" from the card uses the MOQ split evenly across sizes,
 * then sends the user to the detail page if they want to fine-tune.
 * This is intentional UX for B2B browsing speed.
 */
export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addToCart = useCartStore((s) => s.add);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  // Notify Ofistant via its store (rule-based era: just push a message).
  function notifyOfistantPostAdd(name: string) {
    useOfistantStore.setState((s) => ({
      context: afterConfirmItemAdded(s.context),
      messages: [
        ...s.messages,
        {
          id: `assistant-add-${Date.now()}`,
          role: "assistant" as const,
          text: `Produk ${name} sudah ditambahkan ke keranjang. Apakah ingin lanjut mencari produk pelengkap?`,
          ts: Date.now(),
        },
      ],
      quickReplies: ["Lanjut eksplor produk", "Lihat keranjang", "Checkout"],
    }));
  }

  const color = product.colors[0] ?? "Default";

  function handleQuickAdd() {
    // Spread MOQ evenly across M/L/XL as a starting point.
    const sizes = emptySizeMatrix();
    const perSize = Math.max(1, Math.floor(product.moq / 3));
    sizes.M = perSize;
    sizes.L = perSize;
    sizes.XL = Math.max(0, product.moq - perSize * 2);

    const result = addToCart({
      product,
      color,
      sizes,
      customization: null,
    });
    if (!result.ok) {
      setError(result.reason ?? "Gagal menambahkan ke keranjang.");
      return;
    }
    setError(null);
    if (result.lineId) {
      notifyOfistantPostAdd(product.name);
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => router.push(`/product/${product.slug}`)}
        className="relative block aspect-[4/3] w-full overflow-hidden"
        aria-label={`Lihat detail ${product.name}`}
      >
        {product.mainImage && !imageFailed ? (
          // Dynamic WooCommerce/Supabase image host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.mainImage}
            alt={product.images?.[0]?.alt || product.name}
            className="h-full w-full bg-slate-50 object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ProductImagePlaceholder
            name={product.name}
            accentColor={product.accentColor}
            category={product.category}
            className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <Badge tone={product.fulfillment === "READY_STOCK" ? "success" : "amber"}>
            {fulfillmentLabel(product.fulfillment)}
          </Badge>
          <Badge tone="brand">3D tersedia</Badge>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {product.category}
            </span>
            <span className="text-[11px] font-mono text-ink-muted">
              {product.sku}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/product/${product.slug}`)}
            className="text-left text-sm font-bold leading-snug text-ink hover:text-brand-700"
          >
            {product.name}
          </button>

          <div className="mt-2 flex flex-wrap gap-1">
            {product.industries.slice(0, 3).map((ind) => (
              <Badge key={ind} tone="neutral">
                {ind}
              </Badge>
            ))}
            {product.industries.length > 3 && (
              <Badge tone="neutral">+{product.industries.length - 3}</Badge>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-ink-muted">
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <dt>MOQ</dt>
              <dd className="font-semibold text-ink">{product.moq} pcs</dd>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <dt>Lead</dt>
              <dd className="font-semibold text-ink">{product.leadTimeDays} hari</dd>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <dt>Fulfillment</dt>
              <dd className="font-semibold text-ink">
                {fulfillmentLabel(product.fulfillment)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-line pt-3">
          <p className="text-[11px] text-ink-muted">Harga mulai dari</p>
          <p className="text-lg font-bold text-ink">
            {formatIDR(product.priceFrom)}
          </p>
          <p className="text-[11px] text-ink-muted">/ pcs</p>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <ButtonLink
            href={`/product/${product.slug}`}
            variant="outline"
            size="sm"
          >
            Lihat Detail
          </ButtonLink>
          <Button variant="primary" size="sm" onClick={handleQuickAdd}>
            Tambah ke Cart
          </Button>
        </div>
      </div>
    </article>
  );
}
