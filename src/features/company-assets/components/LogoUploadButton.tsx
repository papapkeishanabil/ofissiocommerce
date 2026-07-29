"use client";

import { useRef, useState } from "react";
import { LoaderCircle, UploadCloud } from "lucide-react";

import type { AuthSession } from "@/types/account";
import type { CompanyLogoAsset } from "../company-assets.types";

const ACCEPTED_LOGO_TYPES = "image/png,image/jpeg,image/svg+xml";

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

export function LogoUploadButton({
  session,
  onUploaded,
}: {
  session: AuthSession;
  onUploaded: (logo: CompanyLogoAsset) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("fileType", "company_logo");
      formData.set("metadata", JSON.stringify({ label: file.name }));

      const uploadResponse = await fetch("/api/files/upload", {
        method: "POST",
        headers: authHeaders(session),
        body: formData,
      });
      const uploadResult = (await uploadResponse.json()) as {
        ok: boolean;
        file?: { id: string };
        message?: string;
      };
      if (!uploadResponse.ok || !uploadResult.file?.id) {
        throw new Error(uploadResult.message ?? "Upload logo gagal.");
      }

      const logoResponse = await fetch("/api/company/logos", {
        method: "POST",
        headers: {
          ...authHeaders(session),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: uploadResult.file.id,
          label: file.name,
        }),
      });
      const logoResult = (await logoResponse.json()) as {
        ok: boolean;
        logo?: unknown;
        message?: string;
      };
      if (!logoResponse.ok || !logoResult.ok) {
        throw new Error(logoResult.message ?? "Logo belum dapat disimpan.");
      }

      const listResponse = await fetch("/api/company/logos", {
        headers: authHeaders(session),
        cache: "no-store",
      });
      const listResult = (await listResponse.json()) as {
        ok: boolean;
        logos?: CompanyLogoAsset[];
      };
      const uploaded = listResult.logos?.find(
        (logo) => logo.fileId === uploadResult.file?.id,
      );
      if (uploaded) onUploaded(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload logo gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-busy={uploading}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800 transition-colors hover:border-brand-400 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {uploading ? "Mengupload..." : "Upload logo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_LOGO_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadLogo(file);
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-[11px] leading-snug text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
