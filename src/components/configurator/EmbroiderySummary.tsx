import type { LogoPlacement } from "@/types/uniform-3d";
import { zoneLabel } from "@/types/uniform-3d";
import { embroideryTextSummary, validateNameAllocations } from "@/lib/embroidery-names";
export function EmbroiderySummary({ placements = [], sizes }: { placements?: LogoPlacement[]; sizes?: Record<string, number> }) {
  if (!placements.length) return null;
  const issue = sizes ? validateNameAllocations(placements, sizes) : null;
  return <details className="my-2 rounded-lg border border-line bg-white p-3 text-xs"><summary className="cursor-pointer font-semibold">Bordir: {placements.length} zona</summary><ul className="mt-2 space-y-2">{placements.map(p => <li key={p.zone}><b>{zoneLabel(p.zone)}, {p.widthCm} × {p.heightCm} cm</b><p className="break-words text-ink-muted">{embroideryTextSummary(p)}</p></li>)}</ul>{issue && <p role="alert" className="mt-2 text-red-700">{issue}</p>}</details>;
}
