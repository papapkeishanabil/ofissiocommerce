import { AdminBadge } from "@/features/admin/components/AdminBadge";

import type { StockMonitoringStatus } from "../stock-monitoring.types";

export function AdminStockStatusBadge({ status }: { status: StockMonitoringStatus }) {
  const config = {
    safe: { tone: "success" as const, label: "Aman" },
    low: { tone: "warning" as const, label: "Menipis" },
    production_needed: { tone: "danger" as const, label: "Perlu produksi" },
    not_synced: { tone: "neutral" as const, label: "Tidak tersinkron" },
  }[status];
  return <AdminBadge tone={config.tone}>{config.label}</AdminBadge>;
}
