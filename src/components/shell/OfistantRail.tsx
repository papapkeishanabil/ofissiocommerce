"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useChromeStore, useRailOpen } from "@/stores/chrome-store";
import { OfistantMark } from "@/components/ofistant/OfistantMark";
import { OfistantPanel } from "./OfistantPanel";
import styles from "./OfistantLauncher.module.css";

function closePanel() {
  useChromeStore.setState({ railPinned: false, railHovered: false });
}

export function OfistantRail() {
  // The compact launcher opens the drawer explicitly; hovering keeps the page full width.
  const open = useRailOpen();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const launcher = launcherRef.current;
    panelRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Tutup Ofistant"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      launcher?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div
      className="group relative z-40 hidden h-dvh shrink-0 xl:block"
    >
      {/* Push drawer: width transitions 0 ↔ 400 */}
      <div id="ofistant-desktop-panel" ref={panelRef} inert={!open} aria-hidden={!open} className={cn("h-dvh overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none", open ? "w-[clamp(320px,21vw,400px)]" : "w-0")}>
        <div className="h-full w-[clamp(320px,21vw,400px)]">
          <OfistantPanel onClose={closePanel} />
        </div>
      </div>

      <button
        type="button"
        ref={launcherRef}
        hidden={open}
        data-testid="ofistant-handle"
        onClick={() => useChromeStore.setState({ railPinned: true, railHovered: false })}
        aria-label="Bantuan — Buka Ofistant"
        aria-controls="ofistant-desktop-panel"
        aria-expanded={open}
        title="Bantuan dari Ofistant"
        className={`${styles.launcher} ${styles.desktop}`}
      >
        <OfistantMark variant="rev" className={styles.logo} />
        <span>Bantuan</span>
      </button>
    </div>
  );
}
