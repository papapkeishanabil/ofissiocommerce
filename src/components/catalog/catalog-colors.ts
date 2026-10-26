import type { CSSProperties } from "react";
import type { OfissioProduct } from "@/features/products/product.types";
import { productColorPalette } from "@/lib/product-colors";
import { slugifyTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";

export const CATALOG_COLOR_FAMILIES = [
  { slug: "nuansa-abu", label: "Nuansa Abu", sample: "Abu Asap" },
  { slug: "nuansa-biru", label: "Nuansa Biru", sample: "Biru Benhur" },
  { slug: "nuansa-kuning", label: "Nuansa Kuning", sample: "Daisy Yellow" },
  { slug: "nuansa-hijau", label: "Nuansa Hijau", sample: "Army" },
  { slug: "nuansa-ungu", label: "Nuansa Ungu", sample: "Lilac" },
  { slug: "nuansa-merah", label: "Nuansa Merah", sample: "Maroon" },
  { slug: "nuansa-cokelat", label: "Nuansa Cokelat", sample: "Camel" },
  { slug: "nuansa-putih", label: "Nuansa Putih", sample: "Putih" },
  { slug: "nuansa-hitam", label: "Nuansa Hitam", sample: "Hitam" },
  { slug: "nuansa-oranye", label: "Nuansa Oranye", sample: "Oranye" },
  { slug: "nuansa-pink", label: "Nuansa Pink", sample: "Pink" },
  { slug: "warna-kombinasi", label: "Kombinasi Warna", sample: "Merah-Navy" },
  { slug: "warna-lainnya", label: "Warna Lainnya", sample: "" },
] as const;

export function catalogColorFamily(name: string): string {
  if (productColorPalette(name).length > 1) return "warna-kombinasi";
  const value = name.trim().toLocaleLowerCase("id-ID");
  if (/abu|grey|gray|charcoal/.test(value)) return "nuansa-abu";
  if (/biru|blue|navy|dongker|aqua/.test(value)) return "nuansa-biru";
  if (/kuning|yellow|mustard/.test(value)) return "nuansa-kuning";
  if (/hijau|green|army|olive|lime|zaitun|teal|toska/.test(value)) return "nuansa-hijau";
  if (/ungu|purple|lilac/.test(value)) return "nuansa-ungu";
  if (/merah muda|pink/.test(value)) return "nuansa-pink";
  if (/merah|red|maroon|marun|burgundy|wine/.test(value)) return "nuansa-merah";
  if (/cokelat|coklat|brown|camel|tan|khaki|krem|cream/.test(value)) return "nuansa-cokelat";
  if (/putih|white|ivory/.test(value)) return "nuansa-putih";
  if (/hitam|black/.test(value)) return "nuansa-hitam";
  if (/orange|oranye/.test(value)) return "nuansa-oranye";
  return "warna-lainnya";
}

export function matchesCatalogColor(name: string, filter: string) {
  if (CATALOG_COLOR_FAMILIES.some(family => family.slug === filter)) {
    return catalogColorFamily(name) === filter;
  }
  return slugifyTaxonomy(name) === filter || name.toLocaleLowerCase("id-ID") === filter.toLocaleLowerCase("id-ID");
}

export function catalogColorPreview(product: OfissioProduct, filter?: string) {
  if (!filter) return { product, color: undefined, usesMainPhoto: false };
  const matchingColors = (product.available_colors ?? []).filter(name => matchesCatalogColor(name, filter));
  const variant = product.colorVariants?.find(item => item.imageSrc.trim() &&
    matchingColors.some(name => name.trim().toLocaleLowerCase("id-ID") === item.color.trim().toLocaleLowerCase("id-ID")));
  const color = variant?.color ?? matchingColors[0];
  if (!color) return { product, color: undefined, usesMainPhoto: false };
  // Keep unrelated gallery photos out of the hover preview while filtering.
  const imageSrc = variant?.imageSrc || product.images?.[0]?.src || product.mainImage;
  const alt = variant ? `${product.name} warna ${color}` : `Foto utama ${product.name}`;
  return {
    color,
    usesMainPhoto: !variant,
    product: { ...product, mainImage: imageSrc, images: imageSrc ? [{ id: null, src: imageSrc, name: product.name, alt }] : [] },
  };
}

// Catalog previews are approximate fabric colors; product names remain intact.
const SHADES: Record<string, string> = {
  "abu tua": "#555963", "abu asap": "#a1aab6", "abu muda": "#ced2d6",
  "abu kebiruan": "#879eae", "purple grey": "#aaa0b2",
  "navy": "#24354c", "biru navy": "#24354c",
  "baby blue": "#a6c5df", "biru aqua": "#68c6d0", "biru benhur": "#2853b8",
  "biru langit": "#76bce7", "biru muda": "#b1d4e8", "biru wardah": "#61a8bc",
  "butter yellow": "#f3e5a4", "daisy yellow": "#f1cd54", "kuning mustard": "#bf9528",
  "lilac": "#c8aed8", "ungu manggis": "#674060", "army": "#535d44",
  "maroon": "#712f3c", "camel": "#bc7f45", "putih saku": "#f8fafc",
};

function shade(name: string) {
  return SHADES[name.trim().toLocaleLowerCase("id-ID")] ?? productColorPalette(name)[0] ?? "#cbd5e1";
}

export function catalogColorSwatchStyle(name: string): CSSProperties {
  const exact = SHADES[name.trim().toLocaleLowerCase("id-ID")];
  if (exact) return { backgroundColor: exact };
  const parts = name.split(/\s*(?:–|—|-|\/|\+|&)\s*/).filter(Boolean);
  const colors = parts.length > 1 ? [...new Set(parts.map(shade))] : productColorPalette(name);
  if (colors.length < 2) return { backgroundColor: colors[0] ?? "#cbd5e1" };
  const stops = colors.flatMap((color, index) => [
    `${color} ${index * 100 / colors.length}%`,
    `${color} ${(index + 1) * 100 / colors.length}%`,
  ]);
  return { backgroundColor: colors[0], backgroundImage: `linear-gradient(135deg, ${stops.join(", ")})` };
}
