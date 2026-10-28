import type { OfissioProduct } from "./product.types";
import type { WooCommerceProduct, WooCommerceProductVariation } from "./woocommerce/woocommerce.types";

/** A parent offer is safe only when every published native variant has one price. */
export function uniformLiveOfferPrice(product: WooCommerceProduct, rows?: readonly WooCommerceProductVariation[]) {
  if (product.status !== "publish" || product.purchasable === false) return undefined;
  const sources = product.type === "variable" ? rows?.filter(row => row.status === "publish") : [product];
  if (!sources?.length) return undefined;
  const prices = sources.map(row => {
    const price = Number(row.price || row.regular_price);
    const regular = Number(row.regular_price);
    // Storefront variant pricing uses regular prices; don't publish a conflicting sale.
    return Number.isFinite(price) && price > 0 && (!regular || regular === price) ? price : undefined;
  });
  return prices.every(price => price === prices[0]) ? prices[0] : undefined;
}

/** No stock assertion, bulk discount, quote, or variant-specific price is invented. */
export function structuredOfferPrice(product: OfissioProduct) {
  const price = product.liveOfferPrice;
  if (product.source !== "woocommerce" || product.status !== "published" || product.transaction_mode === "REQUEST_QUOTATION"
    || product.moq !== 1 || product.stockVariantsReady !== true || !price || !Number.isFinite(price) || price <= 0
    || price !== product.priceFrom) return undefined;
  if (product.quantityPricing?.enabled) {
    const tiers = product.quantityPricing.tiers.filter(tier => tier.minQty <= 1 && (tier.maxQty === null || tier.maxQty >= 1));
    if (tiers.length !== 1 || tiers[0]?.unitPrice !== price) return undefined;
  }
  return price;
}
