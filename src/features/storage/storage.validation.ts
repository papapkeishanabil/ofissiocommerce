import { z } from "zod";

import {
  STORAGE_FILE_STATUSES,
  STORAGE_FILE_TYPES,
} from "./storage.types";

export const storageFileTypeSchema = z.enum(STORAGE_FILE_TYPES);
export const storageFileStatusSchema = z.enum(STORAGE_FILE_STATUSES);

export const fileListQuerySchema = z.object({
  fileType: storageFileTypeSchema.optional(),
  status: storageFileStatusSchema.optional(),
});

export const uploadMetadataSchema = z
  .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .optional();

export const uploadFormSchema = z.object({
  fileType: storageFileTypeSchema,
  metadata: z.string().trim().max(3000).optional(),
});

export const companyLogoCreateSchema = z.object({
  fileId: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(120).optional(),
});
