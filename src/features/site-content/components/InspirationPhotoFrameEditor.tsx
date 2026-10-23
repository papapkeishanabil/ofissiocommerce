"use client";

import { useRef, useState } from "react";
import type { IndustryInspirationData } from "../content.schema";
import { draggedImagePosition, HOME_FRAME_RATIOS, homeImageFrame, type HomeFrameKind, type ImageFrame } from "../inspiration-framing";

export function InspirationPhotoFrameEditor({ value, onChange, featureOnly = false }: { featureOnly?: boolean; value: IndustryInspirationData; onChange: (patch: Partial<IndustryInspirationData>) => void }) {
  const [target, setTarget] = useState<HomeFrameKind | "hero">(featureOnly ? "feature" : value.industry === "Corporate" ? "corporate" : "card");
  const [mobile, setMobile] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; start: ImageFrame } | null>(null);
  const [failed, setFailed] = useState(false);
  const hero = target === "hero";
  const frame: ImageFrame = hero ? { x: value.focalX, y: value.focalY, fit: value.industry === "Bengkel" ? "cover" : "contain" } : homeImageFrame(value, target);
  const ratio = hero ? (value.industry === "Bengkel" ? (mobile ? 390 / 820 : 1440 / 844) : (mobile ? 4 / 3 : 16 / 10)) : target === "feature" && mobile ? 4 / 5 : HOME_FRAME_RATIOS[target as HomeFrameKind];
  function update(next: ImageFrame) {
    if (hero) onChange({ focalX: next.x, focalY: next.y });
    else onChange({ homepageFrames: { ...value.homepageFrames, [target]: next } });
  }
  return <section className="mb-5 space-y-4 rounded-2xl border border-line bg-white p-4 sm:p-5" aria-label="Bingkai foto website">
    <div><h3 className="text-base font-bold text-ink">Atur tampilan foto di website</h3><p className="mt-1 text-sm text-ink-muted">Pilih bingkai, lalu geser foto untuk menentukan bagian yang terlihat. Foto besar bisnis diatur melalui kolom khusus di bagian atas editor. Pengaturan kartu industri terpisah dari foto besar dan pin anotasi.</p></div>
    <div className="flex flex-wrap items-end gap-4">
      {!featureOnly && <label className="text-sm font-semibold">Lokasi foto<select className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3" value={target} onChange={(e) => setTarget(e.target.value as typeof target)}><option value="feature">Beranda — foto besar bisnis</option><option value="card">Beranda — kartu industri</option><option value="corporate">Beranda — foto korporasi</option><option value="hero">Halaman inspirasi</option></select></label>}
      <label className="text-sm font-semibold">Pratinjau<select className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3" value={mobile ? "mobile" : "desktop"} onChange={(e) => setMobile(e.target.value === "mobile")}><option value="desktop">Desktop</option><option value="mobile">Ponsel</option></select></label>
      {!hero && <label className="text-sm font-semibold">Tampilan foto<select className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3" value={frame.fit} onChange={(e) => update({ ...frame, fit: e.target.value as ImageFrame["fit"] })}><option value="cover">Penuhi bingkai</option><option value="contain">Tampilkan foto utuh</option></select></label>}
    </div>
    <div className="rounded-xl bg-slate-100 p-4">
      <div role="group" aria-label="Geser foto dalam bingkai" tabIndex={0}
        className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-[#e8e3da] outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-700"
        style={{ aspectRatio: ratio, width: `min(100%, ${Math.min(mobile ? 390 : 900, ratio * 480)}px)`, cursor: "grab" }}
        onPointerDown={(e) => { if (!imageRef.current?.naturalWidth) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, start: frame }; }}
        onPointerMove={(e) => { const d = drag.current; const img = imageRef.current; if (!d || d.pointer !== e.pointerId || !img) return; const rect = e.currentTarget.getBoundingClientRect(); update(draggedImagePosition(d.start, e.clientX - d.x, e.clientY - d.y, rect.width, rect.height, img.naturalWidth, img.naturalHeight)); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={(e) => { const step = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[e.key]; if (!step) return; e.preventDefault(); update({ ...frame, x: Math.max(0, Math.min(100, frame.x + step[0]!)), y: Math.max(0, Math.min(100, frame.y + step[1]!)) }); }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uses the original uploaded image for precise framing */}
        <img key={value.image} ref={imageRef} src={value.image} alt={value.imageAlt || "Pratinjau bingkai foto"} draggable={false} onLoad={() => setFailed(false)} onError={() => setFailed(true)} className="pointer-events-none absolute inset-0 h-full w-full" style={{ objectFit: frame.fit, objectPosition: `${frame.x}% ${frame.y}%` }} />
        {failed && <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm">Foto belum dapat dimuat. Periksa URL atau unggah ulang.</p>}
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{(["x", "y"] as const).map((axis) => <label key={axis} className="text-sm">{axis === "x" ? "Posisi horizontal" : "Posisi vertikal"}: {frame[axis]}%<input aria-label={axis === "x" ? "Posisi horizontal foto" : "Posisi vertikal foto"} type="range" min="0" max="100" step="0.1" value={frame[axis]} onChange={(e) => update({ ...frame, [axis]: Number(e.target.value) })} className="block h-10 w-full accent-brand-700" /></label>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-xs text-ink-muted">Desktop dan ponsel menggunakan posisi yang sama. Geser hanya berpengaruh pada arah yang memiliki ruang potong atau ruang kosong. Bingkai inspirasi Bengkel menyesuaikan tinggi layar; pratinjau memakai contoh layar 1440 × 900 atau 390 × 844. Simpan perubahan setelah selesai.</p><button type="button" className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold" onClick={() => update({ ...frame, x: 50, y: 50 })}>Posisikan di tengah</button></div>
  </section>;
}
