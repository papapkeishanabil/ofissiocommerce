"use client";

import { useEffect, useRef } from "react";
import { subscribeToInitialShellReady } from "./boot-readiness";
import styles from "./StandaloneBoot.module.css";

/** SSR markup paints before hydration. The persistent root shell owns readiness,
 * so route changes, focus and visibility changes never restart this sequence. */
export function StandaloneBoot() {
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = overlay.current;
    if (!element) return;
    let shellReady = false;
    let documentReady = document.readyState !== "loading";
    let closing = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let exitTimer: ReturnType<typeof setTimeout>;
    const hide = () => { element.hidden = true; };
    const closeWhenReady = () => {
      if (!shellReady || !documentReady || closing) return;
      closing = true;
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          element.dataset.ready = "true";
          exitTimer = setTimeout(hide, 200);
        });
      });
    };
    const onDocumentReady = () => {
      documentReady = true;
      closeWhenReady();
    };
    // DOMContentLoaded waits for streamed HTML, not images/video/3D or load.
    document.addEventListener("DOMContentLoaded", onDocumentReady, { once: true });
    const unsubscribe = subscribeToInitialShellReady(() => {
      shellReady = true;
      closeWhenReady();
    });
    // A restored document already has a ready shell, including a restoration
    // that happened while the exit timer was suspended in the background.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) hide(); };
    window.addEventListener("pageshow", restore);
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      clearTimeout(exitTimer);
      unsubscribe();
      document.removeEventListener("DOMContentLoaded", onDocumentReady);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  return (
    <div ref={overlay} className={styles.boot} data-ofissio-boot="">
      <div className={styles.visual} aria-hidden="true" inert>
        <div className={styles.center}>
          <div className={styles.emblem}>
            <div className={styles.symbol} />
            <div className={styles.orbit} />
          </div>
          <div className={styles.wordmark} />
        </div>
      </div>
      <div className={styles.recovery} role="status">
        <p>Halaman belum selesai dimuat. Periksa koneksi internet Anda, lalu coba lagi.</p>
        {/* A normal link also works when hydration itself has failed. */}
        <a href="">Coba lagi</a>
      </div>
    </div>
  );
}
