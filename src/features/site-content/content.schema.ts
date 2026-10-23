// src/features/site-content/content.schema.ts
// The field-schema registry — the single source of truth for admin-editable
// homepage content. Each section declares:
//   - a zod schema validating its jsonb `data` row,
//   - a `default` (= today's hardcoded const, icon stored as a string key),
//   - a `fields` descriptor list that drives the generic admin form editor.
//
// Three consumers, one source:
//   1. the public reader validates each DB row through its schema and falls
//      back to `default` on any failure (homepage never breaks);
//   2. the admin editor renders `fields`;
//   3. migration 025's CHECK constraint enumerates the section keys.
//
// Phase 1 covers three "card array" sections: trust, bisnis_naik_kelas,
// korporasi. Headers (eyebrow / segmented H2 / lede) stay in code for now and
// migrate in a later phase alongside the `segments` field type.

import { z } from "zod";

import { HOMEPAGE_ICON_KEYS } from "./icon-registry";
import { INDUSTRIES } from "@/types/industry";
import { INSPIRATION_ROUTES } from "./industry-inspiration.routes";

// ---------------------------------------------------------------------------
// Field descriptors (drives the generic admin editor)
// ---------------------------------------------------------------------------

export type FieldDescriptor =
  | {
      kind: "text";
      key: string;
      label: string;
      placeholder?: string;
      maxLength?: number;
      help?: string;
    }
  | {
      kind: "textarea";
      key: string;
      label: string;
      placeholder?: string;
      maxLength?: number;
      rows?: number;
      help?: string;
    }
  | { kind: "icon"; key: string; label: string; help?: string }
  | {
      /** URL/path gambar dengan tombol upload (WordPress Media) + pratinjau.
       *  Nilai tetap string biasa — kompatibel dengan aset lokal
       *  (cth: /industries/bengkel-model.jpg) maupun URL hasil upload. */
      kind: "image";
      key: string;
      label: string;
      placeholder?: string;
      maxLength?: number;
      help?: string;
    }
  | {
      /** URL/path GLB dengan uploader ke bucket 3D privat Supabase. */
      kind: "model3d";
      key: string;
      label: string;
      /** Folder tujuan unggah (pola scope video); default "hero". */
      target?: "hero" | "produk";
      placeholder?: string;
      maxLength?: number;
      help?: string;
    }
  | {
      /** URL/path MP4 atau WebM dengan uploader ke bucket video privat Supabase. */
      kind: "video";
      key: string;
      label: string;
      scope: "hero" | "bordir";
      placeholder?: string;
      maxLength?: number;
      help?: string;
    }
  | { kind: "boolean"; key: string; label: string; toggleLabel?: string; help?: string }
  | {
      kind: "enum";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      help?: string;
    }
  | {
      kind: "segments";
      key: string;
      label: string;
      /** max number of text fragments */
      max?: number;
      help?: string;
    }
  | {
      kind: "stringList";
      key: string;
      label: string;
      /** noun for one row, used in the "Tambah …" button. */
      itemLabel?: string;
      min?: number;
      max?: number;
      maxLength?: number;
      help?: string;
    }
  | {
      kind: "list";
      key: string;
      label: string;
      /** noun for one row, e.g. "kartu" — used in the "Tambah …" button */
      itemLabel: string;
      /** flat item shape. Mutually exclusive with itemDiscriminator. */
      itemFields?: FieldDescriptor[];
      /** discriminated item shape: each row is an object whose key named by
       *  `itemDiscriminator` selects which `itemVariants[value]` field set
       *  applies (e.g. hero CTAs: kind → link | ofistant). */
      itemDiscriminator?: string;
      itemVariants?: { [value: string]: FieldDescriptor[] };
      /** render items as collapsed cards whose fields only appear when
       * opened — for long lists (e.g. §02 groups/tiles). */
      collapsible?: boolean;
      /** item field whose value doubles as the collapsed header title
       * (fallback: `itemLabel #n`). */
      titleKey?: string;
      min?: number;
      max?: number;
      help?: string;
    }
  | {
      kind: "discriminated";
      key: string;
      label: string;
      /** the object key whose value selects the active variant. */
      discriminator: string;
      /** one FieldDescriptor[] subtree per discriminator value. Switching the
       *  value resets the object to a blank of the new variant. */
      variants: { [value: string]: FieldDescriptor[] };
      help?: string;
    }
  | {
      /** Visual editor for the industry inspiration hero. The value remains a
       * normal JSON object inside the `industri` site-content row. */
      kind: "industryInspiration";
      key: string;
      label: string;
      help?: string;
    };

// ---------------------------------------------------------------------------
// Section data types (the jsonb shape per section)
// ---------------------------------------------------------------------------

export interface TrustStat {
  icon: string;
  value: string;
  label: string;
}
export interface TrustSectionData {
  items: TrustStat[];
}

export interface BenefitCard {
  icon: string;
  title: string;
  desc: string;
}
export interface BisnisNaikKelasSectionData {
  items: BenefitCard[];
}
export type KorporasiSectionData = BisnisNaikKelasSectionData;
export type CorpFeatureCard = BenefitCard;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const iconFieldSchema = z.enum(HOMEPAGE_ICON_KEYS);

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

/**
 * One fragment of a segmented headline. `highlight` marks the fragment to be
 * wrapped in the section's accent color; the color itself is NOT stored — it
 * stays a code-owned per-section className (see the Headline helper in
 * HomePage.tsx). Marketing toggles WHICH fragments pop, not how.
 */
export interface TextSegment {
  text: string;
  highlight?: boolean;
}

const segmentSchema = z.object({
  text: z.string().trim().min(1).max(140),
  highlight: z.boolean().optional(),
});

/** A headline is a non-empty ordered list of text fragments. */
export const textSegmentsSchema = z.array(segmentSchema).min(1).max(12);

export const trustSectionSchema = z.object({
  items: z
    .array(
      z.object({
        icon: iconFieldSchema,
        value: nonEmpty(40),
        label: nonEmpty(80),
      }),
    )
    .min(1)
    .max(12),
});

export const benefitCardSchema = z.object({
  icon: iconFieldSchema,
  title: nonEmpty(60),
  desc: nonEmpty(280),
});

export const bisnisNaikKelasSectionSchema = z.object({
  items: z.array(benefitCardSchema).min(1).max(12),
});

export const korporasiSectionSchema = z.object({
  items: z.array(benefitCardSchema).min(1).max(12),
});

// ---------------------------------------------------------------------------
// Defaults (= today's hardcoded consts, icon as string key)
// ---------------------------------------------------------------------------

export const DEFAULT_TRUST: TrustSectionData = {
  items: [
    { icon: "Boxes", value: "8 pcs", label: "Mulai dari jumlah kecil" },
    { icon: "RotateCcw", value: "2-4 hari", label: "Selesai bordir, siap kirim" },
    { icon: "Tag", value: "12.000+", label: "Logo dibordir per bulan" },
    { icon: "Building2", value: "340+", label: "Usaha dan perusahaan klien" },
  ],
};

export const DEFAULT_BISNIS_NAIK_KELAS: BisnisNaikKelasSectionData = {
  items: [
    { icon: "Sparkles", title: "Lebih Profesional", desc: "Tim tampil rapi dan teratur di mata pelanggan sejak hari pertama." },
    { icon: "ShieldCheck", title: "Lebih Dipercaya", desc: "Penampilan yang rapi membangun kepercayaan pelanggan dan mitra bisnis terhadap merek Anda." },
    { icon: "Tag", title: "Logo Semakin Dikenal", desc: "Logo bisnis Anda semakin dikenal melalui bordir rapi di dada setiap anggota tim." },
    { icon: "Layers", title: "Tim Lebih Kompak", desc: "Seragam membuat tim tampil rapi dan bersatu di setiap titik layanan pelanggan." },
  ],
};

export const DEFAULT_KORPORASI: KorporasiSectionData = {
  items: [
    { icon: "FileText", title: "Quotation Formal", desc: "Penawaran terstruktur untuk kebutuhan pengadaan dan persetujuan internal." },
    { icon: "Tag", title: "Logo Khusus Multi-Divisi", desc: "Bordir khusus per divisi, posisi, dan jabatan." },
    { icon: "Truck", title: "Tracking Order", desc: "Pantau produksi dan pengiriman tiap batch secara langsung." },
    { icon: "Layers", title: "Pengadaan Skala Besar", desc: "Dari 20 hingga 5.000+ pcs per pemesanan, 34 provinsi." },
  ],
};

// ---------------------------------------------------------------------------
// bordir (§04 Bordir dan Kustomisasi) — headline + lede + media + capability cards
// ---------------------------------------------------------------------------

export interface BordirCapability {
  title: string;
  desc: string;
}
export interface BordirSectionData {
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  mediaSrc: string;
  capabilities: BordirCapability[];
}

export const bordirSectionSchema = z.object({
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  mediaSrc: z.string().trim().max(500).default("/KK-006.mp4"),
  capabilities: z
    .array(z.object({ title: nonEmpty(60), desc: nonEmpty(200) }))
    .min(1)
    .max(8),
});

export const DEFAULT_BORDIR: BordirSectionData = {
  eyebrow: "Bordir dan Kustomisasi",
  headline: [
    { text: "Kami memegang setiap " },
    { text: "tahap produksi.", highlight: true },
  ],
  lede:
    "Mesin bordir dan konveksi kami berjalan di satu atap. Logo, warna benang, dan potongan kain diperiksa oleh tim yang sama.",
  mediaSrc: "/KK-006.mp4",
  capabilities: [
    { title: "Mesin Multi-Kepala", desc: "Presisi tinggi, gradasi warna dan detail kecil." },
    { title: "Dokumentasi Video", desc: "Lihat seragam Anda dijahit atas permintaan." },
    { title: "QC Berlapis", desc: "Uji kain → jahit → ketahanan bordir." },
    { title: "Pratinjau Desain", desc: "Revisi gratis sebelum mesin berjalan." },
  ],
};

// ---------------------------------------------------------------------------
// cara_order (§05 Cara Order Mudah) — headline + lede + step cards
// The step NUMBER stays code-owned (positional, rendered from index) — only the
// copy + icon are editable.
// ---------------------------------------------------------------------------

export interface CaraOrderStep {
  title: string;
  desc: string;
  icon: string;
}
export interface CaraOrderSectionData {
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  steps: CaraOrderStep[];
}

export const caraOrderSectionSchema = z.object({
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  steps: z
    .array(
      z.object({
        title: nonEmpty(60),
        desc: nonEmpty(200),
        icon: iconFieldSchema,
      }),
    )
    .min(1)
    .max(10),
});

export const LEGACY_CARA_ORDER: CaraOrderSectionData = {
  eyebrow: "Cara Order Mudah",
  headline: [
    { text: "Lima Langkah, " },
    { text: "Tanpa Ribet.", highlight: true },
  ],
  lede:
    "Dari obrolan pertama sampai seragam sampai, semua bisa Anda ikuti lewat Ofistant. Tidak perlu email bolak-balik atau pusing nego dari nol.",
  steps: [
    { title: "Ceritakan Usaha dan Jumlah Tim", desc: "Jenis usaha, berapa pegawai, dan kapan dibutuhkan.", icon: "MessageSquare" },
    { title: "Pilih Model / Minta Rekomendasi", desc: "Pilih dari paket, atau minta kami rekomendasikan yang pas.", icon: "Shirt" },
    { title: "Kirim Logo dan Ukuran", desc: "Upload logo usaha dan ukuran tiap pegawai.", icon: "Upload" },
    { title: "Terima Quotation", desc: "Harga jelas, lead time jelas, tanpa biaya tersembunyi.", icon: "FileText" },
    { title: "Produksi dan Tracking", desc: "Pantau proses produksi sampai seragam tiba di lokasi Anda.", icon: "Truck" },
  ],
};

export const DEFAULT_CARA_ORDER: CaraOrderSectionData = {
  eyebrow: "Cara Order Mudah",
  headline: [
    { text: "Stok Tersedia. " },
    { text: "Tinggal Pilih & Order.", highlight: true },
  ],
  lede: "Temukan seragam ready stock untuk tim Anda. Pilih produk, cek ketersediaan ukuran, lalu selesaikan pesanan langsung dari katalog.",
  steps: [
    { title: "Pilih Produk Ready Stock", desc: "Jelajahi katalog dan pilih seragam dengan stok yang tersedia.", icon: "Shirt" },
    { title: "Tentukan Varian & Jumlah", desc: "Pilih warna, ukuran, dan jumlah sesuai stok, lalu masukkan ke keranjang.", icon: "ShoppingBag" },
    { title: "Perlu Bordir Logo?", desc: "Ya — unggah logo dan atur posisi bordir di Studio.\nTidak — langsung lanjut ke checkout.", icon: "Scissors" },
    { title: "Checkout & Bayar", desc: "Lengkapi alamat pengiriman, cek ringkasan pesanan, dan lakukan pembayaran.", icon: "FileText" },
    { title: "Pantau Pengiriman", desc: "Ikuti status pesanan hingga seragam tiba di alamat Anda.", icon: "Truck" },
  ],
};

// ---------------------------------------------------------------------------
// cta (Ofistant + WhatsApp closing section)
// ---------------------------------------------------------------------------

export interface CtaSectionData {
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  ofistantLabel: string;
  whatsappHref: string;
  whatsappLabel: string;
  /** Gelembung chat ilustratif di kartu penutup ("show, don't tell"). */
  chatUserLine: string;
  chatOfistantLine: string;
}

export const ctaSectionSchema = z.object({
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  ofistantLabel: nonEmpty(60),
  whatsappHref: nonEmpty(200),
  whatsappLabel: nonEmpty(60),
  // Default agar row §CTA lama di database (tanpa key ini) tetap lolos parse.
  chatUserLine: nonEmpty(280).default(
    "Halo! Kami butuh 40 polo kerja dengan bordir logo, untuk acara 20 September.",
  ),
  chatOfistantLine: nonEmpty(400).default(
    "Siap! Untuk 40 pcs saya bantu pilihkan bahan dan model. Rekomendasi lengkap beserta estimasi harga saya kirim sebentar lagi.",
  ),
});

export const DEFAULT_CTA: CtaSectionData = {
  eyebrow: "Mulai Proyek Seragam",
  headline: [
    { text: "Ngobrol dulu dengan " },
    { text: "Ofistant.", highlight: true },
  ],
  lede:
    "Ceritakan jenis usaha, jumlah tim, dan tenggat Anda. Kami balas dengan rekomendasi bahan, estimasi harga, dan jadwal produksi dalam 1×24 jam kerja.",
  ofistantLabel: "Konsultasi dengan Ofistant",
  whatsappHref: "https://wa.me/6280000000000",
  whatsappLabel: "WhatsApp 08xx-xxxx-xxxx",
  chatUserLine: "Halo! Kami butuh 40 polo kerja dengan bordir logo, untuk acara 20 September.",
  chatOfistantLine:
    "Siap! Untuk 40 pcs saya bantu pilihkan bahan dan model. Rekomendasi lengkap beserta estimasi harga saya kirim sebentar lagi.",
};

// ---------------------------------------------------------------------------
// paket (§03 Rencana Paket Seragam) — headline + lede + inline labels + visual selector
// The catalog `href` is editable copy (a URL, admin-owned like the CTA whatsapp
// href); the `scale` boolean toggles the "Skala besar" badge.
// ---------------------------------------------------------------------------

export interface PaketItem {
  icon: string;
  name: string;
  photo: string;
  items: string;
  cocokUntuk: string;
  opsiLogo: string;
  href: string;
  scale: boolean;
}
export interface PaketSectionData {
  hidden: boolean;
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  isiLabel: string;
  cocokUntukLabel: string;
  opsiLogoLabel: string;
  ctaLabel: string;
  scaleBadgeLabel: string;
  items: PaketItem[];
}

export const paketSectionSchema = z.object({
  hidden: z.boolean().default(false),
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  isiLabel: nonEmpty(40),
  cocokUntukLabel: nonEmpty(40),
  opsiLogoLabel: nonEmpty(40),
  ctaLabel: nonEmpty(40),
  scaleBadgeLabel: nonEmpty(40),
  items: z
    .array(
      z.object({
        icon: iconFieldSchema,
        name: nonEmpty(60),
        photo: z.string().trim().max(500).default(""),
        items: nonEmpty(200),
        cocokUntuk: nonEmpty(200),
        opsiLogo: nonEmpty(200),
        href: nonEmpty(200),
        scale: z.boolean(),
      }),
    )
    .min(1)
    .max(12),
});

export const DEFAULT_PAKET: PaketSectionData = {
  hidden: false,
  eyebrow: "Rencana Paket Seragam",
  headline: [
    { text: "Paket Seragam untuk Berbagai Bidang. " },
    { text: "Segera Hadir.", highlight: true },
  ],
  lede: "Kami sedang menyiapkan paket seragam untuk berbagai bidang usaha. Konsultasikan kebutuhan Anda untuk mendapatkan informasi paket dan jadwal ketersediaannya.",
  isiLabel: "Isi:",
  cocokUntukLabel: "Cocok untuk:",
  opsiLogoLabel: "Logo:",
  ctaLabel: "Konsultasikan Kebutuhan",
  scaleBadgeLabel: "Skala besar",
  items: [
    { icon: "Wrench", name: "Paket Bengkel", photo: "/packages/paket-bengkel.png", items: "Polo kerja, kemeja, celana tahan noda", cocokUntuk: "Bengkel motor/mobil dan toko sparepart", opsiLogo: "Bordir dada atau dTF tahan panas", href: "/inspirasi/bengkel-teknisi", scale: false },
    { icon: "Store", name: "Paket Toko dan Retail", photo: "/packages/paket-toko-retail.png", items: "Kemeja/polo staf + name tag", cocokUntuk: "Toko retail, grosir, kelontong, toko mas", opsiLogo: "Bordir dada + nama pegawai", href: "/inspirasi/retail", scale: false },
    { icon: "Plus", name: "Paket Apotek dan Klinik", photo: "/packages/paket-apotek-klinik.png", items: "Seragam medis dan jas lab higienis", cocokUntuk: "Apotek, klinik, praktek dokter", opsiLogo: "Bordir halus, kain mudah disterilkan", href: "/inspirasi/apotek-klinik", scale: false },
    { icon: "Coffee", name: "Paket Kafe dan Restoran", photo: "/packages/paket-cafe-service.png", items: "Apron, kemeja pelayan, polo barista", cocokUntuk: "Kafe, restoran, bakery, dan usaha jasa makanan", opsiLogo: "Bordir atau dTF tahan cuci panas", href: "/inspirasi/restoran-kafe", scale: false },
    { icon: "Building2", name: "Paket Corporate", photo: "/packages/paket-corporate.png", items: "Kemeja oxford, polo, blazer, identitas divisi", cocokUntuk: "Kantor, koperasi, layanan, hospitality", opsiLogo: "Bordir custom multi-divisi", href: "/inspirasi/solusi-korporasi", scale: true },
    { icon: "HardHat", name: "Paket Lapangan / Konstruksi", photo: "/packages/paket-lapangan-konstruksi.png", items: "Wearpack, rompi safety, jaket lapangan", cocokUntuk: "Konstruksi, tambang, ekspedisi, lapangan", opsiLogo: "Bordir tahan cuaca dan abrasi", href: "/inspirasi/konstruksi", scale: true },
  ],
};

// ---------------------------------------------------------------------------
// produk_pilihan (§07 Produk Pilihan) — headline + lede + 'Lihat' label + cards
// Each card has an optional 3D `glb` path; when empty, the `icon` fallback
// renders instead. The "3D"/"Katalog" badge stays code-derived (asset type,
// not marketing copy).
// ---------------------------------------------------------------------------

export interface ProdukPilihanItem {
  title: string;
  desc: string;
  tag: string;
  href: string;
  glb: string;
  icon: string;
}
export interface ProdukPilihanSectionData {
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  lihatLabel: string;
  items: ProdukPilihanItem[];
}

export const produkPilihanSectionSchema = z.object({
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  lihatLabel: nonEmpty(40),
  items: z
    .array(
      z.object({
        title: nonEmpty(60),
        desc: nonEmpty(200),
        tag: nonEmpty(60),
        href: nonEmpty(200),
        // Empty string = "no 3D model" → icon fallback renders. max(200) admits "".
        glb: z.string().trim().max(500),
        icon: iconFieldSchema,
      }),
    )
    .min(1)
    .max(12),
});

export const DEFAULT_PRODUK_PILIHAN: ProdukPilihanSectionData = {
  eyebrow: "Produk Pilihan",
  headline: [
    { text: "Kurasi Produk " },
    { text: "Siap Bordir Logo.", highlight: true },
  ],
  lede: "Model-model yang paling sering dipakai berbagai bisnis dan korporasi. Semua ready stock dan siap dibordir logo usaha Anda. Ceritakan kebutuhan Anda ke Ofistant untuk rekomendasi bahan dan ukuran.",
  lihatLabel: "Lihat",
  items: [
    { title: "Kemeja dan Polo", desc: "Oxford, twill, polo untuk corporate, manufaktur, dan hospitality.", tag: "Slim, Regular", href: "/catalog?category=kemeja", glb: "/3d/kk-006-mini.glb", icon: "Shirt" },
    { title: "Wearpack dan Coverall", desc: "Tahan abrasi untuk lapangan, proyek konstruksi, dan pertambangan.", tag: "Safety Grade", href: "/catalog?category=wearpack", glb: "/3d/kk-012-mini.glb", icon: "ShieldCheck" },
    { title: "Safety Wear", desc: "APD dan perlindungan sesuai standar keselamatan kerja.", tag: "Safety Grade", href: "/catalog?category=safety", glb: "/3d/ks-002-mini.glb", icon: "ShieldCheck" },
    { title: "Jaket dan Outerwear", desc: "Windbreaker, fleece, jaket bordir untuk tim lapangan.", tag: "Windbreaker, Fleece", href: "/catalog?category=jaket", glb: "", icon: "ShieldCheck" },
    { title: "Topi dan Aksesoris", desc: "Topi bordir, lanyard, name tag, pelengkap identitas tim.", tag: "Bordir Timbul", href: "/catalog?category=topi", glb: "", icon: "Award" },
    { title: "Scrubs dan Medis", desc: "Jas medis antimikroba untuk klinik dan rumah sakit.", tag: "Antimikroba", href: "/catalog?category=medis", glb: "", icon: "Users" },
  ],
};

// ---------------------------------------------------------------------------
// testimoni (§08 Testimoni Pembeli) — kartu kutipan ulasan marketplace.
// Kutipan verbatim + atribusi; bintang, label platform, dan warna titik
// dirender kode (data memilih SUMBER, kode memilih bentuk — pola yang sama
// seperti highlight className / dot grup §02). `screenshot` kosong = kartu
// tanpa tombol lightbox; `link` kosong = tanpa tautan ke halaman ulasan asli.
// `hidden` menyembunyikan kartu tanpa menghapus data
// (pola tile §02). items/proof sengaja boleh kosong: nilai bawaan TIDAK
// memuat ulasan contoh — section baru muncul di homepage setelah marketing
// mempublikasikan ulasan asli pertama, sehingga ulasan palsu tidak pernah
// ikut terkirim.
// ---------------------------------------------------------------------------

export const TESTIMONI_SOURCES = ["tokopedia", "shopee", "wa", "website"] as const;
export type TestimoniSource = (typeof TESTIMONI_SOURCES)[number];

const testimoniSourceSchema = z.enum(TESTIMONI_SOURCES);
const testimoniRatingSchema = z.enum(["1", "2", "3", "4", "5"]);

export interface TestimoniProofChip {
  source: TestimoniSource;
  score: string;
  count: string;
}
export interface TestimoniItem {
  quote: string;
  name: string;
  source: TestimoniSource;
  /** "1"-"5" sebagai enum string — Select admin menghasilkan string, komponen
   *  mengonversinya saat merender bintang. */
  rating: (typeof testimoniRatingSchema)["options"][number];
  date: string;
  product: string;
  screenshot: string;
  /** URL halaman ulasan asli (produk Tokopedia/Shopee dsb). "" = tanpa
   *  tautan keluar dari kartu. */
  link: string;
  hidden: boolean;
}
export interface TestimoniSectionData {
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  storeLinkLabel: string;
  /** "" = tautan toko tidak ditampilkan. */
  storeLinkHref: string;
  proof: TestimoniProofChip[];
  items: TestimoniItem[];
}

export const testimoniSectionSchema = z.object({
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  storeLinkLabel: nonEmpty(60),
  storeLinkHref: z.string().trim().max(200),
  proof: z
    .array(
      z.object({
        source: testimoniSourceSchema,
        score: nonEmpty(20),
        count: nonEmpty(40),
      }),
    )
    .max(4),
  items: z
    .array(
      z.object({
        quote: nonEmpty(300),
        name: nonEmpty(60),
        source: testimoniSourceSchema,
        rating: testimoniRatingSchema,
        date: nonEmpty(24),
        product: z.string().trim().max(40).default(""),
        screenshot: z.string().trim().max(500).default(""),
        link: z.string().trim().max(500).default(""),
        hidden: z.boolean().default(false),
      }),
    )
    .max(12),
});

export const DEFAULT_TESTIMONI: TestimoniSectionData = {
  eyebrow: "Testimoni Pembeli",
  headline: [
    { text: "Kata Pembeli Kami, " },
    { text: "Bukan Kata Kami Sendiri.", highlight: true },
  ],
  lede:
    "Ulasan asli pembeli Ofissio di Tokopedia, Shopee, dan WhatsApp, dikutip apa adanya, tanpa diedit. Kunjungi tokonya untuk memeriksa sendiri.",
  storeLinkLabel: "Kunjungi toko kami di marketplace",
  storeLinkHref: "",
  proof: [],
  items: [],
};

// ---------------------------------------------------------------------------
// industri (§02 Cocok untuk Berbagai Usaha) — segmented groups of industry tiles
// Each group carries a semantic `dot` ("ochre" | "brand"); the className stays
// code-owned (mapped in HomePage). Each tile routes via its canonical Industry
// enum value, so the catalog query resolves regardless of the display label.
// ---------------------------------------------------------------------------

export interface IndustriTile {
  label: string;
  icon: string;
  industry: string;
  /**
   * Path foto unggahan (cth: /industries/bengkel-model.jpg). Tile dengan foto
   * tampil sebagai kartu foto besar (featured); sisanya jadi tile ringkas di
   * balik toggle "Lihat semua". String kosong = tile ringkas.
   */
  photo: string;
  /**
   * Satu baris keterangan produk seragam untuk industri ini, tampil di bawah
   * judul kartu foto. String kosong / undefined = kartu tanpa keterangan
   * (contoh: tile ringkas tanpa foto).
   */
  caption?: string;
  /**
   * true = tile tidak dirender di homepage (data tetap tersimpan, bisa
   * dimunculkan lagi kapan saja). Default/undefined = tampil.
   */
  hidden?: boolean;
}
export interface IndustriGroup {
  label: string;
  meta: string;
  dot: "ochre" | "brand";
  tiles: IndustriTile[];
}
export interface IndustriSectionData {
  eyebrow: string;
  headline: TextSegment[];
  lede: string;
  groups: IndustriGroup[];
  inspiration: IndustryInspirationData;
  /** Per-page overrides. Empty preserves the legacy Bengkel content. */
  inspirationPages: IndustryInspirationData[];
}

export interface IndustryInspirationAnnotation {
  id: string;
  number: string;
  title: string;
  description: string;
  /** Anchor point on the garment, normalized to the source image (0-100). */
  anchorX: number;
  anchorY: number;
  /** Number/label position, normalized to the source image (0-100). */
  labelX: number;
  labelY: number;
  hidden: boolean;
}

export interface IndustryInspirationData {
  enabled: boolean;
  slug: string;
  /** Harus anggota INDUSTRIES — sama dengan enum industryFieldSchema. */
  industry: (typeof INDUSTRIES)[number];
  eyebrow: string;
  title: string;
  lede: string;
  image: string;
  imageAlt: string;
  /** CSS object-position percentages used by the public hero. */
  focalX: number;
  focalY: number;
  homepageFrames?: Partial<Record<"feature" | "card" | "corporate", { x: number; y: number; fit: "cover" | "contain" }>>;
  annotations: IndustryInspirationAnnotation[];
  cafePlacements?: { key: string; annotations: IndustryInspirationAnnotation[] }[];
}

const industryFieldSchema = z.enum(INDUSTRIES);
const dotFieldSchema = z.enum(["ochre", "brand"]);
const normalizedPercentSchema = z.number().min(0).max(100);

const industryInspirationAnnotationSchema = z.object({
  id: z.string().trim().min(1).max(40),
  number: z.string().trim().min(1).max(4),
  title: nonEmpty(90),
  description: z.string().trim().max(240).default(""),
  anchorX: normalizedPercentSchema,
  anchorY: normalizedPercentSchema,
  labelX: normalizedPercentSchema,
  labelY: normalizedPercentSchema,
  hidden: z.boolean().default(false),
});

export const industryInspirationSchema = z.object({
  enabled: z.boolean().default(true),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  industry: industryFieldSchema,
  eyebrow: nonEmpty(80),
  title: nonEmpty(180),
  lede: nonEmpty(420),
  image: nonEmpty(500),
  imageAlt: nonEmpty(180),
  focalX: normalizedPercentSchema.default(50),
  focalY: normalizedPercentSchema.default(50),
  homepageFrames: z.object({
    feature: z.object({ x: normalizedPercentSchema, y: normalizedPercentSchema, fit: z.enum(["cover", "contain"]) }).optional(),
    card: z.object({ x: normalizedPercentSchema, y: normalizedPercentSchema, fit: z.enum(["cover", "contain"]) }).optional(),
    corporate: z.object({ x: normalizedPercentSchema, y: normalizedPercentSchema, fit: z.enum(["cover", "contain"]) }).optional(),
  }).optional(),
  annotations: z.array(industryInspirationAnnotationSchema).min(1).max(8),
  cafePlacements: z.array(z.object({
    key: z.string().refine((key) => ["cafe:barista:team", "cafe:front-counter:team", "cafe:kitchen:team", "cafe:kitchen:uniform", "cafe:supervisor:team", "restaurant:service:team", "restaurant:host:team", "restaurant:chef:team", "restaurant:chef:uniform", "restaurant:manager:team"].includes(key), "Tampilan pin tidak dikenal"),
    annotations: z.array(industryInspirationAnnotationSchema).length(3),
  })).max(10).refine((items) => new Set(items.map((item) => item.key)).size === items.length, "Tampilan pin tidak boleh duplikat").optional(),
});

export const DEFAULT_INDUSTRY_INSPIRATION: IndustryInspirationData = {
  enabled: true,
  slug: "bengkel-teknisi",
  industry: "Bengkel",
  eyebrow: "Inspirasi Bengkel dan Teknisi",
  title: "Seragam yang Mengikuti Cara Tim Anda Bekerja.",
  lede: "Bahan dan potongan disesuaikan dengan aktivitas bengkel agar tim tetap nyaman dan tampil profesional sepanjang jam kerja.",
  image: "/industries/campaign/bengkel-teknisi.png",
  imageAlt: "Mekanik Ofissio mengenakan seragam kerja lengkap di bengkel modern",
  focalX: 0,
  focalY: 50,
  annotations: [
    { id: "sejuk", number: "01", title: "Tetap sejuk lebih lama", description: "Sirkulasi udara tetap lancar saat aktivitas meningkat.", anchorX: 46, anchorY: 28, labelX: 57, labelY: 25, hidden: false },
    { id: "keringat", number: "02", title: "Menyerap keringat dengan baik", description: "Tetap nyaman untuk aktivitas sepanjang hari.", anchorX: 39, anchorY: 49, labelX: 30, labelY: 52, hidden: false },
    { id: "gerak", number: "03", title: "Bebas bergerak saat bekerja", description: "Potongan mengikuti gerakan saat membungkuk dan menjangkau.", anchorX: 45, anchorY: 55, labelX: 56, labelY: 53, hidden: false },
    { id: "tangguh", number: "04", title: "Nyaman saat aktivitas padat", description: "Kokoh untuk rutinitas bengkel yang aktif.", anchorX: 41, anchorY: 69, labelX: 30, labelY: 72, hidden: false },
    { id: "identitas", number: "05", title: "Tim mudah dikenali", description: "Seragam membuat tim tampak rapi dan mudah dikenali pelanggan.", anchorX: 45, anchorY: 86, labelX: 56, labelY: 82, hidden: false },
  ],
};

export const industryInspirationPagesSchema = z.array(industryInspirationSchema)
  .max(INDUSTRIES.length)
  .superRefine((pages, context) => {
    const seen = new Set<string>();
    pages.forEach((page, index) => {
      if (page.slug !== INSPIRATION_ROUTES[page.industry].slug) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "slug"], message: "Alamat halaman harus sesuai dengan industrinya." });
      }
      if (seen.has(page.industry)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "industry"], message: "Setiap industri hanya boleh memiliki satu halaman inspirasi." });
      }
      seen.add(page.industry);
    });
  });

export const industriSectionSchema = z.object({
  eyebrow: nonEmpty(60),
  headline: textSegmentsSchema,
  lede: nonEmpty(400),
  groups: z
    .array(
      z.object({
        label: nonEmpty(60),
        meta: nonEmpty(80),
        dot: dotFieldSchema,
        tiles: z
          .array(
            z.object({
              label: nonEmpty(60),
              icon: iconFieldSchema,
              industry: industryFieldSchema,
              photo: z.string().max(200).default(""),
              caption: z.string().max(160).default(""),
              hidden: z.boolean().default(false),
            }),
          )
          .min(1)
          .max(16),
      }),
    )
    .min(1)
    .max(4),
  inspiration: industryInspirationSchema.default(DEFAULT_INDUSTRY_INSPIRATION),
  inspirationPages: industryInspirationPagesSchema.default([]),
});

export const DEFAULT_INDUSTRI: IndustriSectionData = {
  eyebrow: "Cocok untuk Berbagai Usaha",
  headline: [
    { text: "Dari Bengkel sampai Perusahaan, " },
    { text: "Seragamnya Bisa Disesuaikan.", highlight: true },
  ],
  lede: "Untuk bisnis dengan tim beberapa orang maupun korporasi multi-cabang dengan ribuan karyawan, Ofissio menyesuaikan bahan, model, dan standar bordir sesuai skala Anda. Tidak menemukan jenis usaha Anda? Ceritakan ke Ofistant.",
  inspiration: DEFAULT_INDUSTRY_INSPIRATION,
  inspirationPages: [],
  groups: [
    {
      label: "Bisnis Naik Kelas",
      meta: "Bordir mulai 8 pcs, reorder fleksibel",
      dot: "ochre",
      tiles: [
        { label: "Bengkel Motor dan Mobil", icon: "Wrench", industry: "Bengkel", photo: "/industries/bengkel-model.jpg", caption: "Polo kerja dan kemeja tahan noda, siap bordir logo." },
        { label: "Apotek dan Klinik", icon: "Plus", industry: "Kesehatan", photo: "/industries/klinik-model.jpg", caption: "Seragam medis dan jas lab higienis yang mudah disterilkan." },
        { label: "Toko Retail dan Minimarket", icon: "Store", industry: "Retail", photo: "/industries/retail-model.jpg", caption: "Kemeja dan polo staf lengkap dengan name tag." },
        { label: "Toko Grosir", icon: "Boxes", industry: "Grosir", photo: "" },
        { label: "Cafe dan Restoran", icon: "Coffee", industry: "F&B", photo: "" },
        { label: "Laundry", icon: "Droplets", industry: "Laundry", photo: "" },
        { label: "Barbershop dan Salon", icon: "Scissors", industry: "Salon", photo: "" },
        { label: "Toko Bangunan", icon: "Hammer", industry: "Bangunan", photo: "" },
        { label: "Toko Sparepart", icon: "Package", industry: "Sparepart", photo: "" },
        { label: "Pet Shop", icon: "PawPrint", industry: "Petshop", photo: "" },
        { label: "Ekspedisi Lokal", icon: "Truck", industry: "Ekspedisi", photo: "" },
        { label: "Security dan Parkir", icon: "ShieldCheck", industry: "Security", photo: "/industries/security-model.jpg", caption: "Seragam petugas dengan bordir nama dan perusahaan." },
      ],
    },
    {
      label: "Solusi Korporasi",
      meta: "Bordir mulai 8 pcs, quotation formal, multi-divisi",
      dot: "brand",
      tiles: [
        { label: "Konstruksi dan Infrastruktur", icon: "HardHat", industry: "Konstruksi", photo: "/industries/konstruksi-model.jpg", caption: "Wearpack, rompi safety, dan jaket lapangan tahan cuaca." },
        { label: "Manufaktur dan Pabrik", icon: "Factory", industry: "Manufaktur", photo: "/industries/manufaktur-model.jpg", caption: "Seragam produksi yang nyaman untuk shift panjang." },
        { label: "Pertambangan dan Migas", icon: "Pickaxe", industry: "Pertambangan", photo: "" },
        { label: "Perhotelan dan Hospitality", icon: "Building2", industry: "Perhotelan", photo: "/industries/perhotelan-model.jpg", caption: "Kemeja pelayan, apron, hingga blazer front office." },
        { label: "BUMN dan Pemerintahan", icon: "Landmark", industry: "BUMN", photo: "" },
        { label: "Maritim dan Logistik", icon: "Anchor", industry: "Maritim", photo: "" },
        { label: "Retail Chain dan Dept Store", icon: "Store", industry: "Retail", photo: "" },
        { label: "Security dan Pertahanan", icon: "ShieldCheck", industry: "Security", photo: "" },
        { label: "Korporasi dan Perkantoran", icon: "Briefcase", industry: "Corporate", photo: "/industries/perkantoran-model.jpg", caption: "Kemeja oxford, polo, dan blazer identitas divisi." },
        { label: "Rumah Sakit dan Kesehatan", icon: "Stethoscope", industry: "Kesehatan", photo: "" },
        { label: "Pendidikan dan Universitas", icon: "GraduationCap", industry: "Pendidikan", photo: "" },
        { label: "F&B Chain dan Restoran", icon: "UtensilsCrossed", industry: "F&B", photo: "" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// hero (carousel) — rotating slides. The most complex section: each slide has
// a segmented title, CTAs (discriminated link | ofistant), trust chips, and a
// right-hand panel (discriminated package | product | promo). Visual language
// (glass, borders, the title's ochre accent) and the carousel mechanics stay
// code-owned; only copy, icons, the 3D path, and the discriminator choices are
// data. `eyebrow` is flattened to eyebrowIcon/eyebrowText so the editor never
// needs a nested-object field type.
// ---------------------------------------------------------------------------

export interface HeroChip {
  icon: string;
  label: string;
}

export interface HeroCtaLink {
  kind: "link";
  variant: "primary" | "secondary";
  href: string;
  label: string;
}
export interface HeroCtaOfistant {
  kind: "ofistant";
  variant: "primary" | "secondary";
  label: string;
}
export type HeroCta = HeroCtaLink | HeroCtaOfistant;

export interface HeroPkgItem {
  name: string;
  tag: string;
  color: string;
  image: string;
}
export interface HeroPackagePanel {
  type: "package";
  badge: string;
  title: string;
  meta: string;
  items: HeroPkgItem[];
  pill: string;
}
export interface HeroProductPanel {
  type: "product";
  icon: string;
  glb: string;
  name: string;
  subtitle: string;
  features: string[];
}
export interface HeroPromoPanel {
  type: "promo";
  label: string;
  off: string;
  sub: string;
  code: string;
  validity: string;
}
export type HeroPanel = HeroPackagePanel | HeroProductPanel | HeroPromoPanel;

export interface HeroSlide {
  eyebrowIcon: string;
  eyebrowText: string;
  title: TextSegment[];
  subhead: string;
  ctas: HeroCta[];
  chips: HeroChip[];
  panel: HeroPanel;
}
export interface HeroSectionData {
  videoSrc: string;
  slides: HeroSlide[];
}

const ctaVariantSchema = z.enum(["primary", "secondary"]);

const heroCtaSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("link"),
    variant: ctaVariantSchema,
    href: nonEmpty(200),
    label: nonEmpty(60),
  }),
  z.object({
    kind: z.literal("ofistant"),
    variant: ctaVariantSchema,
    label: nonEmpty(60),
  }),
]);

const heroChipSchema = z.object({
  icon: iconFieldSchema,
  label: nonEmpty(60),
});

const heroPanelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("package"),
    badge: iconFieldSchema,
    title: nonEmpty(60),
    meta: nonEmpty(120),
    items: z
      .array(
        z.object({
          name: nonEmpty(60),
          tag: nonEmpty(120),
          color: z.string().trim().min(1).max(20),
          // Default keeps existing Supabase rows valid until an admin selects
          // an image for that package item.
          image: z.string().trim().max(500).default(""),
        }),
      )
      .min(1)
      .max(6),
    pill: nonEmpty(40),
  }),
  z.object({
    type: z.literal("product"),
    icon: iconFieldSchema,
    // Empty = no 3D model; the icon motif renders instead. (The default keeps
    // the real model so the "New Arrival" example reads large.)
    glb: z.string().trim().max(500),
    name: nonEmpty(60),
    subtitle: nonEmpty(120),
    features: z.array(nonEmpty(120)).min(1).max(6),
  }),
  z.object({
    type: z.literal("promo"),
    label: nonEmpty(60),
    off: nonEmpty(20),
    sub: nonEmpty(300),
    code: nonEmpty(40),
    validity: nonEmpty(120),
  }),
]);

export const heroSectionSchema = z.object({
  videoSrc: z.string().trim().max(500).default("/hero-workers.mp4"),
  slides: z
    .array(
      z.object({
        eyebrowIcon: iconFieldSchema,
        eyebrowText: nonEmpty(80),
        title: textSegmentsSchema,
        subhead: nonEmpty(400),
        ctas: z.array(heroCtaSchema).min(1).max(4),
        chips: z.array(heroChipSchema).min(1).max(6),
        panel: heroPanelSchema,
      }),
    )
    .min(1)
    .max(6),
});

export const DEFAULT_HERO: HeroSectionData = {
  videoSrc: "/hero-workers.mp4",
  slides: [
    {
      eyebrowIcon: "Sparkles",
      eyebrowText: "Ready Stock, Siap Bordir Logo, B2B",
      title: [
        { text: "Seragam Ready Stock, Siap Bordir Logo. " },
        { text: "Bisnis Anda Naik Kelas", highlight: true },
        { text: " dalam 2-4 Hari." },
      ],
      subhead:
        "Tanpa perlu menunggu penjahitan berminggu-minggu. Ofissio menyediakan seragam kerja ready stock berkualitas: cukup bordir logo usaha Anda, selesai dan siap kirim dalam 2-4 hari. Belanja mulai 1 pcs, bordir logo mulai 8 pcs, hingga pengadaan korporasi ribuan pcs.",
      ctas: [
        { kind: "link", variant: "primary", href: "/catalog", label: "Lihat Paket Seragam" },
        { kind: "ofistant", variant: "secondary", label: "Ofistant" },
      ],
      chips: [
        { icon: "PackageCheck", label: "Bordir Mulai 8 Pcs" },
        { icon: "Scissors", label: "Siap Bordir Logo" },
        { icon: "Users", label: "Untuk Semua Skala Bisnis" },
        { icon: "RotateCcw", label: "Reorder Mudah" },
      ],
      panel: {
        type: "package",
        badge: "Wrench",
        title: "Paket Bengkel",
        meta: "2 item, siap bordir logo",
        items: [
          {
            name: "Polo Staff",
            tag: "Cotton pique, bordir dada",
            color: "#142766",
            image: "/products/hero-polo-staff-navy.png",
          },
          {
            name: "Kemeja Kerja",
            tag: "Oxford, bordir lengan opsional",
            color: "#324382",
            image: "/products/kk-006/KK-006-front-nobg.webp",
          },
        ],
        pill: "Min. 8 pcs, bordir 48 jam",
      },
    },
    {
      eyebrowIcon: "Gift",
      eyebrowText: "Promo Toko, Periode Terbatas",
      title: [
        { text: "Gajian Sale: Diskon hingga " },
        { text: "20%", highlight: true },
        { text: " Semua Polo dan Kemeja Kerja." },
      ],
      subhead:
        "Waktunya lengkapi seragam tim tanpa menunggu budget besar. Berlaku untuk semua warna dan ukuran ready stock, tetap bisa langsung bordir logo, dan selesai 2-4 hari.",
      ctas: [
        { kind: "link", variant: "primary", href: "/catalog", label: "Belanja Sekarang" },
        { kind: "link", variant: "secondary", href: "/catalog", label: "Lihat Semua Promo" },
      ],
      chips: [
        { icon: "Boxes", label: "Semua Ukuran Ready" },
        { icon: "Scissors", label: "Tetap Bisa Bordir Logo" },
        { icon: "Clock", label: "Selesai 2-4 Hari" },
      ],
      panel: {
        type: "promo",
        label: "Gajian Sale",
        off: "20% OFF",
        sub: "Polo staff dan kemeja kerja pilihan, selama periode promo atau selama stok tersedia.",
        code: "GAJIANOFISSIO",
        validity: "Berlaku 25 Agu-5 Sep 2026, S&K berlaku",
      },
    },
    {
      eyebrowIcon: "Sparkles",
      eyebrowText: "Baru di Ofissio Store",
      title: [
        { text: "Koleksi Baru: Kemeja Lapangan Tahan Cuaca, " },
        { text: "Ready Stock Semua Ukuran.", highlight: true },
      ],
      subhead:
        "Dirancang untuk tim yang bekerja di luar ruangan: bahan tahan cuaca, jahitan kuat, dan tetap siap bordir logo. Tersedia S-3XL, langsung kirim dari gudang kami.",
      ctas: [
        { kind: "link", variant: "primary", href: "/catalog", label: "Lihat Koleksi" },
        { kind: "ofistant", variant: "secondary", label: "Ofistant" },
      ],
      chips: [
        { icon: "Boxes", label: "S-3XL Ready" },
        { icon: "Shield", label: "Tahan Cuaca dan Abrasi" },
        { icon: "Scissors", label: "Siap Bordir Logo" },
      ],
      panel: {
        type: "product",
        icon: "Shirt",
        glb: "/3d/kk-006-mini.glb",
        name: "Kemeja Lapangan Ofissio",
        subtitle: "Ripstop tahan cuaca, bordir dada dan lengan",
        features: [
          "Ready stock, langsung dari gudang",
          "Bordir logo selesai 2-4 hari",
          "Reorder mudah saat tim bertambah",
        ],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export type SectionKey =
  | "hero"
  | "trust"
  | "bisnis_naik_kelas"
  | "industri"
  | "korporasi"
  | "bordir"
  | "cara_order"
  | "cta"
  | "paket"
  | "produk_pilihan"
  | "testimoni";

export const SITE_CONTENT_SECTION_KEYS: readonly SectionKey[] = [
  "hero",
  "trust",
  "bisnis_naik_kelas",
  "industri",
  "korporasi",
  "bordir",
  "cara_order",
  "cta",
  "paket",
  "produk_pilihan",
  "testimoni",
];

export interface SectionEntry {
  key: SectionKey;
  /** Indonesian label shown in the admin section list. */
  label: string;
  /** Short description of what this section covers. */
  description: string;
  schema: z.ZodTypeAny;
  default: unknown;
  fields: FieldDescriptor[];
}

const benefitItemFields: FieldDescriptor[] = [
  { kind: "icon", key: "icon", label: "Ikon" },
  { kind: "text", key: "title", label: "Judul", placeholder: "cth: Lebih Profesional", maxLength: 60 },
  { kind: "textarea", key: "desc", label: "Deskripsi", rows: 3, maxLength: 280 },
];

/** Constrained option sets for `enum` fields (the value is data, the allowed
 *  values are code-owned — same pattern as the icon allowlist). */
const DOT_OPTIONS: { value: string; label: string }[] = [
  { value: "ochre", label: "Ochre" },
  { value: "brand", label: "Brand" },
];
const INDUSTRY_OPTIONS: { value: string; label: string }[] = INDUSTRIES.map((i) => ({
  value: i,
  label: i,
}));
const CTA_VARIANT_OPTIONS: { value: string; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
];
const TESTIMONI_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "tokopedia", label: "Tokopedia" },
  { value: "shopee", label: "Shopee" },
  { value: "wa", label: "WhatsApp" },
  { value: "website", label: "Situs Ofissio" },
];
const TESTIMONI_RATING_OPTIONS: { value: string; label: string }[] = [
  { value: "5", label: "5 bintang" },
  { value: "4", label: "4 bintang" },
  { value: "3", label: "3 bintang" },
  { value: "2", label: "2 bintang" },
  { value: "1", label: "1 bintang" },
];

export const SECTION_REGISTRY: SectionEntry[] = [
  {
    key: "hero",
    label: "Hero (Carousel)",
    description: "Slide hero yang berputar: eyebrow, judul, subheadline, tombol (CTA), trust chips, dan panel kanan (paket / produk / promo).",
    schema: heroSectionSchema,
    default: DEFAULT_HERO,
    fields: [
      {
        kind: "video",
        key: "videoSrc",
        label: "Video latar Hero",
        scope: "hero",
        placeholder: "/hero-workers.mp4",
        maxLength: 500,
        help: "Unggah MP4/WebM. Video baru aktif setelah Section Hero disimpan.",
      },
      {
        kind: "list",
        key: "slides",
        label: "Slide",
        itemLabel: "slide",
        min: 1,
        max: 6,
        itemFields: [
          { kind: "icon", key: "eyebrowIcon", label: "Ikon eyebrow" },
          { kind: "text", key: "eyebrowText", label: "Teks eyebrow", placeholder: "cth: Ready Stock, Siap Bordir Logo, B2B", maxLength: 80 },
          {
            kind: "segments",
            key: "title",
            label: "Judul",
            max: 8,
            help: "Tandai potongan yang ingin ditebalkan dengan warna ochre.",
          },
          { kind: "textarea", key: "subhead", label: "Subheadline", rows: 3, maxLength: 400 },
          {
            kind: "list",
            key: "chips",
            label: "Trust chips",
            itemLabel: "chip",
            min: 1,
            max: 6,
            itemFields: [
              { kind: "icon", key: "icon", label: "Ikon" },
              { kind: "text", key: "label", label: "Label", maxLength: 60 },
            ],
          },
          {
            kind: "list",
            key: "ctas",
            label: "Tombol (CTA)",
            itemLabel: "tombol",
            min: 1,
            max: 4,
            itemDiscriminator: "kind",
            itemVariants: {
              link: [
                { kind: "enum", key: "variant", label: "Gaya", options: CTA_VARIANT_OPTIONS },
                { kind: "text", key: "label", label: "Label tombol", maxLength: 60 },
                { kind: "text", key: "href", label: "Link tujuan", placeholder: "cth: /catalog", maxLength: 200 },
              ],
              ofistant: [
                { kind: "enum", key: "variant", label: "Gaya", options: CTA_VARIANT_OPTIONS },
                { kind: "text", key: "label", label: "Label tombol", maxLength: 60 },
              ],
            },
          },
          {
            kind: "discriminated",
            key: "panel",
            label: "Panel kanan",
            discriminator: "type",
            variants: {
              package: [
                { kind: "icon", key: "badge", label: "Ikon badge" },
                { kind: "text", key: "title", label: "Judul paket", maxLength: 60 },
                { kind: "text", key: "meta", label: "Meta", maxLength: 120 },
                { kind: "text", key: "pill", label: "Teks pill", placeholder: "cth: Min. 8 pcs, bordir 48 jam", maxLength: 40 },
                {
                  kind: "list",
                  key: "items",
                  label: "Item contoh",
                  itemLabel: "item",
                  min: 1,
                  max: 6,
                  itemFields: [
                    { kind: "text", key: "name", label: "Nama", maxLength: 60 },
                    { kind: "text", key: "tag", label: "Tag", maxLength: 120 },
                    {
                      kind: "image",
                      key: "image",
                      label: "Foto produk",
                      maxLength: 500,
                      placeholder: "Unggah JPG, PNG, atau WebP",
                      help: "Gunakan foto produk dengan latar transparan agar tampil paling jelas di hero. Foto diunggah ke WordPress Media dan tersimpan saat Section Hero disimpan.",
                    },
                    { kind: "text", key: "color", label: "Warna (hex)", placeholder: "cth: #142766", maxLength: 20 },
                  ],
                },
              ],
              product: [
                { kind: "icon", key: "icon", label: "Ikon motif (latar)" },
                {
                  kind: "model3d",
                  key: "glb",
                  label: "Model 3D",
                  placeholder: "Unggah file .glb atau masukkan path lama",
                  maxLength: 500,
                  help: "Unggah GLB ke Supabase Storage. URL terisi otomatis dan baru tampil di homepage setelah Section Hero disimpan. Kosongkan untuk memakai ikon motif saja.",
                },
                { kind: "text", key: "name", label: "Nama produk", maxLength: 60 },
                { kind: "text", key: "subtitle", label: "Subtitle", maxLength: 120 },
                {
                  kind: "stringList",
                  key: "features",
                  label: "Fitur",
                  itemLabel: "fitur",
                  min: 1,
                  max: 6,
                  maxLength: 120,
                },
              ],
              promo: [
                { kind: "text", key: "label", label: "Label promo", maxLength: 60 },
                { kind: "text", key: "off", label: "Diskon", placeholder: "cth: 20% OFF", maxLength: 20 },
                { kind: "textarea", key: "sub", label: "Deskripsi", rows: 2, maxLength: 300 },
                { kind: "text", key: "code", label: "Kode promo", maxLength: 40 },
                { kind: "text", key: "validity", label: "Masa berlaku", maxLength: 120 },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    key: "trust",
    label: "Pita Kepercayaan (4 statistik)",
    description: "Empat statistik singkat di bawah hero: MOQ, lead time, logo/bulan, jumlah klien.",
    schema: trustSectionSchema,
    default: DEFAULT_TRUST,
    fields: [
      {
        kind: "list",
        key: "items",
        label: "Statistik",
        itemLabel: "statistik",
        min: 1,
        max: 8,
        itemFields: [
          { kind: "icon", key: "icon", label: "Ikon" },
          { kind: "text", key: "value", label: "Angka / Nilai", placeholder: "cth: 8 pcs", maxLength: 40 },
          { kind: "text", key: "label", label: "Keterangan", placeholder: "cth: Mulai dari jumlah kecil", maxLength: 80 },
        ],
      },
    ],
  },
  {
    key: "bisnis_naik_kelas",
    label: "§01 Bisnis Naik Kelas (kartu)",
    description: "Empat kartu keunggulan di bagian Bisnis Naik Kelas.",
    schema: bisnisNaikKelasSectionSchema,
    default: DEFAULT_BISNIS_NAIK_KELAS,
    fields: [
      {
        kind: "list",
        key: "items",
        label: "Kartu Keunggulan",
        itemLabel: "kartu",
        min: 1,
        max: 8,
        itemFields: benefitItemFields,
      },
    ],
  },
  {
    key: "industri",
    label: "§02 Cocok untuk Berbagai Usaha",
    description: "Eyebrow, judul, paragraf, dan grup industri (Bisnis Naik Kelas / Solusi Korporasi). Tiap tile merutekan ke katalog via nilai Industri kanonik.",
    schema: industriSectionSchema,
    default: DEFAULT_INDUSTRI,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Cocok untuk Berbagai Usaha", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      {
        kind: "industryInspiration",
        key: "inspiration",
        label: "Halaman Inspirasi Bisnis dan Korporasi",
        help: "Pilih halaman untuk mengganti gambar, teks manfaat, dan posisi pin. Perubahan hanya berlaku untuk halaman yang dipilih. Simpan perubahan setelah selesai.",
      },
      {
        kind: "list",
        key: "groups",
        label: "Grup Industri",
        itemLabel: "grup",
        min: 1,
        max: 4,
        collapsible: true,
        titleKey: "label",
        itemFields: [
          { kind: "text", key: "label", label: "Nama grup", maxLength: 60 },
          { kind: "text", key: "meta", label: "Meta info", maxLength: 80 },
          { kind: "enum", key: "dot", label: "Warna titik", options: DOT_OPTIONS },
          {
            kind: "list",
            key: "tiles",
            label: "Tile Industri",
            itemLabel: "tile",
            min: 1,
            max: 16,
            collapsible: true,
            titleKey: "label",
            itemFields: [
              { kind: "text", key: "label", label: "Label tile", maxLength: 60 },
              { kind: "icon", key: "icon", label: "Ikon" },
              { kind: "enum", key: "industry", label: "Industri (routing katalog)", options: INDUSTRY_OPTIONS, help: "Menentukan filter ?industri= di halaman katalog." },
              { kind: "image", key: "photo", label: "Foto tile", maxLength: 200, placeholder: "cth: /industries/bengkel-model.jpg", help: "Unggah foto baru (JPG/PNG/WebP, maks 10 MB) untuk mengganti gambar kartu. Empat tile berfoto teratas per grup tampil sebagai kartu utama; sisanya (termasuk yang berfoto) masuk ke balik tombol “Lihat semua”. Urutan diatur lewat tombol naik/turun." },
              { kind: "text", key: "caption", label: "Keterangan kartu", maxLength: 160, placeholder: "cth: Polo kerja dan kemeja tahan noda, siap bordir logo.", help: "Satu baris keterangan produk yang tampil di bawah judul kartu." },
              { kind: "boolean", key: "hidden", label: "Status tampil", toggleLabel: "Sembunyikan dari homepage", help: "Tile tidak dirender di homepage sampai dicentang ulang; datanya tetap tersimpan." },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "korporasi",
    label: "§06 Solusi Korporasi (kartu)",
    description: "Empat kartu fitur korporasi di band navy.",
    schema: korporasiSectionSchema,
    default: DEFAULT_KORPORASI,
    fields: [
      {
        kind: "list",
        key: "items",
        label: "Kartu Fitur",
        itemLabel: "kartu",
        min: 1,
        max: 8,
        itemFields: benefitItemFields,
      },
    ],
  },
  {
    key: "bordir",
    label: "§04 Bordir dan Kustomisasi",
    description: "Eyebrow, judul, paragraf, path video, dan empat kartu kapabilitas produksi di band navy.",
    schema: bordirSectionSchema,
    default: DEFAULT_BORDIR,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Bordir dan Kustomisasi", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      {
        kind: "video",
        key: "mediaSrc",
        label: "Video Section 04",
        scope: "bordir",
        placeholder: "/KK-006.mp4",
        maxLength: 500,
        help: "Unggah MP4/WebM. Video baru aktif setelah Section 04 disimpan.",
      },
      {
        kind: "list",
        key: "capabilities",
        label: "Kartu Kapabilitas",
        itemLabel: "kartu",
        min: 1,
        max: 6,
        itemFields: [
          { kind: "text", key: "title", label: "Judul", maxLength: 60 },
          { kind: "textarea", key: "desc", label: "Deskripsi", rows: 2, maxLength: 200 },
        ],
      },
    ],
  },
  {
    key: "cara_order",
    label: "§05 Cara Order Mudah",
    description: "Eyebrow, judul, paragraf, dan langkah pemesanan. Nomor urut dihasilkan otomatis.",
    schema: caraOrderSectionSchema,
    default: DEFAULT_CARA_ORDER,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Cara Order Mudah", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      {
        kind: "list",
        key: "steps",
        label: "Langkah",
        itemLabel: "langkah",
        min: 1,
        max: 8,
        itemFields: [
          { kind: "text", key: "title", label: "Judul", maxLength: 60 },
          { kind: "textarea", key: "desc", label: "Deskripsi", rows: 2, maxLength: 200 },
          { kind: "icon", key: "icon", label: "Ikon" },
        ],
      },
    ],
  },
  {
    key: "cta",
    label: "Penutup (CTA)",
    description: "Eyebrow, judul penutup, paragraf, label tombol Ofistant, dan link WhatsApp.",
    schema: ctaSectionSchema,
    default: DEFAULT_CTA,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Mulai Proyek Seragam", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      { kind: "text", key: "ofistantLabel", label: "Label tombol Ofistant", maxLength: 60 },
      { kind: "text", key: "whatsappHref", label: "Link WhatsApp", placeholder: "cth: https://wa.me/62…", maxLength: 200 },
      { kind: "text", key: "whatsappLabel", label: "Label tombol WhatsApp", maxLength: 60 },
      {
        kind: "textarea",
        key: "chatUserLine",
        label: "Chat: contoh pesan Anda",
        rows: 2,
        maxLength: 280,
        help: "Gelembung pertama pada kartu penutup: contoh pesan pembuka dari calon pembeli.",
      },
      {
        kind: "textarea",
        key: "chatOfistantLine",
        label: "Chat: contoh balasan Ofistant",
        rows: 3,
        maxLength: 400,
        help: "Gelembung kedua pada kartu penutup: contoh balasan singkat Ofistant.",
      },
    ],
  },
  {
    key: "paket",
    label: "§03 Rencana Paket Seragam",
    description: "Eyebrow, judul, paragraf, label detail, dan daftar rencana paket (ikon, nama, gambar, isi, target, opsi logo, link inspirasi, badge skala).",
    schema: paketSectionSchema,
    default: DEFAULT_PAKET,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Rencana Paket Seragam", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      { kind: "boolean", key: "hidden", label: "Status tampil", toggleLabel: "Sembunyikan dari homepage", help: "Section tidak dirender di homepage sampai toggle ini dimatikan; seluruh data paket tetap tersimpan." },
      { kind: "text", key: "isiLabel", label: "Label 'Isi'", maxLength: 40 },
      { kind: "text", key: "cocokUntukLabel", label: "Label 'Cocok untuk'", maxLength: 40 },
      { kind: "text", key: "opsiLogoLabel", label: "Label 'Logo'", maxLength: 40 },
      { kind: "text", key: "ctaLabel", label: "Teks link per kartu", maxLength: 40 },
      { kind: "text", key: "scaleBadgeLabel", label: "Teks badge skala besar", maxLength: 40 },
      {
        kind: "list",
        key: "items",
        label: "Paket",
        itemLabel: "paket",
        min: 1,
        max: 8,
        itemFields: [
          { kind: "icon", key: "icon", label: "Ikon" },
          { kind: "text", key: "name", label: "Nama paket", placeholder: "cth: Paket Bengkel", maxLength: 60 },
          { kind: "image", key: "photo", label: "Gambar paket", placeholder: "cth: /packages/paket-bengkel.png", maxLength: 500, help: "Unggah visual produk untuk panel besar di sisi kanan." },
          { kind: "text", key: "items", label: "Isi paket", maxLength: 200 },
          { kind: "text", key: "cocokUntuk", label: "Cocok untuk", maxLength: 200 },
          { kind: "text", key: "opsiLogo", label: "Opsi logo", maxLength: 200 },
          { kind: "text", key: "href", label: "Link katalog", placeholder: "cth: /catalog?industri=Bengkel", maxLength: 200 },
          { kind: "boolean", key: "scale", label: "Skala besar", toggleLabel: "Tampilkan badge" },
        ],
      },
    ],
  },
  {
    key: "produk_pilihan",
    label: "§07 Produk Pilihan (katalog)",
    description: "Eyebrow, judul, paragraf, label 'Lihat', dan daftar kategori produk (judul, deskripsi, tag, link, model 3D, ikon).",
    schema: produkPilihanSectionSchema,
    default: DEFAULT_PRODUK_PILIHAN,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Produk Pilihan", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      { kind: "text", key: "lihatLabel", label: "Teks link 'Lihat'", maxLength: 40 },
      {
        kind: "list",
        key: "items",
        label: "Kategori",
        itemLabel: "kategori",
        min: 1,
        max: 8,
        itemFields: [
          { kind: "text", key: "title", label: "Judul", maxLength: 60 },
          { kind: "textarea", key: "desc", label: "Deskripsi", rows: 2, maxLength: 200 },
          { kind: "text", key: "tag", label: "Tag", maxLength: 60 },
          { kind: "text", key: "href", label: "Link katalog", placeholder: "cth: /catalog?category=kemeja", maxLength: 200 },
          { kind: "model3d", key: "glb", label: "Model 3D (opsional)", target: "produk", placeholder: "Unggah file .glb atau masukkan path lama (cth: /3d/kk-006-mini.glb)", maxLength: 500, help: "Unggah GLB ke Supabase Storage. URL terisi otomatis dan baru tampil di homepage setelah Section ini disimpan. Kosongkan untuk memakai ikon." },
          { kind: "icon", key: "icon", label: "Ikon (fallback)", help: "Hanya tampil bila path 3D di atas kosong." },
        ],
      },
    ],
  },
  {
    key: "testimoni",
    label: "§08 Testimoni Pembeli",
    description: "Eyebrow, judul, paragraf, badge rating agregat marketplace, tautan toko, dan kartu ulasan (kutipan, nama, asal, bintang, tanggal, produk, screenshot dan link ulasan opsional). Section baru muncul di homepage setelah minimal satu kartu ulasan ditambahkan.",
    schema: testimoniSectionSchema,
    default: DEFAULT_TESTIMONI,
    fields: [
      { kind: "text", key: "eyebrow", label: "Eyebrow", placeholder: "cth: Testimoni Pembeli", maxLength: 60 },
      {
        kind: "segments",
        key: "headline",
        label: "Judul (atas)",
        max: 6,
        help: "Tandai potongan yang ingin ditebalkan dengan warna aksen.",
      },
      { kind: "textarea", key: "lede", label: "Paragraf pengantar", rows: 3, maxLength: 400 },
      { kind: "text", key: "storeLinkLabel", label: "Label tautan toko", maxLength: 60 },
      { kind: "text", key: "storeLinkHref", label: "Link toko marketplace", placeholder: "cth: https://tokopedia.link/…", maxLength: 200, help: "Kosongkan untuk menyembunyikan tautan toko dari homepage." },
      {
        kind: "list",
        key: "proof",
        label: "Badge Rating Agregat",
        itemLabel: "badge",
        max: 4,
        itemFields: [
          { kind: "enum", key: "source", label: "Marketplace", options: TESTIMONI_SOURCE_OPTIONS },
          { kind: "text", key: "score", label: "Skor", placeholder: "cth: 4.9", maxLength: 20 },
          { kind: "text", key: "count", label: "Jumlah ulasan", placeholder: "cth: 1.2rb ulasan", maxLength: 40 },
        ],
      },
      {
        kind: "list",
        key: "items",
        label: "Kartu Ulasan",
        itemLabel: "ulasan",
        collapsible: true,
        titleKey: "name",
        max: 12,
        itemFields: [
          { kind: "textarea", key: "quote", label: "Kutipan (verbatim)", rows: 3, maxLength: 300, help: "Salin isi ulasan apa adanya; boleh dipangkas, jangan diubah maknanya." },
          { kind: "text", key: "name", label: "Nama / username", placeholder: "cth: budi_s***", maxLength: 60, help: "Samakan nama pembeli (cth: budi_s***); identitas penuh cukup terlihat di screenshot." },
          { kind: "enum", key: "source", label: "Asal ulasan", options: TESTIMONI_SOURCE_OPTIONS },
          { kind: "enum", key: "rating", label: "Bintang", options: TESTIMONI_RATING_OPTIONS },
          { kind: "text", key: "date", label: "Tanggal", placeholder: "cth: Agu 2026", maxLength: 24 },
          { kind: "text", key: "product", label: "Produk (opsional)", placeholder: "cth: Polo Kerja", maxLength: 40, help: "Kosongkan untuk kartu tanpa chip produk." },
          { kind: "image", key: "screenshot", label: "Screenshot ulasan (opsional)", maxLength: 500, placeholder: "Unggah potongan screenshot ulasan", help: "Crop seragam: bintang, nama, dan isi ulasan saja, tanpa status bar HP atau data pribadi lain. Kartu dengan screenshot mendapat tombol pratinjau 'Screenshot'." },
          { kind: "text", key: "link", label: "Link ulasan (opsional)", placeholder: "cth: https://www.tokopedia.com/nama-toko/produk", maxLength: 500, help: "Tempel URL halaman ulasan asli (biasanya tab ulasan di halaman produk). Kartu dengan link mendapat tombol 'Lihat ulasan asli' yang membuka tab baru." },
          { kind: "boolean", key: "hidden", label: "Status tampil", toggleLabel: "Sembunyikan dari homepage", help: "Kartu tidak dirender sampai dicentang ulang; datanya tetap tersimpan." },
        ],
      },
    ],
  },
];

const REGISTRY_BY_KEY: Record<SectionKey, SectionEntry> = Object.fromEntries(
  SECTION_REGISTRY.map((entry) => [entry.key, entry]),
) as Record<SectionKey, SectionEntry>;

export function getSectionEntry(key: string): SectionEntry | null {
  return (REGISTRY_BY_KEY as Record<string, SectionEntry | undefined>)[key] ?? null;
}

export function isSiteContentSection(key: string): key is SectionKey {
  return key in REGISTRY_BY_KEY;
}

// ---------------------------------------------------------------------------
// Public content shape (what HomePage consumes)
// ---------------------------------------------------------------------------

export interface PublicSiteContent {
  hero: HeroSectionData;
  trust: TrustSectionData;
  bisnis_naik_kelas: BisnisNaikKelasSectionData;
  industri: IndustriSectionData;
  korporasi: KorporasiSectionData;
  bordir: BordirSectionData;
  cara_order: CaraOrderSectionData;
  cta: CtaSectionData;
  paket: PaketSectionData;
  produk_pilihan: ProdukPilihanSectionData;
  testimoni: TestimoniSectionData;
}
