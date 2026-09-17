import assert from "node:assert/strict";
import { readOptionalCommerceSetting } from "../src/features/products/product-commerce-settings";
import { SupabaseDatabaseError } from "../src/features/database/database.errors";
async function main() {
  const network = () => new SupabaseDatabaseError({reason:"network_error"});
  let calls = 0;
  assert.deepEqual(await readOptionalCommerceSetting(async () => { if (++calls === 1) throw network(); return {price:5000}; }), {price:5000});
  assert.equal(calls,2);
  calls=0;
  assert.equal(await readOptionalCommerceSetting(async () => { calls++; throw network(); }),null);
  assert.equal(calls,2);
  await assert.rejects(readOptionalCommerceSetting(async () => {throw new SupabaseDatabaseError({reason:"invalid_key"});}), /Supabase/);
  await assert.rejects(readOptionalCommerceSetting(async () => {throw new Error("unexpected");}), /unexpected/);
  assert.equal(await readOptionalCommerceSetting(async()=>42),42);
  console.log("PASS: healthy read, transient retry, unavailable state, non-transient errors preserved.");
}
void main();
