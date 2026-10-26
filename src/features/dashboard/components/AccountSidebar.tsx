"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Building2, FileText, Home, ImageIcon, MapPin, Package, ShoppingCart, Headphones, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import s from "./DashboardOverview.module.css";
import { customerWhatsappHref } from "@/lib/customer-support";

export type AccountView = "overview" | "orders" | "quotes" | "logos";

export function AccountSidebar({ active, onViewChange, quotationCount, invoiceCount = 0 }: {
  active: AccountView | "addresses" | "profile" | "cart";
  onViewChange?: (view: AccountView) => void;
  quotationCount?: number;
  invoiceCount?: number;
}) {
  const navigation = useRef<HTMLElement>(null);
  const { session } = useAuth();
  const whatsappHref = customerWhatsappHref();
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
    const content = <><Icon size={19} />{label}{id === "orders" && invoiceCount > 0 && <small aria-label={`${invoiceCount} invoice menunggu pembayaran`}>{invoiceCount}</small>}{id === "quotes" && quotationCount !== undefined && <small>{quotationCount}</small>}</>;
    return onViewChange
      ? <button key={id} onClick={() => onViewChange(id)} aria-current={active === id ? "page" : undefined}>{content}</button>
      : <Link key={id} href={`/dashboard?view=${id}`} aria-current={active === id ? "page" : undefined}>{content}</Link>;
  }
  return <aside className={s.sidebar}>
    <div className={s.accountIdentity}><span className={s.accountMark}><Building2 size={23} aria-hidden="true" /></span><strong>{session?.company.companyName || "Akun perusahaan"}</strong><span>Ruang pengadaan Anda</span></div>
    <nav ref={navigation} className={s.navigation} aria-label="Menu akun">
    {items.slice(0, 3).map(item)}
    <Link href="/dashboard/profile" aria-current={active === "profile" ? "page" : undefined}><Building2 size={19} />Profil Perusahaan</Link>
    <Link href="/dashboard/addresses" aria-current={active === "addresses" ? "page" : undefined}><MapPin size={19} />Alamat</Link>
    {item(items[3])}
    <Link href="/cart" aria-current={active === "cart" ? "page" : undefined}><ShoppingCart size={19} />Keranjang</Link>
    </nav>
    <div className={s.sidebarHelp}><Headphones size={20} aria-hidden="true" /><strong>Butuh bantuan?</strong><p>Tim Ofissio siap membantu kebutuhan seragam Anda.</p><a href={whatsappHref ?? "mailto:sales@ofissio.com"} target={whatsappHref ? "_blank" : undefined} rel={whatsappHref ? "noopener noreferrer" : undefined}>{whatsappHref ? "Chat WhatsApp Ofissio" : "Email Ofissio"} <ArrowUpRight size={14} aria-hidden="true" /></a></div>
  </aside>;
}
