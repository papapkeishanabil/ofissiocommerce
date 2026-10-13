"use client";

import Link from "next/link";
import { Building2, FileText, Home, ImageIcon, MapPin, Package } from "lucide-react";
import s from "./DashboardOverview.module.css";

export type AccountView = "overview" | "orders" | "quotes" | "logos";

export function AccountSidebar({ active, onViewChange, quotationCount }: {
  active: AccountView | "addresses";
  onViewChange?: (view: AccountView) => void;
  quotationCount?: number;
}) {
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
  return <nav className={s.sidebar} aria-label="Menu akun">
    {items.slice(0, 3).map(item)}
    <Link href="/dashboard/profile"><Building2 size={19} />Profil Perusahaan</Link>
    <Link href="/dashboard/addresses" aria-current={active === "addresses" ? "page" : undefined}><MapPin size={19} />Alamat</Link>
    {item(items[3])}
  </nav>;
}
