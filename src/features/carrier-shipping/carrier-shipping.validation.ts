import { z } from "zod";

export const carrierOrderIdSchema = z.object({
  id: z.string().trim().min(1).max(180),
});

export const carrierRateRequestSchema = z.object({
  couriers: z.array(z.string().trim().min(2).max(30)).max(12).optional(),
});

export const carrierCreateRequestSchema = z.object({
  quoteId: z.string().trim().min(1).max(180),
});

