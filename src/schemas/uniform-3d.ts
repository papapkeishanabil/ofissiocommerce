// src/schemas/uniform-3d.ts
// Zod validation at every boundary: upload payload, placement update,
// full config. Logo dimensions enforced to safe embroidery ranges.

import { z } from "zod";

import {
  CAMERA_PRESETS,
  EMBROIDERY_ZONES,
} from "@/types/uniform-3d";

export const embroideryZoneSchema = z.enum(EMBROIDERY_ZONES);
export const cameraPresetSchema = z.enum(CAMERA_PRESETS);
export const embroideryTechniqueSchema = z.enum([
  "embroidery",
  "print",
  "patch",
]);

export const logoPlacementSchema = z.object({
  zone: embroideryZoneSchema,
  logoFileId: z.string().min(1),
  logoFileName: z.string().min(1),
  logoPreviewUrl: z.string().optional(),
  widthCm: z.coerce.number().min(3, "Lebar minimal 3 cm").max(12, "Lebar maksimal 12 cm"),
  heightCm: z.coerce.number().min(1, "Tinggi minimal 1 cm").max(12, "Tinggi maksimal 12 cm"),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  technique: embroideryTechniqueSchema,
  surfacePoint: z.tuple([z.number(), z.number(), z.number()]).optional(),
  surfaceNormal: z.tuple([z.number(), z.number(), z.number()]).optional(),
});
export type LogoPlacementForm = z.infer<typeof logoPlacementSchema>;

export const uniform3DConfigSchema = z.object({
  productId: z.string().min(1),
  model3dId: z.string().min(1),
  color: z.string().min(1),
  placements: z.array(logoPlacementSchema).max(EMBROIDERY_ZONES.length),
  snapshots: z.record(cameraPresetSchema, z.string()).optional(),
  activeCamera: cameraPresetSchema,
  updatedAt: z.string(),
});
export type Uniform3DConfigForm = z.infer<typeof uniform3DConfigSchema>;

/**
 * Logo file upload validation (client-side first line of defense).
 * Phase 8 will add server-side AV scan + re-encode.
 */
export const LOGO_UPLOAD_CONSTRAINTS = {
  // PNG (transparent bg ideal for embroidery) + JPG + SVG (sanitized server-side)
  allowedMime: ["image/png", "image/jpeg", "image/svg+xml"] as const,
  maxBytes: 5 * 1024 * 1024, // 5 MB
  recommended: "PNG transparan 300 DPI, max 5 MB",
} as const;

export function validateLogoFile(file: File): { ok: boolean; reason?: string } {
  const mime = file.type as (typeof LOGO_UPLOAD_CONSTRAINTS.allowedMime)[number];
  if (!LOGO_UPLOAD_CONSTRAINTS.allowedMime.includes(mime)) {
    return {
      ok: false,
      reason: "Format harus PNG, JPG, atau SVG.",
    };
  }
  if (file.size > LOGO_UPLOAD_CONSTRAINTS.maxBytes) {
    return {
      ok: false,
      reason: `Ukuran maksimal ${Math.round(LOGO_UPLOAD_CONSTRAINTS.maxBytes / 1024 / 1024)} MB.`,
    };
  }
  return { ok: true };
}
