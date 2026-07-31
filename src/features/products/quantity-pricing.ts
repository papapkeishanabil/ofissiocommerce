export const QUANTITY_PRICING_MODES = ["fixed_unit_price"] as const;
export const QUANTITY_PRICING_BASES = ["total_order_qty"] as const;

export type QuantityPricingMode = (typeof QUANTITY_PRICING_MODES)[number];
export type QuantityPricingBasis = (typeof QUANTITY_PRICING_BASES)[number];

export interface QuantityPricingTier {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  label: string;
}

export interface QuantityPricing {
  enabled: boolean;
  mode: QuantityPricingMode;
  basis: QuantityPricingBasis;
  tiers: QuantityPricingTier[];
}

export type QuantityPricingIssueCode =
  | "invalid_json"
  | "tiers_empty"
  | "min_qty_invalid"
  | "max_qty_invalid"
  | "unit_price_invalid"
  | "tier_overlap"
  | "open_tier_not_last"
  | "multiple_open_tiers"
  | "tier_order"
  | "first_tier_above_moq"
  | "first_tier_below_moq";

export interface QuantityPricingIssue {
  code: QuantityPricingIssueCode;
  message: string;
  severity: "error" | "warning" | "info";
  tierIndex?: number;
}

export interface QuantityPricingValidationResult {
  valid: boolean;
  errors: QuantityPricingIssue[];
  warnings: QuantityPricingIssue[];
  info: QuantityPricingIssue[];
  tiers: QuantityPricingTier[];
}

export interface QuantityTierPriceResult {
  unitPrice: number;
  subtotal: number;
  tierLabel: string | null;
  tierApplied: boolean;
  nextTier: {
    minQty: number;
    unitPrice: number;
    qtyToNextTier: number;
    potentialUnitPrice: number;
  } | null;
}

export const DEFAULT_QUANTITY_PRICING: QuantityPricing = {
  enabled: true,
  mode: "fixed_unit_price",
  basis: "total_order_qty",
  tiers: [],
};

export function createDefaultQuantityPricingTier(
  regularPrice: number,
  moq = 20,
): QuantityPricingTier {
  const minQty = positiveIntegerOr(moq, 20);
  return {
    minQty,
    maxQty: null,
    unitPrice: positiveNumberOr(regularPrice, 0),
    label: `${minQty}+ pcs`,
  };
}

export function parseQuantityPricingTiers(value: unknown): {
  tiers: QuantityPricingTier[];
  valid: boolean;
  issues: QuantityPricingIssue[];
} {
  if (value == null || value === "") {
    return { tiers: [], valid: true, issues: [] };
  }

  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {
        tiers: [],
        valid: false,
        issues: [issue("invalid_json", "Format JSON harga quantity tidak valid.", "error")],
      };
    }
  }
  if (isRecord(parsed) && Array.isArray(parsed.tiers)) parsed = parsed.tiers;
  if (!Array.isArray(parsed)) {
    return {
      tiers: [],
      valid: false,
      issues: [issue("invalid_json", "Data tier harga quantity harus berupa array.", "error")],
    };
  }

  const issues: QuantityPricingIssue[] = [];
  const tiers = parsed.map((row, tierIndex) => {
    if (!isRecord(row)) {
      issues.push(issue("invalid_json", `Tier ${tierIndex + 1} tidak valid.`, "error", tierIndex));
      return { minQty: 0, maxQty: null, unitPrice: 0, label: "" };
    }
    const minQty = finiteNumber(row.minQty);
    const maxQty = nullableFiniteNumber(row.maxQty);
    const unitPrice = finiteNumber(row.unitPrice);
    return {
      minQty,
      maxQty,
      unitPrice,
      label: cleanLabel(row.label) || quantityTierLabel(minQty, maxQty),
    };
  });

  return { tiers, valid: issues.length === 0, issues };
}

export function validateQuantityPricing(input: {
  enabled: boolean;
  tiers: QuantityPricingTier[];
  moq?: number;
}): QuantityPricingValidationResult {
  const errors: QuantityPricingIssue[] = [];
  const warnings: QuantityPricingIssue[] = [];
  const info: QuantityPricingIssue[] = [];
  const tiers = input.tiers.map((tier) => ({
    minQty: finiteNumber(tier.minQty),
    maxQty: tier.maxQty == null ? null : finiteNumber(tier.maxQty),
    unitPrice: finiteNumber(tier.unitPrice),
    label: cleanLabel(tier.label) || quantityTierLabel(tier.minQty, tier.maxQty),
  }));

  if (input.enabled && tiers.length === 0) {
    errors.push(issue("tiers_empty", "Harga quantity aktif tetapi belum memiliki tier.", "error"));
  }
  if (!input.enabled) {
    return { valid: true, errors: [], warnings: [], info: [], tiers };
  }

  tiers.forEach((tier, index) => {
    if (!Number.isInteger(tier.minQty) || tier.minQty <= 0) {
      errors.push(issue("min_qty_invalid", `Min Qty tier ${index + 1} wajib berupa angka lebih dari 0.`, "error", index));
    }
    if (
      tier.maxQty != null &&
      (!Number.isInteger(tier.maxQty) || tier.maxQty < tier.minQty)
    ) {
      errors.push(issue("max_qty_invalid", `Max Qty tier ${index + 1} harus lebih besar atau sama dengan Min Qty.`, "error", index));
    }
    if (!Number.isFinite(tier.unitPrice) || tier.unitPrice <= 0) {
      errors.push(issue("unit_price_invalid", `Harga per pcs tier ${index + 1} wajib lebih dari 0.`, "error", index));
    }
  });

  const indexed = tiers
    .map((tier, index) => ({ tier, index }))
    .sort((left, right) => left.tier.minQty - right.tier.minQty);
  if (indexed.some((entry, sortedIndex) => entry.index !== sortedIndex)) {
    warnings.push(issue("tier_order", "Tier sebaiknya diurutkan dari Min Qty terkecil.", "warning"));
  }

  const openTiers = indexed.filter((entry) => entry.tier.maxQty == null);
  if (openTiers.length > 1) {
    errors.push(issue("multiple_open_tiers", "Hanya satu tier terakhir yang boleh memiliki Max Qty kosong.", "error"));
  }
  indexed.forEach((entry, sortedIndex) => {
    if (entry.tier.maxQty == null && sortedIndex !== indexed.length - 1) {
      errors.push(issue("open_tier_not_last", "Tier tanpa Max Qty harus menjadi tier terakhir.", "error", entry.index));
    }
    const previous = indexed[sortedIndex - 1]?.tier;
    if (previous && (previous.maxQty == null || entry.tier.minQty <= previous.maxQty)) {
      errors.push(issue("tier_overlap", `Tier ${entry.index + 1} overlap dengan tier sebelumnya.`, "error", entry.index));
    }
  });

  const moq = positiveIntegerOr(input.moq ?? 0, 0);
  const firstTier = indexed[0]?.tier;
  if (firstTier && moq > 0 && firstTier.minQty > moq) {
    warnings.push(issue("first_tier_above_moq", "Tier pertama lebih tinggi dari MOQ.", "warning"));
  } else if (firstTier && moq > 0 && firstTier.minQty < moq) {
    info.push(issue("first_tier_below_moq", "MOQ produk tetap mengikuti field MOQ.", "info"));
  }

  return { valid: errors.length === 0, errors, warnings, info, tiers };
}

export function normalizeQuantityPricing(input: {
  enabled?: boolean;
  mode?: unknown;
  basis?: unknown;
  tiers?: unknown;
  moq?: number;
}): {
  quantityPricing: QuantityPricing;
  valid: boolean;
  issues: QuantityPricingIssue[];
} {
  const parsed = parseQuantityPricingTiers(input.tiers);
  const enabled = input.enabled ?? true;
  const mode = input.mode === "fixed_unit_price" ? input.mode : "fixed_unit_price";
  const basis = input.basis === "total_order_qty" ? input.basis : "total_order_qty";
  const validation = validateQuantityPricing({ enabled, tiers: parsed.tiers, moq: input.moq });
  return {
    quantityPricing: { enabled, mode, basis, tiers: validation.tiers },
    valid: parsed.valid && validation.valid,
    issues: [...parsed.issues, ...validation.errors, ...validation.warnings, ...validation.info],
  };
}

export function calculateQuantityTierPrice(input: {
  regularPrice: number;
  totalQty: number;
  quantityPricing?: QuantityPricing | null;
}): QuantityTierPriceResult {
  const regularPrice = Math.max(0, finiteNumber(input.regularPrice));
  const totalQty = Math.max(0, Math.trunc(finiteNumber(input.totalQty)));
  const pricing = input.quantityPricing;
  const validation = validateQuantityPricing({
    enabled: pricing?.enabled ?? false,
    tiers: pricing?.tiers ?? [],
  });
  const tiers = validation.tiers.sort((left, right) => left.minQty - right.minQty);
  const activeTier =
    pricing?.enabled && validation.valid
      ? tiers.find(
          (tier) =>
            tier.minQty <= totalQty &&
            (tier.maxQty == null || totalQty <= tier.maxQty),
        )
      : undefined;
  const unitPrice = activeTier?.unitPrice ?? regularPrice;
  const eligibleTiers = pricing?.enabled && validation.valid ? tiers : [];
  const nextTier = eligibleTiers.find(
    (tier) => tier.minQty > totalQty && tier.unitPrice < unitPrice,
  );

  return {
    unitPrice,
    subtotal: unitPrice * totalQty,
    tierLabel: activeTier?.label ?? null,
    tierApplied: Boolean(activeTier),
    nextTier: nextTier
      ? {
          minQty: nextTier.minQty,
          unitPrice: nextTier.unitPrice,
          qtyToNextTier: Math.max(0, nextTier.minQty - totalQty),
          potentialUnitPrice: nextTier.unitPrice,
        }
      : null,
  };
}

export function quantityTierLabel(minQty: number, maxQty: number | null) {
  return maxQty == null ? `${minQty}+ pcs` : `${minQty}-${maxQty} pcs`;
}

export function sortQuantityPricingTiers(tiers: QuantityPricingTier[]) {
  return tiers
    .map((tier) => ({
      ...tier,
      label: cleanLabel(tier.label) || quantityTierLabel(tier.minQty, tier.maxQty),
    }))
    .sort((left, right) => left.minQty - right.minQty);
}

function issue(
  code: QuantityPricingIssueCode,
  message: string,
  severity: QuantityPricingIssue["severity"],
  tierIndex?: number,
): QuantityPricingIssue {
  return { code, message, severity, ...(tierIndex == null ? {} : { tierIndex }) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.trim().replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableFiniteNumber(value: unknown) {
  if (value == null || value === "") return null;
  return finiteNumber(value);
}

function cleanLabel(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

function positiveIntegerOr(value: number, fallback: number) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function positiveNumberOr(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
