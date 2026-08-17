"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { CompanyLogoAsset } from "@/features/company-assets/company-assets.types";
import type { AuthSession } from "@/types/account";
import {
  embroideryTechniqueLabel,
  type LogoPlacement,
  zoneLabel,
} from "@/types/uniform-3d";

interface OrderLogoThumbnailsProps {
  placements: LogoPlacement[];
}

type PreviewState = Record<string, string | null>;

export function OrderLogoThumbnails({ placements }: OrderLogoThumbnailsProps) {
  const { session } = useAuth();
  const [previewUrls, setPreviewUrls] = useState<PreviewState>({});
  const fileIds = useMemo(
    () => [...new Set(placements.map((placement) => placement.logoFileId).filter(Boolean))],
    [placements],
  );
  const fileIdsKey = fileIds.join("|");

  useEffect(() => {
    if (!session || fileIds.length === 0) return;

    const controller = new AbortController();
    let active = true;

    async function loadPreviews(activeSession: AuthSession) {
      const directEntries = await Promise.all(
        fileIds.map(async (fileId): Promise<[string, string | null]> => {
          const placementPreview = placements.find(
            (placement) => placement.logoFileId === fileId,
          )?.logoPreviewUrl;
          if (placementPreview?.startsWith("/")) return [fileId, placementPreview];
          if (isPlaceholderFileId(fileId)) return [fileId, null];
          try {
            const response = await fetch(`/api/files/${encodeURIComponent(fileId)}/signed-url`, {
              headers: authHeaders(activeSession),
              cache: "no-store",
              signal: controller.signal,
            });
            const result = (await response.json().catch(() => ({}))) as {
              ok?: boolean;
              signedUrl?: string;
            };
            return [fileId, response.ok && result.ok ? (result.signedUrl ?? null) : null];
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") throw error;
            return [fileId, null];
          }
        }),
      );

      const directUrls = Object.fromEntries(directEntries);
      const unresolvedPlacements = placements.filter(
        (placement) => !directUrls[placement.logoFileId],
      );
      if (unresolvedPlacements.length === 0) {
        if (active) setPreviewUrls(directUrls);
        return;
      }

      const libraryResponse = await fetch("/api/company/logos", {
        headers: authHeaders(activeSession),
        cache: "no-store",
        signal: controller.signal,
      });
      const libraryResult = (await libraryResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        logos?: CompanyLogoAsset[];
      };
      const logos = libraryResponse.ok && libraryResult.ok ? (libraryResult.logos ?? []) : [];
      const resolvedUrls = { ...directUrls };

      for (const placement of unresolvedPlacements) {
        const filename = placement.logoFileName.trim().toLowerCase();
        const matchingLogo = logos.find(
          (logo) =>
            logo.fileId === placement.logoFileId ||
            logo.originalFilename.trim().toLowerCase() === filename,
        );
        if (matchingLogo?.previewUrl) resolvedUrls[placement.logoFileId] = matchingLogo.previewUrl;
      }

      if (active) setPreviewUrls(resolvedUrls);
    }

    void loadPreviews(session).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError") && active) {
        setPreviewUrls(Object.fromEntries(fileIds.map((fileId) => [fileId, null])));
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
    // fileIdsKey is a stable representation of the unique file IDs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fileIdsKey]);

  if (placements.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-ink-muted">Logo per posisi bordir</p>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {placements.map((placement, index) => {
          const previewUrl = previewUrls[placement.logoFileId];
          const isLoading = session && placement.logoFileId && previewUrl === undefined;
          const position = zoneLabel(placement.zone);

          return (
            <li
              key={`${placement.zone}-${placement.logoFileId}-${index}`}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white/70 p-2.5"
            >
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                {previewUrl ? (
                  // Signed storage URLs are temporary and can use a provider hostname.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={`Logo bordir ${position} - ${placement.logoFileName}`}
                    loading="lazy"
                    className="h-full w-full object-contain p-1"
                  />
                ) : isLoading ? (
                  <span className="h-7 w-7 animate-pulse rounded bg-slate-200" aria-label="Memuat logo" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-ink-muted" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 text-xs">
                <p className="font-bold text-ink">{position}</p>
                <p className="mt-0.5 truncate text-ink-muted" title={placement.logoFileName}>
                  {placement.logoFileName || "Logo bordir"}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {embroideryTechniqueLabel(placement.technique)} · {placement.widthCm} ×{" "}
                  {placement.heightCm} cm
                </p>
              </div>
            </li>
          );
        })}
      </ul>
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

function isPlaceholderFileId(fileId: string) {
  return fileId.toLowerCase().includes("placeholder");
}
