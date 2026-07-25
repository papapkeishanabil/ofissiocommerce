// src/data/products.ts
// Dummy catalog. Phase 2 will swap this with live WooCommerce data
// behind the same `Product` shape, so components stay unchanged.

import type { Product } from "@/types/product";

export const PRODUCTS: Product[] = [
  {
    id: "p-001",
    slug: "kemeja-lapangan-heavy-crew",
    name: "Kemeja Lapangan Heavy Crew",
    sku: "OF-KL-001",
    industries: ["Pertambangan", "Konstruksi", "Manufaktur"],
    category: "Kemeja Lapangan",
    priceFrom: 145000,
    moq: 20,
    leadTimeDays: 10,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Kemeja lapangan dengan kain tebal tahan sobek, cocok untuk aktivitas padat di area tambang dan konstruksi. Sistem ventilasi ganda menjaga sirkulasi udara saat bekerja seharian.",
    material: "Drill Katun 100% — 280 gsm, tear-resistant",
    colors: ["Navy", "Orange Safety", "Khaki", "Dark Green"],
    specs: [
      { label: "Gramatur", value: "280 gsm" },
      { label: "Tutup Tombol", value: "Hidden placket" },
      { label: "Kantong", value: "2 dada + 1 lengan" },
      { label: "Reflector", value: "3M Scotchlite (opsional)" },
    ],
    sizeChart: [
      { size: "S", chest: 100, length: 68 },
      { size: "M", chest: 106, length: 70 },
      { size: "L", chest: 112, length: 72 },
      { size: "XL", chest: 118, length: 74 },
      { size: "2XL", chest: 124, length: 76 },
      { size: "3XL", chest: 130, length: 78 },
    ],
    accentColor: "#1e293b",
  },
  {
    id: "p-002",
    slug: "wearpack-tambang-pro",
    name: "Wearpack Tambang Pro",
    sku: "OF-WP-002",
    industries: ["Pertambangan", "Manufaktur"],
    category: "Wearpack",
    priceFrom: 285000,
    moq: 15,
    leadTimeDays: 14,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Wearpack satu potong dengan reflektor menyeluruh, dirancang untuk mobilitas tinggi di area tambang. Siku dan lutut diperkuat lapisan ganda.",
    material: "Cotton Twill 300 gsm + lining mesh",
    colors: ["Orange Safety", "Navy", "Royal Blue"],
    specs: [
      { label: "Reflector", value: "Full body 3M" },
      { label: "Lutut", value: "Reinforced double-layer" },
      { label: "Resleting", value: "YKK heavy-duty" },
      { label: "Sertifikasi", value: "SNI 8916:2018 (opsional)" },
    ],
    sizeChart: [
      { size: "S", chest: 104, length: 142 },
      { size: "M", chest: 110, length: 146 },
      { size: "L", chest: 116, length: 150 },
      { size: "XL", chest: 122, length: 154 },
      { size: "2XL", chest: 128, length: 158 },
      { size: "3XL", chest: 134, length: 162 },
    ],
    accentColor: "#ea580c",
  },
  {
    id: "p-003",
    slug: "rompi-safety-class-2",
    name: "Rompi Safety Class 2",
    sku: "OF-RS-003",
    industries: ["Konstruksi", "Security", "Manufaktur"],
    category: "Rompi Safety",
    priceFrom: 78000,
    moq: 25,
    leadTimeDays: 7,
    fulfillment: "READY_STOCK",
    description:
      "Rompi safety ringan berstandar Class 2 dengan pita reflektor 2 inci. Breathable mesh cocok dipakai sepanjang hari di cuaca panas.",
    material: "Polyester mesh 150 gsm + reflective tape 2\"",
    colors: ["Orange Safety", "Lime Safety", "Yellow"],
    specs: [
      { label: "Standar", value: "ANSI/ISEA 107 Class 2" },
      { label: "Pita", value: "Reflective 2 inci" },
      { label: "Berat", value: "~220 gram" },
      { label: "Resleting", value: "YKK plastik" },
    ],
    sizeChart: [
      { size: "S", chest: 108, length: 60 },
      { size: "M", chest: 114, length: 62 },
      { size: "L", chest: 120, length: 64 },
      { size: "XL", chest: 126, length: 66 },
      { size: "2XL", chest: 132, length: 68 },
      { size: "3XL", chest: 138, length: 70 },
    ],
    accentColor: "#65a30d",
  },
  {
    id: "p-004",
    slug: "jaket-kerja-arctic-insulated",
    name: "Jaket Kerja Arctic Insulated",
    sku: "OF-JK-004",
    industries: ["Pertambangan", "Konstruksi", "Corporate"],
    category: "Jaket Kerja",
    priceFrom: 325000,
    moq: 15,
    leadTimeDays: 14,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Jaket kerja berinsulasi untuk area kerja bersuh rendah. Lapisan luar windproof dan water-resistant, lapisan dalam fleece hangat.",
    material: "Outer Oxford 300D + inner fleece 280 gsm",
    colors: ["Navy", "Black", "Dark Grey"],
    specs: [
      { label: "Tahan Angin", value: "Ya" },
      { label: "Tahan Air", value: "Water-resistant" },
      { label: "Isolasi", value: "Polyfill 160 gsm" },
      { label: "Hood", value: "Detachable" },
    ],
    sizeChart: [
      { size: "S", chest: 110, length: 70 },
      { size: "M", chest: 116, length: 72 },
      { size: "L", chest: 122, length: 74 },
      { size: "XL", chest: 128, length: 76 },
      { size: "2XL", chest: 134, length: 78 },
      { size: "3XL", chest: 140, length: 80 },
    ],
    accentColor: "#0f766e",
  },
  {
    id: "p-005",
    slug: "polo-shirt-cool-pro",
    name: "Polo Shirt Cool Pro",
    sku: "OF-PS-005",
    industries: ["Corporate", "F&B", "Perhotelan", "Security"],
    category: "Polo Shirt",
    priceFrom: 89000,
    moq: 30,
    leadTimeDays: 9,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Polo shirt berkain cool-dry cepat kering, ideal untuk seragam staf layanan. Warna stabil walau dicuci berulang.",
    material: "Pique polyester interlock 200 gsm (cool-dry)",
    colors: ["Navy", "Black", "White", "Maroon", "Royal Blue"],
    specs: [
      { label: "Gramatur", value: "200 gsm" },
      { label: "Kerah", value: "Rib knit 1x1" },
      { label: "Tombol", value: "3 buah abalone" },
      { label: "Cepat Kering", value: "Ya" },
    ],
    sizeChart: [
      { size: "S", chest: 100, length: 66 },
      { size: "M", chest: 106, length: 68 },
      { size: "L", chest: 112, length: 70 },
      { size: "XL", chest: 118, length: 72 },
      { size: "2XL", chest: 124, length: 74 },
      { size: "3XL", chest: 130, length: 76 },
    ],
    accentColor: "#7c3aed",
  },
  {
    id: "p-006",
    slug: "kemeja-kantor-execsuite",
    name: "Kemeja Kantor ExecSuite",
    sku: "OF-KK-006",
    industries: ["Corporate", "Perhotelan"],
    category: "Kemeja Kantor",
    priceFrom: 125000,
    moq: 25,
    leadTimeDays: 10,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Kemeja kantor slim fit berbahan katun tidak mudah kusut. Tampilan rapi seharian untuk staf kantor dan frontliner perhotelan.",
    material: "Katun premium anti-kusut 130 gsm",
    colors: ["White", "Light Blue", "Pink", "Grey"],
    specs: [
      { label: "Gramatur", value: "130 gsm" },
      { label: "Potongan", value: "Slim fit" },
      { label: "Kerah", value: "Semi spread" },
      { label: "Anti Kusut", value: "Ya" },
    ],
    sizeChart: [
      { size: "S", chest: 102, length: 70 },
      { size: "M", chest: 108, length: 72 },
      { size: "L", chest: 114, length: 74 },
      { size: "XL", chest: 120, length: 76 },
      { size: "2XL", chest: 126, length: 78 },
      { size: "3XL", chest: 132, length: 80 },
    ],
    accentColor: "#0369a1",
  },
  {
    id: "p-007",
    slug: "scrub-medik-airflow",
    name: "Scrub Medik Airflow",
    sku: "OF-SM-007",
    industries: ["Kesehatan"],
    category: "Kemeja Lapangan",
    priceFrom: 98000,
    moq: 20,
    leadTimeDays: 8,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Set scrubs medis berkain anti-mikroba dan cepat kering. Saku terstruktur untuk alat kerja, jahitan diperkuat.",
    material: "Polyester-rayon 175 gsm, anti-mikroba Silver+",
    colors: ["Ceil Blue", "Teal", "Navy", "Wine"],
    specs: [
      { label: "Gramatur", value: "175 gsm" },
      { label: "Anti Mikroba", value: "Silver+ treatment" },
      { label: "Saku", value: "4 kantong fungsional" },
      { label: "Tali", value: "Back tie + side" },
    ],
    sizeChart: [
      { size: "S", chest: 104, length: 70 },
      { size: "M", chest: 110, length: 72 },
      { size: "L", chest: 116, length: 74 },
      { size: "XL", chest: 122, length: 76 },
      { size: "2XL", chest: 128, length: 78 },
      { size: "3XL", chest: 134, length: 80 },
    ],
    accentColor: "#0891b2",
  },
  {
    id: "p-008",
    slug: "apron-fnb-premium",
    name: "Apron F&B Premium",
    sku: "OF-AP-008",
    industries: ["F&B", "Perhotelan"],
    category: "Jaket Kerja",
    priceFrom: 115000,
    moq: 15,
    leadTimeDays: 7,
    fulfillment: "READY_STOCK",
    description:
      "Apron dewa dari kanvas tebal anti noda dengan tali silang punggung. Dapat disesuaikan untuk barista, chef, dan staf restoran.",
    material: "Canvas katun 280 gsm, water-repellent finish",
    colors: ["Charcoal", "Black", "Olive", "Burgundy"],
    specs: [
      { label: "Gramatur", value: "280 gsm" },
      { label: "Tali", value: "Cross-back adjustable" },
      { label: "Saku", value: "3 kantong strategis" },
      { label: "Anti Noda", value: "Water-repellent" },
    ],
    sizeChart: [
      { size: "S", chest: 0, length: 84 },
      { size: "M", chest: 0, length: 86 },
      { size: "L", chest: 0, length: 88 },
      { size: "XL", chest: 0, length: 90 },
      { size: "2XL", chest: 0, length: 92 },
      { size: "3XL", chest: 0, length: 94 },
    ],
    accentColor: "#b45309",
  },
  {
    id: "p-009",
    slug: "wearpack-konstruksi-toughflex",
    name: "Wearpack Konstruksi ToughFlex",
    sku: "OF-WP-009",
    industries: ["Konstruksi", "Pertambangan"],
    category: "Wearpack",
    priceFrom: 310000,
    moq: 12,
    leadTimeDays: 14,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Wearpack dengan panel stretch di area gerak, memberi fleksibilitas saat memanjat dan membungkuk. Reflektor di dada dan kaki.",
    material: "Twill katun-poly 280 gsm + panel stretch",
    colors: ["Orange Safety", "Navy", "Khaki"],
    specs: [
      { label: "Reflector", value: "Dada + kaki" },
      { label: "Panel Stretch", value: "Siku & punggung" },
      { label: "Resleting", value: "YKK heavy-duty 2-arah" },
      { label: "Sertifikasi", value: "SNI (opsional)" },
    ],
    sizeChart: [
      { size: "S", chest: 106, length: 144 },
      { size: "M", chest: 112, length: 148 },
      { size: "L", chest: 118, length: 152 },
      { size: "XL", chest: 124, length: 156 },
      { size: "2XL", chest: 130, length: 160 },
      { size: "3XL", chest: 136, length: 164 },
    ],
    accentColor: "#c2410c",
  },
  {
    id: "p-010",
    slug: "polo-shirt-security-tactical",
    name: "Polo Shirt Security Tactical",
    sku: "OF-PS-010",
    industries: ["Security", "Corporate"],
    category: "Polo Shirt",
    priceFrom: 105000,
    moq: 20,
    leadTimeDays: 9,
    fulfillment: "MADE_TO_ORDER",
    description:
      "Polo shirt tactical dengan kain tebal dan jahitan diperkuat. Dilengkapi loop untuk epollet dan panel loop di dada untuk patch.",
    material: "Pique poly-katun 240 gsm, ripstop weave",
    colors: ["Black", "Navy", "Dark Grey"],
    specs: [
      { label: "Gramatur", value: "240 gsm" },
      { label: "Panel Loop", value: "Dada + lengan" },
      { label: "Epollet", value: "Loop bahu" },
      { label: "Jahitan", value: "Double-needle reinforced" },
    ],
    sizeChart: [
      { size: "S", chest: 104, length: 68 },
      { size: "M", chest: 110, length: 70 },
      { size: "L", chest: 116, length: 72 },
      { size: "XL", chest: 122, length: 74 },
      { size: "2XL", chest: 128, length: 76 },
      { size: "3XL", chest: 134, length: 78 },
    ],
    accentColor: "#1e40af",
  },
];

// --- Lookup helpers (single source of truth for routing & filtering) ---

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByIndustry(industry: string): Product[] {
  return PRODUCTS.filter((p) =>
    p.industries.includes(industry as Product["industries"][number]),
  );
}

export function getRelatedProducts(
  product: Product,
  limit = 3,
): Product[] {
  return PRODUCTS.filter(
    (p) => p.id !== product.id && p.industries.some((i) => product.industries.includes(i)),
  ).slice(0, limit);
}
