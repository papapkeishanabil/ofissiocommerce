import Link from "next/link";
import { Boxes, Box, ExternalLink, FileBox, Pencil, Plus } from "lucide-react";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { AdminBadge } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import {
  ADMIN_TABLE_CLASS,
  AdminCard,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { formatRupiah } from "@/features/admin/admin.utils";
import {
  Product3DStatusBadge,
  ProductIssueSummary,
  ProductReadinessBadge,
} from "@/features/products/components/ProductReadinessStatus";
import { listAdminWooCommerceProducts } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import type { AdminWooCommerceProduct } from "@/features/products/woocommerce/woocommerce-product-admin.types";

export default async function AdminProductsPage() {
  requireInternalAdmin(undefined, "admin:catalog:view");
  try {
    const products = await listAdminWooCommerceProducts();
    const validCount = products.filter(
      (product) => product.readiness.isVisibleInOfissio,
    ).length;
    const missingGlbCount = products.filter(
      (product) => product.readiness.model3DStatus === "glb_missing",
    ).length;

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Product readiness"
          title="Produk WooCommerce"
          description="Lihat semua produk dari WooCommerce, termasuk produk yang belum tampil di Ofissio, beserta field yang masih harus dilengkapi."
          actions={
            <Link href="/admin/products/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 text-sm font-black text-white shadow-lg shadow-brand-900/15 transition hover:bg-brand-800">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Produk Baru
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink-muted">
            <span className="rounded-full border border-line bg-white/80 px-3 py-1.5">
              Produk baru tidak otomatis tampil di Ofissio.
            </span>
            <span className="rounded-full border border-line bg-white/80 px-3 py-1.5">
              Customer hanya melihat produk valid.
            </span>
          </div>
        </AdminPageHeader>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan kesiapan produk">
          <SummaryCard label="Semua produk Woo" value={products.length} icon={Boxes} />
          <SummaryCard label="Valid untuk Ofissio" value={validCount} icon={Box} tone="success" />
          <SummaryCard label="GLB belum ada" value={missingGlbCount} icon={FileBox} tone="warning" />
        </section>

        {products.length === 0 ? (
          <AdminCard>
            <AdminEmptyState
              title="Produk WooCommerce belum tersedia"
              description="Tambahkan produk di WooCommerce atau periksa konfigurasi staging."
            />
          </AdminCard>
        ) : (
          <>
            <AdminTableShell className="hidden lg:block">
              <table className={`${ADMIN_TABLE_CLASS} min-w-[1480px]`}>
                <thead className="bg-slate-50/90">
                  <tr>
                    <th>Woo Product ID</th>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Harga</th>
                    <th>Status WooCommerce</th>
                    <th>Kategori</th>
                    <th>Industri</th>
                    <th>Status Ofissio</th>
                    <th>Status 3D</th>
                    <th>Yang Belum Lengkap</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ProductTableRow key={product.id} product={product} />
                  ))}
                </tbody>
              </table>
            </AdminTableShell>

            <div className="grid gap-4 lg:hidden">
              {products.map((product) => (
                <ProductMobileCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Product readiness"
          title="Produk WooCommerce"
          description="Semua produk WooCommerce dan status kesiapan Ofissio."
        />
        <AdminErrorState
          title="Produk WooCommerce belum dapat dimuat"
          description="Periksa koneksi WooCommerce staging dan permission read product."
        />
      </div>
    );
  }
}

function ProductTableRow({ product }: { product: AdminWooCommerceProduct }) {
  return (
    <tr>
      <td className="font-mono text-xs font-bold text-ink">#{product.id}</td>
      <td>
        <p className="max-w-52 font-black text-ink">{product.name}</p>
        <p className="mt-1 max-w-52 truncate text-xs text-ink-muted">/{product.slug}</p>
      </td>
      <td className="font-mono text-xs font-semibold text-ink">{product.sku || "-"}</td>
      <td className="whitespace-nowrap font-bold text-ink">
        {product.price > 0 ? formatRupiah(product.price) : "-"}
      </td>
      <td>
        <WooStatusBadge status={product.status} />
      </td>
      <td className="max-w-44 text-ink-muted">
        {product.categories.map((item) => item.name).join(", ") || "-"}
      </td>
      <td className="max-w-44 text-ink-muted">{product.industries.join(", ") || "-"}</td>
      <td><ProductReadinessBadge readiness={product.readiness} /></td>
      <td><Product3DStatusBadge readiness={product.readiness} /></td>
      <td className="max-w-64">
        <ProductIssueSummary issues={product.readiness.blockingIssues} />
      </td>
      <td><ProductActions product={product} compact /></td>
    </tr>
  );
}

function ProductMobileCard({ product }: { product: AdminWooCommerceProduct }) {
  return (
    <AdminCard>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">Woo #{product.id}</p>
          <h2 className="mt-1 break-words text-lg font-black text-ink">{product.name}</h2>
          <p className="mt-1 font-mono text-xs text-ink-muted">{product.sku || "SKU belum diisi"}</p>
        </div>
        <WooStatusBadge status={product.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ProductReadinessBadge readiness={product.readiness} />
        <Product3DStatusBadge readiness={product.readiness} />
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <MobileInfo label="Harga" value={product.price > 0 ? formatRupiah(product.price) : "-"} />
        <MobileInfo label="Kategori" value={product.categories.map((item) => item.name).join(", ") || "-"} />
        <MobileInfo label="Industri" value={product.industries.join(", ") || "-"} />
      </dl>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
        <p className="font-black text-ink">Yang belum lengkap</p>
        <p className="mt-1"><ProductIssueSummary issues={product.readiness.blockingIssues} /></p>
      </div>
      <div className="mt-4"><ProductActions product={product} /></div>
    </AdminCard>
  );
}

function ProductActions({
  product,
  compact = false,
}: {
  product: AdminWooCommerceProduct;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex min-w-48 flex-col gap-2" : "flex flex-wrap gap-2"}>
      <Link
        href={`/admin/products/woocommerce/${product.id}`}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        {product.readiness.isVisibleInOfissio ? "Edit" : "Lengkapi Produk"}
      </Link>
      <Link
        href={`/admin/products/woocommerce/${product.id}#model-3d`}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-black text-brand-700 transition hover:bg-brand-50"
      >
        <FileBox className="h-3.5 w-3.5" aria-hidden="true" />
        Upload GLB
      </Link>
      {product.wooEditUrl ? (
        <a
          href={product.wooEditUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-black text-brand-700 transition hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Buka WooCommerce
        </a>
      ) : null}
    </div>
  );
}

function WooStatusBadge({ status }: { status: string }) {
  return (
    <AdminBadge tone={status === "publish" ? "success" : "warning"}>
      {status === "publish" ? "Published" : `Draft WooCommerce (${status})`}
    </AdminBadge>
  );
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-3">
      <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-ink-subtle">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  tone?: "brand" | "success" | "warning";
}) {
  const colors = {
    brand: "bg-brand-700 text-white",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
  };
  return (
    <AdminCard className="flex items-center justify-between gap-4 !p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ink-subtle">{label}</p>
        <p className="mt-1 text-2xl font-black text-ink">{value}</p>
      </div>
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${colors[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </AdminCard>
  );
}
