import { requireInternalAdmin } from "@/features/admin/admin.service";
import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import { AdminBackLink, AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { getProductEditorTaxonomyOptions } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { AdminProductForm } from "@/features/products/components/AdminProductForm";
import { getWordPressMediaRuntimeConfig } from "@/features/products/woocommerce/wordpress-media-upload.service";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  requireInternalAdmin(undefined, "admin:catalog:update");
  try {
    const options = await getProductEditorTaxonomyOptions();
    return (
      <div className="space-y-6">
        <AdminBackLink href="/admin/products">Kembali ke produk</AdminBackLink>
        <AdminPageHeader
          eyebrow="One door product management"
          title="Tambah Produk Baru"
          description="Buat produk WooCommerce, lengkapi metadata Ofissio, dan upload GLB dari satu halaman. Produk baru hanya muncul ke customer setelah readiness valid."
        />
        <AdminProductForm
          mode="create"
          options={options}
          productImageMaxMb={getWordPressMediaRuntimeConfig().maxUploadMb}
        />
      </div>
    );
  } catch {
    return <AdminErrorState title="Form produk belum dapat dimuat" description="Periksa koneksi WooCommerce dan data taxonomy staging." />;
  }
}
