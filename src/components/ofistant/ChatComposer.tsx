"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowUp } from "lucide-react";

import { OfistantMark } from "./OfistantMark";

/**
 * Imperative handle the parent uses to pre-fill the input from outside
 * (e.g. when a capability chip is clicked). Seeds the value and focuses the
 * field with the caret at the end, so the user can complete & send.
 */
export interface ChatComposerHandle {
  seed: (text: string) => void;
}

interface ChatComposerProps {
  disabled?: boolean;
  onSubmit: (text: string) => void;
}

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer({ disabled, onSubmit }, ref) {
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        seed(text: string) {
          setValue(text);
          const el = inputRef.current;
          if (el) {
            el.focus();
            const len = text.length;
            el.setSelectionRange(len, len);
          }
        },
      }),
      [],
    );

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
          className="group relative flex items-center gap-2 rounded-2xl border border-line bg-cool-50 p-1.5 transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:shadow-soft-md"
        >
          <span aria-hidden className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-soft-xs">
            <OfistantMark variant="rev" className="h-5 w-5" />
          </span>

          <label htmlFor="ofistant-input" className="sr-only">Ketik pesan ke Ofistant</label>
          <input
            id="ofistant-input"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Tanya apapun tentang seragam…"
            disabled={disabled}
            maxLength={300}
            className="min-w-0 flex-1 border-none bg-transparent px-1 py-2 text-[15px] text-ink outline-none placeholder:text-ink-subtle disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Kirim pesan"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-soft-xs transition-all hover:bg-brand-800 active:scale-95 disabled:bg-cool-200 disabled:text-ink-subtle disabled:shadow-none"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </form>
        <p className="px-2 text-[10px] text-ink-subtle">
          Ofistant bisa menampilkan produk, membuka detail, menambah ke keranjang &amp; lainnya.
        </p>
      </div>
    );
  },
);
