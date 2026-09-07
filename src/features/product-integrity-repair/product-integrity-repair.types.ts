export type IntegrityRepairType = "LEGACY_MEDIA" | "VARIATION_IDENTITY" | "SKU" | "STATUS" | "SPECIAL_PRODUCT";
export type IntegrityRepairClassification = "AUTO_REPAIRABLE" | "MANUAL_REVIEW_REQUIRED" | "ALREADY_HEALTHY" | "ACCEPT_CURRENT_TARGET_WITH_EVIDENCE" | "VERIFIED_MEDIA_COMPLETE" | "MEDIA_EVIDENCE_REVIEW_REQUIRED" | "TARGET_MEDIA_INCOMPLETE" | "SKIPPED_EXISTING" | "SKIPPED_SPECIAL_PRODUCT" | "BLOCKED";

export type VariationTriageRootCause = "SOURCE_ATTRIBUTES_MISSING" | "SOURCE_ATTRIBUTES_WILDCARD" | "SOURCE_DUPLICATE_ATTRIBUTE_KEY" | "SOURCE_DUPLICATE_COMBINATION" | "TARGET_ATTRIBUTES_MISSING" | "TARGET_AMBIGUOUS" | "SOURCE_TARGET_MAPPING_AMBIGUOUS" | "VARIATION_COUNT_MISMATCH" | "SOURCE_SKU_INCOMPLETE" | "SOURCE_DATA_INSUFFICIENT";
export type VariationTargetHealth = "HEALTHY" | "PARTIALLY_HEALTHY" | "BROKEN" | "UNKNOWN";
export type VariationTriageDisposition = "MANUAL_ATTRIBUTE_RESOLUTION" | "SOURCE_DATA_REVIEW_REQUIRED" | "TARGET_REBUILD_CANDIDATE" | "ACCEPT_CURRENT_TARGET_WITH_EVIDENCE" | "SKIP_SPECIAL_PRODUCT" | "KEEP_BLOCKED";

export interface VariationBlockerTriage {
  rootCauses: VariationTriageRootCause[];
  targetHealth: VariationTargetHealth;
  recommendation: VariationTriageDisposition;
  sourceVariationCount: number;
  targetVariationCount: number;
  sourceWithSku: number;
  sourceWithoutSku: number;
  targetWithRawSku: number;
  targetWithoutRawSku: number;
  sourceCombinations: string[];
  targetCombinations: string[];
  emptyWildcardSource: number;
  emptyWildcardTarget: number;
  duplicateSourceAttributeKeys: number;
  duplicateSourceCombinations: number;
  duplicateTargetCombinations: number;
  unmatchedSourceVariations: number;
  unmatchedTargetVariations: number;
  variationCountMismatch: boolean;
  targetEvidence: string[];
  targetFingerprint: string;
  targetSnapshot: Array<{variationId:number;rawSku:string;attributes:string;price:string;status:string}>;
}

export type LegacyMediaRepairStage = "PLAN_VALIDATION" | "SOURCE_DOWNLOAD" | "SOURCE_VALIDATE" | "MEDIA_SEARCH" | "MEDIA_UPLOAD" | "MEDIA_READBACK" | "PRODUCT_ATTACH" | "PRODUCT_READBACK" | "FINAL_VERIFY";

export interface IntegrityRepairExecutionResult {
  id: string;
  sku: string;
  wooProductId: number;
  status: "REPAIRED" | "ALREADY_HEALTHY" | "PARTIALLY_REPAIRED" | "FAILED";
  message: string;
  failureStage?: LegacyMediaRepairStage;
  errorCode?: string;
  safeMessage?: string;
  sourceImageIndex?: number;
  expectedImages?: number;
  reusedImages?: number;
  uploadedImages?: number;
  attachedImages?: number;
  verifiedImages?: number;
  legacyMediaVerification?: LegacyMediaVerification;
}

export interface LegacyMediaVerification {status:"VERIFIED";sourceId:string|null;sku:string;expectedImages:Array<{sourceIdentity:string;normalizedFilename:string;targetMediaId:number;order:number}>;verifiedWooImageIds:number[];orderedVerified:true;verifiedAt:string;}

export type LegacyMediaReconciliationState = "MISSING_MEDIA" | "PARTIAL_MEDIA_STATE" | "ALREADY_HEALTHY" | "AMBIGUOUS_MEDIA_STATE";

export interface LegacyMediaReconciliationItem {
  sourceUrl: string;
  sourceIdentity: string;
  matchedMediaId: number | null;
  matchedMediaUrl: string | null;
  alreadyAttached: boolean;
  attachedPosition: number | null;
  action: "UPLOAD" | "REUSE" | "ALREADY_ATTACHED" | "BLOCKED_AMBIGUOUS";
  candidateCount: number;
}

export interface LegacyMediaReconciliation {
  state: LegacyMediaReconciliationState;
  expectedSourceImages: number;
  reusableMedia: number;
  uploadsRequired: number;
  alreadyAttached: number;
  missing: number;
  orderedTargetVerified: boolean;
  deterministic: boolean;
  items: LegacyMediaReconciliationItem[];
}

export interface IntegrityRepairRow {
  id: string;
  repair: IntegrityRepairType;
  productId: number;
  sku: string;
  product: string;
  current: string;
  target: string;
  confidence: "EXACT_SOURCE_MATCH" | "STRONG_NORMALIZATION_SUGGESTION" | "NONE";
  classification: IntegrityRepairClassification;
  reason: string;
  evidence: string[];
  sourceId: string | null;
  payload?: Record<string, unknown>;
}

export interface IntegrityRepairPlan {
  generatedAt: string;
  batchId: string;
  sourceCsv: { supplied: boolean; hashVerified: boolean; filename: string | null };
  rows: IntegrityRepairRow[];
  summary: {
    legacyMediaProducts: number;
    legacySourceImages: number;
    mediaReusable: number;
    mediaUploadsRequired: number;
    mediaUnreachable: number;
    variationProducts: number;
    variationsAffected: number;
    sourceSkuNull: number;
    parentSkuDuplicates: number;
    emptyAttributes: number;
    unknownSkuProducts: number;
    skuAutoRepair: number;
    skuManualReview: number;
    importedNonDraftProducts: number;
    autoRepairable: number;
    manualReview: number;
    blocked: number;
    specialProducts: number;
    acceptedCurrentTarget?: number;
    mediaVerifiedComplete?: number;
    mediaEvidenceReviewRequired?: number;
    targetMediaIncomplete?: number;
  };
  safety: { wooWrites: 0; variationWrites: 0; mediaWrites: 0; publishWrites: 0 };
}
