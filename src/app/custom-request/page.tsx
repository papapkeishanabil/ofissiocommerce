import type { Metadata } from "next";

import { CustomRequestPage } from "@/components/quote/CustomRequestPage";
import { getMoqSettings } from "@/features/moq-settings/moq-settings.service";

export const metadata: Metadata = {
  title: "Seragam Full Custom",
  description:
    "Ajukan desain, model, bahan, warna, pola, dan ukuran seragam khusus perusahaan Anda.",
};

// Master MOQ (Supabase) drives the soft production-MOQ note; never freeze it
// into a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { settings } = await getMoqSettings();
  return <CustomRequestPage productionMoq={settings.production} />;
}
