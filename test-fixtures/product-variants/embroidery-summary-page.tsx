"use client";

import { EmbroiderySummary } from "@/components/configurator/EmbroiderySummary";
import { OrderLogoThumbnails } from "@/features/tracking/components/OrderLogoThumbnails";
import { QuotationConfirmation } from "@/components/quote/QuotationConfirmation";
import { useCartStore } from "@/stores/cart-store";
import { emptySizeMatrix, type CartLineItem } from "@/types/cart";
import type { EmbroideryPlacement } from "@/types/uniform-3d";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import { useSearchParams } from "next/navigation";
import { CheckoutPage } from "@/components/checkout/CheckoutPage";
import { Suspense } from "react";

const placements: EmbroideryPlacement[] = [
  { zone:"left_chest",logoFileId:"logo-a",logoFileName:"Logo Perusahaan Final.svg",logoPreviewUrl:"blob:expired-preview",sizingMode:"ofissio",widthCm:null,heightCm:null,rotation:0,technique:"embroidery",notes:"Logo biru di dada kiri." },
  { zone:"right_chest",logoFileId:"logo-b",logoFileName:"Logo Perusahaan Final.svg",sizingMode:"customer",widthCm:7,heightCm:4,rotation:0,technique:"embroidery",notes:"Logo merah di dada kanan." },
  { zone:"upper_back",logoFileId:"text-upper_back",logoFileName:"Bordir nama",sizingMode:"ofissio",widthCm:null,heightCm:null,rotation:0,technique:"embroidery",textBordir:{mode:"same",name:"NAMA TIM",font:"sans",color:"#142766",allocations:[]} },
];
const sizes={...emptySizeMatrix(),S:8};
const cart: CartLineItem={id:"summary-fixture",productId:"summary-fixture",productSlug:"summary-fixture",productName:"Kemeja Uji Thumbnail",sku:"TEST-SUMMARY",color:"Merah",sizes,totalQty:8,unitPrice:85000,estimatedPrice:840000,regularPrice:85000,finalUnitPrice:85000,quantityTierLabel:null,quantityPricingBasis:"total_order_qty",quantityPricingMode:"fixed_unit_price",quantityTierApplied:false,subtotal:680000,productSubtotal:680000,selectedEmbroideryZones:[],embroideryLines:[],embroideryTotal:160000,missingEmbroideryPricingZones:[],customizationTotal:160000,finalEstimatedTotal:840000,customization:null,embroideryPlacements:placements,fulfillmentType:"READY_STOCK",processRoute:"customization",availableSizes:["S"],canAddEmbroidery:true};
const item={...cart,selectedColor:cart.color,sizeMatrix:sizes,createdAt:"2026-11-06T00:00:00Z",updatedAt:"2026-11-06T00:00:00Z",finalLineTotal:840000,discountAmount:0,lineSubtotal:840000};
const quotation={id:"quote-fixture",quotationNumber:"QUO-TEST",companyId:"fixture-company",companyName:"Fixture Company",userId:"fixture-user",picName:"Customer Fixture",status:"submitted",source:"web_cart",items:[item],subtotalEstimate:840000,internalNotes:[],salesNotes:null,customerMessage:null,subtotal:null,discountTotal:0,taxEnabled:true,taxRate:11,taxLabel:"PPN",taxTotal:0,shippingEstimate:0,grandTotal:null,currency:"IDR",validUntil:null,totalQty:8,embroideryPointCount:3,requirementType:"standard_customization",requestedProcessRoute:"customization",productionBrief:null,customerNotes:null,emailStatus:"not_sent",emailLogIds:[],emailResults:[],createdAt:"2026-11-06T00:00:00Z",updatedAt:"2026-11-06T00:00:00Z"} as unknown as QuotationRequestRecord;

export default function EmbroiderySummaryFixture() {
  return <Suspense fallback={<p>Memuat fixture…</p>}><SummaryFixtureContent /></Suspense>;
}

function SummaryFixtureContent() {
  const search = useSearchParams();
  if (search.get("view") === "checkout") return <CheckoutPage />;
  return <main className="mx-auto max-w-5xl space-y-5 p-4">
    <button type="button" onClick={() => useCartStore.setState({items:[cart]})}>Isi keranjang</button>
    <button type="button" onClick={() => useCartStore.setState({items:[{...cart,id:"legacy-fixture",embroideryPlacements:undefined,uniform3DConfig:{productId:cart.productId,model3dId:"fixture-glb",color:cart.color,placements:[{...placements[1]!,sizingMode:"customer",widthCm:7,heightCm:4}],snapshots:{},activeCamera:"front",updatedAt:"2026-11-06T00:00:00Z"}}]})}>Isi keranjang 3D lama</button>
    <section aria-label="Fixture tracking"><OrderLogoThumbnails placements={placements} /></section>
    <section aria-label="Fixture quotation"><QuotationConfirmation quotation={quotation} /></section>
    <section aria-label="Fixture admin"><EmbroiderySummary placements={placements} sizes={sizes} previewUrls={{"logo-a":"/fixture-logo/logo-a.svg","logo-b":"/fixture-logo/logo-b.svg"}} /></section>
  </main>;
}
