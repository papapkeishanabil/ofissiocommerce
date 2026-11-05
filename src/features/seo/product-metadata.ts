import type { Metadata } from "next";
import type { OfissioProduct } from "@/features/products/product.types";
import { productImages, productUrl } from "@/lib/seo";

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\\[nr]/g, " ").replace(/\s+/g, " ").trim();
}

export function productSearchName(product: Pick<OfissioProduct, "name" | "slug">): string {
  const name = plainText(product.name);
  // This existing model's URL and published description identify its technician use.
  // Preserve any future admin rename rather than overriding it with frozen copy.
  return ["kemeja-kerja-kt-001", "kemeja-kerja-teknisi-kt-001"].includes(product.slug) && /^kemeja kerja kt-001$/i.test(name)
    ? "Kemeja Kerja Teknisi KT-001" : name;
}

/** Prefer complete sentences; use an ellipsis only when a long sentence must be shortened. */
export function productSearchSnippet(value: string, limit = 170): string {
  const text = plainText(value);
  if (text.length <= limit) return text;
  const head = text.slice(0, limit + 1);
  const ends = [...head.matchAll(/[.!?](?=\s|$)/g)].map(match => match.index! + 1);
  const sentenceEnd = ends.at(-1);
  if (sentenceEnd && sentenceEnd >= Math.floor(limit / 2)) return text.slice(0, sentenceEnd);
  const cut = text.slice(0, limit - 1);
  const wordEnd = cut.lastIndexOf(" ");
  return `${cut.slice(0, wordEnd > 0 ? wordEnd : cut.length).replace(/[,;:—–-]+$/, "")}…`;
}

export function productSearchDescription(product: OfissioProduct): string {
  const name = productSearchName(product);
  const material = plainText(product.material ?? "");
  const knownMaterial = material && !/belum|tidak tersedia|unknown/i.test(material);
  const detailsLink = product.supports_embroidery
    ? "Lihat ukuran, warna, dan pilihan bordir logo di Ofissio."
    : "Lihat detail produk, pilihan ukuran dan warna di Ofissio.";

  if (name === "Kemeja Kerja Teknisi KT-001" && product.name !== name) {
    return productSearchSnippet(`${name} untuk teknisi dan tim operasional.${knownMaterial ? ` Bahan ${material}.` : ""} ${detailsLink}`);
  }

  let description = plainText(product.short_description || product.description || "");
  if (!description || /^(deskripsi produk belum tersedia\.?|-)$/i.test(description)) {
    return productSearchSnippet(`${name}.${knownMaterial ? ` Bahan ${material}.` : ""} ${detailsLink}`);
  }
  // When curated copy starts with a generic category, include its model name once.
  const category = plainText(product.category ?? "");
  if (category && name.toLocaleLowerCase("id-ID").startsWith(category.toLocaleLowerCase("id-ID"))
    && description.toLocaleLowerCase("id-ID").startsWith(`${category.toLocaleLowerCase("id-ID")} `)
    && !description.toLocaleLowerCase("id-ID").startsWith(name.toLocaleLowerCase("id-ID"))) {
    description = `${name}${description.slice(category.length)}`;
  }
  return productSearchSnippet(description);
}

export function productSearchMetadata(product: OfissioProduct): Metadata {
  const name = productSearchName(product);
  const title = /\bofissio\b/i.test(name) ? name : `${name} | Ofissio`;
  const description = productSearchDescription(product);
  const url = productUrl(product.slug);
  const images = productImages(product);
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url },
    robots: product.source === "mock" ? { index: false, follow: false } : undefined,
    openGraph: { type: "website", siteName: "Ofissio", locale: "id_ID", title, description, url, images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}
