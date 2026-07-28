import type { WooCommerceMetaData } from "./woocommerce.types";

export function getMetaValue(meta: WooCommerceMetaData[], key: string) {
  return meta.find((item) => item.key === key)?.value;
}

export function getMetaString(meta: WooCommerceMetaData[], key: string) {
  const value = getMetaValue(meta, key);
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

export function getMetaNumber(
  meta: WooCommerceMetaData[],
  key: string,
  fallback: number,
) {
  const value = getMetaValue(meta, key);
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[^\d.]/g, ""))
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getMetaBoolean(
  meta: WooCommerceMetaData[],
  key: string,
  fallback: boolean,
) {
  const value = getMetaValue(meta, key);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  }
  return fallback;
}

export function getMetaStringArray(meta: WooCommerceMetaData[], key: string) {
  const value = getMetaValue(meta, key);
  return normalizeStringArray(value);
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return normalizeStringArray(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
