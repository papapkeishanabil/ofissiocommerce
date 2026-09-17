"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OfissioProduct } from "@/features/products/product.types";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import { studioFont } from "./studio-font";
import styles from "./Studio.module.css";

export function StudioShell({ product, onClose, children }: {
  product: OfissioProduct;
  onClose: () => void;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    root.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  return (
    <div ref={root} tabIndex={-1} role="dialog" aria-modal="true"
      aria-label="Konfigurator 3D bordir"
      className={`${studioFont.className} ${styles.shell}`}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const items = Array.from(root.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), summary, [tabindex="0"]',
        ) ?? []).filter((item) => item.getClientRects().length > 0);
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}
    >
      <WorkspaceHeader onNavigate={onClose} />
      <nav aria-label="Breadcrumb Studio Bordir" className={`${styles.breadcrumb} commerce-breadcrumb-row`}>
        <Link href="/" onClick={onClose}>Beranda</Link><ChevronRight aria-hidden="true" />
        <Link href="/catalog" onClick={onClose}>Katalog</Link><ChevronRight aria-hidden="true" />
        {product.industries[0] && <><Link href={`/catalog?industri=${encodeURIComponent(product.industries[0])}`} onClick={onClose}>{product.industries[0]}</Link><ChevronRight aria-hidden="true" /></>}
        <button type="button" onClick={onClose}>{product.name}</button><ChevronRight aria-hidden="true" />
        <span aria-current="page">Studio Bordir</span>
      </nav>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
