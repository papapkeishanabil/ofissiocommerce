"use client";

import { useState } from "react";
import { CheckCircle2, FileImage, Trash2 } from "lucide-react";

import type { CompanyLogoAsset } from "../company-assets.types";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LogoAssetCard({
  logo,
  selected,
  onSelect,
  onDelete,
}: {
  logo: CompanyLogoAsset;
  selected: boolean;
  onSelect: (logo: CompanyLogoAsset) => void;
  onDelete?: (logo: CompanyLogoAsset) => void;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const canPreviewImage =
    Boolean(logo.previewUrl) &&
    logo.mimeType.startsWith("image/") &&
    !previewFailed;

  return (
    <article
      className={
        "rounded-xl border bg-surface p-3 transition-colors " +
        (selected ? "border-brand-500 ring-2 ring-brand-100" : "border-line")
      }
    >
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-[conic-gradient(at_top_left,_#fff_25%,_#e2e8f0_25%_50%,_#fff_50%_75%,_#e2e8f0_75%)] bg-[length:12px_12px]">
          {canPreviewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.previewUrl ?? ""}
              alt=""
              className="h-full w-full object-contain p-1"
              loading="lazy"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <FileImage className="h-6 w-6 text-brand-700" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-bold text-ink">{logo.label}</h3>
          <p className="mt-1 truncate text-[10px] text-ink-muted">
            {logo.originalFilename}
          </p>
          <p className="mt-1 text-[10px] text-ink-muted">
            {logo.extension.toUpperCase()} · {formatSize(logo.sizeBytes)} ·{" "}
            {logo.status}
          </p>
          {previewFailed && (
            <p className="mt-1 text-[10px] font-semibold text-amber-700">
              Preview unavailable
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(logo)}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-800"
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
          {selected ? "Dipilih" : "Pilih"}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(logo)}
            aria-label={`Hapus logo ${logo.label}`}
            className="grid min-h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
