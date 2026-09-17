// src/components/configurator/LogoUploadPanel.tsx
"use client";

import { useRef, useState } from "react";
import { LoaderCircle, LogIn, UploadCloud, X } from "lucide-react";

import {
  LOGO_UPLOAD_CONSTRAINTS,
  validateLogoFile,
} from "@/schemas/uniform-3d";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import type { AuthSession } from "@/types/account";
import styles from "./Studio.module.css";

interface LogoUploadPanelProps {
  /** current uploaded preview URL (object URL) */
  previewUrl?: string;
  fileName?: string;
  onUploaded: (input: {
    file: File;
    fileName: string;
    previewUrl: string;
    fileId: string;
    aspectRatio: number;
  }) => void;
  onClear: () => void;
  onUploadStateChange?: (uploading: boolean) => void;
}

export function LogoUploadPanel({
  previewUrl,
  fileName,
  onUploaded,
  onClear,
  onUploadStateChange,
}: LogoUploadPanelProps) {
  const { session, hydrated } = useAuth();
  const openAuth = useUIStore((s) => s.openAuth);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Setelah sesi terhidrasi, guest diarahkan login dulu — upload logo
  // tersimpan ke akun perusahaan sehingga butuh sesi customer yang valid.
  const isGuest = hydrated && !session;
  const uploadAllowed =
    !!session &&
    (session.user.role === "customer_admin" ||
      session.user.role === "customer_user" ||
      session.user.role === "company_admin" ||
      session.user.role === "purchasing");

  async function uploadToStorage(input: {
    file: File;
    localFileId: string;
    previewUrl: string;
    aspectRatio: number;
  }) {
    setUploading(true);
    onUploadStateChange?.(true);
    try {
      const formData = new FormData();
      formData.set("file", input.file);
      formData.set("fileType", "embroidery_logo");
      formData.set("metadata", JSON.stringify({ label: input.file.name }));
      const response = await fetch("/api/files/upload", {
        method: "POST",
        headers: session ? authHeaders(session) : undefined,
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as {
        ok: boolean;
        file?: { id: string; originalFilename: string };
        message?: string;
      };
      if (!response.ok || !result.file?.id) {
        throw new Error(
          response.status === 401
            ? "Sesi login telah berakhir. Silakan masuk kembali lalu unggah ulang logo."
            : result.message ?? "Logo belum berhasil disimpan.",
        );
      }
      onUploaded({
        file: input.file,
        fileName: result.file.originalFilename,
        previewUrl: input.previewUrl,
        fileId: result.file.id,
        aspectRatio: input.aspectRatio,
      });
    } catch (err) {
      onClear();
      URL.revokeObjectURL(input.previewUrl);
      setError(err instanceof Error ? err.message : "Logo belum berhasil disimpan.");
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  }

  function handleFile(file: File) {
    setError(null);
    if (!session) {
      setError("Masuk dulu untuk mengunggah logo Anda.");
      return;
    }
    if (!uploadAllowed) {
      setError("Role akun Anda belum memiliki izin untuk mengunggah logo bordir.");
      return;
    }
    const v = validateLogoFile(file);
    if (!v.ok) {
      setError(v.reason ?? "File tidak valid.");
      return;
    }
    const url = URL.createObjectURL(file);
    const localFileId = `pending-${Date.now().toString(36)}`;
    const image = new Image();
    image.onload = () => {
      const aspectRatio =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : 1;
      // Local object URL keeps the 3D preview feeling instant. The second
      // onUploaded call swaps the temporary id with the company-scoped file id.
      onUploaded({
        file,
        fileName: file.name,
        previewUrl: url,
        fileId: localFileId,
        aspectRatio,
      });
      void uploadToStorage({ file, localFileId, previewUrl: url, aspectRatio });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Dimensi logo tidak dapat dibaca.");
    };
    image.src = url;
  }

  return (
    <div>
      <h3 className={styles.label}>Unggah Logo</h3>

      {isGuest ? (
        <div className={styles.upload}>
          <LogIn aria-hidden="true" />
          <strong>Masuk dulu untuk mengunggah logo</strong>
          <span className={styles.help}>
            Logo tersimpan aman di akun perusahaan Anda dan bisa dipakai ulang
            untuk pesanan berikutnya.
          </span>
          <button
            type="button"
            onClick={() => openAuth({ kind: "save_configuration" }, "login")}
            className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--studio-ink)] px-4 text-sm font-bold text-white transition-colors hover:bg-[#071c3a]"
          >
            Masuk / Daftar
          </button>
        </div>
      ) : previewUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={fileName ?? "Pratinjau logo"}
            className="h-14 w-14 rounded-lg border border-line bg-[conic-gradient(at_top_left,_#fff_25%,_#e2e8f0_25%_50%,_#fff_50%_75%,_#e2e8f0_75%)] bg-[length:12px_12px] object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{fileName}</p>
            <p className={styles.help}>
              {uploading ? "Menyimpan file privat..." : LOGO_UPLOAD_CONSTRAINTS.recommended}
            </p>
          </div>
          {uploading && (
            <LoaderCircle
              className="h-4 w-4 shrink-0 animate-spin text-brand-700"
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus logo"
            disabled={uploading}
            className="grid h-11 w-11 place-items-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => uploadAllowed && inputRef.current?.click()}
            disabled={!uploadAllowed}
            onDragOver={(e) => {
              e.preventDefault();
              if (uploadAllowed) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={styles.upload}
            data-dragging={dragOver}
          >
            <UploadCloud aria-hidden="true" />
            <strong>{uploadAllowed ? "Unggah Logo" : "Upload logo tidak tersedia"}</strong>
            <span className={styles.help}>
              {uploadAllowed
                ? "PNG transparan, maks. 10 MB, klik atau tarik file"
                : "Role akun Anda belum memiliki izin upload logo bordir."}
            </span>
          </button>
        </>
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

function authHeaders(session: AuthSession): HeadersInit {
  return {
    "x-ofissio-company-id": session.company.id,
    "x-ofissio-company-name": session.company.companyName,
    "x-ofissio-user-id": session.user.id,
    "x-ofissio-user-email": session.user.email,
    "x-ofissio-user-name": session.user.fullName,
    "x-ofissio-role": session.user.role,
  };
}
