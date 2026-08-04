// src/app/dashboard/profile/page.tsx

import type { Metadata } from "next";

import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CompanyLogoLibrary } from "@/features/company-assets/components/CompanyLogoLibrary";

export const metadata: Metadata = { title: "Profil Perusahaan" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profil Perusahaan" },
        ]}
        className="mb-4"
      />
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Profil Perusahaan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Perbarui data perusahaan Anda. Lengkapi untuk mengaktifkan checkout.
        </p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section
          className="rounded-2xl border border-line bg-surface p-5"
          aria-labelledby="company-profile-form-title"
        >
          <h2 id="company-profile-form-title" className="sr-only">
            Data profil perusahaan
          </h2>
          <CompanyProfileForm />
        </section>
        <CompanyLogoLibrary />
      </div>
    </div>
  );
}
