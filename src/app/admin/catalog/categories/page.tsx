import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import {
  listCatalogCategories,
} from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { CatalogAdminTabs } from "@/features/catalog-taxonomy/components/CatalogAdminTabs";
import { CategoryManager } from "@/features/catalog-taxonomy/components/CategoryManager";

export default async function AdminCatalogCategoriesPage() {
  await requireInternalAdminServer("admin:catalog:view");
  try {
    const categories = await listCatalogCategories();
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Catalog taxonomy"
          title="Product categories"
          description="Kelola kategori sumber WooCommerce dan synonym yang dipakai Ofistant untuk memahami bahasa customer."
        />
        <CatalogAdminTabs active="/admin/catalog/categories" />
        <CategoryManager initialCategories={categories} />
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Catalog taxonomy"
          title="Product categories"
          description="Kategori produk berasal dari WooCommerce."
        />
        <CatalogAdminTabs active="/admin/catalog/categories" />
        <AdminErrorState
          title="Kategori WooCommerce belum dapat dimuat"
          description="Periksa koneksi dan permission read/write WooCommerce staging."
        />
      </div>
    );
  }
}
