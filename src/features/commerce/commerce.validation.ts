import { z } from "zod";

export const productSourceSchema = z.enum(["mock", "woocommerce"]);

export const woocommerceOrderStatusSchema = z.enum([
  "pending",
  "processing",
  "cancelled",
  "failed",
  "refunded",
  "completed",
  "on-hold",
]);
