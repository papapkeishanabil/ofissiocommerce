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
      kind: "list";
      key: string;
      label: string;
      /** noun for one row, e.g. "kartu" — used in the "Tambah …" button */
      itemLabel: string;
      itemFields: FieldDescriptor[];
      min?: number;
      max?: number;
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
    { icon: "RotateCcw", value: "2–4 hari", label: "Selesai bordir · siap kirim" },
    { icon: "Tag", value: "12.000+", label: "Logo dibordir / bulan" },
    { icon: "Building2", value: "340+", label: "Usaha & perusahaan klien" },
  ],
};

export const DEFAULT_BISNIS_NAIK_KELAS: BisnisNaikKelasSectionData = {
  items: [
    { icon: "Sparkles", title: "Lebih Profesional", desc: "Tim tampil profesional dan konsisten di mata pelanggan sejak hari pertama bekerja." },
    { icon: "ShieldCheck", title: "Lebih Dipercaya", desc: "Identitas yang rapi membangun kepercayaan pelanggan dan mitra bisnis terhadap brand Anda." },
    { icon: "Tag", title: "Logo Makin Dikenal", desc: "Logo bisnis Anda makin melekat lewat bordir rapi di dada setiap anggota tim." },
    { icon: "Layers", title: "Tim Lebih Kompak", desc: "Seragam membuat tim terlihat kompak, rapi, dan solid — di setiap titik layanan pelanggan." },
  ],
};

export const DEFAULT_KORPORASI: KorporasiSectionData = {
  items: [
    { icon: "FileText", title: "Quotation Formal", desc: "Penawaran terstruktur untuk procurement & approval internal." },
    { icon: "Tag", title: "Custom Logo Multi-Divisi", desc: "Bordir khusus per divisi, posisi, dan jabatan." },
    { icon: "Truck", title: "Tracking Order", desc: "Pantau produksi & pengiriman tiap batch secara real-time." },
    { icon: "Layers", title: "Pengadaan Skala Besar", desc: "Dari 20 hingga 5.000+ pcs per pemesanan, 34 provinsi." },
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export type SectionKey = "trust" | "bisnis_naik_kelas" | "korporasi";

export const SITE_CONTENT_SECTION_KEYS: readonly SectionKey[] = [
  "trust",
  "bisnis_naik_kelas",
  "korporasi",
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

export const SECTION_REGISTRY: SectionEntry[] = [
  {
    key: "trust",
    label: "Pita Kepercayaan (4 statistik)",
    description: "Empat statistik singkat di bawah hero — MOQ, lead time, logo/bulan, jumlah klien.",
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
  trust: TrustSectionData;
  bisnis_naik_kelas: BisnisNaikKelasSectionData;
  korporasi: KorporasiSectionData;
}
