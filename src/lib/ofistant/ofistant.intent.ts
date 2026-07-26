// src/lib/ofistant/ofistant.intent.ts
// Lightweight, rule-based intent detection. Returns at most one strongest
// intent per turn so the rules engine can act deterministically.
//
// NOTE: This is intentionally simple keyword/heuristic matching. When the LLM
// layer is wired in (Phase 7), the LLM will produce the action directly and
// these intents become fallback / guardrail signals.

import { INDUSTRIES, CATEGORIES } from "@/types/industry";

export type Intent =
  | "GREETING"
  | "ASK_BROWSE"
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
  | "ASK_HUMAN"
  | "ASK_HELP"
  | "UNKNOWN";

export interface DetectedIntent {
  intent: Intent;
  /** extracted industry / category slug when relevant */
  industry?: string;
  category?: string;
}

const INDUSTRY_ALIASES: Record<string, string> = {
  "tambang": "Pertambangan",
  "tambang batubara": "Pertambangan",
  "mining": "Pertambangan",
  "konstruksi": "Konstruksi",
  "construction": "Konstruksi",
  "bangunan": "Konstruksi",
  "manufaktur": "Manufaktur",
  "pabrik": "Manufaktur",
  "manufacturing": "Manufaktur",
  "hotel": "Perhotelan",
  "perhotelan": "Perhotelan",
  "hospitality": "Perhotelan",
  "kesehatan": "Kesehatan",
  "medis": "Kesehatan",
  "rs": "Kesehatan",
  "rumah sakit": "Kesehatan",
  "klinik": "Kesehatan",
  "healthcare": "Kesehatan",
  "fnb": "F&B",
  "kuliner": "F&B",
  "restoran": "F&B",
  "makanan": "F&B",
  "minuman": "F&B",
  "food beverage": "F&B",
  "security": "Security",
  "satpam": "Security",
  "keamanan": "Security",
  "corporate": "Corporate",
  "kantor": "Corporate",
  "perkantoran": "Corporate",
  "office": "Corporate",
};

const CATEGORY_ALIASES: Record<string, string> = {
  "kemeja lapangan": "Kemeja Lapangan",
  "wearpack": "Wearpack",
  "coverall": "Wearpack",
  "rompi": "Rompi Safety",
  "rompi safety": "Rompi Safety",
  "jaket": "Jaket Kerja",
  "jaket kerja": "Jaket Kerja",
  "polo": "Polo Shirt",
  "polo shirt": "Polo Shirt",
  "kemeja kantor": "Kemeja Kantor",
  "kemeja": "Kemeja Kantor",
};

export function detectIndustry(text: string): string | undefined {
  const t = text.toLowerCase();
  // longest-first match
  const keys = Object.keys(INDUSTRY_ALIASES).sort(
    (a, b) => b.length - a.length,
  );
  for (const k of keys) {
    if (t.includes(k)) return INDUSTRY_ALIASES[k]!;
  }
  // exact canonical match
  for (const ind of INDUSTRIES) {
    if (t.includes(ind.toLowerCase())) return ind;
  }
  return undefined;
}

export function detectCategory(text: string): string | undefined {
  const t = text.toLowerCase();
  const keys = Object.keys(CATEGORY_ALIASES).sort(
    (a, b) => b.length - a.length,
  );
  for (const k of keys) {
    if (t.includes(k)) return CATEGORY_ALIASES[k]!;
  }
  for (const c of CATEGORIES) {
    if (t.includes(c.toLowerCase())) return c;
  }
  return undefined;
}

export function detectIntent(text: string): DetectedIntent {
  const t = text.toLowerCase().trim();

  if (!t) return { intent: "UNKNOWN" };

  if (
    /\b(halo|hai|hi|hallo|hello|selamat (pagi|siang|sore|malam)|pagi|siang|sore|malam)\b/.test(
      t,
    ) ||
    /^(p|bu|pak|kak)$/i.test(t)
  ) {
    return { intent: "GREETING" };
  }

  const industry = detectIndustry(t);
  const category = detectCategory(t);

  if (
    /\b(sales (manusia|asli)|hubungi sales|sales ofissio|cs|customer service|agent manusia|human|operator)\b/.test(
      t,
    )
  ) {
    return { intent: "ASK_HUMAN" };
  }

  if (/\b(tracking|lacak|status (order|pengiriman|produksi)|where.*order|pesanan saya)\b/.test(t)) {
    return { intent: "ASK_TRACKING" };
  }

  if (/\b(3d|3 d|preview 3d|konfigur.*3d|atur bordir|bordir logo|logo bordir|embroidery|lihat 3d)\b/.test(t)) {
    return { intent: "ASK_3D_CONFIGURATOR" };
  }

  if (/\b(quotation|penawaran|quote|rfq|request.*(quote|penawaran))\b/.test(t)) {
    if (industry) return { intent: "ASK_QUOTATION", industry };
    return { intent: "ASK_QUOTATION" };
  }

  if (/\b(checkout|bayar|pembayaran|lanjut.*bayar|selesaikan.*pesanan)\b/.test(t)) {
    return { intent: "ASK_CHECKOUT" };
  }

  if (/\b(daftar|register|bikin akun|buat akun|sign up|signup)\b/.test(t)) {
    return { intent: "ASK_REGISTER" };
  }

  if (/\b(keranjang|cart|lihat.*cart|cek.*cart|item saya)\b/.test(t)) {
    return { intent: "ASK_VIEW_CART" };
  }

  if (/\b(tambah.*keranjang|masuk.*keranjang|add.*cart|pesan|pesan ini|beli|beli ini|add to cart)\b/.test(t)) {
    return { intent: "ASK_ADD_TO_CART" };
  }

  // explicit product category request → OPEN_PRODUCT
  if (category && /\b(lihat|tampilkan|buka|mau|cari|butuh|tolong.*lihat)\b/.test(t)) {
    return { intent: "OPEN_PRODUCT", category };
  }

  // recommend
  if (industry || /\b(rekomendasi|saran|sarankan|rekomendasikan|bagus.*untuk|cocok.*untuk|paling sesuai)\b/.test(t)) {
    if (industry) return { intent: "SELECT_INDUSTRY", industry };
    return { intent: "ASK_RECOMMEND" };
  }

  if (industry) return { intent: "SELECT_INDUSTRY", industry };
  if (category) return { intent: "SELECT_CATEGORY", category };

  if (/\b(browse|katalog|catalog|lihat.*produk|semua produk|lihat semua)\b/.test(t)) {
    return { intent: "ASK_BROWSE" };
  }

  if (/\b(help|bantuan|bantu|gimana|bagaimana|apa.*bisa|bisa.*bantu)\b/.test(t)) {
    return { intent: "ASK_HELP" };
  }

  return { intent: "UNKNOWN" };
}
