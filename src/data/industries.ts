// src/data/industries.ts
// Metadata for Ofistant quick choices and home page tiles.

import type { Industry } from "@/types/industry";

export interface IndustryMeta {
  name: Industry;
  /** short tagline shown on the Ofistant quick choice */
  tagline: string;
  /** lucide-react icon name resolved in the component */
  icon: string;
  /** tailwind color token used for accent */
  accent: string;
  /** audience segment the homepage groups this industry under */
  segment?: "ukm" | "korporasi" | "semua";
}

export const INDUSTRY_META: IndustryMeta[] = [
  {
    name: "Pertambangan",
    tagline: "Seragam tahan abrasi & lapangan berat",
    icon: "Pickaxe",
    accent: "amber",
    segment: "korporasi",
  },
  {
    name: "Konstruksi",
    tagline: "Wearpack & rompi safety tahan gores",
    icon: "HardHat",
    accent: "orange",
    segment: "korporasi",
  },
  {
    name: "Manufaktur",
    tagline: "Seragam produksi nyaman & aman",
    icon: "Factory",
    accent: "slate",
    segment: "korporasi",
  },
  {
    name: "Perhotelan",
    tagline: "Seragam rapi berstandar perhotelan",
    icon: "Building2",
    accent: "rose",
    segment: "korporasi",
  },
  {
    name: "Kesehatan",
    tagline: "Seragam medis higienis & ringan",
    icon: "Stethoscope",
    accent: "sky",
    segment: "semua",
  },
  {
    name: "F&B",
    tagline: "Seragam dapur & layanan profesional",
    icon: "UtensilsCrossed",
    accent: "lime",
    segment: "semua",
  },
  {
    name: "Security",
    tagline: "Seragam siaga & tahan cuaca",
    icon: "ShieldCheck",
    accent: "indigo",
    segment: "semua",
  },
  {
    name: "Corporate",
    tagline: "Kemeja & polo identitas perusahaan",
    icon: "Briefcase",
    accent: "blue",
    segment: "korporasi",
  },
  // --- UKM-naik-kelas expansion ---
  {
    name: "Bengkel",
    tagline: "Polo & kemeja kerja tahan noda",
    icon: "Wrench",
    accent: "orange",
    segment: "ukm",
  },
  {
    name: "Retail",
    tagline: "Seragam staf toko & minimarket",
    icon: "Store",
    accent: "blue",
    segment: "semua",
  },
  {
    name: "Grosir",
    tagline: "Seragam pegawai toko grosir",
    icon: "Boxes",
    accent: "amber",
    segment: "ukm",
  },
  {
    name: "Laundry",
    tagline: "Polo & kemeja ringan, cepat kering",
    icon: "Droplets",
    accent: "sky",
    segment: "ukm",
  },
  {
    name: "Salon",
    tagline: "Apron & seragam barbershop/salon",
    icon: "Scissors",
    accent: "rose",
    segment: "ukm",
  },
  {
    name: "Bangunan",
    tagline: "Wearpack & rompi toko bangunan",
    icon: "Hammer",
    accent: "orange",
    segment: "ukm",
  },
  {
    name: "Sparepart",
    tagline: "Polo & kemeja staf toko sparepart",
    icon: "Package",
    accent: "slate",
    segment: "ukm",
  },
  {
    name: "Petshop",
    tagline: "Apron & polo staf pet shop",
    icon: "PawPrint",
    accent: "lime",
    segment: "ukm",
  },
  {
    name: "Ekspedisi",
    tagline: "Rompi & polo kurir/ekspedisi",
    icon: "Truck",
    accent: "indigo",
    segment: "ukm",
  },
  {
    name: "BUMN",
    tagline: "Seragam instansi & BUMN",
    icon: "Landmark",
    accent: "blue",
    segment: "korporasi",
  },
  {
    name: "Maritim",
    tagline: "Wearpack & jaket lapangan maritim",
    icon: "Anchor",
    accent: "sky",
    segment: "korporasi",
  },
  {
    name: "Pendidikan",
    tagline: "Seragam staf sekolah & kampus",
    icon: "GraduationCap",
    accent: "indigo",
    segment: "korporasi",
  },
];

export function findIndustryMeta(name: Industry): IndustryMeta | undefined {
  return INDUSTRY_META.find((m) => m.name === name);
}
