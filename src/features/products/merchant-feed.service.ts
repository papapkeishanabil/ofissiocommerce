import "server-only";
import { woocommerceClient } from "./woocommerce/woocommerce.client";
import { listColorVariationRows, withLiveColorVariants } from "./woocommerce/color-variants.service";
import { mapWooCommerceProductToOfissioProduct } from "./product.mapper";
import { merchantProduct, merchantXml, type MerchantResult } from "./merchant-feed";

/** No mock fallback, no persisted product writes, and no partial page on upstream failure. */
export async function readMerchantFeed() {
  const result: MerchantResult = { items: [], excluded: [] };
  for (let page = 1; ; page++) {
    const batch = await woocommerceClient.getProducts({ status: "publish", per_page: 100, page });
    for (let offset = 0; offset < batch.length; offset += 3) {
      const mapped = await Promise.all(batch.slice(offset, offset + 3).map(async raw => {
        const rows = raw.type === "variable" ? await listColorVariationRows(raw.id) : [];
        const source = { ...woocommerceClient, getProductVariations: async (_id: string | number, query?: { page?: number; per_page?: number }) => {
          const size = query?.per_page ?? 100;
          const start = ((query?.page ?? 1) - 1) * size;
          return rows.slice(start, start + size);
        } };
        return merchantProduct(mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(raw, source)), rows);
      }));
      for (const product of mapped) { result.items.push(...product.items); result.excluded.push(...product.excluded); }
    }
    if (batch.length < 100) break;
    if (page >= 100) throw new Error("Merchant catalog pagination limit");
  }
  if (!result.items.length) throw new Error("No eligible Merchant products");
  if (new Set(result.items.map(item => item.id)).size !== result.items.length) throw new Error("Duplicate Merchant IDs");
  return { ...result, xml: merchantXml(result.items) };
}

// Coalesce concurrent requests and bound API traffic. Failed reads are never cached.
let cached: { xml: string; expires: number } | undefined;
let pending: Promise<string> | undefined;
export function getMerchantFeedXml(): Promise<string> {
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.xml);
  if (!pending) pending = readMerchantFeed().then(({ xml }) => {
    cached = { xml, expires: Date.now() + 60_000 }; return xml;
  }).finally(() => { pending = undefined; });
  return pending;
}
