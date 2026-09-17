import { z } from "zod";

import { isWordPressMediaProxyUrl } from "./wordpress-media-proxy";

export const PRODUCT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_MAX_COUNT = 20;

// Galeri form memakai src hasil proxy same-origin (base media loopback);
// service mencocokkannya dengan daftar foto ter-proxy lalu mengembalikan
// bentuk absolut saat menulis ke WooCommerce. Kedua bentuk sah di payload.
const safeHttpUrl = z
  .string()
  .trim()
  .max(2_000)
  .refine((value) => {
    if (isWordPressMediaProxyUrl(value)) return true;
    try {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
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
