import type { OfissioProduct } from "./product.types";
import { mockProductRepository } from "./repositories/mock-product.repository";

export interface ProductRepository {
  getAllProducts(): OfissioProduct[];
  getPublishedProducts(): OfissioProduct[];
  getProductById(id: string): OfissioProduct | undefined;
  getProductBySlug(slug: string): OfissioProduct | undefined;
  getProductsByIndustry(industry: string): OfissioProduct[];
  getProductsByCategory(category: string): OfissioProduct[];
  searchProducts(query: string): OfissioProduct[];
}

export function createInMemoryProductRepository(
  products: OfissioProduct[],
): ProductRepository {
  return {
    getAllProducts: () => products,
    getPublishedProducts: () =>
      products.filter((product) => product.status === "published"),
    getProductById: (id: string) =>
      products.find((product) => product.id === id),
    getProductBySlug: (slug: string) =>
      products.find((product) => product.slug === slug),
    getProductsByIndustry: (industry: string) =>
      products.filter((product) => product.industries.includes(industry as never)),
    getProductsByCategory: (category: string) =>
      products.filter((product) => product.category === category),
    searchProducts: (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return products;
      return products.filter((product) =>
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
}

// Backward-compatible default repository. PRODUCT_SOURCE switching is handled
// by product.server-service for server-side WooCommerce access; client-side
// code keeps this safe mock repository.
export const productRepository = mockProductRepository;
