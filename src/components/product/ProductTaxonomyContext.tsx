import Link from "next/link";
import type { OfissioProduct } from "@/features/products/product.types";
import { productTaxonomyContext } from "@/features/seo/product-taxonomy-context";

export function ProductTaxonomyContext({product,industries}: {
  product:OfissioProduct; industries:Array<{slug:string;name:string;active:boolean}>;
}) {
  const context=productTaxonomyContext(product,industries);
  if (!context.categories.length&&!context.industries.length) return null;
  return <section aria-labelledby="product-taxonomy-title" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
    <h2 id="product-taxonomy-title" className="text-base font-bold text-ink">Kategori dan Penggunaan Seragam</h2>
    <p className="mt-2 text-sm leading-relaxed text-ink-muted">Telusuri kategori dan bidang usaha yang dipilih untuk {product.name}. Bandingkan bahan, ukuran, dan detail model sebelum menentukan seragam tim Anda.</p>
    <dl className="mt-4 space-y-4 text-sm">
      {context.categories.length>0&&<div><dt className="font-semibold text-ink">Kategori produk</dt><dd className="mt-2 flex flex-wrap gap-2">{context.categories.map(item=><a className="rounded-lg border border-line px-3 py-2 text-brand-700 underline underline-offset-4 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600" key={item.slug} href={item.href}>{item.name}</a>)}</dd></div>}
      {context.industries.length>0&&<div><dt className="font-semibold text-ink">Seragam untuk bidang usaha</dt><dd className="mt-2 flex flex-wrap gap-2">{context.industries.map(item=><Link className="rounded-lg border border-line px-3 py-2 text-brand-700 underline underline-offset-4 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600" key={item.slug} href={item.href}>{item.name}</Link>)}</dd></div>}
    </dl>
  </section>;
}
