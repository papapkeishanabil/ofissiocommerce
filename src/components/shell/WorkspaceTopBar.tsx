"use client";

import { cn } from "@/lib/utils";
import { useRailOpen } from "@/stores/chrome-store";
import { WorkspaceHeader } from "./WorkspaceHeader";

export function WorkspaceTopBar() {
  const railOpen = useRailOpen();

  return (
    <div
      className={cn(
        "relative z-30 hidden shrink-0 transition-[padding-left] duration-300 ease-out lg:block",
        // Saat panel Ofistant terbuka di xl+, geser konten bar melewati rail
        // Ofistant supaya menu tidak pernah tertutup panel — sejajar kolom konten.
        railOpen && "xl:pl-[clamp(320px,21vw,400px)]",
      )}
    >
      <div className="h-14">
        <WorkspaceHeader />
      </div>
    </div>
  );
}
