// src/app/dashboard/addresses/page.tsx

import type { Metadata } from "next";

import { AddressesPage } from "@/components/dashboard/AddressesPage";

export const metadata: Metadata = { title: "Alamat" };

export default function Page() {
  return <AddressesPage />;
}
