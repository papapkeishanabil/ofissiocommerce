"use client";

import { Eye, Palette, Shirt, X } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

import { cn } from "@/lib/utils";
import type { FloatingProductPreviewData } from "../types/product-preview.types";
import { ProductPreviewVisual } from "./ProductPreviewVisual";

interface SmartFloatingPreviewProps {
  data: FloatingProductPreviewData;
  open: boolean;
  onDismiss: () => void;
  onPreview: () => void;
  desktopPreviewButtonRef: RefObject<HTMLButtonElement | null>;
  mobilePreviewButtonRef: RefObject<HTMLButtonElement | null>;
}

export function SmartFloatingPreview({
  data,
  open,
  onDismiss,
  onPreview,
  desktopPreviewButtonRef,
  mobilePreviewButtonRef,
}: SmartFloatingPreviewProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const summary = `${data.totalQty} pcs${data.embroideryCount ? ` · ${data.embroideryCount} bordir` : ""}`;
  const motionClass = entered
    ? "translate-y-0 scale-100 opacity-100"
    : "translate-y-3 scale-95 opacity-0";

  return (
    <>
      <aside
        aria-label="Preview produk ringkas"
        className={cn(
          "fixed bottom-6 z-40 hidden w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-lg transition duration-200 ease-out lg:block lg:right-4",
          motionClass,
        )}
      >
        <div className="relative">
          <ProductPreviewVisual data={data} className="aspect-[16/10] w-full object-cover" />
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup preview produk mengambang"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-ink-muted shadow-soft-xs backdrop-blur transition hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="space-y-2 p-3">
          <p className="truncate text-sm font-bold text-ink" title={data.product.name}>{data.product.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-ink-muted"><Palette className="h-3 w-3" /> {data.color}</p>
          <p className="flex items-center gap-1 text-[11px] text-ink-muted"><Shirt className="h-3 w-3" /> {summary}</p>
          <button
            ref={desktopPreviewButtonRef}
            type="button"
            onClick={onPreview}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 text-xs font-bold text-white transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden /> Preview 3D
          </button>
        </div>
      </aside>

      <aside
        aria-label="Preview produk ringkas"
        className={cn(
          "fixed bottom-3 left-3 right-20 z-40 flex min-h-16 items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-soft-lg transition duration-200 ease-out lg:hidden",
          motionClass,
        )}
      >
        <ProductPreviewVisual data={data} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-ink">{data.product.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{data.totalQty} pcs</p>
        </div>
        <button
          ref={mobilePreviewButtonRef}
          type="button"
          onClick={onPreview}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand-700 px-3 text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup preview produk mengambang"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </aside>
    </>
  );
}
