import type { Metadata } from "next";

import { CustomBriefApprovalPage } from "@/components/quote/CustomBriefApprovalPage";

export const metadata: Metadata = { title: "Persetujuan Brief Full Custom" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomBriefApprovalPage id={id} />;
}
