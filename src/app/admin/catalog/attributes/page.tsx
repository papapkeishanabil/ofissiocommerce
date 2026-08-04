import { AdminErrorState } from "@/features/admin/components/AdminErrorState";
import {
  AdminPageHeader,
  AdminPanel,
} from "@/features/admin/components/AdminSurface";
import { requireInternalAdminServer } from "@/features/admin/admin.service";
import { listCatalogAttributes } from "@/features/catalog-taxonomy/catalog-taxonomy.service";
import { CatalogAdminTabs } from "@/features/catalog-taxonomy/components/CatalogAdminTabs";

export default async function AdminCatalogAttributesPage() {
  await requireInternalAdminServer("admin:catalog:view");
  try {
    const attributes = await listCatalogAttributes();
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Catalog taxonomy"
          title="Product attributes"
          description="Atribut dan terms dibaca langsung dari WooCommerce. Foundation ini menyiapkan opsi Warna, Ukuran, Bahan, Gender, dan fitur produk untuk editor A3."
        />
        <CatalogAdminTabs active="/admin/catalog/attributes" />
        <AdminPanel
          title={`${attributes.length} WooCommerce attributes`}
          description="Read-only pada Task A2.5; perubahan atribut tetap dilakukan di WooCommerce."
        >
          {attributes.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {attributes.map((attribute) => (
                <article
                  key={attribute.id}
                  className="rounded-2xl border border-line/80 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-ink">{attribute.name}</h3>
                      <p className="mt-1 font-mono text-xs text-brand-700">
                        pa_{attribute.slug}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-ink-muted ring-1 ring-line">
                      {attribute.terms.length} terms
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-ink-subtle">Type</dt>
                      <dd className="mt-1 text-ink">{attribute.type}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-ink-subtle">Order</dt>
                      <dd className="mt-1 text-ink">{attribute.orderBy}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {attribute.terms.length ? (
                      attribute.terms.map((term) => (
                        <span
                          key={term.id}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line"
                        >
                          {term.name}
                          {term.productCount ? ` · ${term.productCount}` : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-subtle">Belum ada terms.</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              Belum ada global product attribute di WooCommerce.
            </p>
          )}
        </AdminPanel>
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Catalog taxonomy"
          title="Product attributes"
          description="Atribut produk berasal dari WooCommerce."
        />
        <CatalogAdminTabs active="/admin/catalog/attributes" />
        <AdminErrorState
          title="Atribut WooCommerce belum dapat dimuat"
          description="Pastikan REST API key memiliki permission read untuk products dan attributes."
        />
      </div>
    );
  }
}
