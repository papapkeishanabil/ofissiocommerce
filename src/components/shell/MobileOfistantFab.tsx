// src/components/shell/MobileOfistantFab.tsx
// Compact mobile launcher and the Ofistant chat sheet.

"use client";

import { useEffect, useRef, useState } from "react";

import { OfistantPanel } from "./OfistantPanel";
import { OfistantMark } from "@/components/ofistant/OfistantMark";
import styles from "./OfistantLauncher.module.css";

export function MobileOfistantFab() {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep keyboard focus in the sheet, and return it to the launcher on close.
  useEffect(() => {
    if (!open) return;
    const launcher = launcherRef.current;
    sheetRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Tutup Ofistant"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab") return;
      const items = sheetRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 80rem)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      desktop.removeEventListener("change", onResize);
      window.removeEventListener("keydown", onKey);
      launcher?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      {/* Floating button — mobile only */}
      <button
        type="button"
        ref={launcherRef}
        hidden={open}
        onClick={() => setOpen(true)}
        aria-label="Buka Ofistant"
        aria-haspopup="dialog"
        aria-controls={open ? "ofistant-mobile-panel" : undefined}
        aria-expanded={open}
        title="Bantuan dari Ofistant"
        className={`${styles.launcher} ${styles.mobile}`}
      >
        <OfistantMark variant="rev" className={styles.logo} />
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div
          id="ofistant-mobile-panel"
          className="fixed inset-0 z-50 flex flex-col justify-end xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Ofistant chat"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Tutup latar Ofistant"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />

          <div ref={sheetRef} className="relative h-[85dvh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <OfistantPanel onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
