// src/app/dashboard/profile/page.tsx

import type { Metadata } from "next";

import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";

export const metadata: Metadata = { title: "Profil Perusahaan" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Profil Perusahaan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Perbarui data perusahaan Anda. Lengkapi untuk mengaktifkan checkout.
        </p>
      </header>
      <div className="rounded-2xl border border-line bg-surface p-5">
        <CompanyProfileForm />
      </div>
    </div>
  );
}
