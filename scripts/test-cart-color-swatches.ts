import assert from "node:assert/strict";
import { productColorSwatchStyle } from "../src/lib/product-colors";
import { useCartStore } from "../src/stores/cart-store";
import { emptySizeMatrix } from "../src/types/cart";
import type { OfissioProduct } from "../src/features/products/product.types";

assert.equal(productColorSwatchStyle("Fuschia").backgroundColor, "#da738e");
assert.equal(productColorSwatchStyle("fuchsia").backgroundColor, "#da738e");
assert.equal(productColorSwatchStyle("Apricot").backgroundColor, "#edb8a7");
assert.equal(productColorSwatchStyle("Rose Pink").backgroundColor, "#e8b5cc");
assert.equal(productColorSwatchStyle("Biru Wardah").backgroundColor, "#61a8bc");
assert(productColorSwatchStyle("Merah-Navy").backgroundImage?.includes("linear-gradient"));
assert.equal(productColorSwatchStyle("Fuschia", {colorValues:{Fuschia:"#aa3388"}}).backgroundColor, "#aa3388");
const product = {
  id:"color-test", name:"SN Pink-Red", sku:"SN", slug:"color-test", status:"published", source:"mock",
  category:"Kemeja", industries:["office"], priceFrom:85000, moq:1, lead_time:"Ready Stock", fulfillment:"READY_STOCK", transaction_mode:"direct_checkout",
  available_sizes:["S"], available_colors:["Fuschia"], colors:["Fuschia"], embroidery_zones:[],
  productVariants:[{options:{Warna:"Fuschia"},fabricColor:"#aa3388"}],
} as unknown as OfissioProduct;
const result=useCartStore.getState().add({product,color:"Fuschia",sizes:{...emptySizeMatrix(),S:1},customization:null});
assert(result.ok,result.reason);
let item=useCartStore.getState().items[0]!;
assert.deepEqual(item.colorValues,{Fuschia:"#aa3388"});
assert.equal(productColorSwatchStyle(item.color,JSON.parse(JSON.stringify(item))).backgroundColor,"#aa3388");
useCartStore.getState().add({product,color:"Fuschia",sizes:{...emptySizeMatrix(),S:1},customization:null});
item=useCartStore.getState().items[0]!;
assert.equal(item.totalQty,2);
assert.equal(productColorSwatchStyle(item.color,item).backgroundColor,"#aa3388");
console.log("PASS: Fuschia aliases, other SN colors, combination gradients, product RGB snapshots, persisted and merged cart lines.");
