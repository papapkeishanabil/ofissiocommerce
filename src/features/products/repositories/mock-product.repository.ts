import { PRODUCT_MOCK_DATA } from "../product.mock-data";
import type { ProductRepository } from "../product.repository";
import { validateUniqueMockProducts } from "../product.validation";

const mockValidation = validateUniqueMockProducts(PRODUCT_MOCK_DATA);
if (!mockValidation.ok) {
  throw new Error(`Mock product tidak valid: ${mockValidation.reason}`);
}

export const mockProductRepository: ProductRepository = {
  getAllProducts: () => PRODUCT_MOCK_DATA,
  getPublishedProducts: () =>
    PRODUCT_MOCK_DATA.filter((product) => product.status === "published"),
  getProductById: (id: string) =>
    PRODUCT_MOCK_DATA.find((product) => product.id === id),
  getProductBySlug: (slug: string) =>
    PRODUCT_MOCK_DATA.find((product) => product.slug === slug),
  getProductsByIndustry: (industry: string) =>
    PRODUCT_MOCK_DATA.filter((product) =>
      product.industries.includes(industry as never),
    ),
  getProductsByCategory: (category: string) =>
    PRODUCT_MOCK_DATA.filter((product) => product.category === category),
  searchProducts: (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCT_MOCK_DATA;
    return PRODUCT_MOCK_DATA.filter((product) =>
      [
        product.name,
        product.sku,
        product.category,
        product.material,
        product.short_description,
        ...product.industries,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  },
};
