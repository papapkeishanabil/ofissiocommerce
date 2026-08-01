"use client";

import { Image as ImageIcon, Maximize2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { AdminProductImage } from "@/features/products/woocommerce/woocommerce-product-admin.types";

export function AdminClickableProductRow({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const openDetail = () => router.push(href);

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={label}
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest("a, button, input, select, textarea, summary, [role='button']")
        ) {
          return;
        }
        openDetail();
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          openDetail();
        }
      }}
      className="cursor-pointer focus-visible:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
    >
      {children}
    </tr>
  );
}

export function AdminProductThumbnail({
  productName,
  image,
  size = "table",
}: {
  productName: string;
  image: AdminProductImage | null;
  size?: "table" | "mobile";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const dimensions = size === "mobile" ? "h-28 w-24" : "h-[72px] w-16";
  const close = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  if (!image?.src) {
    return (
      <span
        className={`grid ${dimensions} shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm`}
        aria-label={`${productName} belum memiliki foto`}
      >
        <span className="grid place-items-center gap-1 text-slate-400">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
          <span className="text-[9px] font-bold uppercase tracking-wide">No photo</span>
        </span>
      </span>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Perbesar foto ${productName}`}
        title="Klik untuk memperbesar foto"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
        className={`group relative grid ${dimensions} shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm transition hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
      >
        {/* WordPress media URLs are runtime-configured and cannot use a fixed Next image host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt || `Foto utama ${productName}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-1.5 transition duration-200 group-hover:scale-105"
        />
        <span className="absolute inset-0 grid place-items-center bg-slate-950/0 text-white opacity-0 transition duration-200 group-hover:bg-slate-950/35 group-hover:opacity-100 group-focus-visible:bg-slate-950/35 group-focus-visible:opacity-100">
          <Maximize2 className="h-5 w-5 drop-shadow" aria-hidden="true" />
        </span>
      </button>

      {isOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm sm:p-8"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">
                      Foto produk
                    </p>
                    <h2 id={titleId} className="mt-0.5 truncate text-lg font-semibold text-ink">
                      {productName}
                    </h2>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Tutup preview foto"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid min-h-0 flex-1 place-items-center bg-slate-100 p-4 sm:p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={`Preview besar ${productName}`}
                    className="max-h-[72vh] max-w-full object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
