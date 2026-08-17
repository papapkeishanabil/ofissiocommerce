"use client";

import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChromeOpen, useChromeStore } from "@/stores/chrome-store";
import { WorkspaceHeader } from "./WorkspaceHeader";

export function WorkspaceTopBar() {
  const open = useChromeOpen();
  const pinned = useChromeStore((s) => s.pinned);
  const locked = useChromeStore((s) => s.locked);
  const topEnter = useChromeStore((s) => s.topEnter);
  const topLeave = useChromeStore((s) => s.topLeave);
  const togglePin = useChromeStore((s) => s.togglePin);

  return (
    <div
      onMouseEnter={topEnter}
      onMouseLeave={topLeave}
      className={cn(
        "group fixed left-0 right-0 top-0 z-30 hidden shrink-0 transition-[transform,padding-left] duration-300 ease-out lg:block",
        // Saat chrome terbuka di xl+, geser konten bar melewati rail Ofistant
        // supaya menu tidak pernah tertutup panel — sejajar kolom konten.
        open && "xl:pl-[clamp(320px,21vw,400px)]",
      )}
      style={{ transform: open ? "translateY(0)" : "translateY(-100%)" }}
    >
      <div className="h-16">
        <WorkspaceHeader />
      </div>
      {!locked && (
        <button
          type="button"
          data-testid="topbar-handle"
          onClick={togglePin}
          aria-label={pinned ? "Sembunyikan bilah atas" : "Pin bilah atas"}
          aria-expanded={open}
          className="absolute left-1/2 top-full flex h-2 w-24 -translate-x-1/2 items-center justify-center rounded-b-md bg-brand-700/85 text-white shadow-soft-sm transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {pinned ? <X className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}
