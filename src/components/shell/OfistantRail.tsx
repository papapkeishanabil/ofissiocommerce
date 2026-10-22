"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChromeStore, useRailOpen } from "@/stores/chrome-store";
import { OfistantMark } from "@/components/ofistant/OfistantMark";
import { OfistantPanel } from "./OfistantPanel";

export function OfistantRail() {
  // Panel tersembunyi di semua halaman. Handle logo di tepi kiri adalah satu
  // -satunya pemicunya: hover membuka sementara, klik meng-pin (klik lagi
  // untuk melepas). Bilah atas punya state terpisah dan tidak membuka panel.
  const open = useRailOpen();
  const pinned = useChromeStore((s) => s.railPinned);
  const railEnter = useChromeStore((s) => s.railEnter);
  const railLeave = useChromeStore((s) => s.railLeave);
  const toggleRailPin = useChromeStore((s) => s.toggleRailPin);

  return (
    <div
      onMouseEnter={railEnter}
      onMouseLeave={railLeave}
      className="group relative z-40 hidden h-dvh shrink-0 xl:block"
    >
      {/* Push drawer: width transitions 0 ↔ 400 */}
      <div inert={!open} aria-hidden={!open} className={cn("h-dvh overflow-hidden transition-[width] duration-200 ease-out", open ? "w-[clamp(320px,21vw,400px)]" : "w-0")}>
        <div className="h-full w-[clamp(320px,21vw,400px)]">
          <OfistantPanel onClose={() => useChromeStore.setState({ railPinned: false, railHovered: false })} />
        </div>
      </div>

      <button
        type="button"
        data-testid="ofistant-handle"
        onClick={toggleRailPin}
        aria-label={pinned ? "Lepas panel Ofistant" : "Buka panel Ofistant"}
        aria-expanded={open}
        title="Ofistant: arahkan pointer untuk membuka chat"
        className="absolute left-full top-1/2 grid h-24 w-7 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-white/10 bg-[#0d1525] text-sky-300 shadow-soft-md transition-colors hover:bg-[#152138] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        {pinned ? <X className="h-4 w-4" /> : <OfistantMark variant="rev" className="h-5 w-5" />}
      </button>
    </div>
  );
}
