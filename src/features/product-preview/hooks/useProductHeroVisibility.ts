"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Reports whether the product hero is visible inside the scroll container.
 *
 * The commerce workspace uses an internal `overflow-y-auto` div (NOT window
 * scroll), so IntersectionObserver must use that div as its `root`. We find
 * it by selector; if not found, fall back to viewport (window).
 */
export function useProductHeroVisibility(ref: RefObject<Element | null>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    // Find the workspace scroll container via data attribute.
    const root = document.querySelector("[data-workspace-scroll]") ?? null;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? true),
      { threshold: 0.12, root },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
}
