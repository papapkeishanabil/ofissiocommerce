// src/components/ofistant/QuickReplies.tsx
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
          className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
