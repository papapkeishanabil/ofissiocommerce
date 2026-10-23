"use client";

import { useEffect, useState } from "react";
import { Box, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

import { ProductImagePlaceholder } from "@/components/catalog/ProductImagePlaceholder";
import type { OfissioProduct } from "@/features/products/product.types";
import styles from "./ProductDetailTheme.module.css";

interface ProductGalleryProps {
  product: OfissioProduct;
  immersive?: boolean;
  has3DSupport?: boolean;
  onOpen3D?: () => void;
}

export function ProductGallery({
  product,
  immersive = false,
  has3DSupport = false,
  onOpen3D,
}: ProductGalleryProps) {
  const images = product.images ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelectedIndex(0);
    setFailedUrls(new Set());
  }, [product.id]);

  const selected = images[selectedIndex] ?? images[0];
  const showFallback = !selected || failedUrls.has(selected.src);

  function showPrevious() {
    if (images.length < 2) return;
    setSelectedIndex((current) => (current - 1 + images.length) % images.length);
  }

  function showNext() {
    if (images.length < 2) return;
    setSelectedIndex((current) => (current + 1) % images.length);
  }

  return (
    <div
      className={
        immersive
          ? `${styles.gallery} grid min-w-0 gap-3 lg:p-4 ${
              images.length > 1 ? "lg:grid-cols-[92px_minmax(0,1fr)]" : "grid-cols-1"
            }`
          : "min-w-0 space-y-3"
      }
      aria-label="Galeri foto produk"
    >
      {images.length > 1 ? (
        <div
          className={
            immersive
              ? "order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col"
              : "order-2 grid grid-cols-4 gap-2 sm:grid-cols-5"
          }
          aria-label="Pilih foto produk"
        >
          {images.map((image, index) => {
            const active = index === selectedIndex;
            return (
              <button
                key={`${image.id ?? image.src}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`Tampilkan foto ${index + 1}: ${image.alt || product.name}`}
                aria-pressed={active}
                className={`aspect-square shrink-0 overflow-hidden border p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  immersive ? "w-[76px] rounded-xl bg-white lg:w-full" : "min-w-0 rounded-xl bg-white"
                } ${
                  active
                    ? "border-brand-500 ring-1 ring-brand-500"
                    : immersive
                      ? "border-line hover:border-brand-400"
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
          {immersive && has3DSupport && onOpen3D ? (
            <button
              type="button"
              onClick={onOpen3D}
              aria-label="Buka Preview 3D di Studio Bordir"
              className="group relative aspect-square w-[76px] shrink-0 overflow-hidden rounded-xl border border-line bg-white p-1 transition hover:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 lg:w-full"
            >
              {images[0]?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0].src} alt="" className="h-full w-full rounded-lg object-contain opacity-80" />
              ) : null}
              <span className="absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-lg bg-brand-900/92 py-1 text-[10px] font-black text-white">
                <Box className="h-3.5 w-3.5" aria-hidden="true" /> 3D
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={
          immersive
            ? "relative order-1 h-[480px] overflow-hidden rounded-xl bg-white sm:h-[640px] lg:order-2 xl:h-[min(800px,calc(100dvh-160px))] xl:min-h-[560px]"
            : "aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-slate-50"
        }
      >
        {immersive && (
          <div className="absolute left-1/2 top-4 z-10 flex min-h-11 w-max max-w-[calc(100%-16px)] -translate-x-1/2 rounded-full border border-white/25 bg-[#142766] p-1 shadow-lg backdrop-blur">
            <span className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 text-xs sm:px-5 sm:text-sm font-bold text-brand-900">
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Foto Produk
            </span>
            {has3DSupport && onOpen3D ? (
              <button
                type="button"
                onClick={onOpen3D}
                className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs sm:px-5 sm:text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
              >
                <Box className="h-4 w-4" aria-hidden="true" />
                Preview 3D
              </button>
            ) : null}
          </div>
        )}
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
            className={
              immersive
                ? "h-full w-full object-contain px-3 pb-4 pt-20 sm:px-8"
                : "h-full w-full object-contain"
            }
            decoding="async"
            fetchPriority="high"
            onError={() =>
              setFailedUrls((current) => new Set(current).add(selected.src))
            }
          />
        )}
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Foto produk sebelumnya"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#142766] text-white shadow-lg backdrop-blur transition hover:border-brand-400 hover:bg-[#10245f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:left-5"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Foto produk berikutnya"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#142766] text-white shadow-lg backdrop-blur transition hover:border-brand-400 hover:bg-[#10245f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:right-5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

    </div>
  );
}
