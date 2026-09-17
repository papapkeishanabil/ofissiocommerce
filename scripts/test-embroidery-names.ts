import assert from "node:assert/strict";
import { logoPlacementSchema } from "../src/schemas/uniform-3d";
import { syncCheckoutCartSchema } from "../src/features/checkout/checkout-cart.validation";
import { validateNameAllocations } from "../src/lib/embroidery-names";
import { compareEmbroideryNamesToOrder, parseEmbroideryNameList } from "../src/lib/embroidery-name-import";
import type { LogoPlacement } from "../src/types/uniform-3d";
const sizes = { S: 0, M: 3, L: 4, XL: 1, "2XL": 0, "3XL": 0 };
const name: LogoPlacement = { zone: "right_chest", logoFileId: "text-right_chest", logoFileName: "Bordir nama", widthCm: 8, heightCm: 1.25, rotation: 0, technique: "embroidery", textBordir: { mode: "individual", name: "", font: "sans", color: "#10245a", allocations: [{ name: "ANDI", size: "M", quantity: 3 },{ name: "ANDI", size: "L", quantity: 2 },{ name: "BUDI", size: "L", quantity: 2 },{ name: "SARI", size: "XL", quantity: 1 }] } };
assert.equal(validateNameAllocations([name],sizes),null);
assert.match(validateNameAllocations([name],{ ...sizes,M:4 })!,/ukuran M/);
assert.match(validateNameAllocations([name],{ ...sizes,M:4,L:3 })!,/ukuran M/); // same overall count must still match each size
assert.equal(validateNameAllocations([{ ...name,textBordir:{ ...name.textBordir!,mode:"same",name:"ANDI",allocations:[] } }],sizes),null);
assert.equal(logoPlacementSchema.safeParse({ ...name,textBordir:{ ...name.textBordir!, allocations:[{name:"",size:"M",quantity:3}] } }).success,false);
assert.equal(logoPlacementSchema.safeParse({ ...name,textBordir:{ ...name.textBordir!, allocations:[{name:"ANDI",size:"M",quantity:1.5}] } }).success,false);
const logo = { ...name, zone:"right_sleeve" as const, logoFileId:"company-logo-id",textBordir:undefined };
const body = {companyId:"company",userId:"user",items:[{productId:"product",selectedColor:"Camel",sizeMatrix:sizes,embroideryPlacements:[name,logo,{...logo,zone:"middle_back"}]}]};
const parsed=syncCheckoutCartSchema.parse(body);
for (const rotation of [-360, -10, 0, 15, 90, 180, 270, 360]) {
  const rotated = syncCheckoutCartSchema.parse({ ...body, items: [{ ...body.items[0], embroideryPlacements: [{ ...logo, rotation }] }] });
  assert.equal(rotated.items[0]!.embroideryPlacements[0]!.rotation, rotation);
}
for (const rotation of [-361, 361, 1.5, NaN, Infinity]) {
  assert.equal(logoPlacementSchema.safeParse({ ...logo, rotation }).success, false);
}
assert.deepEqual(parsed.items[0]!.embroideryPlacements[0]!.textBordir,name.textBordir);
assert.equal(parsed.items[0]!.embroideryPlacements.length,3);
assert.equal(syncCheckoutCartSchema.safeParse({...body,items:[{...body.items[0],sizeMatrix:{...sizes,L:5}}]}).success,false);
assert.equal(syncCheckoutCartSchema.safeParse({...body,items:[{...body.items[0],embroideryPlacements:[name,name]}]}).success,false);

const imported = parseEmbroideryNameList("Nama Bordir,Ukuran,Jumlah\nAndi,S,1\nBudi,XXL,2\nSari,3XL,");
assert.deepEqual(imported.errors, []);
assert.deepEqual(imported.allocations, [
  { name: "Andi", size: "S", quantity: 1 },
  { name: "Budi", size: "2XL", quantity: 2 },
  { name: "Sari", size: "3XL", quantity: 1 },
]);
const pasted = parseEmbroideryNameList("Dewi\tM\t1\nRina\tL\t1");
assert.deepEqual(pasted.errors, []);
assert.equal(pasted.allocations.length, 2);
assert.match(parseEmbroideryNameList("Nama,Ukuran,Jumlah\nAndi,Q,1").errors[0]!.message, /tidak dikenali/);
assert.equal(parseEmbroideryNameList("Nama,Ukuran,Jumlah\nAndi,S,1\nANDI,M,1").warnings.length, 1);
assert.equal(compareEmbroideryNamesToOrder(imported.allocations, { S: 1, "2XL": 2, "3XL": 1 }).status, "match");
assert.equal(compareEmbroideryNamesToOrder(imported.allocations, {}).status, "no-order");
assert.equal(compareEmbroideryNamesToOrder(imported.allocations, { S: 2, "2XL": 2, "3XL": 1 }).status, "mismatch");

console.log("PASS: names, CSV/paste import, size aliases, import errors, order comparison, serialization, checkout rejection.");
