"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Factory,
  FileText,
  LoaderCircle,
  Paperclip,
  Ruler,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import type { AuthSession } from "@/types/account";
import type {
  ProductionReferenceFile,
  QuotationRequestRecord,
} from "@/features/quotation/quotation.types";

const GARMENT_TYPES = [
  "Kemeja kantor",
  "Kemeja lapangan",
  "Wearpack",
  "Jaket kerja",
  "Polo shirt",
  "Rompi",
  "Seragam medis",
  "Lainnya",
] as const;

interface FormState {
  projectName: string;
  garmentType: string;
  estimatedQuantity: string;
  usageContext: string;
  designDescription: string;
  materialPreference: string;
  colorPreference: string;
  sizeNotes: string;
  targetDate: string;
  customerNotes: string;
}

const INITIAL_FORM: FormState = {
  projectName: "",
  garmentType: "",
  estimatedQuantity: "",
  usageContext: "",
  designDescription: "",
  materialPreference: "",
  colorPreference: "",
  sizeNotes: "",
  targetDate: "",
  customerNotes: "",
};

export function CustomRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session, hydrated, isAuthenticated } = useAuth();
  const openAuth = useUIStore((state) => state.openAuth);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [references, setReferences] = useState<ProductionReferenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const readyToSubmit = useMemo(
    () =>
      form.projectName.trim().length >= 3 &&
      form.garmentType.trim().length >= 2 &&
      Number(form.estimatedQuantity) > 0 &&
      form.designDescription.trim().length >= 10,
    [form],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function requestLogin() {
    openAuth({ kind: "request_quote", returnTo: "/custom-request" });
  }

  async function uploadReferences(files: FileList | null) {
    if (!files?.length) return;
    if (!session) {
      requestLogin();
      return;
    }
    const remainingSlots = 5 - references.length;
    const selected = Array.from(files).slice(0, remainingSlots);
    if (selected.length === 0) {
      setMessage("Maksimal 5 file referensi per permintaan.");
      return;
    }
    const allowed = new Set(["image/png", "image/jpeg", "application/pdf"]);
    const invalid = selected.find(
      (file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setMessage(
        `${invalid.name} ditolak. Gunakan PNG, JPG, atau PDF maksimal 10 MB.`,
      );
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          const body = new FormData();
          body.append("fileType", "artwork");
          body.append("file", file);
          body.append(
            "metadata",
            JSON.stringify({ purpose: "custom_quotation_reference" }),
          );
          const response = await fetch("/api/files/upload", {
            method: "POST",
            headers: authHeaders(session),
            body,
          });
          const result = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            message?: string;
            file?: {
              id: string;
              originalFilename: string;
              mimeType: string;
              sizeBytes: number;
            };
          };
          if (!response.ok || !result.ok || !result.file) {
            throw new Error(result.message ?? `${file.name} belum dapat diupload.`);
          }
          return {
            fileId: result.file.id,
            filename: result.file.originalFilename,
            mimeType: result.file.mimeType,
            sizeBytes: result.file.sizeBytes,
          } satisfies ProductionReferenceFile;
        }),
      );
      setReferences((current) => [...current, ...uploaded].slice(0, 5));
      setMessage(
        `${uploaded.length} file referensi siap disertakan dalam brief.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "File referensi belum dapat diupload.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.projectName.trim().length < 3) {
      next.projectName = "Isi nama proyek minimal 3 karakter.";
    }
    if (form.garmentType.trim().length < 2) {
      next.garmentType = "Pilih jenis pakaian yang ingin dibuat.";
    }
    if (!Number.isInteger(Number(form.estimatedQuantity)) || Number(form.estimatedQuantity) < 1) {
      next.estimatedQuantity = "Isi estimasi jumlah dalam angka bulat.";
    }
    if (form.designDescription.trim().length < 10) {
      next.designDescription = "Jelaskan kebutuhan desain minimal 10 karakter.";
    }
    setFieldErrors(next);
    const firstError = Object.keys(next)[0];
    if (firstError) document.getElementById(`custom-${firstError}`)?.focus();
    return Object.keys(next).length === 0;
  }

  async function submitRequest() {
    if (!validate()) return;
    if (!session) {
      requestLogin();
      return;
    }
    if (submitting || uploading) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/quotation/custom-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session),
        },
        body: JSON.stringify({
          productionBrief: {
            projectName: form.projectName.trim(),
            garmentType: form.garmentType,
            estimatedQuantity: Number(form.estimatedQuantity),
            usageContext: form.usageContext.trim() || null,
            designDescription: form.designDescription.trim(),
            materialPreference: form.materialPreference.trim() || null,
            colorPreference: form.colorPreference.trim() || null,
            sizeNotes: form.sizeNotes.trim() || null,
            targetDate: form.targetDate || null,
          },
          referenceFileIds: references.map((file) => file.fileId),
          customerNotes: form.customerNotes.trim() || null,
          picName: session.company.picName || session.user.fullName,
          picEmail: session.company.picEmail || session.user.email,
          picWhatsapp: session.company.picWhatsapp || session.user.whatsapp,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        quotation?: QuotationRequestRecord;
      };
      if (!response.ok || !result.ok || !result.quotation) {
        throw new Error(result.message ?? "Permintaan full custom belum dapat diproses.");
      }
      window.sessionStorage.setItem(
        `ofissio-quote-notification:${result.quotation.id}`,
        JSON.stringify({
          status:
            result.quotation.emailStatus === "sent"
              ? "sent"
              : result.quotation.emailStatus === "mocked"
                ? "mock"
                : result.quotation.emailStatus === "skipped"
                  ? "skipped"
                  : "failed",
          recipientEmail: result.quotation.picEmail,
          provider: result.quotation.emailResults[0]?.provider ?? "mock",
          message: "Brief full custom sudah tercatat.",
        }),
      );
      router.push(`/quotes/${result.quotation.id}?new=1`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Permintaan full custom belum dapat diproses.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Link
          href="/catalog"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke katalog
        </Link>

        <section className="mt-3 overflow-hidden rounded-3xl bg-brand-900 text-white shadow-soft-lg">
          <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ochre-400 text-brand-950">
                  <Factory className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="max-w-2xl text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                    Mulai dari ide Anda, bukan dari produk katalog.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-brand-100 sm:text-lg">
                    Jika Anda menginginkan desain sendiri, jenis bahan sendiri,
                    model atau pola khusus, kombinasi warna tertentu, maupun size
                    chart perusahaan, klik dan isi brief Full Custom di halaman ini.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/[0.06] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <p className="font-bold text-white">Kapan memilih jalur ini?</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-brand-100">
                {[
                  "Belum ada produk katalog yang sesuai",
                  "Memiliki desain atau referensi model sendiri",
                  "Memerlukan bahan, pola, atau ukuran khusus",
                  "Membutuhkan approval desain sebelum produksi",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-ochre-300" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-brand-100">
                Hanya ingin produk yang sudah tersedia?{" "}
                <Link href="/catalog" className="font-bold text-white underline underline-offset-4">
                  Pilih produk standar
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <ol className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            ["1", "Isi brief"],
            ["2", "Review sales"],
            ["3", "Penawaran & approval"],
            ["4", "Production Order"],
          ].map(([number, label], index) => (
            <li key={number} className="flex items-center gap-3 bg-white px-4 py-3">
              <span className={index === 0 ? "grid h-7 w-7 place-items-center rounded-full bg-brand-700 text-xs font-black text-white" : "grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-black text-ink-muted"}>
                {number}
              </span>
              <span className={index === 0 ? "font-bold text-ink" : "font-semibold text-ink-muted"}>{label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <FormSection
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              title="Gambaran proyek"
              description="Ceritakan apa yang akan dibuat dan untuk siapa seragam ini digunakan."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama proyek" htmlFor="custom-projectName" required error={fieldErrors.projectName} hint="Contoh: Seragam teknisi lapangan 2026">
                  <input id="custom-projectName" value={form.projectName} onChange={(event) => update("projectName", event.target.value)} maxLength={120} className={inputClass} placeholder="Nama proyek atau kebutuhan" />
                </Field>
                <Field label="Jenis pakaian" htmlFor="custom-garmentType" required error={fieldErrors.garmentType}>
                  <select id="custom-garmentType" value={form.garmentType} onChange={(event) => update("garmentType", event.target.value)} className={inputClass}>
                    <option value="">Pilih jenis pakaian</option>
                    {GARMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Kebutuhan desain, model, atau fungsi khusus" htmlFor="custom-designDescription" required error={fieldErrors.designDescription} hint="Jelaskan detail yang membedakan kebutuhan ini dari produk standar.">
                <textarea id="custom-designDescription" rows={5} value={form.designDescription} onChange={(event) => update("designDescription", event.target.value)} maxLength={1200} className={textareaClass} placeholder="Contoh: Kemeja lapangan lengan panjang dengan dua saku berpenutup, ventilasi punggung, aksen reflektif, dan pola khusus perusahaan." />
              </Field>
              <Field label="Konteks penggunaan" htmlFor="custom-usageContext" hint="Opsional. Membantu tim merekomendasikan konstruksi dan bahan.">
                <input id="custom-usageContext" value={form.usageContext} onChange={(event) => update("usageContext", event.target.value)} maxLength={300} className={inputClass} placeholder="Contoh: teknisi outdoor, area panas dan berdebu" />
              </Field>
            </FormSection>

            <FormSection
              icon={<Ruler className="h-5 w-5" aria-hidden="true" />}
              title="Bahan, warna, dan ukuran"
              description="Belum yakin bahan atau ukuran? Kosongkan bagian opsional; tim Ofissio akan memberi rekomendasi."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estimasi jumlah" htmlFor="custom-estimatedQuantity" required error={fieldErrors.estimatedQuantity} hint="Jumlah awal untuk penilaian kapasitas dan harga.">
                  <div className="relative">
                    <input id="custom-estimatedQuantity" type="number" min={1} step={1} inputMode="numeric" value={form.estimatedQuantity} onChange={(event) => update("estimatedQuantity", event.target.value)} className={`${inputClass} pr-14`} placeholder="100" />
                    <span className="pointer-events-none absolute right-4 top-3.5 text-sm font-semibold text-ink-muted">pcs</span>
                  </div>
                </Field>
                <Field label="Preferensi bahan" htmlFor="custom-materialPreference" hint="Opsional; dapat berupa jenis kain atau gramasi.">
                  <input id="custom-materialPreference" value={form.materialPreference} onChange={(event) => update("materialPreference", event.target.value)} maxLength={160} className={inputClass} placeholder="Contoh: ripstop 190 gsm" />
                </Field>
                <Field label="Warna dan kombinasi" htmlFor="custom-colorPreference" hint="Opsional; tulis warna brand atau kombinasi panel.">
                  <input id="custom-colorPreference" value={form.colorPreference} onChange={(event) => update("colorPreference", event.target.value)} maxLength={160} className={inputClass} placeholder="Contoh: navy, abu muda, aksen oranye" />
                </Field>
                <Field label="Ukuran atau pola khusus" htmlFor="custom-sizeNotes" hint="Opsional; size chart dapat dilampirkan di bawah.">
                  <input id="custom-sizeNotes" value={form.sizeNotes} onChange={(event) => update("sizeNotes", event.target.value)} maxLength={300} className={inputClass} placeholder="Contoh: mengikuti size chart perusahaan" />
                </Field>
              </div>
            </FormSection>

            <FormSection
              icon={<Paperclip className="h-5 w-5" aria-hidden="true" />}
              title="Target waktu dan referensi"
              description="Lampirkan contoh desain, foto, moodboard, atau size chart agar review lebih cepat."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target kebutuhan" htmlFor="custom-targetDate" hint="Opsional; bukan janji tanggal selesai sebelum review.">
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
                    <input id="custom-targetDate" type="date" value={form.targetDate} onChange={(event) => update("targetDate", event.target.value)} className={`${inputClass} pl-12`} />
                  </div>
                </Field>
                <div>
                  <p className="text-xs font-semibold text-ink">File referensi</p>
                  <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,application/pdf" className="sr-only" onChange={(event) => void uploadReferences(event.target.files)} />
                  <Button type="button" variant="outline" className="mt-1.5 w-full" disabled={uploading || references.length >= 5 || !hydrated} onClick={() => isAuthenticated ? fileInputRef.current?.click() : requestLogin()}>
                    {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
                    {uploading ? "Mengupload..." : isAuthenticated ? "Pilih file referensi" : "Masuk untuk upload"}
                  </Button>
                  <p className="mt-1.5 text-[11px] text-ink-muted">PNG, JPG, atau PDF · maks. 5 file · 10 MB/file</p>
                </div>
              </div>
              {references.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {references.map((file) => (
                    <li key={file.fileId} className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-line">
                      <FileText className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink" title={file.filename}>{file.filename}</p>
                        <p className="text-xs text-ink-muted">{formatFileSize(file.sizeBytes)}</p>
                      </div>
                      <button type="button" aria-label={`Hapus ${file.filename}`} onClick={() => setReferences((current) => current.filter((candidate) => candidate.fileId !== file.fileId))} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-white hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand-600">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Field label="Catatan tambahan" htmlFor="custom-customerNotes" hint="Opsional; tulis informasi komersial atau teknis lain yang perlu diketahui sales.">
                <textarea id="custom-customerNotes" rows={3} value={form.customerNotes} onChange={(event) => update("customerNotes", event.target.value)} maxLength={1000} className={textareaClass} placeholder="Contoh: perlu sample approval sebelum produksi massal." />
              </Field>
            </FormSection>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft-md">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Kirim brief Full Custom</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Request ini langsung masuk ke tim sales sebagai quotation dengan rute Production / SPK.
              </p>
              <dl className="mt-5 space-y-3 border-y border-line py-4 text-sm">
                <SummaryRow label="Proyek" value={form.projectName || "Belum diisi"} />
                <SummaryRow label="Jenis" value={form.garmentType || "Belum dipilih"} />
                <SummaryRow label="Jumlah" value={form.estimatedQuantity ? `${form.estimatedQuantity} pcs` : "Belum diisi"} />
                <SummaryRow label="Referensi" value={`${references.length} file`} />
                <SummaryRow label="Rute" value="Production / SPK" strong />
              </dl>

              {!isAuthenticated && hydrated ? (
                <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm leading-5 text-brand-900">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>Masuk atau daftar akun perusahaan saat siap mengirim brief.</p>
                  </div>
                </div>
              ) : null}

              <Button type="button" size="lg" className="mt-5 w-full" disabled={submitting || uploading || !hydrated} aria-busy={submitting} onClick={() => void submitRequest()}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {submitting ? "Mengirim brief..." : isAuthenticated ? "Kirim permintaan Full Custom" : "Masuk dan lanjutkan"}
                {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
              </Button>
              {!readyToSubmit ? <p className="mt-3 text-center text-xs leading-5 text-ink-muted">Lengkapi empat field wajib sebelum mengirim.</p> : null}
              {message ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold leading-5 text-amber-900" role="status">{message}</p> : null}

              <div className="mt-5 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
                <p className="font-bold text-ink">Setelah dikirim</p>
                <p className="mt-1">Sales meninjau feasibility, bahan, pola, harga, dan jadwal. Customer baru menerima penawaran final setelah data lengkap.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function FormSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft-sm sm:p-6">
      <div className="flex items-start gap-3 border-b border-line pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "max-w-[11rem] text-right font-extrabold text-brand-800" : "max-w-[11rem] break-words text-right font-bold text-ink"}>{value}</dd>
    </div>
  );
}

const inputClass = "min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink shadow-soft-xs outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const textareaClass = `${inputClass} resize-y leading-6`;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
