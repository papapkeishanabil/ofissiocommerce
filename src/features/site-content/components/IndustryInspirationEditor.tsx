"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  Bot,
  CheckCircle2,
  Crosshair,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { optimizeProductImage } from "@/features/products/components/product-image-optimization.client";
import {
  DEFAULT_INDUSTRY_INSPIRATION,
  industryInspirationSchema,
  type IndustryInspirationAnnotation,
  type IndustryInspirationData,
} from "@/features/site-content/content.schema";
import { buildBentConnector } from "@/features/site-content/inspiration-connector.geometry";
import { mergeInspirationSuggestions, type InspirationPlacement } from "@/features/site-content/industry-inspiration.draft";
import { INDUSTRIES } from "@/types/industry";
import { cn } from "@/lib/utils";
import { InspirationPhotoFrameEditor } from "./InspirationPhotoFrameEditor";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";

// Do not replace another industry's draft with Bengkel when the user clears
// a required text field to rewrite it. Strict validation still runs on Save.
const inspirationDraftSchema = industryInspirationSchema.extend({
  eyebrow: z.string(), title: z.string(), lede: z.string(),
  image: z.string(), imageAlt: z.string(),
  annotations: z.array(z.object({
    id: z.string(), number: z.string(), title: z.string(), description: z.string(),
    anchorX: z.number(), anchorY: z.number(), labelX: z.number(), labelY: z.number(), hidden: z.boolean(),
  })),
});

type DragTarget = { index: number; kind: "anchor" | "label"; pointerId: number };

function cloneDefault(): IndustryInspirationData {
  return JSON.parse(JSON.stringify(DEFAULT_INDUSTRY_INSPIRATION)) as IndustryInspirationData;
}

function normalizeValue(value: unknown): IndustryInspirationData {
  const parsed = inspirationDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : cloneDefault();
}

function clampPercent(value: number) {
  return Math.min(98, Math.max(2, Math.round(value * 10) / 10));
}

function connectorPoints(pin: IndustryInspirationAnnotation) {
  return buildBentConnector(
    { x: pin.anchorX, y: pin.anchorY },
    { x: pin.labelX, y: pin.labelY },
    {
      markerRadius: 1.85,
      markerGap: 0.12,
      maxAnchorStem: 3.4,
      maxMarkerStem: 2.6,
    },
  );
}

export function IndustryInspirationEditor({
  label,
  help,
  value: rawValue,
  onChange,
}: {
  label: string;
  help?: string;
  value: unknown;
  onChange: (next: IndustryInspirationData) => void;
}) {
  const value = normalizeValue(rawValue);
  const latestValue = useRef(value);
  const mounted = useRef(true);
  const pendingRequests = useRef(new Set<AbortController>());
  useEffect(() => { latestValue.current = value; }, [value]);
  useEffect(() => {
    mounted.current = true;
    const requests = pendingRequests.current;
    return () => {
      mounted.current = false;
      for (const request of requests) request.abort();
      requests.clear();
    };
  }, []);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const selected = value.annotations[selectedIndex] ?? value.annotations[0];

  function commitValue(next: IndustryInspirationData) {
    if (!mounted.current) return;
    latestValue.current = next;
    onChange(next);
  }

  function patchValue(patch: Partial<IndustryInspirationData>) {
    commitValue({ ...latestValue.current, ...patch });
  }

  function patchAnnotation(index: number, patch: Partial<IndustryInspirationAnnotation>) {
    patchValue({
      annotations: value.annotations.map((annotation, itemIndex) =>
        itemIndex === index ? { ...annotation, ...patch } : annotation,
      ),
    });
  }

  function beginDrag(index: number, kind: DragTarget["kind"], event: React.PointerEvent) {
    event.preventDefault();
    setSelectedIndex(index);
    setDragTarget({ index, kind, pointerId: event.pointerId });
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragTarget || dragTarget.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    patchAnnotation(
      dragTarget.index,
      dragTarget.kind === "anchor"
        ? { anchorX: x, anchorY: y }
        : { labelX: x, labelY: y },
    );
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragTarget || dragTarget.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragTarget(null);
  }

  async function analyzeImage(image = value.image, snapshot = value) {
    if (!image) {
      setMessage({ kind: "err", text: "Unggah atau isi URL gambar terlebih dahulu." });
      return;
    }
    setAnalyzing(true);
    setMessage({ kind: "info", text: "AI sedang membaca posisi seragam dan ruang kosong pada gambar…" });
    const controller = new AbortController();
    pendingRequests.current.add(controller);
    try {
      const response = await fetch("/api/admin/site-content/inspiration/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-ofissio-internal-role": "product_admin",
          "x-ofissio-internal-user-id": "product-admin-dev",
        },
        body: JSON.stringify({
          image,
          title: snapshot.title,
          annotations: snapshot.annotations.map(({ id, title }) => ({ id, title })),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        focalX?: number;
        focalY?: number;
        placements?: InspirationPlacement[];
      };
      if (!mounted.current || controller.signal.aborted) return;
      if (!response.ok || !result.ok || !Array.isArray(result.placements)) {
        setMessage({ kind: "err", text: result.message ?? "AI belum dapat menganalisis gambar." });
        return;
      }
      const next = mergeInspirationSuggestions(latestValue.current, { ...snapshot, image }, { ...result, placements: result.placements });
      if (!next) {
        setMessage({ kind: "info", text: "Gambar sudah berubah. Hasil analisis lama diabaikan; jalankan analisis untuk gambar terbaru." });
        return;
      }
      commitValue(next);
      setMessage({
        kind: "ok",
        text: "Saran AI diterapkan pada pin yang belum Anda ubah. Periksa setiap garis sebelum menyimpan.",
      });
    } catch {
      if (mounted.current && !controller.signal.aborted) setMessage({ kind: "err", text: "Analisis AI gagal. Periksa koneksi dan konfigurasi Gemini." });
    } finally {
      pendingRequests.current.delete(controller);
      if (mounted.current) setAnalyzing(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    const originalImage = latestValue.current.image;
    const controller = new AbortController();
    pendingRequests.current.add(controller);
    try {
      const { file: prepared } = await optimizeProductImage(file);
      if (!mounted.current || controller.signal.aborted) return;
      const formData = new FormData();
      formData.append("file", prepared);
      const response = await fetch("/api/admin/site-content/upload", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "x-ofissio-internal-role": "product_admin",
          "x-ofissio-internal-user-id": "product-admin-dev",
        },
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        message?: string;
      };
      if (!mounted.current || controller.signal.aborted) return;
      if (!response.ok || !result.ok || !result.url) {
        setMessage({ kind: "err", text: result.message ?? "Gambar gagal diunggah." });
        return;
      }
      if (latestValue.current.image !== originalImage) {
        setMessage({ kind: "info", text: "Pilihan gambar sudah berubah. Hasil unggahan tidak mengganti gambar terbaru." });
        return;
      }
      const next = { ...latestValue.current, image: result.url, imageAlt: latestValue.current.imageAlt || file.name };
      commitValue(next);
      setMessage({ kind: "ok", text: "Gambar terunggah. Analisis AI dimulai otomatis…" });
      await analyzeImage(result.url, next);
    } catch {
      if (mounted.current && !controller.signal.aborted) setMessage({ kind: "err", text: "Gambar gagal diunggah. Periksa koneksi lalu coba lagi." });
    } finally {
      pendingRequests.current.delete(controller);
      if (mounted.current) setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addAnnotation() {
    if (value.annotations.length >= 8) return;
    const number = String(value.annotations.length + 1).padStart(2, "0");
    const next: IndustryInspirationAnnotation = {
      id: `point-${Date.now()}`,
      number,
      title: "Keunggulan baru",
      description: "Jelaskan manfaat yang dirasakan pengguna.",
      anchorX: 50,
      anchorY: 50,
      labelX: 70,
      labelY: 50,
      hidden: false,
    };
    patchValue({ annotations: [...value.annotations, next] });
    setSelectedIndex(value.annotations.length);
  }

  function deleteSelected() {
    if (!selected || value.annotations.length <= 1) return;
    patchValue({ annotations: value.annotations.filter((_, index) => index !== selectedIndex) });
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  }

  return (
    <Field label={label} hint={help}>
      <InspirationPhotoFrameEditor value={value} onChange={patchValue} />
      <div className="overflow-hidden rounded-2xl border border-line bg-slate-50/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-black text-ink">Editor pin anotasi</p>
              <p className="text-xs text-ink-muted">Titik bulat = seragam, label bernomor = penjelasan</p>
            </div>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(event) => patchValue({ enabled: event.target.checked })}
              className="h-4 w-4 accent-brand-700"
            />
            Tampilkan pin anotasi
          </label>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
          <div className="border-b border-line bg-[#061126] p-3 sm:p-5 xl:border-b-0 xl:border-r">
            <div
              ref={canvasRef}
              className={cn(
                "relative isolate mx-auto max-h-[680px] touch-none select-none overflow-hidden rounded-xl border border-white/15 bg-[#08172e] shadow-2xl",
                dragTarget ? "cursor-grabbing" : "cursor-crosshair",
              )}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview supports WordPress URLs selected at runtime */}
              <img
                src={value.image}
                alt={value.imageAlt || "Pratinjau gambar inspirasi"}
                className="block max-h-[680px] w-full object-contain"
                draggable={false}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,11,27,0.44),rgba(3,11,27,0.02)_62%,rgba(3,11,27,0.30))]" aria-hidden />
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {value.annotations.filter((pin) => !pin.hidden).map((pin) => (
                  <g key={pin.id}>
                    <polyline
                      points={connectorPoints(pin)}
                      fill="none"
                      stroke="#e7a51a"
                      strokeWidth={selected?.id === pin.id ? 2 : 1.25}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle cx={pin.anchorX} cy={pin.anchorY} r="0.42" fill="#e7a51a" vectorEffect="non-scaling-stroke" />
                  </g>
                ))}
              </svg>
              {value.annotations.filter((pin) => !pin.hidden).map((pin, visibleIndex) => {
                const index = value.annotations.findIndex((candidate) => candidate.id === pin.id);
                const active = selected?.id === pin.id;
                return (
                  <div key={pin.id}>
                    <button
                      type="button"
                      aria-label={`Geser titik jangkar ${pin.number}`}
                      onPointerDown={(event) => beginDrag(index, "anchor", event)}
                      className={cn(
                        "absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ochre-400 shadow-[0_0_0_4px_rgba(231,165,26,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                        active && "h-6 w-6 bg-white ring-2 ring-ochre-400",
                      )}
                      style={{ left: `${pin.anchorX}%`, top: `${pin.anchorY}%` }}
                    >
                      <span className="sr-only">Titik pada seragam</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Geser label ${pin.number}: ${pin.title}`}
                      onPointerDown={(event) => beginDrag(index, "label", event)}
                      className={cn(
                        "group absolute z-20 h-9 w-9 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                      )}
                      style={{ left: `${pin.labelX}%`, top: `${pin.labelY}%` }}
                    >
                      <span className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ochre-300 bg-[#07162b]/90 text-[10px] font-black text-ochre-300 backdrop-blur-sm",
                        active && "shadow-[0_0_0_4px_rgba(255,255,255,0.28)]",
                      )}>
                        {pin.number}
                      </span>
                      <span className={cn(
                        "absolute top-[calc(100%+0.3rem)] w-36 text-xs font-black leading-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.95)] sm:text-sm",
                        pin.labelX >= pin.anchorX ? "left-1 text-left" : "right-1 text-right",
                      )}>
                        {pin.title}
                      </span>
                    </button>
                    {visibleIndex === 0 && !dragTarget ? (
                      <span className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                        Geser titik dan label langsung pada gambar
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading || analyzing} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
                {uploading ? "Mengunggah…" : "Ganti gambar"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={uploading || analyzing || !value.image} onClick={() => void analyzeImage()}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden />}
                {analyzing ? "Menganalisis…" : "Deteksi ulang dengan AI"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
            {message ? (
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-bold leading-5",
                  message.kind === "ok" && "bg-emerald-50 text-emerald-800",
                  message.kind === "err" && "bg-red-50 text-red-700",
                  message.kind === "info" && "bg-blue-50 text-blue-800",
                )}
              >
                {message.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {message.text}
              </p>
            ) : null}
          </div>

          <div className="space-y-5 bg-white p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Industri halaman ini">
                <Select
                  value={value.industry}
                  disabled
                  aria-readonly="true"
                  onChange={(event) => {
                    // Opsi select berasal dari INDUSTRIES; find() mempersempit
                    // string event DOM ke anggota enum (bukan cast buta).
                    const next = INDUSTRIES.find((industry) => industry === event.target.value);
                    if (next) patchValue({ industry: next });
                  }}
                >
                  {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
                </Select>
              </Field>
              <Field label="Alamat halaman (tetap)">
                <Input value={`/inspirasi/${value.slug}`} readOnly aria-readonly="true" />
              </Field>
            </div>
            <Field label="Eyebrow">
              <Input value={value.eyebrow} maxLength={80} onChange={(event) => patchValue({ eyebrow: event.target.value })} />
            </Field>
            <Field label="Judul utama">
              <Textarea rows={3} value={value.title} maxLength={180} onChange={(event) => patchValue({ title: event.target.value })} />
            </Field>
            <Field label="Paragraf pengantar">
              <Textarea rows={3} value={value.lede} maxLength={420} onChange={(event) => patchValue({ lede: event.target.value })} />
            </Field>
            <Field label="URL gambar">
              <Input value={value.image} maxLength={500} onChange={(event) => patchValue({ image: event.target.value })} />
            </Field>
            <Field label="Alt gambar">
              <Input value={value.imageAlt} maxLength={180} onChange={(event) => patchValue({ imageAlt: event.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Fokus horizontal ${Math.round(value.focalX)}%`}>
                <input type="range" min="0" max="100" value={value.focalX} onChange={(event) => patchValue({ focalX: Number(event.target.value) })} className="h-10 w-full accent-brand-700" />
              </Field>
              <Field label={`Fokus vertikal ${Math.round(value.focalY)}%`}>
                <input type="range" min="0" max="100" value={value.focalY} onChange={(event) => patchValue({ focalY: Number(event.target.value) })} className="h-10 w-full accent-brand-700" />
              </Field>
            </div>

            <div className="border-t border-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-ink">Pin keunggulan</h4>
                  <p className="text-xs leading-5 text-ink-muted">Pilih pin, ubah teks, lalu geser posisinya pada gambar.</p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={value.annotations.length >= 8} onClick={addAnnotation}>
                  <Plus className="h-4 w-4" aria-hidden /> Tambah
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Daftar pin anotasi">
                {value.annotations.map((annotation, index) => (
                  <button
                    key={annotation.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedIndex === index}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                      selectedIndex === index ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-ink hover:bg-slate-50",
                    )}
                  >
                    {annotation.hidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
                    {annotation.number}
                  </button>
                ))}
              </div>

              {selected ? (
                <div className="mt-4 space-y-3 rounded-xl border border-line bg-slate-50 p-4">
                  <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                    <Field label="Nomor">
                      <Input value={selected.number} maxLength={4} onChange={(event) => patchAnnotation(selectedIndex, { number: event.target.value })} />
                    </Field>
                    <Field label="Judul keunggulan">
                      <Input value={selected.title} maxLength={90} onChange={(event) => patchAnnotation(selectedIndex, { title: event.target.value })} />
                    </Field>
                  </div>
                  <Field label="Penjelasan saat pin dipilih">
                    <Textarea rows={2} value={selected.description} maxLength={240} onChange={(event) => patchAnnotation(selectedIndex, { description: event.target.value })} />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink">
                      <input type="checkbox" checked={selected.hidden} onChange={(event) => patchAnnotation(selectedIndex, { hidden: event.target.checked })} className="h-4 w-4 accent-brand-700" />
                      Sembunyikan pin
                    </label>
                    <Button type="button" variant="ghost" size="sm" disabled={value.annotations.length <= 1} onClick={deleteSelected}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Hapus pin
                    </Button>
                  </div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-ink-muted">
                    <Crosshair className="h-3.5 w-3.5" aria-hidden />
                    Jangkar {selected.anchorX.toFixed(1)}%, {selected.anchorY.toFixed(1)}%, Label {selected.labelX.toFixed(1)}%, {selected.labelY.toFixed(1)}%
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Field>
  );
}
