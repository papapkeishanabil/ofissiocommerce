import type { ReactNode } from "react";

import { AdminLayout } from "@/features/admin/components/AdminLayout";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
