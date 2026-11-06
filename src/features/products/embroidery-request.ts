import type { OfissioProduct } from "./product.types";
import { EMBROIDERY_ZONES, type EmbroideryPlacement, type EmbroideryZone } from "@/types/uniform-3d";
import { normalizeEmbroideryZoneId, validatePlacementDimensions, type EmbroideryPricing } from "./embroidery-pricing";
import { embroideryPlacementSchema, hasPendingLogoUpload } from "@/schemas/uniform-3d";

/** Every Ofissio garment accepts embroidery, including legacy products without GLBs. */
export function productEmbroideryZones(product: Pick<OfissioProduct, "embroidery_zones">): EmbroideryZone[] {
  return product.embroidery_zones.length ? product.embroidery_zones : [...EMBROIDERY_ZONES];
}

export function embroideryRequestIssue(placements: readonly EmbroideryPlacement[], product: Pick<OfissioProduct, "embroidery_zones">, pricing: EmbroideryPricing): string | null {
  if (placements.length > EMBROIDERY_ZONES.length) return "Maksimal enam posisi bordir.";
  const seen = new Set<string>();
  const supported = new Set(productEmbroideryZones(product).map(normalizeEmbroideryZoneId));
  for (const placement of placements) {
    const parsed = embroideryPlacementSchema.safeParse(placement);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "Pengaturan bordir belum lengkap.";
    const zone = normalizeEmbroideryZoneId(placement.zone);
    if (seen.has(placement.zone)) return "Zona bordir tidak boleh berulang.";
    seen.add(placement.zone);
    if (!supported.has(zone)) return "Posisi bordir tidak tersedia pada produk ini.";
    if (hasPendingLogoUpload([placement])) return "Tunggu sampai file logo selesai tersimpan.";
    if (!placement.textBordir && placement.logoFileId.startsWith("text-")) return "Unggah file logo atau isi tulisan bordir.";
    if (placement.technique !== "embroidery") return "Pilih teknik bordir untuk pengaturan ini.";
    if (placement.sizingMode !== "ofissio") {
      const issue = validatePlacementDimensions({zoneId: placement.zone, widthCm: placement.widthCm, heightCm: placement.heightCm}, pricing.zones)[0];
      if (issue) return issue.message;
    }
  }
  return null;
}
