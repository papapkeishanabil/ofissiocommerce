import { productRepository } from "./product.repository";
import { validateProduct3DModel, validateProductForCart, validateProductForCatalog } from "./product.validation";
import {
  normalizeIndustrySlug,
  slugifyTaxonomy,
} from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
export { validateProduct3DModel, validateProductForCart, validateProductForCatalog };
const visible = () => productRepository.getPublishedProducts().filter((p) => validateProductForCatalog(p).ok);
export const productService = {
  getPublishedProducts: visible, getProductsWith3DModel: visible,
  getProductById: (id: string) => productRepository.getProductById(id),
  getProductBySlug: (slug: string) => { const p = productRepository.getProductBySlug(slug); return p && validateProductForCatalog(p).ok ? p : undefined; },
  getProductsByIndustry: (industry: string) => {
    const slug = normalizeIndustrySlug(industry);
    return visible().filter((p) =>
      p.industrySlugs?.includes(slug) ||
      p.industries.some((item) => normalizeIndustrySlug(item) === slug),
    );
  },
  getProductsByCategory: (category: string) => {
    const slug = slugifyTaxonomy(category);
    return visible().filter((p) =>
      p.categorySlugs?.includes(slug) || slugifyTaxonomy(p.category) === slug,
    );
  },
  getRecommendedProducts: (industry?: string) => industry ? productService.getProductsByIndustry(industry) : visible(),
  searchProducts: (query: string) => {
    const q = query.toLowerCase();
    return visible().filter((p) =>
      [
        p.name,
        p.sku,
        p.category,
        p.material,
        ...p.industries,
        ...(p.searchableTerms ?? []),
      ].join(" ").toLowerCase().includes(q),
    );
  },
  validateProductForCart,
  validateProductForCatalog,
  validateProduct3DModel,
};

export const getPublishedProducts = productService.getPublishedProducts;
export const getProductById = productService.getProductById;
export const getProductBySlug = productService.getProductBySlug;
export const getProductsByIndustry = productService.getProductsByIndustry;
export const getProductsByCategory = productService.getProductsByCategory;
export const getProductsWith3DModel = productService.getProductsWith3DModel;
export const getRecommendedProducts = productService.getRecommendedProducts;
export const searchProducts = productService.searchProducts;
