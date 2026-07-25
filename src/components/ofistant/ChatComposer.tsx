// src/components/ofistant/ChatComposer.tsx
"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/Button";

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
    <form onSubmit={handle} className="flex items-end gap-2">
      <label htmlFor="ofistant-input" className="sr-only">
        Ketik pesan ke Ofistant
      </label>
      <input
        id="ofistant-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ketik pesan…"
        disabled={disabled}
        maxLength={300}
        className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
      />
      <Button
        type="submit"
        size="icon"
        variant="primary"
        disabled={disabled || !value.trim()}
        aria-label="Kirim"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
