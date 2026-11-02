import type { OfissioProduct } from "@/features/products/product.types";

export const GUIDE_PATH = "/panduan/memilih-kemeja-seragam-kerja";
export interface GuideProduct {
  slug: string; name: string; material: string; gender: string;
  sleeves: string[]; sizes: string[]; price: number;
  categories: { name: string; slug: string }[];
}

export function guideProduct(product: OfissioProduct): GuideProduct {
  const sleeveOption = product.variantOptions?.find(option => /lengan|sleeve/i.test(option.name));
  const sleeves = sleeveOption?.values.length ? sleeveOption.values : [product.sleeve_type === "long" ? "Panjang" : "Pendek"];
  return {
    slug: product.slug, name: product.name, material: product.material,
    gender: product.gender === "men" ? "Pria" : product.gender === "women" ? "Wanita" : "Unisex",
    sleeves, sizes: product.available_sizes, price: product.priceFrom,
    categories: product.categories?.length ? product.categories.map(({ name, slug }) => ({ name, slug })) : [],
  };
}

export function filterGuideProducts(products: GuideProduct[], filters: { query: string; category: string; gender: string; sleeve: string }) {
  const query = filters.query.trim().toLocaleLowerCase("id-ID");
  return products.filter(product =>
    (!query || [product.name, product.material, ...product.categories.map(category => category.name)].join(" ").toLocaleLowerCase("id-ID").includes(query)) &&
    (!filters.category || product.categories.some(category => category.slug === filters.category)) &&
    (!filters.gender || product.gender === filters.gender) &&
    (!filters.sleeve || product.sleeves.some(sleeve => sleeve.toLowerCase().includes(filters.sleeve.toLowerCase())))
  );
}
