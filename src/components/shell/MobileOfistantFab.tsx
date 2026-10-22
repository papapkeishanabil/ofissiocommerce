// src/components/shell/MobileOfistantFab.tsx
// Mobile-only Ofistant trigger: floating button + bottom sheet placeholder.

"use client";

import { useEffect, useState } from "react";

import { OfistantPanel } from "./OfistantPanel";
import { OfistantMark } from "@/components/ofistant/OfistantMark";

export function MobileOfistantFab() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Floating button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka Ofistant"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-transform hover:scale-105 active:scale-95 xl:hidden"
      >
        <OfistantMark variant="rev" className="h-8 w-8" />
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-emerald-500 px-1 text-[10px] font-bold text-white">
          AI
        </span>
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Ofistant chat"
        >
          <button
            type="button"
            aria-label="Tutup latar Ofistant"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />

          <div className="relative h-[85dvh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <OfistantPanel onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
