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
    intakeChannel: brief.intakeChannel ?? "customer_portal",
    externalReference: clean(brief.externalReference),
    approvalStatus: normalizeBriefApprovalStatus(brief.approvalStatus),
    approvalRequestedAt: clean(brief.approvalRequestedAt),
    approvedAt: clean(brief.approvedAt),
    approvalRevisionNote: clean(brief.approvalRevisionNote),
    technicalSpecifications: Array.isArray(brief.technicalSpecifications)
      ? brief.technicalSpecifications.slice(0, 8).map((garment) => ({
          id: garment.id.trim().slice(0, 100),
          category: garment.category,
          garmentType: garment.garmentType.trim().slice(0, 120),
          templateKey: clean(garment.templateKey),
          quantity: Math.max(1, Math.round(Number(garment.quantity) || 1)),
          specifications: Array.isArray(garment.specifications)
            ? garment.specifications.slice(0, 40).map((specification) => ({
                key: specification.key.trim().slice(0, 80),
                label: specification.label.trim().slice(0, 120),
                status: specification.status,
                option: clean(specification.option),
                detail: clean(specification.detail),
                notes: clean(specification.notes),
              }))
            : [],
          sizeBreakdown: Array.isArray(garment.sizeBreakdown)
            ? garment.sizeBreakdown.slice(0, 30).map((size) => ({
                size: size.size.trim().slice(0, 40),
                quantity: Math.max(0, Math.round(Number(size.quantity) || 0)),
              }))
            : [],
        }))
      : [],
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

export function getBriefApprovalStatus(brief?: ProductionRequestBrief | null) {
  if (!brief) return "not_required" as const;
  if (brief.approvalStatus) return normalizeBriefApprovalStatus(brief.approvalStatus);
  return brief.intakeChannel === "customer_portal"
    ? "approved" as const
    : "pending_customer_approval" as const;
}

export function requiresCustomerBriefApproval(
  quotation: { source: string; productionBrief?: ProductionRequestBrief | null },
) {
  return (
    quotation.source === "custom_request" &&
    quotation.productionBrief?.intakeChannel !== "customer_portal" &&
    getBriefApprovalStatus(quotation.productionBrief) !== "approved"
  );
}

function normalizeBriefApprovalStatus(value: ProductionRequestBrief["approvalStatus"]) {
  return [
    "not_required",
    "pending_customer_approval",
    "approved",
    "revision_requested",
  ].includes(String(value))
    ? value!
    : "not_required";
}

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}
