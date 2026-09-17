import type { LogoPlacement } from "@/types/uniform-3d";
import { zoneLabel } from "@/types/uniform-3d";

export function validateNameAllocations(placements: readonly LogoPlacement[], sizes: Record<string, number>): string | null {
  for (const placement of placements) {
    const text = placement.textBordir;
    if (!text || text.mode === "same") continue;
    const totals: Record<string, number> = {};
    for (const row of text.allocations) {
      if (!row.name.trim() || !Number.isInteger(row.quantity) || row.quantity <= 0) return "Isi nama dan jumlah yang valid.";
      totals[row.size] = (totals[row.size] || 0) + row.quantity;
    }
    for (const size of new Set([...Object.keys(sizes), ...Object.keys(totals)])) {
      if ((sizes[size] || 0) !== (totals[size] || 0)) return `${zoneLabel(placement.zone)}: pembagian nama ukuran ${size} ${totals[size] || 0} pcs, pesanan ${sizes[size] || 0} pcs. Sesuaikan pembagian nama.`;
    }
  }
  return null;
}

export function embroideryTextSummary(placement: LogoPlacement) {
  const text = placement.textBordir;
  if (!text) return placement.logoFileName;
  const names = text.mode === "same" ? `${text.name} — semua seragam` : text.allocations.map(row => `${row.name} / ${row.size} / ${row.quantity} pcs`).join("; ");
  return `${names}, Font ${text.font === "serif" ? "Serif" : "Sans"}, ${text.color}`;
}

/** Text rendering for the garment preview; production retains structured names. */
function nameCanvas(text: NonNullable<LogoPlacement["textBordir"]>, selected = 0) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const name = text.mode === "same" ? text.name : text.allocations[selected]?.name || text.allocations[0]?.name || "NAMA";
  context.font = `bold 100px ${text.font === "serif" ? "Georgia" : "Arial"}`;
  canvas.width = Math.min(900, Math.max(140, Math.ceil(context.measureText(name).width) + 32));
  canvas.height = 140;
  context.font = `bold 100px ${text.font === "serif" ? "Georgia" : "Arial"}`;
  context.fillStyle = text.color;
  context.textAlign = "center"; context.textBaseline = "middle";
  context.fillText(name, canvas.width / 2, 70, canvas.width - 32);
  return canvas;
}
export function renderNamePreview(text: NonNullable<LogoPlacement["textBordir"]>, selected = 0) { return nameCanvas(text, selected).toDataURL("image/png"); }
export function namePreviewAspect(text: NonNullable<LogoPlacement["textBordir"]>, selected = 0) { const canvas = nameCanvas(text,selected); return canvas.width / canvas.height; }
