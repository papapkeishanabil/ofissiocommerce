import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { OrderProcessRoute } from "@/features/orders/order.types";
import { isCustomDesignDescription } from "@/features/orders/order-routing.service";

import type {
  ProductionRequestBrief,
  QuotationRequirementType,
} from "./quotation.types";

export const QUOTATION_REQUIREMENT_TYPES = [
  "standard_product",
  "standard_customization",
  "custom_production",
] as const;

export function requirementTypeToProcessRoute(
  type: QuotationRequirementType,
): OrderProcessRoute {
  switch (type) {
    case "standard_product":
      return "fulfillment";
    case "standard_customization":
      return "customization";
    case "custom_production":
      return "production";
  }
}

export function safestQuotationProcessRoute(
  stored: OrderProcessRoute | undefined,
  inferred: OrderProcessRoute,
) {
  const priority: Record<OrderProcessRoute, number> = {
    fulfillment: 0,
    customization: 1,
    production: 2,
  };
  if (!stored || !(stored in priority)) return inferred;
  return priority[stored] >= priority[inferred] ? stored : inferred;
}

export function requirementTypeLabel(type: QuotationRequirementType) {
  switch (type) {
    case "standard_product":
      return "Produk standar";
    case "standard_customization":
      return "Produk + customization";
    case "custom_production":
      return "Produksi khusus";
  }
}

export function processRouteCustomerLabel(route: OrderProcessRoute) {
  switch (route) {
    case "fulfillment":
      return "Fulfillment";
    case "customization":
      return "Customization";
    case "production":
      return "Production / SPK";
  }
}

export function resolveQuotationRequirement(input: {
  requestedType?: QuotationRequirementType | null;
  items: Array<
    Pick<ValidatedCheckoutCartItem, "customization" | "embroideryPlacements">
  >;
}) {
  const inferredCustomization = input.items.some(
    (item) =>
      item.embroideryPlacements.length > 0 || Boolean(item.customization?.trim()),
  );
  const inferredProduction = input.items.some((item) =>
    isCustomDesignDescription(item.customization),
  );
  const requirementType: QuotationRequirementType =
    input.requestedType === "custom_production" || inferredProduction
      ? "custom_production"
      : input.requestedType === "standard_customization" || inferredCustomization
        ? "standard_customization"
        : "standard_product";

  return {
    requirementType,
    requestedProcessRoute: requirementTypeToProcessRoute(requirementType),
  };
}

export function normalizeProductionBrief(
  brief?: ProductionRequestBrief | null,
): ProductionRequestBrief | null {
  if (!brief) return null;
  const normalized: ProductionRequestBrief = {
    projectName: clean(brief.projectName),
    garmentType: clean(brief.garmentType),
    estimatedQuantity:
      Number.isInteger(brief.estimatedQuantity) && Number(brief.estimatedQuantity) > 0
        ? Number(brief.estimatedQuantity)
        : null,
    usageContext: clean(brief.usageContext),
    designDescription: clean(brief.designDescription) ?? "",
    materialPreference: clean(brief.materialPreference),
    colorPreference: clean(brief.colorPreference),
    sizeNotes: clean(brief.sizeNotes),
    targetDate: clean(brief.targetDate),
    referenceFiles: Array.isArray(brief.referenceFiles)
      ? brief.referenceFiles.slice(0, 5).map((file) => ({
          fileId: file.fileId,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        }))
      : [],
  };
  return normalized.designDescription ? normalized : null;
}

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}
