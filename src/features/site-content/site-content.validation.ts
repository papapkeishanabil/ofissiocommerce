// src/features/site-content/site-content.validation.ts
// Validates the admin PATCH payload. The `section` must be a known registry
// key, and `data` is validated against THAT section's zod schema (looked up in
// the registry), so each section's field rules stay co-located with its
// default + form descriptor. Mirrors global-embroidery-pricing.validation.ts.

import { z } from "zod";

import {
  SITE_CONTENT_SECTION_KEYS,
  getSectionEntry,
  type SectionKey,
} from "./content.schema";

export const siteContentPayloadSchema = z
  .object({
    section: z.enum(
      SITE_CONTENT_SECTION_KEYS as unknown as [SectionKey, ...SectionKey[]],
    ),
    data: z.unknown(),
  })
  .superRefine((value, ctx) => {
    const entry = getSectionEntry(value.section);
    if (!entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["section"],
        message: "Section tidak dikenal.",
      });
      return;
    }
    const parsed = entry.schema.safeParse(value.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ["data", ...issue.path] });
      }
    }
  });

export type SiteContentPayload = z.infer<typeof siteContentPayloadSchema>;
