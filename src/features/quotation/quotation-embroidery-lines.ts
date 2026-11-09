import { normalizeEmbroideryZoneId, type EmbroideryPricingLine } from "@/features/products/embroidery-pricing";
import type { QuotationItemRecord } from "./quotation.types";
import { zoneLabel } from "@/types/uniform-3d";

/** Canonical rows include requested positions whose tariff still needs an admin decision. */
export function quotationEmbroideryLines(item: QuotationItemRecord): EmbroideryPricingLine[] {
  const rows = new Map(item.embroideryLines.map(line => [line.zoneId, line]));
  for (const placement of item.embroideryPlacements) {
    const zoneId = normalizeEmbroideryZoneId(placement.zone);
    if (zoneId && !rows.has(zoneId)) rows.set(zoneId, {zoneId, label:zoneLabel(placement.zone), quantity:item.totalQty, unitPrice:0, setupFee:0, subtotal:0, setupFeeApplied:false});
  }
  return [...rows.values()];
}
