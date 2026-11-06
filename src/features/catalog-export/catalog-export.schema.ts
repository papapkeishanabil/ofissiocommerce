import { z } from "zod";

export const catalogExportSchema = z.object({
  scope: z.enum(["all", "category", "selected"]).default("all"),
  categoryIds: z.array(z.number().int().positive()).max(100).default([]),
  productIds: z.array(z.number().int().positive()).max(200).default([]),
  includeVariants: z.boolean().default(true),
  showPrices: z.boolean().default(false),
  format: z.enum(["preview", "pdf"]).default("pdf"),
  delivery: z.enum(["attachment", "link"]).default("attachment"),
}).strict().superRefine((value, ctx) => {
  if (value.scope === "category" && !value.categoryIds.length) ctx.addIssue({ code: "custom", message: "Pilih minimal satu kategori.", path: ["categoryIds"] });
  if (value.scope === "selected" && !value.productIds.length) ctx.addIssue({ code: "custom", message: "Pilih minimal satu produk.", path: ["productIds"] });
});
export type CatalogExportOptions = z.infer<typeof catalogExportSchema>;

export interface CatalogVariant {
  color: string;
  colorHex: string | null;
  sleeve: string;
  label: string;
  sku: string;
  skuSize: string;
  sizes: string[];
  image: string;
  price: number | null;
}
export interface CatalogProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  descriptionHtml: string;
  material: string;
  image: string;
  extraImages: string[];
  variants: CatalogVariant[];
}
