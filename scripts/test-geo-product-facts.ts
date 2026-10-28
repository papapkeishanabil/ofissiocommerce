import assert from "node:assert/strict";
import { PRODUCT_MOCK_DATA } from "../src/features/products/product.mock-data";
import { productStructuredData, serializeJsonLd } from "../src/lib/seo";

const fixture = PRODUCT_MOCK_DATA[0];
assert.ok(fixture);
const product = { ...fixture, source: "woocommerce" as const, gender: "men" as const, sleeve_type: "long" as const,
  available_sizes: ["S", "M", "L", "XL", "2XL", "3XL"] as typeof fixture.available_sizes,
  available_colors: ["Putih", "Hitam", "Putih", "Default", " "], material: "Toyobo" };
const node = (p: typeof product | typeof fixture) => JSON.parse(serializeJsonLd(productStructuredData(p)))["@graph"][0];
const frm = node(product);
assert.deepEqual(frm.size, ["S", "M", "L", "XL", "2XL", "3XL"]);
assert.deepEqual(frm.color, ["Putih", "Hitam"]);
assert.equal(frm.material, "Toyobo");
assert.deepEqual(frm.audience, { "@type": "PeopleAudience", suggestedGender: "male" });
assert.equal(frm.additionalProperty[0].value, "Lengan panjang");
assert.equal("offers" in frm, false);
assert.equal("aggregateRating" in frm, false);
const km = node({ ...product, material: "Baby Canvas", sleeve_type: "short" });
assert.equal(km.additionalProperty[0].value, "Lengan pendek");
assert.equal(km.material, "Baby Canvas");
assert.equal(node({ ...product, gender: "women" }).audience.suggestedGender, "female");
assert.equal(node({ ...product, gender: "unisex" }).audience.suggestedGender, "unisex");
const unspecified = node({ ...product, available_sizes: [], available_colors: ["Default", " "] });
assert.ok(!("size" in unspecified) && !("color" in unspecified));
assert.equal(productStructuredData(fixture), null);
console.log("PASS: actual sizes/colors, material, sleeve and gender facts; missing values omitted; no invented offers, ratings or mock merchant products.");
