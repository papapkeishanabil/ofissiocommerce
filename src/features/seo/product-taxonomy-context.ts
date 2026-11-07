import type { OfissioProduct } from "@/features/products/product.types";
import { normalizeIndustrySlug, slugifyTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { industryLabel } from "@/features/catalog-taxonomy/industry-labels";

type IndustryLabelSource = {slug: string; name: string; active: boolean};
export function productTaxonomyContext(product: OfissioProduct, master: IndustryLabelSource[] = []) {
  const categories = product.categories?.length ? product.categories : product.category ? [{name:product.category,slug:product.categorySlugs?.[0] || slugifyTaxonomy(product.category)}] : [];
  const seenCategories = new Set<string>();
  const categoryLinks = categories.filter(category => {
    if (!category.name.trim() || !category.slug || seenCategories.has(category.slug)) return false;
    seenCategories.add(category.slug);return true;
  }).map(category => ({name:category.name,slug:category.slug,href:`/catalog?kategori=${encodeURIComponent(category.slug)}`}));
  const slugs = [...new Set((product.industrySlugs?.length ? product.industrySlugs : product.industries.map(normalizeIndustrySlug)).filter(Boolean))];
  const industryLinks = slugs.flatMap(slug => {
    const saved = master.find(industry => industry.slug === slug);
    if (saved?.active === false) return [];
    return [{name:industryLabel(slug,saved?.name),slug,href:`/catalog?industri=${encodeURIComponent(slug)}`}];
  });
  return {categories:categoryLinks,industries:industryLinks};
}
