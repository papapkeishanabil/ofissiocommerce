/** Exact catalogue code references, including article codes in product names.
 * Woo SKU can include a colour suffix (TG-055C), while the article is TG-055.
 * Only codes actually present in catalogue fields are accepted; no fuzzy IDs.
 */
function codes(text: string): Set<string> {
  return new Set([...text.matchAll(/\b([a-z]{1,6})[\s_\-\u2010-\u2015]*(\d{3,6})([a-z]{0,3})\b/gi)]
    .map((match) => `${match[1]}${match[2]}${match[3]}`.toUpperCase()));
}

export function resolveProductReferences<T extends { sku: string; name: string; slug: string }>(products: T[], query: string): T[] {
  const requested = codes(query);
  if (!requested.size) return [];
  return products.filter((product) => {
    const known = codes(`${product.sku} ${product.name} ${product.slug}`);
    return [...requested].some((code) => known.has(code));
  });
}
