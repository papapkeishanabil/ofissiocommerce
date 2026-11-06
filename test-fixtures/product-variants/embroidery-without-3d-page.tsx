"use client";
import { useState } from "react";
import { ProductDetail } from "@/components/product/ProductDetail";
import { PRODUCT_MOCK_DATA } from "@/features/products/product.mock-data";
import { createDefaultEmbroideryPricingZones } from "@/features/products/embroidery-pricing";
import { useCartStore } from "@/stores/cart-store";
import { CartPreviewLine } from "@/components/cart/CartPreviewLine";
import { AdminOrderItems } from "@/features/admin/components/AdminOrderItems";
import type { ValidatedCheckoutCartItem } from "@/features/checkout/checkout-cart.types";

const product={...PRODUCT_MOCK_DATA[0]!,id:"embroidery-fixture",slug:"embroidery-fixture",name:"Kemeja Uji Bordir Tanpa 3D",sku:"TEST-NO-3D",source:"mock" as const,status:"published" as const,has_3d_model:false,model_3d:null,model_3d_url:null,model_3d_id:null,model_3d_version:null,supports_embroidery:false,embroidery_zones:[],priceFrom:85000,moq:1,colors:["Khaki"],available_colors:["Khaki"],available_sizes:["S","M"],stockVariantsReady:true,images:[],mainImage:undefined,sizeChart:[{size:"S" as const,chest:96,length:70},{size:"M" as const,chest:100,length:72}]};
const pricing={enabled:true,mode:"flat_per_piece" as const,zones:createDefaultEmbroideryPricingZones()};

export default function EmbroideryFixture() {
  const items=useCartStore(state=>state.items);
  const [admin,setAdmin]=useState(false);
  const line=items[0];
  const item=line?{...line,selectedColor:line.color,sizeMatrix:line.sizes,embroideryPlacements:line.embroideryPlacements??[],productName:line.productName,model3dId:"",model3dUrl:""} as unknown as ValidatedCheckoutCartItem:null;
  return <main><ProductDetail product={product} globalEmbroideryPricing={pricing} moqSettings={{fulfillment:1,customization:1,production:24,embroidery:8}}/>
    <section aria-label="Fixture keranjang" className="mx-auto max-w-4xl p-4">{items.map(line=><CartPreviewLine key={line.id} item={line}/>)}<button type="button" onClick={()=>setAdmin(true)}>Periksa data admin</button><pre data-testid="saved-placements">{JSON.stringify(line?.embroideryPlacements??[])}</pre></section>
    {admin&&item&&<section aria-label="Fixture admin"><AdminOrderItems items={[item]} productImages={{}} trackingSnapshots={{}} artworkPreviews={(item.embroideryPlacements.filter(p=>!p.textBordir)).map(p=>({fileId:p.logoFileId,filename:p.logoFileName,mimeType:"image/png",signedUrl:`/fixture-files/${p.logoFileId}`,unavailable:false}))}/></section>}
  </main>;
}
