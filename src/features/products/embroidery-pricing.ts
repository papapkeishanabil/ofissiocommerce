export const EMBROIDERY_PRICING_ZONE_IDS = [
  "left_chest",
  "right_chest",
  "left_sleeve",
  "right_sleeve",
  "upper_back",
  "center_back",
] as const;

export const EMBROIDERY_PRICING_MODES = ["flat_per_piece"] as const;

export type EmbroideryPricingZoneId =
  (typeof EMBROIDERY_PRICING_ZONE_IDS)[number];
export type EmbroideryPricingMode =
  (typeof EMBROIDERY_PRICING_MODES)[number];

export interface EmbroideryPricingZone {
  zoneId: EmbroideryPricingZoneId;
  label: string;
  enabled: boolean;
  maxWidthCm: number;
  maxHeightCm: number;
  unitPrice: number;
  setupFee: number;
  pricingMode: EmbroideryPricingMode;
  showSetupFee: boolean;
  notes?: string;
}

export interface EmbroideryPricing {
  enabled: boolean;
  mode: EmbroideryPricingMode;
  zones: EmbroideryPricingZone[];
}

export interface EmbroideryPricingLine {
  zoneId: EmbroideryPricingZoneId;
  label: string;
  quantity: number;
  unitPrice: number;
  setupFee: number;
  subtotal: number;
  setupFeeApplied: boolean;
}

export interface EmbroideryPricingResult {
  total: number;
  lines: EmbroideryPricingLine[];
  missingPricingZones: EmbroideryPricingZoneId[];
}

export interface EmbroideryPricingIssue {
  code:
    | "invalid_json"
    | "invalid_structure"
    | "invalid_zone"
    | "duplicate_zone"
    | "empty_label"
    | "invalid_unit_price"
    | "invalid_width"
    | "invalid_height"
    | "invalid_setup_fee"
    | "invalid_mode"
    | "no_enabled_zone";
  message: string;
  zoneIndex?: number;
}

export interface EmbroideryPricingValidation {
  valid: boolean;
  errors: EmbroideryPricingIssue[];
}

export const DEFAULT_EMBROIDERY_PRICING_ZONES: EmbroideryPricingZone[] = [
  defaultZone("left_chest", "Dada Kiri", 8, 8, 5_000, "Logo kecil dada kiri"),
  defaultZone("right_chest", "Dada Kanan", 8, 8, 5_000, "Logo atau nama"),
  defaultZone("left_sleeve", "Lengan Kiri", 7, 7, 6_000, "Bordir lengan"),
  defaultZone("right_sleeve", "Lengan Kanan", 7, 7, 6_000, "Bordir lengan"),
  defaultZone("upper_back", "Punggung Atas", 20, 8, 10_000, "Logo sedang punggung atas"),
  defaultZone("center_back", "Punggung Tengah", 25, 20, 15_000, "Logo besar punggung tengah"),
];

export function createDefaultEmbroideryPricingZones() {
  return DEFAULT_EMBROIDERY_PRICING_ZONES.map((zone) => ({ ...zone }));
}

export function normalizeEmbroideryZoneId(
  value: unknown,
): EmbroideryPricingZoneId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  const compatible = ["back", "middle_back"].includes(normalized)
    ? "center_back"
    : normalized;
  return EMBROIDERY_PRICING_ZONE_IDS.includes(compatible as never)
    ? (compatible as EmbroideryPricingZoneId)
    : null;
}

export function parseEmbroideryPricingZones(value: unknown): {
  zones: unknown[];
  issues: EmbroideryPricingIssue[];
} {
  let parsed = value;
  if (typeof value === "string") {
    if (!value.trim()) return { zones: [], issues: [] };
    try {
      parsed = JSON.parse(value);
    } catch {
      return {
        zones: [],
        issues: [{ code: "invalid_json", message: "JSON harga bordir tidak valid." }],
      };
    }
  }
  if (Array.isArray(parsed)) return { zones: parsed, issues: [] };
  if (isRecord(parsed) && Array.isArray(parsed.zones)) {
    return { zones: parsed.zones, issues: [] };
  }
  if (parsed == null || parsed === "") return { zones: [], issues: [] };
  return {
    zones: [],
    issues: [{ code: "invalid_structure", message: "Struktur harga bordir per zona tidak valid." }],
  };
}

export function normalizeEmbroideryPricing(input: {
  enabled?: unknown;
  mode?: unknown;
  zones?: unknown;
  supportsEmbroidery?: boolean;
}): {
  embroideryPricing: EmbroideryPricing;
  issues: EmbroideryPricingIssue[];
  valid: boolean;
} {
  const parsed = parseEmbroideryPricingZones(input.zones);
  const issues = [...parsed.issues];
  const zones: EmbroideryPricingZone[] = [];

  parsed.zones.forEach((raw, zoneIndex) => {
    if (!isRecord(raw)) {
      issues.push({ code: "invalid_structure", message: `Data zona ${zoneIndex + 1} tidak valid.`, zoneIndex });
      return;
    }
    const zoneId = normalizeEmbroideryZoneId(raw.zoneId);
    if (!zoneId) {
      issues.push({ code: "invalid_zone", message: `Zona bordir ${zoneIndex + 1} tidak dikenal.`, zoneIndex });
      return;
    }
    const setupFee = finiteNumber(raw.setupFee, 0);
    zones.push({
      zoneId,
      label: stringValue(raw.label) || embroideryZoneLabel(zoneId),
      enabled: booleanValue(raw.enabled, true),
      maxWidthCm: finiteNumber(raw.maxWidthCm, 0),
      maxHeightCm: finiteNumber(raw.maxHeightCm, 0),
      unitPrice: finiteNumber(raw.unitPrice, 0),
      setupFee,
      pricingMode: "flat_per_piece",
      showSetupFee: setupFee > 0,
      ...(stringValue(raw.notes) ? { notes: stringValue(raw.notes) } : {}),
    });
    if (raw.pricingMode != null && raw.pricingMode !== "flat_per_piece") {
      issues.push({ code: "invalid_mode", message: `Mode harga zona ${embroideryZoneLabel(zoneId)} harus flat_per_piece.`, zoneIndex });
    }
  });

  const enabled = booleanValue(input.enabled, true);
  const validation = validateEmbroideryPricing({
    enabled,
    zones,
    supportsEmbroidery: input.supportsEmbroidery ?? false,
  });
  issues.push(...validation.errors);
  return {
    embroideryPricing: { enabled, mode: "flat_per_piece", zones },
    issues: uniqueIssues(issues),
    valid: issues.length === 0,
  };
}

export function validateEmbroideryPricing(input: {
  enabled: boolean;
  zones: Array<Partial<EmbroideryPricingZone> & { zoneId?: unknown }>;
  supportsEmbroidery: boolean;
}): EmbroideryPricingValidation {
  const errors: EmbroideryPricingIssue[] = [];
  if (!input.enabled) return { valid: true, errors };
  const seen = new Set<EmbroideryPricingZoneId>();

  input.zones.forEach((zone, zoneIndex) => {
    const zoneId = normalizeEmbroideryZoneId(zone.zoneId);
    if (!zoneId) {
      errors.push({ code: "invalid_zone", message: `Zona bordir ${zoneIndex + 1} tidak dikenal.`, zoneIndex });
      return;
    }
    if (seen.has(zoneId)) {
      errors.push({ code: "duplicate_zone", message: `Zona ${embroideryZoneLabel(zoneId)} tidak boleh duplikat.`, zoneIndex });
    }
    seen.add(zoneId);
    if (!String(zone.label ?? "").trim()) {
      errors.push({ code: "empty_label", message: `Label ${embroideryZoneLabel(zoneId)} wajib diisi.`, zoneIndex });
    }
    const setupFee = Number(zone.setupFee ?? 0);
    if (!Number.isFinite(setupFee) || setupFee < 0) {
      errors.push({ code: "invalid_setup_fee", message: `Biaya setup ${embroideryZoneLabel(zoneId)} tidak boleh negatif.`, zoneIndex });
    }
    if (zone.pricingMode != null && zone.pricingMode !== "flat_per_piece") {
      errors.push({ code: "invalid_mode", message: `Mode harga ${embroideryZoneLabel(zoneId)} harus flat_per_piece.`, zoneIndex });
    }
    if (!zone.enabled) return;
    if (!(Number(zone.unitPrice) > 0)) {
      errors.push({ code: "invalid_unit_price", message: `Harga per pcs ${embroideryZoneLabel(zoneId)} wajib lebih dari 0.`, zoneIndex });
    }
    if (!(Number(zone.maxWidthCm) > 0)) {
      errors.push({ code: "invalid_width", message: `Maks lebar ${embroideryZoneLabel(zoneId)} wajib lebih dari 0 cm.`, zoneIndex });
    }
    if (!(Number(zone.maxHeightCm) > 0)) {
      errors.push({ code: "invalid_height", message: `Maks tinggi ${embroideryZoneLabel(zoneId)} wajib lebih dari 0 cm.`, zoneIndex });
    }
  });

  if (
    input.enabled &&
    input.supportsEmbroidery &&
    !input.zones.some((zone) => zone.enabled)
  ) {
    errors.push({ code: "no_enabled_zone", message: "Aktifkan minimal satu zona harga bordir." });
  }
  return { valid: errors.length === 0, errors: uniqueIssues(errors) };
}

export function calculateEmbroideryPricing(input: {
  totalQty: number;
  selectedZones: readonly unknown[];
  embroideryPricing?: EmbroideryPricing | null;
}): EmbroideryPricingResult {
  const totalQty = Math.max(0, Math.floor(Number(input.totalQty) || 0));
  const selectedZones = [...new Set(
    input.selectedZones
      .map(normalizeEmbroideryZoneId)
      .filter((zone): zone is EmbroideryPricingZoneId => zone != null),
  )];
  const lines: EmbroideryPricingLine[] = [];
  const missingPricingZones: EmbroideryPricingZoneId[] = [];
  for (const zoneId of selectedZones) {
    const zone = input.embroideryPricing?.enabled
      ? input.embroideryPricing.zones.find(
          (candidate) => candidate.zoneId === zoneId && candidate.enabled,
        )
      : undefined;
    if (!zone || !(zone.unitPrice > 0)) {
      missingPricingZones.push(zoneId);
      continue;
    }
    const setupFeeApplied = zone.setupFee > 0;
    const subtotal = totalQty * zone.unitPrice + (setupFeeApplied ? zone.setupFee : 0);
    lines.push({
      zoneId,
      label: `Bordir ${zone.label}`,
      quantity: totalQty,
      unitPrice: zone.unitPrice,
      setupFee: zone.setupFee,
      subtotal,
      setupFeeApplied,
    });
  }
  return {
    total: lines.reduce((total, line) => total + line.subtotal, 0),
    lines,
    missingPricingZones,
  };
}

export function embroideryZoneLabel(zoneId: EmbroideryPricingZoneId) {
  return DEFAULT_EMBROIDERY_PRICING_ZONES.find((zone) => zone.zoneId === zoneId)?.label ?? zoneId;
}

function defaultZone(
  zoneId: EmbroideryPricingZoneId,
  label: string,
  maxWidthCm: number,
  maxHeightCm: number,
  unitPrice: number,
  notes: string,
): EmbroideryPricingZone {
  return {
    zoneId,
    label,
    enabled: true,
    maxWidthCm,
    maxHeightCm,
    unitPrice,
    setupFee: 0,
    pricingMode: "flat_per_piece",
    showSetupFee: false,
    notes,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "string" && value.trim() === "" ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    if (["true", "1", "yes", "on"].includes(value.trim().toLowerCase())) return true;
    if (["false", "0", "no", "off"].includes(value.trim().toLowerCase())) return false;
  }
  return fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueIssues(issues: EmbroideryPricingIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.zoneIndex ?? "all"}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
