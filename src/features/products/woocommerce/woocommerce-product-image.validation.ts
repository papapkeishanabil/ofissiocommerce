import { z } from "zod";

export const PRODUCT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_MAX_COUNT = 20;

const safeHttpUrl = z
  .string()
  .trim()
  .url()
  .max(2_000)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "URL foto harus menggunakan HTTP atau HTTPS.");

export const adminProductImagesPatchSchema = z.object({
  images: z
    .array(
      z.object({
        id: z.union([z.number().int().positive(), z.null()]).optional(),
        src: safeHttpUrl,
        name: z.string().trim().max(180).optional(),
        alt: z.string().trim().max(300).optional(),
      }),
    )
    .max(PRODUCT_IMAGE_MAX_COUNT),
});

export type AdminProductImagesPatch = z.infer<
  typeof adminProductImagesPatchSchema
>;
