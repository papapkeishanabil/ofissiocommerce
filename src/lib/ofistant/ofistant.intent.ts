import {
  DEFAULT_PUBLIC_TAXONOMY,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import {
  getTaxonomyEntryLabel,
  normalizeCatalogSearch,
} from "@/features/catalog-taxonomy/catalog-search";
import type {
  CatalogSearchNormalization,
  PublicCatalogTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import type { EmbroideryPricingZoneId } from "@/features/products/embroidery-pricing";

export type Intent =
  | "GREETING"
  | "ASK_BROWSE"
  | "SEARCH_CATALOG"
  | "SELECT_INDUSTRY"
  | "SELECT_CATEGORY"
  | "ASK_RECOMMEND"
  | "OPEN_PRODUCT"
  | "ASK_ADD_TO_CART"
  | "ASK_VIEW_CART"
  | "ASK_CHECKOUT"
  | "ASK_REGISTER"
  | "ASK_QUOTATION"
  | "ASK_TRACKING"
  | "ASK_3D_CONFIGURATOR"
  | "ASK_QUANTITY_PRICE"
  | "ASK_EMBROIDERY_PRICE"
  | "ASK_HUMAN"
  | "ASK_HELP"
  | "UNKNOWN";

export interface DetectedIntent {
  intent: Intent;
  industry?: string;
  industrySlug?: string;
  category?: string;
  categorySlug?: string;
  catalogSearch?: CatalogSearchNormalization;
  requestedQty?: number;
  requestedEmbroideryZones?: EmbroideryPricingZoneId[];
}

export function detectIndustry(
  text: string,
  taxonomy: PublicCatalogTaxonomy = DEFAULT_PUBLIC_TAXONOMY,
) {
  const normalized = normalizeCatalogSearch(text, taxonomy);
  return getTaxonomyEntryLabel(
    taxonomy,
    "industry",
    normalized.industrySlugs[0],
  );
}

export function detectCategory(
  text: string,
  taxonomy: PublicCatalogTaxonomy = DEFAULT_PUBLIC_TAXONOMY,
) {
  const normalized = normalizeCatalogSearch(text, taxonomy);
  return getTaxonomyEntryLabel(
    taxonomy,
    "category",
    normalized.categorySlugs[0],
  );
}

export function detectIntent(
  text: string,
  taxonomy: PublicCatalogTaxonomy = DEFAULT_PUBLIC_TAXONOMY,
): DetectedIntent {
  const value = text.toLowerCase().trim();
  if (!value) return { intent: "UNKNOWN" };

  if (
    /\b(halo|hai|hi|hallo|hello|selamat (pagi|siang|sore|malam)|pagi|siang|sore|malam)\b/.test(
      value,
    ) ||
    /^(p|bu|pak|kak)$/i.test(value)
  ) {
    return { intent: "GREETING" };
  }

  const catalogSearch = normalizeCatalogSearch(value, taxonomy);
  const industrySlug = catalogSearch.industrySlugs[0];
  const categorySlug = catalogSearch.categorySlugs[0];
  const industry = getTaxonomyEntryLabel(
    taxonomy,
    "industry",
    industrySlug,
  );
  const category = getTaxonomyEntryLabel(
    taxonomy,
    "category",
    categorySlug,
  );
  const taxonomyFields = {
    industry,
    industrySlug,
    category,
    categorySlug,
    catalogSearch,
  };
  const requestedQty = extractRequestedQuantity(value);
  const requestedEmbroideryZones = extractRequestedEmbroideryZones(value);

  if (
    /\b(sales (manusia|asli)|hubungi sales|sales ofissio|cs|customer service|agent manusia|human|operator)\b/.test(
      value,
    )
  ) {
    return { intent: "ASK_HUMAN" };
  }
  if (
    /\b(tracking|lacak|resi|nomor resi|status (order|pengiriman|produksi)|pengiriman saya|where.*order|pesanan saya)\b/.test(
      value,
    )
  ) {
    return { intent: "ASK_TRACKING" };
  }
  if (
    requestedEmbroideryZones.length > 0 &&
    (requestedQty != null || /\b(harga|berapa|biaya|estimasi|ongkos)\b/.test(value))
  ) {
    return {
      intent: "ASK_EMBROIDERY_PRICE",
      ...taxonomyFields,
      requestedEmbroideryZones,
      ...(requestedQty == null ? {} : { requestedQty }),
    };
  }
  if (
    /\b(3d|3 d|preview 3d|konfigur.*3d|atur bordir|bordir logo|logo bordir|embroidery|lihat 3d)\b/.test(
      value,
    )
  ) {
    return { intent: "ASK_3D_CONFIGURATOR" };
  }
  if (
    /\b(quotation|penawaran|quote|rfq|request.*(quote|penawaran))\b/.test(
      value,
    )
  ) {
    return { intent: "ASK_QUOTATION", ...taxonomyFields };
  }
  if (
    requestedQty != null ||
    /\b(harga quantity|harga bertingkat|diskon (kalau )?(banyak|quantity)|tier harga)\b/.test(value)
  ) {
    return {
      intent: "ASK_QUANTITY_PRICE",
      ...taxonomyFields,
      ...(requestedQty == null ? {} : { requestedQty }),
    };
  }
  if (
    /\b(checkout|bayar|pembayaran|lanjut.*bayar|selesaikan.*pesanan)\b/.test(
      value,
    )
  ) {
    return { intent: "ASK_CHECKOUT" };
  }
  if (/\b(daftar|register|bikin akun|buat akun|sign up|signup)\b/.test(value)) {
    return { intent: "ASK_REGISTER" };
  }
  if (/\b(keranjang|cart|lihat.*cart|cek.*cart|item saya)\b/.test(value)) {
    return { intent: "ASK_VIEW_CART" };
  }
  if (
    /\b(tambah.*keranjang|masuk.*keranjang|add.*cart|pesan|pesan ini|beli|beli ini|add to cart)\b/.test(
      value,
    )
  ) {
    return { intent: "ASK_ADD_TO_CART" };
  }

  if (categorySlug) {
    return { intent: "SEARCH_CATALOG", ...taxonomyFields };
  }
  if (
    industrySlug ||
    /\b(rekomendasi|saran|sarankan|rekomendasikan|bagus.*untuk|cocok.*untuk|paling sesuai)\b/.test(
      value,
    )
  ) {
    return industrySlug
      ? { intent: "SELECT_INDUSTRY", ...taxonomyFields }
      : { intent: "ASK_RECOMMEND", catalogSearch };
  }
  if (/\b(browse|katalog|catalog|lihat.*produk|semua produk|lihat semua)\b/.test(value)) {
    return { intent: "ASK_BROWSE" };
  }
  if (/\b(help|bantuan|bantu|gimana|bagaimana|apa.*bisa|bisa.*bantu)\b/.test(value)) {
    return { intent: "ASK_HELP" };
  }
  return { intent: "UNKNOWN", catalogSearch };
}

export function extractRequestedEmbroideryZones(value: string) {
  const zones: EmbroideryPricingZoneId[] = [];
  const normalized = value.toLowerCase();
  const patterns: Array<[EmbroideryPricingZoneId, RegExp]> = [
    ["left_chest", /\b(dada kiri|left chest)\b/],
    ["right_chest", /\b(dada kanan|right chest)\b/],
    ["left_sleeve", /\b(lengan kiri|left sleeve)\b/],
    ["right_sleeve", /\b(lengan kanan|right sleeve)\b/],
    ["upper_back", /\b(punggung atas|upper back)\b/],
    ["center_back", /\b(punggung tengah|center back|middle back)\b/],
  ];
  for (const [zoneId, pattern] of patterns) {
    if (pattern.test(normalized)) zones.push(zoneId);
  }
  return zones;
}

export function extractRequestedQuantity(value: string) {
  const match = value.match(/\b(\d{1,7})\s*(?:pcs|pc|pieces|buah|potong)\b/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
}
