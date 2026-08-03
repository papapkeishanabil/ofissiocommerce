// src/components/ofistant/IndustryQuickPicker.tsx
// Prominent industry quick picker shown on first welcome. Clean cards with a
// frosted "glass light" hover state (premium, modern). No giant letter gimmick.

import { INDUSTRY_META } from "@/data/industries";

interface IndustryQuickPickerProps {
  onPick: (industry: string) => void;
}

export function IndustryQuickPicker({ onPick }: IndustryQuickPickerProps) {
  return (
    <div className="mt-1.5 space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">Mulai dari industri</p>
        <span className="text-[9px] text-ink-subtle">{INDUSTRY_META.length} opsi</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {INDUSTRY_META.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => onPick(m.name)}
            className="group relative flex flex-col items-start gap-1 overflow-hidden rounded-xl border border-line bg-white p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-[13px] font-bold text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
              {m.name.charAt(0)}
            </span>
            <span className="text-[11px] font-bold leading-tight text-ink-strong">
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
