"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ClipboardCheck, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type {
  CustomBriefApprovalStatus,
  QuotationRequestRecord,
  TechnicalGarmentSpecification,
} from "@/features/quotation/quotation.types";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import type { AuthSession } from "@/types/account";

export function CustomBriefApprovalPage({ id }: { id: string }) {
  const { session, hydrated, isAuthenticated } = useAuth();
  const openAuth = useUIStore((state) => state.openAuth);
  const [brief, setBrief] = useState<QuotationRequestRecord | null>(null);
  const [approvalStatus, setApprovalStatus] =
    useState<CustomBriefApprovalStatus>("pending_customer_approval");
  const [loading, setLoading] = useState(true);
  const [revisionNote, setRevisionNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/custom-briefs/${id}`, {
          cache: "no-store",
          headers: authHeaders(session!),
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          brief?: QuotationRequestRecord;
          approvalStatus?: CustomBriefApprovalStatus;
        };
        if (!response.ok || !result.ok || !result.brief) {
          setBrief(null);
          return;
        }
        setBrief(result.brief);
        setApprovalStatus(result.approvalStatus ?? "pending_customer_approval");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [hydrated, id, session]);

  function respond(action: "approve" | "request_revision") {
    if (!session) return;
    if (action === "request_revision" && revisionNote.trim().length < 3) {
      setMessage("Tuliskan bagian spesifikasi yang perlu diperbaiki.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/custom-briefs/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(session) },
          body: JSON.stringify({
            action,
            note: action === "request_revision" ? revisionNote.trim() : null,
          }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          brief?: QuotationRequestRecord;
          approvalStatus?: CustomBriefApprovalStatus;
        };
        if (!response.ok || !result.ok || !result.brief) {
          setMessage(result.message ?? "Respons brief belum dapat disimpan.");
          return;
        }
        setBrief(result.brief);
        setApprovalStatus(result.approvalStatus ?? approvalStatus);
        setMessage(
          action === "approve"
            ? "Brief sudah disetujui. Tim Ofissio sekarang dapat menyiapkan quotation."
            : "Permintaan revisi sudah dikirim kepada tim Ofissio.",
        );
      } catch {
        setMessage("Koneksi terputus. Silakan coba kembali.");
      }
    });
  }

  if (!hydrated || loading) {
    return <div className="mx-auto my-12 h-52 w-full max-w-3xl animate-pulse rounded-3xl bg-slate-100" role="status" aria-label="Memuat brief" />;
  }
  if (!isAuthenticated || !session) {
    return (
      <EmptyState
        title="Login diperlukan"
        description="Masuk menggunakan akun perusahaan yang menerima brief ini."
        action={<Button onClick={() => openAuth({ kind: "request_quote", returnTo: `/briefs/${id}` })}>Masuk / Daftar</Button>}
      />
    );
  }
  if (!brief?.productionBrief) {
    return <EmptyState title="Brief tidak ditemukan" description="Brief tidak tersedia atau bukan milik perusahaan Anda." />;
  }

  const productionBrief = brief.productionBrief;
  const locked = approvalStatus === "approved" || approvalStatus === "revision_requested";
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft-md">
        <header className="bg-brand-950 px-5 py-6 text-white sm:px-8">
          <p className="type-eyebrow text-brand-200">Persetujuan spesifikasi Full Custom</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {productionBrief.projectName ?? "Brief seragam Full Custom"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-100">
            Brief ini dicatat oleh sales berdasarkan percakapan Anda. Periksa spesifikasi sebelum tim Ofissio menghitung dan mengirim quotation.
          </p>
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Perusahaan" value={brief.companyName} />
            <Summary label="PIC" value={brief.picName} />
            <Summary label="Estimasi qty" value={`${productionBrief.estimatedQuantity ?? brief.totalQty} pcs`} />
          </div>
          <div className="rounded-2xl border border-line bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Ringkasan kebutuhan</p>
            <p className="mt-2 text-sm leading-6 text-ink">{productionBrief.designDescription}</p>
          </div>

          {(productionBrief.technicalSpecifications?.length ?? 0) > 0 ? (
            <div>
              <h2 className="text-lg font-black text-ink">Spesifikasi pakaian</h2>
              <div className="mt-3 space-y-4">
                {productionBrief.technicalSpecifications?.map((garment) => (
                  <GarmentSummary key={garment.id} garment={garment} />
                ))}
              </div>
            </div>
          ) : null}

          <div className={`rounded-2xl border p-4 ${approvalStatus === "approved" ? "border-emerald-200 bg-emerald-50" : approvalStatus === "revision_requested" ? "border-amber-200 bg-amber-50" : "border-brand-200 bg-brand-50"}`}>
            <div className="flex items-start gap-3">
              {approvalStatus === "approved" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden="true" /> : <ClipboardCheck className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />}
              <div>
                <p className="font-black text-ink">{approvalLabel(approvalStatus)}</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{approvalDescription(approvalStatus)}</p>
              </div>
            </div>
          </div>

          {!locked ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <span className="text-sm font-bold text-ink">Catatan revisi (jika ada)</span>
                <textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="Contoh: warna panel bahu diubah menjadi navy." />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" disabled={isPending} onClick={() => respond("request_revision")}><RotateCcw className="h-4 w-4" aria-hidden="true" />Minta revisi</Button>
                <Button disabled={isPending} onClick={() => respond("approve")}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Setujui brief</Button>
              </div>
            </div>
          ) : null}
          {message ? <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-ink" role="status">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}

function GarmentSummary({ garment }: { garment: TechnicalGarmentSpecification }) {
  const specs = garment.specifications.filter((item) => item.status !== "not_used");
  const sizes = garment.sizeBreakdown.filter((item) => item.quantity > 0);
  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-ink">{garment.garmentType}</h3>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{garment.quantity} pcs</span>
      </div>
      {specs.length > 0 ? <dl className="mt-4 grid gap-2 sm:grid-cols-2">{specs.map((spec) => <div key={spec.key} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-bold text-ink-muted">{spec.label}</dt><dd className="mt-1 text-sm font-semibold text-ink">{[spec.option, spec.detail, spec.notes].filter(Boolean).join(" · ") || "Memerlukan rekomendasi Ofissio"}</dd></div>)}</dl> : null}
      {sizes.length > 0 ? <p className="mt-3 text-sm text-ink-muted"><strong className="text-ink">Ukuran:</strong> {sizes.map((item) => `${item.size} ${item.quantity} pcs`).join(", ")}</p> : null}
    </article>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center"><h1 className="text-xl font-black text-ink">{title}</h1><p className="mt-2 text-sm text-ink-muted">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div>;
}

function approvalLabel(status: CustomBriefApprovalStatus) {
  if (status === "approved") return "Brief sudah disetujui";
  if (status === "revision_requested") return "Revisi sudah diminta";
  return "Menunggu persetujuan Anda";
}

function approvalDescription(status: CustomBriefApprovalStatus) {
  if (status === "approved") return "Tim Ofissio dapat melanjutkan review harga dan menyiapkan quotation resmi.";
  if (status === "revision_requested") return "Sales akan memperbarui brief sebelum meminta persetujuan kembali.";
  return "Quotation belum dibuat dan harga belum diproses sebelum brief ini Anda setujui.";
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
