import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung.");

const synonymsSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .transform((items) => [...new Set(items.map((item) => item.toLowerCase()))]);

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(1000).default(""),
  active: z.boolean().default(true),
  synonyms: synonymsSchema.default([]),
});

export const categoryPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().max(1000).optional(),
    active: z.boolean().optional(),
    synonyms: synonymsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diubah.");

export const industryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().max(1000).default(""),
  active: z.boolean().default(true),
  synonyms: synonymsSchema.default([]),
  sortOrder: z.number().int().min(0).max(10000).default(100),
});

export const industryPatchSchema = industryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diubah.");

export const taxonomyIdParamSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export type CategoryCreatePayload = z.infer<typeof categoryCreateSchema>;
export type CategoryPatchPayload = z.infer<typeof categoryPatchSchema>;
export type IndustryCreatePayload = z.infer<typeof industryCreateSchema>;
export type IndustryPatchPayload = z.infer<typeof industryPatchSchema>;
