import type { OfissioProduct } from "@/features/products/product.types";
import { isColorOption, isSizeOption } from "@/features/products/product-variants";
import { variantLink } from "@/features/products/product-variant-links";

/** Each Offer describes the same native SKU and price used by the variant selector. */
export function variantProductGroup(product: OfissioProduct, url: string, images: string[]) {
  const rows = product.productVariants ?? [];
  if (product.source !== "woocommerce" || product.status !== "published" || product.productKind !== "variable"
    || !product.stockVariantsReady || product.moq !== 1 || product.transaction_mode === "REQUEST_QUOTATION"
    || product.quantityPricing?.enabled || rows.length < 2
    || rows.some(row => !row.sku || !Number.isFinite(row.regularPrice) || row.regularPrice <= 0)
    || new Set(rows.map(row => row.sku)).size !== rows.length
    || new Set(rows.map(row => row.regularPrice)).size < 2) return undefined;
  const options = product.variantOptions ?? [];
  if (!options.length || rows.some(row => options.some(o => !o.values.includes(row.options[o.name] ?? "")))) return undefined;
  const size = options.find(o => isSizeOption(o.name));
  const color = options.find(o => isColorOption(o.name));
  const brand = { "@type": "Brand", name: "Ofissio" };
  return {
    "@type": "ProductGroup", "@id": `${url}#product`, url,
    name: product.name, description: product.description, image: images,
    productGroupID: product.sku, brand,
    ...(product.material ? { material: product.material } : {}),
    variesBy: [...(size ? ["https://schema.org/size"] : []), ...(color ? ["https://schema.org/color"] : [])],
    hasVariant: rows.map(row => {
      const variantUrl = variantLink(url, row.sku);
      const label = options.map(o => `${o.name}: ${row.options[o.name]}`).join(", ");
      let variantImage: string | undefined;
      try { const image = new URL(row.imageSrc, url); if (row.imageSrc && ["http:", "https:"].includes(image.protocol)) variantImage = image.href; } catch { /* Use the product gallery for invalid references. */ }
      return {
        "@type": "Product", "@id": `${variantUrl}#product`, url: variantUrl,
        sku: row.sku, name: `${product.name} — ${label}`,
        description: `${product.name}. ${label}. ${product.description}`, brand,
        image: variantImage ? [variantImage, ...images.filter(src => src !== variantImage)] : images,
        ...(product.material ? { material: product.material } : {}),
        ...(size ? { size: row.options[size.name] } : {}),
        ...(color && row.options[color.name] !== "Default" ? { color: row.options[color.name] } : {}),
        additionalProperty: options.filter(o => !isSizeOption(o.name) && !isColorOption(o.name)).map(o => ({ "@type": "PropertyValue", name: o.name, value: row.options[o.name] })),
        isVariantOf: { "@id": `${url}#product` },
        offers: { "@type": "Offer", url: variantUrl, price: row.regularPrice, priceCurrency: "IDR",
          ...(product.liveVariantAvailability?.[String(row.id)] ? { availability: `https://schema.org/${product.liveVariantAvailability[String(row.id)]}` } : {}),
          seller: { "@type": "Organization", name: "Ofissio", url: "https://ofissio.com" } },
      };
    }),
  };
}
