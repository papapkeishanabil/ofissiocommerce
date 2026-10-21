"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { OfissioProduct } from "@/features/products/product.types";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";
import styles from "./ProductImagePreview.module.css";

export function ProductImagePreview({ product, className, children }: {
  product: OfissioProduct;
  className: string;
  children: ReactNode;
}) {
  const primary = product.images?.[0]?.src || product.mainImage;
  const secondary = product.images?.[1];
  // Remount image state when filtering or refreshed media changes the sources.
  return <Preview key={`${product.id}:${primary}:${secondary?.src}`} product={product}
    primary={primary} secondary={secondary?.src !== primary ? secondary : undefined}
    className={className}>{children}</Preview>;
}

function Preview({ product, primary, secondary, className, children }: {
  product: OfissioProduct;
  primary?: string | null;
  secondary?: NonNullable<OfissioProduct["images"]>[number];
  className: string;
  children: ReactNode;
}) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(false);
  const available = Boolean(secondary?.src) && !secondaryFailed;
  const active = available && loaded && (hovered || focused || selected);
  const sizes = "(max-width: 560px) 100vw, (max-width: 950px) 50vw, (max-width: 1250px) 33vw, 25vw";

  return <div className={`${className} ${styles.preview}`}
    onPointerEnter={(event) => {
      if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) {
        setRequested(true);
        setHovered(true);
      }
    }}
    onPointerLeave={(event) => {
      setHovered(false);
      if (event.pointerType === "mouse") setSelected(false);
    }}>
    <Link href={`/product/${product.slug}`} className={styles.link}
      aria-label={`Lihat detail ${product.name}`}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) {
          setRequested(true);
          setFocused(true);
        }
      }} onBlur={() => setFocused(false)}>
      {primary && !primaryFailed ? <Image src={primary} fill sizes={sizes}
        alt={product.images?.[0]?.alt || product.name} aria-hidden={active}
        className={styles.image} loading="lazy" onError={() => setPrimaryFailed(true)} /> :
        <ProductImagePlaceholder name={product.name} category={product.category}
          accentColor={product.accentColor} className="h-full w-full" />}
      {available && requested && secondary ? <Image src={secondary.src} fill sizes={sizes}
        alt={secondary.alt || `Foto kedua ${product.name}`} aria-hidden={!active}
        className={`${styles.image} ${styles.secondary}`} style={{ opacity: active ? 1 : 0 }}
        loading="eager" onLoad={() => setLoaded(true)} onError={() => setSecondaryFailed(true)} /> : null}
      {children}
    </Link>
    {available ? <div className={styles.controls} role="group" aria-label={`Pilih foto ${product.name}`}>
      {[false, true].map((second) => <button key={String(second)} type="button"
        aria-label={`Tampilkan foto ${second ? "kedua" : "utama"} ${product.name}`}
        aria-pressed={second ? active : !active}
        onClick={() => {
          setHovered(false);
          setFocused(false);
          setSelected(second);
          if (second) setRequested(true);
        }}>
        <span className={(second ? active : !active) ? styles.activeDot : styles.dot} />
      </button>)}
    </div> : null}
  </div>;
}
