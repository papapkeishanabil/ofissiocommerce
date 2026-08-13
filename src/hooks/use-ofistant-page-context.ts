"use client";

// useOfistantPageContext
// ----------------------
// Makes Ofistant "page-aware": it reads which page the customer is viewing
// (usePathname) plus the real cart/embroidery breakdown from the shared
// cart-store, and publishes a compact snapshot into the Ofistant session
// context via setContext({ pageContext }).
//
// That snapshot is what the backend LLM prompt turns into the
// "INFORMASI HALAMAN SAAT INI" block — so Ofistant can answer specific
// questions about what is on screen (e.g. "kenapa harga bordir segini" at
// checkout, answered from the actual embroideryLines of each cart item).
//
// CONSTRAINT-SAFE: this only READS shared stores (cart-store) + the route.
// It does not modify any page's code — checkout/cart/product stay untouched.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useOfistantStore } from "@/stores/ofistant-store";
import { useCartStore } from "@/stores/cart-store";
import type {
  OfistantPageContext,
  OfistantPageLineContext,
} from "@/lib/ofistant/ofistant.types";

const MAX_LINES = 8;
const MAX_EMBROIDERY_PER_LINE = 6;

interface RouteDescriptor {
  route: string;
  label: string;
  cartPage: boolean;
  note: string | null;
}

function describeRoute(pathname: string | null): RouteDescriptor {
  if (!pathname) {
    return { route: "", label: "Tidak diketahui", cartPage: false, note: null };
  }
  if (pathname === "/checkout") {
    return { route: pathname, label: "Checkout", cartPage: true, note: null };
  }
  if (pathname === "/cart") {
    return { route: pathname, label: "Keranjang", cartPage: true, note: null };
  }
  if (pathname.startsWith("/product/")) {
    const slug = pathname.slice("/product/".length);
    return {
      route: pathname,
      label: "Detail Produk",
      cartPage: false,
      note: `Pelanggan sedang membuka detail produk (slug: ${slug || "-"}).`,
    };
  }
  if (pathname.startsWith("/orders/")) {
    return {
      route: pathname,
      label: "Detail Pesanan",
      cartPage: false,
      note: "Pelanggan sedang membuka detail pesanan/order mereka.",
    };
  }
  if (pathname === "/quote" || pathname === "/custom-request") {
    return {
      route: pathname,
      label: "Minta Penawaran",
      cartPage: false,
      note: null,
    };
  }
  if (pathname.startsWith("/catalog")) {
    return { route: pathname, label: "Katalog Produk", cartPage: false, note: null };
  }
  if (pathname === "/") {
    return { route: pathname, label: "Beranda", cartPage: false, note: null };
  }
  return { route: pathname, label: "Halaman Lain", cartPage: false, note: null };
}

function buildCartLines(): OfistantPageLineContext[] {
  const items = useCartStore.getState().items;
  return items.slice(0, MAX_LINES).map((it) => ({
    productName: it.productName,
    color: it.color,
    totalQty: it.totalQty,
    unitPrice: it.unitPrice,
    subtotal: it.finalEstimatedTotal ?? it.estimatedPrice,
    tierLabel: it.quantityTierLabel,
    embroidery: (it.embroideryLines ?? [])
      .slice(0, MAX_EMBROIDERY_PER_LINE)
      .map((e) => ({
        label: e.label,
        quantity: e.quantity,
        unitPrice: e.unitPrice,
        subtotal: e.subtotal,
      })),
    embroideryTotal: it.embroideryTotal ?? 0,
  }));
}

function buildPageContext(pathname: string | null): OfistantPageContext {
  const desc = describeRoute(pathname);
  const lines = desc.cartPage ? buildCartLines() : [];
  const cartTotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
  return {
    route: desc.route,
    label: desc.label,
    cartPage: desc.cartPage,
    lines,
    cartTotal,
    note: desc.note,
  };
}

/**
 * Mount this inside OfistantPanel so the session context always reflects the
 * page the customer is viewing + their live cart breakdown. Returns nothing —
 * it is a side-effect hook. Updates are de-duplicated by a serialized signature
 * to avoid no-op store writes.
 */
export function useOfistantPageContext(): null {
  const pathname = usePathname();
  // Subscribe to cart items so the breakdown stays fresh while the panel is open.
  const items = useCartStore((s) => s.items);
  const lastSig = useRef<string>("");

  useEffect(() => {
    const page = buildPageContext(pathname);
    const sig = JSON.stringify(page);
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    useOfistantStore.getState().setContext({ pageContext: page });
  }, [pathname, items]);

  return null;
}
