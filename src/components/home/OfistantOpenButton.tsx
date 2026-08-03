"use client";

import { Sparkles } from "lucide-react";
import { useChromeStore } from "@/stores/chrome-store";

export function OfistantOpenButton({ className }: { className?: string }) {
  const openChrome = useChromeStore((s) => s.openChrome);
  return (
    <button
      type="button"
      onClick={openChrome}
      className={className ?? "inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"}
    >
      <Sparkles className="h-4 w-4" />
      Ofistant
    </button>
  );
}
