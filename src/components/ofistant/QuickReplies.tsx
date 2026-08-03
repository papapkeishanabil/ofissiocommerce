// src/components/ofistant/QuickReplies.tsx
// Suggestion chips that look like AI-suggested next actions, not generic
// buttons. Subtle fill + arrow affordance on hover.

interface QuickRepliesProps {
  options: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onPick, disabled }: QuickRepliesProps) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(opt)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition-all hover:border-brand-400 hover:bg-brand-100 disabled:opacity-50"
        >
          <span aria-hidden className="h-1 w-1 rounded-full bg-ochre-500 transition-transform group-hover:scale-125" />
          {opt}
        </button>
      ))}
    </div>
  );
}
