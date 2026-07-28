import { z } from "zod";

const locationSchema = z.object({
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(12),
});

export const shippingRateRequestSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(100),
        quantity: z.coerce.number().int().positive().max(100_000),
        weightGram: z.coerce.number().int().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(50),
});

export const createShipmentSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  shippingRateId: z.string().trim().min(1).max(120),
  recipient: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30),
    street: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(3).max(12),
  }),
});

export const trackingQuerySchema = z.object({
  shipmentId: z.string().trim().min(1).max(120),
});
