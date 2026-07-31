import Link from "next/link";
import { ExternalLink, FileBox } from "lucide-react";
import { notFound } from "next/navigation";

import { requireInternalAdmin } from "@/features/admin/admin.service";
import { AdminBadge } from "@/features/admin/components/AdminBadge";
import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import {
  AdminBackLink,
  AdminPageHeader,
  AdminPanel,
} from "@/features/admin/components/AdminSurface";
import { formatRupiah } from "@/features/admin/admin.utils";
import { ProductReadinessPanel } from "@/features/products/components/ProductReadinessStatus";
import { getAdminWooCommerceProduct } from "@/features/products/woocommerce/woocommerce-product-admin.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWooProductDetailPage({ params }: PageProps) {
  requireInternalAdmin(undefined, "admin:catalog:view");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  try {
    const product = await getAdminWooCommerceProduct(id);
    return (
      <div className="space-y-6">
        <AdminBackLink href="/admin/products">Kembali ke produk</AdminBackLink>
        <AdminPageHeader
          eyebrow={`WooCommerce Product #${product.id}`}
          title={product.name}
          description="Periksa informasi sumber dan field Ofissio sebelum produk ditampilkan kepada customer."
          actions={
            product.wooEditUrl ? (
              <a
                href={product.wooEditUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-2 text-sm font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Buka WooCommerce
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null
          }
        />

        <ProductReadinessPanel readiness={product.readiness} />

        <AdminPanel
          title="Informasi Produk WooCommerce"
          description="Data utama dibaca langsung dari WooCommerce staging."
        >
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Product ID" value={`#${product.id}`} mono />
            <Info label="Nama produk" value={product.name} />
            <Info label="SKU" value={product.sku || "Belum diisi"} mono />
            <Info label="Harga" value={product.price > 0 ? formatRupiah(product.price) : "Belum diisi"} />
            <Info label="Status" value={product.status} />
            <Info label="Kategori" value={product.categories.map((item) => item.name).join(", ") || "Belum dipilih"} />
            <Info label="Industri" value={product.industries.join(", ") || "Belum dipilih"} />
            <Info label="Foto" value={`${product.imageCount} file`} />
          </dl>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <TextBlock label="Deskripsi singkat" value={product.shortDescription} />
            <TextBlock label="Deskripsi panjang" value={product.description} />
          </div>
        </AdminPanel>

        <AdminPanel
          title="Metadata Ofissio"
          description="Field blocking harus lengkap. Upload GLB dari admin akan tersedia pada Task A3."
          actions={
            <button
              type="button"
              disabled
              title="Upload GLB akan tersedia di Task A3."
              className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-2xl border border-line bg-slate-100 px-4 py-2 text-sm font-black text-ink-muted opacity-70"
            >
              <FileBox className="h-4 w-4" aria-hidden="true" />
              Upload GLB
            </button>
          }
        >
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetaInfo label="has_3d_model" value={String(product.ofissioMeta.has3DModel)} />
            <MetaInfo label="model_3d_id" value={product.ofissioMeta.model3DId} />
            <MetaInfo label="model_3d_version" value={product.ofissioMeta.model3DVersion} />
            <MetaInfo label="model_3d_source" value={product.ofissioMeta.model3DSource} />
            <MetaInfo label="model_3d_filename" value={product.ofissioMeta.model3DFilename} />
            <MetaInfo label="MOQ" value={product.ofissioMeta.moq > 0 ? String(product.ofissioMeta.moq) : ""} />
            <MetaInfo label="Lead time" value={product.ofissioMeta.leadTime} />
            <MetaInfo label="Fulfillment type" value={product.ofissioMeta.fulfillmentType} />
            <MetaInfo label="Transaction mode" value={product.ofissioMeta.transactionMode} />
            <MetaInfo label="supports_embroidery" value={String(product.ofissioMeta.supportsEmbroidery)} />
            <MetaInfo label="Embroidery zones" value={product.ofissioMeta.embroideryZones.join(", ")} />
            <MetaInfo label="Model URL" value={product.ofissioMeta.model3DUrl} wide />
          </dl>
        </AdminPanel>

        <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-brand-100 bg-brand-50/80 p-5 text-sm text-ink-muted">
          <AdminBadge tone="brand">Next action</AdminBadge>
          <p className="leading-6">
            Lengkapi field melalui WooCommerce. Setelah tersimpan, buka ulang halaman ini untuk menghitung readiness terbaru.
          </p>
          {product.wooEditUrl ? (
            <Link
              href={product.wooEditUrl}
              target="_blank"
              className="font-black text-brand-700 underline underline-offset-4"
            >
              Buka WooCommerce Product
            </Link>
          ) : null}
        </div>
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <AdminBackLink href="/admin/products">Kembali ke produk</AdminBackLink>
        <AdminErrorState
          title="Detail produk belum dapat dimuat"
          description="Periksa koneksi WooCommerce staging atau pastikan Product ID masih tersedia."
        />
      </div>
    );
  }
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line/80 bg-slate-50/80 p-4">
      <dt className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-subtle">{label}</dt>
      <dd className={`mt-2 break-words text-sm font-bold text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function MetaInfo({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line/80 bg-slate-50/80 p-4 ${wide ? "sm:col-span-2 xl:col-span-4" : ""}`}>
      <dt className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-subtle">{label}</dt>
      <dd className="mt-2 break-all font-mono text-xs font-bold text-ink">{value || "Belum diisi"}</dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-slate-50/80 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-subtle">{label}</p>
      <p className="mt-2 line-clamp-4 text-sm leading-6 text-ink-muted">{value || "Belum diisi"}</p>
    </div>
  );
}
