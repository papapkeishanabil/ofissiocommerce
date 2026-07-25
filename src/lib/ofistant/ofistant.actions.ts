// src/lib/ofistant/ofistant.actions.ts
// Structured actions Ofistant may emit. Every action is a Zod schema so the
// shape is enforced at the boundary — exactly the contract an LLM tool-call
// layer will satisfy later.

import { z } from "zod";

// ----- Read / navigation actions (safe, executed immediately) -----

export const showProductsSchema = z.object({
  type: z.literal("SHOW_PRODUCTS"),
  payload: z
    .object({
      industry: z.string().optional(),
      category: z.string().optional(),
      /** optional rationale shown to the user */
      reason: z.string().optional(),
    })
    .optional(),
});
export type ShowProductsAction = z.infer<typeof showProductsSchema>;

export const openProductDetailSchema = z.object({
  type: z.literal("OPEN_PRODUCT_DETAIL"),
  payload: z.object({
    slug: z.string(),
    reason: z.string().optional(),
  }),
});
export type OpenProductDetailAction = z.infer<typeof openProductDetailSchema>;

export const showProductComparisonSchema = z.object({
  type: z.literal("SHOW_PRODUCT_COMPARISON"),
  payload: z.object({
    productSlugs: z.array(z.string()).min(2).max(3),
    reason: z.string().optional(),
  }),
});
export type ShowProductComparisonAction = z.infer<
  typeof showProductComparisonSchema
>;

export const openCartSchema = z.object({
  type: z.literal("OPEN_CART"),
  payload: z.object({}).optional(),
});
export type OpenCartAction = z.infer<typeof openCartSchema>;

export const openCheckoutSchema = z.object({
  type: z.literal("OPEN_CHECKOUT"),
  payload: z.object({}).optional(),
});
export type OpenCheckoutAction = z.infer<typeof openCheckoutSchema>;

export const openRegisterSchema = z.object({
  type: z.literal("OPEN_REGISTER"),
  payload: z.object({}).optional(),
});
export type OpenRegisterAction = z.infer<typeof openRegisterSchema>;

export const requestQuotationSchema = z.object({
  type: z.literal("REQUEST_QUOTATION"),
  payload: z.object({}).optional(),
});
export type RequestQuotationAction = z.infer<typeof requestQuotationSchema>;

export const openOrderTrackingSchema = z.object({
  type: z.literal("OPEN_ORDER_TRACKING"),
  payload: z.object({ orderId: z.string().optional() }).optional(),
});
export type OpenOrderTrackingAction = z.infer<typeof openOrderTrackingSchema>;

// ----- Mutation actions (require user confirmation) -----

export const addToCartSchema = z.object({
  type: z.literal("ADD_TO_CART"),
  payload: z.object({
    productId: z.string(),
    productSlug: z.string(),
    productName: z.string(),
    color: z.string(),
    sizeMatrix: z.object({
      S: z.number().int().min(0),
      M: z.number().int().min(0),
      L: z.number().int().min(0),
      XL: z.number().int().min(0),
      "2XL": z.number().int().min(0),
      "3XL": z.number().int().min(0),
    }),
    customization: z.string().nullable().optional(),
    reason: z.string().optional(),
  }),
});
export type AddToCartAction = z.infer<typeof addToCartSchema>;

// ----- Configuration actions (placeholder; full impl in Phase 8) -----

export const setSelectedColorSchema = z.object({
  type: z.literal("SET_SELECTED_COLOR"),
  payload: z.object({
    color: z.string(),
    productId: z.string().optional(),
  }),
});
export type SetSelectedColorAction = z.infer<typeof setSelectedColorSchema>;

export const setSizeMatrixSchema = z.object({
  type: z.literal("SET_SIZE_MATRIX"),
  payload: z.object({
    sizeMatrix: z.object({
      S: z.number().int().min(0),
      M: z.number().int().min(0),
      L: z.number().int().min(0),
      XL: z.number().int().min(0),
      "2XL": z.number().int().min(0),
      "3XL": z.number().int().min(0),
    }),
    productId: z.string().optional(),
  }),
});
export type SetSizeMatrixAction = z.infer<typeof setSizeMatrixSchema>;

export const setEmbroideryZonesSchema = z.object({
  type: z.literal("SET_EMBROIDERY_ZONES"),
  payload: z.object({
    zones: z.array(z.string()),
  }),
});
export type SetEmbroideryZonesAction = z.infer<typeof setEmbroideryZonesSchema>;

// ----- Human handoff (no side effect, just messaging) -----

export const requestHumanHandoffSchema = z.object({
  type: z.literal("REQUEST_HUMAN_HANDOFF"),
  payload: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});
export type RequestHumanHandoffAction = z.infer<
  typeof requestHumanHandoffSchema
>;

// ----- Discriminated union of all actions -----

export const ofistantActionSchema = z.discriminatedUnion("type", [
  showProductsSchema,
  openProductDetailSchema,
  showProductComparisonSchema,
  openCartSchema,
  openCheckoutSchema,
  openRegisterSchema,
  requestQuotationSchema,
  openOrderTrackingSchema,
  addToCartSchema,
  setSelectedColorSchema,
  setSizeMatrixSchema,
  setEmbroideryZonesSchema,
  requestHumanHandoffSchema,
]);

export type OfistantAction = z.infer<typeof ofistantActionSchema>;

export type ActionType = OfistantAction["type"];

/** Actions that mutate cart/checkout MUST be confirmed by the user first. */
export const REQUIRES_CONFIRMATION: ReadonlySet<ActionType> = new Set([
  "ADD_TO_CART",
]);

/** Actions that imply a route navigation in the workspace. */
export const NAVIGATING_ACTIONS: ReadonlySet<ActionType> = new Set([
  "SHOW_PRODUCTS",
  "OPEN_PRODUCT_DETAIL",
  "SHOW_PRODUCT_COMPARISON",
  "OPEN_CART",
  "OPEN_CHECKOUT",
  "OPEN_REGISTER",
  "REQUEST_QUOTATION",
  "OPEN_ORDER_TRACKING",
]);

export function describeActionType(t: ActionType): string {
  switch (t) {
    case "SHOW_PRODUCTS":
      return "Tampilkan produk";
    case "OPEN_PRODUCT_DETAIL":
      return "Buka detail produk";
    case "SHOW_PRODUCT_COMPARISON":
      return "Bandingkan produk";
    case "SET_SELECTED_COLOR":
      return "Pilih warna";
    case "SET_SIZE_MATRIX":
      return "Atur ukuran";
    case "SET_EMBROIDERY_ZONES":
      return "Atur bordir";
    case "OPEN_CART":
      return "Buka keranjang";
    case "ADD_TO_CART":
      return "Tambah ke keranjang";
    case "OPEN_CHECKOUT":
      return "Buka checkout";
    case "OPEN_REGISTER":
      return "Daftar akun";
    case "REQUEST_QUOTATION":
      return "Request quotation";
    case "OPEN_ORDER_TRACKING":
      return "Lacak order";
    case "REQUEST_HUMAN_HANDOFF":
      return "Hubungi sales";
  }
}
