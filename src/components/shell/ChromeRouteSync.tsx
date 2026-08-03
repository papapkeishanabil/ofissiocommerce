"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChromeStore } from "@/stores/chrome-store";

export function ChromeRouteSync() {
  const pathname = usePathname();
  const isProduct = !!pathname && pathname.startsWith("/product/");
  useEffect(() => {
    useChromeStore.getState().setLocked(isProduct);
    if (typeof document !== "undefined") {
      document.body.classList.toggle("chrome-locked", isProduct);
    }
  }, [isProduct]);
  return null;
}
