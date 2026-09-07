"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ClipboardCheck, PenLine, RotateCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type {
  BriefGender,
  BriefSignature,
  CustomBriefApprovalStatus,
  QuotationRequestRecord,
  TechnicalGarmentSpecification,
} from "@/features/quotation/quotation.types";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import type { AuthSession } from "@/types/account";

const CONSENT_TEXT =
  "Dengan menandatangani lembar ini, pemesan menyetujui desain, bahan, warna, posisi bordir, dan jumlah yang tercantum. Perubahan setelah tanda tangan dihitung sebagai revisi baru.";

const GENDER_ROWS: Array<{ gender: BriefGender | "unspecified"; label: string }> = [
  { gender: "men", label: "Pria" },
  { gender: "women", label: "Wanita" },
  { gender: "custom", label: "Custom" },
  { gender: "unspecified", label: "Umum" },
];

export function CustomBriefApprovalPage({ id }: { id: string }) {
  const { session, hydrated, isAuthenticated } = useAuth();
  const openAuth = useUIStore((state) => state.openAuth);
  const [brief, setBrief] = useState<QuotationRequestRecord | null>(null);
  const [approvalStatus, setApprovalStatus] =
    useState<CustomBriefApprovalStatus>("pending_customer_approval");
  const [loading, setLoading] = useState(true);
  const [revisionNote, setRevisionNote] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
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
    if (
      action === "approve" &&
      (signerName.trim().length < 2 || signerTitle.trim().length < 2 || !consentAccepted)
    ) {
      setMessage("Isi nama dan jabatan penandatangan, lalu centang klausa persetujuan.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/custom-briefs/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(session) },
          body: JSON.stringify(
            action === "approve"
              ? {
                  action,
                  signerName: signerName.trim(),
                  signerTitle: signerTitle.trim(),
                  consentAccepted: true,
                }
              : { action, note: revisionNote.trim() },
          ),
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
            ? "Brief sudah disetujui dan ditandatangani secara digital. Tim Ofissio sekarang dapat menyiapkan quotation."
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
  const revisionNo = productionBrief.revisionNo ?? 0;
  const locked = approvalStatus === "approved" || approvalStatus === "revision_requested";
  const activeSignatures = (productionBrief.signatures ?? []).filter((item) => !item.revokedAt);
  const revokedSignatures = (productionBrief.signatures ?? []).filter((item) => item.revokedAt);
  const initialRequest = productionBrief.customerRequestSnapshot;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft-md">
        <header className="bg-brand-950 px-5 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="type-eyebrow text-brand-200">Lembar approval desain — Full Custom</p>
            {revisionNo > 0 ? (
              <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-200">
                Revisi {String(revisionNo).padStart(2, "0")}
                {productionBrief.revisedAt ? ` · ${formatDate(productionBrief.revisedAt)}` : ""}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {productionBrief.projectName ?? "Brief seragam Full Custom"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-100">
            {initialRequest
              ? "Lembar berikut adalah hasil konsultasi tim Ofissio atas permintaan awal Anda. Bandingkan dengan permintaan awal Anda sebelum menandatangani."
              : "Brief ini dicatat oleh CS Ofissio berdasarkan percakapan Anda. Periksa spesifikasi, posisi bordir, dan jumlah sebelum menandatangani."}
          </p>
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Perusahaan" value={brief.companyName} />
            <Summary label="PIC" value={brief.picName} />
            <Summary label="Estimasi qty" value={`${productionBrief.estimatedQuantity ?? brief.totalQty} pcs`} />
            <Summary label="No. PO klien" value={productionBrief.externalReference ?? "—"} />
          </div>
          <div className="rounded-2xl border border-line bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Ringkasan kebutuhan</p>
            <p className="mt-2 text-sm leading-6 text-ink">{productionBrief.designDescription}</p>
            {productionBrief.targetDate ? (
              <p className="mt-2 text-sm text-ink-muted"><strong className="text-ink">Target selesai:</strong> {formatDate(productionBrief.targetDate)}</p>
            ) : null}
          </div>

          {initialRequest ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Permintaan awal Anda</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Tercatat saat permintaan Anda diterima{initialRequest.capturedAt ? ` (${formatDate(initialRequest.capturedAt)})` : ""} — tetap disimpan sebagai pembanding atas lembar desain teknis di bawah.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {initialRequest.projectName ? <Summary label="Nama proyek" value={initialRequest.projectName} /> : null}
                {initialRequest.garmentType ? <Summary label="Jenis pakaian" value={initialRequest.garmentType} /> : null}
                {initialRequest.estimatedQuantity ? <Summary label="Estimasi qty" value={`${initialRequest.estimatedQuantity} pcs`} /> : null}
                {initialRequest.targetDate ? <Summary label="Target" value={formatDate(initialRequest.targetDate)} /> : null}
                {initialRequest.materialPreference ? <Summary label="Preferensi bahan" value={initialRequest.materialPreference} /> : null}
                {initialRequest.colorPreference ? <Summary label="Preferensi warna" value={initialRequest.colorPreference} /> : null}
                {initialRequest.usageContext ? <Summary label="Konteks pemakaian" value={initialRequest.usageContext} /> : null}
                {initialRequest.sizeNotes ? <Summary label="Catatan ukuran" value={initialRequest.sizeNotes} /> : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-ink">{initialRequest.designDescription}</p>
              {initialRequest.referenceFiles.length > 0 ? (
                <p className="mt-2 text-xs text-ink-muted">
                  File referensi Anda: {initialRequest.referenceFiles.map((file) => file.fileName).join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {(productionBrief.technicalSpecifications?.length ?? 0) > 0 ? (
            <div>
              <h2 className="text-lg font-black text-ink">Spesifikasi per item</h2>
              <div className="mt-3 space-y-4">
                {productionBrief.technicalSpecifications?.map((garment, index) => (
                  <GarmentSheet key={garment.id} garment={garment} itemNumber={index + 1} session={session} />
                ))}
              </div>
            </div>
          ) : null}

          {(productionBrief.customAdjustments?.length ?? 0) > 0 ? (
            <div>
              <h2 className="text-lg font-black text-ink">Catatan custom</h2>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5">Ukuran</th>
                      <th className="px-4 py-2.5">Warna</th>
                      <th className="px-4 py-2.5">Perubahan</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {productionBrief.customAdjustments?.map((adjustment) => (
                      <tr key={adjustment.id}>
                        <td className="px-4 py-2.5 font-bold text-ink">{adjustment.size}</td>
                        <td className="px-4 py-2.5 text-ink-muted">{adjustment.color ?? "—"}</td>
                        <td className="px-4 py-2.5 text-ink">{adjustment.changeNote}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-ink">{adjustment.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className={`rounded-2xl border p-4 ${approvalStatus === "approved" ? "border-emerald-200 bg-emerald-50" : approvalStatus === "revision_requested" ? "border-amber-200 bg-amber-50" : "border-brand-200 bg-brand-50"}`}>
            <div className="flex items-start gap-3">
              {approvalStatus === "approved" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden="true" /> : <ClipboardCheck className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />}
              <div>
                <p className="font-black text-ink">{approvalLabel(approvalStatus)}</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{approvalDescription(approvalStatus)}</p>
                {approvalStatus === "revision_requested" && productionBrief.approvalRevisionNote ? (
                  <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-ink"><strong>Catatan revisi Anda:</strong> {productionBrief.approvalRevisionNote}</p>
                ) : null}
              </div>
            </div>
          </div>

          {(activeSignatures.length > 0) || (revokedSignatures.length > 0) ? (
            <div>
              <h2 className="text-lg font-black text-ink">Riwayat tanda tangan</h2>
              <ul className="mt-3 space-y-2">
                {activeSignatures.map((signature, index) => (
                  <SignatureRow key={`${signature.party}-${signature.signedAt}-${index}`} signature={signature} />
                ))}
                {revokedSignatures.map((signature, index) => (
                  <SignatureRow key={`revoked-${signature.party}-${signature.signedAt}-${index}`} signature={signature} />
                ))}
              </ul>
            </div>
          ) : null}

          {!locked ? (
            <div className="space-y-4 rounded-2xl border border-line bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-brand-700" aria-hidden="true" />
                <h2 className="font-black text-ink">Tanda tangan digital pemesan</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-ink">Nama penandatangan</span>
                  <input value={signerName} onChange={(event) => setSignerName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="cth. dr. Anita Wijaya" maxLength={120} />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-ink">Jabatan</span>
                  <input value={signerTitle} onChange={(event) => setSignerTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="cth. Owner Apotek Klinik" maxLength={120} />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-700" />
                <span className="text-sm leading-6 text-ink">{CONSENT_TEXT}</span>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink">Catatan revisi (jika perlu)</span>
                <textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="Contoh: warna panel bahu diubah menjadi navy." />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button disabled={isPending} onClick={() => respond("approve")}><ShieldCheck className="h-4 w-4" aria-hidden="true" />Setujui &amp; tanda tangan</Button>
                <Button variant="outline" disabled={isPending} onClick={() => respond("request_revision")}><RotateCcw className="h-4 w-4" aria-hidden="true" />Minta revisi</Button>
              </div>
            </div>
          ) : null}
          {message ? <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-ink" role="status">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}

function GarmentSheet({
  garment,
  itemNumber,
  session,
}: {
  garment: TechnicalGarmentSpecification;
  itemNumber: number;
  session: AuthSession;
}) {
  const specs = garment.specifications.filter((item) => item.status !== "not_used");
  const areas = garment.embroideryAreas ?? [];
  const sizeColumns = Array.from(
    new Set(garment.sizeBreakdown.filter((item) => item.quantity > 0).map((item) => item.size)),
  );
  const genderRows = GENDER_ROWS.filter((row) =>
    garment.sizeBreakdown.some(
      (item) =>
        item.quantity > 0 &&
        (item.gender ?? "unspecified") === row.gender,
    ),
  );
  const quantityTotal = garment.sizeBreakdown.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  return (
    <article className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-ink">
          <span className="mr-2 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800">Item {String(itemNumber).padStart(3, "0")}</span>
          {garment.garmentType}
        </h3>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{quantityTotal || garment.quantity} pcs</span>
      </div>

      {garment.figureFrontFileId || garment.figureBackFileId ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {garment.figureFrontFileId ? (
            <BriefFigure fileId={garment.figureFrontFileId} label="Tampak depan" session={session} />
          ) : null}
          {garment.figureBackFileId ? (
            <BriefFigure fileId={garment.figureBackFileId} label="Tampak belakang" session={session} />
          ) : null}
        </div>
      ) : null}

      {specs.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">Detail</th>
                <th className="px-4 py-2.5">Nilai</th>
                <th className="px-4 py-2.5">Ukuran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {specs.map((spec) => (
                <tr key={spec.key} className={spec.status === "recommendation" ? "bg-amber-50/70" : undefined}>
                  <td className="px-4 py-2.5 font-bold text-ink">
                    {spec.label}
                    {spec.status === "recommendation" ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">wajib dikonfirmasi</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-ink">
                    {[spec.option, spec.detail, spec.notes].filter(Boolean).join(" · ") || "Memerlukan rekomendasi Ofissio"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">{spec.measurements ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {areas.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Bordir &amp; area logo</p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5">Area</th>
                  <th className="px-4 py-2.5">Posisi</th>
                  <th className="px-4 py-2.5">Maks. ukuran</th>
                  <th className="px-4 py-2.5">Teknik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {areas.map((area) => (
                  <tr key={area.zone}>
                    <td className="px-4 py-2.5">
                      <span className="inline-grid h-7 w-7 place-items-center rounded-md border-2 border-red-400 text-xs font-black text-red-600">{area.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink">
                      {zoneLabel(area.zone)}
                      {area.positionNote ? ` — ${area.positionNote}` : ""}
                      {area.offsetXCm != null || area.offsetYCm != null ? (
                        <span className="text-ink-muted"> (offset {area.offsetXCm ?? 0};{area.offsetYCm ?? 0} cm)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-ink">{area.widthCm} × {area.heightCm} cm</td>
                    <td className="px-4 py-2.5 text-ink-muted">{techniqueLabel(area.technique)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {sizeColumns.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Jumlah per ukuran</p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5">Kelompok</th>
                  {sizeColumns.map((size) => (
                    <th key={size} className="px-3 py-2.5 text-center">{size}</th>
                  ))}
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {genderRows.map((row) => (
                  <tr key={row.gender}>
                    <td className="px-4 py-2.5 font-bold text-ink">{row.label}</td>
                    {sizeColumns.map((size) => (
                      <td key={size} className="px-3 py-2.5 text-center text-ink-muted">
                        {garment.sizeBreakdown.find(
                          (item) => item.size === size && (item.gender ?? "unspecified") === row.gender,
                        )?.quantity ?? "—"}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-bold text-ink">
                      {garment.sizeBreakdown
                        .filter((item) => (item.gender ?? "unspecified") === row.gender)
                        .reduce((total, item) => total + item.quantity, 0)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black text-ink">
                  <td className="px-4 py-2.5">Total</td>
                  {sizeColumns.map((size) => (
                    <td key={size} className="px-3 py-2.5 text-center">
                      {garment.sizeBreakdown
                        .filter((item) => item.size === size)
                        .reduce((total, item) => total + item.quantity, 0)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">{quantityTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function BriefFigure({
  fileId,
  label,
  session,
}: {
  fileId: string;
  label: string;
  session: AuthSession;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/files/${fileId}/signed-url`, {
          cache: "no-store",
          headers: authHeaders(session),
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string };
        if (response.ok && result.ok && result.url) setUrl(result.url);
      } catch {
        // Aborted or offline — placeholder stays.
      }
    }
    void load();
    return () => controller.abort();
  }, [fileId, session]);

  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-slate-50">
      <div className="grid h-56 place-items-center bg-white">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} mockup`} className="h-56 w-full object-contain" />
        ) : (
          <div className="h-56 w-full animate-pulse bg-slate-100" />
        )}
      </div>
      <figcaption className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</figcaption>
    </figure>
  );
}

function SignatureRow({ signature }: { signature: BriefSignature }) {
  const revoked = Boolean(signature.revokedAt);
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 ${
        revoked ? "border-line bg-slate-50 text-ink-muted line-through" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <span className="text-sm">
        <strong className={revoked ? "" : "text-emerald-900"}>{partyLabel(signature.party)}</strong>
        {" · "}
        {signature.signerName} — {signature.signerTitle}
      </span>
      <span className={`text-xs font-semibold ${revoked ? "text-ink-muted" : "text-emerald-700"}`}>
        {revoked
          ? `dicabut ${formatDate(signature.revokedAt!)}`
          : `ditandatangani ${formatDate(signature.signedAt)}`}
        {signature.revisionNo > 0 ? ` · Revisi ${String(signature.revisionNo).padStart(2, "0")}` : ""}
      </span>
    </li>
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

function partyLabel(party: BriefSignature["party"]) {
  if (party === "design") return "Desain";
  if (party === "production") return "Produksi";
  return "Pemesan";
}

function zoneLabel(zone: string) {
  const labels: Record<string, string> = {
    left_chest: "Dada kiri",
    right_chest: "Dada kanan",
    left_sleeve: "Lengan kiri",
    right_sleeve: "Lengan kanan",
    upper_back: "Punggung atas",
    middle_back: "Punggung tengah",
    center_back: "Punggung tengah",
  };
  return labels[zone] ?? zone;
}

function techniqueLabel(technique: string) {
  if (technique === "print") return "Sablon";
  if (technique === "patch") return "Patch";
  return "Bordir";
}

function formatDate(value: string) {
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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
