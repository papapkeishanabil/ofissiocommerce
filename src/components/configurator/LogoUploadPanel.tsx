// src/components/configurator/LogoUploadPanel.tsx
"use client";

import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

import {
  LOGO_UPLOAD_CONSTRAINTS,
  validateLogoFile,
} from "@/schemas/uniform-3d";

interface LogoUploadPanelProps {
  /** current uploaded preview URL (object URL) */
  previewUrl?: string;
  fileName?: string;
  onUploaded: (input: {
    file: File;
    fileName: string;
    previewUrl: string;
    fileId: string;
  }) => void;
  onClear: () => void;
}

export function LogoUploadPanel({
  previewUrl,
  fileName,
  onUploaded,
  onClear,
}: LogoUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    setError(null);
    const v = validateLogoFile(file);
    if (!v.ok) {
      setError(v.reason ?? "File tidak valid.");
      return;
    }
    const url = URL.createObjectURL(file);
    // Phase 8 will replace this with object-storage upload + AV scan.
    const fileId = `LOGO-${Date.now().toString(36).toUpperCase()}`;
    onUploaded({ file, fileName: file.name, previewUrl: url, fileId });
  }

  return (
    <div>
      <p className="type-eyebrow mb-2 text-ink-subtle">Logo bordir</p>

      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={fileName ?? "Pratinjau logo"}
            className="h-14 w-14 rounded-lg border border-line bg-[conic-gradient(at_top_left,_#fff_25%,_#e2e8f0_25%_50%,_#fff_50%_75%,_#e2e8f0_75%)] bg-[length:12px_12px] object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{fileName}</p>
            <p className="text-[10px] text-ink-muted">
              {LOGO_UPLOAD_CONSTRAINTS.recommended}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus logo"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center transition-all " +
            (dragOver
              ? "border-brand-500 bg-brand-50/50"
              : "border-line bg-surface hover:border-brand-300 hover:bg-brand-50/30")
          }
        >
          <UploadCloud className="h-6 w-6 text-brand-500" />
          <span className="text-xs font-semibold text-ink">
            Klik atau drop logo di sini
          </span>
          <span className="text-[10px] text-ink-muted">
            {LOGO_UPLOAD_CONSTRAINTS.recommended}
          </span>
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-600">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={LOGO_UPLOAD_CONSTRAINTS.allowedMime.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // reset so same file can be re-picked
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
