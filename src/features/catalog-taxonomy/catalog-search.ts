import { DEFAULT_PUBLIC_TAXONOMY, slugifyTaxonomy } from "./catalog-taxonomy.defaults";
import type {
  CatalogSearchNormalization,
  PublicCatalogTaxonomy,
} from "./catalog-taxonomy.types";

const STOP_WORDS = new Set([
  "ada",
  "adakah",
  "aja",
  "aku",
  "and",
  "anda",
  "apa",
  "apakah",
  "baju",
  "buat",
  "butuh",
  "cari",
  "dan",
  "di",
  "dong",
  "gimana",
  "ingin",
  "ini",
  "itu",
  "kah",
  "mau",
  "pengen",
  "produk",
  "saja",
  "saya",
  "seragam",
  "tolong",
  "untuk",
  "yang",
  "yg",
]);

export function normalizeCatalogSearch(
  query: string,
  taxonomy: PublicCatalogTaxonomy = DEFAULT_PUBLIC_TAXONOMY,
): CatalogSearchNormalization {
  const normalizedQuery = normalizePhrase(query);
  // Order matches by specificity (longest matched alias first) so consumers
  // taking the first slug — e.g. "seragam toko grosir" — resolve to the most
  // specific industry (Grosir via "toko grosir") instead of the first
  // taxonomy entry that happens to share a generic alias (Retail via "toko").
  const categorySlugs = taxonomy.categories
    .map((category) => ({
      slug: category.slug,
      specificity: matchedAliasSpecificity(
        normalizedQuery,
        category.name,
        category.slug,
        category.synonyms,
      ),
    }))
    .filter((match) => match.specificity > 0)
    .sort((a, b) => b.specificity - a.specificity)
    .map((match) => match.slug);
  const industrySlugs = taxonomy.industries
    .map((industry) => ({
      slug: industry.slug,
      specificity: matchedAliasSpecificity(
        normalizedQuery,
        industry.name,
        industry.slug,
        industry.synonyms,
      ),
    }))
    .filter((match) => match.specificity > 0)
    .sort((a, b) => b.specificity - a.specificity)
    .map((match) => match.slug);
  const attributeHints = taxonomy.attributes.flatMap((attribute) =>
    attribute.terms
      .filter((term) =>
        matchesEntry(normalizedQuery, term.name, term.slug, []),
      )
      .map((term) => ({
        attributeSlug: attribute.slug,
        termSlug: term.slug,
      })),
  );

  const matchedPhrases = new Set([
    ...matchedAliases(normalizedQuery, taxonomy.categories),
    ...matchedAliases(normalizedQuery, taxonomy.industries),
    ...attributeHints.map((hint) => hint.termSlug.replace(/-/g, " ")),
  ]);
  const searchTerms = normalizedQuery
    .split(" ")
    .filter(Boolean)
    .filter((term) => !STOP_WORDS.has(term))
    .filter(
      (term) =>
        ![...matchedPhrases].some((phrase) =>
          phrase.split(" ").includes(term),
        ),
    );

  return {
    originalQuery: query,
    normalizedQuery,
    categorySlugs: unique(categorySlugs),
    industrySlugs: unique(industrySlugs),
    attributeHints: uniqueBy(
      attributeHints,
      (hint) => `${hint.attributeSlug}:${hint.termSlug}`,
    ),
    searchTerms: unique(searchTerms),
  };
}

export function getTaxonomyEntryLabel(
  taxonomy: PublicCatalogTaxonomy,
  type: "category" | "industry",
  slug: string | undefined,
) {
  if (!slug) return undefined;
  const entries =
    type === "category" ? taxonomy.categories : taxonomy.industries;
  return entries.find((entry) => entry.slug === slug)?.name;
}

function matchesEntry(
  query: string,
  name: string,
  slug: string,
  synonyms: string[],
) {
  return [name, slug.replace(/-/g, " "), ...synonyms]
    .map(normalizePhrase)
    .filter(Boolean)
    .some((alias) => includesPhrase(query, alias));
}

function matchedAliases(
  query: string,
  entries: Array<{ name: string; slug: string; synonyms: string[] }>,
) {
  return entries.flatMap((entry) =>
    [entry.name, entry.slug.replace(/-/g, " "), ...entry.synonyms]
      .map(normalizePhrase)
      .filter((alias) => alias && includesPhrase(query, alias)),
  );
}

/**
 * Word count of the longest alias that appears in the query (0 = no match).
 * Used to rank taxonomy hits so the most specific entry wins.
 */
function matchedAliasSpecificity(
  query: string,
  name: string,
  slug: string,
  synonyms: string[],
) {
  return [name, slug.replace(/-/g, " "), ...synonyms]
    .map(normalizePhrase)
    .filter((alias) => alias && includesPhrase(query, alias))
    .reduce((max, alias) => Math.max(max, alias.split(" ").length), 0);
}

function includesPhrase(query: string, phrase: string) {
  return ` ${query} `.includes(` ${phrase} `);
}

function normalizePhrase(value: string) {
  return slugifyTaxonomy(value).replace(/-/g, " ").trim();
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
