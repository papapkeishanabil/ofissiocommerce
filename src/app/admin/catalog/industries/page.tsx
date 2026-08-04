import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { listIndustryMaster } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { CatalogAdminTabs } from "@/features/catalog-taxonomy/components/CatalogAdminTabs";
import { IndustryManager } from "@/features/catalog-taxonomy/components/IndustryManager";

export default async function AdminCatalogIndustriesPage() {
  await requireInternalAdminServer("admin:catalog:view");
  const industries = await listIndustryMaster();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalog taxonomy"
        title="Industry master"
        description="Master industri Ofissio menghubungkan kebutuhan customer dengan produk WooCommerce melalui slug dan synonym yang konsisten."
      />
      <CatalogAdminTabs active="/admin/catalog/industries" />
      <IndustryManager initialIndustries={industries} />
    </div>
  );
}
