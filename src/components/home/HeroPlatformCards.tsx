// src/components/home/HeroPlatformCards.tsx
// Layered "platform" floating cards — a stylized mock of Ofissio's quotation →
// production tracking flow, arranged as a premium cluster on the hero's right.
//
// Design (per approved preview + ui-ux-pro-max + frontend-designer):
//  • Product card (Kemeja Oxford) is the HERO — biggest, vertically centered.
//  • Quotation / Batch / Ofistant are smaller and peek around it with subtle
//    rotation + z-index → layered depth (premium), not a flat stack.
//  • White cards, navy text, ochre accent, soft neutral shadow, thin border.
//  • Desktop only (lg+). Decorative: aria-hidden, illustrative content.

import Image from "next/image";
import { MessageSquare, Sparkles } from "lucide-react";

type Props = { className?: string };

const SWATCHES = ["#142766", "#4a6bd8", "#9aa3b2", "#1a1f2e"];

const STEPS = [
  { label: "Konsultasi", state: "done" },
  { label: "Produksi", state: "active" },
  { label: "QC", state: "idle" },
  { label: "Pengiriman", state: "idle" },
] as const;

// Uniform premium shell — translucent frosted glass over the hero video.
// Translucency is the requested material; backdrop-blur is functional here
// (keeps navy text legible over a moving video), not decoration.
const CARD =
  "rounded-3xl border border-white/30 bg-white/70 shadow-soft-xl backdrop-blur-xl";

export function HeroPlatformCards({ className }: Props) {
  return (
    <div className={`relative h-[560px] ${className ?? ""}`} aria-hidden="true">
      {/* 1 · Product — hero card, biggest, right-center */}
      <article
        className={`absolute right-0 top-1/2 z-30 w-[300px] -translate-y-1/2 rotate-[1.5deg] p-3.5 ${CARD}`}
      >
        <div className="relative mb-3 h-48 overflow-hidden rounded-2xl bg-cool-100 ring-1 ring-inset ring-black/5">
          <span className="absolute right-2.5 top-2.5 z-10 rounded-md bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
            3D
          </span>
          <Image
            src="/products/kk-006/KK-006-front-nobg.webp"
            alt=""
            fill
            sizes="280px"
            priority
            className="object-contain p-3 drop-shadow-[0_10px_14px_rgba(0,0,0,0.18)]"
          />
          <div className="absolute bottom-2.5 left-2.5 z-10 flex gap-1.5">
            {SWATCHES.map((c) => (
              <span
                key={c}
                className="h-3 w-3 rounded-full ring-2 ring-white/80"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="px-1">
          <div className="text-base font-extrabold leading-tight text-brand-900">
            Kemeja Oxford
          </div>
          <div className="text-[11px] font-semibold tracking-wide text-ink-muted">
            KK-006 · Slim / Regular
          </div>
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-lg bg-ochre-400 px-2.5 py-1 text-[11px] font-extrabold text-brand-950">
              Siap Bordir
            </span>
          </div>
        </div>
      </article>

      {/* 2 · Quotation — smaller, peeks over product's top-left */}
      <article
        className={`absolute right-[30%] top-[2%] z-40 w-[250px] -rotate-[2deg] ${CARD}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-extrabold text-brand-900">
              Quotation #Q-2026-0148
            </div>
            <div className="truncate text-[10px] font-medium text-ink-muted">
              PT Sumber Jaya · 12 Agu 2026
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-ochre-400 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-950">
            Siap Ditinjau
          </span>
        </div>
        <div className="space-y-1 px-3.5 py-2.5 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-ink-muted">KK-006 × 100</span>
            <span className="shrink-0 font-bold tabular-nums text-brand-900">Rp 12.500.000</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-ink-muted">Bordir logo dada kiri</span>
            <span className="shrink-0 font-bold tabular-nums text-brand-900">Rp 1.500.000</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-line px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Total
          </span>
          <span className="text-sm font-extrabold tabular-nums text-ochre-500">
            Rp 14.000.000
          </span>
        </div>
      </article>

      {/* 3 · Batch — medium, tucked under product's bottom-right */}
      <article className={`absolute bottom-0 right-0 z-20 w-[275px] rotate-[1.5deg] ${CARD}`}>
        <div className="flex items-center justify-between px-3.5 pt-2.5">
          <div className="text-[12px] font-extrabold text-brand-900">Batch #B-042</div>
          <div className="text-[10px] font-bold tabular-nums text-ink-muted">Produksi · 62%</div>
        </div>
        <div className="mx-3.5 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
        </div>
        <div className="flex justify-between px-3.5 py-2.5">
          {STEPS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span
                className={
                  s.state === "done"
                    ? "h-2.5 w-2.5 rounded-full bg-brand-500"
                    : s.state === "active"
                      ? "h-2.5 w-2.5 rounded-full bg-ochre-400 ring-2 ring-ochre-400/30"
                      : "h-2.5 w-2.5 rounded-full bg-black/15"
                }
              />
              <span
                className={
                  s.state === "active"
                    ? "text-[9px] font-bold text-ochre-500"
                    : s.state === "done"
                      ? "text-[9px] font-semibold text-brand-700"
                      : "text-[9px] font-semibold text-ink-muted/70"
                }
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="px-3.5 pb-2.5 text-[10px] font-bold tabular-nums text-ink-muted">
          Estimasi tiba: <span className="text-brand-900">22 Agu 2026</span>
        </div>
      </article>

      {/* 4 · Ofistant — compact, peeks over batch's top-left */}
      <article
        className={`absolute bottom-[6%] right-[40%] z-40 w-[225px] -rotate-[2deg] p-3.5 ${CARD}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-ochre-300">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-brand-900">
              Ofistant AI
              <span className="rounded-[3px] bg-brand-100 px-1 text-[9px] font-extrabold text-brand-700">
                AI
              </span>
            </div>
            <div className="mt-0.5 text-[10px] leading-snug text-ink-muted">
              Estimasi 100 pcs + bordir dada kiri —{" "}
              <span className="font-bold tabular-nums text-brand-900">Rp 14.000.000</span>
            </div>
          </div>
        </div>
        {/* Decorative CTA only — real Ofistant entry is the CTA in the copy column. */}
        <div className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white">
          <MessageSquare className="h-3.5 w-3.5" /> Chat Sekarang
        </div>
      </article>
    </div>
  );
}
