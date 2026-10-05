/** Keep the authored copy, omitting only a repeated product-name introduction. */
export function productCardDescription(description: string, productName: string) {
  const text = description.replace(/\s+/g, " ").trim();
  const name = productName.replace(/\s+/g, " ").trim();
  if (!name || text.slice(0, name.length).toLocaleLowerCase("id-ID") !== name.toLocaleLowerCase("id-ID")) return text;

  const remainder = text.slice(name.length);
  if (remainder && !/^[\s:.,–—-]/u.test(remainder)) return text;
  const summary = remainder.replace(/^[\s:.,–—-]+/u, "").replace(/^(?:merupakan|adalah)\s+/i, "");
  return summary ? summary.charAt(0).toLocaleUpperCase("id-ID") + summary.slice(1) : text;
}
