import Link from "next/link";
import { Boxes, Box, ExternalLink, FileBox, Pencil, Plus, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { requireInternalAdminServer } from "@/features/admin/admin.service";
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
  AdminClickableProductRow,
  AdminProductThumbnail,
} from "@/features/products/components/AdminProductListInteractions";
import {
  Product3DStatusBadge,
  ProductIssueSummary,
  ProductReadinessBadge,
} from "@/features/products/components/ProductReadinessStatus";
import { listAdminWooCommerceProducts } from "@/features/products/woocommerce/woocommerce-product-admin.service";
import type { AdminWooCommerceProduct } from "@/features/products/woocommerce/woocommerce-product-admin.types";

interface AdminProductsPageProps {
  searchParams: Promise<{
    q?: string;
    wooStatus?: string;
    readiness?: string;
    model3d?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  await requireInternalAdminServer("admin:catalog:view");
  try {
    const filters = await searchParams;
    const products = await listAdminWooCommerceProducts();
    const validCount = products.filter(
      (product) => product.readiness.isVisibleInOfissio,
    ).length;
    const missingGlbCount = products.filter(
      (product) => product.readiness.model3DStatus === "glb_missing",
    ).length;
    const query = filters.q?.trim().toLocaleLowerCase("id-ID") ?? "";
    const wooStatus = filters.wooStatus ?? "all";
    const readiness = filters.readiness ?? "all";
    const model3d = filters.model3d ?? "all";
    const filteredProducts = products.filter((product) => {
      const searchable = [
        product.name,
        product.sku,
        product.slug,
        String(product.id),
        ...product.categories.map((item) => item.name),
        ...product.industries,
      ].join(" ").toLocaleLowerCase("id-ID");
      const matchesQuery = !query || searchable.includes(query);
      const matchesWoo = wooStatus === "all" || product.status === wooStatus;
      const matchesReadiness = readiness === "all"
        || (readiness === "visible" && product.readiness.isVisibleInOfissio)
        || (readiness === "incomplete" && !product.readiness.isVisibleInOfissio);
      const model3dReady = !["glb_missing", "glb_invalid"].includes(product.readiness.model3DStatus);
      const matchesModel3d = model3d === "all"
        || (model3d === "ready" && model3dReady)
        || (model3d === "missing" && !model3dReady);
      return matchesQuery && matchesWoo && matchesReadiness && matchesModel3d;
    });
    const hasFilters = Boolean(query || wooStatus !== "all" || readiness !== "all" || model3d !== "all");

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Product readiness"
          title="Produk WooCommerce"
          description="Lihat semua produk dari WooCommerce, termasuk produk yang belum tampil di Ofissio, beserta field yang masih harus dilengkapi."
          actions={
            <Link href="/admin/products/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Produk Baru
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2 text-xs font-medium text-ink-muted">
            <span className="rounded-md border border-line bg-slate-50 px-3 py-1.5">
              Produk baru tidak otomatis tampil di Ofissio.
            </span>
            <span className="rounded-md border border-line bg-slate-50 px-3 py-1.5">
              Customer hanya melihat produk valid.
            </span>
          </div>
        </AdminPageHeader>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan kesiapan produk">
          <SummaryCard label="Semua produk Woo" value={products.length} icon={Boxes} />
          <SummaryCard label="Valid untuk Ofissio" value={validCount} icon={Box} tone="success" />
          <SummaryCard label="GLB belum ada" value={missingGlbCount} icon={FileBox} tone="warning" />
        </section>

        <AdminCard className="!p-4 sm:!p-5">
          <form method="get" className="space-y-4" aria-label="Cari dan filter produk">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <h2 className="text-sm font-bold text-ink">Cari dan filter produk</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(160px,1fr))_auto]">
              <label className="relative block">
                <span className="sr-only">Cari nama, SKU, ID, kategori, atau industri</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Cari nama, SKU, atau ID produk"
                  className="min-h-11 w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <FilterSelect name="wooStatus" label="Status WooCommerce" value={wooStatus} options={[
                ["all", "Semua status Woo"], ["publish", "Published"], ["draft", "Draft"], ["pending", "Pending"], ["private", "Private"],
              ]} />
              <FilterSelect name="readiness" label="Kesiapan Ofissio" value={readiness} options={[
                ["all", "Semua kesiapan"], ["visible", "Tampil di Ofissio"], ["incomplete", "Perlu dilengkapi"],
              ]} />
              <FilterSelect name="model3d" label="Status model 3D" value={model3d} options={[
                ["all", "Semua status 3D"], ["ready", "3D siap"], ["missing", "3D belum siap"],
              ]} />
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                <Search className="h-4 w-4" aria-hidden="true" /> Terapkan
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
              <p className="font-medium text-ink-muted" aria-live="polite">
                Menampilkan <strong className="text-ink">{filteredProducts.length}</strong> dari {products.length} produk.
              </p>
              {hasFilters ? (
                <Link href="/admin/products" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 font-semibold text-brand-700 transition hover:bg-brand-50">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset filter
                </Link>
              ) : null}
            </div>
          </form>
        </AdminCard>

        {products.length === 0 ? (
          <AdminCard>
            <AdminEmptyState
              title="Produk WooCommerce belum tersedia"
              description="Tambahkan produk di WooCommerce atau periksa konfigurasi staging."
            />
          </AdminCard>
        ) : filteredProducts.length === 0 ? (
          <AdminCard>
            <AdminEmptyState
              title="Produk tidak ditemukan"
              description="Tidak ada produk yang sesuai dengan pencarian dan filter saat ini. Ubah kata kunci atau reset filter."
            />
            <div className="mt-4 flex justify-center">
              <Link href="/admin/products" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-brand-700 hover:bg-brand-50">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset filter
              </Link>
            </div>
          </AdminCard>
        ) : (
          <>
            <AdminTableShell className="hidden lg:block">
              <table className={`${ADMIN_TABLE_CLASS} min-w-[1480px]`}>
                <thead>
                  <tr>
                    <th className="w-24">Foto</th>
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
                  {filteredProducts.map((product) => (
                    <ProductTableRow key={product.id} product={product} />
                  ))}
                </tbody>
              </table>
            </AdminTableShell>

            <div className="grid gap-4 lg:hidden">
              {filteredProducts.map((product) => (
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

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        aria-label={label}
        className="min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function ProductTableRow({ product }: { product: AdminWooCommerceProduct }) {
  return (
    <AdminClickableProductRow
      href={`/admin/products/woocommerce/${product.id}`}
      label={`Buka detail ${product.name}`}
    >
      <td>
        <AdminProductThumbnail
          productName={product.name}
          image={product.primaryImage}
        />
      </td>
      <td className="font-mono text-xs font-semibold text-ink">#{product.id}</td>
      <td>
        <p className="max-w-52 font-semibold text-ink">{product.name}</p>
        <p className="mt-0.5 max-w-52 truncate text-xs text-ink-muted">/{product.slug}</p>
      </td>
      <td className="font-mono text-xs font-medium text-ink">{product.sku || "-"}</td>
      <td className="whitespace-nowrap font-semibold text-ink">
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
    </AdminClickableProductRow>
  );
}

function ProductMobileCard({ product }: { product: AdminWooCommerceProduct }) {
  return (
    <AdminCard>
      <div className="flex min-w-0 items-start gap-4">
        <AdminProductThumbnail
          productName={product.name}
          image={product.primaryImage}
          size="mobile"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Woo #{product.id}</p>
              <h2 className="mt-1 break-words text-lg font-semibold text-ink">{product.name}</h2>
              <p className="mt-0.5 break-all font-mono text-xs text-ink-muted">{product.sku || "SKU belum diisi"}</p>
            </div>
            <WooStatusBadge status={product.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProductReadinessBadge readiness={product.readiness} />
            <Product3DStatusBadge readiness={product.readiness} />
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <MobileInfo label="Harga" value={product.price > 0 ? formatRupiah(product.price) : "-"} />
        <MobileInfo label="Kategori" value={product.categories.map((item) => item.name).join(", ") || "-"} />
        <MobileInfo label="Industri" value={product.industries.join(", ") || "-"} />
      </dl>
      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-ink">Yang belum lengkap</p>
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
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        {product.readiness.isVisibleInOfissio ? "Edit" : "Lengkapi Produk"}
      </Link>
      <Link
        href={`/admin/products/woocommerce/${product.id}#model-3d`}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-muted transition hover:bg-slate-50"
      >
        <FileBox className="h-3.5 w-3.5" aria-hidden="true" />
        Upload GLB
      </Link>
      {product.wooEditUrl ? (
        <a
          href={product.wooEditUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
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
      {status === "publish" ? "Published" : `Draft (${status})`}
    </AdminBadge>
  );
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.06em] text-ink-subtle">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
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
  const chipColors = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };
  return (
    <AdminCard className="flex items-center justify-between gap-4 !p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-ink-subtle">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
      </div>
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${chipColors[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </AdminCard>
  );
}
