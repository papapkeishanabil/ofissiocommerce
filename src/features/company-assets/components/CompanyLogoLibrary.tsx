"use client";

import { useEffect, useState } from "react";
import { ImagePlus, ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import type { AuthSession } from "@/types/account";

import type { CompanyLogoAsset } from "../company-assets.types";
import { LogoAssetCard } from "./LogoAssetCard";
import { LogoUploadButton } from "./LogoUploadButton";

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

export function CompanyLogoLibrary({
  onSelectLogo,
}: {
  onSelectLogo?: (logo: CompanyLogoAsset) => void;
}) {
  const { session, hydrated } = useAuth();
  const [logos, setLogos] = useState<CompanyLogoAsset[]>([]);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLogos(activeSession: AuthSession) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/company/logos", {
        headers: authHeaders(activeSession),
        cache: "no-store",
      });
      const result = (await response.json()) as {
        ok: boolean;
        logos?: CompanyLogoAsset[];
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Logo belum dapat dimuat.");
      }
      setLogos(result.logos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) void loadLogos(session);
  }, [session]);

  async function deleteLogo(logo: CompanyLogoAsset) {
    if (!session) return;
    setError(null);
    try {
      const response = await fetch(`/api/company/logos/${encodeURIComponent(logo.id)}`, {
        method: "DELETE",
        headers: authHeaders(session),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Logo belum dapat dihapus.");
      }
      setLogos((current) => current.filter((item) => item.id !== logo.id));
      if (selectedLogoId === logo.id) setSelectedLogoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo belum dapat dihapus.");
    }
  }

  if (!hydrated) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-20 animate-pulse rounded-xl bg-slate-100" />
      </section>
    );
  }

  if (!session) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ImagePlus className="h-4 w-4 text-brand-700" />
          Logo library
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Masuk dulu untuk menyimpan logo perusahaan secara company-scoped.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-line bg-surface p-5"
      aria-labelledby="company-logo-library-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="company-logo-library-title"
            className="flex items-center gap-2 text-sm font-bold text-ink"
          >
            <ImagePlus className="h-4 w-4 text-brand-700" />
            Logo library
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Logo disimpan privat per company untuk kebutuhan bordir dan repeat
            order.
          </p>
        </div>
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
      </div>

      <div className="mt-4">
        <LogoUploadButton
          session={session}
          onUploaded={(logo) => {
            setLogos((current) => [
              logo,
              ...current.filter((item) => item.id !== logo.id),
            ]);
            setSelectedLogoId(logo.id);
            onSelectLogo?.(logo);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[11px] leading-snug text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100" />
      ) : logos.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-muted p-4 text-center">
          <p className="text-xs font-semibold text-ink">Belum ada logo.</p>
          <p className="mt-1 text-[11px] text-ink-muted">
            Upload PNG transparan agar tim bordir mudah memakai file aslinya.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {logos.map((logo) => (
            <LogoAssetCard
              key={logo.id}
              logo={logo}
              selected={selectedLogoId === logo.id}
              onSelect={(selected) => {
                setSelectedLogoId(selected.id);
                onSelectLogo?.(selected);
              }}
              onDelete={(selected) => void deleteLogo(selected)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
