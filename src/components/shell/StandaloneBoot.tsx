"use client";

import { useEffect, useRef } from "react";
import styles from "./StandaloneBoot.module.css";

/** SSR markup paints before hydration. The persistent root shell owns readiness,
 * so route changes, focus and visibility changes never restart this sequence. */
export function StandaloneBoot() {
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = overlay.current;
    if (!element) return;
    let secondFrame = 0;
    let exitTimer: ReturnType<typeof setTimeout>;
    const hide = () => { element.hidden = true; };
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        element.dataset.ready = "true";
        exitTimer = setTimeout(hide, 200);
      });
    });
    // A restored document already has a ready shell, including a restoration
    // that happened while the exit timer was suspended in the background.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) hide(); };
    window.addEventListener("pageshow", restore);
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      clearTimeout(exitTimer);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  return (
    <div ref={overlay} className={styles.boot} aria-hidden="true" inert>
      <div className={styles.center}>
        <div className={styles.emblem}>
          <div className={styles.orbit} />
          <div className={styles.symbol} />
        </div>
        <div className={styles.wordmark} />
        <div className={styles.loading} />
      </div>
    </div>
  );
}
