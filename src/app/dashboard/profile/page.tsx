// src/app/dashboard/profile/page.tsx

import type { Metadata } from "next";

import { CompanyProfilePage } from "@/components/company/CompanyProfilePage";

export const metadata: Metadata = { title: "Profil Perusahaan" };

export default function Page() {
  return <CompanyProfilePage />;
}
