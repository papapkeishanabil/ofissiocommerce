import type { CatalogCategory } from "@/features/catalog-taxonomy/catalog-taxonomy.types";
import type { OfissioProduct } from "@/features/products/product.types";
import { slugifyTaxonomy } from "@/features/catalog-taxonomy/catalog-taxonomy.defaults";
import { discoverableProducts } from "./catalog-discovery";
import { SITE_URL } from "@/lib/seo";
import { categorySelectionCopy } from "./category-selection-copy";

type Category = Pick<CatalogCategory,"name"|"slug"|"active"|"description"|"seo">;
export const catalogCategoryPath=(slug:string)=>`/catalog?kategori=${encodeURIComponent(slug)}`;

/** Curated, populated categories only. Search/colour/industry combinations remain ordinary filters. */
export function catalogCategoryLandings(categories: Category[], products: OfissioProduct[]) {
  const published=discoverableProducts(products);
  return categories.filter(category=>category.active).flatMap(category=>{
    const members=published.filter(product=>product.categorySlugs?.includes(category.slug)||slugifyTaxonomy(product.category)===category.slug);
    if(!members.length)return [];
    const description=category.description.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
    const lead = description ? `${description.replace(/[.!?]+$/, "")}. ` : "";
    const intro=`${lead}Bandingkan ${members.length} model ${category.name.toLocaleLowerCase("id-ID")} di Ofissio. ${categorySelectionCopy(category.slug, category.name)} Lihat harga dan ketersediaan sesuai varian yang dipilih. Untuk pesanan dengan bordir logo, minimum 8 pcs untuk satu model dan satu warna yang sama; ukuran boleh berbeda-beda.`;
    return [{category,products:members,heading:category.name,intro,url:`${SITE_URL}${catalogCategoryPath(category.slug)}`}];
  });
}

export function singleCategoryInput(search:{kategori?:string;category?:string;q?:string;industri?:string;warna?:string}) {
  return !search.q&&!search.industri&&!search.warna ? search.kategori||search.category : undefined;
}

export function findCategoryLanding(landings:ReturnType<typeof catalogCategoryLandings>, input:string|undefined) {
  return input ? landings.find(item=>item.category.slug===input||item.category.name===input) : undefined;
}
