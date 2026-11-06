import type { EmbroideryPlacement } from "@/types/uniform-3d";
import { embroiderySizeLabel, zoneLabel } from "@/types/uniform-3d";
import { embroideryTextSummary, validateNameAllocations } from "@/lib/embroidery-names";
import { EmbroideryLogoThumbnail } from "./EmbroideryLogoThumbnail";

export function EmbroiderySummary({ placements = [], sizes, previewUrls = {} }: { placements?: EmbroideryPlacement[]; sizes?: Record<string, number>; previewUrls?: Record<string, string> }) {
  if (!placements.length) return null;
  const issue = sizes ? validateNameAllocations(placements, sizes) : null;
  return <details open aria-label="Ringkasan bordir" className="my-2 rounded-lg border border-line bg-white p-3 text-xs">
    <summary className="cursor-pointer font-semibold">Bordir: {placements.length} zona</summary>
    <ul className="mt-3 divide-y divide-line">
      {placements.map(placement => <li key={placement.zone} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
        {!placement.textBordir && <EmbroideryLogoThumbnail fileId={placement.logoFileId} fileName={placement.logoFileName} position={zoneLabel(placement.zone)} previewUrl={previewUrls[placement.logoFileId] ?? placement.logoPreviewUrl} />}
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <b>{zoneLabel(placement.zone)}</b>
          <p className="mt-0.5 text-ink-muted">{embroideryTextSummary(placement)}</p>
          <p className="mt-1">{embroiderySizeLabel(placement)}</p>
          {placement.notes && <p className="mt-1 whitespace-pre-wrap">Catatan: {placement.notes}</p>}
        </div>
      </li>)}
    </ul>
    {issue && <p role="alert" className="mt-2 text-red-700">{issue}</p>}
  </details>;
}
