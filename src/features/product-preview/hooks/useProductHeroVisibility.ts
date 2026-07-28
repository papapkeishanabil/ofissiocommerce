"use client";

import { useEffect, useState, type RefObject } from "react";

/** Reports whether the product hero is visible inside the current viewport. */
export function useProductHeroVisibility(ref: RefObject<Element | null>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? true),
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
}
