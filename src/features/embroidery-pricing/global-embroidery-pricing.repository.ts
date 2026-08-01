import "server-only";

import { SupabaseDatabaseError } from "@/features/database/database.errors";
import { getSupabaseAdminClient } from "@/features/database/supabase-admin.client";
import { getRepositoryProvider } from "@/features/repositories/repository.config";
import {
  createDefaultEmbroideryPricingZones,
  normalizeEmbroideryZoneId,
  type EmbroideryPricingZone,
} from "@/features/products/embroidery-pricing";

type PricingState = { zones: EmbroideryPricingZone[]; source: "supabase" | "mock" | "fallback"; schemaReady: boolean };
type PricingGlobal = typeof globalThis & { __ofissioGlobalEmbroideryPricing?: EmbroideryPricingZone[] };
const pricingGlobal = globalThis as PricingGlobal;
const mockZones = pricingGlobal.__ofissioGlobalEmbroideryPricing ??
  (pricingGlobal.__ofissioGlobalEmbroideryPricing = createDefaultEmbroideryPricingZones());

export async function readGlobalEmbroideryPricing(): Promise<PricingState> {
  if (getRepositoryProvider() === "mock") {
    return { zones: clone(mockZones), source: "mock", schemaReady: true };
  }
  const client = getSupabaseAdminClient();
  if (!client) return { zones: clone(mockZones), source: "fallback", schemaReady: false };
  try {
    const rows = await client.select("embroidery_pricing_zones", { order: "sort_order.asc,zone_id.asc" });
    return { zones: rows.map(rowToZone).filter(Boolean) as EmbroideryPricingZone[], source: "supabase", schemaReady: true };
  } catch (error) {
    if (error instanceof SupabaseDatabaseError && error.reason === "relation_does_not_exist") {
      return { zones: clone(mockZones), source: "fallback", schemaReady: false };
    }
    throw error;
  }
}

export async function writeGlobalEmbroideryPricing(zones: EmbroideryPricingZone[]) {
  if (getRepositoryProvider() === "mock") {
    mockZones.splice(0, mockZones.length, ...clone(zones));
    return readGlobalEmbroideryPricing();
  }
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase global embroidery pricing belum dikonfigurasi.");
  const now = new Date().toISOString();
  for (const zone of zones) {
    const existing = await client.select("embroidery_pricing_zones", { filters: { zone_id: zone.zoneId }, limit: 1 });
    const row = zoneToRow(zone, now);
    if (existing[0]) await client.update("embroidery_pricing_zones", row, { zone_id: zone.zoneId });
    else await client.insert("embroidery_pricing_zones", { id: `embroidery-${zone.zoneId.replaceAll("_", "-")}`, ...row, created_at: now });
  }
  return readGlobalEmbroideryPricing();
}

function rowToZone(row: Record<string, unknown>): EmbroideryPricingZone | null {
  const zoneId = normalizeEmbroideryZoneId(row.zone_id);
  if (!zoneId) return null;
  return {
    zoneId,
    label: String(row.label ?? zoneId),
    enabled: row.enabled !== false,
    maxWidthCm: Number(row.max_width_cm ?? 0),
    maxHeightCm: Number(row.max_height_cm ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    setupFee: Number(row.setup_fee ?? 0),
    showSetupFee: row.show_setup_fee === true,
    pricingMode: "flat_per_piece",
    notes: String(row.notes ?? ""),
    sortOrder: Number(row.sort_order ?? 100),
  };
}

function zoneToRow(zone: EmbroideryPricingZone, updatedAt: string) {
  return {
    label: zone.label,
    enabled: zone.enabled,
    max_width_cm: zone.maxWidthCm,
    max_height_cm: zone.maxHeightCm,
    unit_price: zone.unitPrice,
    setup_fee: zone.setupFee,
    show_setup_fee: zone.showSetupFee,
    pricing_mode: "flat_per_piece",
    notes: zone.notes ?? "",
    sort_order: zone.sortOrder ?? 100,
    updated_at: updatedAt,
  };
}

function clone(zones: EmbroideryPricingZone[]) {
  return zones.map((zone) => ({ ...zone }));
}
