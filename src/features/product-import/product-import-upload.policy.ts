export function validateProductImportZipSelection(file: Pick<File, "name" | "size">, maxZipBytes: number) {
  if (!file.name.toLowerCase().endsWith(".zip")) return { ok: false as const, reason: "INVALID_EXTENSION" as const };
  if (file.size > maxZipBytes) return { ok: false as const, reason: "ABOVE_SIZE_LIMIT" as const };
  return { ok: true as const };
}
