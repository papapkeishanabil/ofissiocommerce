"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, ShieldCheck } from "lucide-react";

const internalHeaders = {
  "Content-Type": "application/json",
  "x-ofissio-internal-role": "super_admin",
  "x-ofissio-internal-user-id": "internal-dev",
} as const;

/**
 * Titik awal pengayaan brief customer portal menjadi brief teknis:
 * permintaan awal customer disimpan sebagai snapshot, lalu editor brief,
 * upload figur, dan tanda tangan menjadi tersedia.
 */
export function AdminBriefEnrichmentStart({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startEnrichment() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/quotations/${quotationId}/brief-enrichment`, {
        method: "POST",
        headers: internalHeaders,
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Pengayaan brief belum dapat dimulai.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pengayaan brief belum dapat dimulai.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-soft-sm">
      <p className="type-eyebrow text-brand-700">Pengayaan brief customer</p>
      <h2 className="mt-1 text-lg font-black text-ink">Kembangkan permintaan customer jadi brief teknis</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
        Brief ini berasal dari permintaan customer di portal. Setelah konsultasi dan pembahasan
        internal (desainer, kepala produksi), ambil alih brief ini untuk menambahkan spesifikasi
        teknis, ukuran per gender, area bordir, dan figur mockup. Permintaan awal customer disimpan
        otomatis sebagai pembanding — tidak ditimpa.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
        <li className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
          Saat menyimpan hasil pengayaan, sales memilih per kasus: minta tanda tangan customer
          (lembar approval desain) atau lanjut tanpa persetujuan formal.
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startEnrichment}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PenLine className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Memulai..." : "Kembangkan brief teknis"}
        </button>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
