// src/components/ofistant/IndustryQuickPicker.tsx
// Prominent industry quick picker shown on first welcome. Branded cards that
// feel like curated AI starting points, not a generic grid.

import { ArrowUpRight } from "lucide-react";

import { INDUSTRY_META } from "@/data/industries";

interface IndustryQuickPickerProps {
  onPick: (industry: string) => void;
}

export function IndustryQuickPicker({ onPick }: IndustryQuickPickerProps) {
  return (
    <div className="mt-1.5 space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="type-eyebrow text-ink-subtle">Mulai dari industri</p>
        <span className="text-[9px] text-ink-subtle">{INDUSTRY_META.length} opsi</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {INDUSTRY_META.map((m, i) => (
          <button
            key={m.name}
            type="button"
            onClick={() => onPick(m.name)}
            className="group relative flex flex-col items-start gap-0.5 overflow-hidden rounded-xl border border-line bg-surface p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft-sm"
          >
            {/* gradient wash on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-700/0 to-brand-700/0 opacity-0 transition-opacity duration-200 group-hover:from-brand-700 group-hover:to-brand-900 group-hover:opacity-100"
            />
            <div className="relative flex w-full items-center justify-between">
              <span className="type-display text-lg font-extrabold leading-none text-brand-700 transition-colors group-hover:text-ochre-400">
                {m.name.charAt(0)}
              </span>
              <ArrowUpRight
                className="h-3 w-3 text-ink-subtle opacity-0 transition-all group-hover:text-white group-hover:opacity-100"
                strokeWidth={2.4}
              />
            </div>
            <span className="relative text-[11px] font-bold leading-tight text-ink transition-colors group-hover:text-white">
              {m.name}
            </span>
            <span className="relative line-clamp-1 text-[9px] leading-tight text-ink-muted transition-colors group-hover:text-brand-100">
              {m.tagline}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
