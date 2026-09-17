import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { getSizeChartStandards } from "@/features/size-charts/size-chart.service";
import { SizeChartStandardsManager } from "@/features/size-charts/components/SizeChartStandardsManager";

export default async function AdminSizeChartStandardsPage() {
  const actor = await requireInternalAdminServer("admin:catalog:view");
  const state = await getSizeChartStandards();
  const canUpdate = actor.role === "super_admin" || actor.role === "product_admin";
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Master & pengaturan B2B"
        title="Standar Ukuran"
        description="Master tabel pengukuran (lingkar dada & panjang per ukuran) per jenis produk. Produk otomatis menampilkan panduan ukuran sesuai kategori WooCommerce-nya; produk di luar semua kategori memakai standar fallback."
      />
      <SizeChartStandardsManager initialState={state} canUpdate={canUpdate} />
    </div>
  );
}
