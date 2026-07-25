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
}

export const INDUSTRY_META: IndustryMeta[] = [
  {
    name: "Pertambangan",
    tagline: "Seragam tahan abrasi & lapangan berat",
    icon: "Pickaxe",
    accent: "amber",
  },
  {
    name: "Konstruksi",
    tagline: "Wearpack & rompi safety tahan gores",
    icon: "HardHat",
    accent: "orange",
  },
  {
    name: "Manufaktur",
    tagline: "Seragam produksi nyaman & aman",
    icon: "Factory",
    accent: "slate",
  },
  {
    name: "Perhotelan",
    tagline: "Seragam rapi berstandar perhotelan",
    icon: "Building2",
    accent: "rose",
  },
  {
    name: "Kesehatan",
    tagline: "Seragam medis higienis & ringan",
    icon: "Stethoscope",
    accent: "sky",
  },
  {
    name: "F&B",
    tagline: "Seragam dapur & layanan profesional",
    icon: "UtensilsCrossed",
    accent: "lime",
  },
  {
    name: "Security",
    tagline: "Seragam siaga & tahan cuaca",
    icon: "ShieldCheck",
    accent: "indigo",
  },
  {
    name: "Corporate",
    tagline: "Kemeja & polo identitas perusahaan",
    icon: "Briefcase",
    accent: "blue",
  },
];

export function findIndustryMeta(name: Industry): IndustryMeta | undefined {
  return INDUSTRY_META.find((m) => m.name === name);
}
