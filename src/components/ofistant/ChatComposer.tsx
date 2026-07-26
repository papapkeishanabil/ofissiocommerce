// src/components/ofistant/ChatComposer.tsx
// Prominent AI input with affordance that this is an AI assistant, not a
// generic text field. Sparkles prefix + gradient send button + capability hint.

"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

interface ChatComposerProps {
  disabled?: boolean;
  onSubmit: (text: string) => void;
}

export function ChatComposer({ disabled, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState("");

  function handle(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t || disabled) return;
    onSubmit(t);
    setValue("");
  }

  return (
    <div className="space-y-1.5">
      <form
        onSubmit={handle}
        className="group relative flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 shadow-soft-sm transition-all focus-within:border-brand-400 focus-within:shadow-soft-md"
      >
        {/* AI affordance icon */}
        <span
          aria-hidden
          className="ml-1 mb-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-soft-sm"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>

        <label htmlFor="ofistant-input" className="sr-only">
          Ketik pesan ke Ofistant
        </label>
        <input
          id="ofistant-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tanya apapun tentang seragam…"
          disabled={disabled}
          maxLength={300}
          className="min-w-0 flex-1 border-none bg-transparent px-1 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-subtle disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Kirim pesan"
          className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-soft-sm transition-all hover:bg-brand-800 active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </form>
      <p className="px-2 text-[9px] text-ink-subtle">
        Ofistant bisa menampilkan produk, membuka detail, menambah ke keranjang &amp; lainnya.
      </p>
    </div>
  );
}
