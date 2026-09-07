export function normalizeSku(value: string | null | undefined) { return (value ?? "").trim().replace(/\s+/g, " ").toUpperCase(); }
export function normalizePath(value: string) { return value.trim().replace(/\\+/g, "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "").replace(/^\/+|\/+$/g, ""); }
export function normalizeAttributeName(value: string) { return value.trim().replace(/\s+/g, " ").toUpperCase(); }
export function normalizeAttributeValue(value: string) { return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toUpperCase(); }
export const normalizeVariantHint = normalizeAttributeValue;
export function naturalCompare(a: string, b: string) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }); }
