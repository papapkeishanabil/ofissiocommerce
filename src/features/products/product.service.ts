import { productRepository } from "./product.repository";
import { validateProduct3DModel, validateProductForCart, validateProductForCatalog } from "./product.validation";
export { validateProduct3DModel, validateProductForCart, validateProductForCatalog };
const visible = () => productRepository.all().filter((p) => validateProductForCatalog(p).ok);
export const productService = {
  getPublishedProducts: visible, getProductsWith3DModel: visible,
  getProductById: (id: string) => productRepository.byId(id),
  getProductBySlug: (slug: string) => { const p = productRepository.bySlug(slug); return p && validateProductForCatalog(p).ok ? p : undefined; },
  getProductsByIndustry: (industry: string) => visible().filter((p) => p.industries.includes(industry as never)),
  getProductsByCategory: (category: string) => visible().filter((p) => p.category === category),
  getRecommendedProducts: (industry?: string) => industry ? visible().filter((p) => p.industries.includes(industry as never)) : visible(),
  searchProducts: (query: string) => { const q = query.toLowerCase(); return visible().filter((p) => [p.name, p.sku, p.category, p.material, ...p.industries].join(" ").toLowerCase().includes(q)); },
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
