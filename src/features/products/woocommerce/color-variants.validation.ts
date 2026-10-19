import { z } from "zod";
import { colorKey } from "../color-variants";

export const adminColorVariantsSchema = z.object({
  variants: z.array(z.object({
    id: z.number().int().positive().optional(),
    color: z.string().trim().min(1).max(100),
    sku: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/, "SKU hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung."),
    imageSrc: z.string().trim().min(1, "Pilih foto untuk setiap warna.").max(2000),
    fabricColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Pilih warna kain 3D yang valid.").transform((value) => value.toLowerCase()).optional(),
    stockQuantity: z.number().int().min(0).max(1_000_000_000).nullable(),
  })).max(60),
  defaultColor: z.string().trim().max(100).default(""),
}).superRefine((value, context) => {
  const skus = new Set<string>();
  const colors = new Set<string>();
  const ids = new Set<number>();
  value.variants.forEach((variant, index) => {
    for (const [field, key, set] of [
      ["sku", colorKey(variant.sku), skus], ["color", colorKey(variant.color), colors],
    ] as const) {
      if (set.has(key)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", index, field], message: `${field === "sku" ? "SKU" : "Warna"} varian tidak boleh duplikat.` });
      set.add(key);
    }
    if (variant.id && ids.has(variant.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", index, "id"], message: "ID varian tidak boleh duplikat." });
    if (variant.id) ids.add(variant.id);
  });
  if (value.variants.length && !colors.has(colorKey(value.defaultColor))) context.addIssue({ code: z.ZodIssueCode.custom, path: ["defaultColor"], message: "Pilih warna yang tampil pertama." });
});

export type AdminColorVariantsPayload = z.infer<typeof adminColorVariantsSchema>;
