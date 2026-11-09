import type { PageSeo } from "./page-seo";
import { productAutomaticSeo, type ProductSeoInput } from "./product-automatic-seo";

export type SeoFieldOrigin = "automatic" | "confirmed-bulk-fill" | "preexisting-manual" | "unattributed-manual";
export interface ProductSeoFillEvidence {
  productId: number;
  completedAndVerified: boolean;
  applied: boolean;
  before: Partial<PageSeo>;
  after: PageSeo;
}
const hasValue = (value: unknown) => Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Exact per-field evidence; never attribute an unknown edit to a person. */
export function productSeoFieldOrigin(field: keyof PageSeo, current: PageSeo, evidence?: ProductSeoFillEvidence): SeoFieldOrigin {
  if (!hasValue(current[field])) return "automatic";
  if (evidence?.completedAndVerified && evidence.applied) {
    if (hasValue(evidence.before[field]) && same(current[field], evidence.before[field])) return "preexisting-manual";
    if (!hasValue(evidence.before[field]) && same(current[field], evidence.after[field])) return "confirmed-bulk-fill";
  }
  return "unattributed-manual";
}

/** Dry-run only. An operator must verify the proposed automatic HTML before clearing overrides. */
export function planProductSeoMigration(productId: number, input: ProductSeoInput, current: PageSeo, evidence?: ProductSeoFillEvidence) {
  if (evidence && evidence.productId !== productId) throw new Error("SEO evidence belongs to another product");
  const automatic = productAutomaticSeo(input);
  const origins = Object.fromEntries((["title", "description", "primaryKeyword", "relatedKeywords"] as const)
    .map(field => [field, productSeoFieldOrigin(field, current, evidence)])) as Record<keyof PageSeo, SeoFieldOrigin>;
  const proposed: PageSeo = {
    ...current,
    title: origins.title === "confirmed-bulk-fill" ? "" : current.title,
    description: origins.description === "confirmed-bulk-fill" ? "" : current.description,
    primaryKeyword: origins.primaryKeyword === "confirmed-bulk-fill" ? automatic.suggestedKeywords.primaryKeyword : current.primaryKeyword,
    relatedKeywords: origins.relatedKeywords === "confirmed-bulk-fill" ? automatic.suggestedKeywords.relatedKeywords : current.relatedKeywords,
  };
  const review = (["title", "description", "primaryKeyword", "relatedKeywords"] as const)
    .filter(field => origins[field] === "unattributed-manual").map(field => `unattributed-${field}`);
  if (!automatic.evidence.model || automatic.issues.includes("no-unambiguous-attributes")) {
    // Insufficient evidence must not turn a previously populated override into a generic default.
    proposed.title = current.title; proposed.description = current.description;
    review.push("insufficient-product-facts");
  }
  return { productId, old: current, proposed, origins, automatic, review,
    effective: { title: proposed.title.trim() || automatic.title, description: proposed.description.trim() || automatic.description } };
}
