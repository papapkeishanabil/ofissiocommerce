import { readFileSync } from "node:fs";
import { AdminProductForm } from "@/features/products/components/AdminProductForm";
import type { AdminWooCommerceProductDetail } from "@/features/products/woocommerce/woocommerce-product-admin.types";

export default async function ImageReplacementVerification({ searchParams }: { searchParams: Promise<{ empty?: string }> }) {
  const { empty } = await searchParams;
  const product=JSON.parse(readFileSync("artifacts/kk007-images/browser-product.json","utf8")) as AdminWooCommerceProductDetail;
  if (empty === "1") { product.productVariants=[]; product.defaultVariantSku=""; }
  return <div className="mx-auto max-w-6xl p-5"><AdminProductForm mode="edit" product={product} options={{
    categories:[{id:1,name:"Kemeja",slug:"kemeja",active:true,description:"",productCount:1,synonyms:[],source:"woocommerce"}],
    industries:[{id:"office",name:"Corporate",slug:"office",active:true,description:"",synonyms:[],sortOrder:1,createdAt:"",updatedAt:""}],
    attributes:[],
  }} /></div>;
}
