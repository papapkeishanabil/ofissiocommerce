"use client";

import { useEffect, useState } from "react";

import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import type { OfissioProduct } from "@/features/products/product.types";

export function ProductGallery({ product }: { product: OfissioProduct }) {
  const images = product.images ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelectedIndex(0);
    setFailedUrls(new Set());
  }, [product.id]);

  const selected = images[selectedIndex] ?? images[0];
  const showFallback = !selected || failedUrls.has(selected.src);

  return (
    <div className="min-w-0 space-y-3" aria-label="Gallery foto produk">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-slate-50">
        {showFallback ? (
          <ProductImagePlaceholder
            name={product.name}
            accentColor={product.accentColor}
            category={product.category}
            variant="detail"
            className="h-full w-full"
          />
        ) : (
          // Dynamic WordPress/WooCommerce image host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.src}
            alt={selected.alt || product.name}
            className="h-full w-full object-contain"
            decoding="async"
            fetchPriority="high"
            onError={() =>
              setFailedUrls((current) => new Set(current).add(selected.src))
            }
          />
        )}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Pilih foto produk">
          {images.map((image, index) => {
            const active = index === selectedIndex;
            return (
              <button
                key={`${image.id ?? image.src}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Tampilkan foto ${index + 1}: ${image.alt || product.name}`}
                aria-pressed={active}
                className={`aspect-square min-w-0 overflow-hidden rounded-xl border bg-white p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  active
                    ? "border-brand-600 ring-1 ring-brand-600"
                    : "border-line hover:border-brand-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt=""
                  className="h-full w-full rounded-lg object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
