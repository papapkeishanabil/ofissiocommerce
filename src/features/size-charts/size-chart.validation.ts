// src/features/size-charts/size-chart.validation.ts
import { z } from "zod";

import { SIZES } from "@/types/industry";

const sizeChartRowSchema = z.object({
  size: z.enum(SIZES),
  chest: z.number().int().min(0).max(300),
  length: z.number().int().min(0).max(300),
  shoulder: z.number().int().min(0).max(300).optional().default(0),
  height: z.number().int().min(0).max(300).optional().default(0),
});

export const sizeChartStandardSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(160).optional(),
  categorySlugs: z.array(z.string().trim().toLowerCase().min(1).max(80)).max(20),
  isFallback: z.boolean().optional(),
  rows: z.array(sizeChartRowSchema).max(SIZES.length),
});

export const sizeChartStandardsPayloadSchema = z.object({
  standards: z.array(sizeChartStandardSchema).min(1).max(50),
});
