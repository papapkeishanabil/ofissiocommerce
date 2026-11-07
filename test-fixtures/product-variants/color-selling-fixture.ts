import { GENERIC_VARIANTS_META, PRODUCT_KIND_META, VARIANT_OPTIONS_META } from "@/features/products/product-variants";
import type { WooCommerceProduct, WooCommerceProductVariation } from "@/features/products/woocommerce/woocommerce.types";

/** Synthetic data only. No production IDs, accounts, uploads, or network access. */
export function colorSellingFixture() {
  const options = [{ name: "Warna", values: ["Apricot", "Pink"] }, { name: "Ukuran", values: ["S", "M"] }];
  const variants = options[0]!.values.flatMap((color, index) => ["S", "M"].map((size, n) => ({
    id: 100 + index * 2 + n, sku: `SN-${color.toUpperCase()}-${size}`, options: { Warna: color, Ukuran: size },
    imageSrc: `https://images.example/${color.toLowerCase()}.png`, regularPrice: 85000,
  })));
  const product: WooCommerceProduct = {
    id: 990901, name: "Kemeja Pink Red Uji", slug: "color-selling-fixture", sku: "OFS-COLOR-SELLING-TEST", type: "variable", status: "publish",
    description: "Produk sintetis untuk menguji penjualan warna.", short_description: "Kemeja untuk pengujian.", regular_price: "85000", price: "85000", sale_price: "",
    categories: [{ id: 1, name: "Kemeja", slug: "kemeja" }],
    images: options[0]!.values.map((color, index) => ({ id: 11 + index, src: `https://images.example/${color.toLowerCase()}.png`, name: color, alt: color })),
    attributes: options.map((option, index) => ({ id: index + 1, name: option.name, slug: option.name.toLowerCase(), options: option.values, visible: true, variation: true })),
    meta_data: Object.entries({
      [PRODUCT_KIND_META]: "variable", ofissio_model_code: "SN", [VARIANT_OPTIONS_META]: options, [GENERIC_VARIANTS_META]: variants,
      ofissio_default_variant_sku: variants[0]!.sku, available_colors: '["Apricot","Pink"]', available_sizes: '["S","M"]',
      ofissio_default_color: "Apricot", ofissio_stock_variants_ready: "1", industries: '["office"]', moq: 1, lead_time: "3 hari",
      fulfillment_type: "ready_stock", transaction_mode: "direct_checkout", always_orderable: "1", quantity_pricing_enabled: "0",
      material: "Toyobo", gender: "women", sleeve_type: "long", ofissio_weight_gram: 250, ofissio_length_cm: 30, ofissio_width_cm: 20, ofissio_height_cm: 3,
    }).map(([key, value]) => ({ key, value })),
  };
  const rows: WooCommerceProductVariation[] = variants.map((variant, index) => ({
    id: variant.id, sku: variant.sku, status: "publish", price: "85000", regular_price: "85000", sale_price: "", manage_stock: true, stock_quantity: 7 + index,
    stock_status: "instock", image: product.images![index < 2 ? 0 : 1], attributes: Object.entries(variant.options).map(([name, option]) => ({ name, option })),
    meta_data: [{ key: "ofissio_product_variant", value: true }],
  }));
  return { product, rows, options, variants };
}
