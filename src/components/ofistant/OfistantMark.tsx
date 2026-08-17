// src/components/ofistant/OfistantMark.tsx
// Mark Ofistant v3 — "Titik Terlepas": cincin diturunkan dari bowl huruf O,
// titik ochre dari tittle huruf i pada wordmark Onest ExtraBold.
// Proporsi terkunci: cincin : goresan : titik = 54 : 13 : 15.
// Warna di-hard-code per variant (bukan CSS var) — var() tidak resolve
// di presentation attribute SVG. Ukuran via className, idiom ikon lucide.

const RING_PATH = "M 46.1 23.1 A 27 27 0 1 0 74 42.6";

const VARIANTS = {
  /** Medan terang — cincin navy, titik ochre. */
  navy: { ring: "#10245F", dot: "#E8A92A" },
  /** Medan gelap (tile navy, FAB) — cincin putih, titik ochre. */
  rev: { ring: "#FFFFFF", dot: "#E8A92A" },
  /** Medan kempaan (ochre) — cincin navy, titik putih. */
  camp: { ring: "#10245F", dot: "#FFFFFF" },
  /** Satu tinta — stempel/faksimili. */
  mono: { ring: "#10245F", dot: "#10245F" },
} as const;

export type OfistantMarkVariant = keyof typeof VARIANTS;

export function OfistantMark({
  variant = "navy",
  className,
}: {
  variant?: OfistantMarkVariant;
  className?: string;
}) {
  const { ring, dot } = VARIANTS[variant];
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <path d={RING_PATH} fill="none" stroke={ring} strokeWidth={13} strokeLinecap="round" />
      <circle cx={63.5} cy={27.9} r={7.5} fill={dot} />
    </svg>
  );
}
