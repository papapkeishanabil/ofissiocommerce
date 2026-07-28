import { PRODUCT_MOCK_DATA } from "./product.mock-data";
import { validateUniqueMockProducts } from "./product.validation";

const mockValidation = validateUniqueMockProducts(PRODUCT_MOCK_DATA);
if (!mockValidation.ok) {
  throw new Error(`Mock product tidak valid: ${mockValidation.reason}`);
}

export const productRepository = { all: () => PRODUCT_MOCK_DATA, byId: (id: string) => PRODUCT_MOCK_DATA.find((p) => p.id === id), bySlug: (slug: string) => PRODUCT_MOCK_DATA.find((p) => p.slug === slug) };
