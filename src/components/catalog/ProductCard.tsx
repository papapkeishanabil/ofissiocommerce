// src/components/catalog/ProductCard.tsx

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OfissioProduct } from "@/features/products/product.types";
import { formatIDR } from "@/types/product";
import { fulfillmentLabel } from "@/types/industry";
import { emptySizeMatrix, moqSizeSpread } from "@/types/cart";
import { useCartStore } from "@/stores/cart-store";
import { useOfistantStore } from "@/stores/ofistant-store";
import { afterConfirmItemAdded } from "@/lib/ofistant/ofistant.rules";
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import { Clock, Layers, PackageCheck, Plus } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductImagePreview } from "./ProductImagePreview";

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
  const processingInfo = resolveOrderProcessingInfo({
    processRoute: product.processRoute,
    fulfillmentType: product.fulfillment,
    leadTimeDays: product.leadTimeDays,
  });

  function handleQuickAdd() {
    // Spread MOQ evenly across M/L/XL as a starting point — total is exactly
    // the MOQ (1 pcs for ready stock, N for produced lines).
    const sizes = moqSizeSpread(product.moq);

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

  const specs = [
    {
      icon: Layers,
      label: product.moq <= 1 ? "Min. Beli" : "MOQ",
      value: `${Math.max(1, product.moq)} pcs`,
    },
    {
      icon: processingInfo.kind === "ready_stock" ? PackageCheck : Clock,
      label: processingInfo.label,
      value: processingInfo.value,
    },
  ];

  return (
    <article className="hover-lift group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm hover:border-brand-200 hover:shadow-soft-lg">
      <ProductImagePreview
        product={product}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-cool-50"
      >
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          <Badge tone={product.fulfillment === "READY_STOCK" ? "success" : "amber"}>
            {fulfillmentLabel(product.fulfillment)}
          </Badge>
          <Badge tone="slate">3D tersedia</Badge>
        </div>
      </ProductImagePreview>

      <div className="flex flex-1 flex-col p-4">
        {/* Category eyebrow + SKU */}
        <div className="flex items-center justify-between gap-2">
          <span className="type-eyebrow text-brand-700">{product.category}</span>
          <span className="type-mono-label text-ink-subtle">{product.sku}</span>
        </div>

        {/* Product name — the visual anchor */}
        <button
          type="button"
          onClick={() => router.push(`/product/${product.slug}`)}
          className="mt-1.5 line-clamp-2 text-left text-base font-extrabold leading-tight tracking-tight text-ink-strong transition-colors hover:text-brand-700"
        >
          {product.name}
        </button>

        {/* Industries */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          {product.industries.slice(0, 3).map((ind) => (
            <Badge key={ind} tone="neutral">
              {ind}
            </Badge>
          ))}
          {product.industries.length > 3 && (
            <Badge tone="neutral">+{product.industries.length - 3}</Badge>
          )}
        </div>

        {/* Key specs */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {specs.map((spec) => {
            const Icon = spec.icon;
            return (
              <div
                key={spec.label}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-2.5 py-1.5"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-ink-subtle">
                    {spec.label}
                  </div>
                  <div className="truncate text-xs font-bold text-ink">
                    {spec.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Price + actions pinned to the card bottom */}
        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2 border-t border-line pt-3">
            <span className="text-[11px] font-medium text-ink-subtle">
              Mulai dari
            </span>
            <div className="text-right leading-none">
              <span className="text-lg font-extrabold tracking-tight text-ink-strong">
                {formatIDR(product.priceFrom)}
              </span>
              <span className="ml-1 text-[11px] font-medium text-ink-subtle">
                /pcs
              </span>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ButtonLink
              href={`/product/${product.slug}`}
              variant="outline"
              size="sm"
            >
              Lihat Detail
            </ButtonLink>
            <Button variant="primary" size="sm" onClick={handleQuickAdd}>
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
