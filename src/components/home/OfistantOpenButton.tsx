"use client";

import { OfistantMark } from "@/components/ofistant/OfistantMark";
import { useChromeStore } from "@/stores/chrome-store";

export function OfistantOpenButton({
  className,
  label = "Ofistant",
}: {
  className?: string;
  label?: string;
}) {
  const openChrome = useChromeStore((s) => s.openChrome);
  return (
    <button
      type="button"
      onClick={openChrome}
      className={className ?? "inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"}
    >
      <OfistantMark variant="rev" className="h-5 w-5" />
      {label}
    </button>
  );
}
