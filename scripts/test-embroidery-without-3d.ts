import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EmbroideryPlacement } from "../src/types/uniform-3d";
import type { UploadedFile } from "../src/features/storage/storage.types";
import type { PaymentOrderRecord, PaymentRecord } from "../src/features/payment/payment.types";

async function main() {
  process.env.DATABASE_PROVIDER = "mock";
  process.env.STORAGE_PROVIDER = "mock";
  const storage = new Map<string, string>();
  Object.assign(globalThis, {localStorage: {getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)}});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {throw new Error("Unexpected network access in embroidery fixture");};
  const {PRODUCT_MOCK_DATA} = await import("../src/features/products/product.mock-data");
  const {embroideryPlacementSchema,uniform3DConfigSchema} = await import("../src/schemas/uniform-3d");
  const {embroideryRequestIssue} = await import("../src/features/products/embroidery-request");
  const {getGlobalEmbroideryPricing} = await import("../src/features/embroidery-pricing/global-embroidery-pricing.service");
  const {updateGlobalEmbroideryPricing} = await import("../src/features/embroidery-pricing/global-embroidery-pricing.service");
  const {createPaymentFromCart} = await import("../src/features/payment/payment.service");
  const {productServerService} = await import("../src/features/products/product.server-service");
  const {storageService} = await import("../src/features/storage/storage.service");
  const {syncCheckoutCart,getValidatedCheckoutCart} = await import("../src/features/checkout/checkout-cart.service");
  const {useCartStore} = await import("../src/stores/cart-store");
  const {mapPaymentOrderToWooCommerceOrder} = await import("../src/features/orders/order.mapper");
  const {getAdminOrderArtworkPreviews} = await import("../src/features/admin/admin-order-workbench.service");
  const {AdminOrderItems} = await import("../src/features/admin/components/AdminOrderItems");
  const {mapProcessOrderToEmbroideryWorkOrderPdfData} = await import("../src/features/documents/document.service");
  const {embroideryWorkOrderOfissioTemplate} = await import("../src/features/documents/pdf/templates/embroidery-work-order-ofissio.template");
  const processOrders = await import("../src/features/process-orders/process-order.service");
  const {repositoryRegistry} = await import("../src/features/repositories/repository.factory");
  const {hasUnpricedEmbroidery} = await import("../src/features/products/embroidery-confirmation");
  const product = {...PRODUCT_MOCK_DATA[0]!,id:"embroidery-fixture",slug:"embroidery-fixture",status:"published" as const,has_3d_model:false,model_3d:null,model_3d_url:null,model_3d_id:null,model_3d_version:null,supports_embroidery:false,embroidery_zones:[],priceFrom:85000,moq:1,colors:["Khaki"],available_colors:["Khaki"],available_sizes:["S","M"],stockVariantsReady:true};
  const price = (await getGlobalEmbroideryPricing()).pricing;
  const placements: EmbroideryPlacement[] = [
    {zone:"left_chest",logoFileId:"logo-chest",logoFileName:"client-filename.png",sizingMode:"ofissio",widthCm:null,heightCm:null,rotation:0,technique:"embroidery",notes:"Jangan melewati saku.",logoPreviewUrl:"blob:temporary"},
    {zone:"upper_back",logoFileId:"logo-back",logoFileName:"punggung.png",sizingMode:"customer",widthCm:25,heightCm:6,rotation:0,technique:"embroidery",notes:"Di tengah punggung."},
    {zone:"right_chest",logoFileId:"text-right_chest",logoFileName:"Bordir nama",sizingMode:"ofissio",widthCm:null,heightCm:null,rotation:0,technique:"embroidery",textBordir:{mode:"individual",name:"",font:"sans",color:"#10245a",allocations:[{name:"ANDI",size:"S",quantity:4},{name:"SARI",size:"M",quantity:4}]},notes:"Huruf kapital."},
  ];
  const sizes={XS:0,S:4,M:4,L:0,XL:0,"2XL":0,"3XL":0,"4XL":0,"5XL":0};
  assert(embroideryPlacementSchema.safeParse(placements[0]).success);
  assert(!embroideryPlacementSchema.safeParse({...placements[0],sizingMode:"customer"}).success);
  assert(!embroideryPlacementSchema.safeParse({...placements[0],widthCm:8}).success,"Recommended dimensions must remain null");
  assert(!uniform3DConfigSchema.safeParse({productId:product.id,model3dId:"fake",color:"Khaki",placements,activeCamera:"front",updatedAt:new Date().toISOString()}).success,"3D config must keep numeric dimensions");
  assert.equal(embroideryRequestIssue(placements,product,price),null);
  assert.match(embroideryRequestIssue([placements[0]!,placements[0]!],product,price)!,/berulang/);
  assert.match(embroideryRequestIssue([{...placements[1]!,sizingMode:"customer",widthCm:31,heightCm:6}],product,price)!,/maksimal/);
  assert.match(embroideryRequestIssue([{...placements[0]!,logoFileId:"pending-logo"}],product,price)!,/selesai tersimpan/);
  assert.match(embroideryRequestIssue([placements[1]!],{embroidery_zones:["left_chest"]},price)!,/tidak tersedia/);
  assert.equal(hasUnpricedEmbroidery([{missingEmbroideryPricingZones:["left_chest"]}]),true);
  const originals={getProductById:productServerService.getProductById,getFileById:storageService.getFileById,markFileAsUsed:storageService.markFileAsUsed,getSignedFileUrl:storageService.getSignedFileUrl};
  let fileStatus:UploadedFile["status"]="uploaded";
  const file=(id:string):UploadedFile=>({id,companyId:"fixture-company",userId:"fixture-user",fileType:"embroidery_logo",originalFilename:id==="logo-chest"?"logo-dada.png":"logo-punggung.png",safeFilename:"logo.png",storageProvider:"mock",storageBucket:"fixture",storageKey:id,mimeType:"image/png",extension:"png",sizeBytes:100,status:fileStatus,publicUrl:null,signedUrlExpiresAt:null,metadata:{},checksum:null,scanStatus:"clean",sanitizedStatus:"not_required",deletedAt:null,createdAt:"",updatedAt:""});
  productServerService.getProductById=async()=>product;
  storageService.getFileById=async({companyId,fileId})=>companyId==="fixture-company"&&["logo-chest","logo-back"].includes(fileId)?file(fileId):null;
  storageService.markFileAsUsed=async({fileId})=>file(fileId);
  storageService.getSignedFileUrl=async({companyId,fileId})=>companyId==="fixture-company"&&["logo-chest","logo-back"].includes(fileId)?{fileId,signedUrl:`https://files.fixture/${fileId}`,expiresAt:new Date().toISOString()}:null;
  try {
    useCartStore.setState({items:[]});
    const add=useCartStore.getState().add({product,color:"Khaki",sizes,embroideryPlacements:placements,customization:"Pisahkan per ukuran.",globalEmbroideryPricing:price});
    assert(add.ok,add.reason);const line=useCartStore.getState().items[0]!;
    assert.equal(line.uniform3DConfig,undefined);assert.deepEqual(line.embroideryPlacements,placements);
    assert.equal(line.embroideryTotal,160000);assert.equal(line.finalEstimatedTotal,840000);
    const tooFew=useCartStore.getState().add({product,color:"Khaki",sizes:{...sizes,S:1,M:0},embroideryPlacements:[placements[0]!],globalEmbroideryPricing:price});
    assert(!tooFew.ok);assert.match(tooFew.reason!,/minimal 8/);
    const input={companyId:"fixture-company",userId:"fixture-user",orderNote:"Hubungi sebelum kirim.",items:[{productId:product.id,selectedColor:"Khaki",sizeMatrix:sizes,customization:line.customization??null,embroideryPlacements:placements}]};
    const cart=await syncCheckoutCart(input);const priced=cart.items[0]!;
    assert.equal(priced.model3dId,"");assert.equal(priced.embroideryPlacements.length,3);assert.equal(priced.embroideryTotal,160000);
    assert.equal(priced.embroideryPlacements[0]?.logoFileName,"logo-dada.png");
    assert.equal(priced.embroideryPlacements[0]?.logoPreviewUrl,undefined);
    assert.equal(priced.embroideryPlacements[0]?.widthCm,null);
    assert.deepEqual(priced.embroideryPlacements[2]?.textBordir,placements[2]?.textBordir);
    const revalidated=await getValidatedCheckoutCart(cart.id,"fixture-company","fixture-user");assert.deepEqual(revalidated.items[0]?.embroideryPlacements,priced.embroideryPlacements);
    await assert.rejects(syncCheckoutCart({...input,companyId:"another-company"}),/belum selesai tersimpan/);
    fileStatus="deleted";await assert.rejects(syncCheckoutCart(input),/tidak dapat digunakan/);
    fileStatus="pending";await assert.rejects(syncCheckoutCart(input),/tidak dapat digunakan/);fileStatus="uploaded";
    try {
      await updateGlobalEmbroideryPricing({zones:price.zones.map(zone=>({...zone,enabled:false,notes:zone.notes ?? "",sortOrder:zone.sortOrder ?? 100}))});
      const unpriced=await syncCheckoutCart(input);
      await assert.rejects(createPaymentFromCart({cartId:unpriced.id,companyId:input.companyId,userId:input.userId,shippingRateId:null}),/Harga bordir perlu dikonfirmasi/);
    } finally {await updateGlobalEmbroideryPricing({zones:price.zones.map(zone=>({...zone,notes:zone.notes ?? "",sortOrder:zone.sortOrder ?? 100}))});}
    await assert.rejects(syncCheckoutCart({...input,items:[{...input.items[0]!,embroideryPlacements:[{...placements[0]!,zone:"upper_back"},placements[1]!]}]}),/Zona bordir/);
    await assert.rejects(syncCheckoutCart({...input,items:[{...input.items[0]!,embroideryPlacements:[{...placements[2]!,textBordir:{...placements[2]!.textBordir!,allocations:[{name:"ANDI",size:"S",quantity:8}]}}]}]}),/pembagian nama/);
    const order={id:`fixture-${randomUUID()}`,cartId:cart.id,shippingRateId:null,orderNumber:"OF-FIXTURE",companyId:input.companyId,userId:input.userId,items:cart.items,orderNote:input.orderNote,status:"payment_received",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),calculation:{itemSubtotal:cart.subtotal,customizationFee:0,shippingFee:0,tax:0,grandTotal:cart.subtotal}} satisfies PaymentOrderRecord;
    const woo=mapPaymentOrderToWooCommerceOrder({order,payment:{status:"paid"} as unknown as PaymentRecord});
    const meta=woo.line_items[0]!.meta_data!;const serialized=meta.find(row=>row.key==="embroidery_placements")!.value;
    assert(String(serialized).includes('"sizingMode":"ofissio"'));assert(String(serialized).includes("Jangan melewati saku."));assert(String(serialized).includes("ANDI"));
    const previews=await getAdminOrderArtworkPreviews(order);assert.equal(previews.length,2);
    const html=renderToStaticMarkup(createElement(AdminOrderItems,{items:cart.items,productImages:{},trackingSnapshots:{},artworkPreviews:previews}));
    for(const text of ["logo-dada.png","logo-punggung.png","Diserahkan kepada Ofissio","Jangan melewati saku.","25 × 6 cm","ANDI","SARI","Huruf kapital.","https://files.fixture/logo-chest","https://files.fixture/logo-back"])assert(html.includes(text),text);
    await repositoryRegistry.orders.saveOrder?.({paymentOrder:order});
    const process=await processOrders.createProcessOrderFromOrder({order});
    const approval=process.tasks.find(task=>task.taskKey==="embroidery_approval")!;assert(approval);
    assert.deepEqual(process.items[0]?.customization.placements,priced.embroideryPlacements);
    const production=process.tasks.find(task=>task.taskKey==="embroidery_or_print")!;
    await assert.rejects(processOrders.completeProcessTask({processOrderId:process.processOrder.id,taskId:production.id}),/Konfirmasi ukuran/);
    await assert.rejects(processOrders.completeProcessTask({processOrderId:process.processOrder.id,taskId:approval.id}),/Catat ukuran final/);
    const confirmation="Dada kiri 8 × 5 cm; dada kanan 7 × 2 cm; mockup versi 1 disetujui PIC melalui WhatsApp 06/11/2026.";
    await processOrders.completeProcessTask({processOrderId:process.processOrder.id,taskId:approval.id,notes:confirmation});
    const detail=await processOrders.getProcessOrderDetail(process.processOrder.id);assert.equal(detail?.tasks.find(task=>task.id===approval.id)?.notes,confirmation);
    await processOrders.completeProcessTask({processOrderId:process.processOrder.id,taskId:production.id});
    const pdf=mapProcessOrderToEmbroideryWorkOrderPdfData({detail:detail!,documentNumber:"WO-FIXTURE",generatedAt:new Date().toISOString()});
    assert.equal(pdf.items[0]?.placements[0]?.sizingMode,"ofissio");assert.equal(pdf.items[0]?.placements[0]?.widthCm,null);assert(pdf.items[0]?.placements[2]?.notes?.includes("Huruf kapital."));
    assert(pdf.notes?.includes(confirmation));
    const longNotes=Array.from({length:500},(_,index)=>`PERSON_${index} / S / 1 pcs`).join("; ")+"; LAST_NAME_SENTINEL";
    const rendered=embroideryWorkOrderOfissioTemplate.render({...pdf,items:pdf.items.map(item=>({...item,placements:item.placements.map((placement,index)=>({...placement,notes:index===0?longNotes:placement.notes}))}))});
    const pdfText=Buffer.from(rendered).toString("latin1");assert(pdfText.includes("LAST_NAME_SENTINEL"));assert((pdfText.match(/\/Type \/Page\b/g)??[]).length>1,"Long name lists must continue onto another PDF page");
    const cleared=useCartStore.getState().add({replaceLineId:line.id,product,color:"Khaki",sizes,embroideryPlacements:[],customization:null,globalEmbroideryPricing:price});assert(cleared.ok,cleared.reason);
    assert.equal(useCartStore.getState().items[0]?.embroideryTotal,0);assert.equal(useCartStore.getState().items[0]?.embroideryPlacements?.length,0);
    console.log("PASS: no-GLB embroidery; per-zone files and deferred size; pricing/MOQ/names; tenant and upload validation; cart/edit/revalidation; WooCommerce/admin/PDF persistence; production approval guard. Zero external requests.");
  } finally {
    Object.assign(productServerService,{getProductById:originals.getProductById});
    Object.assign(storageService,{getFileById:originals.getFileById,markFileAsUsed:originals.markFileAsUsed,getSignedFileUrl:originals.getSignedFileUrl});
    globalThis.fetch=originalFetch;
  }
}
void main();
