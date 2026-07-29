export function formatAdminDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function safeMetadataSummary(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(
    ([key]) => !/(secret|token|password|signature|authorization|api[_-]?key)/i.test(key),
  );
  if (entries.length === 0) return "-";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${stringifySafeValue(value)}`)
    .join(" · ");
}

function stringifySafeValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length} item]`;
  if (typeof value === "object") return "{...}";
  return String(value);
}
