// src/components/catalog/ProductImagePlaceholder.tsx
// Lightweight placeholder for product images (Phase 1).
// Phase 2 swaps this with real WooCommerce images via next/image.
// Uses typographic initials (editorial) instead of emoji for brand consistency.

import type { Category } from "@/types/industry";

interface ProductImagePlaceholderProps {
  name: string;
  accentColor: string;
  category: Category;
  className?: string;
  variant?: "card" | "detail";
}

const CATEGORY_INITIAL: Record<Category, string> = {
  "Kemeja Lapangan": "KL",
  Wearpack: "WP",
  "Rompi Safety": "RS",
  "Jaket Kerja": "JK",
  "Polo Shirt": "PS",
  "Kemeja Kantor": "KK",
};

export function ProductImagePlaceholder({
  name,
  accentColor,
  category,
  className,
  variant = "card",
}: ProductImagePlaceholderProps) {
  const initial = CATEGORY_INITIAL[category] ?? name.charAt(0).toUpperCase();
  return (
    <div
      className={
        "relative grid place-items-center overflow-hidden " + (className ?? "")
      }
      style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, ${shade(accentColor, -25)} 100%)`,
      }}
      aria-hidden
    >
      {/* texture */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* sheen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />

      <div className="relative flex flex-col items-center gap-3 text-white">
        <span
          className="type-display-tight leading-none"
          style={{
            fontSize: variant === "detail" ? "5rem" : "2.75rem",
            opacity: 0.95,
          }}
        >
          {initial}
        </span>
        {variant === "card" && (
          <span className="type-mono-label max-w-[80%] truncate text-white/80">
            {category}
          </span>
        )}
      </div>
    </div>
  );
}

/** Shade a hex color by percent (-100..100). */
function shade(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const amt = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}
