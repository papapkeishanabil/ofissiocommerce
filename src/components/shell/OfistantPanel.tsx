// src/components/shell/OfistantPanel.tsx
// Ofistant placeholder (Phase 1):
//  - welcome message + industry quick choices
//  - on add-to-cart anywhere in the app, shows the post-add prompt
//    with "Lanjut eksplor produk" / "Lihat keranjang".
//
// Real AI is deferred to Phase 7.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { INDUSTRY_META } from "@/data/industries";
import { useOfistantStore } from "@/stores/ofistant-store";
import { Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";

interface OfistantPanelProps {
  /** when true, render a close button (used inside mobile bottom sheet) */
  onClose?: () => void;
}

export function OfistantPanel({ onClose }: OfistantPanelProps) {
  const router = useRouter();
  const view = useOfistantStore((s) => s.view);
  const selectIndustry = useOfistantStore((s) => s.selectIndustry);
  const resetToWelcome = useOfistantStore((s) => s.resetToWelcome);
  const [pending, setPending] = useState<string | null>(null);

  function handlePick(industry: string) {
    setPending(industry);
    selectIndustry(industry);
    // Navigate the workspace (right panel) to filtered catalog.
    router.push(`/catalog?industri=${encodeURIComponent(industry)}`);
    setPending(null);
  }

  return (
    <div className="flex h-dvh w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Ofistant</p>
            <p className="text-[11px] text-ink-muted">Asisten Pengadaan</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Ofistant"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Body (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {view.kind === "welcome" && (
          <WelcomeView onPick={handlePick} pending={pending} />
        )}
        {view.kind === "post-add" && (
          <PostAddView
            productName={view.productName}
            onExploreMore={() => resetToWelcome()}
          />
        )}
      </div>

      {/* Footer note */}
      <div className="border-t border-line px-5 py-3">
        <p className="text-[11px] leading-relaxed text-ink-muted">
          <Badge tone="brand" className="mr-1">
            Beta
          </Badge>
          Ofistant sedang dalam mode asisten statis. AI real aktif di Phase 7.
        </p>
      </div>
    </div>
  );
}

function WelcomeView({
  onPick,
  pending,
}: {
  onPick: (industry: string) => void;
  pending: string | null;
}) {
  return (
    <div className="space-y-5">
      {/* Bubble from Ofistant */}
      <div className="rounded-2xl rounded-tl-md bg-brand-50 px-4 py-3 text-sm leading-relaxed text-ink">
        Halo, selamat datang di Ofissio. Saya Ofistant, asisten pengadaan
        seragam perusahaan Anda. Seragam untuk industri apa yang sedang Anda
        cari?
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Pilih industri
        </p>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRY_META.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => onPick(m.name)}
              disabled={pending !== null}
              className="group flex flex-col items-start gap-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-50"
            >
              <span className="text-sm font-semibold text-ink">{m.name}</span>
              <span className="text-[11px] leading-snug text-ink-muted">
                {m.tagline}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostAddView({
  productName,
  onExploreMore,
}: {
  productName: string;
  onExploreMore: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl rounded-tl-md bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
        <p className="font-semibold">Berhasil ditambahkan ✓</p>
        <p className="mt-1 text-emerald-800">
          <span className="font-medium">{productName}</span> sudah masuk
          keranjang.
        </p>
      </div>

      <div className="rounded-2xl rounded-tl-md bg-brand-50 px-4 py-3 text-sm leading-relaxed text-ink">
        Produk sudah ditambahkan ke keranjang. Apakah ingin lanjut mencari
        produk pelengkap?
      </div>

      <div className="space-y-2">
        <Button
          className="w-full"
          variant="primary"
          onClick={onExploreMore}
        >
          Lanjut eksplor produk
        </Button>
        <ButtonLink href="/cart" className="w-full" variant="outline">
          Lihat keranjang
        </ButtonLink>
      </div>

      <Link
        href="/catalog"
        className="block text-center text-xs font-medium text-brand-700 hover:underline"
      >
        Lihat semua produk →
      </Link>
    </div>
  );
}
