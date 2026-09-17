"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChromeStore } from "@/stores/chrome-store";

export function ChromeRouteSync() {
  const pathname = usePathname();
  // Beranda keeps the top bar hidden (immersive hero). Every other storefront
  // route locks the top bar open so navigation stays reachable. Panel Ofistant
  // tidak ikut terkunci: di semua halaman ia tersembunyi dan hanya terbuka
  // lewat hover/klik logo di handle rail.
  const isBeranda = pathname === "/";
  useEffect(() => {
    useChromeStore.getState().setLocked(!isBeranda);
    if (typeof document !== "undefined") {
      document.body.classList.toggle("chrome-locked", !isBeranda);
    }
  }, [isBeranda]);
  return null;
}
