import type { TrackingFulfillmentType } from "@/features/tracking/tracking.types";

export type OfistantHandoffRoute = {
  destination: "admin" | "cs_full_custom";
  category: "ready_stock" | "catalog_customization" | "full_custom_production";
};

export function classifyHandoffDestination(
  message: string,
  fulfillmentType?: TrackingFulfillmentType,
): OfistantHandoffRoute | null {
  const value = message.toLowerCase().trim();
  if (/^(saya )?(butuh|perlu|minta) bantuan tim ofissio[.!?]*$/.test(value)) return null;
  if (/\b((full|ful) (custom|costom|kustom)|production|produksi khusus|desain dari awal|bahan|pola|spesifikasi teknis)\b/.test(value)) {
    return { destination: "cs_full_custom", category: "full_custom_production" };
  }
  if (/\b(ready stock|stok siap|bordir|produk katalog|pesanan katalog)\b/.test(value)) {
    return {
      destination: "admin",
      category: /\bbordir\b/.test(value) ? "catalog_customization" : "ready_stock",
    };
  }
  if (fulfillmentType === "MADE_TO_ORDER" || fulfillmentType === "QUOTATION_ONLY") {
    return { destination: "cs_full_custom", category: "full_custom_production" };
  }
  if (fulfillmentType === "READY_STOCK_WITH_CUSTOMIZATION") {
    return { destination: "admin", category: "catalog_customization" };
  }
  if (fulfillmentType === "READY_STOCK") return { destination: "admin", category: "ready_stock" };
  return null;
}
