// src/components/ofistant/IndustryQuickPicker.tsx
// Prominent industry quick picker shown in Ofistant on first welcome.
// Replaces the generic text chips with branded cards (icon + name + tagline)
// so the conversational entry point to filtering feels intentional, not
// secondary to a top nav.

import { INDUSTRY_META } from "@/data/industries";

interface IndustryQuickPickerProps {
  onPick: (industry: string) => void;
}

export function IndustryQuickPicker({ onPick }: IndustryQuickPickerProps) {
  return (
    <div className="mt-1">
      <p className="type-eyebrow mb-2 px-1 text-ink-subtle">
        Pilih industri
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {INDUSTRY_META.map((m, i) => (
          <button
            key={m.name}
            type="button"
            onClick={() => onPick(m.name)}
            className="group flex flex-col items-start gap-0.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-soft-sm"
          >
            <div className="flex w-full items-center justify-between">
              <span className="type-display text-base font-bold leading-none text-brand-700 transition-colors group-hover:text-brand-700">
                {m.name.charAt(0)}
              </span>
              <span className="type-mono-label text-[9px] text-ink-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[11px] font-semibold leading-tight text-ink">
              {m.name}
            </span>
            <span className="line-clamp-1 text-[9px] leading-tight text-ink-muted">
              {m.tagline}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
