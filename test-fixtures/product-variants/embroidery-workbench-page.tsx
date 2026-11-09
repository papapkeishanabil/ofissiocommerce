"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminEmbroideryWorkbench } from "@/features/admin/components/AdminEmbroideryWorkbench";
import { QuotationConfirmation } from "@/components/quote/QuotationConfirmation";
import { CustomerPaymentPanel } from "@/features/tracking/components/CustomerPaymentPanel";
import { calculateQuotationPricing } from "@/features/quotation/quotation.utils";
import { embroideryEstimateFixture, embroideryWorkbenchFixture, fixtureDate } from "./embroidery-workbench-data";

export default function WorkbenchFixture(){return <Suspense fallback={<p>Memuat…</p>}><Content/></Suspense>;}
function Content(){
  const search=useSearchParams();
  const quotation=embroideryWorkbenchFixture();
  if(search.get("view")==="payment")return <CustomerPaymentPanel orderId="fixture-order" companyId="fixture-company" userId="fixture-user" orderTotal={892460}/>;
  quotation.items[0]!.image="/products/kk-006/KK-006-front-nobg.webp";
  if(search.get("view")==="customer"){
    const calculated=calculateQuotationPricing(quotation,{items:quotation.items.map(item=>({itemId:item.id,unitPrice:85000,finalUnitPrice:85000,embroideryLines:[{zoneId:"left_chest",unitPrice:5000},{zoneId:"right_chest",unitPrice:7000,setupFee:10000}]})),validUntil:fixtureDate(7),taxEnabled:true,taxRate:11});
    const complete={...quotation,...calculated,items:calculated.items.map(item=>({...item,updatedAt:quotation.createdAt})),status:"quoted" as const,embroideryEstimate:{...embroideryEstimateFixture(),status:"sent_to_customer" as const,estimatedBy:"fixture-admin",estimatedAt:quotation.createdAt}};
    return <><div hidden id="customer-fixture-data">{JSON.stringify(complete)}</div><QuotationConfirmation quotation={complete}/></>;
  }
  if(search.get("view")==="readonly")quotation.status="quoted";
  return <div className="admin-shell bg-[#f5f7fa] p-4 lg:ml-[240px] lg:p-6"><AdminEmbroideryWorkbench quotation={quotation} productImages={{}} logoPreviews={[{fileId:"fixture-logo-a",signedUrl:"/demo/logo-harmas.svg",unavailable:false},{fileId:"fixture-logo-b",signedUrl:"/demo/logo-punggung.svg",unavailable:false}]} courierOptions={[{key:"jne-reg",courierCode:"jne",courierName:"JNE",serviceCode:"reg",serviceName:"REG",serviceType:null,shippingType:null,description:"Reguler"}]}/></div>;
}
