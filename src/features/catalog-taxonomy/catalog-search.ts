import { DEFAULT_PUBLIC_TAXONOMY, slugifyTaxonomy } from "./catalog-taxonomy.defaults";
import type {
  CatalogSearchNormalization,
  PublicCatalogTaxonomy,
} from "./catalog-taxonomy.types";

const STOP_WORDS = new Set([
  "aku",
  "anda",
  "baju",
  "buat",
  "butuh",
  "cari",
  "dan",
  "di",
  "ingin",
  "mau",
  "produk",
  "saya",
  "seragam",
  "untuk",
  "yang",
]);

export function normalizeCatalogSearch(
  query: string,
  taxonomy: PublicCatalogTaxonomy = DEFAULT_PUBLIC_TAXONOMY,
): CatalogSearchNormalization {
  const normalizedQuery = normalizePhrase(query);
  const categorySlugs = taxonomy.categories
    .filter((category) =>
      matchesEntry(normalizedQuery, category.name, category.slug, category.synonyms),
    )
    .map((category) => category.slug);
  const industrySlugs = taxonomy.industries
    .filter((industry) =>
      matchesEntry(normalizedQuery, industry.name, industry.slug, industry.synonyms),
    )
    .map((industry) => industry.slug);
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
