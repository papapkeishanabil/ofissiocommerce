import type {
  WooCommerceAttribute,
  WooCommerceProduct,
  WooCommerceProductVariation,
  WooCommerceVariationAttribute,
} from "./woocommerce.types";

export type WooProductStandardIssueCode =
  | "product_not_variable"
  | "parent_sku_missing"
  | "size_attribute_missing"
  | "size_attribute_not_for_variation"
  | "variation_missing"
  | "variation_size_missing"
  | "variation_sku_missing"
  | "variation_sku_invalid"
  | "variation_sku_duplicate"
  | "variation_manage_stock_disabled"
  | "variation_stock_quantity_missing";

export interface WooProductStandardIssue {
  code: WooProductStandardIssueCode;
  message: string;
  variationId?: number;
}

export interface WooProductStandardResult {
  isStandard: boolean;
  parentSku: string;
  expectedSizes: string[];
  expectedVariationSkus: string[];
  issues: WooProductStandardIssue[];
}

/**
 * Validates the official Ofissio WooCommerce product convention. The function
 * is pure so it can be shared by checks, imports, and future admin readiness UI.
 */
export function getWooCommerceProductStandard(
  product: WooCommerceProduct,
  variations: WooCommerceProductVariation[],
): WooProductStandardResult {
  const issues: WooProductStandardIssue[] = [];
  const parentSku = normalizeWooSku(product.sku);
  const sizeAttribute = findAttribute(product.attributes, ["ukuran", "size"]);
  const colorAttribute = findAttribute(product.attributes, ["warna", "color"]);
  const expectedSizes = uniqueOptions(sizeAttribute?.options);
  const expectedColors = uniqueOptions(colorAttribute?.options);

  if (product.type !== "variable") {
    issues.push(issue("product_not_variable", "Produk harus menggunakan tipe variable."));
  }
  if (!parentSku) {
    issues.push(issue("parent_sku_missing", "Parent SKU wajib diisi."));
  }
  if (!sizeAttribute || expectedSizes.length === 0) {
    issues.push(issue("size_attribute_missing", "Atribut Ukuran wajib memiliki opsi."));
  } else if (sizeAttribute.variation !== true) {
    issues.push(issue("size_attribute_not_for_variation", "Atribut Ukuran harus dipakai untuk variation."));
  }
  if (variations.length === 0) {
    issues.push(issue("variation_missing", "Variation ukuran belum dibuat."));
  }

  const expectedVariationSkus = buildExpectedVariationSkus(
    parentSku,
    expectedSizes,
    colorAttribute?.variation === true ? expectedColors : [],
  );
  const seenSkus = new Set<string>();

  for (const variation of variations) {
    const size = variationOption(variation.attributes, sizeAttribute, ["ukuran", "size"]);
    const color = variationOption(variation.attributes, colorAttribute, ["warna", "color"]);
    const actualSku = normalizeWooSku(variation.sku);
    const expectedSku = size
      ? buildWooVariationSku(parentSku, size, color || undefined)
      : "";

    if (!size) {
      issues.push(issue("variation_size_missing", "Variation tidak memiliki nilai Ukuran.", variation.id));
    }
    if (!actualSku) {
      issues.push(issue("variation_sku_missing", "Variation SKU wajib diisi.", variation.id));
    } else {
      if (seenSkus.has(actualSku)) {
        issues.push(issue("variation_sku_duplicate", `Variation SKU ${actualSku} duplikat.`, variation.id));
      }
      seenSkus.add(actualSku);
      if (expectedSku && actualSku !== expectedSku) {
        issues.push(issue(
          "variation_sku_invalid",
          `Variation SKU ${actualSku} harus mengikuti format ${expectedSku}.`,
          variation.id,
        ));
      }
    }
    if (variation.manage_stock !== true) {
      issues.push(issue("variation_manage_stock_disabled", "Manage stock harus aktif per variation.", variation.id));
    }
    if (!isValidStockQuantity(variation.stock_quantity)) {
      issues.push(issue("variation_stock_quantity_missing", "Stock quantity variation wajib berupa angka nol atau lebih.", variation.id));
    }
  }

  for (const expectedSku of expectedVariationSkus) {
    if (!seenSkus.has(expectedSku)) {
      issues.push(issue("variation_missing", `Variation ${expectedSku} belum dibuat.`));
    }
  }

  return {
    isStandard: issues.length === 0,
    parentSku,
    expectedSizes,
    expectedVariationSkus,
    issues,
  };
}

export function buildWooVariationSku(
  parentSku: string,
  size: string,
  color?: string,
) {
  return [parentSku, color, size]
    .map((part) => normalizeWooSku(part ?? ""))
    .filter(Boolean)
    .join("-");
}

export function normalizeWooSku(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildExpectedVariationSkus(
  parentSku: string,
  sizes: string[],
  colors: string[],
) {
  if (!parentSku) return [];
  if (colors.length === 0) {
    return sizes.map((size) => buildWooVariationSku(parentSku, size));
  }
  return colors.flatMap((color) =>
    sizes.map((size) => buildWooVariationSku(parentSku, size, color)),
  );
}

function findAttribute(
  attributes: WooCommerceAttribute[] | undefined,
  aliases: string[],
) {
  const wanted = aliases.map(normalizeAttributeName);
  return (attributes ?? []).find((attribute) =>
    wanted.includes(normalizeAttributeName(attribute.name)) ||
    wanted.includes(normalizeAttributeName(attribute.slug)),
  );
}

function variationOption(
  attributes: WooCommerceVariationAttribute[] | undefined,
  parentAttribute: WooCommerceAttribute | undefined,
  aliases: string[],
) {
  const wanted = aliases.map(normalizeAttributeName);
  return normalizeWooSku(
    (attributes ?? []).find((attribute) =>
      (parentAttribute?.id && attribute.id === parentAttribute.id) ||
      wanted.includes(normalizeAttributeName(attribute.name)),
    )?.option ?? "",
  );
}

function normalizeAttributeName(value = "") {
  return value.trim().toLowerCase().replace(/^pa_/, "");
}

function uniqueOptions(options: string[] | undefined) {
  return [...new Set((options ?? []).map(normalizeWooSku).filter(Boolean))];
}

function isValidStockQuantity(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function issue(
  code: WooProductStandardIssueCode,
  message: string,
  variationId?: number,
): WooProductStandardIssue {
  return { code, message, ...(variationId == null ? {} : { variationId }) };
}
