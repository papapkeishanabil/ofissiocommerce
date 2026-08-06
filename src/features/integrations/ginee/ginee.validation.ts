import { z } from "zod";

const safeId = z.string().trim().min(2).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const safeSku = z.string().trim().min(2).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._-]+$/);

export const gineeOrderIdSchema = z.object({ id: safeId });

export const gineeInventoryQuerySchema = z.object({ sku: safeSku });

export const gineeMappingSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid().nullable().optional(),
  ofissioProductId: safeId.nullable().optional(),
  woocommerceProductId: safeId.nullable().optional(),
  woocommerceVariationId: safeId.nullable().optional(),
  parentSku: safeSku,
  stockSku: safeSku,
  sizeLabel: z.string().trim().max(40).nullable().optional(),
  colorLabel: z.string().trim().max(80).nullable().optional(),
  gineeProductId: safeId.nullable().optional(),
  gineeVariationId: safeId.nullable().optional(),
  gineeMasterProductId: safeId.nullable().optional(),
  gineeSku: safeSku,
  gineeWarehouseId: safeId.nullable().optional(),
}).strict();
