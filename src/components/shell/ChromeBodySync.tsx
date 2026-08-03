"use client";

import { useEffect } from "react";
import { useChromeOpen } from "@/stores/chrome-store";

export function ChromeBodySync() {
  const open = useChromeOpen();
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("chrome-open", open);
    }
  }, [open]);
  return null;
}
