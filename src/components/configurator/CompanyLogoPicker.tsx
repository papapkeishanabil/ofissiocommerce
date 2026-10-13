"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileImage, LoaderCircle } from "lucide-react";
import type { AuthSession } from "@/types/account";
import type { CompanyLogoAsset } from "@/features/company-assets/company-assets.types";
import {
  loadCompanyLogoChoices, resolveCompanyLogoChoice, type StudioLibraryLogo,
} from "@/features/company-assets/company-logo-picker.client";

interface PickerProps {
  session: AuthSession;
  onSelected: (logo: StudioLibraryLogo) => void;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}

export function CompanyLogoPicker(props: PickerProps) {
  const [attempt, setAttempt] = useState(0);
  return <section className="mt-3 rounded-xl border border-line bg-surface p-3" aria-label="Logo Library">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-bold text-ink">Logo Library</h4>
      <button type="button" onClick={props.onClose} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-brand-700">Tutup</button>
    </div>
    <p className="mb-3 text-xs text-ink-muted">Pilih logo perusahaan untuk zona bordir ini.</p>
    <LogoChoices key={attempt} {...props} onRetry={() => setAttempt(value => value + 1)} />
  </section>;
}

function LogoChoices({ session, onSelected, onBusyChange, onRetry }: PickerProps & { onRetry: () => void }) {
  const [result, setResult] = useState<{ logos: CompanyLogoAsset[] } | { error: string } | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const selection = useRef<AbortController | null>(null);
  const companyId = session.company.id;
  const companyName = session.company.companyName;
  const userId = session.user.id;
  const email = session.user.email;
  const fullName = session.user.fullName;
  const role = session.user.role;

  useEffect(() => {
    const controller = new AbortController();
    const activeSession = {
      company: { id: companyId, companyName }, user: { id: userId, email, fullName, role },
    };
    void loadCompanyLogoChoices({ session: activeSession, signal: controller.signal })
      .then(logos => { if (!controller.signal.aborted) setResult({ logos }); })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ error: "Logo Library belum dapat dimuat. Silakan coba lagi." });
      });
    return () => controller.abort();
  }, [companyId, companyName, userId, email, fullName, role]);

  useEffect(() => () => {
    if (selection.current) {
      selection.current.abort();
      onBusyChange?.(false);
    }
  }, [onBusyChange]);

  async function select(logo: CompanyLogoAsset) {
    if (selection.current) return;
    const controller = new AbortController();
    selection.current = controller;
    setSelectingId(logo.id);
    setSelectionError(null);
    onBusyChange?.(true);
    try {
      const resolved = await resolveCompanyLogoChoice({ logo, session, signal: controller.signal });
      if (!controller.signal.aborted) onSelected(resolved);
    } catch (error) {
      if (!controller.signal.aborted) setSelectionError(error instanceof Error ? error.message : "Logo belum dapat digunakan.");
    } finally {
      if (!controller.signal.aborted) {
        selection.current = null;
        setSelectingId(null);
        onBusyChange?.(false);
      }
    }
  }

  if (!result) return <p role="status" className="flex items-center gap-2 py-4 text-xs text-ink-muted"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Memuat logo perusahaan...</p>;
  if ("error" in result) return <div role="alert" className="py-3 text-xs text-ink-muted">
    <p>{result.error}</p><button type="button" onClick={onRetry} className="mt-2 min-h-10 font-semibold text-brand-700">Coba lagi</button>
  </div>;
  if (!result.logos.length) return <div className="py-3 text-xs text-ink-muted">
    <p>Belum ada logo yang dapat digunakan. Anda bisa mengunggah logo baru di Studio.</p>
    <Link href="/dashboard?view=logos" className="mt-2 inline-flex min-h-10 items-center font-semibold text-brand-700">Buka Logo Library akun</Link>
  </div>;
  return <>
    {selectionError && <p role="alert" className="mb-2 text-xs text-red-600">{selectionError}</p>}
    {selectingId && <p role="status" className="mb-2 text-xs text-ink-muted">Menyiapkan logo...</p>}
    <ul className="grid max-h-72 gap-2 overflow-y-auto">
      {result.logos.map(logo => <li key={logo.id}>
        <button type="button" disabled={Boolean(selectingId)} onClick={() => void select(logo)}
          className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-line p-2 text-left hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border border-line bg-white">
            {logo.previewUrl ? <LogoThumbnail url={logo.previewUrl} /> : <FileImage aria-hidden="true" className="h-5 w-5 text-brand-700" />}
          </span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-ink">{logo.label}</strong><span className="block truncate text-[11px] text-ink-muted">{logo.originalFilename}</span></span>
          {selectingId === logo.id ? <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" /> : <span className="text-xs font-semibold text-brand-700">Pilih</span>}
        </button>
      </li>)}
    </ul>
  </>;
}

function LogoThumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FileImage aria-hidden="true" className="h-5 w-5 text-brand-700" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain p-1" />;
}
