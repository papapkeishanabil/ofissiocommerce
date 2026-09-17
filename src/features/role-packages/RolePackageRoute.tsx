import { notFound } from "next/navigation";

import {
  RolePackageBuilder,
  type RolePackageProduct,
} from "@/components/industry-inspiration/RolePackageBuilder";
import { productServerService } from "@/features/products/product.server-service";

import {
  getBusinessRoleConfigs,
  getRolePackageConfig,
} from "./role-package.config";

export async function RolePackageRoute({ business, role }: { business: string; role: string }) {
  const config = getRolePackageConfig(business, role);
  if (!config) notFound();

  const catalog = await productServerService.getPublishedProducts();
  const products: RolePackageProduct[] = catalog.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    category: product.category,
    priceFrom: product.priceFrom,
    moq: product.moq,
    mainImage: product.mainImage,
    colors: product.available_colors.length ? product.available_colors : product.colors,
    availableSizes: product.available_sizes,
    supportsEmbroidery: product.supports_embroidery,
    has3DModel: product.has_3d_model,
    searchableTerms: product.searchableTerms ?? [],
    categorySlugs: product.categorySlugs ?? [],
  }));

  return (
    <RolePackageBuilder
      config={config}
      products={products}
      siblingRoles={getBusinessRoleConfigs(config.business).map((item) => ({
        role: item.role,
        label: item.roleLabel,
      }))}
    />
  );
}
