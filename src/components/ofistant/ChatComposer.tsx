"use client";

import {
  forwardRef,
  useImperativeHandle,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Send } from "lucide-react";

import styles from "./OfistantChat.module.css";

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
  onSubmit: (text: string) => void | Promise<boolean | void>;
}

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer({ disabled, onSubmit }, ref) {
    const [value, setValue] = useState("");
    const [sending, setSending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();

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

    async function handle(e: FormEvent) {
      e.preventDefault();
      const t = value.trim();
      if (!t || disabled || sending) return;
      setSending(true);
      try { if (await onSubmit(t) !== false) setValue(""); }
      finally { setSending(false); }
    }

    return (
        <form
          onSubmit={handle}
          className={styles.composer}
        >
          <label htmlFor={inputId} className="sr-only">Ketik pesan ke Ofistant</label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Tulis pertanyaan Anda…"
            disabled={disabled || sending}
            maxLength={300}
            className={styles.input}
          />

          <button
            type="submit"
            disabled={disabled || sending || !value.trim()}
            aria-label="Kirim pesan"
            className={styles.send}
          >
            <Send size={19} aria-hidden="true" />
          </button>
        </form>
    );
  },
);
