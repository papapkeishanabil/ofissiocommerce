import type { Metadata } from "next";

import { MockPaymentPage } from "@/components/payment/MockPaymentPage";

export const metadata: Metadata = {
  title: "Simulasi Pembayaran Gagal",
  description: "Sandbox pembayaran mock Ofissio.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId = "" } = await searchParams;
  return <MockPaymentPage paymentId={paymentId} initialSimulation="failed" />;
}
