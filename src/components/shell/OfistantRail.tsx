"use client";

import { Headset, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChromeOpen, useChromeStore } from "@/stores/chrome-store";
import { OfistantPanel } from "./OfistantPanel";

export function OfistantRail() {
  const open = useChromeOpen();
  const pinned = useChromeStore((s) => s.pinned);
  const locked = useChromeStore((s) => s.locked);
  const railEnter = useChromeStore((s) => s.railEnter);
  const railLeave = useChromeStore((s) => s.railLeave);
  const togglePin = useChromeStore((s) => s.togglePin);

  return (
    <div
      onMouseEnter={railEnter}
      onMouseLeave={railLeave}
      className="group relative z-40 hidden h-dvh shrink-0 lg:block"
    >
      {/* Push drawer: width transitions 0 ↔ 400 */}
      <div className={cn("h-dvh overflow-hidden transition-[width] duration-200 ease-out", open ? "w-[400px]" : "w-0")}>
        <div className="h-full w-[400px]">
          <OfistantPanel />
        </div>
      </div>

      {!locked && (
        <button
          type="button"
          data-testid="ofistant-handle"
          onClick={togglePin}
          aria-label={pinned ? "Lepas panel Ofistant" : "Pin panel Ofistant"}
          aria-expanded={open}
          className="absolute left-full top-1/2 grid h-24 w-7 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-white/10 bg-[#0d1525] text-sky-300 shadow-soft-md transition-colors hover:bg-[#152138] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          {pinned ? <X className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
