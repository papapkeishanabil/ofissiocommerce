import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";
import type { OrderProcessRoute } from "@/features/orders/order.types";
import { isCustomDesignDescription } from "@/features/orders/order-routing.service";
import { EMBROIDERY_ZONES } from "@/types/uniform-3d";

import { BRIEF_GENDERS, BRIEF_SIGNATURE_PARTIES } from "./quotation.types";
import type {
  BriefCustomAdjustment,
  BriefCustomerRequestSnapshot,
  BriefGender,
  BriefSignature,
  BriefSignatureParty,
  ProductionRequestBrief,
  QuotationRequirementType,
  TechnicalEmbroideryArea,
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
      return "Ready Stock (STK)";
    case "customization":
      return "Custom (CUS)";
    case "production":
      return "Production (PRO) / SPK";
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
    revisionNo: Math.min(
      99,
      Math.max(0, Math.round(Number(brief.revisionNo) || 0)),
    ),
    revisedAt: clean(brief.revisedAt),
    customAdjustments: Array.isArray(brief.customAdjustments)
      ? brief.customAdjustments
          .slice(0, 20)
          .map(normalizeCustomAdjustment)
          .filter((adjustment): adjustment is BriefCustomAdjustment =>
            Boolean(adjustment),
          )
      : [],
    signatures: Array.isArray(brief.signatures)
      ? brief.signatures
          .slice(0, 24)
          .map(normalizeSignature)
          .filter((signature): signature is BriefSignature =>
            Boolean(signature),
          )
      : [],
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
                measurements: cleanLimited(specification.measurements, 120),
              }))
            : [],
          sizeBreakdown: Array.isArray(garment.sizeBreakdown)
            ? garment.sizeBreakdown.slice(0, 30).map((size) => ({
                size: size.size.trim().slice(0, 40),
                quantity: Math.max(0, Math.round(Number(size.quantity) || 0)),
                gender: normalizeGender(size.gender),
              }))
            : [],
          embroideryAreas: Array.isArray(garment.embroideryAreas)
            ? garment.embroideryAreas
                .slice(0, 6)
                .map(normalizeEmbroideryArea)
                .filter((area): area is TechnicalEmbroideryArea =>
                  Boolean(area),
                )
            : [],
          figureFrontFileId: cleanLimited(garment.figureFrontFileId, 100),
          figureBackFileId: cleanLimited(garment.figureBackFileId, 100),
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
    enrichedAt: clean(brief.enrichedAt),
    enrichedByUserId: cleanLimited(brief.enrichedByUserId, 100),
    customerRequestSnapshot: normalizeCustomerRequestSnapshot(
      brief.customerRequestSnapshot,
    ),
  };
  return normalized.designDescription ? normalized : null;
}

function normalizeCustomerRequestSnapshot(
  snapshot: ProductionRequestBrief["customerRequestSnapshot"],
): BriefCustomerRequestSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const designDescription = clean(snapshot.designDescription) ?? "";
  if (!designDescription) return null;
  return {
    projectName: cleanLimited(snapshot.projectName, 120),
    garmentType: cleanLimited(snapshot.garmentType, 120),
    estimatedQuantity:
      Number.isInteger(snapshot.estimatedQuantity) &&
      Number(snapshot.estimatedQuantity) > 0
        ? Number(snapshot.estimatedQuantity)
        : null,
    usageContext: cleanLimited(snapshot.usageContext, 300),
    designDescription: designDescription.slice(0, 1200),
    materialPreference: cleanLimited(snapshot.materialPreference, 160),
    colorPreference: cleanLimited(snapshot.colorPreference, 160),
    sizeNotes: cleanLimited(snapshot.sizeNotes, 300),
    targetDate: cleanLimited(snapshot.targetDate, 40),
    referenceFiles: Array.isArray(snapshot.referenceFiles)
      ? snapshot.referenceFiles.slice(0, 5).map((file) => ({
          fileId: cleanLimited(file.fileId, 100) ?? "",
          fileName: cleanLimited(file.fileName, 200) ?? "",
        }))
      : [],
    capturedAt: cleanLimited(snapshot.capturedAt, 40) ?? "",
  };
}

function normalizeGender(value: unknown): BriefGender | undefined {
  return BRIEF_GENDERS.includes(value as BriefGender)
    ? (value as BriefGender)
    : undefined;
}

function normalizeEmbroideryArea(
  area: TechnicalEmbroideryArea,
): TechnicalEmbroideryArea | null {
  if (!area || typeof area !== "object") return null;
  const zone = EMBROIDERY_ZONES.includes(area.zone as never)
    ? area.zone
    : null;
  const widthCm = Number(area.widthCm);
  const heightCm = Number(area.heightCm);
  if (!zone || !(widthCm > 0) || !(heightCm > 0)) return null;
  return {
    label: String(area.label ?? "").trim().slice(0, 4) || "A",
    zone,
    positionNote: clean(area.positionNote),
    offsetXCm: nullableCm(area.offsetXCm),
    offsetYCm: nullableCm(area.offsetYCm),
    widthCm: Math.round(widthCm * 10) / 10,
    heightCm: Math.round(heightCm * 10) / 10,
    technique:
      area.technique === "embroidery" ||
      area.technique === "print" ||
      area.technique === "patch"
        ? area.technique
        : "embroidery",
    logoFileId: cleanLimited(area.logoFileId, 100),
    logoFileName: clean(area.logoFileName),
    notes: clean(area.notes),
  };
}

function normalizeCustomAdjustment(
  adjustment: BriefCustomAdjustment,
): BriefCustomAdjustment | null {
  if (!adjustment || typeof adjustment !== "object") return null;
  const changeNote = clean(adjustment.changeNote);
  if (!changeNote) return null;
  return {
    id: String(adjustment.id ?? "").trim().slice(0, 100),
    size: String(adjustment.size ?? "").trim().slice(0, 40) || "-",
    color: clean(adjustment.color),
    changeNote: changeNote.slice(0, 400),
    quantity: Math.max(0, Math.round(Number(adjustment.quantity) || 0)),
  };
}

function normalizeSignature(
  signature: BriefSignature,
): BriefSignature | null {
  if (!signature || typeof signature !== "object") return null;
  const signerName = clean(signature.signerName);
  const signedAt = clean(signature.signedAt);
  if (!signerName || !signedAt) return null;
  if (!BRIEF_SIGNATURE_PARTIES.includes(signature.party as never)) return null;
  return {
    party: signature.party as BriefSignatureParty,
    signerName: signerName.slice(0, 120),
    signerTitle: clean(signature.signerTitle)?.slice(0, 120) ?? "",
    signerUserId: cleanLimited(signature.signerUserId, 100),
    method: "portal_click",
    consentText: cleanLimited(signature.consentText, 500),
    signedAt,
    revokedAt: clean(signature.revokedAt),
    revisionNo: Math.min(
      99,
      Math.max(0, Math.round(Number(signature.revisionNo) || 0)),
    ),
  };
}

function nullableCm(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.round(Math.max(-50, Math.min(50, parsed)) * 10) / 10
    : null;
}

function cleanLimited(value: unknown, max: number): string | null {
  const normalized = clean(typeof value === "string" ? value : null);
  return normalized ? normalized.slice(0, max) : null;
}

export function getBriefApprovalStatus(brief?: ProductionRequestBrief | null) {
  if (!brief) return "not_required" as const;
  if (brief.approvalStatus) return normalizeBriefApprovalStatus(brief.approvalStatus);
  return brief.intakeChannel === "customer_portal"
    ? "approved" as const
    : "pending_customer_approval" as const;
}

/** Label manusiadi (Indonesia) untuk status approval brief di UI admin. */
export function briefApprovalStatusLabel(status: string): string {
  switch (status) {
    case "not_required":
      return "Tanpa ttd customer (pilihan sales)";
    case "pending_customer_approval":
      return "Menunggu ttd customer";
    case "approved":
      return "Disetujui customer";
    case "revision_requested":
      return "Revisi diminta customer";
    default:
      return status;
  }
}

export function requiresCustomerBriefApproval(
  quotation: { source: string; productionBrief?: ProductionRequestBrief | null },
) {
  const brief = quotation.productionBrief;
  if (!brief) return false;
  // Brief portal yang belum diperkaya sales tidak melalui alur approval.
  if (brief.intakeChannel === "customer_portal" && !brief.enrichedAt) {
    return false;
  }
  const status = getBriefApprovalStatus(brief);
  // "not_required" = sales memilih tanpa persetujuan formal (repeat order
  // atau kasus sederhana) — gate terbuka di semua kanal.
  return (
    quotation.source === "custom_request" &&
    status !== "approved" &&
    status !== "not_required"
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
