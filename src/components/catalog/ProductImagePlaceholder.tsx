// src/components/catalog/ProductImagePlaceholder.tsx
// Lightweight SVG/gradient placeholder for product images (Phase 1).
// Phase 2 swaps this with real WooCommerce images via next/image.

import type { Category } from "@/types/industry";

interface ProductImagePlaceholderProps {
  name: string;
  accentColor: string;
  category: Category;
  className?: string;
  /** show product initial + category label, otherwise just gradient */
  variant?: "card" | "detail";
}

const CATEGORY_ICON: Record<Category, string> = {
  "Kemeja Lapangan": "👕",
  Wearpack: "🦺",
  "Rompi Safety": "🧥",
  "Jaket Kerja": "🧥",
  "Polo Shirt": "👕",
  "Kemeja Kantor": "👔",
};

export function ProductImagePlaceholder({
  name,
  accentColor,
  category,
  className,
  variant = "card",
}: ProductImagePlaceholderProps) {
  return (
    <div
      className={
        "relative grid place-items-center overflow-hidden " + (className ?? "")
      }
      style={{
        background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}08 100%)`,
      }}
      aria-hidden
    >
      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${accentColor}40 1px, transparent 0)`,
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className={variant === "detail" ? "text-6xl" : "text-4xl"}>
          {CATEGORY_ICON[category] ?? "👕"}
        </span>
        {variant === "card" && (
          <span
            className="max-w-[80%] truncate text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: accentColor }}
          >
            {category}
          </span>
        )}
      </div>
    </div>
  );
}
