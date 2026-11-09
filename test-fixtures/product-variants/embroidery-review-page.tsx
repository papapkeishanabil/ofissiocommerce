"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequestQuotationPage } from "@/components/quote/RequestQuotationPage";
import { CheckoutPage } from "@/components/checkout/CheckoutPage";
import { useCartStore } from "@/stores/cart-store";
import { emptySizeMatrix, type CartLineItem } from "@/types/cart";
import type { EmbroideryPlacement } from "@/types/uniform-3d";

const placements: EmbroideryPlacement[] = [
  {zone:"left_chest",logoFileId:"logo-a",logoFileName:"Logo Final.svg",sizingMode:"ofissio",widthCm:null,heightCm:null,rotation:0,technique:"embroidery",notes:"Jangan melewati saku."},
  {zone:"right_chest",logoFileId:"logo-b",logoFileName:"Logo Final.svg",sizingMode:"customer",widthCm:7,heightCm:4,rotation:0,technique:"embroidery",notes:"Rata dengan dada kiri."},
  {zone:"upper_back",logoFileId:"text-upper_back",logoFileName:"Bordir nama",sizingMode:"customer",widthCm:20,heightCm:3,rotation:0,technique:"embroidery",textBordir:{mode:"same",name:"TIM OFISSIO",font:"sans",color:"#142766",allocations:[]}},
];
const cart: CartLineItem={id:"review-fixture",productId:"review-fixture",productSlug:"review-fixture",productName:"Kemeja Kantor Wanita SN-Basic - Pink-Red Series",sku:"SN-MERAH-CABE",color:"Merah Cabe",sizes:{...emptySizeMatrix(),S:4,M:4},totalQty:8,unitPrice:85000,estimatedPrice:840000,regularPrice:85000,finalUnitPrice:85000,quantityTierLabel:null,quantityPricingBasis:"total_order_qty",quantityPricingMode:"fixed_unit_price",quantityTierApplied:false,subtotal:680000,productSubtotal:680000,selectedEmbroideryZones:[],embroideryLines:[],embroideryTotal:160000,missingEmbroideryPricingZones:[],customizationTotal:160000,finalEstimatedTotal:840000,customization:"Pisahkan per ukuran.",embroideryPlacements:placements,fulfillmentType:"READY_STOCK",processRoute:"customization",availableSizes:["S","M"],canAddEmbroidery:true,selectedOptions:{Warna:"Merah Cabe",Lengan:"Panjang"}};

export default function EmbroideryReviewFixture(){return <Suspense fallback={<p>Memuat fixture…</p>}><Content /></Suspense>;}
function Content(){
  const search=useSearchParams();
  function seed(kind:string){
    const manual=placements.map(p=>({...p,sizingMode:"customer" as const,widthCm:p.widthCm??8,heightCm:p.heightCm??5}));
    const item: CartLineItem={...cart,id:kind,embroideryPlacements:kind==="recommended"?placements:manual};
    if(kind==="legacy") {item.embroideryPlacements=undefined;item.uniform3DConfig={productId:item.productId,model3dId:"fixture-model",color:item.color,placements:manual,snapshots:{},activeCamera:"front",updatedAt:"2026-11-09T00:00:00Z"};}
    if(kind==="unpriced") item.missingEmbroideryPricingZones=["left_chest"];
    useCartStore.setState({items:[item],orderNote:"Hubungi PIC sebelum kirim.",appliedPromotion:null});
  }
  return <>
    <div className="flex flex-wrap gap-2 p-4" aria-label="Kontrol fixture">{["recommended","manual","legacy","unpriced"].map(kind=><button className="rounded border p-2" key={kind} onClick={()=>seed(kind)}>{kind}</button>)}</div>
    {search.get("view")==="checkout"?<CheckoutPage/>:<RequestQuotationPage/>}
  </>;
}
