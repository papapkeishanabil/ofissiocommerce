// src/features/promotions/components/PromotionShowcase.tsx
// Halaman publik /promo — daftar voucher aktif dari admin/WooCommerce.
// Murni display: validasi diskon tetap di server saat voucher dipakai.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Copy, Sparkles, TicketPercent } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import styles from "./PromotionShowcase.module.css";
import {
  PROMOTION_TYPE_BADGE,
  PENDING_PROMO_STORAGE_KEY,
  type PublicPromotion,
} from "../promotion.types";

const crumbs: Crumb[] = [
  { label: "Beranda", href: "/" },
  { label: "Promo" },
];

export function PromotionShowcase() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<PublicPromotion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/promotions", { cache: "no-store" });
        const data = (await response.json()) as {
          ok?: boolean;
          promotions?: PublicPromotion[];
          message?: string;
        };
        if (!response.ok || !data.ok) throw new Error(data.message ?? "Gagal memuat promo.");
        if (!cancelled) setPromotions(data.promotions ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat promo.");
          setPromotions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 2000);
    } catch {
      // Clipboard diblokir browser — biarkan customer menyalin manual.
      setCopiedCode(null);
    }
  }

  function handleUseNow(code: string) {
    try {
      window.sessionStorage.setItem(PENDING_PROMO_STORAGE_KEY, code);
    } catch {
      // sessionStorage tidak tersedia — tetap arahkan ke keranjang.
    }
    router.push("/cart");
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={crumbs} className="mb-4" />
      <header className={styles.header}><div>
        <h1>
          Promo &amp; Voucher Ofissio
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-muted">
          Pilih voucher yang tersedia untuk pesanan seragam Anda. Satu voucher
          dipakai per transaksi dan tetap divalidasi saat checkout.
        </p>
        </div><span className={styles.headerIcon}><TicketPercent size={32} aria-hidden="true"/></span>
      </header>
      <div className={styles.intro}><span>{promotions === null ? "Memuat voucher yang tersedia…" : `${promotions.length} voucher tersedia`}. Kode promo akan diperiksa sesuai isi keranjang Anda.</span><Link href="/cart">Lihat keranjang <ArrowRight size={16}/></Link></div>

      {promotions === null ? (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-line bg-surface"
            />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className={styles.empty}>
          <TicketPercent className="mb-3 h-12 w-12 text-brand-200" aria-hidden="true" />
          <h2>
            {error ?? "Belum ada promo aktif saat ini."}
          </h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
            Cek kembali nanti, atau tanya Ofistant untuk penawaran khusus
            pesanan Anda.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => router.push("/catalog")}>
              Lihat katalog
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {promotions.map((promo) => (
            <article
              key={promo.id}
              className={styles.card}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  {PROMOTION_TYPE_BADGE[promo.discountType]}
                </span>
                {promo.restrictionLabel ? (
                  <span className="rounded-md bg-ochre-50 px-2 py-0.5 text-[11px] font-semibold text-ochre-700">
                    {promo.restrictionLabel}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-strong tabular-nums">
                {promo.displayTitle}
              </h2>
              {promo.description ? (
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {promo.description}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold text-ink-muted">
                {promo.displaySubtitle}
              </p>

              <div className={styles.code}>
                <span className="min-w-0 truncate font-mono text-sm font-bold tracking-wider text-brand-800">
                  {promo.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(promo.code)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  {copiedCode === promo.code ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Salin kode
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex-1" />
              <Button
                className="w-full"
                onClick={() => handleUseNow(promo.code)}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Pakai voucher
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
