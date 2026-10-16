"use client";

import Link from "next/link";
import { ArrowRight, Building2, ImageIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/Button";
import { AccountLayout } from "@/features/dashboard/components/AccountLayout";
import { CompanyProfileForm } from "./CompanyProfileForm";
import account from "@/features/dashboard/components/DashboardOverview.module.css";
import styles from "./CompanyProfilePage.module.css";

export function CompanyProfilePage() {
  const { session, hydrated } = useAuth();
  const openAuth = useUIStore(state => state.openAuth);
  const [saved, setSaved] = useState(false);

  return <AccountLayout active="profile">
    <header className={account.header}>
      <div><h1>Profil Perusahaan</h1><p>Kelola data perusahaan dan kontak penanggung jawab untuk pemesanan Anda.</p></div>
    </header>
    {!hydrated ? <p role="status" className={account.empty}>Memuat profil perusahaan…</p> : !session ? (
      <section className={account.panel}><h2 className="text-lg font-semibold">Masuk untuk mengelola profil perusahaan</h2><Button className="mt-4" onClick={() => openAuth({ kind: "none" })}>Masuk / Daftar</Button></section>
    ) : <div className={styles.columns}>
      <section className={`${account.panel} ${styles.formPanel}`} aria-labelledby="company-profile-form-title">
        <h2 id="company-profile-form-title" className="sr-only">Data profil perusahaan</h2>
        {saved && <p role="status" className={styles.success}>Profil perusahaan berhasil disimpan.</p>}
        <CompanyProfileForm layout="account" key={`${session.company.id}:${session.user.id}`} onSuccess={() => setSaved(true)} />
      </section>
      <aside className={styles.notes}><section className={account.panel}><Building2 size={23} aria-hidden="true" /><h2>Satu profil untuk pengadaan tim</h2><p>Data perusahaan digunakan pada pesanan dan dokumen penawaran. Pastikan kontak PIC selalu dapat dihubungi.</p><hr /><h2>Alamat pengiriman</h2><p>Kelola alamat pengiriman dan penagihan perusahaan Anda.</p><Link href="/dashboard/addresses">Kelola alamat <ArrowRight size={14} /></Link></section><section className={account.panel}><ImageIcon size={23} aria-hidden="true" /><h2>Logo perusahaan</h2><p>Simpan file logo untuk memudahkan pemesanan bordir berikutnya.</p><Link href="/dashboard?view=logos">Buka Logo Library <ArrowRight size={14} /></Link></section></aside>
    </div>}
  </AccountLayout>;
}
