import type { EmbroideryPlacement } from "@/types/uniform-3d";
import { embroiderySizeLabel, zoneLabel } from "@/types/uniform-3d";
import { embroideryTextSummary, validateNameAllocations } from "@/lib/embroidery-names";
export function EmbroiderySummary({ placements = [], sizes }: { placements?: EmbroideryPlacement[]; sizes?: Record<string, number> }) {
  if (!placements.length) return null;
  const issue = sizes ? validateNameAllocations(placements, sizes) : null;
  return <details className="my-2 rounded-lg border border-line bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold">Bordir: {placements.length} zona</summary><ul className="mt-2 space-y-2">{placements.map(p => <li key={p.zone}><b>{zoneLabel(p.zone)}</b><p>{embroiderySizeLabel(p)}</p><p className="break-words text-ink-muted">{embroideryTextSummary(p)}</p>{p.notes && <p className="break-words">Catatan: {p.notes}</p>}</li>)}</ul>{issue && <p role="alert" className="mt-2 text-red-700">{issue}</p>}</details>;
}
