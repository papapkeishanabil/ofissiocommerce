"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/Button";
import { AccountLayout } from "@/features/dashboard/components/AccountLayout";
import { CompanyLogoLibrary } from "@/features/company-assets/components/CompanyLogoLibrary";
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
      <Link href="/catalog" className={account.primary}>Buat Pesanan <ArrowRight size={16} aria-hidden="true" /></Link>
    </header>
    {!hydrated ? <p role="status" className={account.empty}>Memuat profil perusahaan…</p> : !session ? (
      <section className={account.panel}><h2 className="text-lg font-semibold">Masuk untuk mengelola profil perusahaan</h2><Button className="mt-4" onClick={() => openAuth({ kind: "none" })}>Masuk / Daftar</Button></section>
    ) : <div className={styles.columns}>
      <section className={`${account.panel} ${styles.formPanel}`} aria-labelledby="company-profile-form-title">
        <div className={account.sectionHeading}><h2 id="company-profile-form-title">Data perusahaan</h2></div>
        <p className={account.subtitle}>Pastikan data perusahaan dan PIC sesuai. Kolom bertanda * wajib diisi.</p>
        {saved && <p role="status" className={styles.success}>Profil perusahaan berhasil disimpan.</p>}
        <div className={styles.form}><CompanyProfileForm key={`${session.company.id}:${session.user.id}`} onSuccess={() => setSaved(true)} /></div>
      </section>
      <aside aria-label="Logo perusahaan" className={styles.logos}><CompanyLogoLibrary /></aside>
    </div>}
  </AccountLayout>;
}
