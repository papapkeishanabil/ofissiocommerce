"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";

export interface AdminReferenceItem {
  fileId: string;
  filename: string;
  mimeType: string;
  url: string | null;
}

interface AdminReferenceGalleryProps {
  items: AdminReferenceItem[];
}

/**
 * Customer-uploaded reference files. Images open in an in-page lightbox (no new
 * tab); PDFs open in a new tab since they can't render inline in the lightbox.
 */
export function AdminReferenceGallery({ items }: AdminReferenceGalleryProps) {
  const [active, setActive] = useState<AdminReferenceItem | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((file) => {
          const isImage = file.mimeType.startsWith("image/");
          if (file.url && isImage) {
            return (
              <li key={file.fileId}>
                <button
                  type="button"
                  onClick={() => setActive(file)}
                  title={file.filename}
                  className="group block w-full overflow-hidden rounded-xl border border-line bg-surface-muted text-left transition hover:border-brand-300 hover:shadow-soft-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url}
                    alt={file.filename}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                  />
                  <span className="block truncate px-2 py-1 text-[10px] font-semibold text-ink-muted">
                    {file.filename}
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li key={file.fileId}>
              <a
                href={file.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                title={file.filename}
                className="flex h-full min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-muted p-3 text-center transition hover:border-brand-300"
              >
                <FileText className="h-5 w-5 text-brand-700" aria-hidden="true" />
                <span className="line-clamp-2 text-[10px] font-semibold text-ink-muted">
                  {file.filename}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {active && active.url && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={active.filename}
              onClick={() => setActive(null)}
            >
              <button
                type="button"
                aria-label="Tutup"
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X className="h-5 w-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.filename}
                className="max-h-[90dvh] max-w-[90vw] rounded-xl bg-white object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
