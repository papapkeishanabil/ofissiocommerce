// src/lib/ofistant/ofistant.rules.ts
// Rule-based decision engine. Maps (userText, context, cartSnapshot) to an
// OfistantResponse. Each rule is a small function returning `null` when it
// doesn't apply — the first non-null wins (priority ordered top→bottom).
//
// To add a new intent/rule: append a rule function to RULES below.

import { productService } from "@/features/products/product.service";
import { getOfistantOrderStatusText } from "@/features/tracking/tracking.service";
import { emptySizeMatrix } from "@/types/cart";
import { SIZES } from "@/types/industry";
import type {
  CatalogSearchResult,
  PublicCatalogTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.types";

import { detectIntent } from "./ofistant.intent";
import {
  withConfiguringProduct,
  withItemAdded,
  withProductViewed,
  withSelectedIndustry,
} from "./ofistant.context";
import type { OfistantContext, OfistantResponse } from "./ofistant.types";
import type { AddToCartAction } from "./ofistant.actions";
import { calculateQuantityTierPrice } from "@/features/products/quantity-pricing";
import {
  calculateEmbroideryPricing,
  embroideryZoneLabel,
} from "@/features/products/embroidery-pricing";
import { formatIDR } from "@/types/product";

interface RuleInput {
  text: string;
  taxonomy: PublicCatalogTaxonomy;
  catalogSearchResult: CatalogSearchResult | null;
  ctx: OfistantContext;
  cart: {
    totalQty: number;
    itemCount: number;
    totalEstimatedPrice: number;
  };
}
type Rule = (input: RuleInput) => OfistantResponse | null;

// ---------- helpers ----------

function address(ctx: OfistantContext): string {
  // Polite address; B2B sales tone.
  return "Pak/Bu";
}

function pickRecommendedForIndustry(industry: string, limit = 3) {
  const list = productService.getProductsByIndustry(industry);
  return list.slice(0, limit);
}

function buildAddToCartActionFromSelected(
  ctx: OfistantContext,
): AddToCartAction | null {
  if (!ctx.selectedProductSlug) return null;
  const product = productService.getProductBySlug(ctx.selectedProductSlug);
  if (!product) return null;
  const color = ctx.selectedColor ?? product.colors[0] ?? "Default";
  let sizeMatrix = ctx.sizeMatrix;
  if (!sizeMatrix) {
    // Provide an MOQ-even split as a sensible default the user can adjust.
    sizeMatrix = { ...emptySizeMatrix() };
    const per = Math.max(1, Math.floor(product.moq / 3));
    sizeMatrix.M = per;
    sizeMatrix.L = per;
    sizeMatrix.XL = Math.max(0, product.moq - per * 2);
  }
  return {
    type: "ADD_TO_CART",
    payload: {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      color,
      sizeMatrix,
      customization: null,
      reason: "Ditambahkan dari Ofistant dengan konfirmasi user.",
    },
  };
}

// ---------- rules (priority order) ----------

const humanHandoff: Rule = ({ text, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_HUMAN") return null;
  return {
    message:
      "Baik, saya akan teruskan kebutuhan Bapak/Ibu ke tim sales Ofissio. Mereka akan menghubungi Anda secepatnya melalui WhatsApp/email PIC yang terdaftar.",
    action: { type: "REQUEST_HUMAN_HANDOFF", payload: { reason: text } },
    quickReplies: ["Lihat katalog", "Buka keranjang"],
    contextPatch: { turnsTaken: 1 },
  };
};

const greeting: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "GREETING") return null;
  if (ctx.journeyStage === "NEW_VISITOR") {
    return {
      message:
        "Halo, selamat datang di Ofissio. Saya Ofistant, asisten pengadaan seragam perusahaan Anda. Seragam untuk industri apa yang sedang Anda cari?",
      quickReplies: ["Pertambangan", "Konstruksi", "Manufaktur", "Corporate"],
    };
  }
  return {
    message: "Halo kembali! Ada yang bisa saya bantu seputar pengadaan seragam?",
    quickReplies: ["Lihat katalog", "Lihat keranjang", "Hubungi sales"],
  };
};

const askHelp: Rule = ({ text, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_HELP") return null;
  return {
    message:
      "Tentu, saya bisa membantu: menampilkan produk per industri, membuka detail produk, menambahkan ke keranjang, hingga checkout atau request quotation. Coba ketik industri yang Anda butuhkan, misalnya “seragam untuk tambang”.",
    quickReplies: ["Pertambangan", "Konstruksi", "Perhotelan", "Lihat keranjang"],
  };
};

const quantityPricing: Rule = ({
  text,
  ctx,
  taxonomy,
  catalogSearchResult,
}) => {
  const detected = detectIntent(text, taxonomy);
  if (detected.intent !== "ASK_QUANTITY_PRICE") return null;
  const products = catalogSearchResult?.products ?? [];
  const product =
    products.find((item) => item.slug === ctx.selectedProductSlug) ?? products[0];
  if (!product) {
    return {
      message: "Sebutkan produk yang ingin dihitung. Harga quantity hanya akan saya ambil dari produk aktif di katalog Ofissio.",
      quickReplies: ["Lihat katalog", "Hubungi sales"],
    };
  }
  const pricing = product.quantityPricing;
  if (!pricing?.enabled || pricing.tiers.length === 0) {
    return {
      message: `Harga quantity untuk ${product.name} perlu dikonfirmasi admin. Saya tidak akan mengarang diskon yang belum tersimpan di data produk.`,
      action: {
        type: "OPEN_PRODUCT_DETAIL",
        payload: { slug: product.slug, reason: "Konfirmasi harga quantity" },
      },
      quickReplies: ["Request quotation", "Hubungi sales"],
    };
  }
  if (!detected.requestedQty) {
    const tierSummary = pricing.tiers
      .map((tier) => `${tier.label}: ${formatIDR(tier.unitPrice)}/pcs`)
      .join("; ");
    return {
      message: `${product.name} memiliki harga bertingkat: ${tierSummary}. Sebutkan quantity agar saya hitungkan estimasinya.`,
      action: {
        type: "OPEN_PRODUCT_DETAIL",
        payload: { slug: product.slug, reason: "Lihat harga bertingkat" },
      },
      quickReplies: ["Hitung 100 pcs", "Request quotation"],
    };
  }
  const result = calculateQuantityTierPrice({
    regularPrice: product.regularPrice,
    totalQty: detected.requestedQty,
    quantityPricing: pricing,
  });
  if (!result.tierApplied || !result.tierLabel) {
    return {
      message: `Untuk ${product.name}, quantity ${detected.requestedQty} pcs belum masuk tier yang tersedia. Estimasi memakai harga regular ${formatIDR(result.unitPrice)}/pcs, tetapi harga final perlu dikonfirmasi admin.`,
      quickReplies: ["Request quotation", "Lihat produk"],
    };
  }
  const nextTierHint = result.nextTier
    ? ` Tambah ${result.nextTier.qtyToNextTier} pcs lagi untuk harga ${formatIDR(result.nextTier.potentialUnitPrice)}/pcs.`
    : "";
  return {
    message: `Untuk ${product.name}, estimasi harga ${detected.requestedQty} pcs masuk tier ${result.tierLabel}, yaitu ${formatIDR(result.unitPrice)}/pcs. Estimasi subtotal produk ${formatIDR(result.subtotal)}.${nextTierHint} Harga final tetap mengikuti quotation admin.`,
    action: {
      type: "OPEN_PRODUCT_DETAIL",
      payload: { slug: product.slug, reason: "Hasil kalkulasi harga quantity" },
    },
    quickReplies: ["Request quotation", "Lihat produk"],
  };
};

const embroideryPricing: Rule = ({
  text,
  ctx,
  taxonomy,
  catalogSearchResult,
}) => {
  const detected = detectIntent(text, taxonomy);
  if (detected.intent !== "ASK_EMBROIDERY_PRICE") return null;
  const products = catalogSearchResult?.products ?? [];
  const product =
    products.find((item) => item.slug === ctx.selectedProductSlug) ?? products[0];
  if (!product) {
    return {
      message: "Sebutkan produk yang ingin dihitung. Harga bordir hanya akan saya ambil dari produk aktif di katalog Ofissio.",
      quickReplies: ["Lihat katalog", "Hubungi sales"],
    };
  }
  const selectedZones = detected.requestedEmbroideryZones ?? [];
  if (!detected.requestedQty) {
    return {
      message: `Sebutkan jumlah pesanan untuk menghitung bordir ${selectedZones.map(embroideryZoneLabel).join(" dan ")} pada ${product.name}. Harga final mengikuti quotation admin.`,
      quickReplies: ["Hitung 100 pcs", "Request quotation"],
    };
  }
  const embroidery = calculateEmbroideryPricing({
    totalQty: detected.requestedQty,
    selectedZones,
    embroideryPricing: product.embroideryPricing,
  });
  if (embroidery.missingPricingZones.length > 0 || embroidery.lines.length === 0) {
    return {
      message: `Harga bordir untuk zona ${selectedZones.map(embroideryZoneLabel).join(" dan ")} pada ${product.name} perlu dikonfirmasi admin karena bergantung detail logo. Saya tidak akan mengarang harga bordir. Harga final mengikuti quotation admin.`,
      action: { type: "OPEN_PRODUCT_DETAIL", payload: { slug: product.slug, reason: "Konfirmasi harga bordir" } },
      quickReplies: ["Request quotation", "Lihat produk"],
    };
  }
  const productPrice = calculateQuantityTierPrice({
    regularPrice: product.regularPrice,
    totalQty: detected.requestedQty,
    quantityPricing: product.quantityPricing,
  });
  const lineText = embroidery.lines
    .map((line) => `${line.label.replace("Bordir ", "")} ${formatIDR(line.unitPrice)}/pcs${line.setupFeeApplied ? ` + setup ${formatIDR(line.setupFee)}` : ""}`)
    .join(" dan ");
  const estimatedTotal = productPrice.subtotal + embroidery.total;
  const tierText = productPrice.tierApplied && productPrice.tierLabel
    ? ` masuk tier ${productPrice.tierLabel}, yaitu ${formatIDR(productPrice.unitPrice)}/pcs`
    : ` memakai estimasi harga produk ${formatIDR(productPrice.unitPrice)}/pcs`;
  return {
    message: `Untuk ${product.name} ${detected.requestedQty} pcs, estimasi harga produk${tierText}. Bordir ${lineText}. Estimasi total produk + bordir ${formatIDR(estimatedTotal)}. Harga final mengikuti quotation admin.`,
    action: { type: "OPEN_PRODUCT_DETAIL", payload: { slug: product.slug, reason: "Hasil kalkulasi harga bordir" } },
    quickReplies: ["Request quotation", "Lihat produk"],
  };
};

const searchCatalog: Rule = ({
  text,
  ctx,
  taxonomy,
  catalogSearchResult,
}) => {
  const detected = detectIntent(text, taxonomy);
  if (
    detected.intent !== "SEARCH_CATALOG" ||
    !detected.categorySlug ||
    !detected.category
  ) {
    return null;
  }
  const industryText = detected.industry
    ? ` untuk industri ${detected.industry}`
    : "";
  const isEmpty = catalogSearchResult?.resultCount === 0;
  return {
    message: isEmpty
      ? `Belum ada produk aktif untuk ${detected.category}${industryText}. Saya tetap buka hasil filter dan menyediakan kategori atau industri alternatif.`
      : `Baik ${address(ctx)}, saya buka katalog ${detected.category}${industryText}. Hasil hanya berasal dari katalog produk yang aktif.`,
    action: {
      type: "SHOW_PRODUCTS",
      payload: {
        category: detected.category,
        categorySlug: detected.categorySlug,
        industry: detected.industry,
        industrySlug: detected.industrySlug,
        searchTerms: detected.catalogSearch?.searchTerms,
        reason: "Filter taxonomy Ofistant",
      },
    },
    quickReplies: isEmpty
      ? [
          ...(catalogSearchResult?.alternatives.categories
            .slice(0, 2)
            .map((item) => item.name) ?? []),
          "Hubungi sales",
        ]
      : ["Lihat kategori lain", "Hubungi sales"],
    contextPatch: detected.industry
      ? withSelectedIndustry(ctx, detected.industry)
      : undefined,
  };
};

const selectIndustry: Rule = ({
  text,
  ctx,
  taxonomy,
  catalogSearchResult,
}) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "SELECT_INDUSTRY" || !d.industry || !d.industrySlug) {
    return null;
  }
  const isEmpty = catalogSearchResult?.resultCount === 0;
  return {
    message: isEmpty
      ? `Belum ada produk aktif untuk industri ${d.industry}. Saya buka hasilnya bersama alternatif kategori/industri yang tersedia.`
      : `Baik ${address(ctx)}, saya tampilkan produk aktif untuk industri ${d.industry}. Hasil dibaca dari katalog, bukan dibuat oleh Ofistant.`,
    action: {
      type: "SHOW_PRODUCTS",
      payload: {
        industry: d.industry,
        industrySlug: d.industrySlug,
        reason: `Filter industri ${d.industry}`,
      },
    },
    quickReplies: isEmpty
      ? [
          ...(catalogSearchResult?.alternatives.industries
            .slice(0, 2)
            .map((item) => item.name) ?? []),
          "Hubungi sales",
        ]
      : ["Lihat kategori lain", "Hubungi sales"],
    contextPatch: withSelectedIndustry(ctx, d.industry),
  };
};

const recommendAfterContext: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_RECOMMEND") return null;
  const industry = ctx.selectedIndustry;
  if (!industry) {
    return {
      message:
        "Dengan senang hati memberi rekomendasi. Sebelumnya, seragam untuk industri apa yang Anda butuhkan?",
      quickReplies: ["Pertambangan", "Konstruksi", "Manufaktur", "Perhotelan"],
    };
  }
  const recs = pickRecommendedForIndustry(industry, 3);
  if (!recs.length) {
    return {
      message: "Saat ini belum ada produk yang siap ditampilkan untuk industri tersebut. Tim Ofissio dapat membantu menyiapkan rekomendasi manual.",
      contextPatch: withSelectedIndustry(ctx, industry),
    };
  }
  const top = recs[0];
  return {
    message: `Untuk ${industry}, saya sarankan mulai dari ${top?.name ?? "produk kami"}. Saya buka rekomendasi yang paling sesuai.`,
    action: {
      type: "SHOW_PRODUCTS",
      payload: { industry, reason: `Rekomendasi untuk ${industry}` },
    },
    quickReplies: recs.slice(0, 2).map((p) => `Lihat ${p.name}`),
    contextPatch: withSelectedIndustry(ctx, industry),
  };
};

const openProductByCategory: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "OPEN_PRODUCT" || !d.category) return null;
  // Find a product matching the category (prefer current industry).
  const candidates = ctx.selectedIndustry
    ? productService.getProductsByIndustry(ctx.selectedIndustry).filter(
        (p) => p.category === d.category,
      )
    : productService.getPublishedProducts().filter((p) => p.category === d.category);
  const pick = candidates[0];
  if (!pick) {
    return {
      message: `Maaf, belum ada produk ${d.category} yang cocok saat ini. Saya tampilkan semua kategori dulu.`,
      action: { type: "SHOW_PRODUCTS", payload: {} },
    };
  }
  return {
    message: `Baik, saya buka ${pick.name} untuk Anda.`,
    action: {
      type: "OPEN_PRODUCT_DETAIL",
      payload: { slug: pick.slug, reason: `Sesuai permintaan ${d.category}` },
    },
    quickReplies: ["Tambah ke keranjang", "Bandingkan produk"],
    contextPatch: withProductViewed(ctx, pick.id, pick.slug),
  };
};

const viewCart: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_VIEW_CART") return null;
  if (ctx.cartSummary && ctx.cartSummary.itemCount > 0) {
    return {
      message: `Tentu. Saat ini keranjang Anda berisi ${ctx.cartSummary.itemCount} produk (${ctx.cartSummary.totalQty} pcs). Saya buka di sebelah kanan.`,
      action: { type: "OPEN_CART", payload: {} },
      quickReplies: ["Checkout", "Lanjut eksplor produk"],
    };
  }
  return {
    message:
      "Keranjang Anda masih kosong. Mau saya tampilkan produk yang direkomendasikan?",
    action: { type: "OPEN_CART", payload: {} },
    quickReplies: ["Lihat katalog", "Pertambangan", "Corporate"],
  };
};

const checkout: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_CHECKOUT") return null;
  if (!ctx.cartSummary || ctx.cartSummary.itemCount === 0) {
    return {
      message:
        "Checkout butuh item di keranjang. Mau saya bantu pilih produk dulu?",
      action: { type: "SHOW_PRODUCTS", payload: {} },
      quickReplies: ["Pertambangan", "Konstruksi", "Corporate"],
    };
  }
  return {
    message:
      "Baik, saya buka checkout. Catatan: checkout dan pembayaran memerlukan login akun perusahaan.",
    action: { type: "OPEN_CHECKOUT", payload: {} },
    quickReplies: ["Lihat keranjang", "Request quotation"],
    contextPatch: { journeyStage: "CHECKOUT" },
  };
};

const quotation: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_QUOTATION") return null;
  if (/\b(status|bagaimana|sudah jadi|lihat|setuju|accept|lanjutkan|lanjut.*pesanan)\b/i.test(text)) {
    return {
      message:
        "Untuk quotation yang sudah dibuat, silakan buka Dashboard lalu pilih kartu quotation terkait. Jika statusnya quoted, halaman quotation akan menampilkan harga final dan tombol Accept/Reject. Saya tidak akan menyetujui atau convert order otomatis tanpa aksi di halaman quotation/admin.",
      quickReplies: ["Buka dashboard", "Hubungi sales", "Lihat katalog"],
      contextPatch: { journeyStage: "QUOTATION_SUBMITTED" },
    };
  }
  if (!ctx.cartSummary || ctx.cartSummary.itemCount === 0) {
    return {
      message:
        "Quotation bisa dibuat dari keranjang. Mau saya bantu pilih produk yang sesuai dulu?",
      action: { type: "SHOW_PRODUCTS", payload: {} },
      quickReplies: ["Pertambangan", "Konstruksi", "Lihat keranjang"],
    };
  }
  return {
    message:
      "Baik, saya buka halaman request quotation. Harga final tidak dihitung otomatis; tim Ofissio akan meninjau kebutuhan, logo, dan qty lalu mengonfirmasi penawaran resmi.",
    action: { type: "REQUEST_QUOTATION", payload: {} },
    quickReplies: ["Lihat keranjang", "Lanjut checkout"],
    contextPatch: { journeyStage: "QUOTATION_SUBMITTED" },
  };
};

const register: Rule = ({ text, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_REGISTER") return null;
  return {
    message:
      "Tentu, saya buka form pendaftaran akun perusahaan. Hanya butuh 1 menit.",
    action: { type: "OPEN_REGISTER", payload: {} },
    quickReplies: ["Lihat katalog", "Hubungi sales"],
  };
};

const tracking: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_TRACKING") return null;
  const trackingStatus = getOfistantOrderStatusText({
    companyId: ctx.companyId,
    companyName: ctx.companyName,
    currentOrderId: ctx.currentOrderId,
  });
  return {
    message: trackingStatus.text,
    action: {
      type: "OPEN_ORDER_TRACKING",
      payload: trackingStatus.order ? { order_id: trackingStatus.order.id } : {},
    },
    quickReplies: ["Hubungi sales", "Lihat katalog"],
  };
};

const addToCart: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_ADD_TO_CART") return null;
  if (!ctx.selectedProductSlug) {
    return {
      message:
        "Untuk menambahkan ke keranjang, saya perlu tahu produk mana. Mau saya tampilkan rekomendasi?",
      action: { type: "SHOW_PRODUCTS", payload: {} },
      quickReplies: ["Pertambangan", "Konstruksi", "Corporate"],
    };
  }
  const product = productService.getProductBySlug(ctx.selectedProductSlug);
  if (!product) return null;
  const action = buildAddToCartActionFromSelected(ctx);
  if (!action) return null;
  const sizeQty =
    ctx.sizeMatrix &&
    Object.values(ctx.sizeMatrix).reduce((a, b) => a + b, 0);
  if (!ctx.sizeMatrix || sizeQty === 0) {
    return {
      message: `Saya bisa bantu tambahkan ${product.name}. Mohon pastikan warna dan jumlah per ukuran sudah sesuai terlebih dahulu. Berikut pratinjau default (MOQ ${product.moq} pcs, terbagi per ukuran) — konfirmasi untuk menambahkan.`,
      action,
      requiresConfirm: true,
      quickReplies: ["Konfirmasi", "Ubah ukuran dulu"],
      contextPatch: withConfiguringProduct(ctx, {
        selectedColor: action.payload.color,
        sizeMatrix: action.payload.sizeMatrix,
      }),
    };
  }
  return {
    message: `Berikut pratinjau penambahan ${product.name} (${action.payload.color}). Konfirmasi untuk memasukkan ke keranjang.`,
    action,
    requiresConfirm: true,
    quickReplies: ["Konfirmasi", "Lihat keranjang"],
    contextPatch: withConfiguringProduct(ctx, {
      selectedColor: action.payload.color,
    }),
  };
};

const open3DConfigurator: Rule = ({ text, ctx, taxonomy }) => {
  const d = detectIntent(text, taxonomy);
  if (d.intent !== "ASK_3D_CONFIGURATOR") return null;
  // Ofistant cannot toggle ProductDetail's local "show 3D" state directly;
  // it guides the user to the right product + instructs them. If no product
  // is selected yet, send them to catalog first.
  if (!ctx.selectedProductSlug) {
    return {
      message:
        "Untuk atur bordir logo via preview 3D, saya buka katalog dulu — pilih produk yang didukung konfigurator 3D (mis. Kemeja Lapangan Ripstop), lalu klik tombol “Preview 3D & Bordir Logo”.",
      action: { type: "SHOW_PRODUCTS", payload: {} },
      quickReplies: ["Kemeja Lapangan Ripstop", "Lihat keranjang"],
    };
  }
  const product = productService.getProductBySlug(ctx.selectedProductSlug);
  return {
    message: product
      ? `Baik, di halaman ${product.name} klik tombol “Preview 3D & Bordir Logo” untuk upload logo dan atur posisi bordir (dada, lengan, punggung). Saya sudah arahkan ke produknya.`
      : "Di halaman produk yang didukung 3D, klik tombol “Preview 3D & Bordir Logo”.",
    action: {
      type: "OPEN_PRODUCT_DETAIL",
      payload: { slug: ctx.selectedProductSlug, reason: "Membuka tab 3D" },
    },
    quickReplies: ["Tambah ke keranjang", "Hubungi sales"],
    contextPatch: { journeyStage: "CONFIGURING_PRODUCT" },
  };
};

const exploreMore: Rule = ({ text, ctx }) => {
  const t = text.toLowerCase();
  if (!/\b(lanjut eksplor|tambah.*lain|produk pelengkap|complementary|lainnya)\b/.test(t)) {
    return null;
  }
  const industry = ctx.selectedIndustry;
  if (!industry) {
    return {
      message:
        "Tentu, saya tampilkan katalog lengkap. Pilih industri untuk rekomendasi yang lebih relevan.",
      action: { type: "SHOW_PRODUCTS", payload: {} },
      quickReplies: ["Pertambangan", "Konstruksi", "Corporate"],
      contextPatch: { journeyStage: "EXPLORING_MORE_PRODUCTS" },
    };
  }
  // suggest a complementary category the user hasn't viewed
  const viewed = new Set(ctx.viewedProductIds);
  const complementary = productService.getProductsByIndustry(industry).filter(
    (p) => !viewed.has(p.id),
  );
  const next = complementary[0];
  if (!next) {
    return {
      message: `Untuk ${industry}, Anda sudah melihat semua rekomendasi utama. Mau lihat industri lain?`,
      action: { type: "SHOW_PRODUCTS", payload: { industry } },
      quickReplies: ["Konstruksi", "Perhotelan", "Hubungi sales"],
    };
  }
  return {
    message: `Sebagai produk pelengkap untuk ${industry}, saya rekomendasikan ${next.name}. Saya buka detailnya.`,
    action: {
      type: "OPEN_PRODUCT_DETAIL",
      payload: { slug: next.slug, reason: "Produk pelengkap" },
    },
    quickReplies: ["Tambah ke keranjang", "Lihat keranjang"],
    contextPatch: withProductViewed(ctx, next.id, next.slug),
  };
};

const fallback: Rule = ({ text, ctx }) => {
  // Last-resort: never returns null.
  const t = text.toLowerCase();
  void SIZES; // referenced for completeness; intent layer uses it.
  if (ctx.journeyStage === "NEW_VISITOR") {
    return {
      message:
        "Maaf, saya belum yakin maksud Anda. Coba sebutkan industri (cth: “seragam untuk tambang”) atau klik salah satu pilihan di bawah.",
      quickReplies: ["Pertambangan", "Konstruksi", "Manufaktur", "Hubungi sales"],
    };
  }
  return {
    message:
      "Maaf saya belum menangkap maksudnya. Saya bisa membantu menampilkan produk, membuka detail, menambah ke keranjang, atau checkout. Coba salah satu pilihan di bawah.",
    quickReplies: [
      "Lihat katalog",
      "Lihat keranjang",
      "Hubungi sales",
    ],
  };
};

// ordered list — first match wins
export const RULES: Rule[] = [
  humanHandoff,
  greeting,
  askHelp,
  embroideryPricing,
  quantityPricing,
  searchCatalog,
  viewCart,
  checkout,
  quotation,
  register,
  tracking,
  open3DConfigurator,
  addToCart,
  exploreMore,
  selectIndustry,
  recommendAfterContext,
  openProductByCategory,
  fallback,
];

export function runRules(input: RuleInput): OfistantResponse {
  for (const rule of RULES) {
    const out = rule(input);
    if (out) {
      // Ensure contextPatch never accidentally resets journey backwards.
      return {
        ...out,
        contextPatch: {
          ...out.contextPatch,
          turnsTaken: (input.ctx.turnsTaken ?? 0) + 1,
        },
      };
    }
  }
  // unreachable because fallback is in RULES
  return fallback(input) as OfistantResponse;
}

// also merge "item added" post-confirm hook for context progression
export function afterConfirmItemAdded(ctx: OfistantContext): OfistantContext {
  return withItemAdded(ctx);
}
