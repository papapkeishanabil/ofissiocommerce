"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Building2, FileText, Home, ImageIcon, MapPin, Package, ShoppingCart } from "lucide-react";
import s from "./DashboardOverview.module.css";

export type AccountView = "overview" | "orders" | "quotes" | "logos";

export function AccountSidebar({ active, onViewChange, quotationCount }: {
  active: AccountView | "addresses" | "profile" | "cart";
  onViewChange?: (view: AccountView) => void;
  quotationCount?: number;
}) {
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigation.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && current && nav.scrollWidth > nav.clientWidth) {
      nav.scrollLeft += current.getBoundingClientRect().left - nav.getBoundingClientRect().left - 16;
    }
  }, [active]);
  const items = [
    { id: "overview", label: "Ringkasan", icon: Home },
    { id: "orders", label: "Pesanan", icon: Package },
    { id: "quotes", label: "Penawaran", icon: FileText },
    { id: "logos", label: "Logo Library", icon: ImageIcon },
  ] as const;
  function item({ id, label, icon: Icon }: typeof items[number]) {
    const content = <><Icon size={19} />{label}{id === "quotes" && quotationCount !== undefined && <small>{quotationCount}</small>}</>;
    return onViewChange
      ? <button key={id} onClick={() => onViewChange(id)} aria-current={active === id ? "page" : undefined}>{content}</button>
      : <Link key={id} href={`/dashboard?view=${id}`} aria-current={active === id ? "page" : undefined}>{content}</Link>;
  }
  return <nav ref={navigation} className={s.sidebar} aria-label="Menu akun">
    {items.slice(0, 3).map(item)}
    <Link href="/dashboard/profile" aria-current={active === "profile" ? "page" : undefined}><Building2 size={19} />Profil Perusahaan</Link>
    <Link href="/dashboard/addresses" aria-current={active === "addresses" ? "page" : undefined}><MapPin size={19} />Alamat</Link>
    {item(items[3])}
    <Link href="/cart" aria-current={active === "cart" ? "page" : undefined}><ShoppingCart size={19} />Keranjang</Link>
  </nav>;
}
