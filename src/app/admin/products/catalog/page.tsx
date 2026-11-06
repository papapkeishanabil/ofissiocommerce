import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { AdminPageHeader } from "@/features/admin/components/AdminSurface";
import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import { listAdminWooCommerceProducts } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import { CatalogExportForm } from "@/features/catalog-export/CatalogExportForm";

export default async function AdminCatalogExportPage() {
  await requireInternalAdminServer("admin:catalog:view");
  let products;
  try { products = await listAdminWooCommerceProducts(); }
  catch { return <AdminErrorState title="Produk belum dapat dimuat" description="Periksa koneksi WooCommerce, lalu buka kembali halaman ini." />; }
  return <div className="space-y-6">
    <AdminPageHeader eyebrow="Katalog Ofissio" title="Export Katalog PDF" description="Buat katalog dari produk terbaru dengan cover showroom dan desain Corporate Precision."
      actions={<Link href="/admin/products" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Kembali ke Produk</Link>} />
    <CatalogExportForm products={products.filter(p => p.status === "publish").map(p => ({ id:p.id,name:p.name,sku:p.sku,categories:p.categories.map(c => ({ id:c.id,name:c.name })) }))} />
  </div>;
}
