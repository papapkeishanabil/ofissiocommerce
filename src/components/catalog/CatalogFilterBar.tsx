// src/components/catalog/CatalogFilterBar.tsx
// Baris filter horizontal: satu dropdown per dimensi (industri, jenis, warna).
// Memilih nilai mempertahankan dimensi lain — kombinasi berlaku sekaligus;
// memilih kembali "Semua …" melepas dimensi itu saja.

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw } from "lucide-react";

export interface FilterOption {
  slug: string;
  label: string;
  count: number;
}

interface CatalogFilterBarProps {
  industry?: string;
  category?: string;
  color?: string;
  industries: FilterOption[];
  categories: FilterOption[];
  colors: FilterOption[];
}

function buildCatalogHref(active: {
  industry?: string;
  category?: string;
  color?: string;
}) {
  const params = new URLSearchParams();
  if (active.industry) params.set("industri", active.industry);
  if (active.category) params.set("kategori", active.category);
  if (active.color) params.set("warna", active.color);
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export function CatalogFilterBar({
  industry,
  category,
  color,
  industries,
  categories,
  colors,
}: CatalogFilterBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(
    key: "industry" | "category" | "color",
    value: string,
  ) {
    const next = {
      industry,
      category,
      color,
      [key]: value || undefined,
    };
    startTransition(() => {
      router.push(buildCatalogHref(next));
    });
  }

  const selectClass =
    "h-10 w-full appearance-none rounded-xl border border-line bg-white px-3 pr-8 text-sm font-semibold text-ink transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60";

  return (
    <div
      className={`mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft-sm sm:p-5 lg:flex-row lg:items-end${pending ? " opacity-70" : ""}`}
      role="group"
      aria-label="Filter katalog"
    >
      <FilterSelect
        id="filter-industri"
        label="Industri"
        allLabel="Semua industri"
        value={industry ?? ""}
        options={industries}
        disabled={pending}
        onChange={(v) => apply("industry", v)}
        selectClass={selectClass}
      />
      <FilterSelect
        id="filter-jenis"
        label="Jenis produk"
        allLabel="Semua jenis"
        value={category ?? ""}
        options={categories}
        disabled={pending}
        onChange={(v) => apply("category", v)}
        selectClass={selectClass}
      />
      <FilterSelect
        id="filter-warna"
        label="Warna"
        allLabel="Semua warna"
        value={color ?? ""}
        options={colors}
        disabled={pending}
        onChange={(v) => apply("color", v)}
        selectClass={selectClass}
      />
      {(industry || category || color) && (
        <button
          type="button"
          onClick={() =>
            startTransition(() => {
              router.push("/catalog");
            })
          }
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-muted transition-colors hover:bg-cool-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  allLabel,
  value,
  options,
  disabled,
  onChange,
  selectClass,
}: {
  id: string;
  label: string;
  allLabel: string;
  value: string;
  options: FilterOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  selectClass: string;
}) {
  return (
    <div className="min-w-0 flex-1 lg:max-w-60">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-subtle"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
