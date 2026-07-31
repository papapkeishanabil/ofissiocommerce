import { notFound } from "next/navigation";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import { AdminBackLink, AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { getProductEditorTaxonomyOptions } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { AdminProductForm } from "@/features/products/components/AdminProductForm";
import { ProductReadinessPanel } from "@/features/products/components/ProductReadinessStatus";
import { getAdminWooCommerceProduct } from "@/features/products/woocommerce/woocommerce-product-admin.service";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

export default async function AdminWooProductDetailPage({ params }: PageProps) {
  requireInternalAdmin(undefined, "admin:catalog:view");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  try {
    const [product, options] = await Promise.all([
      getAdminWooCommerceProduct(id),
      getProductEditorTaxonomyOptions(),
    ]);
    return (
      <div className="space-y-6">
        <AdminBackLink href="/admin/products">Kembali ke produk</AdminBackLink>
        <AdminPageHeader
          eyebrow={`WooCommerce Product #${product.id}`}
          title={product.name}
          description="Edit data WooCommerce, metadata Ofissio, customization, dan file GLB dari satu halaman."
          actions={product.wooEditUrl ? (
            <a href={product.wooEditUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-brand-200 bg-white px-4 text-sm font-black text-brand-700 hover:bg-brand-50">
              Lihat di WooCommerce
            </a>
          ) : null}
        />
        <ProductReadinessPanel readiness={product.readiness} />
        <AdminProductForm mode="edit" product={product} options={options} />
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <AdminBackLink href="/admin/products">Kembali ke produk</AdminBackLink>
        <AdminErrorState title="Detail produk belum dapat dimuat" description="Periksa koneksi WooCommerce staging atau Product ID." />
      </div>
    );
  }
}
