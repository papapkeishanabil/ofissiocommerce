import "server-only";
import { woocommerceClient } from "@/features/products/woocommerce/woocommerce.client";
import { withLiveColorVariants } from "@/features/products/woocommerce/color-variants.service";
import { mapWooCommerceProductToOfissioProduct } from "@/features/products/product.mapper";
import { validateRawWooCommerceProductForOfissio, validateWooCommerceProductForOfissio } from "@/features/products/woocommerce/woocommerce-product.validation";
import { guideProduct } from "./product-guide";

/** Read every published page; never replace real products with mock catalog entries. */
export async function getGuideProducts() {
  const products = [];
  for (let page = 1; ; page++) {
    const batch = await woocommerceClient.getProducts({ status: "publish", per_page: 100, page });
    for (let offset = 0; offset < batch.length; offset += 3) {
      const mapped = await Promise.all(batch.slice(offset, offset + 3).map(async raw => {
        if (!validateRawWooCommerceProductForOfissio(raw).ok) return null;
        const product = mapWooCommerceProductToOfissioProduct(await withLiveColorVariants(raw));
        return validateWooCommerceProductForOfissio(product).ok ? guideProduct(product) : null;
      }));
      products.push(...mapped.filter(product => product !== null));
    }
    if (batch.length < 100) break;
    if (page >= 100) throw new Error("Batas pembacaan katalog tercapai; daftar tidak ditampilkan sebagian.");
  }
  return products.sort((a, b) => a.name.localeCompare(b.name, "id"));
}
