import "server-only";

import { randomUUID } from "node:crypto";

import { productService } from "@/features/products/product.service";
import type { SizeMatrix } from "@/types/industry";

import type {
  CheckoutCartRecord,
  SyncCheckoutCartInput,
  ValidatedCheckoutCartItem,
} from "./checkout-cart.types";
import { syncCheckoutCartSchema } from "./checkout-cart.validation";

const CART_TTL_MS = 30 * 60 * 1000;

type CheckoutCartGlobal = typeof globalThis & {
  __ofissioCheckoutCarts?: Map<string, CheckoutCartRecord>;
};

const checkoutCartGlobal = globalThis as CheckoutCartGlobal;
const checkoutCarts: Map<string, CheckoutCartRecord> =
  checkoutCartGlobal.__ofissioCheckoutCarts ?? new Map<string, CheckoutCartRecord>();
checkoutCartGlobal.__ofissioCheckoutCarts = checkoutCarts;

function sumSizes(sizes: SizeMatrix) {
  return Object.values(sizes).reduce((total, quantity) => total + quantity, 0);
}

function validateAndPriceItem(
  input: SyncCheckoutCartInput["items"][number],
): ValidatedCheckoutCartItem {
  const product = productService.getProductById(input.productId);
  if (!product) throw new Error("Produk tidak ditemukan.");

  const validation = productService.validateProductForCart(product);
  if (!validation.ok) throw new Error(validation.reason);
  if (!product.model_3d) throw new Error("Model GLB produk tidak valid.");
  if (!product.available_colors.includes(input.selectedColor)) {
    throw new Error("Warna produk tidak tersedia.");
  }

  const totalQty = sumSizes(input.sizeMatrix);
  if (totalQty < product.moq) {
    throw new Error(`MOQ ${product.moq} pcs belum terpenuhi.`);
  }

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    selectedColor: input.selectedColor,
    sizeMatrix: input.sizeMatrix,
    totalQty,
    priceFrom: product.priceFrom,
    moq: product.moq,
    fulfillmentType: product.fulfillment,
    transactionMode: product.transaction_mode,
    model3dId: product.model_3d.id,
    model3dUrl: product.model_3d.url,
    customization: input.customization,
    embroideryPlacements: input.embroideryPlacements,
  };
}

export function syncCheckoutCart(input: SyncCheckoutCartInput): CheckoutCartRecord {
  const parsed = syncCheckoutCartSchema.parse(input);
  const items = parsed.items.map(validateAndPriceItem);
  const now = new Date();
  const record: CheckoutCartRecord = {
    id: `cart_${randomUUID()}`,
    companyId: parsed.companyId,
    userId: parsed.userId,
    items,
    subtotal: items.reduce(
      (total, item) => total + item.priceFrom * item.totalQty,
      0,
    ),
    totalQty: items.reduce((total, item) => total + item.totalQty, 0),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CART_TTL_MS).toISOString(),
  };
  checkoutCarts.set(record.id, record);
  return record;
}

export function getValidatedCheckoutCart(
  cartId: string,
  companyId: string,
  userId: string,
): CheckoutCartRecord {
  const stored = checkoutCarts.get(cartId);
  if (!stored) throw new Error("Cart checkout tidak ditemukan atau sudah kedaluwarsa.");
  if (stored.companyId !== companyId || stored.userId !== userId) {
    throw new Error("Cart checkout tidak dapat diakses.");
  }
  if (Date.parse(stored.expiresAt) <= Date.now()) {
    checkoutCarts.delete(cartId);
    throw new Error("Cart checkout sudah kedaluwarsa.");
  }

  // Rebuild from canonical product data on every payment attempt. Stored
  // price/model snapshots are never the final source of truth.
  const items = stored.items.map((item) =>
    validateAndPriceItem({
      productId: item.productId,
      selectedColor: item.selectedColor,
      sizeMatrix: item.sizeMatrix,
      customization: item.customization,
      embroideryPlacements: item.embroideryPlacements,
    }),
  );
  return {
    ...stored,
    items,
    subtotal: items.reduce(
      (total, item) => total + item.priceFrom * item.totalQty,
      0,
    ),
    totalQty: items.reduce((total, item) => total + item.totalQty, 0),
  };
}
