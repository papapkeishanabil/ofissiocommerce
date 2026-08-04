"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChromeStore } from "@/stores/chrome-store";

export function ChromeRouteSync() {
  const pathname = usePathname();
  // Beranda keeps the chrome hidden (immersive hero). Every other storefront
  // route pins the top bar + Ofistant rail open so navigation stays reachable.
  const isBeranda = pathname === "/";
  useEffect(() => {
    useChromeStore.getState().setLocked(!isBeranda);
    if (typeof document !== "undefined") {
      document.body.classList.toggle("chrome-locked", !isBeranda);
    }
  }, [isBeranda]);
  return null;
}
