import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";

/** WooCommerce needs one real variation ID for each size, while UI groups colors. */
export function splitOrderSizeVariants(item: ValidatedCheckoutCartItem): ValidatedCheckoutCartItem[] {
  const variants = item.sizeVariants;
  if (!variants?.length) return [item];
  if (variants.some(row => row.quantity <= 0 || !Number.isInteger(row.quantity)) || variants.reduce((sum, row) => sum + row.quantity, 0) !== item.totalQty) throw new Error("Jumlah varian ukuran tidak sesuai pesanan.");
  const keys = ["subtotal", "productSubtotal", "embroideryTotal", "customizationTotal", "finalEstimatedTotal"] as const;
  const allocated = Object.fromEntries(keys.map(key => [key, 0])) as Record<typeof keys[number], number>;
  return variants.map((row, index) => {
    const amounts = Object.fromEntries(keys.map(key => {
      const total = item[key] ?? 0;
      const amount = index === variants.length - 1 ? total - allocated[key] : Math.round(total * row.quantity / item.totalQty);
      allocated[key] += amount;
      return [key, amount];
    }));
    return { ...item, ...amounts, sku: row.sku, variationId: row.variationId, totalQty: row.quantity,
      sizeMatrix: Object.fromEntries(Object.keys(item.sizeMatrix).map(size => [size, size === row.size ? row.quantity : 0])) as typeof item.sizeMatrix,
      sizeVariants: [row],
    };
  });
}
