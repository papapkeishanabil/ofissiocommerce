import { EmbroideryLogoThumbnail } from "@/components/configurator/EmbroideryLogoThumbnail";
import { embroideryTextSummary } from "@/lib/embroidery-names";
import { embroideryTechniqueLabel, embroiderySizeLabel, zoneLabel, type EmbroideryPlacement } from "@/types/uniform-3d";

export function OrderLogoThumbnails({ placements }: { placements: EmbroideryPlacement[] }) {
  if (!placements.length) return null;
  return <div className="mt-3">
    <p className="text-xs font-semibold text-ink-muted">Logo per posisi bordir</p>
    <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {placements.map(placement => <li key={`${placement.zone}-${placement.logoFileId}`} className="flex min-w-0 items-start gap-3 rounded-xl border border-line bg-white/70 p-2.5">
        {!placement.textBordir && <EmbroideryLogoThumbnail fileId={placement.logoFileId} fileName={placement.logoFileName} position={zoneLabel(placement.zone)} previewUrl={placement.logoPreviewUrl} />}
        <div className="min-w-0 text-xs [overflow-wrap:anywhere]">
          <p className="font-bold text-ink">{zoneLabel(placement.zone)}</p>
          <p className="mt-0.5 text-ink-muted">{embroideryTextSummary(placement) || "Logo bordir"}</p>
          <p className="mt-1 text-[11px] text-ink-muted">{embroideryTechniqueLabel(placement.technique)}, {embroiderySizeLabel(placement)}</p>
          {placement.notes && <p className="mt-1 whitespace-pre-wrap text-ink-muted">Catatan: {placement.notes}</p>}
        </div>
      </li>)}
    </ul>
  </div>;
}
