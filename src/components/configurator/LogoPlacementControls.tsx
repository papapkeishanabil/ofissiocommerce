"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { EmbroideryZone, LogoPlacement } from "@/types/uniform-3d";
import { zoneLabel } from "@/types/uniform-3d";
import { logoWidthRange, offsetToModelPosition, placementModelAxis, placementOffsetCm } from "./placement-controls";
import styles from "./Studio.module.css";

interface LogoPlacementControlsProps {
  unitsPerCm?: number;
  zone: EmbroideryZone;
  placement: LogoPlacement | null;
  maxWidthCm?: number;
  maxHeightCm?: number;
  disabled?: boolean;
  onChangeSize: (widthCm: number) => void;
  onChangeRotation: (rotation: number) => void;
  onRemove: () => void;
  onChangePosition?: (axis: "x" | "y" | "z", offset: number) => void;
}

export function LogoPlacementControls({ zone, placement, maxWidthCm, maxHeightCm, disabled, unitsPerCm,
  onChangeSize, onChangeRotation, onRemove, onChangePosition }: LogoPlacementControlsProps) {
  const range = logoWidthRange(placement ? placement.widthCm / placement.heightCm : 1, maxWidthCm, maxHeightCm);
  const inactive = disabled || !placement || range.max < range.min;
  return (
    <section aria-label={`Pengaturan ${zoneLabel(zone)}`} key={zone}>
      <h3 className={styles.label}>Mengedit: {zoneLabel(zone)}</h3>
      <p className={styles.help}>Ukuran dan posisi di bawah hanya untuk {zoneLabel(zone)}. Pilih zona lain pada daftar Bordir Anda untuk mengeditnya.</p>
      <div className={styles.placementGrid}>
        <MeasurementStepper label="Lebar Bordir" value={placement?.widthCm ?? 8} min={range.min} max={range.max}
          disabled={inactive} onChange={onChangeSize} />
        <MeasurementStepper label="Posisi vertikal" value={placement ? placementOffsetCm(placement, "y", unitsPerCm) : 0}
          min={-10} max={10} disabled={inactive || !onChangePosition}
          onChange={(cm) => onChangePosition?.("y", offsetToModelPosition(zone, "y", cm, unitsPerCm))} />
        <MeasurementStepper label="Posisi horizontal" value={placement ? placementOffsetCm(placement, "x", unitsPerCm) : 0}
          min={-10} max={10} disabled={inactive || !onChangePosition}
          onChange={(cm) => onChangePosition?.(placementModelAxis(zone, "x"), offsetToModelPosition(zone, "x", cm, unitsPerCm))} />
      </div>
      <p className={styles.help}>Vertikal: minus = naik, plus = turun. Horizontal: minus = kiri, plus = kanan pada sisi yang sedang diedit.</p>
      {!placement ? <p className={styles.help + " mt-2"}>Unggah logo untuk mengatur ukuran dan posisi.</p> : (
        <details className={styles.advanced}>
          <summary>Penyesuaian lainnya</summary>
          <div className={styles.advancedControls}>
            <div>
              <span className={styles.stepLabel}>Rotasi Logo</span>
              <RotationInput value={placement.rotation} disabled={inactive} onChange={onChangeRotation} />
              <p className={styles.help}>Ketik sudut −360° hingga 360°. Tombol −/+ mengubah sudut sebesar 1°.</p>
              <div className={styles.rotations} role="group" aria-label="Rotasi logo">
                {([0, 90, 180, 270] as const).map((rotation) => (
                  <button key={rotation} type="button" aria-pressed={placement.rotation === rotation}
                    disabled={inactive} onClick={() => onChangeRotation(rotation)}>{rotation}°</button>
                ))}
              </div>
            </div>
            <p className={styles.help}>Pergeseran dihitung dari titik awal {zoneLabel(zone)}. Posisi pada model adalah perkiraan; penempatan akhir dikonfirmasi tim Ofissio.</p>
            <button type="button" disabled={disabled} onClick={onRemove} className="inline-flex min-h-10 items-center gap-2 text-sm text-red-700"><Trash2 className="h-4 w-4" />Hapus bordir</button>
          </div>
        </details>
      )}
    </section>
  );
}

function RotationInput({ value, disabled, onChange }: {
  value: number; disabled?: boolean; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const parsed = draft.trim() ? Number(draft) : NaN;
    const next = Number.isFinite(parsed) ? Math.min(360, Math.max(-360, Math.round(parsed))) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  return (
    <div className={styles.stepper} style={{ maxWidth: 240 }}>
      <button type="button" aria-label="Kurangi rotasi logo" disabled={disabled || value <= -360}
        onClick={() => onChange(Math.max(-360, value - 1))}><Minus className="h-4 w-4" /></button>
      <span className={styles.stepValue}>
        <input type="number" aria-label="Sudut rotasi logo" min={-360} max={360} step={1}
          value={draft} disabled={disabled} onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            const next = event.currentTarget.valueAsNumber;
            if (Number.isInteger(next) && next >= -360 && next <= 360) onChange(next);
          }} />
        <span aria-hidden="true">°</span>
      </span>
      <button type="button" aria-label="Tambah rotasi logo" disabled={disabled || value >= 360}
        onClick={() => onChange(Math.min(360, value + 1))}><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function MeasurementStepper({ label, value, min, max, disabled, onChange }: {
  label: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void;
}) {
  const change = (next: number) => { if (Number.isFinite(next)) onChange(Number(Math.min(max, Math.max(min, next)).toFixed(1))); };
  return (
    <div>
      <span className={styles.stepLabel}>{label}</span>
      <div className={styles.stepper}>
        <button type="button" aria-label={"Kurangi " + label} disabled={disabled || value <= min} onClick={() => change(value - .5)}><Minus className="h-4 w-4" /></button>
        <span className={styles.stepValue}>
          <input type="number" inputMode="decimal" aria-label={label} value={value} step={.5} min={min} max={max} disabled={disabled}
            onChange={(event) => change(event.currentTarget.valueAsNumber)} />
          <span aria-hidden="true">cm</span>
        </span>
        <button type="button" aria-label={"Tambah " + label} disabled={disabled || value >= max} onClick={() => change(value + .5)}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
